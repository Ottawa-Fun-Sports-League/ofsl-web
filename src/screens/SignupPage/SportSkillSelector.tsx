import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/button';
import { Loader2, Plus, Trash2 } from 'lucide-react';

interface Sport {
  id: number;
  name: string;
}

interface Skill {
  id: number;
  name: string;
  description: string | null;
}

interface SportSkill {
  sport_id: number;
  skill_id: number;
  sport_name?: string;
  skill_name?: string;
}

interface SportSkillSelectorProps {
  value: SportSkill[];
  onChange: (value: SportSkill[]) => void;
  error?: string | null;
}

export function SportSkillSelector({ value, onChange, error }: SportSkillSelectorProps) {
  const [sports, setSports] = useState<Sport[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    loadSportsAndSkills();
  }, []);

  const loadSportsAndSkills = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      
      // Load sports and skills in parallel
      const [sportsResponse, skillsResponse] = await Promise.all([
        supabase.from('sports').select('id, name').eq('active', true).order('name'),
        supabase.from('skills').select('id, name, description').order('order_index')
      ]);
      
      if (sportsResponse.error) throw new Error(sportsResponse.error.message);
      if (skillsResponse.error) throw new Error(skillsResponse.error.message);
      
      setSports(sportsResponse.data || []);
      setSkills(skillsResponse.data || []);
    } catch (error) {
      console.error('Error loading sports and skills:', error);
      setLoadError('Failed to load sports and skills. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addSportSkill = () => {
    // Find first available sport not already selected
    const selectedSportIds = value.map(item => item.sport_id);
    const availableSport = sports.find(sport => !selectedSportIds.includes(sport.id));
    
    if (availableSport) {
      // Find first skill (usually beginner)
      const firstSkill = skills[0];
      
      if (firstSkill) {
        const newSportSkill: SportSkill = {
          sport_id: availableSport.id,
          skill_id: firstSkill.id,
          sport_name: availableSport.name,
          skill_name: firstSkill.name
        };
        
        onChange([...value, newSportSkill]);
      }
    }
  };

  const removeSportSkill = (index: number) => {
    const newValue = [...value];
    newValue.splice(index, 1);
    onChange(newValue);
  };

  const updateSportSkill = (index: number, field: 'sport_id' | 'skill_id', newValue: number) => {
    const newSportSkills = [...value];
    
    if (field === 'sport_id') {
      const sport = sports.find(s => s.id === newValue);
      newSportSkills[index] = {
        ...newSportSkills[index],
        sport_id: newValue,
        sport_name: sport?.name
      };
    } else {
      const skill = skills.find(s => s.id === newValue);
      newSportSkills[index] = {
        ...newSportSkills[index],
        skill_id: newValue,
        skill_name: skill?.name
      };
    }
    
    onChange(newSportSkills);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-[#B20000]" />
        <span className="ml-2 text-[#6F6F6F]">Loading sports and skills...</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        <p>{loadError}</p>
        <Button 
          onClick={loadSportsAndSkills} 
          className="mt-2 bg-red-100 hover:bg-red-200 text-red-700 text-sm px-3 py-1 rounded"
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <label className="block text-sm font-medium text-[#6F6F6F]">
          Sports & Skill Levels
        </label>
        <Button
          type="button"
          onClick={addSportSkill}
          disabled={value.length >= sports.length}
          className="bg-[#B20000] hover:bg-[#8A0000] text-white text-sm rounded-lg px-3 py-1 h-8 flex items-center"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Sport
        </Button>
      </div>
      
      {error && (
        <div className="text-red-600 text-sm">
          {error}
        </div>
      )}
      
      {value.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-[#6F6F6F] text-sm">
            Please select at least one sport you&apos;re interested in and your skill level.
          </p>
          <Button
            type="button"
            onClick={addSportSkill}
            className="mt-2 bg-[#B20000] hover:bg-[#8A0000] text-white text-sm rounded-lg px-4 py-2"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Sport
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {value.map((sportSkill, index) => (
            <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-[#6F6F6F]">Sport {index + 1}</h4>
                <Button
                  type="button"
                  onClick={() => removeSportSkill(index)}
                  className="bg-transparent hover:bg-red-50 text-red-500 hover:text-red-600 rounded-lg p-1 h-8 w-8 flex items-center justify-center"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#6F6F6F] mb-1">
                    Sport
                  </label>
                  <select
                    value={sportSkill.sport_id}
                    onChange={(e) => updateSportSkill(index, 'sport_id', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#B20000] focus:ring-[#B20000]"
                  >
                    {sports.map(sport => (
                      <option 
                        key={sport.id} 
                        value={sport.id}
                        disabled={value.some((item, i) => i !== index && item.sport_id === sport.id)}
                      >
                        {sport.name}
                        {value.some((item, i) => i !== index && item.sport_id === sport.id) ? ' (Already selected)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[#6F6F6F] mb-1">
                    Skill Level
                  </label>
                  <select
                    value={sportSkill.skill_id}
                    onChange={(e) => updateSportSkill(index, 'skill_id', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#B20000] focus:ring-[#B20000]"
                  >
                    {skills.map(skill => (
                      <option key={skill.id} value={skill.id}>
                        {skill.name}{skill.description ? ` - ${skill.description}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <p className="text-xs text-gray-500">
        This information helps us match you with appropriate leagues and teams based on your interests and skill level.
      </p>
    </div>
  );
}