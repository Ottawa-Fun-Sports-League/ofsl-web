import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, DollarSign } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { AdminLeagueSchedule } from './components/AdminLeagueSchedule';
import { useScoreSubmissionModal } from '../LeagueDetailPage/hooks/useLeagueDetail';

interface League {
  id: number;
  name: string;
  sport_name: string;
  location: string;
  cost: number;
  team_registration?: boolean;
}

export function LeagueSchedulePage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();
  const [league, setLeague] = useState<League | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userProfile } = useAuth();
  const { 
    showScoreSubmissionModal, 
    selectedTier, 
    closeScoreSubmissionModal 
  } = useScoreSubmissionModal();

  useEffect(() => {
    if (leagueId && userProfile) {
      loadLeagueData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId]);

  const loadLeagueData = async () => {
    try {
      const { data, error } = await supabase
        .from('leagues')
        .select(`
          id,
          name,
          location,
          cost,
          team_registration,
          sports:sport_id(name)
        `)
        .eq('id', parseInt(leagueId!))
        .single();

      if (error) throw error;

      setLeague({
        id: data.id,
        name: data.name,
        sport_name: data.sports && Array.isArray(data.sports) && data.sports.length > 0 
          ? data.sports[0].name 
          : (data.sports && typeof data.sports === 'object' && 'name' in data.sports 
            ? (data.sports as { name: string }).name 
            : ''),
        location: data.location || '',
        cost: data.cost || 0,
        team_registration: data.team_registration
      });
      
      return data.team_registration;
    } catch (err) {
      console.error('Error loading league:', err);
      setError('Failed to load league data');
      return true; // Default to team registration
    } finally {
      setLoading(false);
    }
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B20000]"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !league) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <p className="text-red-600 text-lg">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Enhanced Header */}
        <div className="mb-8">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center text-[#B20000] hover:underline mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-1" />
            Back
          </button>
          
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-4">
              <div>
                <h1 className="text-3xl font-bold text-[#6F6F6F] mb-2">
                  {league?.name} - Schedule Management
                </h1>
                <p className="text-[#6F6F6F] mb-2">
                  Sport: {league?.sport_name} | Location: {league?.location}
                </p>
                {/* League Cost Display */}
                {league?.cost && (
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 text-[#B20000] mr-1.5" />
                    <p className="text-sm font-medium text-[#6F6F6F]">
                      ${league.cost} + HST {league.sport_name === "Volleyball" ? "per team" : "per player"}
                    </p>
                  </div>
                )}
              </div>
              
              {/* Admin Actions */}
              {userProfile?.is_admin && league?.id && (
                <div className="flex flex-col gap-2">
                  <Link
                    to={`/my-account/leagues/edit/${league.id}`}
                    className="text-[#B20000] hover:underline text-sm whitespace-nowrap"
                  >
                    Edit league
                  </Link>
                  <Link
                    to={`/leagues/${league.id}/teams`}
                    className="text-[#B20000] hover:underline text-sm whitespace-nowrap"
                  >
                    Manage teams
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Schedule Content */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <AdminLeagueSchedule 
            leagueId={leagueId!}
            leagueName={league?.name || ''}
          />
        </div>
      </div>

      {/* Score Submission Modal */}
      {showScoreSubmissionModal && selectedTier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-[#6F6F6F]">Submit Scores - Tier {selectedTier}</h2>
                <button 
                  onClick={closeScoreSubmissionModal}
                  className="text-gray-500 hover:text-gray-700 bg-transparent hover:bg-gray-100 rounded-full p-2 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="text-center py-8">
                <p className="text-gray-600">Score submission functionality will be implemented in a future update.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}