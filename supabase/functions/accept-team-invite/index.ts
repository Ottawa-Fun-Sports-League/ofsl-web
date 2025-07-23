import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get the JWT from the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }
    const token = authHeader.replace('Bearer ', '');

    // Initialize Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verify the JWT and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Invalid authentication token');
    }

    // Parse request body
    const body = await req.json();
    const { inviteId } = body;

    if (!inviteId) {
      throw new Error('Missing required field: inviteId');
    }

    // Get the invite details
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('team_invites')
      .select('*, teams!inner(id, name, roster, active)')
      .eq('id', inviteId)
      .eq('email', user.email?.toLowerCase())
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (inviteError || !invite) {
      throw new Error('Invite not found or expired');
    }

    // Check if team is active
    if (!invite.teams.active) {
      throw new Error('Team is no longer active');
    }

    // Get the user's database ID
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (userError || !userData) {
      throw new Error('User profile not found');
    }

    // Start a transaction-like operation
    const currentRoster = invite.teams.roster || [];
    
    // Check if user is already in the roster
    if (currentRoster.includes(userData.id)) {
      // User already in team, just mark invite as accepted
      await supabaseAdmin
        .from('team_invites')
        .update({ 
          status: 'accepted', 
          accepted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', inviteId);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'You are already a member of this team',
          teamName: invite.teams.name 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add user to roster
    const updatedRoster = [...currentRoster, userData.id];

    // Update team roster
    const { error: updateError } = await supabaseAdmin
      .from('teams')
      .update({ roster: updatedRoster })
      .eq('id', invite.team_id);

    if (updateError) {
      throw new Error('Failed to update team roster');
    }

    // Mark invite as accepted
    const { error: acceptError } = await supabaseAdmin
      .from('team_invites')
      .update({ 
        status: 'accepted', 
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', inviteId);

    if (acceptError) {
      // Try to rollback the roster update
      await supabaseAdmin
        .from('teams')
        .update({ roster: currentRoster })
        .eq('id', invite.team_id);
      
      throw new Error('Failed to accept invite');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully joined ${invite.teams.name}!`,
        teamName: invite.teams.name,
        teamId: invite.team_id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error processing team invite:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});