export interface Skill {
  id: number;
  name: string;
  description: string | null;
}

export interface TeamMember {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
}

export interface PaymentInfo {
  id: number;
  amount_due: number;
  amount_paid: number;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  due_date: string | null;
  payment_method: string | null;
  notes: string | null;
}

export interface PaymentHistoryEntry {
  id: number;
  amount: number;
  payment_id?: number;
  payment_method: string | null;
  date: string; 
  notes: string | null;
}

export interface EditPaymentForm {
  id: number | null;
  amount: string;
  payment_method: string | null;
  date: string;
  notes: string;
}

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface Team {
  id: number;
  name: string;
  skill_level_id: number | null;
  league_id: number;
  captain_id: string;
  roster: string[];
  created_at: string;
  leagues?: {
    id: number;
    name: string;
  };
  skills?: {
    name: string;
  };
  users?: {
    name: string;
    email: string;
  };
}

export interface EditTeamForm {
  name: string;
  skill_level_id: number | null;
}