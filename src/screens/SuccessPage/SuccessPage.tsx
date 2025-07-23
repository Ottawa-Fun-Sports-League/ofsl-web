import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, ArrowRight, CreditCard } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { getUserSubscription, getUserOrders } from '../../lib/stripe';
import { formatPrice } from '../../stripe-config';
import { logger } from '../../lib/logger';

interface StripeUserSubscription {
  customer_id: string;
  subscription_id: string;
  subscription_status: string;
  price_id: string;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  payment_method_brand: string | null;
  payment_method_last4: string | null;
}

interface StripeUserOrder {
  customer_id: string;
  order_id: number;
  checkout_session_id: string;
  payment_intent_id: string | null;
  amount_subtotal: number;
  amount_total: number;
  currency: string;
  payment_status: string;
  order_status: string;
  order_date: string;
}

export function SuccessPage() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<StripeUserSubscription | null>(null);
  const [recentOrder, setRecentOrder] = useState<StripeUserOrder | null>(null);
  const [paymentProcessed, setPaymentProcessed] = useState(false);
  
  const productName = searchParams.get('product') || 'Your purchase';
  const price = searchParams.get('price') ? parseFloat(searchParams.get('price')!) : null;

  useEffect(() => {
    const loadPaymentData = async () => {
      try {
        // Load both subscription and order data
        const [subscriptionData, ordersData] = await Promise.all([
          getUserSubscription(),
          getUserOrders()
        ]);

        setSubscription(subscriptionData);
        
        // Get the most recent order
        if (ordersData && ordersData.length > 0) {
          setRecentOrder(ordersData[0]);
        }
        setPaymentProcessed(true);
      } catch (error) {
        logger.error('Error loading payment data', error);
      } finally {
        setLoading(false);
      }
    };

    loadPaymentData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B20000]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[#6F6F6F] mb-2">{paymentProcessed ? "Payment Successful!" : "Registration Complete!"}</h1>
          <p className="text-[#6F6F6F]">
            Thank you for your purchase of <span className="font-medium">{productName}</span>
          </p>
        </div>

        {/* Payment Details */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
          <h3 className="font-medium text-[#6F6F6F] mb-3">Payment Details</h3>
          
          {recentOrder ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Amount:</span>
                <span className="font-medium">
                  {(recentOrder.amount_total / 100).toLocaleString('en-CA', {
                    style: 'currency',
                    currency: recentOrder.currency.toUpperCase()
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="font-medium text-green-600 capitalize">
                  {recentOrder.payment_status}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span className="font-medium">
                  {new Date(recentOrder.order_date).toLocaleDateString()}
                </span>
              </div>
            </div>
          ) : price ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Amount:</span>
                <span className="font-medium">
                  {formatPrice(price)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="font-medium text-green-600 capitalize">
                  paid
                </span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span className="font-medium">
                  {new Date().toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Payment Method:</span>
                <span className="font-medium flex items-center">
                  <CreditCard className="h-3 w-3 mr-1" /> Credit Card
                </span>
              </div>
            </div>
          ) : null}

          {subscription && subscription.subscription_status === 'active' && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subscription:</span>
                <span className="font-medium text-green-600">Active</span>
              </div>
              {subscription.current_period_end && (
                <div className="flex justify-between">
                  <span>Next billing:</span>
                  <span className="font-medium">
                    {new Date(subscription.current_period_end * 1000).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Next Steps */}
        <div className="space-y-3">
          <p className="text-sm text-[#6F6F6F] mb-4">
            A confirmation email has been sent to your registered email address.
          </p>
          
          <div className="flex flex-col gap-3">
            <Link to="/my-account/teams">
              <Button className="w-full bg-[#B20000] hover:bg-[#8A0000] text-white rounded-lg">
                View My Teams
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            
            <Link to="/leagues">
              <Button variant="outline" className="w-full border-[#B20000] text-[#B20000] hover:bg-[#B20000] hover:text-white rounded-lg">
                Browse More Leagues
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}