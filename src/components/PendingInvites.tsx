import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { logger } from "../lib/logger";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { useToast } from "./ui/toast";
import { Users, CheckCircle, XCircle } from "lucide-react";

interface TeamInvite {
  id: string;
  team_id: number;
  team_name: string;
  league_name: string;
  status: string;
  expires_at: string;
  created_at: string;
}

interface PendingInvitesProps {
  onInviteAccepted?: () => void;
}

export function PendingInvites({ onInviteAccepted }: PendingInvitesProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchPendingInvites = async () => {
    if (!user?.email) return;

    try {
      const userEmail = user.email.toLowerCase();
      const { data, error } = await supabase
        .from('team_invites')
        .select('*')
        .eq('email', userEmail)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching invites', error);
        showToast('Failed to load team invites', 'error');
      } else {
        setInvites(data || []);
      }
    } catch (error) {
      logger.error('Error in fetchPendingInvites', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.email) {
      fetchPendingInvites();
      
      // Also check if teams were just added during signup
      const teamsAdded = sessionStorage.getItem('signup_teams_added');
      if (teamsAdded && onInviteAccepted) {
        // Trigger a refresh of the teams list
        onInviteAccepted();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, onInviteAccepted]);

  const acceptInvite = async (invite: TeamInvite) => {
    setProcessing(invite.id);

    try {
      // Get the session to authenticate with the Edge Function
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No authentication session found');
      }

      // Use the Edge Function to accept the invite
      const response = await fetch('https://api.ofsl.ca/functions/v1/accept-team-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          inviteId: invite.id
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to accept invite');
      }

      showToast(result.message || `Successfully joined ${invite.team_name}!`, 'success');
      
      // Refresh the invites list
      fetchPendingInvites();
      
      // Call the parent callback to refresh teams if provided
      if (onInviteAccepted) {
        onInviteAccepted();
      }
    } catch (error) {
      logger.error('Error accepting invite', error);
      showToast(error.message || 'Failed to accept invite', 'error');
    } finally {
      setProcessing(null);
    }
  };

  const declineInvite = async (invite: TeamInvite) => {
    setProcessing(invite.id);

    try {
      const { error } = await supabase
        .from('team_invites')
        .update({ 
          status: 'declined', 
          processed_at: new Date().toISOString() 
        })
        .eq('id', invite.id);

      if (error) {
        throw error;
      }

      showToast('Invite declined', 'success');
      fetchPendingInvites(); // Refresh the list
    } catch (error) {
      logger.error('Error declining invite', error);
      showToast('Failed to decline invite', 'error');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading invites...</div>;
  }

  if (invites.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6 border-orange-200 bg-orange-50">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-orange-600" />
          <h3 className="text-lg font-semibold text-gray-900">Pending Team Invitations</h3>
        </div>
        
        <div className="space-y-3">
          {invites.map((invite) => (
            <div
              key={invite.id}
              className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200"
            >
              <div>
                <p className="font-medium text-gray-900">{invite.team_name}</p>
                <p className="text-sm text-gray-600">{invite.league_name}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Expires {new Date(invite.expires_at).toLocaleDateString()}
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={() => acceptInvite(invite)}
                  disabled={processing === invite.id}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Accept
                </Button>
                <Button
                  onClick={() => declineInvite(invite)}
                  disabled={processing === invite.id}
                  size="sm"
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Decline
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}