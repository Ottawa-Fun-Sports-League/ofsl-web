import { Button } from '../../../components/ui/button';
import { CheckCircle, X } from 'lucide-react';
import { formatLocalDate } from '../../../lib/dateUtils';

interface RegistrationSuccessModalProps {
  showModal: boolean;
  closeModal: () => void;
  teamName: string;
  leagueName: string;
  leagueCost: number | null;
  depositAmount?: number | null;
  depositDate?: string | null;
}

export function RegistrationSuccessModal({
  showModal,
  closeModal,
  teamName,
  leagueName,
  leagueCost,
  depositAmount,
  depositDate
}: RegistrationSuccessModalProps) {
  if (!showModal) return null;

  // Calculate HST (13%) and total amount
  const baseAmount = leagueCost || 0;
  const hstAmount = baseAmount * 0.13;
  const totalAmount = baseAmount + hstAmount;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-[#6F6F6F]">Registration Successful</h2>
            <button 
              onClick={closeModal}
              className="text-gray-500 hover:text-gray-700 bg-transparent hover:bg-gray-100 rounded-full p-2 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <div className="flex items-center gap-3 mb-6">
            <CheckCircle className="h-10 w-10 text-green-500 flex-shrink-0" />
            <div>
              <p className="text-[#6F6F6F] text-lg font-medium">
                Your team &ldquo;{teamName}&rdquo; has been successfully registered for {leagueName}!
              </p>
            </div>
          </div>
          
          {/* Only show payment information if there's a deposit requirement */}
          {depositAmount && depositDate && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <h3 className="text-amber-800 font-medium mb-2">Deposit Required</h3>
              <p className="text-amber-700 text-sm mb-3">
                To fully secure your spot in this league, a non-refundable deposit of ${depositAmount.toFixed(2)} is required by {formatLocalDate(depositDate, {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}.
              </p>
              {leagueCost && leagueCost > 0 && (
                <p className="text-amber-700 text-sm">
                  Full payment of ${totalAmount.toFixed(2)} (${baseAmount.toFixed(2)} + ${hstAmount.toFixed(2)} HST) will be due before the season starts.
                </p>
              )}
            </div>
          )}
          
          {/* Show payment instructions only if there's a deposit requirement */}
          {depositAmount && depositDate ? (
            <div className="text-sm text-[#6F6F6F] mb-6">
              <p>Please send your deposit via:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>E-transfer to <span className="font-medium text-[#B20000]">ofslpayments@gmail.com</span></li>
                <li>Include your team name in the e-transfer message</li>
              </ul>
            </div>
          ) : (
            !leagueCost || leagueCost === 0 ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-green-800 text-sm">
                  ✅ Your registration is complete! No payment is required for this league.
                </p>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-green-800 text-sm">
                  ✅ Your registration is complete! You can view and manage your team in the &ldquo;My Teams&rdquo; section.
                </p>
              </div>
            )
          )}
          
          <div className="flex justify-end">
            <Button
              onClick={closeModal}
              className="bg-[#B20000] hover:bg-[#8A0000] text-white rounded-[10px] px-6 py-2"
            >
              Go to My Teams
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}