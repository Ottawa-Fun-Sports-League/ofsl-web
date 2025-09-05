import { Button } from '../../../../../components/ui/button';
import { Input } from '../../../../../components/ui/input';
import { Key, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EditUserForm, UserRegistration } from '../types';
import { TurnstileWidget } from '../../../../../components/ui/turnstile';

interface EditUserModalProps {
  isOpen: boolean;
  editForm: EditUserForm;
  userRegistrations: UserRegistration[];
  resettingPassword: boolean;
  isAdmin: boolean;
  userId?: string | null;
  onFormChange: (form: EditUserForm) => void;
  onSave: () => void;
  onCancel: () => void;
  onResetPassword: () => void;
  onCaptchaVerify?: (token: string) => void;
  onCaptchaError?: () => void;
  onCaptchaExpire?: () => void;
}

export function EditUserModal({
  isOpen,
  editForm,
  userRegistrations,
  resettingPassword,
  isAdmin,
  userId,
  onFormChange,
  onSave,
  onCancel,
  onResetPassword,
  onCaptchaVerify,
  onCaptchaError,
  onCaptchaExpire
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
                    {userRegistrations.map((reg) => {
                      const href = reg.registration_type === 'team' && reg.team_id
                        ? `/my-account/teams/edit/${reg.team_id}`
                        : (reg.registration_type === 'individual' && reg.league_id && userId)
                          ? `/my-account/individual/edit/${userId}/${reg.league_id}`
                          : userId
                            ? `/my-account/users/${userId}/registrations`
                            : '#';
                      return (
                        <div key={`${reg.registration_type || 'reg'}-${reg.id}`}>
                          <div className="flex items-center gap-2">
                            <Link 
                              to={href}
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {reg.name}
                            </Link>
                            <span className={`flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full ${
                              reg.role === 'captain' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {reg.role === 'captain' && <Crown className="h-3 w-3" />}
                              {reg.role === 'captain' ? 'Captain' : 'Player'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
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
                {import.meta.env.VITE_TURNSTILE_SITE_KEY && (
                  <div className="flex justify-center mb-3">
                    <TurnstileWidget
                      onVerify={onCaptchaVerify || (() => {})}
                      onError={onCaptchaError}
                      onExpire={onCaptchaExpire}
                    />
                  </div>
                )}
                <Button
                  onClick={onResetPassword}
                  disabled={resettingPassword || !editForm.email}
                  className="w-full h-9 bg-white text-[#333] border border-[#D4D4D4] hover:bg-gray-50 rounded-md px-3 flex items-center justify-center gap-2"
                >
                  <Key className="h-4 w-4" />
                  <span className="text-sm">{resettingPassword ? 'Sending Reset Email...' : 'Reset Password'}</span>
                </Button>
                <p className="text-xs text-[#6F6F6F] mt-2">
                  This will send a password reset email to the user&apos;s email address.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6 sticky bottom-0 pt-4 bg-white border-t">
            <Button
              onClick={onCancel}
              className="h-9 px-3 bg-white text-[#333] border border-[#D4D4D4] hover:bg-gray-50 rounded-md"
            >
              <span className="text-sm">Cancel</span>
            </Button>
            <Button
              onClick={onSave}
              className="h-9 px-4 bg-[#B20000] hover:bg-[#8A0000] text-white rounded-md"
            >
              <span className="text-sm">Save Changes</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
