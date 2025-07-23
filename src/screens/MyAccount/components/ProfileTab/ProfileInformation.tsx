import { User } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Profile } from './types';

interface ProfileInformationProps {
  profile: Profile;
  isEditing: boolean;
  saving: boolean;
  userProfile: Profile;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onProfileChange: (profile: Profile) => void;
}

export function ProfileInformation({
  profile,
  isEditing,
  saving,
  onEdit,
  onSave,
  onCancel,
  onProfileChange
}: ProfileInformationProps) {
  // Phone number formatting function
  const formatPhoneNumber = (value: string) => {
    const phoneNumber = value.replace(/\D/g, "");

    if (phoneNumber.length <= 3) {
      return phoneNumber;
    } else if (phoneNumber.length <= 6) {
      return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3)}`;
    } else {
      return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedPhone = formatPhoneNumber(e.target.value);
    onProfileChange({ ...profile, phone: formattedPhone });
  };
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-[#6F6F6F]" />
          <h2 className="text-xl font-bold text-[#6F6F6F]">Profile Information</h2>
        </div>
        {!isEditing && (
          <Button
            onClick={onEdit}
            className="border border-[#B20000] text-[#B20000] bg-white hover:bg-[#B20000] hover:text-white rounded-lg px-4 py-2"
          >
            Edit
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-[#6F6F6F] mb-2">Full Name</label>
          {isEditing ? (
            <Input
              value={profile.name}
              onChange={(e) => onProfileChange({ ...profile, name: e.target.value })}
              className="w-full"
            />
          ) : (
            <p className="text-[#6F6F6F] py-2">{profile.name || 'No name available'}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-[#6F6F6F] mb-2">Email</label>
          {isEditing ? (
            <Input
              value={profile.email}
              onChange={(e) => onProfileChange({ ...profile, email: e.target.value })}
              className="w-full"
              type="email"
            />
          ) : (
            <p className="text-[#6F6F6F] py-2">{profile.email || 'No email available'}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-[#6F6F6F] mb-2">Phone Number</label>
          {isEditing ? (
            <div>
              <Input
                value={profile.phone}
                onChange={handlePhoneChange}
                className="w-full"
                type="tel"
                placeholder="###-###-####"
                maxLength={12}
              />
              <p className="text-xs text-gray-500 mt-1">
                Format: ###-###-####
              </p>
            </div>
          ) : (
            <p className="text-[#6F6F6F] py-2">{profile.phone || 'No phone number available'}</p>
          )}
        </div>

      </div>

      {isEditing && (
        <div className="flex gap-4 mt-6">
          <Button
            onClick={onSave}
            disabled={saving}
            className="bg-[#B20000] hover:bg-[#8A0000] text-white rounded-lg px-6 py-2"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button
            onClick={onCancel}
            className="bg-gray-500 hover:bg-gray-600 text-white rounded-lg px-6 py-2"
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}