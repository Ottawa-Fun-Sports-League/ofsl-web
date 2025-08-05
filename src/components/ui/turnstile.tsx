import { Turnstile } from '@marsidev/react-turnstile';
import { forwardRef, useImperativeHandle, useRef, memo } from 'react';

interface TurnstileProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  className?: string;
}

export interface TurnstileHandle {
  reset: () => void;
}

const TurnstileWidgetComponent = forwardRef<TurnstileHandle, TurnstileProps>(
  ({ onVerify, onError, onExpire, className }, ref) => {
    const widgetRef = useRef<any>(null);
    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

    useImperativeHandle(ref, () => ({
      reset: () => {
        if (widgetRef.current?.reset) {
          widgetRef.current.reset();
        }
      }
    }));

    if (!siteKey || siteKey === 'undefined') {
      return null;
    }

    return (
      <div 
        className={className} 
        style={{ 
          minHeight: '70px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Turnstile
          ref={widgetRef}
          siteKey={siteKey}
          onSuccess={onVerify}
          onError={onError}
          onExpire={onExpire}
          options={{
            theme: 'light',
            size: 'normal',
          }}
        />
      </div>
    );
  }
);

TurnstileWidgetComponent.displayName = 'TurnstileWidget';

// Memoize the component to prevent re-renders when parent state changes
export const TurnstileWidget = memo(TurnstileWidgetComponent);