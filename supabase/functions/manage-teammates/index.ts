import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

interface ManageTeammatesRequest {
  action: 'add' | 'remove'
  teamId: string
  userId: string
  captainId: string
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

    const { action, teamId, userId, captainId }: ManageTeammatesRequest = await req.json()

    // Validate required fields
    if (!action || !teamId || !userId || !captainId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: action, teamId, userId, captainId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    if (!['add', 'remove'].includes(action)) {
      return new Response(
        JSON.stringify({ error: "Action must be 'add' or 'remove'" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // Initialize Supabase client with service role for team management
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify the user is authenticated
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // Verify the authenticated user is the team captain
    if (user.id !== captainId) {
      return new Response(
        JSON.stringify({ error: "Only team captains can manage teammates" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // Verify the team exists and the user is the captain
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .select('id, captain_id')
      .eq('id', teamId)
      .eq('captain_id', captainId)
      .single()

    if (teamError || !teamData) {
      return new Response(
        JSON.stringify({ error: "Team not found or you are not the captain" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    if (action === 'add') {
      // Add user to team
      const { data, error } = await supabase
        .from('team_members')
        .insert({
          team_id: teamId,
          user_id: userId,
          joined_at: new Date().toISOString()
        })
        .select()

      if (error) {
        // Check if user is already on the team
        if (error.code === '23505') { // unique_violation
          return new Response(
            JSON.stringify({ error: "User is already a member of this team" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          )
        }
        throw error
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          message: "Teammate added successfully",
          data 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )

    } else if (action === 'remove') {
      // Remove user from team
      const { data, error } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .select()

      if (error) {
        throw error
      }

      if (!data || data.length === 0) {
        return new Response(
          JSON.stringify({ error: "User is not a member of this team" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        )
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          message: "Teammate removed successfully",
          data 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

  } catch (error) {
    console.error("Error in manage-teammates function:", error)
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})