import { useState } from 'react';
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
    setSearchTerm,
    loadUsers,
    handleSort,
    handleFilterChange,
    clearFilters,
    isAnyFilterActive
  } = useUsersData();

  const {
    editingUser,
    editForm,
    userRegistrations,
    deleting,
    resettingPassword,
    setEditForm,
    handleEditUser,
    handleSaveUser,
    handleDeleteUser,
    handleResetPassword,
    handleCancelEdit
  } = useUserOperations(loadUsers);

  const handleExportCSV = (selectedColumns: string[]) => {
    try {
      const filename = generateExportFilename();
      exportUsersToCSV(filteredUsers, selectedColumns, filename);
      showToast(`Exported ${filteredUsers.length} users to ${filename}`, 'success');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      showToast('Failed to export CSV. Please try again.', 'error');
    }
  };

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
            userCount={filteredUsers.length}
            onOpenMobileFilter={() => setShowMobileFilterDrawer(true)}
            onRefresh={loadUsers}
            onExportCSV={() => setShowExportModal(true)}
            activeFilterCount={Object.values(filters).filter(Boolean).length}
          />

          <ImprovedFilters
            searchTerm={searchTerm}
            filters={filters}
            isAnyFilterActive={isAnyFilterActive()}
            onSearchChange={setSearchTerm}
            onFilterChange={handleFilterChange}
            onClearFilters={clearFilters}
          />
        </div>

        <ImprovedMobileFilterDrawer
          isOpen={showMobileFilterDrawer}
          onClose={() => setShowMobileFilterDrawer(false)}
          filters={filters}
          handleFilterChange={handleFilterChange}
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
          />
        </div>

        <EditUserModal
          isOpen={!!editingUser}
          editForm={editForm}
          userRegistrations={userRegistrations}
          resettingPassword={resettingPassword}
          isAdmin={!!userProfile?.is_admin}
          onFormChange={setEditForm}
          onSave={handleSaveUser}
          onCancel={handleCancelEdit}
          onResetPassword={handleResetPassword}
        />
        
        <ExportColumnsModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          onExport={handleExportCSV}
          userCount={filteredUsers.length}
        />
      </div>
    </div>
  );
}