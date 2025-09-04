import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { LoadingSpinner } from '../../components/ui/loading-spinner';

function parseHashParams(hash: string): Record<string, string> {
  const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
  const obj: Record<string, string> = {};
  params.forEach((v, k) => { obj[k] = v; });
  return obj;
}

export function AuthRedirectPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        // Try to parse tokens from hash or query
        const hashParams = parseHashParams(location.hash || '');
        const queryParams = new URLSearchParams(location.search);

        const access_token = hashParams['access_token'] || queryParams.get('access_token') || '';
        const refresh_token = hashParams['refresh_token'] || queryParams.get('refresh_token') || '';

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;
          // Decide where to go next
          const page = queryParams.get('page');
          if (page === 'admin-masquerade') {
            navigate('/my-account/teams', { replace: true });
          } else {
            navigate('/', { replace: true });
          }
          return;
        }

        // No tokens present; show guidance
        setError('No session tokens found in redirect. Please ensure you used the magic login link.');
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unexpected error during auth redirect';
        setError(msg);
      }
    };
    run();
  }, [location.hash, location.search, navigate]);

  return (
    <div className="bg-white min-h-[50vh] w-full flex items-center justify-center">
      <div className="max-w-md mx-auto text-center p-6">
        {!error ? (
          <>
            <LoadingSpinner />
            <p className="text-sm text-gray-600 mt-3">Finalizing sign-in…</p>
          </>
        ) : (
          <>
            <p className="text-red-600 font-medium mb-2">Authentication Link Issue</p>
            <p className="text-sm text-gray-700 mb-4">{error}</p>
            <p className="text-sm text-gray-600">Try the link again, or contact an administrator.</p>
          </>
        )}
      </div>
    </div>
  );
}

