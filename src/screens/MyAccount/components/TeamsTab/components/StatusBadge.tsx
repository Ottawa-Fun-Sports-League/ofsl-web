import { PaymentStatusBadge, PaymentStatus } from '../../../../../components/ui/payment-status-badge';

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <PaymentStatusBadge 
      status={status as PaymentStatus} 
      size="sm"
    />
  );
}