export const getPaymentStatusColor = (status: string) => {
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
};

export const formatPaymentMethod = (method: string | null) => {
  if (!method) return '-';
  
  if (method === 'stripe') return 'ONLINE';
  
  return method.replace('_', '-').toUpperCase();
};