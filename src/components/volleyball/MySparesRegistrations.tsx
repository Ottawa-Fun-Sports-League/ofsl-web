import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useToast } from '../ui/toast';
import { 
  Users, 
  Trash2, 
  Edit, 
  Calendar,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';

interface SparesRegistration {
  id: string;
  user_id: string;
  league_id: string;
  skill_level: 'beginner' | 'intermediate' | 'advanced' | 'competitive' | 'elite';
  availability_notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  leagues: {
    id: string;
    name: string;
    sport: string;
    level: string | null;
    is_active: boolean;
  };
}

interface MySparesRegistrationsProps {
  className?: string;
  onEditRegistration?: (registration: SparesRegistration) => void;
}

export const MySparesRegistrations: React.FC<MySparesRegistrationsProps> = ({ 
  className = '',
  onEditRegistration
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [registrations, setRegistrations] = useState<SparesRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch user's spares registrations
  useEffect(() => {
    const fetchRegistrations = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('volleyball_spares')
          .select(`
            id,
            user_id,
            league_id,
            skill_level,
            availability_notes,
            is_active,
            created_at,
            updated_at,
            leagues!league_id (
              id,
              name,
              sport,
              level,
              is_active
            )
          `)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (error) {
          logger.error('Error fetching spares registrations', error);
          showToast('Failed to load your spares registrations', 'error');
          return;
        }

        // Transform the data to match our expected type structure
        const transformedData = (data || []).map(item => ({
          ...item,
          leagues: Array.isArray(item.leagues) ? item.leagues[0] : item.leagues
        })) as SparesRegistration[];
        setRegistrations(transformedData);
      } catch (error) {
        logger.error('Error in fetchRegistrations', error);
        showToast('Failed to load your spares registrations', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchRegistrations();
  }, [user, showToast]);

  const handleRemoveRegistration = async (registrationId: string, leagueName: string) => {
    if (!confirm(`Are you sure you want to remove yourself from the spares list for ${leagueName}?`)) {
      return;
    }

    setDeletingId(registrationId);

    try {
      // Use the helper function to deactivate the registration
      const { error } = await supabase.rpc('deactivate_volleyball_spare', {
        p_user_id: user!.id,
        p_registration_id: registrationId
      });

      if (error) {
        logger.error('Error removing spares registration', error);
        showToast('Failed to remove registration. Please try again.', 'error');
        return;
      }

      // Remove from local state
      setRegistrations(prev => prev.filter(reg => reg.id !== registrationId));
      showToast(`Successfully removed from ${leagueName} spares list`, 'success');
    } catch (error) {
      logger.error('Error in handleRemoveRegistration', error);
      showToast('Failed to remove registration. Please try again.', 'error');
    } finally {
      setDeletingId(null);
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
          <Users className="h-12 w-12 text-[#6F6F6F] mx-auto mb-4" />
          <p className="text-[#6F6F6F]">Please log in to view your spares registrations.</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Loading Your Spares Registrations...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded animate-pulse" />
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
          My Volleyball Spares Registrations
        </CardTitle>
        <p className="text-sm text-[#6F6F6F]">
          {registrations.length === 0 
            ? 'You are not registered as a spare for any volleyball leagues.' 
            : `You are registered as a spare for ${registrations.length} volleyball league${registrations.length === 1 ? '' : 's'}.`
          }
        </p>
      </CardHeader>
      
      <CardContent>
        {registrations.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-[#6F6F6F] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#6F6F6F] mb-2">
              No Spares Registrations
            </h3>
            <p className="text-[#6F6F6F] mb-4">
              You haven&apos;t joined any volleyball spares lists yet.
            </p>
            <Button
              onClick={() => window.location.hash = '#/volleyball'}
              className="bg-[#B20000] hover:bg-[#8A0000] text-white"
            >
              Browse Volleyball Leagues
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {registrations.map((registration) => (
              <Card key={registration.id} className="border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Registration Info */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg">{registration.leagues.name}</h3>
                        <Badge className={getSkillLevelColor(registration.skill_level)}>
                          {registration.skill_level.charAt(0).toUpperCase() + registration.skill_level.slice(1)}
                        </Badge>
                        {!registration.leagues.is_active && (
                          <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                            League Inactive
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-[#6F6F6F]">
                        <Calendar className="h-4 w-4" />
                        <span>Joined {formatDate(registration.created_at)}</span>
                        {registration.updated_at !== registration.created_at && (
                          <span>• Updated {formatDate(registration.updated_at)}</span>
                        )}
                      </div>

                      {registration.availability_notes && (
                        <div className="bg-gray-50 rounded p-3 mt-2">
                          <p className="text-sm text-[#6F6F6F]">
                            <strong>Your Availability:</strong> {registration.availability_notes}
                          </p>
                        </div>
                      )}

                      {/* Status indicator */}
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-green-700 font-medium">
                          Active - Captains can contact you
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 lg:min-w-[120px]">
                      {onEditRegistration && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEditRegistration(registration)}
                          className="flex items-center gap-1"
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveRegistration(registration.id, registration.leagues.name)}
                        disabled={deletingId === registration.id}
                        className="flex items-center gap-1 text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        {deletingId === registration.id ? 'Removing...' : 'Remove'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Privacy reminder */}
            <Card className="bg-blue-50 border border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-1">Privacy Reminder</h4>
                    <p className="text-sm text-blue-800">
                      Your contact information (name, phone, email) is shared with team captains 
                      in the leagues where you&apos;re registered as a spare. You can remove yourself 
                      from any spares list at any time.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
};