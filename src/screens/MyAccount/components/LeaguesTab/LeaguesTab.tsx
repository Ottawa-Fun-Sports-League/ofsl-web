import { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../components/ui/toast';
import { supabase } from '../../../../lib/supabase';
import { updateStripeProductLeagueId } from '../../../../lib/stripe';
import { Card, CardContent } from '../../../../components/ui/card';
import { LeaguesHeader } from './components/LeaguesHeader';
import { NewLeagueForm } from './components/NewLeagueForm';
import { LeaguesList } from './components/LeaguesList';
import { CopyLeagueDialog } from './components/CopyLeagueDialog';
import { useLeaguesData } from './hooks/useLeaguesData';
import { useLeagueActions } from './hooks/useLeagueActions';
import { LeagueWithTeamCount, NewLeague } from './types';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '../../../../components/ui/dialog';
import { PaginationState } from '../UsersTab/types';
import { Pagination } from '../UsersTab/components/Pagination';

export function LeaguesTab() {
  const { userProfile } = useAuth();
  const { showToast } = useToast();
  const [showNewLeagueForm, setShowNewLeagueForm] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [leagueToCopy, setLeagueToCopy] = useState<LeagueWithTeamCount | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [, setSelectedLeagueId] = useState<number | null>(null);
  const [scheduleData, setScheduleData] = useState<{
    format: string;
    date: string;
    tiers: {
      tierNumber: number;
      location: string;
      time: string;
      court: string;
      teams: Record<string, { name: string; ranking: number } | null>;
    }[];
  } | null>(null);
  const [leaguesPagination, setLeaguesPagination] = useState<PaginationState>({
    currentPage: 1,
    pageSize: 25,
    totalItems: 0,
    totalPages: 0
  });
  const [paginatedLeagues, setPaginatedLeagues] = useState<LeagueWithTeamCount[]>([]);

  const [selectedProductForLeague, setSelectedProductForLeague] = useState<{
    productId: string | null;
    league: NewLeague | null;
  }>({ productId: null, league: null });
  
  const {
    leagues,
    sports,
    skills,
    gyms,
    loading,
    loadData
  } = useLeaguesData();

  const {
    saving,
    handleCreateLeague,
    handleDeleteLeague,
    handleCopyLeague
  } = useLeagueActions({ loadData, showToast });

  // Function to handle product selection for a new league
  const handleProductSelection = async (productId: string, league: NewLeague) => {
    setSelectedProductForLeague({
      productId,
      league
    });
  };

  // Function to handle creating a league and linking it to a product
  const handleCreateLeagueWithProduct = async (league: NewLeague) => {
    try {
      // First create the league
      const newLeague = await handleCreateLeague(league);
      
      // If we have a product ID and the league was created successfully
      if (selectedProductForLeague.productId && newLeague?.id) {
        try {
          // Link the product to the league
          await updateStripeProductLeagueId(
            selectedProductForLeague.productId,
            newLeague.id
          );
          showToast(`League linked to Stripe product successfully`, 'success');
        } catch (error) {
          console.error('Error linking product to league:', error);
          showToast('League created but product linking failed', 'warning');
        }
      }
      
      // Reset the selected product
      setSelectedProductForLeague({ productId: null, league: null });
      
      // Close the form
      setShowNewLeagueForm(false);
      
    } catch (error) {
      console.error('Error creating league with product:', error);
      showToast('Failed to create league', 'error');
    }
  };

  const handleCopyClick = (league: LeagueWithTeamCount) => {
    setLeagueToCopy(league);
    setCopyDialogOpen(true);
  };

  const handleCopyConfirm = async (newName: string) => {
    if (leagueToCopy) {
      await handleCopyLeague(leagueToCopy, newName);
      setCopyDialogOpen(false);
      setLeagueToCopy(null);
    }
  };

  const handleCopyCancel = () => {
    setCopyDialogOpen(false);
    setLeagueToCopy(null);
  };

  // Schedule management handlers
  const handleManageSchedule = async (leagueId: number) => {
    try {
      const { data, error } = await supabase
        .from('league_schedules')
        .select('schedule_data, format')
        .eq('league_id', leagueId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading schedule:', error);
        showToast('Failed to load schedule data', 'error');
        return;
      }

      setSelectedLeagueId(leagueId);
      setScheduleData(data?.schedule_data || null);
      setShowScheduleModal(true);
    } catch (err) {
      console.error('Error loading schedule:', err);
      showToast('Failed to load schedule data', 'error');
    }
  };

  const handleCloseScheduleModal = () => {
    setShowScheduleModal(false);
    setSelectedLeagueId(null);
    setScheduleData(null);
  };

  const handleLeaguesPageChange = (page: number) => {
    const updatedPagination = {
      ...leaguesPagination,
      currentPage: page
    };
    setLeaguesPagination(updatedPagination);
    const startIndex = (page - 1) * leaguesPagination.pageSize;
    const endIndex = startIndex + leaguesPagination.pageSize;
    setPaginatedLeagues(leagues.slice(startIndex, endIndex));
  };

  const handleLeaguesPageSizeChange = (pageSize: number) => {
    const updatedPagination = {
      ...leaguesPagination,
      currentPage: 1,
      pageSize,
      totalItems: leagues.length,
      totalPages: Math.ceil(leagues.length / pageSize)
    };
    setLeaguesPagination(updatedPagination);
    setPaginatedLeagues(leagues.slice(0, pageSize));
  };

  useEffect(() => {
    setLeaguesPagination((prevPagination: PaginationState) => {
      const totalItems = leagues.length;
      const totalPages = Math.ceil(totalItems / prevPagination.pageSize);
      const currentPage = Math.min(prevPagination.currentPage, totalPages || 1);
      
      const updatedPagination = {
        ...prevPagination,
        currentPage,
        totalItems,
        totalPages
      };
      
      const startIndex = (currentPage - 1) * prevPagination.pageSize;
      const endIndex = startIndex + prevPagination.pageSize;
      setPaginatedLeagues(leagues.slice(startIndex, endIndex));
      
      return updatedPagination;
    });
  }, [leagues]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!userProfile?.is_admin) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-[#6F6F6F] text-lg">Access denied. Admin privileges required.</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B20000]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <LeaguesHeader onCreateNew={() => setShowNewLeagueForm(true)} />

      {showNewLeagueForm && (
        <NewLeagueForm 
          sports={sports}
          skills={skills}
          gyms={gyms}
          onProductSelect={handleProductSelection} 
          saving={saving}
          onClose={() => setShowNewLeagueForm(false)}
          onSubmit={handleCreateLeagueWithProduct}
        />
      )}

      <div className="space-y-6">
        <LeaguesList
          leagues={paginatedLeagues}
          onDelete={handleDeleteLeague}
          onCopy={handleCopyClick}
          onManageSchedule={handleManageSchedule}
        />
        
        {leaguesPagination.totalItems > 0 && (
          <Pagination
            pagination={leaguesPagination}
            onPageChange={handleLeaguesPageChange}
            onPageSizeChange={handleLeaguesPageSizeChange}
            loading={loading}
            itemName="leagues"
          />
        )}
      </div>

      <CopyLeagueDialog
        isOpen={copyDialogOpen}
        onClose={handleCopyCancel}
        onConfirm={handleCopyConfirm}
        league={leagueToCopy}
        saving={saving}
      />

      {/* Schedule Management Modal */}
      <Dialog open={showScheduleModal} onOpenChange={handleCloseScheduleModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#6F6F6F]">
              Schedule Management
            </DialogTitle>
            <DialogDescription className="text-sm text-[#6F6F6F] mt-2">
              Manage the league schedule - edit locations, times, and court assignments.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {scheduleData ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[#6F6F6F]">
                  {scheduleData.format === '3-teams-6-sets' ? '3 Teams (6 Sets)' : scheduleData.format} Format
                </h3>
                
                {/* Schedule Display */}
                {scheduleData.tiers && scheduleData.tiers.map((tier, index: number) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-semibold text-[#6F6F6F]">Tier {tier.tierNumber}</h4>
                      <div className="text-sm text-gray-600">
                        {scheduleData.date}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">Location</label>
                        <input 
                          type="text" 
                          value={tier.location} 
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          onChange={(e) => {
                            // TODO: Handle location update
                            void e.target.value; // Placeholder for future implementation
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">Time</label>
                        <input 
                          type="text" 
                          value={tier.time} 
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          onChange={(e) => {
                            // TODO: Handle time update
                            void e.target.value; // Placeholder for future implementation
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">Court</label>
                        <input 
                          type="text" 
                          value={tier.court} 
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          onChange={(e) => {
                            // TODO: Handle court update
                            void e.target.value; // Placeholder for future implementation
                          }}
                        />
                      </div>
                    </div>
                    
                    {/* Teams in this tier */}
                    <div className="bg-white p-3 rounded border">
                      <h5 className="font-medium text-gray-700 mb-2">Teams:</h5>
                      <div className="grid grid-cols-3 gap-2">
                        {Object.entries(tier.teams).map(([position, team]) => (
                          <div key={position} className="text-center">
                            <div className="text-xs font-medium text-gray-500 mb-1">Position {position}</div>
                            <div className="text-sm font-medium text-gray-900">
                              {team ? team.name : 'Empty'}
                            </div>
                            {team && (
                              <div className="text-xs text-gray-500">Rank #{team.ranking}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    onClick={handleCloseScheduleModal}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      // TODO: Implement save changes
                      showToast('Schedule updates will be implemented in a future update', 'info');
                    }}
                    className="px-4 py-2 bg-[#B20000] text-white rounded-md text-sm font-medium hover:bg-[#8A0000]"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">No schedule found for this league.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}