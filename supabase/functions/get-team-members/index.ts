import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

interface GetTeamMembersRequest {
  teamId: number
  currentRoster: string[]
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

    const { teamId, currentRoster }: GetTeamMembersRequest = await req.json()

    // Validate required fields
    if (!teamId || !Array.isArray(currentRoster)) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: teamId, currentRoster" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // Initialize Supabase client with service role to bypass RLS
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

    const teammates = []

    // Load registered users from roster (bypassing RLS with service role)
    if (currentRoster.length > 0) {
      const { data: registeredUsers, error: usersError } = await supabase
        .from('users')
        .select('id, name, email, phone')
        .in('id', currentRoster)

      if (usersError) {
        console.error('Database error loading teammates:', usersError)
        return new Response(
          JSON.stringify({ error: "Failed to load teammates from database" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        )
      }
      
      // Add registered users to the list
      if (registeredUsers) {
        teammates.push(...registeredUsers.map(user => ({ 
          ...user, 
          isPending: false 
        })))
      }
    }

    // Load pending invites for this team (bypassing RLS with service role)
    const { data: pendingInvites, error: invitesError } = await supabase
      .from('team_invites')
      .select('id, email, team_name, league_name')
      .eq('team_id', teamId)
      .eq('status', 'pending')

    if (invitesError) {
      console.error('Database error loading pending invites:', invitesError)
      // Don't fail for invites error, just continue without them
    } else if (pendingInvites) {
      // Add pending invites to the list (only if they're not already registered)
      const registeredEmails = teammates.map(user => user.email.toLowerCase())
      const uniquePendingInvites = pendingInvites.filter(
        invite => !registeredEmails.includes(invite.email.toLowerCase())
      )
      
      teammates.push(
        ...uniquePendingInvites.map(invite => ({
          id: `pending-${invite.id}`, // Unique ID for pending users
          name: `Pending: ${invite.email}`,
          email: invite.email,
          phone: '',
          isPending: true,
          inviteId: invite.id
        }))
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        teammates 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )

  } catch (error) {
    console.error("Error in get-team-members function:", error)
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})