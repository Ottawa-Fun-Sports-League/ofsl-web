import React, { useState, useEffect, useCallback } from 'react';
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
  CheckCircle,
  Plus
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { SparesSignupModal } from './SparesSignupModal';
import { SparesEditModal } from './SparesEditModal';

interface SparesRegistration {
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
  is_active: boolean;
  created_at: string;
  updated_at: string;
  sports: {
    id: number;
    name: string;
    description: string;
    active: boolean;
  };
}

interface MySparesRegistrationsProps {
  className?: string;
  onSparesChange?: () => void;
}

export const MySparesRegistrations: React.FC<MySparesRegistrationsProps> = ({ 
  className = '',
  onSparesChange
}) => {
  const { userProfile } = useAuth();
  const { showToast } = useToast();
  
  const [registrations, setRegistrations] = useState<SparesRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRegistration, setEditingRegistration] = useState<SparesRegistration | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    registration: SparesRegistration;
    show: boolean;
  } | null>(null);

  // Define fetchRegistrations first
  const fetchRegistrations = useCallback(async () => {
    if (!userProfile) {
      setLoading(false);
      return;
    }

    try {
      
      // Fetch only the current user's registrations
      // RLS will also enforce this, but we add the filter explicitly for clarity
      const { data, error } = await supabase
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
          is_active,
          created_at,
          updated_at,
          sports!sport_id (
            id,
            name,
            description,
            active
          )
        `)
        .eq('user_id', userProfile.id)
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
        sports: Array.isArray(item.sports) ? item.sports[0] : item.sports
      })) as SparesRegistration[];
      setRegistrations(transformedData);
    } catch (error) {
      logger.error('Error in fetchRegistrations', error);
      showToast('Failed to load your spares registrations', 'error');
    } finally {
      setLoading(false);
    }
  }, [userProfile, showToast]);

  // Fetch user's spares registrations on component mount
  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations, userProfile]);

  const handleSignupSuccess = async () => {
    // Refetch registrations to show the new one
    await fetchRegistrations();
    // Notify parent about spares change to refresh other components
    onSparesChange?.();
    // Modal will close with a small delay from the modal component
  };

  const handleEditRegistration = (registration: SparesRegistration) => {
    setEditingRegistration(registration);
  };

  const handleEditSuccess = async () => {
    // Refetch registrations to show updated data
    await fetchRegistrations();
    // Notify parent about spares change to refresh other components
    onSparesChange?.();
    setEditingRegistration(null);
  };

  // Inline edit removed; revert to modal editing

  const handleRemoveClick = (registration: SparesRegistration) => {
    setConfirmDelete({ registration, show: true });
  };

  const handleConfirmRemove = async () => {
    if (!confirmDelete) return;
    
    const { registration } = confirmDelete;
    const registrationId = registration.id;
    const sportName = registration.sports.name;
    
    setConfirmDelete(null);

    setDeletingId(registrationId);

    try {
      // Delete the record entirely to avoid unique constraint issues
      // For spares registration, we don't need to keep historical inactive records
      const { error } = await supabase
        .from('spares')
        .delete()
        .eq('id', registrationId)
        .select();

      if (error) {
        logger.error('Error deleting spares registration', error);
        showToast('Failed to remove registration. Please try again.', 'error');
        return;
      }

      // Remove from local state
      setRegistrations(prev => prev.filter(reg => reg.id !== registrationId));
      showToast(`Successfully removed from ${sportName} spares list`, 'success');
      
      // Refresh the data to ensure consistency
      await fetchRegistrations();
      // Notify parent about spares change to refresh other components
      onSparesChange?.();
    } catch (error) {
      logger.error('Error in handleRemoveRegistration', error);
      showToast('Failed to remove registration. Please try again.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const getSkillLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
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

  const getAvailableDays = (registration: SparesRegistration) => {
    const days = [];
    if (registration.available_monday) days.push('Mon');
    if (registration.available_tuesday) days.push('Tue');
    if (registration.available_wednesday) days.push('Wed');
    if (registration.available_thursday) days.push('Thu');
    if (registration.available_friday) days.push('Fri');
    if (registration.available_saturday) days.push('Sat');
    if (registration.available_sunday) days.push('Sun');
    
    if (days.length === 0) return 'No days selected';
    if (days.length === 7) return 'All days';
    return days.join(', ');
  };

  if (!userProfile) {
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              My Spares Registrations
            </CardTitle>
            <p className="text-sm text-[#6F6F6F] mt-1">
              {registrations.length === 0 
                ? 'You are not registered as a spare for any sports.' 
                : `You are registered as a spare for ${registrations.length} sport${registrations.length === 1 ? '' : 's'}.`
              }
            </p>
          </div>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-[#B20000] hover:bg-[#8A0000] text-white flex items-center gap-2"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            Join
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {registrations.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-[#6F6F6F]" />
            </div>
            <h3 className="text-lg font-semibold text-[#6F6F6F] mb-2">
              Ready to be a spare player?
            </h3>
            <p className="text-[#6F6F6F] mb-6 max-w-md mx-auto">
              Join spares lists for sports you play. Team captains will be able to contact you when they need substitute players for their games.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {registrations.map((registration) => (
              <Card key={registration.id} className="border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Registration Info */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{registration.sports.name}</h3>
                          {!registration.sports.active && (
                            <Badge variant="secondary" className="bg-gray-100 text-gray-600 text-xs">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <Badge className={`${getSkillLevelColor(registration.skill_level)} font-medium`}>
                          {registration.skill_level.charAt(0).toUpperCase() + registration.skill_level.slice(1)} Level
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-[#6F6F6F]">
                        <Calendar className="h-4 w-4" />
                        <span>Joined {formatDate(registration.created_at)}</span>
                        {registration.updated_at !== registration.created_at && (
                          <span>• Updated {formatDate(registration.updated_at)}</span>
                        )}
                      </div>

                      <div className="bg-gray-50 rounded p-3 mt-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-[#6F6F6F]" />
                          <p className="text-sm text-[#6F6F6F]">
                            <strong>Available:</strong> {getAvailableDays(registration)}
                          </p>
                        </div>
                      </div>

                      {/* Status indicator */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-green-700 font-medium">
                            Active - Team captains can contact you
                          </span>
                        </div>
                        
                        {/* Phone sharing status */}
                        <div className="flex items-center gap-2 text-sm">
                          {registration.share_phone ? (
                            <>
                              <CheckCircle className="h-4 w-4 text-blue-600" />
                              <span className="text-blue-700">Phone number shared</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="h-4 w-4 text-orange-600" />
                              <span className="text-orange-700">Phone number not shared</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 lg:min-w-[180px]">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditRegistration(registration)}
                        className="flex items-center gap-1"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveClick(registration)}
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
                      in the sports where you&apos;re registered as a spare. You can remove yourself 
                      from any spares list at any time.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>

      {/* Modal for adding new sport registration */}
      <SparesSignupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSignupSuccess}
      />

      {/* Modal for editing registration */}
      <SparesEditModal
        isOpen={!!editingRegistration}
        onClose={() => setEditingRegistration(null)}
        registration={editingRegistration}
        onSuccess={handleEditSuccess}
      />

      {/* Confirmation modal for deletion */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Remove Registration</h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>
            
            <p className="text-gray-700 mb-6">
              Are you sure you want to remove yourself from the{' '}
              <strong>{confirmDelete.registration.sports.name}</strong> spares list? 
              Team captains will no longer be able to contact you for this sport.
            </p>
            
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setConfirmDelete(null)}
                disabled={!!deletingId}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmRemove}
                disabled={!!deletingId}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deletingId === confirmDelete.registration.id ? 'Removing...' : 'Remove'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
