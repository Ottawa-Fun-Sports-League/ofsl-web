import { useState } from 'react';
import { useToast } from '../../../../components/ui/toast';
import { supabase } from '../../../../lib/supabase';
import { Gym, NewGymForm, EditGymForm } from './types';
import { INITIAL_NEW_GYM_FORM, INITIAL_EDIT_GYM_FORM } from './constants';

export function useGymOperations(
  newGym: NewGymForm,
  editGym: EditGymForm,
  setNewGym: (gym: NewGymForm) => void,
  setEditGym: (gym: EditGymForm) => void,
  loadData: () => Promise<void>
) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [editingGym, setEditingGym] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const handleCreateGym = async () => {
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('gyms')
        .insert({
          gym: newGym.gym,
          address: newGym.address,
          instructions: newGym.instructions,
          active: newGym.active,
          available_days: newGym.availableDays,
          available_sports: newGym.availableSports,
          locations: newGym.locations,
          facilitator_id: newGym.facilitatorId
        });

      if (error) throw error;

      showToast('School/Gym added successfully!', 'success');
      setNewGym(INITIAL_NEW_GYM_FORM);
      loadData();
      return true;
    } catch (error) {
      console.error('Error creating gym:', error);
      showToast('Failed to add school/gym', 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleEditGym = (gym: Gym) => {
    setEditingGym(gym.id);
    setEditGym({
      gym: gym.gym || '',
      address: gym.address || '',
      instructions: gym.instructions || '',
      active: gym.active ?? true,
      availableDays: gym.available_days || [],
      availableSports: gym.available_sports || [],
      locations: gym.locations || [],
      facilitatorId: gym.facilitator_id || null
    });
  };

  const handleUpdateGym = async () => {
    if (!editingGym) return false;

    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('gyms')
        .update({
          gym: editGym.gym,
          address: editGym.address,
          instructions: editGym.instructions,
          active: editGym.active,
          available_days: editGym.availableDays,
          available_sports: editGym.availableSports,
          locations: editGym.locations,
          facilitator_id: editGym.facilitatorId
        })
        .eq('id', editingGym);

      if (error) throw error;

      showToast('School/Gym updated successfully!', 'success');
      setEditingGym(null);
      setEditGym(INITIAL_EDIT_GYM_FORM);
      loadData();
      return true;
    } catch (error) {
      console.error('Error updating gym:', error);
      showToast('Failed to update school/gym', 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingGym(null);
    setEditGym(INITIAL_EDIT_GYM_FORM);
  };

  const handleDeleteGym = async (gymId: number) => {
    if (!confirm('Are you sure you want to delete this school/gym? This action cannot be undone.')) {
      return;
    }

    setDeleting(gymId);
    try {
      const { error } = await supabase
        .from('gyms')
        .delete()
        .eq('id', gymId);

      if (error) throw error;

      showToast('School/Gym deleted successfully!', 'success');
      loadData();
    } catch (error) {
      console.error('Error deleting gym:', error);
      showToast('Failed to delete school/gym', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const handleDayToggle = (dayId: number, isNewGym: boolean = false) => {
    if (isNewGym) {
      setNewGym({
        ...newGym,
        availableDays: newGym.availableDays.includes(dayId)
          ? newGym.availableDays.filter(id => id !== dayId)
          : [...newGym.availableDays, dayId]
      });
    } else {
      setEditGym({
        ...editGym,
        availableDays: editGym.availableDays.includes(dayId)
          ? editGym.availableDays.filter(id => id !== dayId)
          : [...editGym.availableDays, dayId]
      });
    }
  };

  const handleSportToggle = (sportId: number, isNewGym: boolean = false) => {
    if (isNewGym) {
      setNewGym({
        ...newGym,
        availableSports: newGym.availableSports.includes(sportId)
          ? newGym.availableSports.filter(id => id !== sportId)
          : [...newGym.availableSports, sportId]
      });
    } else {
      setEditGym({
        ...editGym,
        availableSports: editGym.availableSports.includes(sportId)
          ? editGym.availableSports.filter(id => id !== sportId)
          : [...editGym.availableSports, sportId]
      });
    }
  };

  const handleLocationToggle = (location: string, isNewGym: boolean = false) => {
    if (isNewGym) {
      setNewGym({
        ...newGym,
        locations: newGym.locations.includes(location)
          ? newGym.locations.filter(loc => loc !== location)
          : [...newGym.locations, location]
      });
    } else {
      setEditGym({
        ...editGym,
        locations: editGym.locations.includes(location)
          ? editGym.locations.filter(loc => loc !== location)
          : [...editGym.locations, location]
      });
    }
  };

  return {
    saving,
    editingGym,
    deleting,
    handleCreateGym,
    handleEditGym,
    handleUpdateGym,
    handleCancelEdit,
    handleDeleteGym,
    handleDayToggle,
    handleSportToggle,
    handleLocationToggle
  };
}
