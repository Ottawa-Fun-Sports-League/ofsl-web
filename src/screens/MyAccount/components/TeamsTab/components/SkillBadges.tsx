
interface SkillBadgesProps {
  skillNames: string[] | null | undefined;
  fallbackSkill: string | null | undefined;
}

export function SkillBadges({ skillNames, fallbackSkill }: SkillBadgesProps) {
  // If we have skill_names array with values, display those
  if (skillNames && skillNames.length > 0) {
    return (
      <div className="flex flex-wrap gap-1 justify-end">
        {skillNames.map((skillName, index) => (
          <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
            {skillName}
          </span>
        ))}
      </div>
    );
  }
  
  // Fallback to single skill if no skill_names array
  if (fallbackSkill) {
    return (
      <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
        {fallbackSkill}
      </span>
    );
  }
  
  // No skills to display
  return null;
}