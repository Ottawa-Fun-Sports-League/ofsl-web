import { useState } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { MobileFilterDrawer } from './components/MobileFilterDrawer';
import { MobileHeader } from './components/MobileHeader';
import { SearchAndFilters } from './components/SearchAndFilters';
import { GymForm } from './components/GymForm';
import { GymsList } from './components/GymsList';
import { useSchoolsData } from './useSchoolsData';
import { useGymOperations } from './useGymOperations';
import { SchoolFilters } from './types';
import { DAYS_OF_WEEK, GYM_LOCATIONS } from './constants';

export function SchoolsTab() {
  const { userProfile } = useAuth();
  const [showNewGymForm, setShowNewGymForm] = useState(false);
  const [showMobileFilterDrawer, setShowMobileFilterDrawer] = useState(false);

  const {
    gyms,
    filteredGyms,
    sports,
    searchTerm,
    loading,
    filters,
    newGym,
    editGym,
    setSearchTerm,
    setFilters,
    setNewGym,
    setEditGym,
    loadData,
    isAnyFilterActive,
    clearFilters
  } = useSchoolsData();

  const {
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
  } = useGymOperations(newGym, editGym, setNewGym, setEditGym, loadData);

  const handleFilterChange = (filterType: keyof SchoolFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const handleDayFilterToggle = (dayId: number) => {
    setFilters(prev => ({
      ...prev,
      days: prev.days.includes(dayId)
        ? prev.days.filter(id => id !== dayId)
        : [...prev.days, dayId]
    }));
  };

  const handleSportFilterToggle = (sportId: number) => {
    setFilters(prev => ({
      ...prev,
      sports: prev.sports.includes(sportId)
        ? prev.sports.filter(id => id !== sportId)
        : [...prev.sports, sportId]
    }));
  };

  const handleCreateGymAndClose = async () => {
    const success = await handleCreateGym();
    if (success) {
      setShowNewGymForm(false);
    }
  };

  if (!userProfile?.is_admin) {
    return (
      <div className="text-center py-12">
        <p className="text-[#6F6F6F] text-lg">Access denied. Admin privileges required.</p>
      </div>
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
    <div>
      <MobileHeader
        searchTerm={searchTerm}
        isAnyFilterActive={isAnyFilterActive()}
        onSearchChange={setSearchTerm}
        onOpenFilterDrawer={() => setShowMobileFilterDrawer(true)}
        onClearFilters={clearFilters}
        onAddSchool={() => setShowNewGymForm(true)}
      />

      <MobileFilterDrawer
        isOpen={showMobileFilterDrawer}
        onClose={() => setShowMobileFilterDrawer(false)}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filters={filters}
        handleFilterChange={handleFilterChange}
        handleDayFilterToggle={handleDayFilterToggle}
        handleSportFilterToggle={handleSportFilterToggle}
        clearFilters={clearFilters}
        daysOfWeek={DAYS_OF_WEEK}
        sports={sports}
        isAnyFilterActive={isAnyFilterActive}
      />

      <SearchAndFilters
        searchTerm={searchTerm}
        filters={filters}
        sports={sports}
        daysOfWeek={DAYS_OF_WEEK}
        isAnyFilterActive={isAnyFilterActive()}
        gymCount={gyms.length}
        filteredGymCount={filteredGyms.length}
        onSearchChange={setSearchTerm}
        onFilterChange={handleFilterChange}
        onDayFilterToggle={handleDayFilterToggle}
        onSportFilterToggle={handleSportFilterToggle}
        onClearFilters={clearFilters}
      />

      {showNewGymForm && (
        <GymForm
          title="Add New School/Gym"
          gym={newGym}
          sports={sports}
          daysOfWeek={DAYS_OF_WEEK}
          locations={GYM_LOCATIONS}
          saving={saving}
          onGymChange={setNewGym}
          onDayToggle={(dayId) => handleDayToggle(dayId, true)}
          onSportToggle={(sportId) => handleSportToggle(sportId, true)}
          onLocationToggle={(location) => handleLocationToggle(location, true)}
          onSave={handleCreateGymAndClose}
          onCancel={() => setShowNewGymForm(false)}
        />
      )}

      <GymsList
        filteredGyms={filteredGyms}
        sports={sports}
        daysOfWeek={DAYS_OF_WEEK}
        locations={GYM_LOCATIONS}
        loading={loading}
        editingGym={editingGym}
        editGym={editGym}
        saving={saving}
        deleting={deleting}
        isAnyFilterActive={isAnyFilterActive()}
        onEditGym={handleEditGym}
        onEditGymChange={setEditGym}
        onDayToggle={handleDayToggle}
        onSportToggle={handleSportToggle}
        onLocationToggle={handleLocationToggle}
        onUpdateGym={handleUpdateGym}
        onCancelEdit={handleCancelEdit}
        onDeleteGym={handleDeleteGym}
        onClearFilters={clearFilters}
      />
    </div>
  );
}