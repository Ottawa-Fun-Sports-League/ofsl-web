import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { useToast } from '../../../../components/ui/toast';
import { useAuth } from '../../../../contexts/AuthContext';
import { X, UserPlus, Trash2, Mail, Phone, User, Send } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  isPending?: boolean;
  inviteId?: number;
  isCoCaptain?: boolean;
}

interface TeammateManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: number;
  teamName: string;
  currentRoster: string[];
  captainId: string;
  coCaptainIds?: string[];
  onRosterUpdate: (newRoster: string[]) => Promise<void>;
  onCaptainUpdate?: (newCaptainId: string) => Promise<void>;
  onCoCaptainUpdate?: (newCoCaptainIds: string[]) => Promise<void>;
  leagueName?: string;
  readOnly?: boolean;
}

export function TeammateManagementModal({
  isOpen,
  onClose,
  teamId,
  teamName,
  currentRoster,
  captainId,
  coCaptainIds = [],
  onRosterUpdate,
  onCaptainUpdate,
  onCoCaptainUpdate,
  leagueName,
  readOnly = false
}: TeammateManagementModalProps) {
  
  const [teammates, setTeammates] = useState<User[]>([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<User | null>(null);
  const [userNotFound, setUserNotFound] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [addingTeammate, setAddingTeammate] = useState(false);
  const [removingTeammate, setRemovingTeammate] = useState<string | null>(null);
  const [reassigningCaptain, setReassigningCaptain] = useState<string | null>(null);
  const [managingCoCaptain, setManagingCoCaptain] = useState<string | null>(null);
  const [cancelingInvite, setCancelingInvite] = useState<string | null>(null);
  const { showToast } = useToast();
  const { userProfile } = useAuth();

  useEffect(() => {
    if (isOpen) {
      // Clear existing state to ensure fresh data
      setTeammates([]);
      setSearchResult(null);
      setSearchEmail('');
      setUserNotFound(false);
      // Add a small delay to ensure the modal is fully rendered before fetching
      const timeoutId = setTimeout(() => {
        loadTeammates();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, teamId]); // Use teamId instead of currentRoster to avoid stale data

  // Force reload teammates when currentRoster changes (after Edge Function updates)
  useEffect(() => {
    if (isOpen) {
      loadTeammates();
    }
  }, [teamId]); // Only reload if teamId changes while modal is open

  const loadTeammates = async () => {
    try {
      setLoading(true);
      
      // Try refreshing the session first
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
      
      console.log('Refreshed session data:', {
        hasSession: !!session,
        sessionError,
        accessToken: session?.access_token ? 'Present' : 'Missing',
        tokenLength: session?.access_token?.length,
        user: session?.user?.id,
        email: session?.user?.email,
        expires: session?.expires_at
      });
      
      if (!session) {
        throw new Error('No authentication session found after refresh');
      }

      // Get the fresh roster and co-captains from the database
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('roster, co_captains')
        .eq('id', teamId)
        .single();

      if (teamError) {
        console.error('Team data fetch error:', teamError);
        throw new Error(`Failed to get current team roster: ${teamError.message}`);
      }

      if (!teamData) {
        throw new Error('Team not found or access denied');
      }

      const freshRoster = teamData?.roster || [];
      const freshCoCaptainIds = teamData?.co_captains || [];

      // Use Edge Function to load teammates (bypasses RLS restrictions)
      const response = await fetch('https://api.ofsl.ca/functions/v1/get-team-members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          teamId: teamId,
          currentRoster: freshRoster, // Use fresh roster instead of props
          coCaptainIds: freshCoCaptainIds // Use fresh co-captain IDs from database
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Edge Function response error:', {
          status: response.status,
          statusText: response.statusText,
          errorText
        });
        throw new Error(`Failed to load teammates: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();

      if (result.success) {
        setTeammates(result.teammates || []);
      } else {
        console.error('Edge Function returned error:', result.error);
        throw new Error(result.error || 'Failed to load teammates');
      }
    } catch (error) {
      console.error('Error loading teammates:', error);
      showToast(`Failed to load teammates: ${error?.message || 'Unknown error'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const searchUser = async () => {
    if (!searchEmail.trim()) return;
    
    try {
      setSearching(true);
      setUserNotFound(false);
      setSearchResult(null);
      
      // Get the session to authenticate with Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No authentication session found');
      }

      // Use Edge Function to search for users (bypasses RLS restrictions)
      const response = await fetch('https://api.ofsl.ca/functions/v1/search-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: searchEmail.toLowerCase()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to search for user');
      }

      const result = await response.json();

      if (result.found && result.user) {
        setSearchResult(result.user);
        setUserNotFound(false);
      } else {
        // User not found - show invite option
        setUserNotFound(true);
        setSearchResult(null);
      }
    } catch (error) {
      console.error('Error searching user:', error);
      showToast('Failed to search for user', 'error');
      setSearchResult(null);
      setUserNotFound(false);
    } finally {
      setSearching(false);
    }
  };

  const sendInvite = async () => {
    if (!searchEmail.trim() || !userProfile?.name) return;
    
    try {
      setSendingInvite(true);
      
      // Get the session to authenticate with Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No authentication session found');
      }

      const response = await fetch('https://api.ofsl.ca/functions/v1/send-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: searchEmail.toLowerCase(),
          teamName: teamName,
          leagueName: leagueName || 'OFSL League',
          captainName: userProfile.name,
          teamId: teamId,
          captainId: captainId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Send invite error:', errorData);
        throw new Error(errorData.error || 'Failed to send invite');
      }

      const result = await response.json();
      
      if (result.success) {
        showToast(`Invite sent successfully to ${searchEmail}`, 'success');
        setSearchEmail('');
        setUserNotFound(false);
        // Reload teammates to show the pending invite
        await loadTeammates();
      } else {
        throw new Error(result.error || 'Failed to send invite');
      }
    } catch (error) {
      console.error('Error sending invite:', error);
      showToast('Failed to send invite. Please try again.', 'error');
    } finally {
      setSendingInvite(false);
    }
  };

  const addTeammate = async (userId: string) => {
    if (currentRoster.includes(userId)) {
      showToast('User is already on the team', 'error');
      return;
    }

    try {
      setAddingTeammate(true);
      
      // Get the session to authenticate with Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No authentication session found');
      }

      // Call the Edge Function
      const response = await fetch('https://api.ofsl.ca/functions/v1/manage-teammates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'add',
          teamId: teamId,
          userId: userId,
          captainId: captainId
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add teammate');
      }
      
      // Update the parent component state and wait for refetch
      const newRoster = result.data?.[0]?.roster || [];
      await onRosterUpdate(newRoster);
      
      // Reload the teammates list to show the new member
      await loadTeammates();
      
      // Clear the search state
      setSearchEmail('');
      setSearchResult(null);
      setUserNotFound(false);
      
      showToast('Teammate added successfully', 'success');
    } catch (error) {
      console.error('Error adding teammate:', error);
      showToast(error.message || 'Failed to add teammate. Please try again.', 'error');
    } finally {
      setAddingTeammate(false);
    }
  };

  const removeTeammate = async (userId: string) => {
    // Prevent captain from removing themselves
    if (userId === captainId) {
      showToast('Cannot remove the team captain', 'error');
      return;
    }

    // Don't allow removing pending invites
    const teammate = teammates.find(t => t.id === userId);
    if (teammate?.isPending) {
      showToast('Pending invites cannot be removed', 'info');
      return;
    }

    // Handle registered user removal
    try {
      setRemovingTeammate(userId);
      
      // Get the session to authenticate with Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No authentication session found');
      }

      // Call the Edge Function
      const response = await fetch('https://api.ofsl.ca/functions/v1/manage-teammates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'remove',
          teamId: teamId,
          userId: userId,
          captainId: captainId
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to remove teammate');
      }
      
      // Update the parent component state and wait for refetch
      const newRoster = result.data?.[0]?.roster || [];
      await onRosterUpdate(newRoster);
      
      // Reload the teammates list to reflect the removal
      await loadTeammates();
      
      showToast('Teammate removed successfully', 'success');
    } catch (error) {
      console.error('Error removing teammate:', error);
      showToast(error.message || 'Failed to remove teammate. Please try again.', 'error');
    } finally {
      setRemovingTeammate(null);
    }
  };

  const reassignCaptain = async (newCaptainId: string) => {
    if (!userProfile?.is_admin) {
      showToast('Only admins can reassign team captains', 'error');
      return;
    }

    const newCaptain = teammates.find(t => t.id === newCaptainId);
    if (!newCaptain || newCaptain.isPending) {
      showToast('Cannot assign captain to pending invite', 'error');
      return;
    }

    if (!confirm(`Are you sure you want to make ${newCaptain.name} the new team captain? This will remove captain privileges from the current captain.`)) {
      return;
    }

    try {
      setReassigningCaptain(newCaptainId);
      
      // Update the team captain in the database
      const { error } = await supabase
        .from('teams')
        .update({ captain_id: newCaptainId })
        .eq('id', teamId);

      if (error) throw error;

      showToast(`${newCaptain.name} is now the team captain`, 'success');
      
      // Notify parent component of captain change
      if (onCaptainUpdate) {
        await onCaptainUpdate(newCaptainId);
      }
      
      // Reload teammates to reflect the change
      await loadTeammates();
      
    } catch (error) {
      console.error('Error reassigning captain:', error);
      showToast('Failed to reassign captain. Please try again.', 'error');
    } finally {
      setReassigningCaptain(null);
    }
  };

  const toggleCoCaptain = async (userId: string) => {
    const teammate = teammates.find(t => t.id === userId);
    if (!teammate || teammate.isPending) {
      showToast('Cannot assign co-captain to pending invite', 'error');
      return;
    }

    // Check if user is captain
    if (userProfile?.id !== captainId) {
      showToast('Only team captains can manage co-captains', 'error');
      return;
    }

    // Get fresh co-captain data from database to avoid stale props
    const { data: currentTeamData } = await supabase
      .from('teams')
      .select('co_captains')
      .eq('id', teamId)
      .single();
    
    const currentCoCaptainIds = currentTeamData?.co_captains || [];
    const isCurrentlyCoCaptain = currentCoCaptainIds.includes(userId);
    
    if (!isCurrentlyCoCaptain && currentCoCaptainIds.length >= 2) {
      showToast('Teams can have a maximum of 2 co-captains', 'error');
      return;
    }

    const action = isCurrentlyCoCaptain ? 'remove' : 'add';
    const confirmText = isCurrentlyCoCaptain 
      ? `Remove ${teammate.name} as co-captain?`
      : `Make ${teammate.name} a co-captain? They will have captain privileges but you will remain the main captain.`;

    if (!confirm(confirmText)) {
      return;
    }

    try {
      setManagingCoCaptain(userId);
      
      // Get the session to authenticate with Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No authentication session found');
      }

      let newCoCaptainIds: string[];
      if (isCurrentlyCoCaptain) {
        // Remove co-captain
        newCoCaptainIds = currentCoCaptainIds.filter(id => id !== userId);
      } else {
        // Add co-captain
        newCoCaptainIds = [...currentCoCaptainIds, userId];
      }

      // Update the database with new co-captains list
      console.log('Attempting to update co-captains for team:', teamId);
      console.log('New co-captain IDs:', newCoCaptainIds);
      
      const { data: updateData, error: updateError } = await supabase
        .from('teams')
        .update({ co_captains: newCoCaptainIds })
        .eq('id', teamId)
        .select();

      console.log('Database update result:', { updateData, updateError });

      if (updateError) {
        console.error('Database update error:', updateError);
        // For now, if co_captains column doesn't exist, show helpful error
        if (updateError.message.includes('co_captains') || updateError.message.includes('column')) {
          throw new Error('Co-captain functionality requires database updates. Please contact an administrator.');
        }
        throw updateError;
      }

      if (!updateData || updateData.length === 0) {
        console.error('No rows updated - team may not exist or user lacks permission');
        throw new Error('Failed to update team - you may not have permission or the team may not exist.');
      }
      
      // Notify parent component of co-captain change
      if (onCoCaptainUpdate) {
        await onCoCaptainUpdate(newCoCaptainIds);
      }
      
      // Reload teammates to reflect the change
      await loadTeammates();
      
      const successMessage = isCurrentlyCoCaptain 
        ? `${teammate.name} removed as co-captain`
        : `${teammate.name} is now a co-captain`;
      
      showToast(successMessage, 'success');
      
    } catch (error: any) {
      console.error('Error managing co-captain:', error);
      showToast(error.message || 'Failed to update co-captain status. Please try again.', 'error');
    } finally {
      setManagingCoCaptain(null);
    }
  };

  const cancelInvite = async (teammateId: string, inviteId: number, email: string) => {
    if (!confirm(`Are you sure you want to cancel the invite for ${email}?`)) {
      return;
    }

    try {
      setCancelingInvite(teammateId);
      
      // Get the session to authenticate with Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No authentication session found');
      }

      // Delete the invite from the database
      const { error } = await supabase
        .from('team_invites')
        .delete()
        .eq('id', inviteId)
        .eq('team_id', teamId);

      if (error) {
        console.error('Database error canceling invite:', error);
        throw new Error('Failed to cancel invite');
      }

      showToast(`Invite for ${email} has been canceled`, 'success');
      
      // Reload teammates to reflect the change
      await loadTeammates();
      
    } catch (error: any) {
      console.error('Error canceling invite:', error);
      showToast(error.message || 'Failed to cancel invite. Please try again.', 'error');
    } finally {
      setCancelingInvite(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-auto">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b">
          <h2 className="text-lg sm:text-xl font-semibold text-[#6F6F6F] pr-4">
            <span className="hidden sm:inline">{readOnly ? 'View' : 'Manage'} Teammates - {teamName}</span>
            <span className="sm:hidden">Teammates</span>
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Add Teammate Section - Only show for captains */}
          {!readOnly && (
            <div className="border rounded-lg p-4">
            <h3 className="text-base sm:text-lg font-medium text-[#6F6F6F] mb-4">Add Teammate</h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                type="email"
                placeholder="Enter teammate's email address"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchUser()}
                className="flex-1"
              />
              <Button
                onClick={searchUser}
                disabled={searching || !searchEmail.trim()}
                className="bg-[#B20000] hover:bg-[#8A0000] text-white w-full sm:w-auto"
              >
                {searching ? 'Searching...' : 'Search'}
              </Button>
            </div>

            {searchResult && (
              <div className="mt-4 p-3 border rounded-lg bg-gray-50">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-gray-500 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-[#6F6F6F]">{searchResult.name}</p>
                      <p className="text-sm text-gray-500 break-all">{searchResult.email}</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => addTeammate(searchResult.id)}
                    size="sm"
                    disabled={addingTeammate}
                    className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
                  >
                    {addingTeammate ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                        Adding...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-1" />
                        Add
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {userNotFound && (
              <div className="mt-4 p-4 border rounded-lg bg-orange-50 border-orange-200">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <Mail className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-orange-800 mb-1">User Not Found</h4>
                    <p className="text-sm text-orange-700 mb-3">
                      No user found with email <strong className="break-all">{searchEmail}</strong>. 
                      Would you like to send them an invitation to join OFSL and your team?
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        onClick={sendInvite}
                        disabled={sendingInvite}
                        size="sm"
                        className="bg-orange-600 hover:bg-orange-700 text-white w-full sm:w-auto"
                      >
                        {sendingInvite ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-1" />
                            Send Invite
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => {
                          setUserNotFound(false);
                          setSearchEmail('');
                        }}
                        size="sm"
                        variant="outline"
                        className="w-full sm:w-auto"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          )}

          {/* Current Teammates Section */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-medium text-[#6F6F6F] mb-4">
              Current Teammates ({teammates.length})
            </h3>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#B20000]"></div>
                <span className="ml-2 text-gray-600">Loading teammates...</span>
              </div>
            ) : teammates.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No teammates added yet</p>
            ) : (
              <div className="space-y-3">
                {/* Sort teammates to ensure captain is always first, then pending invites last */}
                {teammates
                  .sort((a, b) => {
                    // Captain always comes first
                    if (a.id === captainId) return -1;
                    if (b.id === captainId) return 1;
                    // Pending invites come last
                    if (a.isPending && !b.isPending) return 1;
                    if (!a.isPending && b.isPending) return -1;
                    // Otherwise sort alphabetically by name
                    return a.name.localeCompare(b.name);
                  })
                  .map((teammate) => {
                  const isCaptain = teammate.id === captainId;
                  const isCoCaptain = coCaptainIds.includes(teammate.id);
                  const isPending = teammate.isPending;
                  const isCurrentUserCaptain = userProfile?.id === captainId;
                  return (
                    <div key={teammate.id} className={`flex flex-col p-3 sm:p-4 border rounded-lg gap-2 sm:gap-3 ${isPending ? 'bg-orange-50 border-orange-200' : 'bg-white hover:bg-gray-50'} transition-colors`}>
                      {/* Header Section - Name, Icon, and Badges */}
                      <div className="flex items-start gap-3">
                        <User className={`h-5 w-5 flex-shrink-0 mt-0.5 ${isPending ? 'text-orange-500' : 'text-gray-500'}`} />
                        <div className="flex-1 min-w-0 space-y-2">
                          {/* Name and Badges Row */}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="flex flex-col sm:flex-row sm:items-baseline gap-2">
                              <h4 className={`font-semibold text-base truncate ${isPending ? 'text-orange-800' : 'text-[#6F6F6F]'}`}>
                                {isPending ? teammate.email : teammate.name}
                              </h4>
                              <div className="flex flex-wrap items-baseline gap-2">
                                {isCaptain && (
                                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                                    Captain
                                  </span>
                                )}
                                {isCoCaptain && (
                                  <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                                    Co-Captain
                                  </span>
                                )}
                                {isPending && (
                                  <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                                    Pending Invite
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {/* Make Captain text link in top right - only for admins */}
                            {!isCaptain && !isPending && userProfile?.is_admin && teammates.filter(t => !t.isPending).length > 1 && (
                              <div className="flex-shrink-0">
                                <button
                                  onClick={() => reassignCaptain(teammate.id)}
                                  disabled={reassigningCaptain === teammate.id}
                                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline disabled:cursor-not-allowed disabled:opacity-50 font-medium"
                                >
                                  {reassigningCaptain === teammate.id ? (
                                    <>
                                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current inline-block mr-1"></div>
                                      Assigning captain...
                                    </>
                                  ) : (
                                    'Make Captain'
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                          
                          {/* Contact Information Section */}
                          <div className="space-y-2">
                            {/* Email and Phone on same line for non-pending users with phone */}
                            {!isPending && teammate.phone ? (
                              <div className="flex items-center gap-2 flex-wrap">
                                <Mail className="h-4 w-4 flex-shrink-0 text-gray-400" />
                                <span className="text-sm text-gray-600">{teammate.email}</span>
                                <span className="text-gray-300 text-sm">•</span>
                                <Phone className="h-4 w-4 flex-shrink-0 text-gray-400" />
                                <span className="text-sm text-gray-600">{teammate.phone}</span>
                              </div>
                            ) : !isPending ? (
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 flex-shrink-0 text-gray-400" />
                                <span className="text-sm text-gray-600 truncate">{teammate.email}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <div className="h-4 w-4 flex-shrink-0" />
                                <span className="text-xs text-orange-600 font-medium">
                                  Invite sent - waiting for signup
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Divider */}
                      {(!isCaptain || (userProfile?.is_admin && teammates.filter(t => !t.isPending).length > 1) || (isPending && !readOnly && (isCurrentUserCaptain || userProfile?.is_admin))) && (
                        <div className="border-t border-gray-100"></div>
                      )}
                      
                      {/* Actions Section for registered users */}
                      {(!isCaptain && !readOnly && !isPending && (isCurrentUserCaptain || userProfile?.is_admin)) && (
                        <div className="space-y-2">
                          {/* Buttons Row */}
                          <div className="flex flex-col sm:flex-row gap-2">
                            {/* Co-Captain management button - only for captains, non-captains, registered users */}
                            {isCurrentUserCaptain && (
                              <Button
                                onClick={() => toggleCoCaptain(teammate.id)}
                                size="sm"
                                variant="outline"
                                disabled={managingCoCaptain === teammate.id}
                                className="w-full sm:w-auto border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900 hover:border-gray-500 px-3 py-1.5"
                              >
                                {managingCoCaptain === teammate.id ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                                    {isCoCaptain ? 'Removing...' : 'Making Co-Captain...'}
                                  </>
                                ) : (
                                  <>
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    <span className="hidden sm:inline">{isCoCaptain ? 'Remove Co-Captain' : 'Make Co-Captain'}</span>
                                    <span className="sm:hidden">{isCoCaptain ? 'Remove' : 'Co-Captain'}</span>
                                  </>
                                )}
                              </Button>
                            )}
                            
                            {/* Remove button - for non-captains when not read-only */}
                            <Button
                              onClick={() => removeTeammate(teammate.id)}
                              size="sm"
                              disabled={removingTeammate === teammate.id}
                              className="text-white w-full sm:w-auto bg-red-600 hover:bg-red-700 px-3 py-1.5"
                            >
                              {removingTeammate === teammate.id ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  Removing...
                                </>
                              ) : (
                                <>
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  <span className="hidden sm:inline">Remove</span>
                                  <span className="sm:hidden">Remove</span>
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {/* Actions Section for pending invites */}
                      {(isPending && !readOnly && (isCurrentUserCaptain || userProfile?.is_admin)) && (
                        <div className="space-y-2">
                          {/* Cancel Invite Button */}
                          <div className="flex justify-end">
                            <Button
                              onClick={() => teammate.inviteId && cancelInvite(teammate.id, teammate.inviteId, teammate.email)}
                              size="sm"
                              variant="outline"
                              disabled={cancelingInvite === teammate.id}
                              className="w-full sm:w-auto border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800 hover:border-red-400 px-3 py-1.5"
                            >
                              {cancelingInvite === teammate.id ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                                  Canceling...
                                </>
                              ) : (
                                <>
                                  <X className="h-4 w-4 mr-2" />
                                  <span className="hidden sm:inline">Cancel Invite</span>
                                  <span className="sm:hidden">Cancel</span>
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 sm:p-6 border-t bg-gray-50">
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full sm:w-auto"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}