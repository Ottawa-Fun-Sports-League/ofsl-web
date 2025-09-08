import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '../../../../components/ui/card';
import { useAuth } from '../../../../contexts/AuthContext';
import { ImprovedMobileFilterDrawer } from './components/ImprovedMobileFilterDrawer';
import { UsersHeader } from './components/UsersHeader';
import { ImprovedFilters } from './components/ImprovedFilters';
import { UsersTable } from './components/UsersTable';
import { EditUserModal } from './components/EditUserModal';
import { ExportColumnsModal } from './components/ExportColumnsModal';
import { useUsersData } from './useUsersData';
import { useUserOperations } from './useUserOperations';
import { exportUsersToCSV, generateExportFilename } from './utils/exportCsv';
import { useToast } from '../../../../components/ui/toast';
import { supabase } from '../../../../lib/supabase';

export function UsersTab() {
  const { userProfile } = useAuth();
  const { showToast } = useToast();
  const [showMobileFilterDrawer, setShowMobileFilterDrawer] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const {
    filteredUsers,
    searchTerm,
    loading,
    sortField,
    sortDirection,
    filters,
    pagination,
    setSearchTerm,
    loadUsers,
    handleSort,
    handleFilterChange,
    toggleSportInLeague,
    toggleSportWithSkill,
    clearFilters,
    isAnyFilterActive,
    handlePageChange,
    handlePageSizeChange
  } = useUsersData();

  const {
    editingUser,
    editForm,
    userRegistrations,
    deleting,
    resettingPassword,
    captchaSolved,
    setEditForm,
    handleEditUser,
    handleSaveUser,
    handleDeleteUser,
    handleResetPassword,
    handleCaptchaVerify,
    handleCaptchaError,
    handleCaptchaExpire,
    handleCancelEdit
  } = useUserOperations(loadUsers);

  const handleExportCSV = async (selectedColumns: string[]) => {
    try {
      showToast('Preparing export...', 'info');
      
      // For now, export current page data
      // TODO: Implement server-side export for all filtered data
      const filename = generateExportFilename();
      exportUsersToCSV(filteredUsers, selectedColumns, filename, { registrationCounts: regCounts });
      showToast(`Exported ${filteredUsers.length} users from current page to ${filename}`, 'success');
    } catch (error) {
      showToast('Failed to export CSV. Please try again.', 'error');
    }
  };

  // Registration counts loaded via Edge Function for accuracy
  const [regCounts, setRegCounts] = useState<Record<string, number>>({});
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [registrationLoadingIds, setRegistrationLoadingIds] = useState<Record<string, boolean>>({});

  const visibleUserIds = useMemo(
    () => filteredUsers.map((u) => u.id).filter(Boolean),
    [filteredUsers]
  );

  useEffect(() => {
    // Fetch counts for users that we haven't fetched yet
    const missing = visibleUserIds.filter((id) => regCounts[id] === undefined);
    if (!missing.length) return;

    let cancelled = false;
    const loadCounts = async () => {
      try {
        setLoadingCounts(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

        const entries: Array<[string, number]> = [];
        const batchSize = 10;
        // Mark these IDs as loading
        setRegistrationLoadingIds((prev) => ({
          ...prev,
          ...Object.fromEntries(missing.map((id) => [id, true]))
        }));
        for (let i = 0; i < missing.length; i += batchSize) {
          const batch = missing.slice(i, i + batchSize);
          const results = await Promise.allSettled(
            batch.map(async (userId) => {
              const res = await fetch(`${supabaseUrl}/functions/v1/admin-user-registrations`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`,
                  'apikey': supabaseAnonKey,
                },
                body: JSON.stringify({ userId }),
              });
              if (!res.ok) return [userId, 0] as [string, number];
              const json = await res.json();
              const teamCount = Array.isArray(json?.team_registrations) ? json.team_registrations.length : 0;
              const indivCount = Array.isArray(json?.individual_registrations) ? json.individual_registrations.length : 0;
              return [userId, teamCount + indivCount] as [string, number];
            })
          );
          for (const r of results) {
            if (r.status === 'fulfilled') entries.push(r.value);
          }
        }
        if (!cancelled && entries.length) {
          setRegCounts((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
          // Clear loading flags for completed IDs
          setRegistrationLoadingIds((prev) => {
            const updated = { ...prev };
            for (const [id] of entries) updated[id] = false;
            return updated;
          });
        }
      } catch {
        // ignore errors per user; counts will stay 0/fallback
      } finally {
        if (!cancelled) setLoadingCounts(false);
      }
    };

    loadCounts();
    return () => {
      cancelled = true;
    };
  }, [visibleUserIds, regCounts]);

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
    <div className="w-full">
      {/* Container with negative margins to extend beyond normal page bounds */}
      <div className="2xl:-mx-32 xl:-mx-24 lg:-mx-16 md:-mx-8 space-y-6">
        <div className="px-4 md:px-6 lg:px-8">
          <UsersHeader
            userCount={pagination.totalItems}
            onOpenMobileFilter={() => setShowMobileFilterDrawer(true)}
            onRefresh={loadUsers}
            onExportCSV={() => setShowExportModal(true)}
            activeFilterCount={[
              filters.administrator,
              filters.facilitator,
              filters.activePlayer,
              filters.pendingUsers,
              filters.playersNotInLeague,
            ].filter(Boolean).length + (filters.sportsInLeague?.length || 0) + (filters.sportsWithSkill?.length || 0)}
          />

          <ImprovedFilters
            searchTerm={searchTerm}
            filters={filters}
            isAnyFilterActive={isAnyFilterActive()}
            onSearchChange={setSearchTerm}
            onFilterChange={handleFilterChange}
            onToggleSportInLeague={toggleSportInLeague}
            onToggleSportWithSkill={toggleSportWithSkill}
            onClearFilters={clearFilters}
          />
        </div>

        <ImprovedMobileFilterDrawer
          isOpen={showMobileFilterDrawer}
          onClose={() => setShowMobileFilterDrawer(false)}
          filters={filters}
          handleFilterChange={handleFilterChange}
          onToggleSportInLeague={toggleSportInLeague}
          onToggleSportWithSkill={toggleSportWithSkill}
          clearFilters={clearFilters}
          isAnyFilterActive={isAnyFilterActive}
        />

        {/* Table section with minimal padding for maximum width */}
        <div className="px-2 sm:px-4">
          <UsersTable
            users={filteredUsers}
            sortField={sortField}
            sortDirection={sortDirection}
            deleting={deleting}
            onSort={handleSort}
            onEditUser={handleEditUser}
            onDeleteUser={handleDeleteUser}
            searchTerm={searchTerm}
            pagination={pagination}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            loading={loading}
            registrationCounts={regCounts}
            registrationLoadingIds={registrationLoadingIds}
          />
        </div>

        <EditUserModal
          isOpen={!!editingUser}
          editForm={editForm}
          userRegistrations={userRegistrations}
          resettingPassword={resettingPassword}
          isAdmin={!!userProfile?.is_admin}
          userId={editingUser}
          onFormChange={setEditForm}
          onSave={handleSaveUser}
          onCancel={handleCancelEdit}
          onResetPassword={handleResetPassword}
          onCaptchaVerify={handleCaptchaVerify}
          onCaptchaError={handleCaptchaError}
          onCaptchaExpire={handleCaptchaExpire}
          captchaSolved={captchaSolved}
        />
        
        <ExportColumnsModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          onExport={handleExportCSV}
          userCount={pagination.totalItems}
        />
      </div>
    </div>
  );
}
