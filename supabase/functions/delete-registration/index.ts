import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get the JWT from the Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Verify the JWT and get the user
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Invalid authentication");
    }

    const { paymentId, leagueName } = await req.json();

    if (!paymentId) {
      throw new Error("Payment ID is required");
    }

    // Get the payment record with associated team
    const { data: payment, error: paymentError } = await supabaseClient
      .from("league_payments")
      .select("*, teams(*)")
      .eq("id", paymentId)
      .single();

    if (paymentError || !payment) {
      throw new Error("Payment record not found");
    }

    // Check if this is an individual registration (no team)
    if (!payment.team_id) {
      throw new Error("This is an individual registration. Please use the individual cancellation flow.");
    }

    // Get the associated team
    const team = payment.teams;
    if (!team) {
      throw new Error("Associated team not found");
    }

    // Verify the user is the captain of the team
    const { data: userProfile } = await supabaseClient
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .single();

    if (!userProfile || userProfile.id !== team.captain_id) {
      throw new Error("Only team captains can delete team registrations");
    }

    const warnings: string[] = [];
    let membersProcessed = 0;

    // Remove team_id from all team members
    if (team.roster && team.roster.length > 0) {
      for (const memberId of team.roster) {
        const { data: member } = await supabaseClient
          .from("users")
          .select("team_ids")
          .eq("id", memberId)
          .single();

        if (member && member.team_ids) {
          const updatedTeamIds = member.team_ids.filter(
            (id: number) => id !== team.id
          );
          
          const { error: updateError } = await supabaseClient
            .from("users")
            .update({ team_ids: updatedTeamIds })
            .eq("id", memberId);

          if (updateError) {
            warnings.push(
              `Failed to remove team from member ${memberId}: ${updateError.message}`
            );
          } else {
            membersProcessed++;
          }
        }
      }
    }

    // Delete all payment records for this team
    const { error: deletePaymentsError } = await supabaseClient
      .from("league_payments")
      .delete()
      .eq("team_id", team.id);

    if (deletePaymentsError) {
      warnings.push(
        `Failed to delete payment records: ${deletePaymentsError.message}`
      );
    }

    // Delete the team
    const { error: deleteTeamError } = await supabaseClient
      .from("teams")
      .delete()
      .eq("id", team.id);

    if (deleteTeamError) {
      throw new Error(`Failed to delete team: ${deleteTeamError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Team "${team.name}" and its registration for ${leagueName} have been deleted successfully`,
        membersProcessed,
        warnings: warnings.length > 0 ? warnings : undefined,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in delete-registration:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "An error occurred while deleting the registration",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});