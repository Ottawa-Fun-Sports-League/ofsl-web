import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, x-client-info, apikey",
};

interface IndividualRegistrationNotification {
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  leagueId: number;
  leagueName: string;
  registeredAt: string;
  amountPaid: number;
  paymentMethod: string;
  isWaitlisted?: boolean;
  skillLevelName?: string | null;
}

const skillNameCache = new Map<number, string>();
const leagueSkillCache = new Map<number, string>();

async function fetchSkillName(client: ReturnType<typeof createClient>, skillId: number | null | undefined): Promise<string | null> {
  if (skillId === null || skillId === undefined) {
    return null;
  }

  if (skillNameCache.has(skillId)) {
    return skillNameCache.get(skillId) ?? null;
  }

  const { data, error } = await client
    .from("skills")
    .select("name")
    .eq("id", skillId)
    .maybeSingle();

  if (error) {
    console.error("notify-individual-registration: failed to fetch skill name", error);
    return null;
  }

  const name = data?.name ?? null;
  if (name) {
    skillNameCache.set(skillId, name);
  }
  return name;
}

async function resolveLeagueSkillLevel(client: ReturnType<typeof createClient>, leagueId: number): Promise<string> {
  if (leagueSkillCache.has(leagueId)) {
    return leagueSkillCache.get(leagueId) ?? "Not specified";
  }

  const { data: leagueRecord, error } = await client
    .from("leagues")
    .select("skill_id, skill_ids, gender")
    .eq("id", leagueId)
    .maybeSingle();

  if (error) {
    console.error("notify-individual-registration: failed to fetch league", error);
    return "Not specified";
  }

  if (!leagueRecord) {
    return "Not specified";
  }

  let skillName = await fetchSkillName(client, leagueRecord.skill_id);

  if (!skillName && Array.isArray(leagueRecord.skill_ids) && leagueRecord.skill_ids.length > 0) {
    const uniqueIds = Array.from(new Set(leagueRecord.skill_ids.filter((id: number | null) => id !== null))) as number[];
    if (uniqueIds.length > 0) {
      const { data: skillRows, error: skillsError } = await client
        .from("skills")
        .select("name")
        .in("id", uniqueIds);

      if (skillsError) {
        console.error("notify-individual-registration: failed to fetch multi skill names", skillsError);
      } else if (skillRows && skillRows.length > 0) {
        const names = skillRows
          .map((row) => row.name)
          .filter((name): name is string => !!name && name.trim().length > 0);
        if (names.length > 0) {
          skillName = names.join(", ");
        }
      }
    }
  }

  if (!skillName && leagueRecord.gender && leagueRecord.gender.trim().length > 0) {
    skillName = leagueRecord.gender;
  }

  const resolved = skillName ?? "Not specified";
  leagueSkillCache.set(leagueId, resolved);
  return resolved;
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
      leagueId,
      leagueName,
      registeredAt,
      amountPaid,
      paymentMethod,
      isWaitlisted = false,
      skillLevelName = null,
    }: IndividualRegistrationNotification = await req.json();

    if (!userId || !userName || !userEmail || !leagueName || !leagueId) {
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
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

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

    // Create the notification email content
    const emailSubject = isWaitlisted 
      ? `New Waitlist Registration: ${userName} in ${leagueName}`
      : `New Individual Registration: ${userName} in ${leagueName}`;
    const registrationDate = new Date(registeredAt).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Toronto'
    });
    const skillLevelLabel = skillLevelName && skillLevelName.trim().length > 0
      ? skillLevelName.trim()
      : await resolveLeagueSkillLevel(serviceClient, leagueId);

    const emailContent = {
      to: ["info@ofsl.ca"],
      subject: emailSubject,
      html: `
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5;">
          <tr>
            <td align="center" style="padding: 20px 0;">
              <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff;">
                <!-- Header -->
                <tr>
                  <td align="center" style="background-color: ${isWaitlisted ? '#f59e0b' : '#B20000'}; padding: 30px 20px;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-family: Arial, sans-serif;">
                      ${isWaitlisted ? 'New Waitlist Registration' : 'New Individual Registration'}
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
                          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: ${isWaitlisted ? '#fef3c7' : '#e8f5e9'}; border: 1px solid ${isWaitlisted ? '#fbbf24' : '#a5d6a7'};">
                            <tr>
                              <td style="padding: 20px;">
                                <p style="color: ${isWaitlisted ? '#d97706' : '#2e7d32'}; font-size: 16px; line-height: 24px; margin: 0; font-family: Arial, sans-serif;">
                                  <strong>${isWaitlisted ? '⏳ A new individual has joined the waitlist!' : '🎉 A new individual has registered!'}</strong><br>
                                  ${isWaitlisted 
                                    ? 'The following player has been added to the waitlist and will be automatically promoted when a spot becomes available.'
                                    : 'The following player has just signed up for a league.'}
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      <!-- Player Details -->
                      <tr>
                        <td style="padding-bottom: 30px;">
                          <h2 style="color: #2c3e50; font-size: 20px; margin: 0 0 20px 0; font-family: Arial, sans-serif;">
                            Player Information
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
                                      <strong style="color: #5a6c7d; font-size: 14px; font-family: Arial, sans-serif;">League:</strong>
                                      <span style="color: #B20000; font-size: 16px; font-weight: bold; font-family: Arial, sans-serif; margin-left: 10px;">${leagueName}</span>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 8px 0;">
                                      <strong style="color: #5a6c7d; font-size: 14px; font-family: Arial, sans-serif;">Skill Level:</strong>
                                      <span style="color: #2c3e50; font-size: 16px; font-family: Arial, sans-serif; margin-left: 10px;">${skillLevelLabel}</span>
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
                      
                      <!-- Payment Details -->
                      <tr>
                        <td style="padding-bottom: 30px;">
                          <h2 style="color: #2c3e50; font-size: 20px; margin: 0 0 20px 0; font-family: Arial, sans-serif;">
                            Payment Information
                          </h2>
                          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f8f9fa; border: 1px solid #dee2e6;">
                            <tr>
                              <td style="padding: 20px;">
                                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                  <tr>
                                    <td style="padding: 8px 0;">
                                      <strong style="color: #5a6c7d; font-size: 14px; font-family: Arial, sans-serif;">Amount Paid:</strong>
                                      <span style="color: #2e7d32; font-size: 16px; font-weight: bold; font-family: Arial, sans-serif; margin-left: 10px;">$${amountPaid.toFixed(2)}</span>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 8px 0;">
                                      <strong style="color: #5a6c7d; font-size: 14px; font-family: Arial, sans-serif;">Payment Method:</strong>
                                      <span style="color: #2c3e50; font-size: 16px; font-family: Arial, sans-serif; margin-left: 10px;">${paymentMethod}</span>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      <!-- Admin Link -->
                      <tr>
                        <td align="center" style="padding-bottom: 30px;">
                          <a href="https://ofsl.ca/#/my-account/manage-users" style="display: inline-block; background-color: #B20000; color: #ffffff; font-size: 16px; font-weight: bold; font-family: Arial, sans-serif; text-decoration: none; padding: 15px 30px; border-radius: 5px;">
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
        from: "OFSL System <noreply@ofsl.ca>",
        ...emailContent,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      // eslint-disable-next-line no-console
      console.error("Resend API error:", errorText);
      return new Response(
        JSON.stringify({
          error: "Failed to send notification email",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const emailResult = await emailResponse.json();
    // eslint-disable-next-line no-console
    console.log("Individual registration notification email sent successfully:", emailResult);

    // Send confirmation email to the user if they're on the waitlist
    if (isWaitlisted && userEmail) {
      const userEmailContent = {
        to: [userEmail],
        subject: `Waitlist Confirmation: ${leagueName}`,
        html: `
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5;">
            <tr>
              <td align="center" style="padding: 20px 0;">
                <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff;">
                  <!-- Header -->
                  <tr>
                    <td align="center" style="background-color: #f59e0b; padding: 30px 20px;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-family: Arial, sans-serif;">
                        You're on the Waitlist!
                      </h1>
                    </td>
                  </tr>
                  
                  <!-- Main Content -->
                  <tr>
                    <td style="padding: 40px 30px; background-color: #ffffff;">
                      <table cellpadding="0" cellspacing="0" border="0" width="100%">
                        <tr>
                          <td style="padding-bottom: 20px;">
                            <p style="color: #2c3e50; font-size: 16px; line-height: 24px; margin: 0; font-family: Arial, sans-serif;">
                              Hi ${userName},
                            </p>
                          </td>
                        </tr>
                        
                        <tr>
                          <td style="padding-bottom: 20px;">
                            <p style="color: #2c3e50; font-size: 16px; line-height: 24px; margin: 0; font-family: Arial, sans-serif;">
                              You have been successfully added to the waitlist for <strong>${leagueName}</strong>.
                            </p>
                          </td>
                        </tr>
                        
                        <tr>
                          <td style="padding-bottom: 20px;">
                            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #fef3c7; border: 1px solid #fbbf24;">
                              <tr>
                                <td style="padding: 20px;">
                                  <p style="color: #d97706; font-size: 16px; line-height: 24px; margin: 0; font-family: Arial, sans-serif;">
                                    <strong>What happens next?</strong><br><br>
                                    • You are currently on the waitlist<br>
                                    • If a spot becomes available, you will be automatically promoted<br>
                                    • You will receive an email notification when you are moved to active registration<br>
                                    • No payment is required while on the waitlist
                                  </p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        
                        <tr>
                          <td style="padding-bottom: 20px;">
                            <p style="color: #2c3e50; font-size: 16px; line-height: 24px; margin: 0; font-family: Arial, sans-serif;">
                              If you have any questions, please contact us at <a href="mailto:info@ofsl.ca" style="color: #1976d2;">info@ofsl.ca</a>.
                            </p>
                          </td>
                        </tr>
                        
                        <tr>
                          <td style="padding-top: 20px;">
                            <p style="color: #2c3e50; font-size: 16px; line-height: 24px; margin: 0; font-family: Arial, sans-serif;">
                              Best regards,<br>
                              OFSL Team
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td align="center" style="background-color: #2c3e50; padding: 20px;">
                      <p style="color: #bdc3c7; font-size: 12px; margin: 0; font-family: Arial, sans-serif;">
                        Ottawa Fun Sports League | info@ofsl.ca
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        `,
      };

      try {
        const userEmailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "OFSL System <noreply@ofsl.ca>",
            ...userEmailContent,
          }),
        });

        if (!userEmailResponse.ok) {
          const errorText = await userEmailResponse.text();
          console.error("Failed to send waitlist confirmation to user:", errorText);
        } else {
          const userEmailResult = await userEmailResponse.json();
          console.log("Waitlist confirmation sent to user:", userEmailResult);
        }
      } catch (error) {
        console.error("Error sending waitlist confirmation:", error);
        // Don't fail the whole function if user email fails
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Individual registration notification sent successfully",
        emailId: emailResult.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error in notify-individual-registration function:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
