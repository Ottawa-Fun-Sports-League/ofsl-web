import { supabase } from './supabase';
import { logger } from './logger';

// Interface for league payment records
export interface LeaguePayment {
  id: number;
  user_id: string;
  team_id: number | null;
  league_id: number;
  amount_due: number;
  amount_paid: number;
  amount_outstanding: number;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  due_date: string | null;
  payment_method: 'stripe' | 'cash' | 'e_transfer' | 'waived' | null;
  stripe_order_id: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  league_name: string;
  team_name: string | null;
}

export interface PaymentSummary {
  total_outstanding: number;
  total_paid: number;
  pending_payments: number;
  overdue_payments: number;
}

// Get all league payments for the current user, including "virtual" payments for teams without payment records
export const getUserLeaguePayments = async (userId?: string): Promise<LeaguePayment[]> => {
  try {
    // Get current user if not provided
    let currentUserId = userId;
    if (!currentUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      currentUserId = user?.id;
    }
    
    if (!currentUserId) {
      throw new Error('User not authenticated');
    }

    // Get actual payment records from the database for the current user
    const { data, error } = await supabase
      .from('league_payments')
      .select(`
        id,
        user_id,
        team_id,
        league_id,
        amount_due,
        amount_paid,
        status,
        due_date,
        payment_method,
        stripe_order_id,
        notes,
        created_at,
        updated_at,
        leagues!inner(name, cost, early_bird_cost, early_bird_due_date, payment_due_date),
        teams(name)
      `)
      .eq('user_id', currentUserId);

    if (error) throw error;

    // Transform the data to match the LeaguePayment interface
    const actualPayments = (data || []).map(payment => {
      // Determine effective amount due: if already paid, keep recorded
      // else use current league effective cost for dynamic pricing
      const league = payment.leagues as unknown as { 
        name: string; 
        cost: number | null; 
        early_bird_cost?: number | null; 
        early_bird_due_date?: string | null; 
        payment_due_date?: string | null;
      };
      const today = new Date();
      const earlyDeadline = league?.early_bird_due_date ? new Date(league.early_bird_due_date + 'T23:59:59') : null;
      const earlyActive = !!(league?.early_bird_cost && earlyDeadline && today.getTime() <= earlyDeadline.getTime());
      const dynamicDue = earlyActive ? (league.early_bird_cost || league.cost || 0) : (league.cost || 0);
      const effectiveAmountDue = (payment.status === 'paid') ? payment.amount_due : dynamicDue;

      return ({
      id: payment.id,
      user_id: payment.user_id,
      team_id: payment.team_id,
      league_id: payment.league_id,
      amount_due: effectiveAmountDue,
      amount_paid: payment.amount_paid,
      amount_outstanding: Math.max(0, effectiveAmountDue - payment.amount_paid),
      status: payment.status as 'pending' | 'partial' | 'paid' | 'overdue',
      due_date: payment.due_date,
      payment_method: payment.payment_method,
      stripe_order_id: payment.stripe_order_id,
      notes: payment.notes,
      created_at: payment.created_at,
      updated_at: payment.updated_at,
      league_name: (payment.leagues as unknown as { name: string })?.name || '',
      team_name: (payment.teams as unknown as { name: string } | null)?.name || null
    });
    });

    // Get user's teams that might not have payment records
    const { data: userTeams, error: teamsError } = await supabase
      .from('teams')
      .select(`
        id,
        name,
        league_id,
        leagues!inner(id, name, cost)
      `)
      .eq('active', true)
      .contains('roster', [currentUserId]);

    if (teamsError) {
      logger.error('Error fetching user teams', teamsError);
      return actualPayments;
    }

    // Create a set of team IDs that already have payment records
    const teamsWithPayments = new Set(
      actualPayments
        .filter(payment => payment.team_id !== null)
        .map(payment => payment.team_id)
    );

    // Create virtual payment records for teams without payment entries
    const virtualPayments: LeaguePayment[] = [];
    
    for (const team of userTeams || []) {
      // Skip if team already has a payment record or if league has no cost
      const league = team.leagues as unknown as { id: number; name: string; cost: number | null; payment_due_date: string | null; early_bird_cost?: number | null; early_bird_due_date?: string | null };
      if (
        teamsWithPayments.has(team.id) || 
        !league || 
        !league.cost || 
        league.cost <= 0
      ) {
        continue;
      }

      // Create a virtual payment record
      // Use league's payment_due_date if available, otherwise default to 30 days
      const dueDate = league.payment_due_date 
        ? new Date(league.payment_due_date + "T00:00:00") 
        : new Date(new Date().getTime() + (30 * 24 * 60 * 60 * 1000));

      // Determine effective amount due for virtual payment (dynamic)
      const today = new Date();
      const earlyDeadline = league.early_bird_due_date ? new Date(league.early_bird_due_date + 'T23:59:59') : null;
      const earlyActive = !!(league.early_bird_cost && earlyDeadline && today.getTime() <= earlyDeadline.getTime());
      const effectiveAmountDue = earlyActive ? (league.early_bird_cost || league.cost || 0) : (league.cost || 0);

      virtualPayments.push({
        id: -team.id, // Use negative team ID to ensure uniqueness
        user_id: currentUserId, // Use the current user's ID
        team_id: team.id,
        league_id: team.league_id,
        amount_due: effectiveAmountDue,
        amount_paid: 0,
        amount_outstanding: effectiveAmountDue,
        status: 'pending',
        due_date: dueDate.toISOString(),
        payment_method: null,
        stripe_order_id: null,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        league_name: league.name,
        team_name: team.name
      });
    }

    // Combine actual and virtual payments
    return [...actualPayments, ...virtualPayments];
  } catch (error) {
    logger.error('Error fetching user league payments', error);
    return [];
  }
};

