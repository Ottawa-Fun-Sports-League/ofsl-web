import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../../components/ui/card';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/ui/toast';
import { useNavigate } from 'react-router-dom';
import { LeaguesHeader } from './LeaguesTab/components/LeaguesHeader';
import { LeaguesList } from './LeaguesTab/components/LeaguesList';
import { CopyLeagueDialog } from './LeaguesTab/components/CopyLeagueDialog';
import { useLeaguesData } from './LeaguesTab/hooks/useLeaguesData';
import { useLeagueActions } from './LeaguesTab/hooks/useLeagueActions';
import { LeagueWithTeamCount } from './LeaguesTab/types';

export function LeaguesTab() {
  const { userProfile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [leagueToCopy, setLeagueToCopy] = useState<LeagueWithTeamCount | null>(null);

  const {
    leagues,
    loading,
    loadData
  } = useLeaguesData();

  const {
    saving,
    handleDeleteLeague,
    handleCopyLeague
  } = useLeagueActions({ loadData, showToast });

  useEffect(() => {
    loadData();
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

      <LeaguesList
        leagues={leagues}
        onDelete={handleDeleteLeague}
        onCopy={handleCopyClick}
      />

      <CopyLeagueDialog
        isOpen={copyDialogOpen}
        onClose={handleCopyCancel}
        onConfirm={handleCopyConfirm}
        league={leagueToCopy}
        saving={saving}
      />
    </div>
  );
}