import { supabase } from './supabase';
import { logger } from './logger';

/**
 * Interface for a Stripe product
 */
export interface StripeProduct {
  id: string;
  priceId: string;
  name: string;
  description: string;
  mode: 'payment' | 'subscription';
  price?: number;
  currency?: string;
  leagueId?: number | null;
}

/**
 * Interface for checkout session request parameters
 */
export interface CheckoutSessionRequest {
  priceId: string;
  mode: 'payment' | 'subscription';
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, string>;
}

/**
 * Interface for checkout session response
 */
export interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
}

/**
 * Creates a Stripe checkout session
 * @param params Checkout session parameters
 * @returns Promise with session ID and URL
 */
export async function createCheckoutSession({
  priceId,
  mode,
  successUrl = `${window.location.origin}/success`,
  cancelUrl = `${window.location.origin}/cancel`,
  metadata = {}
}: CheckoutSessionRequest): Promise<CheckoutSessionResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('User not authenticated');
  }

  // Call the Stripe checkout edge function
  // Get the Supabase URL from environment variables
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const response = await fetch(`${supabaseUrl}/functions/v1/stripe-checkout`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      price_id: priceId,
      mode,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata
    }),
  });

  if (!response.ok) {
    try {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create checkout session');
    } catch (e) {
      throw new Error('Failed to create checkout session');
    }
  }

  return response.json();
}

/**
 * Gets the current user's Stripe subscription
 * @returns Promise with subscription data or null
 */
export async function getUserSubscription() {
  const { data, error } = await supabase
    .from('stripe_user_subscriptions')
    .select('*')
    .maybeSingle();

  if (error) {
    logger.error('Error fetching subscription', error);
    return null;
  }

  return data;
}

/**
 * Gets the current user's Stripe order history
 * @returns Promise with array of orders
 */
export async function getUserOrders() {
  const { data, error } = await supabase
    .from('stripe_user_orders')
    .select('*')
    .order('order_date', { ascending: false });

  if (error) {
    logger.error('Error fetching orders', error);
    return [];
  }

  return data || [];
}

/**
 * Gets all Stripe products from the database
 * @returns Promise with array of products
 */
export async function getStripeProducts() {
  const { data, error } = await supabase
    .from('stripe_products')
    .select('*')
    .order('name');

  if (error) {
    logger.error('Error fetching Stripe products', error);
    return [];
  }

  return data || [];
}

/**
 * Gets a Stripe product by league ID
 * @param leagueId The league ID
 * @returns Promise with product or null
 */
export async function getStripeProductByLeagueId(leagueId: number) {
  const { data, error } = await supabase
    .from('stripe_products')
    .select('*')
    .eq('league_id', leagueId)
    .maybeSingle();

  if (error) {
    logger.error('Error fetching Stripe product by league ID', error);
    return null;
  }

  return data;
}

/**
 * Syncs Stripe products with the database
 * @returns Promise with sync result
 */
export async function syncStripeProducts() {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('User not authenticated');
  }

  // Call the Stripe products sync edge function
  // Get the Supabase URL from environment variables
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const response = await fetch(`${supabaseUrl}/functions/v1/stripe-products-sync`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    try {
      const error = await response.json();
      throw new Error(error.error || 'Failed to sync Stripe products');
    } catch (e) {
      throw new Error('Failed to sync Stripe products');
    }
  }

  return response.json();
}

/**
 * Updates a Stripe product's league association
 * @param productId The Stripe product ID
 * @param leagueId The league ID to associate with the product
 * @returns Promise with update result
 */
export async function updateStripeProductLeagueId(productId: string, leagueId: number | null) {
  const { data, error } = await supabase
    .from('stripe_products')
    .update({ league_id: leagueId })
    .eq('id', productId)
    .select()
    .single();

  if (error) {
    logger.error('Error updating Stripe product league ID', error);
    throw error;
  }

  return data;
}

/**
 * Creates a payment intent for a specific league payment
 * @param paymentId The league payment ID
 * @returns Promise with payment intent client secret
 */
export async function createPaymentIntent(paymentId: number) {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('User not authenticated');
  }

  // Get the Supabase URL from environment variables
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const response = await fetch(`${supabaseUrl}/functions/v1/stripe-payment-intent`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      payment_id: paymentId
    }),
  });

  if (!response.ok) {
    try {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create payment intent');
    } catch (e) {
      throw new Error('Failed to create payment intent');
    }
  }

  return response.json();
}

/**
 * Gets all available Stripe products
 * @returns Promise with array of products
 */

/**
 * Gets a Stripe product by price ID
 * @param priceId The price ID
 * @returns Promise with product or null
 */
export async function getStripeProductByPriceId(priceId: string) {
  const { data, error } = await supabase
    .from('stripe_products')
    .select('*')
    .eq('price_id', priceId)
    .maybeSingle();

  if (error) {
    logger.error('Error fetching Stripe product by price ID', error);
    return null;
  }

  return data;
}