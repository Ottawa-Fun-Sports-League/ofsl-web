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

    // Get the user's database record
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('auth_id', user.id)
      .single();

    if (userError || !userData) {
      // User profile might not exist yet for brand new signups
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'User profile not found - this is normal for new signups'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find all pending invites for this user's email
    const { data: invites, error: invitesError } = await supabaseAdmin
      .from('team_invites')
      .select('*, teams!inner(id, name, roster, active)')
      .eq('email', userData.email.toLowerCase())
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString());

    if (invitesError || !invites || invites.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No pending invites found',
          processedCount: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process each invite
    const processedTeams = [];
    let processedCount = 0;

    for (const invite of invites) {
      try {
        // Skip inactive teams
        if (!invite.teams.active) {
          continue;
        }

        const currentRoster = invite.teams.roster || [];
        
        // Check if user is already in the roster
        if (!currentRoster.includes(userData.id)) {
          // Add user to team roster
          const updatedRoster = [...currentRoster, userData.id];
          
          const { error: updateError } = await supabaseAdmin
            .from('teams')
            .update({ roster: updatedRoster })
            .eq('id', invite.team_id);

          if (!updateError) {
            // Mark invite as accepted
            await supabaseAdmin
              .from('team_invites')
              .update({ 
                status: 'accepted', 
                accepted_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', invite.id);

            processedTeams.push(invite.teams.name);
            processedCount++;
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Error processing invite ${invite.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: processedCount > 0 
          ? `Successfully added to ${processedCount} team(s): ${processedTeams.join(', ')}`
          : 'No new teams to join',
        processedCount,
        teams: processedTeams
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error processing signup invites:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});