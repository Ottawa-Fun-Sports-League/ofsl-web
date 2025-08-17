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
      } catch (error) {
        logger.error('Error loading sports and skills', error);
      } finally {
        setLoadingSportsSkills(false);
      }
    };
    
    loadSportsAndSkills();
  }, []); // Only load once on mount

  // Update profile when userProfile changes, but only if it's a meaningful change
  useEffect(() => {
    if (!userProfile) return;
    
    if (sports.length > 0 && skills.length > 0) {
      // Enrich sports skills with names
      const enrichedSportsSkills = (userProfile.user_sports_skills || []).map((item: SportSkill) => {
        const sport = sports.find(s => s.id === item.sport_id);
        const skill = skills.find(s => s.id === item.skill_id);
        
        return {
          ...item,
          sport_name: sport?.name,
          skill_name: skill?.name
        };
      });
      
      const newProfile = {
        name: userProfile.name || '',
        phone: userProfile.phone || '',
        email: userProfile.email || '',
        user_sports_skills: enrichedSportsSkills
      };
      
      // Only update if this is the first load or if the profile actually changed
      const profileChanged = !lastSavedProfile.current || 
        JSON.stringify(newProfile) !== JSON.stringify(lastSavedProfile.current);
      
      if (profileChanged) {
        setProfile(newProfile);
        lastSavedProfile.current = newProfile;
      }
    } else {
      // If sports/skills haven't loaded yet, just set basic profile without enrichment
      const newProfile = {
        name: userProfile.name || '',
        phone: userProfile.phone || '',
        email: userProfile.email || '',
        user_sports_skills: userProfile.user_sports_skills || []
      };
      
      // Only update if profile changed
      const profileChanged = !lastSavedProfile.current || 
        JSON.stringify(newProfile) !== JSON.stringify(lastSavedProfile.current);
        
      if (profileChanged) {
        setProfile(newProfile);
        lastSavedProfile.current = newProfile;
      }
    }
  }, [
    userProfile?.name,
    userProfile?.phone, 
    userProfile?.email,
    // Use JSON.stringify to compare arrays deeply
    JSON.stringify(userProfile?.user_sports_skills),
    sports.length,
    skills.length
  ]);

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