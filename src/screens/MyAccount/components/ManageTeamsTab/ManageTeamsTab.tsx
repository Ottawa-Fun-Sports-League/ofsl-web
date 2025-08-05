import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../contexts/AuthContext';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Card, CardContent } from '../../../../components/ui/card';
import { Search, Edit, Users, Calendar, User, LayoutGrid, Table } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ManageTeamsTableView } from './ManageTeamsTableView';

interface Team {
  id: number;
  name: string;
  captain_id: string;
  captain_name: string;
  captain_email: string;
  league_id: number;
  league_name: string;
  roster_count: number;
  created_at: string;
  active: boolean;
}

export function ManageTeamsTab() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'table'>(() => {
    // Get saved preference from localStorage
    const saved = localStorage.getItem('manage_teams_view_mode');
    return (saved as 'card' | 'table') || 'card';
  });

  useEffect(() => {
    if (userProfile?.is_admin) {
      fetchAllTeams();
    }
  }, [userProfile]);

  useEffect(() => {
    // Filter teams based on search term
    if (searchTerm.trim() === '') {
      setFilteredTeams(teams);
    } else {
      const search = searchTerm.toLowerCase();
      const filtered = teams.filter(team => 
        team.name.toLowerCase().includes(search) ||
        team.captain_email.toLowerCase().includes(search) ||
        team.captain_name.toLowerCase().includes(search)
      );
      setFilteredTeams(filtered);
    }
  }, [searchTerm, teams]);

  const fetchAllTeams = async () => {
    try {
      setLoading(true);
      
      // Fetch all teams with captain and league information
      const { data, error } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          captain_id,
          roster,
          active,
          created_at,
          league_id,
          users!teams_captain_id_fkey (
            name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching teams:', error);
        return;
      }

      // Fetch leagues separately
      const { data: leagues, error: leaguesError } = await supabase
        .from('leagues')
        .select('id, name');

      if (leaguesError) {
        console.error('Error fetching leagues:', leaguesError);
      }

      // Create a league map for easy lookup
      const leagueMap = new Map<number, string>();
      leagues?.forEach(league => {
        leagueMap.set(league.id, league.name);
      });

      // Transform the data
      const transformedTeams: Team[] = (data || []).map(team => ({
        id: team.id,
        name: team.name,
        captain_id: team.captain_id,
        captain_name: Array.isArray(team.users) ? team.users[0]?.name || 'Unknown' : (team.users as { name: string | null; email: string | null } | null)?.name || 'Unknown',
        captain_email: Array.isArray(team.users) ? team.users[0]?.email || 'Unknown' : (team.users as { name: string | null; email: string | null } | null)?.email || 'Unknown',
        league_id: team.league_id,
        league_name: leagueMap.get(team.league_id) || 'Unknown League',
        roster_count: team.roster?.length || 0,
        created_at: team.created_at,
        active: team.active
      }));

      setTeams(transformedTeams);
      setFilteredTeams(transformedTeams);
    } catch (error) {
      console.error('Error loading teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTeam = (team: Team) => {
    // Navigate to the league teams page
    navigate(`/leagues/${team.league_id}/teams`);
  };

  if (!userProfile?.is_admin) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">You don&apos;t have permission to view this page.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B20000]"></div>
        <span className="ml-2 text-gray-600">Loading teams...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-[#6F6F6F]">Manage Teams</h2>
        <p className="text-[#6F6F6F] mt-1">
          View and manage all teams across leagues
        </p>
      </div>

      {/* Search Bar and View Toggle */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="text"
              placeholder="Search by team name or captain email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="text-sm text-gray-600">
            {filteredTeams.length} of {teams.length} teams
          </div>
        </div>
        
        {/* View Mode Toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'card' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setViewMode('card');
              localStorage.setItem('manage_teams_view_mode', 'card');
            }}
            className={viewMode === 'card' ? 'bg-[#B20000] hover:bg-[#8A0000]' : ''}
          >
            <LayoutGrid className="h-4 w-4 mr-1" />
            Card
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setViewMode('table');
              localStorage.setItem('manage_teams_view_mode', 'table');
            }}
            className={viewMode === 'table' ? 'bg-[#B20000] hover:bg-[#8A0000]' : ''}
          >
            <Table className="h-4 w-4 mr-1" />
            Table
          </Button>
        </div>
      </div>

      {/* Teams List */}
      {filteredTeams.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">
              {searchTerm ? 'No teams found matching your search.' : 'No teams registered yet.'}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'card' ? (
        <div className="space-y-4">
          {filteredTeams.map((team) => (
            <Card key={team.id} className={!team.active ? 'opacity-60' : ''}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{team.name}</h3>
                      {!team.active && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          Inactive
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-gray-600">
                          <User className="h-4 w-4" />
                          <span>Captain: {team.captain_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <span className="ml-6">{team.captain_email}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>League: {team.league_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Users className="h-4 w-4" />
                          <span>{team.roster_count} players</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-2 text-xs text-gray-500">
                      Registered: {new Date(team.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => handleEditTeam(team)}
                    size="sm"
                    variant="outline"
                    className="ml-4"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <ManageTeamsTableView
          teams={filteredTeams}
          onEditTeam={handleEditTeam}
        />
      )}
    </div>
  );
}