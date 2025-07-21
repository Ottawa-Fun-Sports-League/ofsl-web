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

export function getPaymentStatusColor(status: string): string {
  switch (status) {
    case 'paid':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'overdue':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}