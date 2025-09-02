import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { useToast } from '../ui/toast';
import { 
  Users, 
  Search, 
  Filter, 
  Copy,
  AlertCircle,
  Clock
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';

interface Spare {
  id: string;
  user_id: string;
  sport_id: number;
  skill_level: 'beginner' | 'intermediate' | 'advanced' | 'competitive' | 'elite';
  availability_notes: string | null;
  share_phone: boolean;
  created_at: string;
  users: {
    name: string;
    email: string;
    phone: string | null;
  };
  sports: {
    name: string;
  };
}

interface SparesListViewProps {
  leagueId?: string;
  className?: string;
}

export const SparesListView: React.FC<SparesListViewProps> = ({ 
  leagueId, 
  className = '' 
}) => {
  const { user, userProfile } = useAuth();
  const { showToast } = useToast();
  
  const [spares, setSpares] = useState<Spare[]>([]);
  const [filteredSpares, setFilteredSpares] = useState<Spare[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [skillLevelFilter, setSkillLevelFilter] = useState<string>('all');
  const [userLeagues, setUserLeagues] = useState<string[]>([]);

  // Check if user is a captain
  const isTeamCaptain = userProfile?.is_admin || userLeagues.length > 0;

  // Fetch user's leagues (where they are captain)
  useEffect(() => {
    const fetchUserLeagues = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('teams')
          .select('league_id')
          .or(`captain_id.eq.${user.id},co_captain_id.eq.${user.id}`)
          .eq('is_active', true);

        if (error) {
          logger.error('Error fetching user leagues', error);
          return;
        }

        const leagueIds = [...new Set(data?.map(team => team.league_id) || [])];
        setUserLeagues(leagueIds);
      } catch (error) {
        logger.error('Error in fetchUserLeagues', error);
      }
    };

    fetchUserLeagues();
  }, [user]);

  // Fetch spares data
  useEffect(() => {
    const fetchSpares = async () => {
      if (!user || (!userProfile?.is_admin && userLeagues.length === 0)) {
        setLoading(false);
        return;
      }

      try {
        // Get volleyball sport ID first
        const { data: volleyballSport, error: sportError } = await supabase
          .from('sports')
          .select('id')
          .eq('name', 'Volleyball')
          .single();

        if (sportError) {
          logger.error('Error fetching volleyball sport', sportError);
          showToast('Failed to load volleyball spares list', 'error');
          return;
        }

        const query = supabase
          .from('spares')
          .select(`
            id,
            user_id,
            sport_id,
            skill_level,
            availability_notes,
            share_phone,
            created_at,
            users!user_id (
              name,
              email,
              phone
            ),
            sports!sport_id (
              name
            )
          `)
          .eq('is_active', true)
          .eq('sport_id', volleyballSport.id)
          .order('created_at', { ascending: false });

        // No additional filtering needed - all volleyball spares are accessible to captains

        const { data, error } = await query;

        if (error) {
          logger.error('Error fetching spares', error);
          showToast('Failed to load spares list', 'error');
          return;
        }

        // Transform the data to match our expected type structure
        const transformedData = (data || []).map(item => ({
          ...item,
          users: Array.isArray(item.users) ? item.users[0] : item.users,
          sports: Array.isArray(item.sports) ? item.sports[0] : item.sports
        })) as Spare[];
        setSpares(transformedData);
      } catch (error) {
        logger.error('Error in fetchSpares', error);
        showToast('Failed to load spares list', 'error');
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if user leagues are loaded
    if (userLeagues.length > 0 || userProfile?.is_admin) {
      fetchSpares();
    } else if (!user) {
      setLoading(false);
    }
  }, [user, userProfile, userLeagues, leagueId, showToast]);

  // Filter spares based on search and filters
  useEffect(() => {
    let filtered = spares;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(spare =>
        spare.users.name.toLowerCase().includes(term) ||
        spare.users.email.toLowerCase().includes(term) ||
        spare.sports.name.toLowerCase().includes(term)
      );
    }

    // Skill level filter
    if (skillLevelFilter !== 'all') {
      filtered = filtered.filter(spare => spare.skill_level === skillLevelFilter);
    }

    setFilteredSpares(filtered);
  }, [spares, searchTerm, skillLevelFilter]);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} copied to clipboard`, 'success');
    } catch (error) {
      logger.error('Failed to copy to clipboard', error);
      showToast(`Failed to copy ${label}`, 'error');
    }
  };


  const getSkillLevelColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'intermediate':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'advanced':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'competitive':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'elite':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (!user) {
    return (
      <Card className={className}>
        <CardContent className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-[#B20000] mx-auto mb-4" />
          <p className="text-[#6F6F6F]">Please log in to view the spares list.</p>
        </CardContent>
      </Card>
    );
  }

  if (!isTeamCaptain) {
    return (
      <Card className={className}>
        <CardContent className="text-center py-8">
          <Users className="h-12 w-12 text-[#6F6F6F] mx-auto mb-4" />
          <p className="text-[#6F6F6F]">
            Only team captains can view the spares list.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Loading Spares List...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Volleyball Spares List
        </CardTitle>
        <p className="text-sm text-[#6F6F6F]">
          Contact information for players available as substitutes.
          {spares.length === 0 ? ' No spares registered yet.' : ` ${spares.length} spare${spares.length === 1 ? '' : 's'} available.`}
        </p>
      </CardHeader>
      
      {spares.length > 0 && (
        <CardContent className="space-y-6">
          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, or league..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="sm:w-48 relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={skillLevelFilter}
                onChange={(e) => setSkillLevelFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#B20000] focus:border-transparent appearance-none"
              >
                <option value="all">All Skill Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="competitive">Competitive</option>
                <option value="elite">Elite</option>
              </select>
            </div>
          </div>

          {/* Spares List */}
          {filteredSpares.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-[#6F6F6F] mx-auto mb-4" />
              <p className="text-[#6F6F6F]">
                {searchTerm || skillLevelFilter !== 'all' 
                  ? 'No spares match your search criteria.' 
                  : 'No spares available at the moment.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSpares.map((spare) => (
                <Card key={spare.id} className="border border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      {/* Player Info */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-lg">{spare.users.name}</h3>
                          <Badge className={getSkillLevelColor(spare.skill_level)}>
                            {spare.skill_level.charAt(0).toUpperCase() + spare.skill_level.slice(1)}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-[#6F6F6F]">
                            <Users className="h-4 w-4" />
                            <span>{spare.sports.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-[#6F6F6F]">
                            <Clock className="h-4 w-4" />
                            <span>Joined {formatDate(spare.created_at)}</span>
                          </div>
                        </div>

                        {spare.availability_notes && (
                          <div className="bg-gray-50 rounded p-3 mt-2">
                            <p className="text-sm text-[#6F6F6F]">
                              <strong>Availability:</strong> {spare.availability_notes}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Contact Actions */}
                      <div className={`flex gap-1 lg:min-w-[150px] ${!(spare.users.phone && spare.share_phone) ? 'justify-end' : ''}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(spare.users.email, 'Email')}
                          className="flex items-center gap-1 text-xs"
                        >
                          <Copy className="h-3 w-3" />
                          Email
                        </Button>
                        
                        {spare.users.phone && spare.share_phone && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(spare.users.phone!, 'Phone')}
                            className="flex items-center gap-1 text-xs"
                          >
                            <Copy className="h-3 w-3" />
                            Phone
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};