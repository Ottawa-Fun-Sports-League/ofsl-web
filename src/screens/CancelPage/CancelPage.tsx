import { Link } from 'react-router-dom';
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/button';

export function CancelPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <XCircle data-testid="cancel-icon" className="h-16 w-16 text-orange-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[#6F6F6F] mb-2">Payment Cancelled</h1>
          <p className="text-[#6F6F6F]">
            Your payment was cancelled. No charges have been made to your account.
          </p>
        </div>

        {/* Information */}
        <div className="bg-orange-50 rounded-lg p-4 mb-6 text-left">
          <h3 className="font-medium text-orange-800 mb-2">What happened?</h3>
          <p className="text-sm text-orange-700">
            You cancelled the payment process before it was completed. 
            Your registration is still pending and no payment has been processed.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <div className="flex flex-col gap-3">
            <Button 
              onClick={() => window.history.back()}
              className="w-full bg-[#B20000] hover:bg-[#8A0000] text-white rounded-lg"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Payment Again
            </Button>
            
            <Link to="/leagues">
              <Button variant="outline" className="w-full border-[#B20000] text-[#B20000] hover:bg-[#B20000] hover:text-white rounded-lg">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Leagues
              </Button>
            </Link>
          </div>
        </div>

        {/* Help */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-[#6F6F6F] mb-2">Need help?</p>
          <p className="text-sm text-[#6F6F6F]">
            Contact us at{' '}
            <a href="mailto:payments@ofsl.ca" className="text-[#B20000] underline">
              payments@ofsl.ca
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