// Get payment summary for the current user
export const getUserPaymentSummary = async (): Promise<PaymentSummary> => {
  try {
    // Get user ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        total_outstanding: 0,
        total_paid: 0,
        pending_payments: 0,
        overdue_payments: 0
      };
    }
    
    // Get all payments for the current user
    const { data: payments, error } = await supabase
      .from('user_payment_summary')
      .select('amount_outstanding, amount_paid, status');
    
    if (error) {
      logger.error('Error fetching payment summary', error);
      return {
        total_outstanding: 0,
        total_paid: 0,
        pending_payments: 0,
        overdue_payments: 0
      };
    }
    
    if (!payments) {
      return {
        total_outstanding: 0,
        total_paid: 0,
        pending_payments: 0,
        overdue_payments: 0
      };
    }

    // Calculate summary from all payments
    const summary = payments.reduce((acc, payment) => {
      acc.total_outstanding += payment.amount_outstanding || 0; 
      acc.total_paid += payment.amount_paid || 0; 
      
      if (payment.status === 'pending' || payment.status === 'partial') {
        acc.pending_payments++;
      } else if (payment.status === 'overdue') {
        acc.overdue_payments++;
      }
      
      return acc;
    }, {
      total_outstanding: 0,
      total_paid: 0,
      pending_payments: 0,
      overdue_payments: 0
    });

    return summary;
  } catch (error) {
    logger.error('Error fetching user payment summary', error);
    return {
      total_outstanding: 0,
      total_paid: 0,
      pending_payments: 0,
      overdue_payments: 0
    };
  }
};

