import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
}

interface SearchRequest {
  email: string
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

    const { email }: SearchRequest = await req.json()

    if (!email || !email.trim()) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // Initialize Supabase client with service role for user search
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify the user is authenticated by checking their token
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

    // Search for user by email - only return basic info needed for team management
    const { data: userData, error: searchError } = await supabase
      .from('users')
      .select('id, name, email, phone')
      .eq('email', email.toLowerCase())
      .single()

    if (searchError) {
      if (searchError.code === 'PGRST116') {
        // User not found
        return new Response(
          JSON.stringify({ 
            found: false,
            user: null 
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        )
      }
      throw searchError
    }

    return new Response(
      JSON.stringify({ 
        found: true,
        user: userData
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )

  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error in search-users function:", error)
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})