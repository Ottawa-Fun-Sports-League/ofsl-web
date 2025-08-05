import { Turnstile as TurnstileWidget } from '@marsidev/react-turnstile';
import { useEffect, useState } from 'react';

interface TurnstileProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  className?: string;
}

export function Turnstile({ onVerify, onError, onExpire, className }: TurnstileProps) {
  const [key, setKey] = useState(0);
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

  // Reset widget when component mounts or when we need to refresh
  const reset = () => {
    setKey(prev => prev + 1);
  };

  useEffect(() => {
    // Reset on mount
    return () => {
      // Cleanup if needed
    };
  }, []);

  if (!siteKey) {
    return null;
  }

  return (
    <div className={className}>
      <TurnstileWidget
        key={key}
        siteKey={siteKey}
        onSuccess={onVerify}
        onError={() => {
          onError?.();
          // Auto-retry after error
          setTimeout(reset, 1000);
        }}
        onExpire={() => {
          onExpire?.();
          reset();
        }}
        options={{
          theme: 'light',
          size: 'normal',
        }}
      />
    </div>
  );
}