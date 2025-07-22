import { Card, CardContent } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Users, Crown, Mail, Phone, Edit2 } from 'lucide-react';
import { TeamMember } from './types';

interface TeamMembersProps {
  teamMembers: TeamMember[];
  captainId: string;
  onEditTeam?: () => void;
}

export function TeamMembers({ teamMembers, captainId, onEditTeam }: TeamMembersProps) {
  // Reorder team members: captain first, then regular members, then pending invites
  const orderedMembers = [...teamMembers].sort((a, b) => {
    // Captain comes first
    if (a.id === captainId) return -1;
    if (b.id === captainId) return 1;
    
    // Pending invites come last (assuming they have isPending property or no id/empty id)
    const aIsPending = !a.id || a.id.length === 0;
    const bIsPending = !b.id || b.id.length === 0;
    
    if (aIsPending && !bIsPending) return 1;
    if (!aIsPending && bIsPending) return -1;
    
    // Regular members ordered by name
    return (a.name || '').localeCompare(b.name || '');
  });

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-[#6F6F6F] flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members ({teamMembers.length})
          </h3>
          {onEditTeam && (
            <Button
              onClick={onEditTeam}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Edit2 className="h-4 w-4" />
              Edit Team
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {teamMembers.length === 0 ? (
            <div className="text-center py-8 text-[#6F6F6F]">
              <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No team members found</p>
            </div>
          ) : (
            orderedMembers.map((member) => (
              <div 
                key={member.id} 
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-[#6F6F6F] font-medium">
                      {(member.name || member.email || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[#6F6F6F]">
                        {member.name || 'No Name'}
                      </span>
                      {member.id === captainId && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          <Crown className="h-3 w-3" />
                          Captain
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-[#6F6F6F] flex-wrap">
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {member.email}
                      </div>
                      {member.phone && (
                        <>
                          <div className="h-3 w-px bg-gray-300"></div>
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {member.phone}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}