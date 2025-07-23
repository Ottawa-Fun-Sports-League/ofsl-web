import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
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

    // Get the user's profile to get their users.id from their auth_id and check admin status
    const { data: userProfileData, error: userProfileError } = await supabase
      .from("users")
      .select("id, is_admin")
      .eq("auth_id", user.id)
      .single();

    if (userProfileError || !userProfileData) {
      return new Response(
        JSON.stringify({ error: "User profile not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Allow team captains, admins to manage any teammates, or allow users to remove themselves
    const isTeamCaptain = userProfileData.id === captainId;
    const isAdmin = userProfileData.is_admin === true;
    const isRemovingSelf = action === 'remove' && userProfileData.id === userId;
    
    if (!isTeamCaptain && !isAdmin && !isRemovingSelf) {
      return new Response(
        JSON.stringify({ error: "Only team captains, admins can manage teammates, or users can remove themselves" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // Verify the team exists
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .select('id, captain_id, roster')
      .eq('id', teamId)
      .single()

    if (teamError || !teamData) {
      return new Response(
        JSON.stringify({ error: "Team not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // Additional verification: if not team captain or admin, ensure user is removing themselves and is in the roster
    if (!isTeamCaptain && !isAdmin) {
      if (!teamData.roster.includes(userId)) {
        return new Response(
          JSON.stringify({ error: "You are not a member of this team" }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        )
      }
    }

    if (action === 'add') {
      // Add user to team roster
      const currentRoster = teamData.roster || [];
      
      // Check if user is already in the roster
      if (currentRoster.includes(userId)) {
        return new Response(
          JSON.stringify({ error: "User is already a member of this team" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        )
      }

      const updatedRoster = [...currentRoster, userId];
      
      const { data, error } = await supabase
        .from('teams')
        .update({ roster: updatedRoster })
        .eq('id', teamId)
        .select()

      if (error) {
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
      // Remove user from team roster
      const currentRoster = teamData.roster || [];
      
      // Check if user is in the roster
      if (!currentRoster.includes(userId)) {
        return new Response(
          JSON.stringify({ error: "User is not a member of this team" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        )
      }

      const updatedRoster = currentRoster.filter(id => id !== userId);
      
      const { data, error } = await supabase
        .from('teams')
        .update({ roster: updatedRoster })
        .eq('id', teamId)
        .select()

      if (error) {
        throw error
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
    // eslint-disable-next-line no-console
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