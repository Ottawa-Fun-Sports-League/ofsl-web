import { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { X, Plus, Trash2, CheckCircle, XCircle, Clock, Mail } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../components/ui/toast';

interface AddPlayersModalProps {
  showModal: boolean;
  closeModal: () => void;
  teamId: number;
  teamName: string;
  currentRoster: string[];
  onPlayersAdded: () => void;
}

interface PlayerEmail {
  email: string;
  status: 'pending' | 'found' | 'not-found' | 'invited' | 'error';
  userDetails?: {
    id: string;
    name: string;
    email: string;
  };
  errorMessage?: string;
}

export function AddPlayersModal({ 
  showModal, 
  closeModal, 
  teamId, 
  teamName, 
  currentRoster,
  onPlayersAdded 
}: AddPlayersModalProps) {
  const [playerEmails, setPlayerEmails] = useState<PlayerEmail[]>([{ email: '', status: 'pending' }]);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState<Record<number, boolean>>({});
  const { showToast } = useToast();

  const addEmailField = () => {
    setPlayerEmails([...playerEmails, { email: '', status: 'pending' }]);
  };

  const removeEmailField = (index: number) => {
    if (playerEmails.length > 1) {
      setPlayerEmails(playerEmails.filter((_, i) => i !== index));
    }
  };

  const updateEmail = (index: number, value: string) => {
    const newEmails = [...playerEmails];
    newEmails[index] = { email: value, status: 'pending' };
    setPlayerEmails(newEmails);
  };

  // Auto-verify email when user blurs from input
  const handleEmailBlur = async (index: number) => {
    const email = playerEmails[index].email.trim();
    
    // Only check if email is valid and not already checked
    if (!email || !email.includes('@') || playerEmails[index].status !== 'pending') {
      return;
    }

    // Set checking state for this specific input
    setChecking(prev => ({ ...prev, [index]: true }));

    try {
      // Get the session to authenticate with Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No authentication session found');
      }

      // Use Edge Function to search for users (bypasses RLS restrictions)
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: email
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to search for user');
      }

      const result = await response.json();
      const newEmails = [...playerEmails];
      
      if (result.found && result.user) {
        const user = result.user;
        
        // Check if user is already on the team
        if (currentRoster.includes(user.id)) {
          newEmails[index] = {
            ...newEmails[index],
            status: 'error',
            errorMessage: 'User is already on this team'
          };
        } else {
          newEmails[index] = {
            ...newEmails[index],
            status: 'found',
            userDetails: user
          };
        }
      } else {
        newEmails[index] = {
          ...newEmails[index],
          status: 'not-found'
        };
      }

      setPlayerEmails(newEmails);

    } catch (error: any) {
      console.error('Error checking email:', error);
      const newEmails = [...playerEmails];
      newEmails[index] = {
        ...newEmails[index],
        status: 'error',
        errorMessage: 'Error checking email'
      };
      setPlayerEmails(newEmails);
    } finally {
      setChecking(prev => ({ ...prev, [index]: false }));
    }
  };

  const sendInviteEmail = async (email: string) => {
    try {
      // Get team and league details for the invite
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select(`
          name,
          captain_id,
          leagues:league_id(name),
          users:captain_id(name)
        `)
        .eq('id', teamId)
        .single();

      if (teamError) throw teamError;

      const inviteData = {
        email: email,
        teamName: teamData.name,
        leagueName: teamData.leagues?.name || 'OFSL League',
        captainName: teamData.users?.name || 'Team Captain'
      };

      // Get the session to authenticate with Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No authentication session found');
      }

      const response = await fetch('https://api.ofsl.ca/functions/v1/send-invite', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...inviteData,
          teamId: teamId,
          captainId: teamData.captain_id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send invite');
      }

      return true;
    } catch (error) {
      console.error('Error sending invite:', error);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validEmails = playerEmails.filter(pe => pe.email.trim() && pe.email.includes('@'));
    
    if (validEmails.length === 0) {
      showToast('Please enter at least one valid email address', 'error');
      return;
    }

    // Check if any emails still need verification
    const hasUncheckedEmails = validEmails.some(pe => pe.status === 'pending');
    if (hasUncheckedEmails) {
      showToast('Please wait for email verification to complete', 'warning');
      return;
    }

    setLoading(true);

    try {
      // Get users that were found
      const foundUsers = playerEmails.filter(pe => pe.status === 'found' && pe.userDetails);
      const foundUserIds = foundUsers.map(pe => pe.userDetails!.id);
      
      // Get emails that need invites
      const emailsToInvite = playerEmails.filter(pe => pe.status === 'not-found');

      // Add found users to the team
      if (foundUserIds.length > 0) {
        const updatedRoster = [...currentRoster, ...foundUserIds];
        
        const { error: teamError } = await supabase
          .from('teams')
          .update({ roster: updatedRoster })
          .eq('id', teamId);

        if (teamError) throw teamError;

        // Update each user's team_ids array
        for (const userId of foundUserIds) {
          const { data: userData, error: fetchError } = await supabase
            .from('users')
            .select('team_ids')
            .eq('id', userId)
            .single();

          if (fetchError) {
            console.error(`Error fetching user ${userId}:`, fetchError);
            continue;
          }

          const currentTeamIds = userData.team_ids || [];
          if (!currentTeamIds.includes(teamId)) {
            const updatedTeamIds = [...currentTeamIds, teamId];
            
            const { error: updateError } = await supabase
              .from('users')
              .update({ team_ids: updatedTeamIds })
              .eq('id', userId);

            if (updateError) {
              console.error(`Error updating user ${userId}:`, updateError);
            }
          }
        }
      }

      // Send invites to non-registered emails
      const inviteResults = await Promise.all(
        emailsToInvite.map(async (emailObj) => {
          const success = await sendInviteEmail(emailObj.email);
          return { email: emailObj.email, success };
        })
      );

      // Update email statuses based on invite results
      const updatedEmails = playerEmails.map(pe => {
        if (pe.status === 'not-found') {
          const inviteResult = inviteResults.find(ir => ir.email === pe.email);
          return {
            ...pe,
            status: inviteResult?.success ? 'invited' as const : 'error' as const,
            errorMessage: inviteResult?.success ? undefined : 'Failed to send invite'
          };
        }
        return pe;
      });
      setPlayerEmails(updatedEmails);

      // Create success message
      let message = '';
      if (foundUserIds.length > 0) {
        const addedNames = foundUsers.map(fu => fu.userDetails!.name || fu.userDetails!.email).join(', ');
        message += `Added ${foundUserIds.length} player(s): ${addedNames}`;
      }

      const successfulInvites = inviteResults.filter(ir => ir.success).length;
      if (successfulInvites > 0) {
        if (message) message += '. ';
        message += `Sent ${successfulInvites} invite(s)`;
      }

      if (message) {
        showToast(message, 'success');
      }

      onPlayersAdded();
      
      // Only close modal if all operations were successful
      const hasErrors = updatedEmails.some(pe => pe.status === 'error' && pe.errorMessage !== 'User is already on this team');
      if (!hasErrors) {
        setPlayerEmails([{ email: '', status: 'pending' }]);
        closeModal();
      }

    } catch (error: any) {
      console.error('Error adding players:', error);
      showToast(error.message || 'Failed to add players', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPlayerEmails([{ email: '', status: 'pending' }]);
    setChecking({});
    closeModal();
  };

  const getStatusIcon = (status: PlayerEmail['status'], isChecking: boolean = false) => {
    if (isChecking) {
      return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
    }
    
    switch (status) {
      case 'found':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'not-found':
        return <XCircle className="h-4 w-4 text-orange-500" />;
      case 'invited':
        return <Mail className="h-4 w-4 text-blue-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (playerEmail: PlayerEmail, isChecking: boolean = false) => {
    if (isChecking) {
      return 'Checking...';
    }
    
    switch (playerEmail.status) {
      case 'found':
        return `Found: ${playerEmail.userDetails?.name || 'User found'}`;
      case 'not-found':
        return 'Will send invite';
      case 'invited':
        return 'Invite sent';
      case 'error':
        return playerEmail.errorMessage || 'Error occurred';
      default:
        return '';
    }
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-[#6F6F6F]">Add Players</h2>
            <button 
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 bg-transparent hover:bg-gray-100 rounded-full p-2 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-[#6F6F6F]">
              <span className="font-medium">Team:</span> {teamName}
            </p>
            <p className="text-sm text-[#6F6F6F] mt-1">
              <span className="font-medium">Current Players:</span> {currentRoster.length}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#6F6F6F] mb-2">
                Player Email Addresses
              </label>
              
              {playerEmails.map((playerEmail, index) => (
                <div key={index} className="mb-3">
                  <div className="flex gap-2 mb-1">
                    <Input
                      type="email"
                      value={playerEmail.email}
                      onChange={(e) => updateEmail(index, e.target.value)}
                      onBlur={() => handleEmailBlur(index)}
                      placeholder="player@example.com"
                      className="flex-1"
                      disabled={checking[index]}
                    />
                    {playerEmails.length > 1 && (
                      <Button
                        type="button"
                        onClick={() => removeEmailField(index)}
                        className="bg-transparent hover:bg-red-50 text-red-500 hover:text-red-600 rounded-lg p-2 transition-colors"
                        disabled={checking[index]}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  {/* Status display */}
                  {playerEmail.email && (playerEmail.status !== 'pending' || checking[index]) && (
                    <div className="flex items-center gap-2 text-sm">
                      {getStatusIcon(playerEmail.status, checking[index])}
                      <span className={`
                        ${playerEmail.status === 'found' ? 'text-green-600' : ''}
                        ${playerEmail.status === 'not-found' ? 'text-orange-600' : ''}
                        ${playerEmail.status === 'invited' ? 'text-blue-600' : ''}
                        ${playerEmail.status === 'error' ? 'text-red-600' : ''}
                        ${checking[index] ? 'text-blue-600' : ''}
                      `}>
                        {getStatusText(playerEmail, checking[index])}
                      </span>
                    </div>
                  )}
                </div>
              ))}
              
              <Button
                type="button"
                onClick={addEmailField}
                className="bg-gray-500 hover:bg-gray-600 text-white rounded-lg px-4 py-2 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Another Email
              </Button>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>How it works:</strong>
              </p>
              <ul className="text-sm text-blue-800 mt-2 space-y-1">
                <li>• <strong>Registered users</strong> will be added to your team immediately</li>
                <li>• <strong>Non-registered emails</strong> will receive an invite to join OFSL and your team</li>
                <li>• <strong>Auto-verification</strong> happens when you finish typing an email</li>
              </ul>
            </div>

            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={loading || Object.values(checking).some(Boolean)}
                className="flex-1 border-[#B20000] bg-white hover:bg-[#B20000] text-[#B20000] hover:text-white rounded-[10px] px-6 py-2"
              >
                {loading ? 'Processing...' : 'Add Players & Send Invites'}
              </Button>
              <Button
                type="button"
                onClick={handleClose}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white rounded-[10px] px-6 py-2"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}