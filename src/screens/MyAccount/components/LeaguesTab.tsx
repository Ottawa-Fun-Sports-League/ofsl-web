import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/ui/toast';
import { useNavigate } from 'react-router-dom';
import { LeaguesHeader } from './LeaguesTab/components/LeaguesHeader';
import { LeaguesList } from './LeaguesTab/components/LeaguesList';
import { LeaguesListView } from './LeaguesTab/components/LeaguesListView';
import { ViewToggle } from './LeaguesTab/components/ViewToggle';
import { CopyLeagueDialog } from './LeaguesTab/components/CopyLeagueDialog';
import { LeagueTeamsModal } from './LeaguesTab/components/LeagueTeamsModal';
import { MobileFilterDrawer } from './LeaguesTab/components/MobileFilterDrawer';
import { useLeaguesData } from './LeaguesTab/hooks/useLeaguesData';
import { useLeagueActions } from './LeaguesTab/hooks/useLeagueActions';
import { LeagueWithTeamCount } from './LeaguesTab/types';
import { LeagueFilters, useLeagueFilters, filterLeagues, DEFAULT_FILTER_OPTIONS } from '../../../components/leagues/filters';
import { getSportIcon } from '../../LeagueDetailPage/utils/leagueUtils';
import { fetchSports, fetchSkills } from '../../../lib/leagues';
import { useViewPreference } from '../../../hooks/useViewPreference';

export function LeaguesTab() {
  const { userProfile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [leagueToCopy, setLeagueToCopy] = useState<LeagueWithTeamCount | null>(null);
  const [teamsModalOpen, setTeamsModalOpen] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState<LeagueWithTeamCount | null>(null);
  const [sports, setSports] = useState<Array<{ id: number; name: string }>>([]);
  const [skills, setSkills] = useState<Array<{ id: number; name: string }>>([]);
  const [viewMode, setViewMode] = useViewPreference({ 
    key: 'myaccount-leagues', 
    defaultView: 'card' 
  });


  const {
    leagues,
    archivedLeagues,
    loading,
    loadData
  } = useLeaguesData();
  
  // Use the shared filter hook
  const {
    filters,
    openDropdown,
    showMobileFilterDrawer,
    setShowMobileFilterDrawer,
    dropdownRefs,
    toggleDropdown,
    handleFilterChange,
    clearFilters,
    clearSkillLevels,
    isAnyFilterActive
  } = useLeagueFilters();

  const {
    saving,
    handleDeleteLeague,
    handleCopyLeague
  } = useLeagueActions({ loadData, showToast });

  useEffect(() => {
    const loadAllData = async () => {
      loadData();
      try {
        const [sportsData, skillsData] = await Promise.all([
          fetchSports(),
          fetchSkills()
        ]);
        setSports(sportsData);
        setSkills(skillsData);
      } catch (error) {
        console.error('Error loading sports/skills:', error);
      }
    };
    loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateNewLeague = () => {
    navigate('/my-account/leagues/new');
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


  const handleTeamsModalClose = () => {
    setTeamsModalOpen(false);
    setSelectedLeague(null);
  };

  // Schedule management handlers
  const handleManageSchedule = (leagueId: number) => {
    navigate(`/leagues/${leagueId}/schedule`);
  };

  const [showArchived, setShowArchived] = useState(false);
  
  
  // Filter leagues using the shared filter function
  const filteredLeagues = filterLeagues(leagues, filters, skills) as LeagueWithTeamCount[];
  const filteredArchivedLeagues = filterLeagues(archivedLeagues, filters, skills) as LeagueWithTeamCount[];
  
  // Customize filter options for admin page
  const filterOptions = {
    ...DEFAULT_FILTER_OPTIONS,
    location: ["All Locations", "Central", "East", "West", "South", "Gatineau"]
  };

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
      <LeaguesHeader onCreateNew={handleCreateNewLeague} />

      {/* League Filters */}
      <LeagueFilters
        filters={filters}
        filterOptions={filterOptions}
        sports={sports}
        skills={skills}
        openDropdown={openDropdown}
        dropdownRefs={dropdownRefs}
        onFilterChange={handleFilterChange}
        onToggleDropdown={toggleDropdown}
        onClearFilters={clearFilters}
        onClearSkillLevels={clearSkillLevels}
        isAnyFilterActive={isAnyFilterActive}
        onShowMobileFilters={() => setShowMobileFilterDrawer(true)}
        getSportIcon={getSportIcon}
        hideOnMobile={true}
      />

      {/* View Toggle */}
      <div className="flex justify-between items-center">
        <ViewToggle 
          view={viewMode as 'card' | 'list'} 
          onViewChange={(view) => setViewMode(view)} 
        />
        <div className="text-sm text-gray-600">
          {filteredLeagues.length} {filteredLeagues.length === 1 ? 'league' : 'leagues'} found
        </div>
      </div>

      {viewMode === 'card' ? (
        <LeaguesList
          leagues={filteredLeagues}
          onDelete={handleDeleteLeague}
          onCopy={handleCopyClick}
          onManageSchedule={handleManageSchedule}
        />
      ) : (
        <LeaguesListView
          leagues={filteredLeagues}
          onDelete={handleDeleteLeague}
          onCopy={handleCopyClick}
          onManageSchedule={handleManageSchedule}
        />
      )}

      {filteredArchivedLeagues.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#6F6F6F]">Archived Leagues</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowArchived((prev) => !prev)}
              className="text-[#B20000] hover:text-[#8A0000]"
            >
              {showArchived ? 'Hide archive' : `Show archive (${filteredArchivedLeagues.length})`}
            </Button>
          </div>

          {showArchived && (
            <div className="mt-4">
              {viewMode === 'card' ? (
                <LeaguesList
                  leagues={filteredArchivedLeagues}
                  onDelete={handleDeleteLeague}
                  onCopy={handleCopyClick}
                  onManageSchedule={handleManageSchedule}
                />
              ) : (
                <LeaguesListView
                  leagues={filteredArchivedLeagues}
                  onDelete={handleDeleteLeague}
                  onCopy={handleCopyClick}
                  onManageSchedule={handleManageSchedule}
                />
              )}
            </div>
          )}
        </div>
      )}

      <CopyLeagueDialog
        isOpen={copyDialogOpen}
        onClose={handleCopyCancel}
        onConfirm={handleCopyConfirm}
        league={leagueToCopy}
        saving={saving}
      />
      
      <LeagueTeamsModal
        isOpen={teamsModalOpen}
        onClose={handleTeamsModalClose}
        league={selectedLeague}
      />

      {/* Mobile Filter Drawer */}
      <MobileFilterDrawer
        isOpen={showMobileFilterDrawer}
        onClose={() => setShowMobileFilterDrawer(false)}
        filters={filters}
        handleFilterChange={(filterType: string, value: string) => handleFilterChange(filterType as keyof typeof filters, value)}
        clearFilters={clearFilters}
        sports={sports}
        skills={skills}
        filterOptions={filterOptions}
        isAnyFilterActive={isAnyFilterActive}
        clearSkillLevels={clearSkillLevels}
        getSportIcon={getSportIcon}
      />
    </div>
  );
}
