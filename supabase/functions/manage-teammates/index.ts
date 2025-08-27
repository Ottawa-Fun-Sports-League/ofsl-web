import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
}

interface ManageTeammatesRequest {
  action: 'add' | 'remove' | 'remove-invite'
  teamId: string
  userId?: string
  inviteId?: number
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

    const { action, teamId, userId, inviteId, captainId }: ManageTeammatesRequest = await req.json()

    // Validate required fields
    if (!action || !teamId || !captainId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: action, teamId, captainId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    if (!['add', 'remove', 'remove-invite'].includes(action)) {
      return new Response(
        JSON.stringify({ error: "Action must be 'add', 'remove', or 'remove-invite'" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // Validate action-specific required fields
    if ((action === 'add' || action === 'remove') && !userId) {
      return new Response(
        JSON.stringify({ error: "userId is required for add/remove actions" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    if (action === 'remove-invite' && !inviteId) {
      return new Response(
        JSON.stringify({ error: "inviteId is required for remove-invite action" }),
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
    const isRemoveInviteAction = action === 'remove-invite';
    
    if (!isTeamCaptain && !isAdmin && !isRemovingSelf && !isRemoveInviteAction) {
      return new Response(
        JSON.stringify({ error: "Only team captains, admins can manage teammates, or users can remove themselves" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // For remove-invite action, only team captains and admins can remove invites
    if (isRemoveInviteAction && !isTeamCaptain && !isAdmin) {
      return new Response(
        JSON.stringify({ error: "Only team captains and admins can remove invites" }),
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

      // Send notification email to the added user
      try {
        // Attempting to send notification email
        
        // Get team details for the email
        const { data: fullTeamData, error: teamFetchError } = await supabase
          .from('teams')
          .select(`
            name,
            league_id,
            captain_id
          `)
          .eq('id', teamId)
          .single()

        if (teamFetchError || !fullTeamData) {
          console.error('Error fetching team data:', teamFetchError || 'No team data found')
        } else {

        // Get league name separately to avoid join issues
        let leagueName = 'OFSL League'
        if (fullTeamData.league_id) {
          const { data: leagueData } = await supabase
            .from('leagues')
            .select('name')
            .eq('id', fullTeamData.league_id)
            .single()
          
          if (leagueData) {
            leagueName = leagueData.name
          }
        }

        // Get captain's name
        const { data: captainData, error: captainError } = await supabase
          .from('users')
          .select('name')
          .eq('id', fullTeamData.captain_id)
          .single()

        if (captainError || !captainData) {
          console.error('Error fetching captain data:', captainError)
        } else {
          // Call the notification Edge Function with the same token
          const notificationPayload = {
            userId: userId,
            teamId: parseInt(teamId),
            teamName: fullTeamData.name,
            leagueName: leagueName,
            captainName: captainData.name
          }

          // Sending notification with payload

          const notificationResponse = await fetch(`${supabaseUrl}/functions/v1/send-team-addition-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': authHeader,
            },
            body: JSON.stringify(notificationPayload),
          })

          if (!notificationResponse.ok) {
            const errorText = await notificationResponse.text()
            console.error('Failed to send notification email:', notificationResponse.status, errorText)
          } else {
            await notificationResponse.json()
            // Notification sent successfully
          }
        }
        }
      } catch (notificationError) {
        // Log error but don't fail the main operation
        console.error('Error sending team addition notification:', notificationError)
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
    
    } else if (action === 'remove-invite') {
      // Remove pending invite
      const { error } = await supabase
        .from('team_invites')
        .delete()
        .eq('id', inviteId!)
        .eq('team_id', teamId) // Extra safety check

      if (error) {
        throw error
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          message: "Invite removed successfully"
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