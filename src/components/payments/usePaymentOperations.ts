import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { useToast } from '../ui/toast';
import { PaymentInfo, PaymentHistoryEntry, EditPaymentForm } from './types';
import { formatPaymentMethod } from './utils';

export function usePaymentOperations(
  paymentInfo: PaymentInfo | null,
  paymentHistory: PaymentHistoryEntry[],
  setPaymentInfo: (info: PaymentInfo) => void,
  setPaymentHistory: (history: PaymentHistoryEntry[]) => void
) {
  const { showToast } = useToast();
  
  const [depositAmount, setDepositAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('e_transfer');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editingPayment, setEditingPayment] = useState<EditPaymentForm>({
    id: null,
    amount: '',
    payment_method: null,
    date: '',
    notes: ''
  });
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<PaymentHistoryEntry | null>(null);

  const handleProcessPayment = async () => {
    if (!paymentInfo || !depositAmount || parseFloat(depositAmount) <= 0) {
      showToast('Please enter a valid deposit amount', 'error');
      return;
    }

    const depositValue = parseFloat(depositAmount);
    const newAmountPaid = paymentInfo.amount_paid + depositValue;
    
    // Calculate total amount due including 13% HST
    const totalAmountDueWithTax = paymentInfo.amount_due * 1.13;

    // Use a tolerance to handle floating point precision issues
    // Allow payments up to 1 cent over the amount due (including tax) to handle rounding
    if (newAmountPaid > totalAmountDueWithTax + 0.01) {
      showToast('Payment amount cannot exceed the amount owing', 'error');
      return;
    }

    try {
      setProcessingPayment(true);

      const today = new Date();
      const newHistoryEntry: PaymentHistoryEntry = {
        id: paymentHistory.length > 0 ? Math.max(...paymentHistory.map(h => h.id)) + 1 : 1,
        payment_id: paymentInfo.id,
        amount: depositValue, 
        payment_method: paymentMethod,
        date: today.toISOString(),
        notes: paymentNotes.trim() || `Payment of $${depositValue.toFixed(2)} via ${formatPaymentMethod(paymentMethod)}`
      };
      
      const updatedHistory = [...paymentHistory, newHistoryEntry];
      const updatedNotes = JSON.stringify(updatedHistory);
      const totalPaid = updatedHistory.reduce((sum, entry) => sum + entry.amount, 0);

      const { data, error } = await supabase
        .from('league_payments')
        .update({
          amount_paid: totalPaid,
          payment_method: paymentMethod,
          notes: updatedNotes
        })
        .eq('id', paymentInfo.id)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setPaymentInfo(data);
        setPaymentHistory(updatedHistory);
      }

      showToast(`Payment of $${depositValue.toFixed(2)} processed successfully!`, 'success');
      
      setDepositAmount('');
      setPaymentNotes('');
      setPaymentMethod('e_transfer');

    } catch (error) {
      logger.error('Error processing payment', error);
      showToast('Failed to process payment', 'error');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleDeletePayment = async (entry: PaymentHistoryEntry) => {
    if (!paymentInfo) return;
    
    // Confirmation dialog before deleting payment entry
    const confirmMessage = `Are you sure you want to delete this payment entry of $${entry.amount.toFixed(2)}?\n\nThis action cannot be undone.`;
    if (!confirm(confirmMessage)) {
      return;
    }
    
    try {
      setProcessingPayment(true);
      
      const updatedHistory = paymentHistory.filter(h => h.id !== entry.id);
      const updatedNotes = JSON.stringify(updatedHistory);
      const newAmountPaid = updatedHistory.reduce((total, entry) => {
        const amount = typeof entry.amount === 'number' ? entry.amount : parseFloat(entry.amount.toString()) || 0;
        return total + amount;
      }, 0);
      
      const { data, error } = await supabase
        .from('league_payments')
        .update({ 
          notes: updatedNotes, 
          amount_paid: newAmountPaid
        })
        .eq('id', paymentInfo.id)
        .select()
        .single();

      if (error) throw error;
      
      if (data) {
        setPaymentInfo({
          ...paymentInfo,
          amount_paid: newAmountPaid,
          payment_method: paymentMethod,
          notes: updatedNotes
        });
        
        setPaymentHistory(updatedHistory);
      }

      showToast('Payment entry deleted successfully!', 'success');

    } catch (error) {
      logger.error('Error deleting payment entry', error);
      showToast('Failed to delete payment entry', 'error');
    } finally {
      setProcessingPayment(false);
      setShowDeleteConfirmation(false);
      setPaymentToDelete(null);
    }
  };

  const confirmDeletePayment = (entry: PaymentHistoryEntry) => {
    setPaymentToDelete(entry);
    setShowDeleteConfirmation(true);
  };

  const handleEditPayment = (entry: PaymentHistoryEntry) => {
    setEditingNoteId(entry.id);
    setEditingPayment({
      id: entry.id,
      amount: entry.amount.toString(),
      payment_method: entry.payment_method,
      date: entry.date.split('T')[0],
      notes: entry.notes || ''
    });
  };

  const handleSavePaymentEdit = async () => {
    if (!paymentInfo || editingNoteId === null) return;
    
    try {
      setProcessingPayment(true);
      
      const updatedHistory = [...paymentHistory];
      const entryIndex = updatedHistory.findIndex(h => h.id === editingNoteId);
      
      if (entryIndex !== -1) {
        updatedHistory[entryIndex] = {
          ...updatedHistory[entryIndex],
          amount: parseFloat(editingPayment.amount) || 0,
          payment_method: editingPayment.payment_method,
          date: editingPayment.date ? new Date(editingPayment.date).toISOString() : new Date().toISOString(),
          notes: editingPayment.notes
        };
      }
      
      const updatedNotes = JSON.stringify(updatedHistory);
      const newAmountPaid = updatedHistory.reduce((total, entry) => {
        const amount = typeof entry.amount === 'number' ? entry.amount : parseFloat(entry.amount.toString()) || 0;
        return total + amount;
      }, 0);
      
      const { data, error } = await supabase
        .from('league_payments')
        .update({ 
          notes: updatedNotes,
          amount_paid: newAmountPaid,
          payment_method: editingPayment.payment_method || paymentInfo.payment_method
        })
        .eq('id', paymentInfo.id)
        .select()
        .single(); 

      if (error) throw error;
      
      if (data) {
        setPaymentInfo({
          ...paymentInfo,
          amount_paid: newAmountPaid,
          payment_method: editingPayment.payment_method || paymentInfo.payment_method,
          notes: updatedNotes
        });
        
        setPaymentHistory(updatedHistory);
      }

      showToast('Payment record updated successfully!', 'success');
      
      setEditingNoteId(null);
      setEditingPayment({
        id: null,
        amount: '',
        payment_method: null,
        date: '',
        notes: ''
      });

    } catch (error) {
      logger.error('Error updating payment record', error);
      showToast('Failed to update payment record', 'error');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditingPayment({
      id: null,
      amount: '',
      payment_method: null,
      date: '',
      notes: ''
    });
  };

  return {
    depositAmount,
    paymentMethod,
    paymentNotes,
    processingPayment,
    editingNoteId,
    editingPayment,
    showDeleteConfirmation,
    paymentToDelete,
    setDepositAmount,
    setPaymentMethod,
    setPaymentNotes,
    setEditingPayment,
    setShowDeleteConfirmation,
    handleProcessPayment,
    handleDeletePayment,
    confirmDeletePayment,
    handleEditPayment,
    handleSavePaymentEdit,
    handleCancelEdit
  };
}