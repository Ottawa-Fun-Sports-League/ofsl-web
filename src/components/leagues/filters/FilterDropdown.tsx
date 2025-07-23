import { ChevronDown } from "lucide-react";

interface FilterDropdownProps {
  label: string;
  value: string;
  options: string[];
  isActive: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
  dropdownRef: (el: HTMLDivElement | null) => void;
}

export function FilterDropdown({
  value,
  options,
  isActive,
  isOpen,
  onToggle,
  onChange,
  dropdownRef,
}: FilterDropdownProps) {
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className={`flex items-center justify-between w-full md:w-auto min-w-[180px] border-b-2 px-3 py-2 text-sm transition-colors duration-200 ${
          isActive
            ? "border-b-[#B20000] text-[#B20000]"
            : "border-b-gray-200 text-gray-600 hover:border-b-gray-300"
        }`}
        onClick={onToggle}
      >
        <span>{value}</span>
        <ChevronDown
          className={`h-4 w-4 ml-2 ${
            isActive ? "text-[#B20000]" : "text-gray-400"
          }`}
        />
      </button>
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-[#D4D4D4] rounded-lg shadow-lg">
          {options.map((option) => (
            <button
              key={option}
              className={`block w-full text-left px-4 py-2 transition-colors duration-200 hover:bg-[#ffeae5] hover:text-[#B20000] ${
                value === option
                  ? "bg-[#ffeae5] text-[#B20000] font-medium"
                  : ""
              }`}
              onClick={() => onChange(option)}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

