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
import {
  formatGenderIdentityLabel,
  formatVolleyballPositionLabel,
  getSportBranding
} from './sparesOptions';

interface Spare {
  id: string;
  user_id: string;
  sport_id: number;
  skill_level: 'beginner' | 'intermediate' | 'advanced' | 'competitive' | 'elite';
  available_monday: boolean;
  available_tuesday: boolean;
  available_wednesday: boolean;
  available_thursday: boolean;
  available_friday: boolean;
  available_saturday: boolean;
  available_sunday: boolean;
  share_phone: boolean;
  gender_identity: string | null;
  gender_identity_other: string | null;
  volleyball_positions: string[] | null;
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

interface Sport {
  id: number;
  name: string;
  active: boolean;
}

interface SparesListViewProps {
  sportFilter?: string; // Optional filter to show only specific sport
  className?: string;
}

export const SparesListView: React.FC<SparesListViewProps> = ({ 
  sportFilter,
  className = '' 
}) => {
  const { user, userProfile } = useAuth();
  const { showToast } = useToast();
  
  const [spares, setSpares] = useState<Spare[]>([]);
  const [filteredSpares, setFilteredSpares] = useState<Spare[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [skillLevelFilter, setSkillLevelFilter] = useState<string>('all');
  const [selectedSport, setSelectedSport] = useState<string>('');
  const [availableSports, setAvailableSports] = useState<Sport[]>([]);
  const [hasAccess, setHasAccess] = useState(false);
  const [accessReason, setAccessReason] = useState('');

  // Check user's access to spares lists
  useEffect(() => {
    const checkAccess = async () => {
      if (!user || !userProfile) {
        setHasAccess(false);
        setAccessReason('Please log in to view the spares list.');
        return;
      }

      // Admins have access to all spares
      if (userProfile.is_admin) {
        setHasAccess(true);
        setAccessReason('admin');
        
        // Fetch all active sports for admin
        const { data: sports, error: sportsError } = await supabase
          .from('sports')
          .select('id, name, active')
          .eq('active', true);

        if (!sportsError) {
          setAvailableSports(sports || []);
        }
        return;
      }

      try {
        // Base access: all authenticated users can view individual sport spares (e.g., Badminton, Pickleball)
        const { data: sports, error: sportsError } = await supabase
          .from('sports')
          .select('id, name, active')
          .eq('active', true);

        if (sportsError) {
          logger.error('Error loading sports', sportsError);
          setHasAccess(false);
          setAccessReason("We couldn't verify your access right now. Please try again.");
          return;
        }

        const allSports = sports || [];
        const allowedNames = new Set(['Badminton', 'Pickleball']);

        // Volleyball access is granted to captains/co-captains of active volleyball teams
        let canViewVolleyball = false;
        const vb = allSports.find(s => s.name?.toLowerCase() === 'volleyball');
        if (vb) {
          try {
            const { data: captainTeams, error: captainErr } = await supabase
              .from('teams')
              .select('id, captain_id, co_captains, active, leagues:league_id(sport_id, end_date, active)')
              .eq('active', true);

            if (!captainErr && captainTeams) {
              canViewVolleyball = captainTeams.some(t => {
                const isCaptain = t.captain_id === userProfile.id;
                const isCoCap = Array.isArray(t.co_captains) && t.co_captains.includes(userProfile.id);
                const league = (t as any).leagues;
                const isVbLeague = league && league.sport_id === vb.id;
                const leagueActive = league && (league.active === true || !league.end_date || new Date(league.end_date) >= new Date());
                return (isCaptain || isCoCap) && isVbLeague && leagueActive;
              });
            }
          } catch (e) {
            logger.error('Volleyball captain check failed', e);
          }
        }

        // Build accessible sports list
        const accessible = allSports.filter(s => allowedNames.has(s.name));
        if (canViewVolleyball && vb) accessible.push(vb);

        setAvailableSports(accessible);
        setHasAccess(true);
        setAccessReason(canViewVolleyball ? 'volleyball-captain' : 'individual-access');
      } catch (error) {
        logger.error('Error in checkAccess', error);
        setHasAccess(false);
        setAccessReason("We couldn't verify your access right now. Please try again.");
      }
    };

    checkAccess();
  }, [user, userProfile]);

  // Fetch spares data
  useEffect(() => {
    const fetchSpares = async () => {
      if (!hasAccess || availableSports.length === 0) {
        setLoading(false);
        return;
      }

      try {
        let query = supabase
          .from('spares')
          .select(`
            id,
            user_id,
            sport_id,
            skill_level,
            available_monday,
            available_tuesday,
            available_wednesday,
            available_thursday,
            available_friday,
            available_saturday,
            available_sunday,
            share_phone,
            gender_identity,
            gender_identity_other,
            volleyball_positions,
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
          .order('created_at', { ascending: false });

        // Filter by accessible sports
        if (accessReason !== 'admin') {
          const sportIds = availableSports.map(s => s.id);
          query = query.in('sport_id', sportIds);
        }

        // Apply sport filter if provided
        if (sportFilter) {
          const sport = availableSports.find(s => 
            s.name.toLowerCase() === sportFilter.toLowerCase()
          );
          if (sport) {
            query = query.eq('sport_id', sport.id);
          }
        } else if (selectedSport) {
          query = query.eq('sport_id', parseInt(selectedSport));
        }

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

    fetchSpares();
  }, [hasAccess, accessReason, availableSports, selectedSport, sportFilter, showToast]);

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

  const getAvailableDays = (spare: Spare) => {
    const days = [];
    if (spare.available_monday) days.push('Mon');
    if (spare.available_tuesday) days.push('Tue');
    if (spare.available_wednesday) days.push('Wed');
    if (spare.available_thursday) days.push('Thu');
    if (spare.available_friday) days.push('Fri');
    if (spare.available_saturday) days.push('Sat');
    if (spare.available_sunday) days.push('Sun');
    
    if (days.length === 0) return 'No days selected';
    if (days.length === 7) return 'All days';
    return days.join(', ');
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

  if (!hasAccess) {
    return (
      <Card className={className}>
        <CardContent className="text-center py-8">
          <Users className="h-12 w-12 text-[#6F6F6F] mx-auto mb-4" />
          <p className="text-[#6F6F6F]">{accessReason}</p>
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
          Spares List
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
                placeholder="Search by name, email, or sport..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Sport Filter - only show if not filtered and multiple sports available */}
            {!sportFilter && availableSports.length > 1 && (
              <div className="sm:w-48 relative">
                <select
                  value={selectedSport}
                  onChange={(e) => setSelectedSport(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#B20000] focus:border-transparent appearance-none"
                >
                  <option value="">All Sports</option>
                  {availableSports.map((sport) => (
                    <option key={sport.id} value={sport.id}>
                      {sport.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
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
              {filteredSpares.map((spare) => {
                const branding = getSportBranding(spare.sports.name);
                const genderLabel = formatGenderIdentityLabel(spare.gender_identity, spare.gender_identity_other);
                const isVolleyball = spare.sports.name.toLowerCase() === 'volleyball';
                const positionLabel = isVolleyball ? formatVolleyballPositionLabel(spare.volleyball_positions) : null;

                return (
                  <Card key={spare.id} className="border border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        {/* Player Info */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="font-semibold text-lg">{spare.users.name}</h3>
                            <Badge className={getSkillLevelColor(spare.skill_level)}>
                              {spare.skill_level.charAt(0).toUpperCase() + spare.skill_level.slice(1)}
                            </Badge>
                            <span className={`inline-flex items-center rounded-full border ${branding.border} ${branding.background} ${branding.accent} px-3 py-1 text-xs font-semibold uppercase tracking-wide`}>
                              {spare.sports.name}
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-3 text-sm text-[#6F6F6F]">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              <span>{spare.users.email}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span>Joined {formatDate(spare.created_at)}</span>
                            </div>
                          </div>

                          <div className="bg-gray-50 rounded p-3 mt-2">
                            <p className="text-sm text-[#6F6F6F]">
                              <strong>Available:</strong> {getAvailableDays(spare)}
                            </p>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded border border-gray-200 bg-white p-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Gender identity</p>
                              <p className="text-sm text-[#6F6F6F]">{genderLabel}</p>
                            </div>
                            {isVolleyball && (
                              <div className="rounded border border-orange-200 bg-orange-50 p-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-orange-500 mb-1">Volleyball positions</p>
                                <p className="text-sm text-orange-700">{positionLabel}</p>
                              </div>
                            )}
                          </div>
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
                );
              })}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};
