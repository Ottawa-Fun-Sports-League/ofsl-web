import { useState } from 'react';
import { Button } from '../../../../../components/ui/button';
import { UserCheck, Loader2, Check } from 'lucide-react';
import { useToast } from '../../../../../components/ui/toast';
import { supabase } from '../../../../../lib/supabase';

interface ImpersonateButtonProps {
  userEmail: string;
  userName?: string | null;
}

export function ImpersonateButton({ userEmail, userName }: ImpersonateButtonProps) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  const generateImpersonationLink = async (event: React.MouseEvent<HTMLButtonElement>) => {
    setLoading(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw new Error(`Session error: ${sessionError.message}`);
      if (!session?.access_token) throw new Error('No active session. Please log out and log back in.');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/admin-impersonate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({ email: userEmail }),
      });

      if (!response.ok) {
        const txt = await response.text();
        try {
          const j = JSON.parse(txt);
          throw new Error(j.error || 'Failed to generate impersonation link');
        } catch {
          throw new Error(txt || 'Failed to generate impersonation link');
        }
      }

      const data = await response.json();
      if (!data.success || (!data.link && !data.action_link)) throw new Error(data.error || 'Failed to generate impersonation link');

      // Prefer client-handled link; normalize for HashRouter in case backend isn't redeployed yet
      const raw = (data.link || data.action_link) as string;
      const needsHash = raw.includes('/auth-redirect') && !raw.includes('/#/auth-redirect');
      const normalizedLink = needsHash ? raw.replace('/auth-redirect', '/#/auth-redirect') : raw;

      const displayName = userName || userEmail;
      if (event.metaKey || event.ctrlKey) {
        window.open(normalizedLink, '_blank');
        showToast(`Opened admin masquerade link. Use a private/incognito window to sign in as ${displayName}.`, 'success');
      } else {
        await navigator.clipboard.writeText(normalizedLink);
        setCopied(true);
        showToast(`Masquerade link copied! Open in private/incognito to sign in as ${displayName}.`, 'success');
        setTimeout(() => setCopied(false), 3000);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate impersonation link';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={generateImpersonationLink}
      disabled={loading}
      size="sm"
      variant={copied ? "secondary" : "outline"}
      className="h-8 w-8 p-0"
      title={copied ? "Masquerade link copied!" : "Generate admin masquerade link (Cmd/Ctrl+Click to open)"}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : copied ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : (
        <UserCheck className="h-4 w-4" />
      )}
    </Button>
  );
}
