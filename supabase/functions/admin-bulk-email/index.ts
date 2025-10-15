import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
};

interface BulkEmailRecipient {
  email: string;
  name?: string | null;
  userId?: string | null;
}

interface BulkEmailRequest {
  subject: string;
  htmlBody: string;
  recipients: BulkEmailRecipient[];
}

interface SendSummary {
  sent: number;
  failed: number;
  invalid: number;
}

type SupabaseUserRecord = {
  is_admin: boolean | null;
};

const MAX_RECIPIENTS = 1500;
const SUBJECT_MAX_LENGTH = 200;
const HTML_MAX_LENGTH = 20000;

const RATE_LIMIT_DELAY_MS = getRateLimitDelay();
const INFO_COPY_EMAIL = "info@ofsl.ca";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json()) as BulkEmailRequest | null;

    if (!body) {
      return buildErrorResponse("Invalid request payload", 400);
    }

    const { subject, htmlBody, recipients } = body;

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return buildErrorResponse("At least one recipient is required", 400);
    }

    if (recipients.length > MAX_RECIPIENTS) {
      return buildErrorResponse(`Too many recipients. Limit is ${MAX_RECIPIENTS}.`, 400);
    }

    if (typeof subject !== "string" || subject.trim().length === 0) {
      return buildErrorResponse("Subject is required", 400);
    }

    if (subject.length > SUBJECT_MAX_LENGTH) {
      return buildErrorResponse(`Subject must be ${SUBJECT_MAX_LENGTH} characters or fewer.`, 400);
    }

    if (typeof htmlBody !== "string" || htmlBody.trim().length === 0) {
      return buildErrorResponse("Message body is required", 400);
    }

    if (htmlBody.length > HTML_MAX_LENGTH) {
      return buildErrorResponse(`Message body must be ${HTML_MAX_LENGTH} characters or fewer.`, 400);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return buildErrorResponse("Authorization header required", 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      console.error("admin-bulk-email: Missing Supabase environment variables");
      return buildErrorResponse("Server configuration error", 500);
    }

    if (!resendApiKey) {
      console.error("admin-bulk-email: RESEND_API_KEY not configured");
      return buildErrorResponse("Email service is not configured", 500);
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const authClient = createClient(supabaseUrl, anonKey);

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser(token);

    if (userError || !user) {
      return buildErrorResponse("Invalid authentication token", 401);
    }

    const { data: adminRecord, error: adminCheckError } = await serviceClient
      .from<SupabaseUserRecord>("users")
      .select("is_admin")
      .or(`id.eq.${user.id},auth_id.eq.${user.id}`)
      .maybeSingle();

    if (adminCheckError) {
      console.error("admin-bulk-email: failed to verify admin status", adminCheckError);
      return buildErrorResponse("Unable to verify permissions", 500);
    }

    if (!adminRecord?.is_admin) {
      return buildErrorResponse("Only administrators can send bulk emails", 403);
    }

    const summary: SendSummary = {
      sent: 0,
      failed: 0,
      invalid: 0,
    };

    const rateLimiter = createRateLimiter(RATE_LIMIT_DELAY_MS);

    let bccCopySent = false;

    for (const recipient of recipients) {
      if (!recipient?.email || typeof recipient.email !== "string") {
        summary.invalid += 1;
        continue;
      }

      const trimmedEmail = recipient.email.trim();
      if (!isValidEmail(trimmedEmail)) {
        summary.invalid += 1;
        continue;
      }

      const personalization = buildPersonalization(recipient.name, trimmedEmail);
      const personalizedSubject = replaceTokens(subject, personalization.plain);
      const personalizedHtml = replaceTokens(htmlBody, personalization.html);
      const wrappedHtml = wrapWithTemplate(personalizedSubject, personalizedHtml);

      await waitForRateLimiter(rateLimiter);
      const shouldBccInfo = !bccCopySent && trimmedEmail.toLowerCase() !== INFO_COPY_EMAIL;
      const bccList = shouldBccInfo ? [INFO_COPY_EMAIL] : [];

      const sent = await sendEmail(
        resendApiKey,
        trimmedEmail,
        personalizedSubject,
        wrappedHtml,
        bccList,
      );
      if (sent) {
        summary.sent += 1;
        if (shouldBccInfo) {
          bccCopySent = true;
        }
      } else {
        summary.failed += 1;
      }
    }

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("admin-bulk-email: unexpected error", error);
    return buildErrorResponse("Unexpected server error", 500);
  }
});

function buildErrorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function replaceTokens(input: string, replacements: Record<string, string>): string {
  let output = input;
  for (const [token, replacement] of Object.entries(replacements)) {
    const pattern = new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    output = output.replace(pattern, replacement);
  }
  return output;
}

function buildPersonalization(name: string | null | undefined, email: string) {
  const fullName = normalizeFullName(name, email);
  const firstName = deriveFirstName(fullName, email);

  const plain = {
    "{{first_name}}": firstName,
    "{{full_name}}": fullName,
    "{{email}}": email,
  };

  const html = {
    "{{first_name}}": escapeHtml(firstName),
    "{{full_name}}": escapeHtml(fullName),
    "{{email}}": escapeHtml(email),
  };

  return { plain, html };
}

function normalizeFullName(name: string | null | undefined, fallbackEmail: string): string {
  if (name && name.trim().length > 0) {
    return name.trim();
  }
  return fallbackEmail;
}

function deriveFirstName(fullName: string, fallbackEmail: string): string {
  if (!fullName || fullName === fallbackEmail) {
    const localPart = fallbackEmail.split("@")[0];
    return localPart ? localPart : fallbackEmail;
  }
  const segments = fullName.split(/\s+/).filter(Boolean);
  return segments.length > 0 ? segments[0] : fullName;
}

async function sendEmail(
  resendApiKey: string,
  to: string,
  subject: string,
  html: string,
  bcc: string[] = [],
) {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "OFSL <info@ofsl.ca>",
        reply_to: "info@ofsl.ca",
        to: [to],
        bcc: bcc.length > 0 ? bcc : undefined,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("admin-bulk-email: Resend API error", response.status, errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.error("admin-bulk-email: failed to send email", error);
    return false;
  }
}

function wrapWithTemplate(subject: string, contentHtml: string): string {
  const safeSubject = escapeHtml(subject.trim() || 'Ottawa Fun Sports League');

  return `
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5;">
      <tr>
        <td align="center" style="padding: 20px 0;">
          <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff;">
            <tr>
              <td align="center" style="background-color: #B20000; padding: 30px 20px;">
                <img src="https://ofsl.ca/group-1.png" alt="OFSL" style="width: 260px; height: auto; max-width: 100%;" />
              </td>
            </tr>
            <tr>
              <td style="padding: 40px 30px; background-color: #ffffff;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td style="padding-bottom: 20px;">
                      <h2 style="color: #2c3e50; margin: 0; font-size: 24px; font-weight: bold; font-family: Arial, sans-serif;">${safeSubject}</h2>
                    </td>
                  </tr>
                  <tr>
                    <td style="color: #2c3e50; font-size: 16px; line-height: 24px; font-family: Arial, sans-serif;">
                      ${contentHtml}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background-color: #f8f9fa; padding: 20px 30px;">
                <p style="color: #7f8c8d; font-size: 13px; line-height: 20px; margin: 0; font-family: Arial, sans-serif;">
                  This message was sent by the Ottawa Fun Sports League. If you have any questions, contact us at
                  <a href="mailto:info@ofsl.ca" style="color: #B20000; text-decoration: none; font-weight: bold;">info@ofsl.ca</a>.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

interface RateLimiterState {
  nextAvailable: number;
  delayMs: number;
}

function getRateLimitDelay(): number {
  const value = Number(Deno.env.get("RESEND_RATE_DELAY_MS") ?? "600");
  if (!Number.isFinite(value) || value < 0) {
    return 600;
  }
  return value;
}

function createRateLimiter(delayMs: number): RateLimiterState {
  return {
    nextAvailable: Date.now(),
    delayMs: Math.max(0, delayMs),
  };
}

async function waitForRateLimiter(state: RateLimiterState) {
  if (state.delayMs <= 0) return;
  const now = Date.now();
  if (now < state.nextAvailable) {
    await sleep(state.nextAvailable - now);
  }
  state.nextAvailable = Date.now() + state.delayMs;
}

function sleep(ms: number) {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}
