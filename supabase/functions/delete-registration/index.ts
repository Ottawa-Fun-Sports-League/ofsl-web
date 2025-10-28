import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, x-client-info, apikey",
};

interface DeleteRegistrationRequest {
  paymentId: number;
  leagueName: string;
}

serve(async (req: Request) => {
  try {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { paymentId, leagueName }: DeleteRegistrationRequest = await req.json();

    if (!paymentId || !leagueName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Supabase client with service role for full access
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Also create a client with user auth to verify the user
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get the payment record to find the team
    const { data: payment, error: paymentError } = await supabase
      .from("league_payments")
      .select("team_id, user_id, amount_due, amount_paid, status, is_waitlisted")
      .eq("id", paymentId)
      .single();

    if (paymentError || !payment) {
      console.error("Payment fetch error:", paymentError);
      return new Response(
        JSON.stringify({ error: "Payment record not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!payment.team_id) {
      return new Response(
        JSON.stringify({ error: "This is an individual registration, not a team registration" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get the team to find all members
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("id, name, roster, captain_id, active")
      .eq("id", payment.team_id)
      .single();

    if (teamError || !team) {
      console.error("Team fetch error:", teamError);
      return new Response(
        JSON.stringify({ error: "Associated team not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Verify the user is the team captain
    if (team.captain_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Only the team captain can delete the team registration" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const warnings: string[] = [];
    const teamMemberNames: string[] = [];
    let membersProcessed = 0;

    // Process each team member
    if (team.roster && Array.isArray(team.roster)) {
      for (const memberId of team.roster) {
        // Remove this team from each member's teams array
        const { data: userData, error: userFetchError } = await supabase
          .from("users")
          .select("teams, name")
          .eq("id", memberId)
          .single();

        if (userFetchError) {
          warnings.push(`Could not fetch user ${memberId}: ${userFetchError.message}`);
          continue;
        }

        if (userData && Array.isArray(userData.teams)) {
          const updatedTeams = userData.teams.filter((teamId: number) => teamId !== team.id);
          
          const { error: updateError } = await supabase
            .from("users")
            .update({ teams: updatedTeams })
            .eq("id", memberId);

          if (updateError) {
            warnings.push(`Could not update teams for user ${memberId}: ${updateError.message}`);
          } else {
            membersProcessed++;
            if (userData.name && !teamMemberNames.includes(userData.name)) {
              teamMemberNames.push(userData.name);
            }
          }
        }
      }
    }

    // Delete the payment record
    const { error: deletePaymentError } = await supabase
      .from("league_payments")
      .delete()
      .eq("id", paymentId);

    if (deletePaymentError) {
      console.error("Payment deletion error:", deletePaymentError);
      warnings.push(`Payment deletion warning: ${deletePaymentError.message}`);
    }

    // Delete the team
    const { error: deleteTeamError } = await supabase
      .from("teams")
      .delete()
      .eq("id", team.id);

    if (deleteTeamError) {
      console.error("Team deletion error:", deleteTeamError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to delete team",
          details: deleteTeamError.message,
          warnings 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Send cancellation notification
    try {
      // Get captain details for notification
      const { data: captainData } = await supabase
        .from("users")
        .select("id, name, email, phone")
        .eq("id", team.captain_id)
        .single();

      if (captainData) {
        if (captainData.name && !teamMemberNames.includes(captainData.name)) {
          teamMemberNames.push(captainData.name);
        }

        // Call the cancellation notification function
        const teamIsWaitlisted = team.active === false || (typeof team.name === "string" && /^waitlist\s*-/i.test(team.name));

        const response = await fetch(`${supabaseUrl}/functions/v1/send-cancellation-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({
            userId: captainData.id,
            userName: captainData.name || "Team Captain",
            userEmail: captainData.email || "Unknown",
            userPhone: captainData.phone,
            leagueName: leagueName,
            isTeamRegistration: true,
            teamName: team.name,
            originalTeamName: team.name,
            rosterCount: Array.isArray(team.roster) ? team.roster.length : undefined,
            teamMemberNames,
            teamIsWaitlisted,
            amountDue: payment.amount_due ?? null,
            amountPaid: payment.amount_paid ?? null,
            paymentStatus: payment.status ?? null,
            isWaitlisted: payment.is_waitlisted ?? undefined,
            cancelledAt: new Date().toISOString()
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Failed to send cancellation notification:", errorText);
          warnings.push("Cancellation notification could not be sent");
        }
      }
    } catch (notificationError) {
      console.error("Error sending cancellation notification:", notificationError);
      warnings.push("Cancellation notification could not be sent");
      // Don't block the deletion due to notification failure
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully deleted registration for ${leagueName}`,
        teamDeleted: team.name,
        membersProcessed,
        warnings: warnings.length > 0 ? warnings : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in delete-registration function:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
