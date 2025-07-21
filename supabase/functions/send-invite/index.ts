import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, x-client-info, apikey",
};

interface InviteRequest {
  email: string;
  teamName: string;
  leagueName: string;
  captainName: string;
  teamId?: number;
  captainId?: string;
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

    const {
      email,
      teamName,
      leagueName,
      captainName,
      teamId,
      captainId,
    }: InviteRequest = await req.json();

    if (!email || !teamName || !leagueName || !captainName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
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
        },
      );
    }

    // Initialize Supabase client with service role for database operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user is authenticated by checking their token
    const token = authHeader.replace("Bearer ", "");

    // Initialize regular Supabase client to verify auth
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Store the invite in the database if teamId and captainId are provided
    if (teamId && captainId) {
      // First, get the user's profile to get their users.id from their auth_id and check admin status
      const { data: userProfileData, error: userProfileError } = await supabase
        .from("users")
        .select("id, is_admin")
        .eq("auth_id", user.id)
        .single();

      if (userProfileError || !userProfileData) {
        return new Response(
          JSON.stringify({ error: "User profile not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Verify the user is the captain of the team they're trying to invite to
      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .select("captain_id")
        .eq("id", teamId)
        .single();

      if (teamError || !teamData) {
        return new Response(JSON.stringify({ error: "Team not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if the authenticated user is the captain of this team or an admin
      // Compare the team's captain_id with the user's profile id (not auth_id)
      const isTeamCaptain = teamData.captain_id === userProfileData.id;
      const isAdmin = userProfileData.is_admin === true;

      if (!isTeamCaptain && !isAdmin) {
        return new Response(
          JSON.stringify({
            error: "Only team captains or admins can send invites",
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      try {
        // Check if invite already exists for this email and team
        const { data: existingInvite } = await supabase
          .from("team_invites")
          .select("id")
          .eq("team_id", teamId)
          .eq("email", email.toLowerCase())
          .eq("status", "pending")
          .single();

        if (!existingInvite) {
          // Create new invite record
          const { error: inviteError } = await supabase
            .from("team_invites")
            .insert({
              team_id: teamId,
              email: email.toLowerCase(),
              status: "pending",
              invited_by: captainId,
              team_name: teamName,
              league_name: leagueName,
            });

          if (inviteError) {
            console.error("Error storing invite:", inviteError);
            // Continue with email sending even if database storage fails
          }
        }
      } catch (error) {
        console.error("Error checking/storing invite:", error);
        // Continue with email sending even if database operation fails
      }
    }

    // Create the invite email content
    const siteUrl = Deno.env.get("SITE_URL") || "https://ofsl.ca";
    const inviteUrl = `${siteUrl}/#/signup?invite=true`;

    const emailContent = {
      to: [email],
      subject: `Team Invitation: Join ${teamName} in ${leagueName}!`,
      html: `
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5;">
          <tr>
            <td align="center" style="padding: 20px 0;">
              <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff;">
                <!-- Header -->
                <tr>
                  <td align="center" style="background-color: #B20000; padding: 30px 20px;">
                    <img src="https://ofsl.ca/group-1.png" alt="OFSL" style="width: 300px; height: auto; max-width: 100%;" />
                  </td>
                </tr>
                
                <!-- Main Content -->
                <tr>
                  <td style="padding: 40px 30px; background-color: #ffffff;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <!-- Title Section -->
                      <tr>
                        <td align="center" style="padding-bottom: 30px;">
                          <p style="font-size: 48px; margin: 0 0 20px 0;">🏐</p>
                          <h2 style="color: #2c3e50; margin: 0; font-size: 24px; font-weight: bold; font-family: Arial, sans-serif;">You're Invited to Join a Team!</h2>
                        </td>
                      </tr>
                      
                      <!-- Invitation Details -->
                      <tr>
                        <td style="padding-bottom: 25px;">
                          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f8f9fa; border-left: 4px solid #B20000;">
                            <tr>
                              <td style="padding: 25px;">
                                <p style="color: #2c3e50; font-size: 16px; line-height: 24px; margin: 0; font-family: Arial, sans-serif;">
                                  <strong>${captainName}</strong> has invited you to join their team <strong style="color: #B20000;">${teamName}</strong> 
                                  in the <strong style="color: #B20000;">${leagueName}</strong> league.
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      <!-- What's Next Section -->
                      <tr>
                        <td style="padding-bottom: 30px;">
                          <h3 style="color: #2c3e50; font-size: 18px; margin: 0 0 15px 0; font-family: Arial, sans-serif;">What's Next?</h3>
                          <table cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                              <td style="color: #5a6c7d; font-size: 16px; line-height: 24px; font-family: Arial, sans-serif; padding-left: 20px;">
                                • Click the button below to create your OFSL account<br>
                                • Complete your player profile with your skill level and preferences<br>
                                • You'll automatically be added to ${teamName} once registered<br>
                                • Start playing with your new team!
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      <!-- CTA Button -->
                      <tr>
                        <td align="center" style="padding: 20px 0 40px 0;">
                          <table cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td align="center" style="background-color: #B20000; border-radius: 4px;">
                                <a href="${inviteUrl}" style="display: inline-block; padding: 16px 32px; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; color: #ffffff; text-decoration: none;">
                                  Create Account & Join Team
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      <!-- About OFSL -->
                      <tr>
                        <td style="padding-bottom: 30px;">
                          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #e8f4f8;">
                            <tr>
                              <td style="padding: 20px;">
                                <h4 style="color: #2c3e50; font-size: 16px; margin: 0 0 12px 0; font-family: Arial, sans-serif;">About OFSL</h4>
                                <p style="color: #5a6c7d; font-size: 14px; line-height: 21px; margin: 0; font-family: Arial, sans-serif;">
                                  We're Ottawa's premier adult sports league, offering volleyball, badminton, and more. 
                                  Our leagues provide structured environments that encourage sportsmanship, physical activity, and healthy competition.
                                  Join thousands of players who have made lasting friendships through OFSL!
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      <!-- Contact -->
                      <tr>
                        <td align="center">
                          <p style="color: #7f8c8d; font-size: 14px; line-height: 21px; font-family: Arial, sans-serif;">
                            Questions? Contact us at 
                            <a href="mailto:info@ofsl.ca" style="color: #B20000; text-decoration: none; font-weight: bold;">info@ofsl.ca</a>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td align="center" style="background-color: #2c3e50; padding: 25px 20px;">
                    <p style="color: #bdc3c7; font-size: 12px; margin: 0 0 5px 0; font-family: Arial, sans-serif;">
                      © ${new Date().getFullYear()} Ottawa Fun Sports League. All rights reserved.
                    </p>
                    <p style="color: #95a5a6; font-size: 11px; margin: 0; font-family: Arial, sans-serif;">
                      This invitation was sent by ${captainName} on behalf of ${teamName}.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      `,
    };

    // Send email using Resend API
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not found");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "OFSL <noreply@ofsl.ca>",
        ...emailContent,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Resend API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to send invite email" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const emailResult = await emailResponse.json();
    console.log("Email sent successfully:", emailResult);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Invite email sent successfully",
        emailId: emailResult.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error in send-invite function:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
