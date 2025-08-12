import { useState } from 'react';
import { Button } from '../../../../../components/ui/button';
import { Link2, Loader2, Copy, Check } from 'lucide-react';
import { useToast } from '../../../../../components/ui/toast';
import { supabase } from '../../../../../lib/supabase';

interface MagicLinkButtonProps {
  userEmail: string;
  userName?: string | null;
}

export function MagicLinkButton({ userEmail, userName }: MagicLinkButtonProps) {
  const [loading, setLoading] = useState(false);
  const [linkGenerated, setLinkGenerated] = useState(false);
  const [magicLink, setMagicLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  const generateMagicLink = async () => {
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

      // Copy link to clipboard
      if (data.link) {
        await navigator.clipboard.writeText(data.link);
        setMagicLink(data.link);
        setCopied(true);
        showToast(
          `Magic link copied to clipboard for ${userName || userEmail}`,
          'success'
        );
        
        // Reset copied state after 3 seconds
        setTimeout(() => {
          setCopied(false);
          setMagicLink(null);
        }, 3000);
      }
      
      setLinkGenerated(true);
      
      // Reset the button state after 3 seconds
      setTimeout(() => setLinkGenerated(false), 3000);
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
      title={copied ? "Magic link copied to clipboard!" : "Generate and copy magic link"}
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