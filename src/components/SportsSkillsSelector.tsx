import { X, Plus } from "lucide-react";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { logger } from "../lib/logger";

export interface SportSkill {
  sport_id: number;
  skill_id: number;
  sport_name?: string;
  skill_name?: string;
}

export interface Sport {
  id: number;
  name: string;
}

export interface Skill {
  id: number;
  name: string;
  description: string | null;
}

interface SportsSkillsSelectorProps {
  value: SportSkill[];
  onChange: (value: SportSkill[]) => void;
  error?: string | null;
  onSave?: () => Promise<boolean>;
  saving?: boolean;
  showTitle?: boolean;
  className?: string;
}

export function SportsSkillsSelector({
  value,
  onChange,
  error,
  onSave,
  showTitle = true,
  className = "",
}: SportsSkillsSelectorProps) {
  const [sports, setSports] = useState<Sport[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loadingSportsSkills, setLoadingSportsSkills] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAddInterface, setShowAddInterface] = useState(false);
  const [selectedSport, setSelectedSport] = useState<Sport | null>(null);

  useEffect(() => {
    loadSportsAndSkills();
  }, []);

  const loadSportsAndSkills = async () => {
    try {
      setLoadingSportsSkills(true);
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
      logger.error('Error loading sports and skills', error);
      setLoadError('Failed to load sports and skills. Please try again.');
    } finally {
      setLoadingSportsSkills(false);
    }
  };

  const handleRemoveSportSkill = (index: number) => {
    const newSportsSkills = [...value];
    newSportsSkills.splice(index, 1);
    onChange(newSportsSkills);

    // Save immediately if onSave is provided
    if (onSave) {
      setTimeout(() => {
        onSave();
      }, 0);
    }
  };

  const handleAddSportSkill = async (sport: Sport, skill: Skill) => {
    const newSportsSkills = [
      ...value,
      {
        sport_id: sport.id,
        skill_id: skill.id,
        sport_name: sport.name,
        skill_name: skill.name,
      },
    ];

    onChange(newSportsSkills);
    setShowAddInterface(false);
    setSelectedSport(null);

    // Save immediately if onSave is provided
    if (onSave) {
      await onSave();
    }
  };

  const handleShowAddInterface = () => {
    setShowAddInterface(true);
  };

  const handleCancelAdd = () => {
    setShowAddInterface(false);
    setSelectedSport(null);
  };

  const getAvailableSports = () => {
    const selectedSportIds = value.map((item: SportSkill) => item.sport_id);
    return sports.filter((sport) => !selectedSportIds.includes(sport.id));
  };

  const getSkillLevelColor = (skillName: string | undefined) => {
    if (!skillName) return "bg-gray-100 text-gray-700 border-gray-300";

    const colors = {
      Beginner: "bg-green-200 text-green-900 border-green-400",
      Intermediate: "bg-blue-200 text-blue-900 border-blue-400",
      Advanced: "bg-yellow-200 text-yellow-900 border-yellow-400",
      Competitive: "bg-purple-200 text-purple-900 border-purple-400",
      Elite: "bg-red-200 text-red-900 border-red-400",
    };

    const matchedColor = Object.entries(colors).find(([key]) =>
      skillName.toLowerCase().includes(key.toLowerCase()),
    );

    return matchedColor
      ? matchedColor[1]
      : "bg-gray-100 text-gray-700 border-gray-300";
  };

  const getSkillLevelHoverColor = (skillName: string | undefined) => {
    if (!skillName) return "hover:bg-gray-200";

    const hoverColors = {
      Beginner: "hover:bg-green-100",
      Intermediate: "hover:bg-blue-100",
      Advanced: "hover:bg-yellow-100",
      Competitive: "hover:bg-purple-100",
      Elite: "hover:bg-red-100",
    };

    const matchedColor = Object.entries(hoverColors).find(([key]) =>
      skillName.toLowerCase().includes(key.toLowerCase()),
    );

    return matchedColor ? matchedColor[1] : "hover:bg-gray-200";
  };

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
    <div className={`bg-white ${showTitle ? 'border border-gray-200 rounded-lg p-6' : ''} ${className}`}>
      {showTitle && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 text-[#6F6F6F]"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12,5.5A3.5,3.5 0 0,1 15.5,9A3.5,3.5 0 0,1 12,12.5A3.5,3.5 0 0,1 8.5,9A3.5,3.5 0 0,1 12,5.5M5,8C5.56,8 6.08,8.15 6.53,8.42C6.38,9.85 6.8,11.27 7.66,12.38C7.16,13.34 6.16,14 5,14A3,3 0 0,1 2,11A3,3 0 0,1 5,8M19,8A3,3 0 0,1 22,11A3,3 0 0,1 19,14C17.84,14 16.84,13.34 16.34,12.38C17.2,11.27 17.62,9.85 17.47,8.42C17.92,8.15 18.44,8 19,8M5.5,18.25C5.5,16.18 8.41,14.5 12,14.5C15.59,14.5 18.5,16.18 18.5,18.25V20H5.5V18.25M0,20V18.5C0,17.11 1.89,15.94 4.45,15.6C3.86,16.28 3.5,17.22 3.5,18.25V20H0M24,20H20.5V18.25C20.5,17.22 20.14,16.28 19.55,15.6C22.11,15.94 24,17.11 24,18.5V20Z" />
            </svg>
            <h2 className="text-xl font-bold text-[#6F6F6F]">
              Sports & Skill Levels
            </h2>
          </div>
          {getAvailableSports().length > 0 && (
            <Button
              onClick={handleShowAddInterface}
              className="border border-[#B20000] text-[#B20000] bg-white hover:bg-[#B20000] hover:text-white rounded-lg px-4 py-2 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          )}
        </div>
      )}

      {!showTitle && (
        <div className="space-y-2 mb-4">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-medium text-[#6F6F6F]">
              Sports & Skill Levels *
            </label>
            {getAvailableSports().length > 0 && (
              <Button
                type="button"
                onClick={handleShowAddInterface}
                className="border border-[#B20000] text-[#B20000] bg-white hover:bg-[#B20000] hover:text-white rounded-lg px-3 py-1 h-8 flex items-center gap-1 text-sm"
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
            )}
          </div>
          <p className="text-xs text-gray-500">
            Select the sports you&apos;re interested in playing and your skill level for each one.
          </p>
        </div>
      )}

      {error && (
        <div className="text-red-600 text-sm mb-4">
          {error}
        </div>
      )}

      {loadingSportsSkills ? (
        <div className="flex justify-center items-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#B20000]"></div>
          <span className="ml-2 text-[#6F6F6F]">Loading sports data...</span>
        </div>
      ) : value && value.length > 0 ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {value.map((sportSkill: SportSkill, index: number) => (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-md group"
              >
                <span className="text-sm font-medium text-[#6F6F6F]">
                  {sportSkill.sport_name || `Sport ${sportSkill.sport_id}`}
                </span>
                <span
                  className={`px-3 py-1 text-xs font-medium rounded-full border ${getSkillLevelColor(sportSkill.skill_name)}`}
                >
                  {sportSkill.skill_name || `Skill ${sportSkill.skill_id}`}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleRemoveSportSkill(index);
                  }}
                  className="bg-transparent hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-full p-0.5 h-4 w-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ml-1 flex-shrink-0"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          {showAddInterface && (
            <div className="bg-white border-2 border-[#B20000] rounded-md p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-[#6F6F6F]">
                  Add Sport & Skill Level
                </h3>
                <Button
                  type="button"
                  onClick={handleCancelAdd}
                  className="bg-transparent hover:bg-gray-50 text-gray-500 hover:text-gray-700 rounded-md p-1"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {!selectedSport ? (
                <div>
                  <p className="text-xs text-[#6F6F6F] mb-2">Select a sport:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {getAvailableSports().map((sport) => (
                      <Button
                        key={sport.id}
                        type="button"
                        onClick={() => setSelectedSport(sport)}
                        className="bg-gray-50 hover:bg-gray-100 text-[#6F6F6F] border border-gray-200 rounded-md p-2 text-sm"
                      >
                        {sport.name}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Button
                      type="button"
                      onClick={() => setSelectedSport(null)}
                      className="bg-transparent hover:bg-gray-50 text-gray-500 hover:text-gray-700 rounded-md p-1"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    <span className="text-sm font-medium text-[#6F6F6F]">
                      {selectedSport.name}
                    </span>
                  </div>
                  <p className="text-xs text-[#6F6F6F] mb-3">
                    Select your skill level:
                  </p>
                  <TooltipProvider>
                    <div className="grid grid-cols-1 gap-3">
                      {skills.map((skill) => (
                        <Tooltip key={skill.id}>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              onClick={() =>
                                handleAddSportSkill(selectedSport, skill)
                              }
                              className={`text-left border-2 rounded-lg p-4 text-sm font-medium transition-all duration-200 hover:scale-[1.02] hover:shadow-sm ${getSkillLevelColor(skill.name)} ${getSkillLevelHoverColor(skill.name)}`}
                            >
                              {skill.name}
                            </Button>
                          </TooltipTrigger>
                          {skill.description && (
                            <TooltipContent>
                              <p className="max-w-xs">{skill.description}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      ))}
                    </div>
                  </TooltipProvider>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-[#6F6F6F] mb-4">
            {showTitle 
              ? "You haven&apos;t selected any sports or skill levels yet."
              : "Please select at least one sport you&apos;re interested in and your skill level."
            }
          </p>
          {!showAddInterface && getAvailableSports().length > 0 && (
            <Button
              onClick={handleShowAddInterface}
              className="bg-[#B20000] hover:bg-[#8A0000] text-white rounded-md px-3 py-1.5 flex items-center gap-2 mx-auto"
            >
              <Plus className="h-4 w-4" />
              {showTitle ? "Add Sport & Skill Level" : "Add Sport"}
            </Button>
          )}

          {showAddInterface && (
            <div className="bg-white border-2 border-[#B20000] rounded-md p-4 max-w-md mx-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-[#6F6F6F]">
                  Add Sport & Skill Level
                </h3>
                <Button
                  type="button"
                  onClick={handleCancelAdd}
                  className="bg-transparent hover:bg-gray-50 text-gray-500 hover:text-gray-700 rounded-md p-1"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {!selectedSport ? (
                <div>
                  <p className="text-xs text-[#6F6F6F] mb-2">Select a sport:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {sports.map((sport) => (
                      <Button
                        key={sport.id}
                        type="button"
                        onClick={() => setSelectedSport(sport)}
                        className="bg-gray-50 hover:bg-gray-100 text-[#6F6F6F] border border-gray-200 rounded-md p-2 text-sm"
                      >
                        {sport.name}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Button
                      type="button"
                      onClick={() => setSelectedSport(null)}
                      className="bg-transparent hover:bg-gray-50 text-gray-500 hover:text-gray-700 rounded-md p-1"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    <span className="text-sm font-medium text-[#6F6F6F]">
                      {selectedSport.name}
                    </span>
                  </div>
                  <p className="text-xs text-[#6F6F6F] mb-3">
                    Select your skill level:
                  </p>
                  <TooltipProvider>
                    <div className="grid grid-cols-1 gap-3">
                      {skills.map((skill) => (
                        <Tooltip key={skill.id}>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              onClick={() =>
                                handleAddSportSkill(selectedSport, skill)
                              }
                              className={`text-left border-2 rounded-lg p-4 text-sm font-medium transition-all duration-200 hover:scale-[1.02] hover:shadow-sm ${getSkillLevelColor(skill.name)} ${getSkillLevelHoverColor(skill.name)}`}
                            >
                              {skill.name}
                            </Button>
                          </TooltipTrigger>
                          {skill.description && (
                            <TooltipContent>
                              <p className="max-w-xs">{skill.description}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      ))}
                    </div>
                  </TooltipProvider>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {!showTitle && (
        <p className="text-xs text-gray-500 mt-4">
          This information helps us match you with appropriate leagues and teams based on your interests and skill level.
        </p>
      )}
    </div>
  );
}