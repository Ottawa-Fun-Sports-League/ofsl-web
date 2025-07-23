import { ChevronDown, X } from 'lucide-react';

interface SkillLevelFilterProps {
  selectedSkills: string[];
  availableSkills: string[];
  isOpen: boolean;
  onToggle: () => void;
  onChange: (skill: string) => void;
  onClear: () => void;
  dropdownRef: (el: HTMLDivElement | null) => void;
}

export function SkillLevelFilter({
  selectedSkills,
  availableSkills,
  isOpen,
  onToggle,
  onChange,
  onClear,
  dropdownRef
}: SkillLevelFilterProps) {
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className={`flex items-center justify-between w-full md:w-auto min-w-[180px] border-b-2 px-3 py-2 text-sm transition-colors duration-200 ${
          selectedSkills.length > 0
            ? 'border-b-[#B20000] text-[#B20000]'
            : 'border-b-gray-200 text-gray-600 hover:border-b-gray-300'
        }`}
        onClick={onToggle}
      >
        <span>
          {selectedSkills.length === 0 
            ? 'All Skill Levels' 
            : `${selectedSkills.length} selected`}
        </span>
        <ChevronDown className={`h-4 w-4 ml-2 ${
          selectedSkills.length > 0 ? 'text-[#B20000]' : 'text-gray-400'
        }`} />
      </button>
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-[#D4D4D4] rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {selectedSkills.length > 0 && (
            <button
              className="block w-full text-left px-4 py-2 border-b hover:bg-gray-50 text-sm font-medium"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
            >
              <X className="inline-block w-4 h-4 mr-1" />
              Clear all
            </button>
          )}
          {availableSkills.map((skill) => (
            <label
              key={skill}
              className="flex items-center px-4 py-2 hover:bg-[#ffeae5] transition-colors duration-200 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedSkills.includes(skill)}
                onChange={() => onChange(skill)}
                className="mr-3 rounded border-gray-300 text-[#B20000] focus:ring-[#B20000]"
              />
              <span className={selectedSkills.includes(skill) ? 'text-[#B20000] font-medium' : ''}>
                {skill}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}