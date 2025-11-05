import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import { Database } from './types/database.ts';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

const supabase = createClient<Database>(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  try {
    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // get the signature from the header
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response('No signature found', { status: 400 });
    }

    // get the raw body
    const body = await req.text();

    // verify the webhook signature
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Webhook signature verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return new Response(`Webhook signature verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`, { status: 400 });
    }

    EdgeRuntime.waitUntil(handleEvent(event));

    return Response.json({ received: true });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error processing webhook:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

async function handleEvent(event: Stripe.Event) {
  const stripeData = event?.data?.object ?? {};

  if (!stripeData) {
    // eslint-disable-next-line no-console
    console.error('No data object in Stripe event');
    return;
  }

  if (!('customer' in stripeData)) {
    // eslint-disable-next-line no-console
    console.error('No customer in Stripe event data object');
    return;
  }

  // for one time payments, we only listen for the checkout.session.completed event
  if (event.type === 'payment_intent.succeeded' && event.data.object.invoice === null) {
    return;
  }

  const { customer: customerId } = stripeData;

  if (!customerId || typeof customerId !== 'string') {
    // eslint-disable-next-line no-console
    console.error(`No customer received on event: ${JSON.stringify(event)}`);
  } else {
    let isSubscription = true;

    if (event.type === 'checkout.session.completed') {
      const { mode } = stripeData as Stripe.Checkout.Session;

      isSubscription = mode === 'subscription';

      // eslint-disable-next-line no-console
      console.info(`Processing ${isSubscription ? 'subscription' : 'one-time payment'} checkout session`);
    }

    const { mode, payment_status } = stripeData as Stripe.Checkout.Session;

    if (isSubscription) {
      // eslint-disable-next-line no-console
      console.info(`Starting subscription sync for customer: ${customerId}`);
      await syncCustomerFromStripe(customerId);
    } else if (mode === 'payment' && payment_status === 'paid') {
      try {
        // Extract the necessary information from the session
        const {
          id: checkout_session_id,
          payment_intent,
          amount_subtotal,
          amount_total,
          currency,
          metadata,
        } = stripeData as Stripe.Checkout.Session;

        // Extract league_id from metadata if available
        const leagueId = metadata?.leagueId ? parseInt(metadata.leagueId as string) : null;

        // Insert the order into the stripe_orders table
        const { data: orderData, error: orderError } = await supabase.from('stripe_orders').insert({
          checkout_session_id,
          payment_intent_id: payment_intent,
          customer_id: customerId,
          amount_subtotal,
          amount_total,
          currency,
          payment_status,
          status: 'completed',
          league_id: leagueId,
        }).select().single();

        if (orderError) {
          // eslint-disable-next-line no-console
          console.error('Error inserting order:', orderError);
          return;
        }

        // eslint-disable-next-line no-console
        console.info(`Successfully processed one-time payment for session: ${checkout_session_id}`);

        // Now process league payments
        await processLeaguePayments(customerId, orderData, amount_total, leagueId);

      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error processing one-time payment:', error);
      }
    }
  }
}

