import React, { useState, useEffect } from 'react';
import { MySparesRegistrations } from '../../../../components/spares/MySparesRegistrations';
import { SparesListView } from '../../../../components/volleyball/SparesListView';
import { useAuth } from '../../../../contexts/AuthContext';
import { Card, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Users } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { logger } from '../../../../lib/logger';

export const VolleyballSparesTab: React.FC = () => {
  const { user, userProfile } = useAuth();
  const [userLeagues, setUserLeagues] = useState<string[]>([]);
  
  // Check if user is a captain (admin OR has captained teams)
  const isTeamCaptain = userProfile?.is_admin || userLeagues.length > 0;

  // Fetch user's leagues (where they are captain)
  useEffect(() => {
    const fetchUserLeagues = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('teams')
          .select('league_id')
          .or(`captain_id.eq.${user.id},co_captain_id.eq.${user.id}`)
          .eq('is_active', true);

        if (error) {
          logger.error('Error fetching user leagues', error);
          return;
        }

        const leagueIds = [...new Set(data?.map(team => team.league_id) || [])];
        setUserLeagues(leagueIds);
      } catch (error) {
        logger.error('Error in fetchUserLeagues', error);
      }
    };

    fetchUserLeagues();
  }, [user]);

  return (
    <div className="space-y-8">
      {/* User's Own Registrations */}
      <MySparesRegistrations className="shadow-lg" />
      
      {/* Captain's View - Only show if user is admin or team captain */}
      {isTeamCaptain && (
        <div className="space-y-4">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Captain Access
              </CardTitle>
              <p className="text-sm text-[#6F6F6F]">
                As a team captain or admin, you can view and contact spares for your leagues.
              </p>
            </CardHeader>
          </Card>
          
          <SparesListView className="shadow-lg" />
        </div>
      )}
    </div>
  );
};
