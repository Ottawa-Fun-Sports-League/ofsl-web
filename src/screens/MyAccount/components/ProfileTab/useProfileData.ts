import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../../lib/supabase';
import { logger } from '../../../../lib/logger';
import { Profile, Sport, Skill, SportSkill } from './types';
import { INITIAL_PROFILE, INITIAL_NOTIFICATIONS } from './constants';

export function useProfileData(userProfile: { id: string; name?: string; phone?: string; email?: string; user_sports_skills?: SportSkill[] } | null) {
  const [profile, setProfile] = useState<Profile>(INITIAL_PROFILE);
  const lastSavedProfile = useRef<Profile | null>(null);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [sports, setSports] = useState<Sport[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loadingSportsSkills, setLoadingSportsSkills] = useState(false);

  // Load sports and skills data
  useEffect(() => {
    const loadSportsAndSkills = async () => {
      try {
        setLoadingSportsSkills(true);
        
        // Load sports and skills in parallel
        const [sportsResponse, skillsResponse] = await Promise.all([
          supabase.from('sports').select('id, name').eq('active', true).order('name'),
          supabase.from('skills').select('id, name, description').order('order_index')
        ]);
        
        if (sportsResponse.error) throw sportsResponse.error;
        if (skillsResponse.error) throw skillsResponse.error;
        
        setSports(sportsResponse.data || []);
        setSkills(skillsResponse.data || []);
        
        // If we have user_sports_skills, enrich them with names
        // Only update if this is meaningful data (not just a temporary state)
        if (userProfile?.user_sports_skills && userProfile.user_sports_skills.length > 0) {
          const enrichedSportsSkills = userProfile.user_sports_skills.map((item: SportSkill) => {
            const sport = sportsResponse.data?.find(s => s.id === item.sport_id);
            const skill = skillsResponse.data?.find(s => s.id === item.skill_id);
            
            return {
              ...item,
              sport_name: sport?.name,
              skill_name: skill?.name
            };
          });
          
          setProfile(prev => {
            // Only update if the enriched skills are different from current
            const currentSkillsStr = JSON.stringify(prev.user_sports_skills);
            const newSkillsStr = JSON.stringify(enrichedSportsSkills);
            
            if (currentSkillsStr !== newSkillsStr) {
              return {
                ...prev,
                user_sports_skills: enrichedSportsSkills
              };
            }
            return prev;
          });
        }
      } catch (error) {
        logger.error('Error loading sports and skills', error);
      } finally {
        setLoadingSportsSkills(false);
      }
    };
    
    loadSportsAndSkills();
  }, [userProfile?.user_sports_skills]);

  // Update profile when userProfile changes, but only if it's a meaningful change
  useEffect(() => {
    if (userProfile) {
      const newProfile = {
        name: userProfile.name || '',
        phone: userProfile.phone || '',
        email: userProfile.email || '',
        user_sports_skills: userProfile.user_sports_skills || []
      };
      
      // Only update if this is the first load or if the changes are different from what we last saved
      const isFirstLoad = !lastSavedProfile.current;
      const hasSignificantChanges = lastSavedProfile.current && 
        JSON.stringify(newProfile) !== JSON.stringify(lastSavedProfile.current);
      
      if (isFirstLoad || hasSignificantChanges) {
        setProfile(newProfile);
        lastSavedProfile.current = newProfile;
      }
    }
  }, [userProfile]);

  const handleNotificationToggle = (key: keyof typeof notifications) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const markProfileAsSaved = (savedProfile: Profile) => {
    lastSavedProfile.current = savedProfile;
  };

  return {
    profile,
    notifications,
    sports,
    skills,
    loadingSportsSkills,
    setProfile,
    handleNotificationToggle,
    markProfileAsSaved
  };
}