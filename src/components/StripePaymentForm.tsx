import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { Button } from './ui/button';
import { Loader2, CreditCard, CheckCircle } from 'lucide-react';
import { useToast } from './ui/toast';
import { logger } from '../lib/logger';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface StripePaymentFormProps {
  clientSecret: string;
  amount: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// The form that collects payment details
function CheckoutForm({ amount, onSuccess, onCancel }: { 
  amount: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/success?payment=true`,
        },
        redirect: 'if_required',
      });

      if (error) {
        showToast(error.message || 'Payment failed', 'error');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        setIsCompleted(true);
        showToast('Payment successful!', 'success');
        if (onSuccess) {
          setTimeout(() => {
            onSuccess();
          }, 1500);
        }
      } else {
        // Handle other statuses or redirect the customer
        showToast('Payment processing. Please wait...', 'info');
      }
    } catch (error) {
      logger.error('Payment error', error);
      const errorMessage = error instanceof Error ? error.message : 'Payment failed';
      showToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {isCompleted ? (
        <div className="text-center py-6">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-800 mb-2">Payment Successful!</h3>
          <p className="text-gray-600">Your payment has been processed successfully.</p>
        </div>
      ) : (
        <>
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <p className="text-sm text-gray-700 font-medium">Amount to pay</p>
            <p className="text-2xl font-bold text-gray-900">${amount.toFixed(2)}</p>
          </div>

          <PaymentElement />

          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={!stripe || isLoading}
              className="flex-1 border-[#B20000] bg-white hover:bg-[#B20000] text-[#B20000] hover:text-white rounded-[10px] px-6 py-2"
              variant="outline"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pay ${amount.toFixed(2)}
                </>
              )}
            </Button>
            {onCancel && (
              <Button
                type="button"
                onClick={onCancel}
                disabled={isLoading}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white rounded-[10px] px-6 py-2"
              >
                Cancel
              </Button>
            )}
          </div>
        </>
      )}
    </form>
  );
}

// The wrapper component that initializes Stripe
export function StripePaymentForm({ clientSecret, amount, onSuccess, onCancel }: StripePaymentFormProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (clientSecret) {
      setIsReady(true);
    }
  }, [clientSecret]);

  if (!isReady) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#B20000]" />
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CheckoutForm amount={amount} onSuccess={onSuccess} onCancel={onCancel} />
    </Elements>
  );
}