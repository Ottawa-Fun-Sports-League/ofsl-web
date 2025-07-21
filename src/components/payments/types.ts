export interface PaymentInfo {
  id: number;
  team_id: number;
  amount_due: number;
  amount_paid: number;
  status: 'pending' | 'paid' | 'overdue';
  due_date: string | null;
  payment_method: string | null;
  notes: string | null;
}

export interface PaymentHistoryEntry {
  id: number;
  payment_id: number;
  amount: number;
  payment_method: string;
  date: string;
  notes: string;
}

export interface EditPaymentForm {
  id: number | null;
  amount: string;
  payment_method: string | null;
  date: string;
  notes: string;
}