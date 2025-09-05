import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
};

type TeamReg = {
  team_id: number;
  team_name: string;
  league_id: number;
  league_name: string;
  sport_name: string | null;
  role: 'captain' | 'co-captain' | 'player';
  payment_status: 'not_paid' | 'deposit_paid' | 'fully_paid';
  amount_owing: number;
  season?: string;
};

type IndividualReg = {
  league_id: number;
  league_name: string;
  sport_name: string | null;
  payment_status: 'not_paid' | 'deposit_paid' | 'fully_paid';
  amount_owing: number;
  season?: string;
};

function deriveSeason(startDate?: string | null, year?: number | null): string | undefined {
  if (!startDate) return undefined;
  const date = new Date(startDate);
  const m = date.getMonth();
  const y = year || date.getFullYear();
  if (m >= 2 && m <= 4) return `Spring ${y}`;
  if (m >= 5 && m <= 7) return `Summer ${y}`;
  if (m >= 8 && m <= 10) return `Fall ${y}`;
  return `Winter ${y}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing or invalid authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Admin check
    const { data: adminRow } = await supabaseClient
      .from('users')
      .select('is_admin')
      .or(`auth_id.eq.${user.id},id.eq.${user.id}`)
      .single();

    if (!adminRow?.is_admin) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { userId } = await req.json();
    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find user by profile id or fallback to auth_id
    let profile = null as any;
    {
      const { data: byId } = await supabaseAdmin
        .from('users')
        .select('id, name, email, league_ids')
        .eq('id', userId)
        .maybeSingle();
      if (byId) profile = byId;
      if (!profile) {
        const { data: byAuth } = await supabaseAdmin
          .from('users')
          .select('id, name, email, league_ids')
          .eq('auth_id', userId)
          .maybeSingle();
        if (byAuth) profile = byAuth;
      }
    }

    if (!profile?.id) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const profileId: string = profile.id;
    const today = new Date().toISOString().split('T')[0];

    // Load teams where user is involved and league not ended
    const { data: teams } = await supabaseAdmin
      .from('teams')
      .select(`
        id,
        name,
        league_id,
        captain_id,
        co_captains,
        roster,
        leagues!inner(
          id,
          name,
          sport_id,
          year,
          start_date,
          end_date,
          sports!inner(name)
        )
      `)
      .or(`captain_id.eq.${profileId},co_captains.cs.{${profileId}},roster.cs.{${profileId}}`);

    const activeTeams = (teams || []).filter((t: any) => {
      const end = t.leagues?.end_date as string | null;
      return !end || end >= today;
    });

    // Load payments for these teams
    const teamIds = activeTeams.map((t: any) => t.id);
    const { data: teamPayments } = teamIds.length
      ? await supabaseAdmin
          .from('league_payments')
          .select('*')
          .in('team_id', teamIds)
      : { data: [] as any[] } as any;

    const team_registrations: TeamReg[] = activeTeams.map((team: any) => {
      const league = team.leagues;
      const sport = league?.sports;
      const payment = (teamPayments || []).find((p: any) => p.team_id === team.id);
      let role: 'captain' | 'co-captain' | 'player' = 'player';
      if (team.captain_id === profileId) role = 'captain';
      else if (Array.isArray(team.co_captains) && team.co_captains.includes(profileId)) role = 'co-captain';

      // Calculate payment status and amount owing with 13% tax to match UI
      let payment_status: 'not_paid' | 'deposit_paid' | 'fully_paid' = 'not_paid';
      let amount_owing = 0;
      if (payment) {
        const totalDue = (Number(payment.amount_due) || 0) * 1.13;
        const amtPaid = Number(payment.amount_paid) || 0;
        amount_owing = Math.max(0, totalDue - amtPaid);
        if (amtPaid >= totalDue) payment_status = 'fully_paid';
        else if (amtPaid > 0) payment_status = 'deposit_paid';
      }

      return {
        team_id: team.id,
        team_name: team.name,
        league_id: league?.id || 0,
        league_name: league?.name || 'Unknown League',
        sport_name: sport?.name || null,
        role,
        payment_status,
        amount_owing,
        season: deriveSeason(league?.start_date, league?.year),
      } as TeamReg;
    });

    // Individual registrations: from payments where team_id is null and not ended, and only for individual leagues
    const { data: indivPayments } = await supabaseAdmin
      .from('league_payments')
      .select(`
        league_id,
        amount_due,
        amount_paid,
        leagues:league_id(
          id,
          name,
          team_registration,
          year,
          start_date,
          end_date,
          sports:sport_id(name)
        )
      `)
      .eq('user_id', profileId)
      .is('team_id', null);

    const individual_registrations: IndividualReg[] = (indivPayments || [])
      .filter((p: any) => p.leagues && p.leagues.team_registration === false && (!p.leagues.end_date || p.leagues.end_date >= today))
      .map((p: any) => {
        const totalDue = (Number(p.amount_due) || 0) * 1.13;
        const amtPaid = Number(p.amount_paid) || 0;
        const amount_owing = Math.max(0, totalDue - amtPaid);
        let payment_status: 'not_paid' | 'deposit_paid' | 'fully_paid' = 'not_paid';
        if (amtPaid >= totalDue) payment_status = 'fully_paid';
        else if (amtPaid > 0) payment_status = 'deposit_paid';
        return {
          league_id: p.leagues.id,
          league_name: p.leagues.name || 'Unknown League',
          sport_name: p.leagues.sports?.name || null,
          payment_status,
          amount_owing,
          season: deriveSeason(p.leagues.start_date, p.leagues.year),
        } as IndividualReg;
      });

    return new Response(
      JSON.stringify({
        success: true,
        user: { id: profileId, name: profile.name, email: profile.email },
        team_registrations,
        individual_registrations,
        total: team_registrations.length + individual_registrations.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in admin-user-registrations function:', error);
    return new Response(JSON.stringify({ error: (error as Error)?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
