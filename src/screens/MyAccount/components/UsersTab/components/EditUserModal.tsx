import { Button } from '../../../../../components/ui/button';
import { Input } from '../../../../../components/ui/input';
import { Key, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EditUserForm, UserRegistration } from '../types';

interface EditUserModalProps {
  isOpen: boolean;
  editForm: EditUserForm;
  userRegistrations: UserRegistration[];
  resettingPassword: boolean;
  isAdmin: boolean;
  onFormChange: (form: EditUserForm) => void;
  onSave: () => void;
  onCancel: () => void;
  onResetPassword: () => void;
}

export function EditUserModal({
  isOpen,
  editForm,
  userRegistrations,
  resettingPassword,
  isAdmin,
  onFormChange,
  onSave,
  onCancel,
  onResetPassword
}: EditUserModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-2rem)]">
          <h3 className="text-xl font-bold text-[#6F6F6F] mb-6">Edit User</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#6F6F6F] mb-2">Name</label>
              <Input
                value={editForm.name || ''}
                onChange={(e) => onFormChange({ ...editForm, name: e.target.value })}
                placeholder="Enter name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#6F6F6F] mb-2">Email</label>
              <Input
                type="email"
                value={editForm.email || ''}
                onChange={(e) => onFormChange({ ...editForm, email: e.target.value })}
                placeholder="Enter email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#6F6F6F] mb-2">Phone</label>
              <Input
                value={editForm.phone || ''}
                onChange={(e) => onFormChange({ ...editForm, phone: e.target.value })}
                placeholder="Enter phone"
              />
            </div>


            <div>
              <label className="block text-sm font-medium text-[#6F6F6F] mb-2">Registrations</label>
              <div className="text-sm">
                {userRegistrations.length > 0 ? (
                  <div className="space-y-1">
                    {userRegistrations.map((league) => (
                      <div key={league.id}>
                        <div className="flex items-center gap-2">
                          <Link 
                            to={`/leagues/${league.id}`}
                            className="text-[#B20000] hover:text-[#8A0000] hover:underline"
                          >
                            {league.name}
                          </Link>
                          {league.sport_name === 'Volleyball' && (
                            <span className={`flex items-center gap-1 px-2 py-1 text-xs rounded-full ${
                              league.role === 'captain' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-purple-100 text-purple-800'
                            }`}>
                              {league.role === 'captain' && <Crown className="h-3 w-3" />}
                              {league.role === 'captain' ? 'Captain' : 'Player'}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-[#6F6F6F]">No league registrations</span>
                )}
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-[#6F6F6F] mb-3">User Role</h4>
              <div className="flex items-center gap-6">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_admin"
                    checked={editForm.is_admin || false}
                    onChange={(e) => onFormChange({ ...editForm, is_admin: e.target.checked })}
                    className="mr-2"
                  />
                  <label htmlFor="is_admin" className="text-sm font-medium text-[#6F6F6F]">
                    Admin privileges
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_facilitator"
                    checked={editForm.is_facilitator || false}
                    onChange={(e) => onFormChange({ ...editForm, is_facilitator: e.target.checked })}
                    className="mr-2"
                  />
                  <label htmlFor="is_facilitator" className="text-sm font-medium text-[#6F6F6F]">
                    Facilitator
                  </label>
                </div>
              </div>
            </div>

            {isAdmin && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-[#6F6F6F] mb-3">Password Management</h4>
                <Button
                  onClick={onResetPassword}
                  disabled={resettingPassword || !editForm.email}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-4 py-2 flex items-center justify-center gap-2"
                >
                  <Key className="h-4 w-4" />
                  {resettingPassword ? 'Sending Reset Email...' : 'Reset Password'}
                </Button>
                <p className="text-xs text-[#6F6F6F] mt-2">
                  This will send a password reset email to the user&apos;s email address.
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-4 mt-6 sticky bottom-0 pt-4 bg-white border-t">
            <Button
              onClick={onSave}
              className="flex-1 bg-[#B20000] hover:bg-[#8A0000] text-white rounded-lg px-6 py-2"
            >
              Save Changes
            </Button>
            <Button
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700 bg-transparent hover:bg-transparent border-none shadow-none p-2"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}