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
  originalTeamName?: string;
  preferredTeamName?: string;
  displayTeamName?: string;
  rosterCount?: number;
  teamMemberNames?: string[];
  teamIsWaitlisted?: boolean;
  isWaitlisted?: boolean;
  amountDue?: number | null;
  amountPaid?: number | null;
  paymentStatus?: string | null;
  skillLevelName?: string | null;
  cancelledAt: string;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeValue = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const validateEmail = (value?: string | null): string | null => {
  const normalized = normalizeValue(value);
  if (!normalized) return null;
  return emailPattern.test(normalized) ? normalized : null;
};

// Helper function to send email with retry logic
async function sendEmailWithRetry(
  resendApiKey: string,
  emailType: 'user' | 'admin',
  emailContent: { to: string; subject: string; html: string; },
  maxRetries: number = 3
): Promise<{ success: boolean; result?: { type: string; emailId: string; }; error?: string }> {
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
      originalTeamName,
      preferredTeamName,
      displayTeamName,
      rosterCount,
      teamMemberNames,
      teamIsWaitlisted,
      isWaitlisted,
      amountDue,
      amountPaid,
      paymentStatus,
      skillLevelName,
      cancelledAt,
    }: CancellationNotificationRequest = await req.json();

    if (!userId || !leagueName) {
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

    let resolvedUserName = normalizeValue(userName);
    let resolvedUserEmail = validateEmail(userEmail);
    let resolvedUserPhone = normalizeValue(userPhone);

    if (!resolvedUserEmail || !resolvedUserName || !resolvedUserPhone) {
      try {
        const { data: userRecord, error: userLookupError } = await _supabase
          .from("users")
          .select("name, email, phone")
          .eq("id", userId)
          .maybeSingle();

        if (userLookupError) {
          console.warn(
            "[Cancellation Notification] Unable to fetch user profile for fallback data",
            { userId, error: userLookupError.message },
          );
        } else if (userRecord) {
          if (!resolvedUserName && normalizeValue(userRecord.name)) {
            resolvedUserName = normalizeValue(userRecord.name);
          }
          if (!resolvedUserEmail) {
            resolvedUserEmail = validateEmail(userRecord.email);
          }
          if (!resolvedUserPhone && normalizeValue(userRecord.phone)) {
            resolvedUserPhone = normalizeValue(userRecord.phone);
          }
        }
      } catch (lookupError) {
        console.warn(
          "[Cancellation Notification] Exception while resolving user profile",
          { userId, error: lookupError instanceof Error ? lookupError.message : String(lookupError) },
        );
      }
    }

    const finalUserName = resolvedUserName ?? "Team Captain";
    const finalUserEmail = resolvedUserEmail;
    const finalUserPhone = resolvedUserPhone ?? undefined;

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

    const candidateTeamNames = [
      preferredTeamName,
      originalTeamName,
      displayTeamName,
      teamName,
    ].filter((name): name is string => typeof name === "string" && name.trim().length > 0);
    let finalTeamName = candidateTeamNames.length > 0 ? candidateTeamNames[0].trim() : "";
    if (!finalTeamName && isTeamRegistration && teamName) {
      finalTeamName = teamName.trim();
    }
    if (finalTeamName && /^waitlist\s*-\s*/i.test(finalTeamName)) {
      const stripped = finalTeamName.replace(/^waitlist\s*-\s*/i, "").trim();
      if (stripped.length > 0) {
        finalTeamName = stripped;
      }
    }
    const teamDisplayName = finalTeamName || teamName;

    const rosterNames =
      teamMemberNames?.filter((name) => typeof name === "string" && name.trim().length > 0) ?? [];
    const effectiveRosterCount = typeof rosterCount === "number"
      ? rosterCount
      : rosterNames.length > 0
        ? rosterNames.length
        : undefined;

    const normalizedPaymentStatus = paymentStatus ? paymentStatus.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : null;

    // Create user email content
    const userEmailContent = finalUserEmail ? {
      to: [finalUserEmail],
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
                                  Hi ${finalUserName},
                                </p>
                                <p style="color: #2c3e50; font-size: 16px; line-height: 24px; margin: 15px 0 0 0; font-family: Arial, sans-serif;">
                                  Your ${isTeamRegistration ? `team registration for <strong>${teamDisplayName ?? 'your team'}</strong> in` : 'individual registration for'} 
                                  the <strong style="color: #B20000;">${leagueName}</strong> league has been successfully cancelled.
                                </p>
                                ${isTeamRegistration && teamIsWaitlisted !== undefined ? `
                                <p style="color: #2c3e50; font-size: 14px; line-height: 20px; margin: 15px 0 0 0; font-family: Arial, sans-serif;">
                                  Waitlist Status: ${teamIsWaitlisted ? 'Waitlisted team' : 'Active team'} prior to cancellation.
                                </p>` : ''}
                                ${!isTeamRegistration && typeof isWaitlisted === 'boolean' ? `
                                <p style="color: #2c3e50; font-size: 14px; line-height: 20px; margin: 15px 0 0 0; font-family: Arial, sans-serif;">
                                  Waitlist Status: ${isWaitlisted ? 'Waitlisted registration' : 'Active registration'} prior to cancellation.
                                </p>` : ''}
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
                                      ${isTeamRegistration && teamDisplayName ? `<strong>Team:</strong> ${teamDisplayName}<br>` : ''}
                                      <strong>Registration Type:</strong> ${isTeamRegistration ? 'Team' : 'Individual'}<br>
                                      <strong>Cancelled On:</strong> ${cancellationDate}
                                      ${skillLevelName ? `<br><strong>Skill Level:</strong> ${skillLevelName}` : ''}
                                      ${effectiveRosterCount !== undefined && isTeamRegistration ? `<br><strong>Roster Size:</strong> ${effectiveRosterCount} player${effectiveRosterCount === 1 ? '' : 's'}` : ''}
                                      ${!isTeamRegistration && typeof amountPaid === 'number' && typeof amountDue === 'number'
                                        ? `<br><strong>Payments:</strong> $${amountPaid.toFixed(2)} paid / $${amountDue.toFixed(2)} due`
                                        : ''}
                                      ${!isTeamRegistration && normalizedPaymentStatus
                                        ? `<br><strong>Payment Status:</strong> ${normalizedPaymentStatus}`
                                        : ''}
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
    } : null;

    if (!userEmailContent) {
      console.warn(
        "[Cancellation Notification] No valid email for user; skipping direct notification",
        { userId, providedEmail: userEmail },
      );
    }

    // Create admin email content
    const adminEmailContent = {
      to: ["info@ofsl.ca"],
      subject: `[Cancellation] ${finalUserName} - ${leagueName} ${isTeamRegistration ? '(Team)' : '(Individual)'}`,
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
                                      <span style="color: #2c3e50; font-size: 16px; font-family: Arial, sans-serif; margin-left: 10px;">${finalUserName}</span>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 8px 0;">
                                      <strong style="color: #5a6c7d; font-size: 14px; font-family: Arial, sans-serif;">Email:</strong>
                                      ${
                                        finalUserEmail
                                          ? `<a href="mailto:${finalUserEmail}" style="color: #1976d2; font-size: 16px; font-family: Arial, sans-serif; margin-left: 10px; text-decoration: none;">${finalUserEmail}</a>`
                                          : `<span style="color: #2c3e50; font-size: 16px; font-family: Arial, sans-serif; margin-left: 10px;">Not provided</span>`
                                      }
                                    </td>
                                  </tr>
                                  ${finalUserPhone ? `
                                  <tr>
                                    <td style="padding: 8px 0;">
                                      <strong style="color: #5a6c7d; font-size: 14px; font-family: Arial, sans-serif;">Phone:</strong>
                                      <span style="color: #2c3e50; font-size: 16px; font-family: Arial, sans-serif; margin-left: 10px;">${finalUserPhone}</span>
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
                                      <span style="color: #2c3e50; font-size: 16px; font-family: Arial, sans-serif; margin-left: 10px;">${teamDisplayName ?? teamName}</span>
                                    </td>
                                  </tr>
                                  ` : ''}
                                  ${isTeamRegistration && typeof teamIsWaitlisted === 'boolean' ? `
                                  <tr>
                                    <td style="padding: 8px 0;">
                                      <strong style="color: #5a6c7d; font-size: 14px; font-family: Arial, sans-serif;">Waitlist Status:</strong>
                                      <span style="color: #2c3e50; font-size: 16px; font-family: Arial, sans-serif; margin-left: 10px;">${teamIsWaitlisted ? 'Waitlisted team' : 'Active team'}</span>
                                    </td>
                                  </tr>
                                  ` : ''}
                                  ${!isTeamRegistration && typeof isWaitlisted === 'boolean' ? `
                                  <tr>
                                    <td style="padding: 8px 0;">
                                      <strong style="color: #5a6c7d; font-size: 14px; font-family: Arial, sans-serif;">Waitlist Status:</strong>
                                      <span style="color: #2c3e50; font-size: 16px; font-family: Arial, sans-serif; margin-left: 10px;">${isWaitlisted ? 'Waitlisted registration' : 'Active registration'}</span>
                                    </td>
                                  </tr>
                                  ` : ''}
                                  ${skillLevelName ? `
                                  <tr>
                                    <td style="padding: 8px 0;">
                                      <strong style="color: #5a6c7d; font-size: 14px; font-family: Arial, sans-serif;">Skill Level:</strong>
                                      <span style="color: #2c3e50; font-size: 16px; font-family: Arial, sans-serif; margin-left: 10px;">${skillLevelName}</span>
                                    </td>
                                  </tr>
                                  ` : ''}
                                  ${typeof effectiveRosterCount === 'number' && isTeamRegistration ? `
                                  <tr>
                                    <td style="padding: 8px 0;">
                                      <strong style="color: #5a6c7d; font-size: 14px; font-family: Arial, sans-serif;">Roster Size:</strong>
                                      <span style="color: #2c3e50; font-size: 16px; font-family: Arial, sans-serif; margin-left: 10px;">${effectiveRosterCount} player${effectiveRosterCount === 1 ? '' : 's'}</span>
                                    </td>
                                  </tr>
                                  ` : ''}
                                  ${isTeamRegistration && rosterNames.length > 0 ? `
                                  <tr>
                                    <td style="padding: 8px 0;">
                                      <strong style="color: #5a6c7d; font-size: 14px; font-family: Arial, sans-serif;">Roster:</strong>
                                      <span style="color: #2c3e50; font-size: 16px; font-family: Arial, sans-serif; margin-left: 10px;">${rosterNames.join(', ')}</span>
                                    </td>
                                  </tr>
                                  ` : ''}
                                  ${!isTeamRegistration && typeof amountPaid === 'number' && typeof amountDue === 'number' ? `
                                  <tr>
                                    <td style="padding: 8px 0;">
                                      <strong style="color: #5a6c7d; font-size: 14px; font-family: Arial, sans-serif;">Payments:</strong>
                                      <span style="color: #2c3e50; font-size: 16px; font-family: Arial, sans-serif; margin-left: 10px;">$${amountPaid.toFixed(2)} paid / $${amountDue.toFixed(2)} due</span>
                                    </td>
                                  </tr>
                                  ` : ''}
                                  ${!isTeamRegistration && normalizedPaymentStatus ? `
                                  <tr>
                                    <td style="padding: 8px 0;">
                                      <strong style="color: #5a6c7d; font-size: 14px; font-family: Arial, sans-serif;">Payment Status:</strong>
                                      <span style="color: #2c3e50; font-size: 16px; font-family: Arial, sans-serif; margin-left: 10px;">${normalizedPaymentStatus}</span>
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

    const errors: string[] = [];
    const results: Array<{ type: string; emailId: string }> = [];

    if (userEmailContent) {
      const userEmailResult = await sendEmailWithRetry(
        resendApiKey,
        'user',
        userEmailContent,
      );

      if (userEmailResult.success && userEmailResult.result) {
        results.push(userEmailResult.result);
      } else if (userEmailResult.error) {
        errors.push(userEmailResult.error);
      }
    } else {
      errors.push("User email unavailable; skipped user notification");
    }

    const adminEmailResult = await sendEmailWithRetry(
      resendApiKey,
      'admin',
      adminEmailContent,
    );

    if (adminEmailResult.success && adminEmailResult.result) {
      results.push(adminEmailResult.result);
    } else if (adminEmailResult.error) {
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
