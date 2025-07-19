import { Button } from '../../../../components/ui/button';
import { Clock, DollarSign, Trash2 } from 'lucide-react';
import { LeaguePayment } from './types';

interface LeaguePaymentsSectionProps {
  leaguePayments: LeaguePayment[];
  unregisteringPayment: number | null;
  onUnregister: (paymentId: number, leagueName: string) => void;
}

export function LeaguePaymentsSection({
  leaguePayments,
  unregisteringPayment,
  onUnregister
}: LeaguePaymentsSectionProps) {
  if (leaguePayments.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-blue-800">League Registrations</h3>
            <p className="text-sm text-blue-700 mt-1">
              You have {leaguePayments.length} active league registration{leaguePayments.length !== 1 ? 's' : ''}. 
              You can delete registrations here if needed.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {leaguePayments.map(payment => (
          <div key={payment.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-medium text-[#6F6F6F]">{payment.league_name}</h4>
                <div className="flex items-center gap-4 text-sm text-[#6F6F6F] mt-1">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>Due: {new Date(payment.due_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    <span>${payment.amount_paid.toFixed(2)} / ${(payment.amount_due * 1.13).toFixed(2)}</span>
                  </div>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    payment.status === 'paid' ? 'bg-green-100 text-green-800' :
                    payment.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                    payment.status === 'overdue' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                  </span>
                </div>
              </div>
              
              <Button
                onClick={() => onUnregister(payment.id, payment.league_name)}
                disabled={unregisteringPayment === payment.id}
                className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 text-sm transition-colors flex items-center gap-1"
              >
                {unregisteringPayment === payment.id ? (
                  'Removing...'
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete Registration
                  </>
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}