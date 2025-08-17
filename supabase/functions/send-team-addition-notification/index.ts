import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, x-client-info, apikey",
};

interface TeamAdditionNotificationRequest {
  userId: string;
  teamId: number;
  teamName: string;
  leagueName: string;
  captainName: string;
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
      userId,
      teamId,
      teamName,
      leagueName,
      captainName,
    }: TeamAdditionNotificationRequest = await req.json();

    if (!userId || !teamId || !teamName || !leagueName || !captainName) {
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

    // Initialize Supabase client with service role for user data access
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Log the request for debugging
    // Received notification request

    // Get the user's email address who was added to the team
    const { data: addedUser, error: userError } = await supabase
      .from("users")
      .select("email, name")
      .eq("id", userId)
      .single();

    if (userError || !addedUser) {
      return new Response(
        JSON.stringify({ error: "Added user not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Create the notification email content
    const siteUrl = Deno.env.get("SITE_URL") || "https://ofsl.ca";
    const teamUrl = `${siteUrl}/#/my-account/teams`;

    const emailContent = {
      to: [addedUser.email],
      subject: `You've been added to ${teamName}!`,
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
                          <h2 style="color: #2c3e50; margin: 0; font-size: 24px; font-weight: bold; font-family: Arial, sans-serif;">You've Been Added to a Team!</h2>
                        </td>
                      </tr>
                      
                      <!-- Team Details -->
                      <tr>
                        <td style="padding-bottom: 25px;">
                          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f8f9fa; border-left: 4px solid #B20000;">
                            <tr>
                              <td style="padding: 25px;">
                                <p style="color: #2c3e50; font-size: 16px; line-height: 24px; margin: 0; font-family: Arial, sans-serif;">
                                  Hi ${addedUser.name},
                                </p>
                                <p style="color: #2c3e50; font-size: 16px; line-height: 24px; margin: 15px 0 0 0; font-family: Arial, sans-serif;">
                                  <strong>${captainName}</strong> has added you to their team <strong style="color: #B20000;">${teamName}</strong> 
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
                          <h3 style="color: #2c3e50; font-size: 18px; margin: 0 0 15px 0; font-family: Arial, sans-serif;">What This Means</h3>
                          <table cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                              <td style="color: #5a6c7d; font-size: 16px; line-height: 24px; font-family: Arial, sans-serif; padding-left: 20px;">
                                • You're now an official member of ${teamName}<br>
                                • You can view your team details and roster in your account<br>
                                • Your captain will communicate game schedules and updates<br>
                                • Get ready to play in the ${leagueName} league!
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
                                <a href="${teamUrl}" style="display: inline-block; padding: 16px 32px; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; color: #ffffff; text-decoration: none;">
                                  View My Leagues
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      <!-- Team Captain Info -->
                      <tr>
                        <td style="padding-bottom: 30px;">
                          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #e8f4f8;">
                            <tr>
                              <td style="padding: 20px;">
                                <h4 style="color: #2c3e50; font-size: 16px; margin: 0 0 12px 0; font-family: Arial, sans-serif;">Your Team Captain</h4>
                                <p style="color: #5a6c7d; font-size: 14px; line-height: 21px; margin: 0; font-family: Arial, sans-serif;">
                                  <strong>${captainName}</strong> is your team captain and will be your main point of contact 
                                  for all team-related matters including game schedules, team communication, and league updates.
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
                            Questions? Contact your team captain or email us at 
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
                      You were added to ${teamName} by ${captainName}.
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
      // eslint-disable-next-line no-console
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
      // eslint-disable-next-line no-console
      console.error("Resend API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to send notification email" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const emailResult = await emailResponse.json();
    // eslint-disable-next-line no-console
    console.log("Email sent successfully:", emailResult);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Notification email sent successfully",
        emailId: emailResult.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error in send-team-addition-notification function:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});