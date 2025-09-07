import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

interface TransferIndividualRequest {
  userId: string;
  currentLeagueId: string;
  targetLeagueId: string;
  reason?: string;
}

serve(async (req: Request) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authorization header required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { userId, currentLeagueId, targetLeagueId, reason }: TransferIndividualRequest = await req.json();
    if (!userId || !currentLeagueId || !targetLeagueId) {
      return new Response(JSON.stringify({ error: 'userId, currentLeagueId, and targetLeagueId are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error('Authentication failed:', authError?.message || 'No user found');
      return new Response(JSON.stringify({ error: 'Invalid authentication token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify admin
    const { data: adminRow, error: adminErr } = await supabase
      .from('users')
      .select('id, is_admin, name, email')
      .eq('auth_id', user.id)
      .single();
    if (adminErr || !adminRow?.is_admin) {
      console.error('User is not an admin', adminErr, 'Auth ID:', user.id);
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load current and target leagues and ensure they are individual leagues of same sport
    const { data: currentLeague, error: curErr } = await supabase
      .from('leagues')
      .select('id, name, active, sport_id, team_registration')
      .eq('id', currentLeagueId)
      .single();
    if (curErr || !currentLeague) {
      return new Response(JSON.stringify({ error: 'Current league not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: targetLeague, error: tgtErr } = await supabase
      .from('leagues')
      .select('id, name, active, sport_id, team_registration')
      .eq('id', targetLeagueId)
      .single();
    if (tgtErr || !targetLeague) {
      return new Response(JSON.stringify({ error: 'Target league not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!targetLeague.active) {
      return new Response(JSON.stringify({ error: 'Cannot transfer to inactive league' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Both must be individual leagues and same sport
    if (currentLeague.team_registration !== false || targetLeague.team_registration !== false) {
      return new Response(JSON.stringify({ error: 'Both leagues must be individual registration leagues' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (currentLeague.sport_id !== targetLeague.sport_id) {
      return new Response(JSON.stringify({ error: 'Leagues must be for the same sport' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate the user exists
    const { data: profile, error: profErr } = await supabase
      .from('users')
      .select('id, name, league_ids')
      .eq('id', userId)
      .single();
    if (profErr || !profile) {
      return new Response(JSON.stringify({ error: 'User profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const currentId = Number(currentLeagueId);
    const targetId = Number(targetLeagueId);

    // 1. Log transfer history
    const { error: histErr } = await supabase
      .from('individual_transfer_history')
      .insert({
        user_id: userId,
        from_league_id: currentId,
        to_league_id: targetId,
        transferred_by: user.id,
        transfer_reason: reason || null,
        metadata: {
          user_name: profile.name || null,
          from_league_name: currentLeague.name,
          to_league_name: targetLeague.name,
          timestamp: new Date().toISOString(),
        },
      });
    if (histErr) {
      console.error('Error logging individual transfer history:', histErr);
      // Non-fatal, continue
    }

    // 2. Update user's league_ids: remove current, add target
    const leagueIds: number[] = Array.isArray(profile.league_ids) ? profile.league_ids as number[] : [];
    const filtered = leagueIds.filter((lid) => Number(lid) !== currentId);
    if (!filtered.includes(targetId)) filtered.push(targetId);
    const { error: updUserErr } = await supabase
      .from('users')
      .update({ league_ids: filtered, date_modified: new Date().toISOString() })
      .eq('id', userId);
    if (updUserErr) {
      console.error('Error updating user league_ids:', updUserErr);
      return new Response(JSON.stringify({ error: 'Failed to update user registration' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Update payment record for this user and league (team_id is null for individuals)
    const { error: payErr } = await supabase
      .from('league_payments')
      .update({ league_id: targetId, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('league_id', currentId)
      .is('team_id', null);
    if (payErr) {
      console.error('Error updating individual payment record:', payErr);
      // Not fatal for transfer, but report
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Individual registration transferred to "${targetLeague.name}"`,
        transfer: {
          userId,
          fromLeagueId: currentId,
          fromLeagueName: currentLeague.name,
          toLeagueId: targetId,
          toLeagueName: targetLeague.name,
          transferredBy: adminRow.email || user.email,
          transferredAt: new Date().toISOString(),
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error in transfer-individual function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', details: (error as any)?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

