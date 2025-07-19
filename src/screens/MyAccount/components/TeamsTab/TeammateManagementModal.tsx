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
}

interface TeammateManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: number;
  teamName: string;
  currentRoster: string[];
  captainId: string;
  onRosterUpdate: (newRoster: string[]) => Promise<void>;
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
  onRosterUpdate,
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
      
      // Get the session to authenticate with Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No authentication session found');
      }

      // First, get the fresh roster from the database
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('roster')
        .eq('id', teamId)
        .single();

      if (teamError) {
        throw new Error('Failed to get current team roster');
      }

      const freshRoster = teamData?.roster || [];
      console.log('Fresh roster from database:', freshRoster);
      console.log('Props currentRoster:', currentRoster);

      // Use Edge Function to load teammates (bypasses RLS restrictions)
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-team-members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          teamId: teamId,
          currentRoster: freshRoster // Use fresh roster instead of props
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to load teammates');
      }

      const result = await response.json();

      if (result.success) {
        console.log('Loaded teammates:', result.teammates);
        setTeammates(result.teammates);
      } else {
        throw new Error(result.error || 'Failed to load teammates');
      }
    } catch (error) {
      console.error('Error loading teammates:', error);
      showToast('Failed to load teammates', 'error');
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
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-users`, {
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

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-invite`, {
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
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-teammates`, {
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
      await onRosterUpdate(result.newRoster);
      
      // Clear the search state
      setSearchEmail('');
      setSearchResult(null);
      setUserNotFound(false);
      
      showToast('Teammate added successfully', 'success');
      
      // Note: teammates list will reload automatically via useEffect when currentRoster changes
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

    // Check if this is a pending invite
    const teammate = teammates.find(t => t.id === userId);
    if (teammate?.isPending && teammate.inviteId) {
      try {
        setRemovingTeammate(userId);
        
        // Remove pending invite from database
        const { error } = await supabase
          .from('team_invites')
          .delete()
          .eq('id', teammate.inviteId);

        if (error) {
          throw new Error('Failed to remove pending invite');
        }
        
        showToast('Pending invite removed successfully', 'success');
        
        // Reload teammates list
        await loadTeammates();
      } catch (error) {
        console.error('Error removing pending invite:', error);
        showToast(error.message || 'Failed to remove pending invite', 'error');
      } finally {
        setRemovingTeammate(null);
      }
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
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-teammates`, {
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
      await onRosterUpdate(result.newRoster);
      showToast('Teammate removed successfully', 'success');
      
      // Note: teammates list will reload automatically via useEffect when currentRoster changes
    } catch (error) {
      console.error('Error removing teammate:', error);
      showToast(error.message || 'Failed to remove teammate. Please try again.', 'error');
    } finally {
      setRemovingTeammate(null);
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
                  const isPending = teammate.isPending;
                  return (
                    <div key={teammate.id} className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border rounded-lg gap-3 ${isPending ? 'bg-orange-50 border-orange-200' : ''}`}>
                      <div className="flex items-center gap-3">
                        <User className={`h-5 w-5 flex-shrink-0 ${isPending ? 'text-orange-500' : 'text-gray-500'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <p className={`font-medium truncate ${isPending ? 'text-orange-800' : 'text-[#6F6F6F]'}`}>
                              {isPending ? teammate.email : teammate.name}
                            </p>
                            <div className="flex items-center gap-2">
                              {isCaptain && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                                  Captain
                                </span>
                              )}
                              {isPending && (
                                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                                  Pending Invite
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-500 mt-1">
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{teammate.email}</span>
                            </div>
                            {!isPending && teammate.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3 flex-shrink-0" />
                                <span>{teammate.phone}</span>
                              </div>
                            )}
                            {isPending && (
                              <div className="text-orange-600 text-xs">
                                Invite sent - waiting for signup
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      {!isCaptain && !readOnly ? (
                        <Button
                          onClick={() => removeTeammate(teammate.id)}
                          size="sm"
                          disabled={removingTeammate === teammate.id}
                          className={`text-white w-full sm:w-auto ${isPending ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700'}`}
                        >
                          {removingTeammate === teammate.id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                              {isPending ? 'Canceling...' : 'Removing...'}
                            </>
                          ) : (
                            <>
                              <Trash2 className="h-4 w-4 mr-1" />
                              <span className="hidden sm:inline">{isPending ? 'Cancel Invite' : 'Remove'}</span>
                              <span className="sm:hidden">{isPending ? 'Cancel' : 'Remove'}</span>
                            </>
                          )}
                        </Button>
                      ) : (
                        <div className="text-sm text-gray-500 italic text-center sm:text-left">
                          {/* Captain tag is shown elsewhere, no text needed here */}
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