import { useState } from 'react';
import { Button } from '../../../../../components/ui/button';
import { Card, CardContent } from '../../../../../components/ui/card';
import { Edit2, Trash2, Mail, Phone, Calendar, ChevronUp, ChevronDown, Users } from 'lucide-react';
import { User, SortField, SortDirection, PaginationState } from '../types';
import { Link } from 'react-router-dom';
import { UserStatusBadge } from './UserStatusBadge';
import { MagicLinkButton } from './MagicLinkButton';
import { ConfirmationDialog } from '../../../../../components/ui/confirmation-dialog';
import { Pagination } from './Pagination';

interface UsersTableProps {
  users: User[];
  sortField: SortField;
  sortDirection: SortDirection;
  deleting: string | null;
  onSort: (field: SortField) => void;
  onEditUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  searchTerm: string;
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  loading?: boolean;
}

export function UsersTable({
  users,
  sortField,
  sortDirection,
  deleting,
  onSort,
  onEditUser,
  onDeleteUser,
  searchTerm,
  pagination,
  onPageChange,
  onPageSizeChange,
  loading = false
}: UsersTableProps) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string | null; email: string } | null>(null);

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? 
      <ChevronUp className="h-4 w-4 ml-1" /> : 
      <ChevronDown className="h-4 w-4 ml-1" />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleDeleteClick = (user: User) => {
    const deleteId = user.auth_id || user.profile_id || user.id;
    setUserToDelete({
      id: deleteId,
      name: user.name || null,
      email: user.email || ''
    });
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (userToDelete) {
      onDeleteUser(userToDelete.id);
      setUserToDelete(null);
    }
  };

  return (
    <>
    <Card className="shadow-sm" data-testid="users-table">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1400px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th 
                  className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-[#6F6F6F] uppercase tracking-wider cursor-pointer hover:bg-gray-100 rounded-tl-lg w-[200px]"
                  onClick={() => onSort('name')}
                >
                  <div className="flex items-center">
                    User
                    {getSortIcon('name')}
                  </div>
                </th>
                <th 
                  className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-[#6F6F6F] uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-[220px]"
                  onClick={() => onSort('email')}
                >
                  <div className="flex items-center">
                    Contact
                    {getSortIcon('email')}
                  </div>
                </th>
                <th 
                  className="px-3 xl:px-4 py-3 text-left text-xs font-medium text-[#6F6F6F] uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-[120px]"
                  onClick={() => onSort('status')}
                >
                  <div className="flex items-center">
                    Status
                    {getSortIcon('status')}
                  </div>
                </th>
                <th 
                  className="px-3 xl:px-4 py-3 text-left text-xs font-medium text-[#6F6F6F] uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-[110px]"
                  onClick={() => onSort('team_count')}
                >
                  <div className="flex items-center">
                    Reg.
                    {getSortIcon('team_count')}
                  </div>
                </th>
                <th 
                  className="px-3 xl:px-4 py-3 text-left text-xs font-medium text-[#6F6F6F] uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-[140px]"
                  onClick={() => onSort('total_owed')}
                >
                  <div className="flex items-center">
                    Owed
                    {getSortIcon('total_owed')}
                  </div>
                </th>
                <th 
                  className="px-3 xl:px-4 py-3 text-left text-xs font-medium text-[#6F6F6F] uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-[140px]"
                  onClick={() => onSort('total_paid')}
                >
                  <div className="flex items-center">
                    Paid
                    {getSortIcon('total_paid')}
                  </div>
                </th>
                <th 
                  className="px-3 xl:px-4 py-3 text-left text-xs font-medium text-[#6F6F6F] uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-[100px]"
                  onClick={() => onSort('date_created')}
                >
                  <div className="flex items-center">
                    Joined
                    {getSortIcon('date_created')}
                  </div>
                </th>
                <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-[#6F6F6F] uppercase tracking-wider w-[150px]">
                  <div className="flex items-center">
                    Actions
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-sm font-medium text-[#6F6F6F]">
                            {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium text-[#6F6F6F]">
                            {user.name || 'No Name'}
                          </div>
                          {user.is_admin && (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                              Admin
                            </span>
                          )}
                          {user.is_facilitator && (
                            <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center" title="Facilitator">
                              <span className="text-white text-xs font-bold">F</span>
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {user.id ? `${user.id.slice(0, 8)}...` : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      {user.email && (
                        <div className="flex items-center gap-1 text-sm text-[#6F6F6F]">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </div>
                      )}
                      {user.phone && (
                        <div className="flex items-center gap-1 text-sm text-[#6F6F6F]">
                          <Phone className="h-3 w-3" />
                          {user.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                    <UserStatusBadge status={user.status} confirmedAt={user.confirmed_at} />
                  </td>
                  <td className="px-3 xl:px-4 py-4 whitespace-nowrap text-sm text-[#6F6F6F]">
                    {(() => {
                      // Use current_registrations which includes all active team memberships
                      // (captain, roster member, co-captain) in leagues that haven't ended
                      const totalRegistrations = user.current_registrations?.length || 0;
                      
                      if (totalRegistrations === 0) {
                        return <span>0</span>;
                      }
                      
                      return (
                        <Link
                          to={`/my-account/users/${user.id}/registrations`}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {totalRegistrations}
                        </Link>
                      );
                    })()}
                  </td>
                  <td className="px-3 xl:px-4 py-4 whitespace-nowrap text-sm">
                    <div className="text-[#6F6F6F]">
                      ${((user.total_owed || 0)).toFixed(2)}
                      {(user.total_owed || 0) > (user.total_paid || 0) && (
                        <span className="text-xs text-orange-600 ml-1">
                          (${((user.total_owed || 0) - (user.total_paid || 0)).toFixed(2)} due)
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 xl:px-4 py-4 whitespace-nowrap text-sm">
                    <div className="text-[#6F6F6F]">
                      ${((user.total_paid || 0)).toFixed(2)}
                      {(user.total_paid || 0) >= (user.total_owed || 0) && (user.total_owed || 0) > 0 && (
                        <span className="text-xs text-green-600 ml-1">✓</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-sm text-[#6F6F6F]">
                      <Calendar className="h-3 w-3" />
                      {formatDate(user.date_created)}
                    </div>
                  </td>
                  <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      {user.email && (
                        <MagicLinkButton 
                          userEmail={user.email} 
                          userName={user.name}
                        />
                      )}
                      <Button
                        onClick={() => onEditUser(user)} 
                        className="bg-transparent hover:bg-blue-50 text-blue-500 hover:text-blue-600 rounded-lg p-2 transition-colors" 
                        disabled={!user.name} // Can't edit users without profiles
                        title={!user.name ? "User has not completed profile" : "Edit user"}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        onClick={() => handleDeleteClick(user)}
                        disabled={deleting === (user.auth_id || user.profile_id || user.id)}
                        className="bg-transparent hover:bg-red-50 text-red-500 hover:text-red-600 rounded-lg p-2 transition-colors" 
                      >
                        {deleting === (user.auth_id || user.profile_id || user.id) ? (
                          <div className="h-3 w-3 border-t-2 border-red-500 rounded-full animate-spin"></div>
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && !loading && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-[#6F6F6F] text-lg">
              {searchTerm ? 'No users found matching your search' : 'No users found'}
            </p>
          </div>
        )}
        
        {loading && users.length === 0 && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B20000]"></div>
          </div>
        )}
      </CardContent>
      
      <Pagination
        pagination={pagination}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        loading={loading}
      />
    </Card>

    {/* Delete Confirmation Dialog */}
    <ConfirmationDialog
      open={deleteConfirmOpen}
      onOpenChange={setDeleteConfirmOpen}
      title="Delete User"
      description={
        userToDelete
          ? `Are you sure you want to delete ${
              userToDelete.name || userToDelete.email
            }? This action cannot be undone.`
          : 'Are you sure you want to delete this user? This action cannot be undone.'
      }
      confirmText="Delete"
      cancelText="Cancel"
      onConfirm={handleConfirmDelete}
      variant="destructive"
    />
  </>
  );
}