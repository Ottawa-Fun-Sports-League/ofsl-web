import { Button } from '../../../../../components/ui/button';
import { Card, CardContent } from '../../../../../components/ui/card';
import { Edit2, Trash2, Mail, Phone, Calendar, ChevronUp, ChevronDown, Users } from 'lucide-react';
import { User, SortField, SortDirection } from '../types';
import { UserStatusBadge } from './UserStatusBadge';
import { MagicLinkButton } from './MagicLinkButton';

interface UsersTableProps {
  users: User[];
  sortField: SortField;
  sortDirection: SortDirection;
  deleting: string | null;
  onSort: (field: SortField) => void;
  onEditUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  searchTerm: string;
}

export function UsersTable({
  users,
  sortField,
  sortDirection,
  deleting,
  onSort,
  onEditUser,
  onDeleteUser,
  searchTerm
}: UsersTableProps) {
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

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-[#6F6F6F] uppercase tracking-wider cursor-pointer hover:bg-gray-100 rounded-tl-lg"
                  onClick={() => onSort('name')}
                >
                  <div className="flex items-center">
                    User
                    {getSortIcon('name')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-[#6F6F6F] uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => onSort('email')}
                >
                  <div className="flex items-center">
                    Contact
                    {getSortIcon('email')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-[#6F6F6F] uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => onSort('status')}
                >
                  <div className="flex items-center">
                    Status
                    {getSortIcon('status')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-[#6F6F6F] uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => onSort('team_count')}
                >
                  <div className="flex items-center">
                    Teams
                    {getSortIcon('team_count')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-[#6F6F6F] uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => onSort('date_created')}
                >
                  <div className="flex items-center">
                    Joined
                    {getSortIcon('date_created')}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#6F6F6F] uppercase tracking-wider">
                  <div className="flex items-center">
                    Actions
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
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
                  <td className="px-6 py-4 whitespace-nowrap">
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <UserStatusBadge status={user.status} confirmedAt={user.confirmed_at} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#6F6F6F]">
                    {user.team_ids?.length || 0} teams
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-sm text-[#6F6F6F]">
                      <Calendar className="h-3 w-3" />
                      {formatDate(user.date_created)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
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
                        onClick={() => onDeleteUser(user.id)}
                        disabled={deleting === user.id}
                        className="bg-transparent hover:bg-red-50 text-red-500 hover:text-red-600 rounded-lg p-2 transition-colors" 
                      >
                        {deleting === user.id ? (
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

        {users.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-[#6F6F6F] text-lg">
              {searchTerm ? 'No users found matching your search' : 'No users found'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}