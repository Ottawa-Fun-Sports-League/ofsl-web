import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, x-client-info, apikey",
};

interface CancellationNotificationRequest {
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  leagueName: string;
  isTeamRegistration: boolean;
  teamName?: string;
  cancelledAt: string;
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
      userName,
      userEmail,
      userPhone,
      leagueName,
      isTeamRegistration,
      teamName,
      cancelledAt,
    }: CancellationNotificationRequest = await req.json();

    if (!userId || !userName || !userEmail || !leagueName) {
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
    const _supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Format cancellation date
    const cancellationDate = new Date(cancelledAt).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Toronto'
    });

    // Create user email content
    const userEmailContent = {
      to: [userEmail],
      subject: `Registration Cancelled: ${leagueName}`,
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
                          <h2 style="color: #2c3e50; margin: 0; font-size: 24px; font-weight: bold; font-family: Arial, sans-serif;">
                            Registration Cancelled
                          </h2>
                        </td>
                      </tr>
                      
                      <!-- Cancellation Details -->
                      <tr>
                        <td style="padding-bottom: 25px;">
                          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f8f9fa; border-left: 4px solid #dc3545;">
                            <tr>
                              <td style="padding: 25px;">
                                <p style="color: #2c3e50; font-size: 16px; line-height: 24px; margin: 0; font-family: Arial, sans-serif;">
                                  Hi ${userName},
                                </p>
                                <p style="color: #2c3e50; font-size: 16px; line-height: 24px; margin: 15px 0 0 0; font-family: Arial, sans-serif;">
                                  Your ${isTeamRegistration ? `team registration for <strong>${teamName}</strong> in` : 'individual registration for'} 
                                  the <strong style="color: #B20000;">${leagueName}</strong> league has been successfully cancelled.
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      <!-- Cancellation Info -->
                      <tr>
                        <td style="padding-bottom: 30px;">
                          <h3 style="color: #2c3e50; font-size: 18px; margin: 0 0 15px 0; font-family: Arial, sans-serif;">Cancellation Details</h3>
                          <table cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                              <td style="color: #5a6c7d; font-size: 16px; line-height: 24px; font-family: Arial, sans-serif;">
                                <strong>League:</strong> ${leagueName}<br>
                                ${isTeamRegistration ? `<strong>Team:</strong> ${teamName}<br>` : ''}
                                <strong>Registration Type:</strong> ${isTeamRegistration ? 'Team' : 'Individual'}<br>
                                <strong>Cancelled On:</strong> ${cancellationDate}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      <!-- Refund Notice -->
                      <tr>
                        <td style="padding-bottom: 30px;">
                          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #fff3cd; border: 1px solid #ffc107;">
                            <tr>
                              <td style="padding: 20px;">
                                <p style="color: #856404; font-size: 14px; line-height: 21px; margin: 0; font-family: Arial, sans-serif;">
                                  <strong>Important:</strong> If you made any payments for this registration, 
                                  please contact us at <a href="mailto:info@ofsl.ca" style="color: #B20000; text-decoration: none;">info@ofsl.ca</a> 
                                  regarding refund eligibility and processing.
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
                            If you have any questions or if this cancellation was made in error, please contact us at 
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
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      `,
    };

    // Create admin email content
    const adminEmailContent = {
      to: ["info@ofsl.ca"],
      subject: `[Cancellation] ${userName} - ${leagueName} ${isTeamRegistration ? '(Team)' : '(Individual)'}`,
      html: `
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5;">
          <tr>
            <td align="center" style="padding: 20px 0;">
              <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff;">
                <!-- Header -->
                <tr>
                  <td align="center" style="background-color: #dc3545; padding: 30px 20px;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-family: Arial, sans-serif;">
                      Registration Cancellation
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
                          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f8d7da; border: 1px solid #f5c6cb;">
                            <tr>
                              <td style="padding: 20px;">
                                <p style="color: #721c24; font-size: 16px; line-height: 24px; margin: 0; font-family: Arial, sans-serif;">
                                  <strong>⚠️ A registration has been cancelled</strong><br>
                                  The following user has cancelled their ${isTeamRegistration ? 'team' : 'individual'} registration.
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      <!-- User Details -->
                      <tr>
                        <td style="padding-bottom: 30px;">
                          <h2 style="color: #2c3e50; font-size: 20px; margin: 0 0 20px 0; font-family: Arial, sans-serif;">
                            User Information
                          </h2>
                          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f8f9fa; border: 1px solid #dee2e6;">
                            <tr>
                              <td style="padding: 20px;">
                                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                  <tr>
                                    <td style="padding: 8px 0;">
                                      <strong style="color: #5a6c7d; font-size: 14px; font-family: Arial, sans-serif;">Name:</strong>
                                      <span style="color: #2c3e50; font-size: 16px; font-family: Arial, sans-serif; margin-left: 10px;">${userName}</span>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 8px 0;">
                                      <strong style="color: #5a6c7d; font-size: 14px; font-family: Arial, sans-serif;">Email:</strong>
                                      <a href="mailto:${userEmail}" style="color: #1976d2; font-size: 16px; font-family: Arial, sans-serif; margin-left: 10px; text-decoration: none;">${userEmail}</a>
                                    </td>
                                  </tr>
                                  ${userPhone ? `
                                  <tr>
                                    <td style="padding: 8px 0;">
                                      <strong style="color: #5a6c7d; font-size: 14px; font-family: Arial, sans-serif;">Phone:</strong>
                                      <span style="color: #2c3e50; font-size: 16px; font-family: Arial, sans-serif; margin-left: 10px;">${userPhone}</span>
                                    </td>
                                  </tr>
                                  ` : ''}
                                  <tr>
                                    <td style="padding: 8px 0;">
                                      <strong style="color: #5a6c7d; font-size: 14px; font-family: Arial, sans-serif;">User ID:</strong>
                                      <span style="color: #2c3e50; font-size: 16px; font-family: Arial, sans-serif; margin-left: 10px;">#${userId}</span>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      <!-- Cancellation Details -->
                      <tr>
                        <td style="padding-bottom: 30px;">
                          <h2 style="color: #2c3e50; font-size: 20px; margin: 0 0 20px 0; font-family: Arial, sans-serif;">
                            Cancellation Details
                          </h2>
                          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f8f9fa; border: 1px solid #dee2e6;">
                            <tr>
                              <td style="padding: 20px;">
                                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                  <tr>
                                    <td style="padding: 8px 0;">
                                      <strong style="color: #5a6c7d; font-size: 14px; font-family: Arial, sans-serif;">League:</strong>
                                      <span style="color: #B20000; font-size: 16px; font-weight: bold; font-family: Arial, sans-serif; margin-left: 10px;">${leagueName}</span>
                                    </td>
                                  </tr>
                                  ${isTeamRegistration && teamName ? `
                                  <tr>
                                    <td style="padding: 8px 0;">
                                      <strong style="color: #5a6c7d; font-size: 14px; font-family: Arial, sans-serif;">Team Name:</strong>
                                      <span style="color: #2c3e50; font-size: 16px; font-family: Arial, sans-serif; margin-left: 10px;">${teamName}</span>
                                    </td>
                                  </tr>
                                  ` : ''}
                                  <tr>
                                    <td style="padding: 8px 0;">
                                      <strong style="color: #5a6c7d; font-size: 14px; font-family: Arial, sans-serif;">Registration Type:</strong>
                                      <span style="color: #2c3e50; font-size: 16px; font-family: Arial, sans-serif; margin-left: 10px;">${isTeamRegistration ? 'Team Registration' : 'Individual Registration'}</span>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 8px 0;">
                                      <strong style="color: #5a6c7d; font-size: 14px; font-family: Arial, sans-serif;">Cancelled At:</strong>
                                      <span style="color: #2c3e50; font-size: 16px; font-family: Arial, sans-serif; margin-left: 10px;">${cancellationDate}</span>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      <!-- Action Required -->
                      <tr>
                        <td style="padding-bottom: 30px;">
                          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #cfe2ff; border: 1px solid #b6d4fe;">
                            <tr>
                              <td style="padding: 20px;">
                                <h3 style="color: #004085; font-size: 16px; margin: 0 0 10px 0; font-family: Arial, sans-serif;">
                                  Action Required
                                </h3>
                                <p style="color: #004085; font-size: 14px; line-height: 21px; margin: 0; font-family: Arial, sans-serif;">
                                  • Review any pending refunds for this user<br>
                                  • Update league rosters if necessary<br>
                                  • Consider waitlist participants if applicable
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      <!-- Admin Link -->
                      <tr>
                        <td align="center" style="padding-bottom: 30px;">
                          <a href="https://ofsl.ca/#/my-account/manage-users" style="display: inline-block; background-color: #dc3545; color: #ffffff; font-size: 16px; font-weight: bold; font-family: Arial, sans-serif; text-decoration: none; padding: 15px 30px; border-radius: 5px;">
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

    // Send email using Resend API
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      // eslint-disable-next-line no-console
      console.error("[Cancellation Notification] RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ 
          error: "Email service not configured",
          errorType: "CONFIGURATION_ERROR"
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Helper function to send email with retry logic
    async function sendEmailWithRetry(
      emailType: 'user' | 'admin',
      emailContent: any,
      maxRetries: number = 3
    ): Promise<{ success: boolean; result?: any; error?: string }> {
      let lastError: string = '';
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // Add exponential backoff for retries
          if (attempt > 1) {
            const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            // eslint-disable-next-line no-console
            console.log(`[Cancellation Notification] Retrying ${emailType} email (attempt ${attempt}/${maxRetries}) after ${backoffMs}ms`);
            await new Promise(resolve => setTimeout(resolve, backoffMs));
          }

          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: emailType === 'user' ? "OFSL <noreply@ofsl.ca>" : "OFSL System <noreply@ofsl.ca>",
              ...emailContent,
            }),
          });

          if (response.ok) {
            const result = await response.json();
            // eslint-disable-next-line no-console
            console.log(`[Cancellation Notification] ${emailType} email sent successfully (attempt ${attempt}/${maxRetries}):`, result.id);
            return { success: true, result: { type: emailType, emailId: result.id } };
          }

          const errorText = await response.text();
          lastError = `HTTP ${response.status}: ${errorText}`;
          
          // Don't retry on 4xx errors (client errors)
          if (response.status >= 400 && response.status < 500) {
            // eslint-disable-next-line no-console
            console.error(`[Cancellation Notification] ${emailType} email failed with client error (not retrying):`, lastError);
            break;
          }
          
          // Log retry attempts
          // eslint-disable-next-line no-console
          console.warn(`[Cancellation Notification] ${emailType} email attempt ${attempt} failed:`, lastError);
          
        } catch (error) {
          lastError = error instanceof Error ? error.message : String(error);
          // eslint-disable-next-line no-console
          console.error(`[Cancellation Notification] ${emailType} email attempt ${attempt} error:`, lastError);
        }
      }
      
      return { 
        success: false, 
        error: `Failed to send ${emailType} notification after ${maxRetries} attempts: ${lastError}` 
      };
    }

    // Send both emails with retry logic
    const [userEmailResult, adminEmailResult] = await Promise.all([
      sendEmailWithRetry('user', userEmailContent),
      sendEmailWithRetry('admin', adminEmailContent)
    ]);

    const errors = [];
    const results = [];

    if (userEmailResult.success) {
      results.push(userEmailResult.result);
    } else {
      errors.push(userEmailResult.error);
    }

    if (adminEmailResult.success) {
      results.push(adminEmailResult.result);
    } else {
      errors.push(adminEmailResult.error);
    }

    // Return partial success if at least one email was sent
    if (results.length > 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: `Cancellation notifications sent (${results.length}/2 successful)`,
          results: results,
          errors: errors.length > 0 ? errors : undefined,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    } else {
      return new Response(
        JSON.stringify({
          error: "Failed to send any notification emails",
          errorType: "EMAIL_SEND_FAILED",
          details: errors,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[Cancellation Notification] Unexpected error in function:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        errorType: "INTERNAL_ERROR",
        details: error instanceof Error ? error.message : String(error)
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});