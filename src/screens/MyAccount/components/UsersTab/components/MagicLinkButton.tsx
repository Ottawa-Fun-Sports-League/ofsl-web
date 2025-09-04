import { useState } from 'react';
import { Button } from '../../../../../components/ui/button';
import { Link2, Loader2, Check } from 'lucide-react';
import { useToast } from '../../../../../components/ui/toast';
import { supabase } from '../../../../../lib/supabase';

interface MagicLinkButtonProps {
  userEmail: string;
  userName?: string | null;
}

export function MagicLinkButton({ userEmail, userName }: MagicLinkButtonProps) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  const generateMagicLink = async (event: React.MouseEvent<HTMLButtonElement>) => {
    setLoading(true);
    try {
      // Get the current session to send with the Edge Function
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw new Error(`Session error: ${sessionError.message}`);
      }
      
      if (!session) {
        console.error('No active session found');
        throw new Error('No active session. Please log out and log back in.');
      }
      
      if (!session.access_token) {
        console.error('Session exists but no access token');
        throw new Error('Invalid session - no access token. Please refresh the page and try again.');
      }
      

      // Call our admin Edge Function to generate a magic login link (without sending email)
      // Using fetch directly instead of supabase.functions.invoke to ensure headers work properly
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const response = await fetch(`${supabaseUrl}/functions/v1/admin-magic-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({ email: userEmail, sendEmail: false }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to generate magic link';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const error = !data.success ? new Error(data.error || 'Failed to generate magic link') : null;

      if (error) {
        console.error('Edge function error:', error);
        
        // Check for specific bearer token/auth errors and try to refresh session
        if (error.message?.includes('Bearer token') || 
            error.message?.includes('authorization') || 
            error.message?.includes('Invalid JWT') ||
            error.message?.includes('401')) {
          
          
          try {
            // Try to refresh the session
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            
            if (refreshError || !refreshData.session) {
              throw new Error('Session expired. Please log out and log back in.');
            }
            
            
            // Retry the request with refreshed token
            const retryResponse = await fetch(`${supabaseUrl}/functions/v1/admin-magic-link`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${refreshData.session.access_token}`,
                'apikey': supabaseAnonKey,
              },
              body: JSON.stringify({ email: userEmail, sendEmail: false }),
            });

            if (!retryResponse.ok) {
              const retryErrorText = await retryResponse.text();
              throw new Error(`Authentication failed after refresh: ${retryErrorText}`);
            }

            const retryData = await retryResponse.json();
            
            if (!retryData.success) {
              throw new Error(retryData.error || 'Failed to generate magic link after retry');
            }
            
            // Success after retry - use retryData instead of data for the rest of the function
            const data = retryData;
            
            // Handle the magic link (same code as below but duplicated here for retry case)
            if (data.link) {
              const displayName = userName || userEmail;
              
              if (event.metaKey || event.ctrlKey) {
                window.open(data.link, '_blank');
                showToast(
                  `Opening magic login link for ${displayName} in a new tab. Use a private window to avoid overwriting your session.`,
                  'success'
                );
              } else {
                await navigator.clipboard.writeText(data.link);
                setCopied(true);
                showToast(
                  `Magic login link copied! Open in a private window to masquerade as ${displayName}.`,
                  'success'
                );
              }
              
              setTimeout(() => {
                setCopied(false);
              }, 3000);
              
              return; // Exit early since we handled the success case
            }
            
          } catch (refreshAttemptError) {
            console.error('Session refresh attempt failed:', refreshAttemptError);
            throw new Error('Authentication failed. Please log out and log back in.');
          }
        } else {
          throw error;
        }
      }
      
      if (!data.success) throw new Error(data.error || 'Failed to generate magic link');

      // Handle the magic link
      if (data.link) {
        const displayName = userName || userEmail;
        if (event.metaKey || event.ctrlKey) {
          window.open(data.link, '_blank');
          showToast(`Opened magic login link. Use a private window to masquerade as ${displayName}.`, 'success');
        } else {
          await navigator.clipboard.writeText(data.link);
          setCopied(true);
          showToast(`Magic login link copied! Open in a private/incognito window to masquerade as ${displayName}.`, 'success');
          setTimeout(() => setCopied(false), 3000);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate magic link';
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={generateMagicLink}
      disabled={loading}
      size="sm"
      variant={copied ? "secondary" : "outline"}
      className="h-8 w-8 p-0"
      title={copied ? "Magic login link copied!" : "Generate magic login link (Cmd/Ctrl+Click to open)"}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : copied ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : (
        <Link2 className="h-4 w-4" />
      )}
    </Button>
  );
}
