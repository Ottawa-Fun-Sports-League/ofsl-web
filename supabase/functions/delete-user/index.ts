import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  console.log('Delete user function called:', req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
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
      .maybeSingle();

    if (fetchError) {
      console.error('Admin check query error:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify admin status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!userData?.is_admin) {
      console.error('User is not an admin:', userData);
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

    console.log('Attempting to delete user:', userId);

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // First, try to get the user from public.users table
    const { data: targetUser, error: targetFetchError } = await supabaseAdmin
      .from('users')
      .select('auth_id, id')
      .or(`id.eq.${userId},auth_id.eq.${userId}`)
      .maybeSingle();

    if (targetFetchError) {
      console.error('Error fetching target user from public.users:', targetFetchError);
    }

    let authIdToDelete = null;
    let publicUserIdToDelete = null;

    if (targetUser) {
      console.log('Found user in public.users:', targetUser);
      authIdToDelete = targetUser.auth_id;
      publicUserIdToDelete = targetUser.id;
    } else {
      // User not in public.users, they might be auth-only (unconfirmed)
      // The userId might be the auth UUID itself
      console.log('User not found in public.users, checking if it is an auth UUID');
      
      // Try to get the auth user directly
      const { data: authUser, error: authFetchError } = await supabaseAdmin.auth.admin.getUserById(userId);
      
      if (authFetchError || !authUser) {
        console.error('User not found in auth.users either:', authFetchError);
        return new Response(
          JSON.stringify({ error: 'User not found in database' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('Found auth-only user:', authUser.email);
      authIdToDelete = userId;
    }

    // Delete from auth.users table if we have an auth ID
    if (authIdToDelete) {
      console.log('Deleting from auth.users:', authIdToDelete);
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(
        authIdToDelete
      );

      if (authDeleteError) {
        console.error('Error deleting auth user:', authDeleteError);
        // Continue to try deleting from public.users even if auth deletion fails
      } else {
        console.log('Successfully deleted from auth.users');
      }
    }

    // If we had a public user, check if it was deleted (in case cascade didn't work)
    if (publicUserIdToDelete) {
      const { data: checkUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', publicUserIdToDelete)
        .maybeSingle();

      if (checkUser) {
        // If user still exists in public.users, delete manually using admin client
        console.log('User still exists after auth deletion, deleting from public.users');
        const { error: publicDeleteError } = await supabaseAdmin
          .from('users')
          .delete()
          .eq('id', publicUserIdToDelete);

        if (publicDeleteError) {
          console.error('Error deleting public user:', publicDeleteError);
          return new Response(
            JSON.stringify({ error: 'Failed to delete user from database' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        console.log('Successfully deleted from public.users');
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