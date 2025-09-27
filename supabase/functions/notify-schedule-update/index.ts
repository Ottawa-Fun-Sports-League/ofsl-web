import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

interface NotificationChange {
  label: string;
  previous: string | null;
  next: string | null;
}

interface ScheduleTeam {
  position: string;
  name: string | null;
  ranking: number | null;
}

interface ScheduleDetails {
  location: string | null;
  time: string | null;
  court: string | null;
  format?: string | null;
}

interface TriggeredBy {
  id?: string;
  name?: string | null;
  email?: string | null;
}

interface NotificationRequest {
  leagueId: number;
  leagueName: string;
  weekNumber: number;
  tierNumber: number;
  changes: NotificationChange[];
  schedule: ScheduleDetails;
  previousSchedule?: ScheduleDetails | null;
  teams: ScheduleTeam[];
  scheduleUrl?: string;
  triggeredBy?: TriggeredBy;
  sendToFacilitator?: boolean;
  sendToParticipants?: boolean;
  tierLabel?: string;
  relatedLocations?: string[];
}

interface RecipientMeta {
  name: string | null;
}

interface FacilitatorInfo {
  name: string | null;
  email: string | null;
  phone: string | null;
}

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
    const body = (await req.json()) as NotificationRequest;

    if (!body || !body.leagueId || !body.leagueName || !body.weekNumber || !body.tierNumber) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization header required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      console.error("notify-schedule-update: Missing Supabase environment variables");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const authClient = createClient(supabaseUrl, anonKey);

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authentication token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: leagueData, error: leagueError } = await serviceClient
      .from("leagues")
      .select("name, schedule_visible, team_registration")
      .eq("id", body.leagueId)
      .maybeSingle();

    if (leagueError) {
      console.error("notify-schedule-update: failed to load league", leagueError);
      return new Response(JSON.stringify({ error: "Failed to load league data" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!leagueData) {
      return new Response(JSON.stringify({ error: "League not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (leagueData.schedule_visible === false) {
      return new Response(
        JSON.stringify({ message: "Schedule is not public; notification suppressed" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const sendToParticipants = body.sendToParticipants !== false;
    const sendToFacilitator = body.sendToFacilitator !== false;

    if (!sendToParticipants && !sendToFacilitator) {
      return new Response(
        JSON.stringify({ message: "Notification skipped by requester" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const recipientMap = sendToParticipants
      ? await collectRecipients(serviceClient, body.leagueId)
      : new Map<string, RecipientMeta>();

    const locationsToCheck = Array.from(new Set([
      body.schedule?.location?.trim() || '',
      body.previousSchedule?.location?.trim() || '',
      ...((body.relatedLocations ?? []).map((loc) => (loc || '').trim()))
    ].filter((loc) => loc !== '')));

    const facilitators = await getFacilitatorsForLocations(serviceClient, locationsToCheck);

    if (sendToFacilitator && facilitators.length > 0) {
      facilitators.forEach((facilitator) => {
        if (facilitator.email) {
          recipientMap.set(facilitator.email.toLowerCase(), { name: facilitator.name ?? null });
        }
      });
    }

    if (recipientMap.size === 0) {
      return new Response(
        JSON.stringify({ message: "No recipients found; notification skipped" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("notify-schedule-update: RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subject = buildEmailSubject(body.leagueName, body.weekNumber, body.tierLabel || `Tier ${body.tierNumber}`);
    let delivered = 0;

    for (const [email, meta] of recipientMap.entries()) {
      if (!email) continue;
      const html = buildEmailHtml({
        request: body,
        recipientName: meta.name,
        facilitator: sendToFacilitator ? facilitators[0] ?? null : null,
      });

      const response = await sendEmail(resendApiKey, email, subject, html);
      if (response) {
        delivered += 1;
      }
    }

    return new Response(JSON.stringify({ delivered }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("notify-schedule-update: unexpected error", error);
    return new Response(JSON.stringify({ error: "Unexpected server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function collectRecipients(client: SupabaseClient, leagueId: number) {
  const recipients = new Map<string, RecipientMeta>();
  const userIds = new Set<string>();

  const { data: teamRows, error: teamError } = await client
    .from("teams")
    .select("captain_id, co_captains, roster")
    .eq("league_id", leagueId);

  if (teamError) {
    console.error("notify-schedule-update: failed to load teams", teamError);
  }

  (teamRows ?? []).forEach((team) => {
    if (team && typeof team === "object") {
      const cast = team as {
        captain_id: string | null;
        co_captains: string[] | null;
        roster: string[] | null;
      };

      if (cast.captain_id) userIds.add(cast.captain_id);
      (cast.co_captains ?? []).forEach((id) => id && userIds.add(id));
      (cast.roster ?? []).forEach((id) => id && userIds.add(id));
    }
  });

  const { data: payments, error: paymentError } = await client
    .from("league_payments")
    .select("user_id")
    .eq("league_id", leagueId);

  if (paymentError) {
    console.error("notify-schedule-update: failed to load league payments", paymentError);
  }

  (payments ?? []).forEach((row) => {
    if (row && typeof row === "object" && "user_id" in row) {
      const userId = (row as { user_id: string | null }).user_id;
      if (userId) {
        userIds.add(userId);
      }
    }
  });

  if (userIds.size === 0) {
    return recipients;
  }

  const idList = Array.from(userIds);
  const chunkSize = 100;
  for (let i = 0; i < idList.length; i += chunkSize) {
    const chunk = idList.slice(i, i + chunkSize);

    const { data: usersById, error: usersByIdError } = await client
      .from('users')
      .select('id, auth_id, name, email')
      .in('id', chunk);

    if (usersByIdError) {
      console.error('notify-schedule-update: failed to load users by id', usersByIdError);
    }

    const foundIds = new Set((usersById ?? []).map((user) => user.id));
    const missingIds = chunk.filter((id) => !foundIds.has(id));

    let combinedUsers = usersById ?? [];

    if (missingIds.length > 0) {
      const { data: usersByAuthId, error: usersByAuthError } = await client
        .from('users')
        .select('id, auth_id, name, email')
        .in('auth_id', missingIds);

      if (usersByAuthError) {
        console.error('notify-schedule-update: failed to load users by auth_id', usersByAuthError);
      }

      if (usersByAuthId && usersByAuthId.length > 0) {
        combinedUsers = combinedUsers.concat(usersByAuthId);
      }
    }

    combinedUsers.forEach((userRow) => {
      if (userRow && typeof userRow === 'object') {
        const cast = userRow as { id: string; auth_id: string | null; name: string | null; email: string | null };
        if (cast.email) {
          recipients.set(cast.email.toLowerCase(), { name: cast.name ?? null });
        }
      }
    });
  }

  return recipients;
}

async function getFacilitatorsForLocation(
  client: SupabaseClient,
  location: string | null | undefined,
) {
  if (!location || !location.trim()) {
    return [];
  }

  const normalized = location.trim();

  const { data: gymExact, error: exactError } = await client
    .from("gyms")
    .select("facilitator_ids")
    .eq("gym", normalized)
    .maybeSingle();

  if (exactError) {
    console.error("notify-schedule-update: failed exact gym lookup", exactError);
  }

  if (gymExact && Array.isArray(gymExact.facilitator_ids)) {
    const ids = gymExact.facilitator_ids.filter((id: unknown): id is string => typeof id === 'string');
    if (ids.length > 0) {
      return await fetchFacilitatorsByIds(client, ids);
    }
  }

  const escaped = normalized.replace(/%/g, "\\%").replace(/_/g, "\\_");
  const { data: gymLike, error: likeError } = await client
    .from("gyms")
    .select("facilitator_ids")
    .ilike("gym", `%${escaped}%`)
    .limit(1);

  if (likeError) {
    console.error("notify-schedule-update: failed fallback gym lookup", likeError);
  }

  if (gymLike && gymLike.length > 0) {
    const entry = gymLike[0] as { facilitator_ids: string[] | null };
    if (Array.isArray(entry.facilitator_ids) && entry.facilitator_ids.length > 0) {
      return await fetchFacilitatorsByIds(client, entry.facilitator_ids);
    }
  }

  return [];
}

async function fetchFacilitatorsByIds(client: SupabaseClient, ids: string[]) {
  const uniqueIds = Array.from(new Set(ids.filter((id) => typeof id === 'string')));
  if (uniqueIds.length === 0) return [];

  const { data, error } = await client
    .from('users')
    .select('id, name, email, phone')
    .in('id', uniqueIds);

  if (error) {
    console.error('notify-schedule-update: failed to load facilitators by id', error);
    return [];
  }

  return (data ?? [])
    .filter((row) => row && row.email)
    .map((row) => ({
      name: row.name ?? null,
      email: row.email ?? null,
      phone: row.phone ?? null,
    } as FacilitatorInfo));
}

async function getFacilitatorsForLocations(client: SupabaseClient, locations: string[]) {
  if (!locations.length) return [];
  const facilitatorsMap = new Map<string, FacilitatorInfo>();

  for (const location of locations) {
    const facilitators = await getFacilitatorsForLocation(client, location);
    facilitators.forEach((facilitator) => {
      if (facilitator.email) {
        facilitatorsMap.set(facilitator.email.toLowerCase(), facilitator);
      }
    });
  }

  return Array.from(facilitatorsMap.values());
}

function buildEmailSubject(leagueName: string, weekNumber: number, tierLabel: string) {
  return `Schedule Update: ${leagueName} (Week ${weekNumber}, ${tierLabel})`;
}

function buildEmailHtml({
  request,
  recipientName,
  facilitator,
}: {
  request: NotificationRequest;
  recipientName: string | null;
  facilitator: FacilitatorInfo | null;
}) {
  const tierLabel = request.tierLabel || `Tier ${request.tierNumber}`;
  const greeting = recipientName ? `Hello ${escapeHtml(recipientName)},` : "Hello,";

  const teamsRows = (request.teams ?? []).map(
    (team) => `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #2c3e50;">${escapeHtml(team.position)}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #2c3e50;">${escapeHtml(formatValue(team.name))}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #2c3e50;">${team.ranking ?? "-"}</td>
    </tr>
  `,
  );

  const schedule = request.schedule || {};

  const facilitatorLine =
    facilitator?.name && facilitator.email
      ? `<p style="color: #2c3e50; font-size: 14px; line-height: 21px; margin: 16px 0 0 0; font-family: Arial, sans-serif;">
        Current facilitator for ${escapeHtml(formatValue(schedule.location))}: <strong>${escapeHtml(facilitator.name)}</strong>
      </p>`
      : "";

  const scheduleUrl = request.scheduleUrl
    ? `
    <p style="margin: 20px 0 0 0;">
      <a href="${escapeAttribute(request.scheduleUrl)}" style="background-color: #B20000; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 6px; display: inline-block; font-weight: bold;">
        View Full Schedule
      </a>
    </p>
  `
    : "";

  return `
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5;">
      <tr>
        <td align="center" style="padding: 20px 0;">
          <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff;">
            <tr>
              <td align="center" style="background-color: #B20000; padding: 30px 20px;">
                <img src="https://ofsl.ca/group-1.png" alt="OFSL" style="width: 300px; height: auto; max-width: 100%;" />
              </td>
            </tr>
            <tr>
              <td style="padding: 40px 30px; background-color: #ffffff;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td style="padding-bottom: 20px;">
                      <p style="color: #2c3e50; font-size: 16px; line-height: 24px; margin: 0 0 15px 0; font-family: Arial, sans-serif;">
                        ${greeting}
                      </p>
                      <p style="color: #2c3e50; font-size: 16px; line-height: 24px; margin: 0; font-family: Arial, sans-serif;">
                        The schedule for <strong style="color: #B20000;">${escapeHtml(request.leagueName)}</strong>
                        (Week ${request.weekNumber}, ${escapeHtml(tierLabel)}) has been updated.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-bottom: 25px;">
                      <h3 style="color: #2c3e50; font-size: 18px; margin: 0 0 10px 0; font-family: Arial, sans-serif;">Updated Schedule Details</h3>
                      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f8f9fa; border: 1px solid #e5e7eb; border-radius: 6px;">
                        <tr>
                          <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #2c3e50;"><strong>Location:</strong> ${escapeHtml(formatValue(schedule.location))}</td>
                        </tr>
                        <tr>
                          <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #2c3e50;"><strong>Time:</strong> ${escapeHtml(formatValue(schedule.time))}</td>
                        </tr>
                        <tr>
                          <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #2c3e50;"><strong>Court:</strong> ${escapeHtml(formatValue(schedule.court))}</td>
                        </tr>
                        ${schedule.format ? `<tr><td style="padding: 12px 16px; color: #2c3e50;"><strong>Format:</strong> ${escapeHtml(formatValue(schedule.format))}</td></tr>` : ""}
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-bottom: 25px;">
                      <h3 style="color: #2c3e50; font-size: 18px; margin: 0 0 10px 0; font-family: Arial, sans-serif;">Teams in this Tier</h3>
                      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border: 1px solid #e5e7eb; border-radius: 6px; border-collapse: collapse;">
                        <thead>
                          <tr style="background-color: #f3f4f6;">
                            <th align="left" style="padding: 10px 12px; color: #2c3e50; font-size: 14px;">Position</th>
                            <th align="left" style="padding: 10px 12px; color: #2c3e50; font-size: 14px;">Team</th>
                            <th align="left" style="padding: 10px 12px; color: #2c3e50; font-size: 14px;">Ranking</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${
                            teamsRows.length > 0
                              ? teamsRows.join("")
                              : `<tr><td colspan="3" style="padding: 10px 12px; color: #2c3e50;">No team assignments available.</td></tr>`
                          }
                        </tbody>
                      </table>
                    </td>
                  </tr>
                  ${facilitatorLine ? `<tr><td>${facilitatorLine}</td></tr>` : ""}
                  <tr>
                    <td>
                      ${scheduleUrl}
                      <p style="color: #7f8c8d; font-size: 14px; line-height: 21px; margin: 20px 0 0 0; font-family: Arial, sans-serif;">
                        If you have any questions, please reach out to us at
                        <a href="mailto:info@ofsl.ca" style="color: #B20000; text-decoration: none; font-weight: bold;">info@ofsl.ca</a>.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

function formatValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "TBD";
  const str = String(value).trim();
  return str.length > 0 ? str : "TBD";
}

function escapeHtml(value: string | null | undefined) {
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

async function sendEmail(resendApiKey: string, to: string, subject: string, html: string) {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Ottawa Fun Sports League <info@ofsl.ca>",
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("notify-schedule-update: Resend API error", response.status, errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.error("notify-schedule-update: failed to send email", error);
    return false;
  }
}
