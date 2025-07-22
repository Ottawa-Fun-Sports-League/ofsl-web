import { CheckCircle, Clock, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export type PaymentStatus = 'paid' | 'partial' | 'pending' | 'overdue';

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function PaymentStatusBadge({ 
  status, 
  className,
  size = 'md',
  showIcon = true 
}: PaymentStatusBadgeProps) {
  const getStatusConfig = (status: PaymentStatus) => {
    switch (status) {
      case 'paid':
        return {
          label: 'Paid',
          icon: CheckCircle,
          className: 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-emerald-100'
        };
      case 'partial':
        return {
          label: 'Partial',
          icon: AlertTriangle,
          className: 'bg-amber-50 text-amber-700 border-amber-200 shadow-amber-100'
        };
      case 'overdue':
        return {
          label: 'Overdue',
          icon: XCircle,
          className: 'bg-red-50 text-red-700 border-red-200 shadow-red-100'
        };
      default: // pending
        return {
          label: 'Pending',
          icon: Clock,
          className: 'bg-rose-50 text-rose-700 border-rose-200 shadow-rose-100'
        };
    }
  };

  const getSizeClasses = (size: 'sm' | 'md' | 'lg') => {
    switch (size) {
      case 'sm':
        return 'px-2 py-0.5 text-xs gap-1';
      case 'lg':
        return 'px-4 py-2 text-base gap-2';
      default: // md
        return 'px-3 py-1 text-sm gap-1.5';
    }
  };

  const getIconSize = (size: 'sm' | 'md' | 'lg') => {
    switch (size) {
      case 'sm':
        return 'h-3 w-3';
      case 'lg':
        return 'h-5 w-5';
      default: // md
        return 'h-4 w-4';
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border shadow-sm transition-all duration-200 whitespace-nowrap',
        getSizeClasses(size),
        config.className,
        className
      )}
    >
      {showIcon && <Icon className={getIconSize(size)} />}
      {config.label}
    </span>
  );
}