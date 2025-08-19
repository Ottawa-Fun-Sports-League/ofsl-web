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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Call our admin Edge Function to generate magic link (without sending email)
      const { data, error } = await supabase.functions.invoke('admin-magic-link', {
        body: { email: userEmail, sendEmail: false },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to generate magic link');

      // Handle the magic link
      if (data.link) {
        const displayName = userName || userEmail;
        
        // If Cmd/Ctrl is held, open in new tab
        if (event.metaKey || event.ctrlKey) {
          window.open(data.link, '_blank');
          showToast(
            `Opening password reset link for ${displayName} in new tab. User will need to set a new password.`,
            'success'
          );
        } else {
          // Otherwise copy to clipboard
          await navigator.clipboard.writeText(data.link);
          setCopied(true);
          showToast(
            `Password reset link copied! Open in new browser/incognito. User will need to set a new password to login as ${displayName}.`,
            'success'
          );
        }
        
        // Also log the link for debugging (remove in production)
        console.log(`Password reset link for ${displayName}:`, data.link);
        
        // Reset copied state after 3 seconds
        setTimeout(() => {
          setCopied(false);
        }, 3000);
      }
    } catch (error) {
      console.error('Error generating magic link:', error);
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
      title={copied ? "Password reset link copied to clipboard!" : "Generate password reset link (Cmd/Ctrl+Click to open)"}
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