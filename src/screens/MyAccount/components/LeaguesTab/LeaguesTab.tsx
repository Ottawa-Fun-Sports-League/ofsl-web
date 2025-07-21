import { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../components/ui/toast';
import { updateStripeProductLeagueId } from '../../../../lib/stripe';
import { Card, CardContent } from '../../../../components/ui/card';
import { LeaguesHeader } from './components/LeaguesHeader';
import { NewLeagueForm } from './components/NewLeagueForm';
import { LeaguesList } from './components/LeaguesList';
import { CopyLeagueDialog } from './components/CopyLeagueDialog';
import { useLeaguesData } from './hooks/useLeaguesData';
import { useLeagueActions } from './hooks/useLeagueActions';
import { LeagueWithTeamCount, NewLeague } from './types';

export function LeaguesTab() {
  const { userProfile } = useAuth();
  const { showToast } = useToast();
  const [showNewLeagueForm, setShowNewLeagueForm] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [leagueToCopy, setLeagueToCopy] = useState<LeagueWithTeamCount | null>(null);

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


  useEffect(() => {
    loadData();
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