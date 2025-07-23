import { useState } from 'react';
import { Button } from './ui/button';
import { createCheckoutSession, getStripeProductByLeagueId, getStripeProductByPriceId } from '../lib/stripe';
import { logger } from '../lib/logger';
import { useToast } from './ui/toast';
import { CreditCard, Loader2 } from 'lucide-react';
import { formatPrice } from '../stripe-config';

interface PaymentButtonProps {
  priceId: string;
  productName: string;
  mode: 'payment' | 'subscription';
  metadata?: Record<string, string>;
  className?: string;
  children?: React.ReactNode;
  variant?: 'default' | 'outline' | 'secondary';
  price?: number;
  icon?: React.ReactNode;
}

export function PaymentButton({ 
  priceId, 
  productName, 
  mode, 
  metadata = {},
  className,
  children,
  price,
  variant = 'default',
  icon = <CreditCard className="h-4 w-4 mr-2" />
}: PaymentButtonProps) {
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handlePayment = async () => {
    try {
      setLoading(true);
      
      // If metadata contains leagueId, get the product from the database
      let productPrice = price;
      if (metadata?.leagueId && !productPrice) {
        const leagueId = parseInt(metadata.leagueId);
        const product = await getStripeProductByLeagueId(leagueId);
        if (product) {
          productPrice = product.price;
        }
      }
      
      // If we don't have a product name or price, try to fetch it from the database
      if (!productName || !price) {
        const product = await getStripeProductByPriceId(priceId);
        if (product) {
          productName = product.name;
          productPrice = product.price;
        }
      }
      
      const { url } = await createCheckoutSession({
        priceId,
        mode,
        metadata,
        successUrl: `${window.location.origin}/success?product=${encodeURIComponent(productName)}&price=${productPrice || 0}`,
        cancelUrl: window.location.href
      });

      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error) {
      logger.error('Payment error', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start payment process';
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handlePayment}
      disabled={loading}
      variant={variant}
      className={className}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          {mode === 'subscription' ? 'Subscribe' : 'Purchase'} {productName} {price ? `- ${formatPrice(price)}` : ''}
        </>
      ) : (
        children || (
          <div className="flex items-center">
            <span className="mr-2">{icon}</span>
            <span>{mode === 'subscription' ? 'Subscribe' : 'Purchase'} - {productName}</span>
          </div>
        )
      )}
    </Button>
  );
}