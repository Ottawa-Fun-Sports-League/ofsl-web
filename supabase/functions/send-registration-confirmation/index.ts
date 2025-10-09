import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, x-client-info, apikey",
};

// Helper function for consistent date formatting
function formatLocalDate(dateStr: string | null): string {
  if (!dateStr) return "";

  const date = new Date(dateStr + "T00:00:00");

  if (isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

interface RegistrationRequest {
  email: string;
  userName: string;
  teamName: string;
  leagueName: string;
  isWaitlist?: boolean;
  depositAmount?: number | null;
  depositDate?: string | null;
  isIndividualRegistration?: boolean;
  leagueSkillLevel?: string | null;
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
      userName,
      teamName,
      leagueName,
      isWaitlist = false,
      depositAmount = null,
      depositDate = null,
      isIndividualRegistration = false,
      leagueSkillLevel = null,
    }: RegistrationRequest = await req.json();

    if (!email || !userName || !teamName || !leagueName) {
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

    // Create the registration confirmation email content
    const emailSubject = isWaitlist
      ? `Waitlist Confirmation: ${isIndividualRegistration ? userName : teamName} in ${leagueName}`
      : `Registration Confirmation: ${isIndividualRegistration ? userName : teamName} in ${leagueName}`;

    const skillLevelLabel = leagueSkillLevel && leagueSkillLevel.trim().length > 0
      ? leagueSkillLevel.trim()
      : "Not specified";

    const emailContent = {
      to: [email],
      subject: emailSubject,
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
                            ${isWaitlist ? "Added to Waitlist!" : "Registration Received!"}
                          </h2>
                        </td>
                      </tr>
                      
                      <!-- Greeting -->
                      <tr>
                        <td style="padding-bottom: 25px;">
                          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f8f9fa;">
                            <tr>
                              <td style="padding: 25px;">
                                <p style="color: #2c3e50; font-size: 16px; line-height: 24px; margin: 0 0 15px 0; font-family: Arial, sans-serif;">
                                  Hello ${userName},
                                </p>
                                <p style="color: #2c3e50; font-size: 16px; line-height: 24px; margin: 0; font-family: Arial, sans-serif;">
                                  ${
                                    isWaitlist
                                      ? isIndividualRegistration
                                        ? `Thank you for joining the waitlist for <strong style="color: #B20000;">${leagueName}</strong>! You have been added to our waitlist.`
                                        : `Thank you for joining the waitlist for <strong style="color: #B20000;">${leagueName}</strong>! Your team <strong style="color: #B20000;">${teamName}</strong> has been added to our waitlist.`
                                      : isIndividualRegistration
                                        ? `Thank you for registering for <strong style="color: #B20000;">${leagueName}</strong>!`
                                        : `Thank you for registering your team <strong style="color: #B20000;">${teamName}</strong> for <strong style="color: #B20000;">${leagueName}</strong>!`
                                  }
                                </p>
                                <p style="color: #2c3e50; font-size: 15px; line-height: 22px; margin: 15px 0 0 0; font-family: Arial, sans-serif;">
                                  <strong style="color: #5a6c7d;">League:</strong>
                                  <span style="margin-left: 6px;">${leagueName}</span><br>
                                  <strong style="color: #5a6c7d;">Skill Level:</strong>
                                  <span style="margin-left: 6px;">${skillLevelLabel}</span>
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      <!-- Important Notice -->
                      ${
                        isWaitlist ||
                        (!isWaitlist && depositAmount && depositDate)
                          ? `
                      <tr>
                        <td style="padding-bottom: 30px;">
                          ${
                            isWaitlist
                              ? `
                          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #fff8e1; border: 1px solid #ffe082;">
                            <tr>
                              <td style="padding: 25px;">
                                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                  <tr>
                                    <td style="font-family: Arial, sans-serif;">
                                      <h3 style="color: #f57f17; font-size: 18px; margin: 0 0 15px 0;">
                                        ⏳ You're on the Waitlist
                                      </h3>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td>
                                      <p style="color: #2c3e50; font-size: 16px; line-height: 24px; margin: 0 0 15px 0; font-family: Arial, sans-serif;">
                                        The league is currently full, but don't worry! Sometimes people change their plans and spots open up. We'll keep you posted if a space becomes available.
                                      </p>
                                      <p style="color: #2c3e50; font-size: 16px; line-height: 24px; margin: 0; font-family: Arial, sans-serif;">
                                        <strong>No payment is required at this time.</strong> If a spot opens up, we'll contact you with payment instructions.
                                      </p>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                          `
                              : `
                          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #fff5f5; border: 1px solid #ffe0e0;">
                            <tr>
                              <td style="padding: 25px;">
                                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                  <tr>
                                    <td style="font-family: Arial, sans-serif;">
                                      <h3 style="color: #B20000; font-size: 18px; margin: 0 0 15px 0;">
                                        ⚠️ Important: Secure Your Spot
                                      </h3>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td>
                                      <p style="color: #2c3e50; font-size: 16px; line-height: 24px; margin: 0 0 15px 0; font-family: Arial, sans-serif;">
                                        In order to secure your spot, please provide a <strong>non-refundable deposit of $${depositAmount.toFixed(2)}</strong> by e-transfer by <strong>${formatLocalDate(depositDate)}</strong> to the following email address:
                                      </p>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td align="center" style="padding: 20px 0;">
                                      <table cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border: 2px solid #B20000;">
                                        <tr>
                                          <td style="padding: 20px 40px;">
                                            <p style="color: #B20000; font-size: 18px; font-weight: bold; margin: 0; font-family: Arial, sans-serif;">
                                              ofslpayments@gmail.com
                                            </p>
                                            <p style="color: #5a6c7d; font-size: 14px; margin: 10px 0 0 0; font-family: Arial, sans-serif;">
                                              Please indicate ${isIndividualRegistration ? `your name <strong>"${userName}"</strong>` : `your team name <strong>"${teamName}"</strong>`} on the e-transfer
                                            </p>
                                          </td>
                                        </tr>
                                      </table>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td>
                                      <p style="color: #7f8c8d; font-size: 14px; line-height: 21px; margin: 15px 0 0 0; font-style: italic; font-family: Arial, sans-serif;">
                                        Note: After the allotted time, we will unfortunately be unable to hold your spot.
                                      </p>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                          `
                          }
                        </td>
                      </tr>
                      `
                          : ""
                      }
                      
                      <!-- Next Steps -->
                      <tr>
                        <td style="padding-bottom: 30px;">
                          <h3 style="color: #2c3e50; font-size: 18px; margin: 0 0 15px 0; font-family: Arial, sans-serif;">Next Steps:</h3>
                          <table cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                              <td style="color: #5a6c7d; font-size: 16px; line-height: 28px; font-family: Arial, sans-serif; padding-left: 20px;">
                                ${
                                  isWaitlist
                                    ? `
                                1. <strong>Sit tight!</strong> We'll monitor the league for any openings<br>
                                2. If a spot becomes available, we'll contact you immediately<br>
                                3. You'll have 24 hours to confirm and provide payment<br>
                                4. Keep an eye on your email for updates!
                                `
                                    : depositAmount && depositDate
                                      ? `
                                1. Send your $${depositAmount.toFixed(2)} deposit via e-transfer to <strong>ofslpayments@gmail.com</strong><br>
                                2. Include ${isIndividualRegistration ? `your name "<strong>${userName}</strong>"` : `your team name "<strong>${teamName}</strong>"`} in the e-transfer message<br>
                                3. Ensure payment is sent by <strong>${formatLocalDate(depositDate)}</strong><br>
                                4. You'll receive a confirmation once we process your payment<br>
                                5. Get ready for an amazing season!
                                `
                                      : `
                                1. Your registration has been received<br>
                                2. We'll be in touch with more information about the league<br>
                                3. Get ready for an amazing season!
                                `
                                }
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      <!-- Contact -->
                      <tr>
                        <td align="center" style="padding-bottom: 30px;">
                          <p style="color: #7f8c8d; font-size: 14px; line-height: 21px; font-family: Arial, sans-serif;">
                            If you have any questions or concerns, please feel free to contact us at<br>
                            <a href="mailto:info@ofsl.ca" style="color: #B20000; text-decoration: none; font-weight: bold;">info@ofsl.ca</a>
                          </p>
                        </td>
                      </tr>
                      
                      <!-- Thank You -->
                      <tr>
                        <td align="center">
                          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #e8f4f8;">
                            <tr>
                              <td style="padding: 20px;" align="center">
                                <p style="color: #2c3e50; font-size: 16px; line-height: 24px; margin: 0; font-family: Arial, sans-serif;">
                                  Thank you,<br>
                                  <strong>OFSL Team</strong>
                                </p>
                              </td>
                            </tr>
                          </table>
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
                      This email was sent because you ${isWaitlist ? "joined the waitlist for" : isIndividualRegistration ? "registered for" : "registered a team for"} ${leagueName}.
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
        JSON.stringify({
          error: "Failed to send registration confirmation email",
        }),
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
        message: "Registration confirmation email sent successfully",
        emailId: emailResult.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error in send-registration-confirmation function:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
