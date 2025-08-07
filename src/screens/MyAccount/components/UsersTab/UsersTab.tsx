import { useState } from 'react';
import { Card, CardContent } from '../../../../components/ui/card';
import { useAuth } from '../../../../contexts/AuthContext';
import { MobileFilterDrawer } from './components/MobileFilterDrawer';
import { UsersHeader } from './components/UsersHeader';
import { SearchAndFilters } from './components/SearchAndFilters';
import { UsersTable } from './components/UsersTable';
import { EditUserModal } from './components/EditUserModal';
import { useUsersData } from './useUsersData';
import { useUserOperations } from './useUserOperations';

export function UsersTab() {
  const { userProfile } = useAuth();
  const [showMobileFilterDrawer, setShowMobileFilterDrawer] = useState(false);

  const {
    users,
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
    <div className="space-y-6">
      <UsersHeader
        userCount={filteredUsers.length}
        onOpenMobileFilter={() => setShowMobileFilterDrawer(true)}
        onRefresh={loadUsers}
      />

      <SearchAndFilters
        searchTerm={searchTerm}
        filters={filters}
        isAnyFilterActive={isAnyFilterActive()}
        onSearchChange={setSearchTerm}
        onFilterChange={handleFilterChange}
        onClearFilters={clearFilters}
      />

      <MobileFilterDrawer
        isOpen={showMobileFilterDrawer}
        onClose={() => setShowMobileFilterDrawer(false)}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filters={filters}
        handleFilterChange={handleFilterChange}
        clearFilters={clearFilters}
        isAnyFilterActive={isAnyFilterActive}
      />

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
    </div>
  );
}