// Legacy function - kept for backward compatibility
// Get all league payments for the current user
export const _getUserLeaguePayments = async (): Promise<LeaguePayment[]> => {
  try {
    const { data, error } = await supabase
      .from('league_payments')
      .select(`
        id,
        user_id,
        team_id,
        league_id,
        amount_due,
        amount_paid,
        status,
        due_date,
        payment_method,
        stripe_order_id,
        notes,
        created_at,
        updated_at,
        leagues!inner(name),
        teams(name)
      `);

    if (error) throw error;

    // Transform the data to match the LeaguePayment interface
    const transformedData = (data || []).map(payment => ({
      id: payment.id,
      user_id: payment.user_id,
      team_id: payment.team_id,
      league_id: payment.league_id,
      amount_due: payment.amount_due,
      amount_paid: payment.amount_paid,
      amount_outstanding: Math.max(0, payment.amount_due - payment.amount_paid),
      status: payment.status as 'pending' | 'partial' | 'paid' | 'overdue',
      due_date: payment.due_date,
      payment_method: payment.payment_method,
      stripe_order_id: payment.stripe_order_id,
      notes: payment.notes,
      created_at: payment.created_at,
      updated_at: payment.updated_at,
      league_name: (payment.leagues as unknown as { name: string })?.name || '',
      team_name: (payment.teams as unknown as { name: string } | null)?.name || null
    }));

    return transformedData;
  } catch (error) {
    logger.error('Error fetching user league payments', error);
    return [];
  }
};

// Get payment summary for the current user
export const _getUserPaymentSummary = async (): Promise<PaymentSummary> => {
  try {
    const { data: payments, error } = await supabase
      .from('user_payment_summary')
      .select('amount_outstanding, amount_paid, status');

    if (error) throw error;

    if (!payments) {
      return {
        total_outstanding: 0,
        total_paid: 0,
        pending_payments: 0,
        overdue_payments: 0
      };
    }

    const summary = payments.reduce((acc, payment) => {
      acc.total_outstanding += payment.amount_outstanding || 0;
      acc.total_paid += payment.amount_paid || 0;
      
      if (payment.status === 'pending' || payment.status === 'partial') {
        acc.pending_payments++;
      } else if (payment.status === 'overdue') {
        acc.overdue_payments++;
      }
      
      return acc;
    }, {
      total_outstanding: 0,
      total_paid: 0,
      pending_payments: 0,
      overdue_payments: 0
    });

    return summary;
  } catch (error) {
    logger.error('Error fetching user payment summary', error);
    return {
      total_outstanding: 0,
      total_paid: 0,
      pending_payments: 0,
      overdue_payments: 0
    };
  }
};

// Create a league payment record (typically called when registering a team)
export const createLeaguePayment = async (params: {
  user_id: string;
  team_id?: number;
  league_id: number;
  amount_due: number;
  due_date?: string;
  notes?: string;
}) => {
  try {
    const { data, error } = await supabase
      .from('league_payments')
      .insert({
        user_id: params.user_id,
        team_id: params.team_id,
        league_id: params.league_id,
        amount_due: params.amount_due,
        due_date: params.due_date,
        notes: params.notes,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    logger.error('Error creating league payment', error);
    throw error;
  }
};

// Update a league payment (for manual payments)
export const updateLeaguePayment = async (
  paymentId: number, 
  updates: {
    amount_paid?: number;
    payment_method?: 'stripe' | 'cash' | 'e_transfer' | 'waived';
    notes?: string;
  }
) => {
  try {
    const { data, error } = await supabase
      .from('league_payments')
      .update(updates)
      .eq('id', paymentId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    logger.error('Error updating league payment', error);
    throw error;
  }
};

// Get outstanding balance for a specific user
export const getUserOutstandingBalance = async (userId?: string): Promise<number> => {
  try {
    if (!userId) {
      // Use the SQL function for current user
      const { data, error } = await supabase
        .rpc('calculate_user_outstanding_balance', { p_user_id: null });

      if (error) throw error;
      return data || 0;
    } else {
      // Use the SQL function for specific user
      const { data, error } = await supabase
        .rpc('calculate_user_outstanding_balance', { p_user_id: userId });

      if (error) throw error;
      return data || 0;
    }
  } catch (error) {
    logger.error('Error calculating outstanding balance', error);
    return 0;
  }
};
