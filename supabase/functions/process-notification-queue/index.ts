import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, x-client-info, apikey",
};

serve(async (req: Request) => {
  try {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    // This function can be called via cron job or manually
    if (req.method !== "POST" && req.method !== "GET") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch unsent notifications
    const { data: notifications, error: fetchError } = await supabase
      .from('team_registration_notifications')
      .select('*')
      .eq('sent', false)
      .order('created_at', { ascending: true })
      .limit(10); // Process 10 at a time

    if (fetchError) {
      // eslint-disable-next-line no-console
      console.error('Error fetching notifications:', fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch notifications" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!notifications || notifications.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No pending notifications",
          processed: 0 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Process each notification
    const results = [];
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

    for (const notification of notifications) {
      try {
        // Format registration date
        const registrationDate = new Date(notification.registered_at).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'America/Toronto'
        });

        // Prepare email content
        const emailContent = {
          to: ["info@ofsl.ca"],
          subject: `New Team Registration: ${notification.team_name} in ${notification.league_name}`,
          html: `
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5;">
              <tr>
                <td align="center" style="padding: 20px 0;">
                  <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff;">
                    <!-- Header -->
                    <tr>
                      <td align="center" style="background-color: #B20000; padding: 30px 20px;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-family: Arial, sans-serif;">
                          New Team Registration
                        </h1>
                      </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                      <td style="padding: 40px 30px; background-color: #ffffff;">
                        <table cellpadding="0" cellspacing="0" border="0" width="100%">
                          <!-- Alert Message -->
                          <tr>
                            <td style="padding-bottom: 25px;">
                              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #e8f5e9; border: 1px solid #a5d6a7;">
                                <tr>
                                  <td style="padding: 20px;">
                                    <p style="color: #2e7d32; font-size: 16px; line-height: 24px; margin: 0; font-family: Arial, sans-serif;">
                                      <strong>🎉 A new team has registered!</strong><br>
                                      The following team has just signed up for a league.
                                    </p>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                          
                          <!-- Team Details -->
                          <tr>
                            <td style="padding-bottom: 30px;">
                              <h2 style="color: #2c3e50; font-size: 20px; margin: 0 0 20px 0; font-family: Arial, sans-serif;">
                                Team Information
                              </h2>
                              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f8f9fa; border: 1px solid #dee2e6;">
                                <tr>
                                  <td style="padding: 20px;">
                                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                      <tr>
                                        <td style="padding: 8px 0;">
                                          <strong style="color: #5a6c7d; font-size: 14px; font-family: Arial, sans-serif;">Team Name:</strong>
                                          <span style="color: #2c3e50; font-size: 16px; font-family: Arial, sans-serif; margin-left: 10px;">${notification.team_name}</span>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td style="padding: 8px 0;">
                                          <strong style="color: #5a6c7d; font-size: 14px; font-family: Arial, sans-serif;">League:</strong>
                                          <span style="color: #B20000; font-size: 16px; font-weight: bold; font-family: Arial, sans-serif; margin-left: 10px;">${notification.league_name}</span>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td style="padding: 8px 0;">
                                          <strong style="color: #5a6c7d; font-size: 14px; font-family: Arial, sans-serif;">Team ID:</strong>
                                          <span style="color: #2c3e50; font-size: 16px; font-family: Arial, sans-serif; margin-left: 10px;">#${notification.team_id}</span>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td style="padding: 8px 0;">
                                          <strong style="color: #5a6c7d; font-size: 14px; font-family: Arial, sans-serif;">Registration Date:</strong>
                                          <span style="color: #2c3e50; font-size: 16px; font-family: Arial, sans-serif; margin-left: 10px;">${registrationDate}</span>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td style="padding: 8px 0;">
                                          <strong style="color: #5a6c7d; font-size: 14px; font-family: Arial, sans-serif;">Roster Size:</strong>
                                          <span style="color: #2c3e50; font-size: 16px; font-family: Arial, sans-serif; margin-left: 10px;">${notification.roster_count} player${notification.roster_count !== 1 ? 's' : ''}</span>
                                        </td>
                                      </tr>
                                    </table>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                          
                          <!-- Captain Details -->
                          <tr>
                            <td style="padding-bottom: 30px;">
                              <h2 style="color: #2c3e50; font-size: 20px; margin: 0 0 20px 0; font-family: Arial, sans-serif;">
                                Captain Information
                              </h2>
                              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f8f9fa; border: 1px solid #dee2e6;">
                                <tr>
                                  <td style="padding: 20px;">
                                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                      <tr>
                                        <td style="padding: 8px 0;">
                                          <strong style="color: #5a6c7d; font-size: 14px; font-family: Arial, sans-serif;">Name:</strong>
                                          <span style="color: #2c3e50; font-size: 16px; font-family: Arial, sans-serif; margin-left: 10px;">${notification.captain_name}</span>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td style="padding: 8px 0;">
                                          <strong style="color: #5a6c7d; font-size: 14px; font-family: Arial, sans-serif;">Email:</strong>
                                          <a href="mailto:${notification.captain_email}" style="color: #1976d2; font-size: 16px; font-family: Arial, sans-serif; margin-left: 10px; text-decoration: none;">${notification.captain_email}</a>
                                        </td>
                                      </tr>
                                      ${notification.captain_phone ? `
                                      <tr>
                                        <td style="padding: 8px 0;">
                                          <strong style="color: #5a6c7d; font-size: 14px; font-family: Arial, sans-serif;">Phone:</strong>
                                          <span style="color: #2c3e50; font-size: 16px; font-family: Arial, sans-serif; margin-left: 10px;">${notification.captain_phone}</span>
                                        </td>
                                      </tr>
                                      ` : ''}
                                    </table>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                          
                          <!-- Action Required -->
                          <tr>
                            <td style="padding-bottom: 30px;">
                              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #fff3cd; border: 1px solid #ffeaa7;">
                                <tr>
                                  <td style="padding: 20px;">
                                    <h3 style="color: #856404; font-size: 16px; margin: 0 0 10px 0; font-family: Arial, sans-serif;">
                                      ⚡ Action Required
                                    </h3>
                                    <p style="color: #856404; font-size: 14px; line-height: 21px; margin: 0; font-family: Arial, sans-serif;">
                                      Please follow up with the captain to ensure they send the $200 deposit via e-transfer within 48 hours to secure their spot.
                                    </p>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                          
                          <!-- Admin Link -->
                          <tr>
                            <td align="center" style="padding-bottom: 30px;">
                              <a href="https://ofsl.ca/#/my-account/manage-teams" style="display: inline-block; background-color: #B20000; color: #ffffff; font-size: 16px; font-weight: bold; font-family: Arial, sans-serif; text-decoration: none; padding: 15px 30px; border-radius: 5px;">
                                View in Admin Panel
                              </a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td align="center" style="background-color: #2c3e50; padding: 20px;">
                        <p style="color: #bdc3c7; font-size: 12px; margin: 0; font-family: Arial, sans-serif;">
                          This is an automated notification from the OFSL registration system.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          `,
        };

        // Send email
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "OFSL System <noreply@ofsl.ca>",
            ...emailContent,
          }),
        });

        if (emailResponse.ok) {
          const emailResult = await emailResponse.json();
          
          // Mark as sent
          await supabase
            .from('team_registration_notifications')
            .update({ 
              sent: true, 
              sent_at: new Date().toISOString(),
              error: null
            })
            .eq('id', notification.id);
          
          results.push({
            id: notification.id,
            success: true,
            emailId: emailResult.id
          });
        } else {
          const errorText = await emailResponse.text();
          // eslint-disable-next-line no-console
          console.error(`Failed to send notification ${notification.id}:`, errorText);
          
          // Mark with error
          await supabase
            .from('team_registration_notifications')
            .update({ 
              error: errorText.substring(0, 500) // Limit error message length
            })
            .eq('id', notification.id);
          
          results.push({
            id: notification.id,
            success: false,
            error: errorText
          });
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Error processing notification ${notification.id}:`, error);
        
        // Mark with error
        await supabase
          .from('team_registration_notifications')
          .update({ 
            error: error.message.substring(0, 500)
          })
          .eq('id', notification.id);
        
        results.push({
          id: notification.id,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.length} notifications`,
        processed: results.length,
        sent: successCount,
        failed: failureCount,
        results: results
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error in process-notification-queue function:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});