async function processLeaguePayments(customerId: string, orderData: { id?: string; teamId?: string; metadata?: { team_id?: string } }, amountTotal: number, leagueId: number | null = null) {
  try {
    // Get the user ID from the stripe_customers table
    const { data: customerData, error: customerError } = await supabase
      .from('stripe_customers')
      .select('user_id')
      .eq('customer_id', customerId)
      .single();

    if (customerError || !customerData) {
      // eslint-disable-next-line no-console
      console.error('Error finding user for customer:', customerError);
      return;
    }

    const userId = customerData.user_id;
    // eslint-disable-next-line no-console
    console.log(`Processing payments for user ${userId} with amount ${amountTotal/100}`);

    let pendingPayments;
    
    // If we have a specific league ID, only process payments for that league
    if (leagueId) {
      const { data, error } = await supabase
        .from('league_payments')
        .select('*')
        .eq('user_id', userId)
        .eq('league_id', leagueId)
        .in('status', ['pending', 'partial'])
        .order('due_date', { ascending: true });
        
      if (error) {
        // eslint-disable-next-line no-console
        console.error('Error fetching league-specific payments:', error);
        return;
      }
      
      pendingPayments = data;
    } else {
      // Otherwise, get all pending payments for this user
      const { data, error } = await supabase
        .from('league_payments')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['pending', 'partial'])
        .order('due_date', { ascending: true });

      if (error) {
        // eslint-disable-next-line no-console
        console.error('Error fetching pending payments:', error);
        return;
      }
      
      pendingPayments = data;
    }

    const paymentCount = pendingPayments?.length || 0;
    if (!pendingPayments || paymentCount === 0) {
      // eslint-disable-next-line no-console
      console.info('No pending payments found for user');
      return;
    }
    // eslint-disable-next-line no-console
    console.log(`Found ${paymentCount} pending payments to process`);

    // Convert cents to dollars
    const paymentAmount = amountTotal / 100;
    let remainingAmount = paymentAmount;

    // Apply payment to pending league payments (FIFO - first in, first out)
    for (const payment of pendingPayments) {
      if (remainingAmount <= 0) break;

      const outstandingAmount = payment.amount_due - payment.amount_paid;
      const paymentToApply = Math.min(remainingAmount, outstandingAmount);

      if (paymentToApply > 0) {
        const newAmountPaid = payment.amount_paid + paymentToApply;
        const newStatus = newAmountPaid >= payment.amount_due ? 'paid' : 'partial';

        // Update the league payment record
        const { error: updateError } = await supabase
          .from('league_payments')
          .update({
            amount_paid: newAmountPaid,
            status: newStatus,
            payment_method: 'stripe',
            stripe_order_id: orderData.id
          })
          .eq('id', payment.id);

        if (updateError) {
          // eslint-disable-next-line no-console
          console.error('Error updating league payment:', updateError);
        } else {
          // eslint-disable-next-line no-console
          console.info(`Applied $${paymentToApply.toFixed(2)} to league payment ${payment.id}, new status: ${newStatus}`);
          remainingAmount -= paymentToApply;

          // Check if this is an individual registration (payment_type === 'individual')
          // and the payment is now fully paid
          if (newStatus === 'paid' && payment.payment_type === 'individual') {
            // Send notification email for individual registration
            await sendIndividualRegistrationNotification(userId, payment.league_id, paymentAmount);
          } else if (newStatus === 'paid' && payment.team_id) {
            // Send notification email for team registration
            await sendTeamRegistrationNotification(payment.team_id, paymentAmount);
          }
        }
      }
    }

    // If there's still remaining amount, create a credit/prepayment record
    if (remainingAmount > 0) {
      // eslint-disable-next-line no-console
      console.info(`Creating credit record for remaining amount: $${remainingAmount.toFixed(2)}`);
      // You could create a credit record here if needed
    }

  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error processing league payments:', error);
  }
}

