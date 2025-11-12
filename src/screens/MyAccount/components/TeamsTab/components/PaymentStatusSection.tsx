import { AlertCircle, Calendar, CheckCircle, DollarSign } from 'lucide-react';
import { cn } from '../../../../../lib/utils';
import { PaymentStatusBadge } from '../../../../../components/ui/payment-status-badge';

interface PaymentStatusSectionProps {
  payment?: {
    id: number;
    amount_due: number;
    amount_paid: number;
    status: string;
    due_date?: string | null;
    created_at?: string | null;
  };
  leagueCost?: number | null;
  leagueDueDate?: string | null;
  paymentWindowHours?: number | null;
  registrationTimestamp?: string | null;
  isCaptain: boolean;
}

interface DeadlineInfo {
  formattedDate: string;
  hoursUntilDue: number;
  isOverdue: boolean;
  isUrgent: boolean;
  source: 'relative' | 'absolute';
}

const hoursLabel = (value: number) => `${value} ${value === 1 ? 'hour' : 'hours'}`;

export function PaymentStatusSection({
  payment,
  leagueCost,
  leagueDueDate,
  paymentWindowHours,
  registrationTimestamp,
  isCaptain,
}: PaymentStatusSectionProps) {
  const totalDue = payment ? payment.amount_due * 1.13 : (leagueCost ? leagueCost * 1.13 : 0);
  const amountPaid = payment?.amount_paid || 0;
  const remainingBalance = Math.max(0, totalDue - amountPaid);
  const progressPercentage = totalDue > 0 ? (amountPaid / totalDue) * 100 : 0;
  const paymentWindowHoursText = paymentWindowHours ? hoursLabel(paymentWindowHours) : null;
  const registrationTime = registrationTimestamp ?? payment?.created_at ?? null;

  const computeDeadlineInfo = (): DeadlineInfo | null => {
    const buildInfo = (deadline: Date, source: 'relative' | 'absolute'): DeadlineInfo => {
      const now = new Date();
      const diffHoursRaw = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
      const hoursUntilDue = diffHoursRaw >= 0 ? Math.ceil(diffHoursRaw) : Math.floor(diffHoursRaw);

      return {
        formattedDate: deadline.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }),
        hoursUntilDue,
        isOverdue: hoursUntilDue < 0,
        isUrgent: hoursUntilDue >= 0 && hoursUntilDue <= 7 * 24,
        source,
      };
    };

    if (paymentWindowHours && registrationTime) {
      const base = new Date(registrationTime);
      if (!Number.isNaN(base.getTime())) {
        const relativeDeadline = new Date(base.getTime() + paymentWindowHours * 60 * 60 * 1000);
        return buildInfo(relativeDeadline, 'relative');
      }
    }

    const rawDue = leagueDueDate || payment?.due_date || null;
    if (rawDue) {
      const absoluteDeadline = rawDue.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)
        ? new Date(`${rawDue}T23:59:59`)
        : new Date(rawDue);

      if (!Number.isNaN(absoluteDeadline.getTime())) {
        return buildInfo(absoluteDeadline, 'absolute');
      }
    }

    return null;
  };

  const deadlineInfo = computeDeadlineInfo();
  const isPaid = payment?.status === 'paid';
  const isOverdue = payment?.status === 'overdue' || (deadlineInfo?.isOverdue ?? false);

  const deadlineDescription = () => {
    if (deadlineInfo) {
      const hours = deadlineInfo.hoursUntilDue;
      const suffix =
        hours < 0
          ? ` (${hoursLabel(Math.abs(hours))} overdue)`
          : hours === 0
            ? ' (due now)'
            : ` (${hoursLabel(hours)} remaining)`;
      return `Due ${deadlineInfo.formattedDate}${suffix}`;
    }

    return paymentWindowHoursText ? `Payment window: ${paymentWindowHoursText} to pay.` : null;
  };

  if (!isCaptain) {
    if (isPaid || remainingBalance <= 0) return null;

    return (
      <div className="mt-4 flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <AlertCircle className="h-5 w-5 text-amber-600" />
        <div className="flex flex-col">
          <span className="text-sm font-medium text-amber-700">
            Your team fee hasn&apos;t been fully paid yet. Please check with your captain.
          </span>
          {paymentWindowHoursText && (
            <span className="text-xs text-amber-700/80">
              Payment window: {paymentWindowHoursText} to pay.
            </span>
          )}
        </div>
      </div>
    );
  }

  if (!totalDue || totalDue === 0) {
    return null;
  }

  const showEnhancedSection =
    !isPaid && deadlineInfo && (deadlineInfo.isUrgent || deadlineInfo.hoursUntilDue <= 24);

  if (!showEnhancedSection) {
    if (isPaid) {
      return (
        <>
          <div className="mt-4 flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">
              Fully paid - Thank you!
            </span>
          </div>
          {!deadlineInfo && paymentWindowHoursText && (
            <p className="text-xs text-gray-500 mt-2">
              Payment window: {paymentWindowHoursText} to pay.
            </p>
          )}
        </>
      );
    }

    if (remainingBalance > 0) {
      return (
        <>
          <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  Balance: ${remainingBalance.toFixed(2)}
                </span>
              </div>
              {deadlineDescription() && (
                <span className="text-sm text-gray-600">{deadlineDescription()}</span>
              )}
            </div>
          </div>
          {!deadlineInfo && paymentWindowHoursText && (
            <p className="text-xs text-gray-500 mt-2">
              Payment window: {paymentWindowHoursText} to pay.
            </p>
          )}
        </>
      );
    }

    return null;
  }

  return (
    <div
      className={cn(
        'mt-4 p-4 rounded-lg border-2',
        isPaid
          ? 'bg-emerald-50 border-emerald-200'
          : isOverdue
            ? 'bg-red-50 border-red-300'
            : 'bg-amber-50 border-amber-200',
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <DollarSign
            className={cn(
              'h-5 w-5',
              isPaid ? 'text-emerald-600' : isOverdue ? 'text-red-600' : 'text-amber-600',
            )}
          />
          <h4 className="font-semibold text-gray-900">Payment Status</h4>
        </div>
        <PaymentStatusBadge
          status={(payment?.status || 'pending') as 'paid' | 'partial' | 'pending' | 'overdue'}
          size="md"
        />
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-600 mb-1">Total Due</p>
            <p className="font-bold text-lg text-gray-900">${totalDue.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-gray-600 mb-1">Paid</p>
            <p className="font-bold text-lg text-emerald-600">${amountPaid.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-gray-600 mb-1">Balance</p>
            <p className={cn(
              'font-bold text-lg',
              remainingBalance > 0 ? 'text-red-600' : 'text-emerald-600',
            )}>
              ${remainingBalance.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="w-full">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Progress</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                isPaid
                  ? 'bg-emerald-500'
                  : isOverdue
                    ? 'bg-red-500'
                    : progressPercentage > 50
                      ? 'bg-amber-500'
                      : 'bg-amber-400',
              )}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {deadlineDescription() && !isPaid && (
          <div
            className={cn(
              'flex items-center gap-2 p-2 rounded-md',
              isOverdue ? 'bg-red-100' : deadlineInfo?.isUrgent ? 'bg-amber-100' : 'bg-blue-50',
            )}
          >
            <Calendar
              className={cn(
                'h-4 w-4',
                isOverdue
                  ? 'text-red-600'
                  : deadlineInfo?.isUrgent
                    ? 'text-amber-600'
                    : 'text-blue-600',
              )}
            />
            <span
              className={cn(
                'text-sm font-medium',
                isOverdue
                  ? 'text-red-700'
                  : deadlineInfo?.isUrgent
                    ? 'text-amber-700'
                    : 'text-blue-900',
              )}
            >
              {deadlineDescription()}
            </span>
          </div>
        )}

        {isPaid && (
          <div className="flex items-center gap-2 p-2 bg-emerald-100 rounded-md">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">
              Fully paid - Thank you!
            </span>
          </div>
        )}

        {isCaptain && remainingBalance > 0 && (
          <p className="text-xs text-gray-600 italic">
            As team captain, you are responsible for collecting and submitting the full team payment.
          </p>
        )}
      </div>
    </div>
  );
}
