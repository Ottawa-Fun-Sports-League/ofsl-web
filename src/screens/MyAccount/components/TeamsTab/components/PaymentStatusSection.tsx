import { AlertCircle, Calendar, CheckCircle, DollarSign } from 'lucide-react';
import { cn } from '../../../../../lib/utils';
import { PaymentStatusBadge } from '../../../../../components/ui/payment-status-badge';
import { calculatePaymentStatus } from '../../../../../components/payments/utils';

interface PaymentStatusSectionProps {
  payment?: {
    id: number;
    amount_due: number;
    amount_paid: number;
    status: string;
    due_date?: string;
  };
  leagueCost?: number | null;
  isCaptain: boolean;
}

export function PaymentStatusSection({ payment, leagueCost, isCaptain }: PaymentStatusSectionProps) {
  // Calculate amounts
  const totalDue = payment ? payment.amount_due * 1.13 : (leagueCost ? leagueCost * 1.13 : 0);
  const amountPaid = payment?.amount_paid || 0;
  const remainingBalance = Math.max(0, totalDue - amountPaid);
  const progressPercentage = totalDue > 0 ? (amountPaid / totalDue) * 100 : 0;
  
  // Format due date
  const formatDueDate = (dateString?: string) => {
    if (!dateString) return null;
    
    let date: Date;
    // Check if it's a date-only string (YYYY-MM-DD) or includes time
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Date-only string - parse as local date to prevent timezone shift
      date = new Date(dateString + 'T00:00:00');
    } else {
      // Full ISO string or other format - parse normally
      date = new Date(dateString);
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to start of day for accurate comparison
    const daysUntilDue = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    const formattedDate = date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
    
    if (daysUntilDue < 0) {
      return { text: `Overdue since ${formattedDate}`, isOverdue: true, daysUntilDue };
    } else if (daysUntilDue <= 7) {
      return { text: `Due in ${daysUntilDue} days`, isUrgent: true, daysUntilDue };
    }
    return { text: `Due ${formattedDate}`, isOverdue: false, daysUntilDue };
  };
  
  const dueDate = formatDueDate(payment?.due_date);
  
  // Calculate correct payment status including HST
  const actualStatus = payment 
    ? calculatePaymentStatus(payment.amount_due, payment.amount_paid, payment.due_date)
    : 'pending';
  
  const isPaid = actualStatus === 'paid';
  const isOverdue = actualStatus === 'overdue' || (dueDate?.isOverdue ?? false);
  
  // Don't show payment section if there's no cost or if payment is fully paid
  if (!totalDue || totalDue === 0 || isPaid) {
    return null;
  }
  
  // Check if we should show the enhanced section
  const showEnhancedSection = isCaptain && 
    !isPaid && 
    dueDate && 
    dueDate.daysUntilDue <= 7;
  
  // If not showing enhanced section, show simple payment status
  if (!showEnhancedSection) {
    if (isPaid) {
      return (
        <div className="mt-4 flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <CheckCircle className="h-5 w-5 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-700">
            Fully paid - Thank you!
          </span>
        </div>
      );
    }
    
    if (remainingBalance > 0) {
      return (
        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">
                Balance: ${remainingBalance.toFixed(2)}
              </span>
            </div>
            {dueDate && (
              <span className="text-sm text-gray-600">
                {dueDate.text}
              </span>
            )}
          </div>
        </div>
      );
    }
    
    return null;
  }
  
  return (
    <div className={cn(
      "mt-4 p-4 rounded-lg border",
      isPaid ? "bg-emerald-50/30 border-emerald-300" : 
      isOverdue ? "bg-red-50/30 border-red-300" : 
      "bg-amber-50/30 border-amber-300"
    )}>
      {/* Desktop: Header with status on left and fees on right */}
      <div className="hidden md:flex items-center justify-between mb-3">
        {/* Left side: Payment Status and badge */}
        <div className="flex items-center gap-2.5">
          <DollarSign className={cn(
            "h-4 w-4 flex-shrink-0",
            isPaid ? "text-emerald-600" : 
            isOverdue ? "text-red-600" : 
            "text-amber-600"
          )} />
          <span className="text-sm font-medium text-gray-900">Payment Status</span>
          <PaymentStatusBadge 
            status={actualStatus} 
            size="sm"
          />
        </div>
        
        {/* Right side: All fees information */}
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-600">
            League fees: <span className="font-bold text-gray-900">${totalDue.toFixed(2)} (${payment?.amount_due.toFixed(2)} + HST)</span>
          </span>
          <span className="text-gray-600">
            Paid: <span className="font-bold text-emerald-600">${amountPaid.toFixed(2)}</span>
          </span>
          <span className="text-gray-600">
            Balance: <span className={cn(
              "font-bold",
              remainingBalance > 0 ? "text-red-600" : "text-emerald-600"
            )}>${remainingBalance.toFixed(2)}</span>
          </span>
        </div>
      </div>

      {/* Mobile: Stacked layout */}
      <div className="md:hidden mb-3">
        {/* Row 1: Payment Status and badge */}
        <div className="flex items-center gap-2.5 mb-2">
          <DollarSign className={cn(
            "h-4 w-4 flex-shrink-0",
            isPaid ? "text-emerald-600" : 
            isOverdue ? "text-red-600" : 
            "text-amber-600"
          )} />
          <span className="text-sm font-medium text-gray-900">Payment Status</span>
          <PaymentStatusBadge 
            status={actualStatus} 
            size="sm"
          />
        </div>
        
        {/* Row 2: League fees */}
        <div className="text-sm mb-1">
          <span className="text-gray-600">
            League fees: <span className="font-bold text-gray-900">${totalDue.toFixed(2)} (${payment?.amount_due.toFixed(2)} + HST)</span>
          </span>
        </div>
        
        {/* Row 3: Paid and Balance on same line */}
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-600">
            Paid: <span className="font-bold text-emerald-600">${amountPaid.toFixed(2)}</span>
          </span>
          <span className="text-gray-600">
            Balance: <span className={cn(
              "font-bold",
              remainingBalance > 0 ? "text-red-600" : "text-emerald-600"
            )}>${remainingBalance.toFixed(2)}</span>
          </span>
        </div>
      </div>
      
      {/* Progress bar with percentage */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-600">Progress</span>
          <span className="text-xs text-gray-600 font-medium">{Math.round(progressPercentage)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full transition-all duration-300",
              isPaid ? "bg-emerald-500" : 
              isOverdue ? "bg-red-500" : 
              progressPercentage > 50 ? "bg-amber-500" : 
              "bg-amber-400"
            )}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
      
      {/* Due date and captain reminder section */}
      {dueDate && !isPaid && (
        <div className={cn(
          "p-2 rounded-md mb-2",
          isOverdue ? "bg-red-100/40" : 
          dueDate.isUrgent ? "bg-amber-100/40" : 
          ""
        )}>
          <div className="flex items-center justify-between">
            {/* Left side: Due date */}
            <div className="flex items-center gap-2">
              {isOverdue ? (
                <AlertCircle className="h-4 w-4 text-red-600" />
              ) : dueDate.isUrgent ? (
                <Calendar className="h-4 w-4 text-amber-600" />
              ) : (
                <Calendar className="h-4 w-4 text-gray-600" />
              )}
              <span className={cn(
                "text-sm font-medium",
                isOverdue ? "text-red-700" : 
                dueDate.isUrgent ? "text-amber-700" : 
                "text-gray-900"
              )}>
                {dueDate.text}
              </span>
            </div>
            
            {/* Right side: Captain responsibility */}
            {isCaptain && remainingBalance > 0 && (
              <p className="text-xs text-gray-600 italic">
                As team captain, you are responsible for collecting and submitting the full team payment.
              </p>
            )}
          </div>
        </div>
      )}
      
      {/* Success message for paid teams */}
      {isPaid && (
        <div className="flex items-center gap-2 p-2 bg-emerald-100/40 rounded-md mb-2">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-700">
            Fully paid - Thank you!
          </span>
        </div>
      )}
      
      {/* Captain-only reminder for cases without due date */}
      {isCaptain && remainingBalance > 0 && (!dueDate || isPaid) && (
        <p className="text-xs text-gray-600 italic">
          As team captain, you are responsible for collecting and submitting the full team payment.
        </p>
      )}
    </div>
  );
}