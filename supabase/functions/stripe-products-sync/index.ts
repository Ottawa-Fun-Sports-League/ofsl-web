import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'OFSL Stripe Integration',
    version: '1.0.0',
  },
});

// Helper function to create responses with CORS headers
function corsResponse(body: string | object | null, status = 200) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };

  // For 204 No Content, don't include Content-Type or body
  if (status === 204) {
    return new Response(null, { status, headers });
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return corsResponse({}, 204);
    }

    // Only allow GET and POST methods
    if (req.method !== 'GET' && req.method !== 'POST') {
      return corsResponse({ error: 'Method not allowed' }, 405);
    }

    // Authenticate the user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: getUserError,
    } = await supabase.auth.getUser(token);

    if (getUserError) {
      return corsResponse({ error: 'Failed to authenticate user' }, 401);
    }

    if (!user) {
      return corsResponse({ error: 'User not found' }, 404);
    }

    // Check if user is an admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('auth_id', user.id)
      .single();

    if (userError) {
      return corsResponse({ error: 'Failed to fetch user data' }, 500);
    }

    if (!userData?.is_admin) {
      return corsResponse({ error: 'Unauthorized - Admin access required' }, 403);
    }

    // Fetch all active products from Stripe
    const products = await stripe.products.list({
      active: true,
      expand: ['data.default_price'],
    });

    // Transform products to match our database schema
    const transformedProducts = products.data.map(product => {
      const price = product.default_price as Stripe.Price;
      
      return {
        id: product.id,
        price_id: price?.id || '',
        name: product.name,
        description: product.description || '',
        mode: price?.type || 'payment',
        price: price?.unit_amount ? price.unit_amount / 100 : null,
        currency: price?.currency || 'cad',
        interval: price?.type === 'recurring' ? price.recurring?.interval : null,
        // league_id will be set manually by admins
        updated_at: new Date().toISOString(),
      };
    });

    // Filter out products without a price
    const validProducts = transformedProducts.filter(product => product.price_id);

    // Upsert products to the database
    const { data, error } = await supabase
      .from('stripe_products')
      .upsert(validProducts, {
        onConflict: 'id',
        ignoreDuplicates: false,
      })
      .select();

    if (error) {
      // eslint-disable-next-line no-console
      console.error('Error upserting products:', error);
      return corsResponse({ error: 'Failed to update products in database' }, 500);
    }

    return corsResponse({
      success: true,
      message: `Successfully synced ${validProducts.length} products`,
      products: data,
    });

  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Stripe products sync error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return corsResponse({ 
      error: `Failed to sync products: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, 500);
  }
});