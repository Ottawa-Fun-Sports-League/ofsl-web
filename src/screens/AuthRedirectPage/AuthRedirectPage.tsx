import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { LoadingSpinner } from '../../components/ui/loading-spinner';

function parseHashParams(hash: string): Record<string, string> {
  // Supports both forms:
  // 1) '#access_token=...&refresh_token=...'
  // 2) '#/auth-redirect?token_hash=...&type=magiclink'
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  const query = raw.includes('?') ? raw.split('?')[1] : raw;
  const params = new URLSearchParams(query);
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

        const page = queryParams.get('page') || hashParams['page'];
        const code = queryParams.get('code') || hashParams['code'];
        const errorDescription = queryParams.get('error_description') || hashParams['error_description'];
        const tokenHash = queryParams.get('token_hash') || hashParams['token_hash'];

        // 1) Newer flow: code param → exchange for session
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          navigate(page === 'admin-masquerade' ? '/my-account/teams' : '/', { replace: true });
          return;
        }

        // 1b) Magic link token_hash flow (verifyOtp)
        if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({ type: 'magiclink', token_hash: tokenHash });
          if (error) throw error;
          navigate(page === 'admin-masquerade' ? '/my-account/teams' : '/', { replace: true });
          return;
        }

        // 2) Legacy flow: access_token + refresh_token in fragment/query
        const access_token = hashParams['access_token'] || queryParams.get('access_token') || '';
        const refresh_token = hashParams['refresh_token'] || queryParams.get('refresh_token') || '';
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;
          navigate(page === 'admin-masquerade' ? '/my-account/teams' : '/', { replace: true });
          return;
        }

        // 3) Error path sent from GoTrue
        if (errorDescription) {
          setError(decodeURIComponent(errorDescription));
          return;
        }

        // No tokens present; show guidance
        console.warn('⚠️  No access token found, redirecting without tokens');
        setError('No session tokens found in redirect. Please ensure you used the latest magic login link.');
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
