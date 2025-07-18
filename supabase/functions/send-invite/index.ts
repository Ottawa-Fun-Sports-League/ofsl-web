import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

interface InviteRequest {
  email: string
  teamName: string
  leagueName: string
  captainName: string
  teamId?: number
  captainId?: string
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

    const { email, teamName, leagueName, captainName, teamId, captainId }: InviteRequest = await req.json()

    if (!email || !teamName || !leagueName || !captainName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
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

    // Initialize Supabase client with service role for database operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify the user is authenticated by checking their token
    const token = authHeader.replace('Bearer ', '')
    
    // Initialize regular Supabase client to verify auth
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey)
    
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // Store the invite in the database if teamId and captainId are provided
    if (teamId && captainId) {
      // Verify the user is the captain of the team they're trying to invite to
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('captain_id')
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

      // Check if the authenticated user is the captain of this team
      if (teamData.captain_id !== user.id) {
        return new Response(
          JSON.stringify({ error: "Only team captains can send invites" }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        )
      }
      try {
        // Check if invite already exists for this email and team
        const { data: existingInvite } = await supabase
          .from('team_invites')
          .select('id')
          .eq('team_id', teamId)
          .eq('email', email.toLowerCase())
          .eq('status', 'pending')
          .single()

        if (!existingInvite) {
          // Create new invite record
          const { error: inviteError } = await supabase
            .from('team_invites')
            .insert({
              team_id: teamId,
              email: email.toLowerCase(),
              status: 'pending',
              invited_by: captainId,
              team_name: teamName,
              league_name: leagueName
            })

          if (inviteError) {
            console.error('Error storing invite:', inviteError)
            // Continue with email sending even if database storage fails
          }
        }
      } catch (error) {
        console.error('Error checking/storing invite:', error)
        // Continue with email sending even if database operation fails
      }
    }

    // Create the invite email content
    const siteUrl = Deno.env.get("SITE_URL") || "https://ofsl.ca"
    const inviteUrl = `${siteUrl}/#/signup?invite=true`
    
    const emailContent = {
      to: [email],
      subject: `🏐 Team Invitation: Join ${teamName} in ${leagueName}!`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #B20000 0%, #8B0000 100%); padding: 30px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Ottawa Fun Sports League</h1>
            <p style="color: #ffcccc; margin: 8px 0 0 0; font-size: 14px;">Ottawa's Premier Adult Sports Community</p>
          </div>
          
          <!-- Main Content -->
          <div style="padding: 40px 30px; background: #ffffff;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="background: #f8f9fa; border-radius: 50px; width: 80px; height: 80px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 32px;">🏐</span>
              </div>
              <h2 style="color: #2c3e50; margin: 0 0 10px 0; font-size: 24px; font-weight: 600;">You're Invited to Join a Team!</h2>
            </div>
            
            <div style="background: #f8f9fa; border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid #B20000;">
              <p style="color: #2c3e50; font-size: 16px; line-height: 1.6; margin: 0;">
                <strong>${captainName}</strong> has invited you to join their team <strong style="color: #B20000;">${teamName}</strong> 
                in the <strong style="color: #B20000;">${leagueName}</strong> league.
              </p>
            </div>
            
            <div style="margin: 30px 0;">
              <h3 style="color: #2c3e50; font-size: 18px; margin-bottom: 15px;">What's Next?</h3>
              <ul style="color: #5a6c7d; font-size: 16px; line-height: 1.6; padding-left: 20px;">
                <li style="margin-bottom: 8px;">Click the button below to create your OFSL account</li>
                <li style="margin-bottom: 8px;">Complete your player profile with your skill level and preferences</li>
                <li style="margin-bottom: 8px;">You'll automatically be added to ${teamName} once registered</li>
                <li>Start playing with your new team!</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 40px 0;">
              <a href="${inviteUrl}" 
                 style="background: linear-gradient(135deg, #B20000 0%, #8B0000 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(178, 0, 0, 0.3); transition: all 0.3s ease;">
                🚀 Create Account & Join Team
              </a>
            </div>
            
            <div style="background: #e8f4f8; border-radius: 12px; padding: 20px; margin: 30px 0;">
              <h4 style="color: #2c3e50; font-size: 16px; margin: 0 0 12px 0;">About OFSL</h4>
              <p style="color: #5a6c7d; font-size: 14px; line-height: 1.5; margin: 0;">
                We're Ottawa's premier adult sports league, offering volleyball, badminton, and more. 
                Our leagues provide structured environments that encourage sportsmanship, physical activity, and healthy competition.
                Join thousands of players who have made lasting friendships through OFSL!
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #7f8c8d; font-size: 14px; line-height: 1.5;">
                Questions? Contact us at 
                <a href="mailto:payments@ofsl.ca" style="color: #B20000; text-decoration: none; font-weight: 600;">payments@ofsl.ca</a>
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: #2c3e50; padding: 25px 20px; text-align: center;">
            <p style="color: #bdc3c7; font-size: 12px; margin: 0 0 5px 0;">
              © ${new Date().getFullYear()} Ottawa Fun Sports League. All rights reserved.
            </p>
            <p style="color: #95a5a6; font-size: 11px; margin: 0;">
              This invitation was sent by ${captainName} on behalf of ${teamName}.
            </p>
          </div>
        </div>
      `
    }

    // Send email using Resend API
    const resendApiKey = Deno.env.get("RESEND_API_KEY")
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not found")
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "OFSL <noreply@ofsl.ca>",
        ...emailContent
      })
    })

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text()
      console.error("Resend API error:", errorText)
      return new Response(
        JSON.stringify({ error: "Failed to send invite email" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    const emailResult = await emailResponse.json()
    console.log("Email sent successfully:", emailResult)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Invite email sent successfully",
        emailId: emailResult.id 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )

  } catch (error) {
    console.error("Error in send-invite function:", error)
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})