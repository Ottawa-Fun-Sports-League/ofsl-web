import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization')!;
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

    // First check if the user exists
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('auth_id')
      .eq('email', email)
      .single();

    if (userError || !userData) {
      console.error('User not found:', email, userError);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate a recovery link (magic links require password reset)
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${Deno.env.get('SITE_URL') || 'http://localhost:5173'}/#/my-account`,
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
          type: 'recovery', 
          link: recoveryLink,
          message: 'Recovery link generated successfully (requires password reset)' 
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
        subject: 'Your OFSL Password Reset Link',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #B20000;">Your OFSL Password Reset Link</h2>
            <p>Click the link below to reset your password and sign in to your OFSL account:</p>
            <p style="margin: 20px 0;">
              <a href="${linkData.properties.action_link}" 
                 style="background-color: #B20000; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                Reset Password & Sign In
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
      JSON.stringify({ success: true, type: 'recovery', message: 'Password reset link sent successfully' }),
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