import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// Simple CORS headers that allow the production domain
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify the caller is an authenticated admin
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: userData, error: fetchError } = await supabaseClient
      .from('users')
      .select('is_admin')
      .or(`auth_id.eq.${user.id},id.eq.${user.id}`)
      .single();

    if (fetchError || !userData?.is_admin) {
      console.error('Admin check failed:', fetchError, userData);
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { email } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate user exists in app DB
    const { data: targetUserData, error: targetUserError } = await supabaseAdmin
      .from('users')
      .select('auth_id')
      .eq('email', email)
      .single();

    if (targetUserError || !targetUserData) {
      console.error('User not found in users table:', email, targetUserError);
      return new Response(JSON.stringify({ error: 'User not found in database' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Confirm exists in auth
    const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(targetUserData.auth_id);
    if (authUserError || !authUser.user) {
      console.error('User not found in auth:', email, authUserError);
      return new Response(JSON.stringify({ error: 'User not found in authentication system' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const siteUrl = Deno.env.get('SITE_URL') || 'https://ofsl.ca';
    // Generate a magic link that can be consumed client-side via token_hash
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${siteUrl}/auth-redirect?page=admin-masquerade`,
      },
    });

    if (linkError) {
      console.error('Error generating magic link:', linkError);
      return new Response(JSON.stringify({ error: 'Failed to generate magic link' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build token-hash based link that our SPA can handle with verifyOtp
    const props = (linkData.properties as Record<string, unknown>) || {};
    const hashedToken = (props['hashed_token'] as string) || (props['token_hash'] as string) || '';
    const clientHandledLink = `${siteUrl}/auth-redirect?page=admin-masquerade&type=magiclink&token_hash=${encodeURIComponent(hashedToken)}&email=${encodeURIComponent(email)}`;

    const actionLink = (props['action_link'] as string) || '';

    console.log('Generated admin impersonation link for', email, { actionLink, clientHandledLink });

    return new Response(
      JSON.stringify({
        success: true,
        type: 'magiclink',
        link: clientHandledLink,
        action_link: actionLink,
        message: 'Magic login link generated successfully',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in admin-impersonate function:', error);
    const message = (error as Error)?.message || 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
