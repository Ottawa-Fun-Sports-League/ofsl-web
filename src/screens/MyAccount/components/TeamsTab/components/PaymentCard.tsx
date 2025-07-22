import { Button } from '../../../../../components/ui/button';
import { PaymentStatusBadge } from '../../../../../components/ui/payment-status-badge';
import { Clock, Trash2 } from 'lucide-react';
import { LeaguePayment } from '../../../../../lib/payments';

interface PaymentCardProps {
  payment: LeaguePayment;
  onUnregister: (paymentId: number, leagueName: string) => Promise<void>;
  unregisteringPayment: number | null;
}

export function PaymentCard({ payment, onUnregister, unregisteringPayment }: PaymentCardProps) {

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h4 className="font-medium text-[#6F6F6F]">{payment.league_name}</h4>
          {payment.team_name && (
            <p className="text-sm text-[#6F6F6F]">Team: {payment.team_name}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-sm text-[#6F6F6F]">
            <span>Due: ${payment.amount_due.toFixed(2)}</span>
            <span>Paid: ${payment.amount_paid.toFixed(2)}</span>
            {payment.amount_outstanding > 0 && (
              <span className="text-orange-600 font-medium">
                Outstanding: ${payment.amount_outstanding.toFixed(2)}
              </span>
            )}
          </div>
          {payment.due_date && (
            <div className="flex items-center gap-1 mt-1 text-sm text-[#6F6F6F]">
              <Clock className="h-3 w-3" />
              <span>Due: {new Date(payment.due_date).toLocaleDateString()}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <PaymentStatusBadge 
            status={payment.status as any} 
            size="sm"
          />
          
          <Button
            onClick={() => onUnregister(payment.id, payment.league_name)}
            disabled={unregisteringPayment === payment.id}
            className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 text-sm transition-colors flex items-center gap-1"
          >
            {unregisteringPayment === payment.id ? (
              'Unregistering...'
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}