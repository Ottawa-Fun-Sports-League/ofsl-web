import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
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

export function PendingInvites() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (user?.email) {
      fetchPendingInvites();
    }
  }, [user]);

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
        console.error('Error fetching invites:', error);
        showToast('Failed to load team invites', 'error');
      } else {
        setInvites(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const acceptInvite = async (invite: TeamInvite) => {
    setProcessing(invite.id);

    try {
      // Get the user's database ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user!.id)
        .single();

      if (userError || !userData) {
        throw new Error('User profile not found');
      }

      // Get the team's current roster
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('roster')
        .eq('id', invite.team_id)
        .single();

      if (teamError || !teamData) {
        throw new Error('Team not found');
      }

      // Add user to roster
      const currentRoster = teamData.roster || [];
      const updatedRoster = [...new Set([...currentRoster, userData.id])];

      // Update team roster
      const { error: updateError } = await supabase
        .from('teams')
        .update({ roster: updatedRoster })
        .eq('id', invite.team_id);

      if (updateError) {
        throw updateError;
      }

      // Mark invite as accepted
      const { error: inviteError } = await supabase
        .from('team_invites')
        .update({ 
          status: 'accepted', 
          processed_at: new Date().toISOString() 
        })
        .eq('id', invite.id);

      if (inviteError) {
        throw inviteError;
      }

      showToast(`Successfully joined ${invite.team_name}!`, 'success');
      fetchPendingInvites(); // Refresh the list
    } catch (error) {
      console.error('Error accepting invite:', error);
      showToast('Failed to accept invite', 'error');
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
      console.error('Error declining invite:', error);
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