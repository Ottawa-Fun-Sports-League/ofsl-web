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

    // Check if the user is an admin
    const { data: userData, error: fetchError } = await supabaseClient
      .from('users')
      .select('is_admin')
      .eq('auth_id', user.id)
      .single();

    if (fetchError || !userData?.is_admin) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the user ID to delete from the request body
    const { userId } = await req.json();
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the auth_id for the user to delete
    const { data: targetUser, error: targetFetchError } = await supabaseClient
      .from('users')
      .select('auth_id')
      .eq('id', userId)
      .single();

    if (targetFetchError || !targetUser?.auth_id) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Delete from auth.users table using admin client
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(
      targetUser.auth_id
    );

    if (authDeleteError) {
      // eslint-disable-next-line no-console
      console.error('Error deleting auth user:', authDeleteError);
      return new Response(
        JSON.stringify({ error: `Failed to delete auth user: ${authDeleteError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // The deletion from public.users should cascade automatically due to foreign key constraints
    // But let's check if the user was deleted
    const { data: checkUser } = await supabaseClient
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (checkUser) {
      // If user still exists in public.users, delete manually
      const { error: publicDeleteError } = await supabaseClient
        .from('users')
        .delete()
        .eq('id', userId);

      if (publicDeleteError) {
        // eslint-disable-next-line no-console
        console.error('Error deleting public user:', publicDeleteError);
        return new Response(
          JSON.stringify({ error: 'User deleted from auth but failed to delete from public users table' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'User deleted successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in delete-user function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});