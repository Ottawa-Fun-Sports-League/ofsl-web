export function formatPaymentMethod(method: string | null): string {
  if (!method) return 'Not specified';
  
  switch (method.toLowerCase()) {
    case 'e_transfer':
      return 'E-Transfer';
    case 'stripe':
      return 'Online';
    case 'cash':
      return 'Cash';
    default:
      return method;
  }
}

export function calculatePaymentStatus(
  amountDue: number, 
  amountPaid: number, 
  dueDate?: string
): 'paid' | 'partial' | 'pending' | 'overdue' {
  // Calculate total due including 13% HST
  const totalDueWithTax = amountDue * 1.13;
  
  // Use tolerance to handle floating point precision
  if (amountPaid >= totalDueWithTax - 0.01) {
    return 'paid';
  } else if (amountPaid > 0) {
    return 'partial';
  } else if (dueDate && new Date(dueDate) < new Date()) {
    return 'overdue';
  } else {
    return 'pending';
  }
}

export function getPaymentStatusColor(status: string): string {
  switch (status) {
    case 'paid':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'partial':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'overdue':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'pending':
    default:
      return 'bg-rose-50 text-rose-700 border-rose-200';
  }
}