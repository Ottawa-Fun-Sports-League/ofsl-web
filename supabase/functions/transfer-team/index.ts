import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
}

interface TransferRequest {
  teamId: string
  targetLeagueId: string
  reason?: string
}

serve(async (req: Request) => {
  try {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      })
    }

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    const { teamId, targetLeagueId, reason }: TransferRequest = await req.json()
    console.log(`Transfer request: Team ${teamId} to League ${targetLeagueId}`)

    if (!teamId || !targetLeagueId) {
      return new Response(
        JSON.stringify({ error: "Team ID and target league ID are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify the user is authenticated and is an admin
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error("Authentication failed:", authError?.message || "No user found")
      return new Response(
        JSON.stringify({ error: "Invalid authentication token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.is_admin) {
      console.error("User is not an admin")
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    console.log(`Admin user ${user.email} initiating transfer`)

    // Get current team information
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('*, leagues!inner(name)')
      .eq('id', teamId)
      .single()

    if (teamError || !team) {
      console.error("Team not found:", teamError)
      return new Response(
        JSON.stringify({ error: "Team not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    const currentLeagueId = team.league_id

    // Verify target league exists
    const { data: targetLeague, error: targetLeagueError } = await supabase
      .from('leagues')
      .select('id, name, active')
      .eq('id', targetLeagueId)
      .single()

    if (targetLeagueError || !targetLeague) {
      console.error("Target league not found:", targetLeagueError)
      return new Response(
        JSON.stringify({ error: "Target league not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // Check if target league is active
    if (!targetLeague.active) {
      return new Response(
        JSON.stringify({ 
          error: "Cannot transfer to inactive league",
          details: `League "${targetLeague.name}" is not active`
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // Check for any active matches in current league
    const { data: activeMatches, error: matchesError } = await supabase
      .from('matches')
      .select('id')
      .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
      .eq('status', 'scheduled')
      .limit(1)

    if (matchesError) {
      console.error("Error checking matches:", matchesError)
      throw matchesError
    }

    if (activeMatches && activeMatches.length > 0) {
      return new Response(
        JSON.stringify({ 
          error: "Team has scheduled matches",
          details: "Please cancel or complete all scheduled matches before transferring"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // Begin transaction-like operations
    console.log(`Starting transfer: Team ${team.name} from League ${currentLeagueId} to ${targetLeagueId}`)

    // 1. Log the transfer in history table
    const { error: historyError } = await supabase
      .from('team_transfer_history')
      .insert({
        team_id: teamId,
        from_league_id: currentLeagueId,
        to_league_id: targetLeagueId,
        transferred_by: user.id,
        transfer_reason: reason || null,
        metadata: {
          team_name: team.name,
          from_league_name: team.leagues.name,
          to_league_name: targetLeague.name,
          timestamp: new Date().toISOString()
        }
      })

    if (historyError) {
      console.error("Error logging transfer history:", historyError)
      throw historyError
    }

    // 2. Update the team's league_id
    const { error: updateError } = await supabase
      .from('teams')
      .update({ 
        league_id: targetLeagueId,
        updated_at: new Date().toISOString()
      })
      .eq('id', teamId)

    if (updateError) {
      console.error("Error updating team:", updateError)
      throw updateError
    }

    // 3. Archive any league-specific standings
    const { error: standingsError } = await supabase
      .from('league_standings')
      .delete()
      .eq('team_id', teamId)
      .eq('league_id', currentLeagueId)

    if (standingsError) {
      console.error("Error archiving standings:", standingsError)
      // Non-critical error, log but continue
    }

    console.log(`Successfully transferred team ${team.name} to league ${targetLeague.name}`)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Team "${team.name}" successfully transferred to "${targetLeague.name}"`,
        transfer: {
          teamId,
          teamName: team.name,
          fromLeagueId: currentLeagueId,
          fromLeagueName: team.leagues.name,
          toLeagueId: targetLeagueId,
          toLeagueName: targetLeague.name,
          transferredBy: user.email,
          transferredAt: new Date().toISOString()
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )

  } catch (error) {
    console.error("Error in transfer-team function:", error)
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        details: error.message || "Unknown error"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})