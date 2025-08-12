import { Badge } from '../../../../../components/ui/badge';

interface UserStatusBadgeProps {
  status?: 'active' | 'pending' | 'unconfirmed' | 'confirmed_no_profile' | 'profile_incomplete';
  confirmedAt?: string | null;
}

export function UserStatusBadge({ status }: UserStatusBadgeProps) {
  if (status === 'active') {
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
        Active
      </Badge>
    );
  }
  
  if (status === 'unconfirmed') {
    return (
      <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
        Unconfirmed Email
      </Badge>
    );
  }
  
  if (status === 'confirmed_no_profile') {
    return (
      <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
        No Profile
      </Badge>
    );
  }
  
  if (status === 'pending') {
    return (
      <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
        Pending
      </Badge>
    );
  }
  
  if (status === 'profile_incomplete') {
    return (
      <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
        Incomplete Profile
      </Badge>
    );
  }
  
  // Default for users without explicit status
  return null;
}