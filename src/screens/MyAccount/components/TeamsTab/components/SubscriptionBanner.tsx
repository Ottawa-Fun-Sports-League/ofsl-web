import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { getStripeProductByPriceId } from '../../../../../lib/stripe';

interface SubscriptionBannerProps {
  subscription: {
    price_id?: string;
    subscription_status?: string;
  } | null;
}

export function SubscriptionBanner({ subscription }: SubscriptionBannerProps) {
  const [product, setProduct] = useState<{ name?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (subscription?.price_id) {
      setLoading(true);
      getStripeProductByPriceId(subscription.price_id)
        .then(setProduct)
        .finally(() => setLoading(false));
    }
  }, [subscription?.price_id]);

  if (!subscription) return null;
  
  const isActive = subscription.subscription_status === 'active';
  
  return (
    <div className={`rounded-lg p-4 mb-6 ${
      isActive 
        ? 'bg-green-50 border border-green-200' 
        : 'bg-orange-50 border border-orange-200'
    }`}>
      <div className="flex items-center gap-2">
        {isActive ? (
          <CheckCircle className="h-5 w-5 text-green-600" />
        ) : (
          <AlertCircle className="h-5 w-5 text-orange-600" />
        )}
        <div>
          <p className={`font-medium ${
            isActive ? 'text-green-800' : 'text-orange-800'
          }`}>
            {isActive ? 'Active Subscription' : 'Subscription Status'}
          </p>
          <p className={`text-sm ${
            isActive ? 'text-green-700' : 'text-orange-700'
          }`}>
            {loading ? 'Loading...' : (product?.name || 'Unknown Product')} - {subscription.subscription_status}
          </p>
        </div>
      </div>
    </div>
  );
}