import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

interface WaitlistNotification {
  id: number;
  payment_id: number;
  team_id: number;
  league_id: number;
  user_id: string;
  email: string | null;
  user_name: string | null;
  team_name: string | null;
  league_name: string | null;
  payment_window_hours: number | null;
  registration_timestamp: string | null;
  created_at: string;
}

const formatDate = (value: string | null) => {
  if (!value) return "recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  return date.toLocaleString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const hoursLabel = (hours: number | null) => {
  if (!hours || hours <= 0) return "the required";
  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
};

serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    if (req.method !== "POST" && req.method !== "GET") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!supabaseUrl || !supabaseServiceKey || !resendApiKey) {
      console.error("Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or RESEND_API_KEY");
      return new Response(JSON.stringify({ error: "Missing server configuration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: notifications, error } = await supabase
      .from<WaitlistNotification>("team_waitlist_notifications")
      .select("*")
      .eq("sent", false)
      .order("created_at", { ascending: true })
      .limit(25);

    if (error) {
      console.error("process-team-waitlist: failed to fetch notifications", error);
      return new Response(JSON.stringify({ error: "Failed to fetch notifications" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!notifications || notifications.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "No pending notifications" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let processed = 0;

    for (const notification of notifications) {
      const recipient = notification.email;
      if (!recipient) {
        console.warn("process-team-waitlist: skipping notification with missing email", notification.id);
        await supabase
          .from("team_waitlist_notifications")
          .update({ sent: true, sent_at: new Date().toISOString(), reason: "missing_email" })
          .eq("id", notification.id);
        continue;
      }

      const captainName = notification.user_name || "Team Captain";
      const teamName = notification.team_name || "your team";
      const leagueName = notification.league_name || "your league";
      const windowLabel = hoursLabel(notification.payment_window_hours);
      const registrationMoment = formatDate(notification.registration_timestamp);

      const emailHtml = `
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5;">
          <tr>
            <td align="center" style="padding: 20px 0;">
              <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff;">
                <tr>
                  <td align="center" style="background-color: #B20000; padding: 30px 20px;">
                    <img src="https://ofsl.ca/group-1.png" alt="OFSL" style="width: 280px; height: auto; max-width: 100%;" />
                  </td>
                </tr>
                <tr>
                  <td style="padding: 32px 30px; font-family: Arial, sans-serif; color: #2c3e50;">
                    <h2 style="margin: 0 0 16px 0; font-size: 22px; color: #B20000;">Action Required: Team Moved to Waitlist</h2>
                    <p style="margin: 0 0 12px 0; font-size: 16px;">Hi ${captainName},</p>
                    <p style="margin: 0 0 12px 0; font-size: 16px;">
                      Your team <strong>${teamName}</strong> in <strong>${leagueName}</strong> has been moved to the waitlist because the ${windowLabel} payment window expired without receiving a payment.
                    </p>
                    <p style="margin: 0 0 12px 0; font-size: 16px;">
                      Registration timestamp: ${registrationMoment}
                    </p>
                    <p style="margin: 0 0 16px 0; font-size: 16px;">
                      If you believe this was an error or would like to secure a spot again, please contact us at
                      <a href="mailto:info@ofsl.ca" style="color: #B20000; font-weight: bold;">info@ofsl.ca</a>.
                    </p>
                    <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 24px 0;">
                      <tr>
                        <td align="center" style="background-color: #B20000; padding: 14px 28px; border-radius: 999px;">
                          <a href="mailto:info@ofsl.ca" style="color: #ffffff; text-decoration: none; font-weight: bold;">
                            Contact OFSL
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 0; font-size: 15px; color: #5a6c7d;">
                      Thank you for playing with OFSL,<br/>
                      The OFSL Team
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      `;

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "OFSL <info@ofsl.ca>",
          to: [recipient],
          subject: `Waitlist Update: ${teamName} in ${leagueName}`,
          html: emailHtml,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("process-team-waitlist: failed to send email", errorText);
        continue;
      }

      await supabase
        .from("team_waitlist_notifications")
        .update({ sent: true, sent_at: new Date().toISOString() })
        .eq("id", notification.id);

      processed += 1;
    }

    return new Response(JSON.stringify({ success: true, processed }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("process-team-waitlist: unexpected error", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
