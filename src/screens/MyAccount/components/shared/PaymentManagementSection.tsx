import { useState, useEffect } from 'react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { PaymentStatusBadge } from '../../../../components/ui/payment-status-badge';
import { Clock, DollarSign, Trash2, CreditCard, Plus } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { useToast } from '../../../../components/ui/toast';
import { useAuth } from '../../../../contexts/AuthContext';

interface LeaguePayment {
  id: number;
  league_name: string;
  team_name: string;
  amount_due: number;
  amount_paid: number;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  due_date: string;
  payment_method: string | null;
  user_id: string;
  team_id: number | null;
  league_id: number;
}

interface PaymentManagementSectionProps {
  leagueId?: number; // Optional - if provided, only show payments for this league
  teamId?: number; // Optional - if provided, only show payments for this team
  userId?: string; // Optional - if provided, only show payments for this user
  title?: string; // Custom title for the section
  allowDelete?: boolean; // Whether to show delete buttons
  allowCreate?: boolean; // Whether to show create payment button
  onPaymentDeleted?: (paymentId: number) => void; // Callback when payment is deleted
  onPaymentCreated?: () => void; // Callback when payment is created
}

export function PaymentManagementSection({
  leagueId,
  teamId,
  userId,
  title = "League Payments",
  allowDelete = true,
  allowCreate = false,
  onPaymentDeleted,
  onPaymentCreated
}: PaymentManagementSectionProps) {
  const [payments, setPayments] = useState<LeaguePayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingPayment, setDeletingPayment] = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [leagues, setLeagues] = useState<Array<{id: number, name: string, cost: number}>>([]);
  const [teams, setTeams] = useState<Array<{id: number, name: string, captain_id: string}>>([]);
  const [users, setUsers] = useState<Array<{id: string, name: string, email: string}>>([]);
  const [newPayment, setNewPayment] = useState({
    league_id: leagueId || 0,
    team_id: teamId || 0,
    user_id: userId || '',
    amount_due: 0,
    amount_paid: 0,
    status: 'pending' as 'pending' | 'partial' | 'paid' | 'overdue',
    due_date: '',
    payment_method: '',
    notes: ''
  });
  const { showToast } = useToast();
  const { userProfile } = useAuth();

  useEffect(() => {
    loadPayments();
    if (allowCreate && userProfile?.is_admin) {
      loadFormData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId, teamId, userId, allowCreate, userProfile?.is_admin]);

  const loadFormData = async () => {
    try {
      // Load leagues if not filtered by league
      if (!leagueId) {
        const { data: leaguesData } = await supabase
          .from('leagues')
          .select('id, name, cost')
          .order('name');
        setLeagues(leaguesData || []);
      }

      // Load teams if not filtered by team
      if (!teamId) {
        const { data: teamsData } = await supabase
          .from('teams')
          .select('id, name, captain_id')
          .order('name');
        setTeams(teamsData || []);
      }

      // Load users if not filtered by user
      if (!userId) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, name, email')
          .order('name');
        setUsers(usersData || []);
      }
    } catch (error) {
      console.error('Error loading form data:', error);
    }
  };

  const loadPayments = async () => {
    try {
      setLoading(true);
      
      let query = supabase
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
          notes,
          leagues!inner(name),
          teams(name)
        `)
        .order('due_date', { ascending: true });

      // Apply filters based on props
      if (leagueId) {
        query = query.eq('league_id', leagueId);
      }
      if (teamId) {
        query = query.eq('team_id', teamId);
      }
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedPayments = data?.map(payment => ({
        id: payment.id,
        league_name: (payment.leagues as any)?.name || 'Unknown League',
        team_name: (payment.teams as any)?.name || 'Unknown Team',
        amount_due: payment.amount_due || 0,
        amount_paid: payment.amount_paid || 0,
        status: payment.status as 'pending' | 'partial' | 'paid' | 'overdue',
        due_date: payment.due_date || '',
        payment_method: payment.payment_method,
        user_id: payment.user_id,
        team_id: payment.team_id,
        league_id: payment.league_id
      })) || [];

      setPayments(formattedPayments);
    } catch (error) {
      console.error('Error loading payments:', error);
      showToast('Failed to load payments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayment = async (paymentId: number, leagueName: string) => {
    if (!confirm(`Are you sure you want to delete the payment for ${leagueName}? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingPayment(paymentId);
      
      const { error } = await supabase
        .from('league_payments')
        .delete()
        .eq('id', paymentId);

      if (error) throw error;

      // Update local state
      setPayments(prev => prev.filter(p => p.id !== paymentId));
      
      showToast('Payment deleted successfully', 'success');
      
      // Call callback if provided
      if (onPaymentDeleted) {
        onPaymentDeleted(paymentId);
      }
      
    } catch (error) {
      console.error('Error deleting payment:', error);
      showToast('Failed to delete payment', 'error');
    } finally {
      setDeletingPayment(null);
    }
  };

  const handleCreatePayment = async () => {
    if (!userProfile?.is_admin) {
      showToast('Only admins can create payment records', 'error');
      return;
    }

    // Validation
    if (!newPayment.league_id || !newPayment.user_id || !newPayment.amount_due || !newPayment.due_date) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    try {
      setCreating(true);

      const { error } = await supabase
        .from('league_payments')
        .insert({
          league_id: newPayment.league_id,
          team_id: newPayment.team_id || null,
          user_id: newPayment.user_id,
          amount_due: newPayment.amount_due,
          amount_paid: newPayment.amount_paid,
          status: newPayment.status,
          due_date: newPayment.due_date,
          payment_method: newPayment.payment_method || null,
          notes: newPayment.notes || null
        });

      if (error) throw error;

      // Reset form
      setNewPayment({
        league_id: leagueId || 0,
        team_id: teamId || 0,
        user_id: userId || '',
        amount_due: 0,
        amount_paid: 0,
        status: 'pending',
        due_date: '',
        payment_method: '',
        notes: ''
      });
      setShowCreateForm(false);

      // Reload payments
      await loadPayments();

      showToast('Payment record created successfully', 'success');

      // Call callback if provided
      if (onPaymentCreated) {
        onPaymentCreated();
      }

    } catch (error) {
      console.error('Error creating payment:', error);
      showToast('Failed to create payment record', 'error');
    } finally {
      setCreating(false);
    }
  };


  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading payments...</span>
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="text-center py-8">
        <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
        <p className="text-gray-500">No payment records match the current criteria.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <CreditCard className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-blue-800">{title}</h3>
                <p className="text-sm text-blue-700 mt-1">
                  {payments.length} payment record{payments.length !== 1 ? 's' : ''} found.
                  {allowDelete && userProfile?.is_admin && ' You can manage payments here as an admin.'}
                </p>
              </div>
              {allowCreate && userProfile?.is_admin && (
                <Button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Payment
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Payment Form */}
      {showCreateForm && allowCreate && userProfile?.is_admin && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <h4 className="text-sm font-medium text-gray-800 mb-4">Create New Payment Record</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* League Selection */}
            {!leagueId && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">League *</label>
                <select
                  value={newPayment.league_id}
                  onChange={(e) => setNewPayment(prev => ({ ...prev, league_id: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value={0}>Select League</option>
                  {leagues.map(league => (
                    <option key={league.id} value={league.id}>
                      {league.name} (${league.cost})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Team Selection */}
            {!teamId && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Team (Optional)</label>
                <select
                  value={newPayment.team_id}
                  onChange={(e) => setNewPayment(prev => ({ ...prev, team_id: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value={0}>No Team</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* User Selection */}
            {!userId && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">User *</label>
                <select
                  value={newPayment.user_id}
                  onChange={(e) => setNewPayment(prev => ({ ...prev, user_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select User</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Amount Due */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Amount Due *</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={newPayment.amount_due}
                onChange={(e) => setNewPayment(prev => ({ ...prev, amount_due: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
                className="text-sm"
              />
            </div>

            {/* Amount Paid */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Amount Paid</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={newPayment.amount_paid}
                onChange={(e) => setNewPayment(prev => ({ ...prev, amount_paid: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
                className="text-sm"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select
                value={newPayment.status}
                onChange={(e) => setNewPayment(prev => ({ ...prev, status: e.target.value as 'pending' | 'partial' | 'paid' | 'overdue' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Due Date *</label>
              <Input
                type="date"
                value={newPayment.due_date}
                onChange={(e) => setNewPayment(prev => ({ ...prev, due_date: e.target.value }))}
                className="text-sm"
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Payment Method</label>
              <Input
                type="text"
                value={newPayment.payment_method}
                onChange={(e) => setNewPayment(prev => ({ ...prev, payment_method: e.target.value }))}
                placeholder="e.g., Credit Card, Bank Transfer"
                className="text-sm"
              />
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
              <Input
                type="text"
                value={newPayment.notes}
                onChange={(e) => setNewPayment(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes"
                className="text-sm"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              onClick={handleCreatePayment}
              disabled={creating}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {creating ? 'Creating...' : 'Create Payment'}
            </Button>
            <Button
              onClick={() => setShowCreateForm(false)}
              variant="outline"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {payments.map(payment => (
          <div key={payment.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{payment.league_name}</h4>
                {payment.team_name && (
                  <p className="text-sm text-gray-600 mt-1">Team: {payment.team_name}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>Due: {new Date(payment.due_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    <span>${payment.amount_paid.toFixed(2)} / ${(payment.amount_due * 1.13).toFixed(2)}</span>
                  </div>
                  <PaymentStatusBadge 
                    status={payment.status} 
                    size="sm"
                  />
                </div>
              </div>
              
              {allowDelete && userProfile?.is_admin && (
                <Button
                  onClick={() => handleDeletePayment(payment.id, payment.league_name)}
                  disabled={deletingPayment === payment.id}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 text-sm transition-colors flex items-center gap-1"
                >
                  {deletingPayment === payment.id ? (
                    'Deleting...'
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}