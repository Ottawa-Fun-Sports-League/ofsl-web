import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// Simple CORS headers that allow the production domain
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Auth header is not \'Bearer {token}\'' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify the user making the request is an admin
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if the user is an admin - try both auth_id and id fields
    const { data: userData, error: fetchError } = await supabaseClient
      .from('users')
      .select('is_admin')
      .or(`auth_id.eq.${user.id},id.eq.${user.id}`)
      .single();

    if (fetchError || !userData?.is_admin) {
      console.error('Admin check failed:', fetchError, userData);
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the target email and whether to send email from the request body
    const { email, sendEmail = false } = await req.json();
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // First check if the user exists in our users table
    const { data: targetUserData, error: targetUserError } = await supabaseAdmin
      .from('users')
      .select('auth_id')
      .eq('email', email)
      .single();

    if (targetUserError || !targetUserData) {
      console.error('User not found in users table:', email, targetUserError);
      return new Response(
        JSON.stringify({ error: 'User not found in database' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Also verify the user exists in Supabase auth
    const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(targetUserData.auth_id);
    
    if (authUserError || !authUser.user) {
      console.error('User not found in auth:', email, authUserError);
      return new Response(
        JSON.stringify({ error: 'User not found in authentication system' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User found in both database and auth:', { email, auth_id: targetUserData.auth_id });

    // Generate a magic login link to directly sign in as the user (no password reset)
    const siteUrl = Deno.env.get('SITE_URL') || 'https://ofsl.ca';
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: `${siteUrl}/auth-redirect?page=admin-masquerade`,
      }
    });

    if (linkError) {
      console.error('Error generating recovery link:', linkError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate authentication link' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If sendEmail is false, just return the link
    if (!sendEmail) {
      // The action_link is the full authentication URL that will log the user in
      // It's in the format: https://api.ofsl.ca/auth/v1/verify?token=...&type=recovery&redirect_to=...
      // This link can be opened directly in a browser to authenticate the user
      const recoveryLink = linkData.properties.action_link;
      
      console.log('Generated recovery link for', email, ':', recoveryLink);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          type: 'magiclink', 
          link: recoveryLink,
          message: 'Magic login link generated successfully' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send magic link email using Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'OFSL <noreply@ofsl.ca>',
        to: [email],
        subject: 'Your OFSL Magic Login Link',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #B20000;">Your OFSL Magic Login Link</h2>
            <p>Click the link below to sign in to your OFSL account:</p>
            <p style="margin: 20px 0;">
              <a href="${linkData.properties.action_link}" 
                 style="background-color: #B20000; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                Sign In
              </a>
            </p>
            <p style="color: #666; font-size: 14px;">
              This link will expire in 24 hours. If you didn't request this link, you can safely ignore this email.
            </p>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Resend API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to send magic link email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, type: 'magiclink', message: 'Magic login link sent successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in admin-magic-link function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