async function sendIndividualRegistrationNotification(userId: string, leagueId: number, amountPaid: number) {
  try {
    // Get user information
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('first_name, last_name, email, phone')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      console.error('Error fetching user data for notification:', userError);
      return;
    }

    // Get league information
    const { data: leagueData, error: leagueError } = await supabase
      .from('leagues')
      .select('name')
      .eq('id', leagueId)
      .single();

    if (leagueError || !leagueData) {
      console.error('Error fetching league data for notification:', leagueError);
      return;
    }

    // Prepare notification data
    const notificationData = {
      userId: userId,
      userName: `${userData.first_name} ${userData.last_name}`,
      userEmail: userData.email,
      userPhone: userData.phone,
      leagueName: leagueData.name,
      registeredAt: new Date().toISOString(),
      amountPaid: amountPaid,
      paymentMethod: 'Stripe'
    };

    // Get service role key for auth
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Call the notification edge function
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/notify-individual-registration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`
      },
      body: JSON.stringify(notificationData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to send individual registration notification:', errorText);
    } else {
      console.info('Individual registration notification sent successfully');
    }
  } catch (error) {
    console.error('Error sending individual registration notification:', error);
  }
}

async function sendTeamRegistrationNotification(teamId: number, _amountPaid: number) {
  try {
    // Get team information
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .select('name, captain_id, league_id')
      .eq('id', teamId)
      .single();

    if (teamError || !teamData) {
      console.error('Error fetching team data for notification:', teamError);
      return;
    }

    if (!teamData.captain_id) {
      console.error('Team has no captain_id set; cannot send notification');
      return;
    }

    // Get captain (user) information
    const { data: captainData, error: captainError } = await supabase
      .from('users')
      .select('first_name, last_name, name, email, phone')
      .eq('id', teamData.captain_id)
      .single();

    if (captainError || !captainData) {
      console.error('Error fetching captain data for notification:', captainError);
      return;
    }

    // Get league information
    const { data: leagueData, error: leagueError } = await supabase
      .from('leagues')
      .select('name')
      .eq('id', teamData.league_id)
      .single();

    if (leagueError || !leagueData) {
      console.error('Error fetching league data for notification:', leagueError);
      return;
    }

    // Get roster count
    const { count: rosterCount, error: rosterError } = await supabase
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId);

    if (rosterError) {
      console.error('Error fetching roster count for notification:', rosterError);
    }

    // Determine captain name
    const captainName = captainData.name || `${captainData.first_name || ''} ${captainData.last_name || ''}`.trim() || 'Unknown';

    // Prepare notification data
    const notificationData = {
      teamId: teamId,
      teamName: teamData.name,
      enteredTeamName: teamData.name,
      originalTeamName: teamData.name,
      preferredTeamName: null,
      displayTeamName: teamData.name,
      captainName: captainName,
      captainEmail: captainData.email,
      captainPhone: captainData.phone,
      leagueName: leagueData.name,
      registeredAt: new Date().toISOString(),
      rosterCount: rosterCount || 0
    };

    // Get service role key for auth
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Call the notification edge function
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/notify-team-registration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`
      },
      body: JSON.stringify(notificationData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to send team registration notification:', errorText);
    } else {
      console.info('Team registration notification sent successfully');
    }
  } catch (error) {
    console.error('Error sending team registration notification:', error);
  }
}

// based on the excellent https://github.com/t3dotgg/stripe-recommendations
async function syncCustomerFromStripe(customerId: string) {
  try {
    // Fetch latest subscription data from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: 'all',
      expand: ['data.default_payment_method'],
    });

    // TODO verify if needed
    const hasSubscriptions = subscriptions.data.length > 0;
    if (!hasSubscriptions) {
      // eslint-disable-next-line no-console
      console.info(`No active subscriptions found for customer: ${customerId}`);
      const { error: noSubError } = await supabase.from('stripe_subscriptions').upsert(
        {
          customer_id: customerId,
          status: 'not_started',
        },
        {
          onConflict: 'customer_id',
        },
      );

      if (noSubError) {
        // eslint-disable-next-line no-console
        console.error('Error updating subscription status:', noSubError);
        throw new Error('Failed to update subscription status in database');
      }
    }

    // assumes that a customer can only have a single subscription
    if (hasSubscriptions) {
      const subscription = subscriptions.data[0];

      // store subscription state
      const { error: subError } = await supabase.from('stripe_subscriptions').upsert(
        {
          customer_id: customerId,
          subscription_id: subscription.id,
          price_id: subscription.items.data[0].price.id,
          current_period_start: subscription.current_period_start,
          current_period_end: subscription.current_period_end,
          cancel_at_period_end: subscription.cancel_at_period_end,
          ...(subscription.default_payment_method && typeof subscription.default_payment_method !== 'string'
            ? {
                payment_method_brand: subscription.default_payment_method.card?.brand ?? null,
                payment_method_last4: subscription.default_payment_method.card?.last4 ?? null,
              }
            : {}),
          status: subscription.status,
        },
        {
          onConflict: 'customer_id',
        },
      );

      if (subError) {
        // eslint-disable-next-line no-console
        console.error('Error syncing subscription:', subError);
        throw new Error('Failed to sync subscription in database');
      }
      // eslint-disable-next-line no-console
      console.info(`Successfully synced subscription for customer: ${customerId}`);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Failed to sync subscription for customer ${customerId}:`, error);
    throw error;
  }
}
