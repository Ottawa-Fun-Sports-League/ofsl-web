import { useState, useEffect } from "react";
import { Button } from "../../../../components/ui/button";
import { X } from "lucide-react";
import { supabase } from "../../../../lib/supabase";
import { useToast } from "../../../../components/ui/toast";

interface SkillLevelEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSkillId: number | null;
  isTeamRegistration: boolean;
  teamId?: number;
  paymentId?: number;
  teamName: string;
  onUpdate: (newSkillId: number, newSkillName: string) => void;
}

const SKILL_LEVELS = [
  { id: 1, name: "Beginner", description: "New to the sport or casual player" },
  { id: 2, name: "Intermediate", description: "Regular player with good fundamentals" },
  { id: 3, name: "Advanced", description: "Experienced competitive player" },
  { id: 4, name: "Competitive", description: "High-level competitive player" },
  { id: 5, name: "Elite", description: "Tournament-level player" },
];

export function SkillLevelEditModal({
  isOpen,
  onClose,
  currentSkillId,
  isTeamRegistration,
  teamId,
  paymentId,
  teamName,
  onUpdate,
}: SkillLevelEditModalProps) {
  const [selectedSkillId, setSelectedSkillId] = useState<number | null>(currentSkillId);
  const [isUpdating, setIsUpdating] = useState(false);
  const { showToast } = useToast();

  // Update selectedSkillId when modal opens with a different currentSkillId
  useEffect(() => {
    if (isOpen) {
      setSelectedSkillId(currentSkillId);
    }
  }, [isOpen, currentSkillId]);

  if (!isOpen) return null;

  const handleUpdate = async () => {
    if (!selectedSkillId) {
      showToast("Please select a skill level", "error");
      return;
    }

    setIsUpdating(true);

    try {
      if (isTeamRegistration && teamId) {
        // Update team skill level
        const { error } = await supabase
          .from("teams")
          .update({ skill_level_id: selectedSkillId })
          .eq("id", teamId);

        if (error) throw error;
      } else if (!isTeamRegistration && paymentId) {
        // Update individual registration skill level
        const { error } = await supabase
          .from("league_payments")
          .update({ skill_level_id: selectedSkillId })
          .eq("id", paymentId);

        if (error) throw error;
      } else {
        throw new Error("Missing required IDs for update");
      }

      const selectedSkill = SKILL_LEVELS.find((s) => s.id === selectedSkillId);
      if (selectedSkill) {
        onUpdate(selectedSkillId, selectedSkill.name);
      }
      
      showToast("Skill level updated successfully", "success");
      onClose();
    } catch (error) {
      console.error("Error updating skill level:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update skill level";
      showToast(errorMessage, "error");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">
          &#8203;
        </span>

        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              type="button"
              className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              onClick={onClose}
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Edit Skill Level
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Update the skill level for {isTeamRegistration ? "team" : "individual"} registration: <strong>{teamName}</strong>
              </p>

              <div className="mt-4 space-y-2">
                {SKILL_LEVELS.map((skill) => (
                  <div
                    key={skill.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedSkillId === skill.id
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setSelectedSkillId(skill.id)}
                  >
                    <div className="flex items-start">
                      <input
                        type="radio"
                        name="skill"
                        value={skill.id}
                        checked={selectedSkillId === skill.id}
                        onChange={() => setSelectedSkillId(skill.id)}
                        className="mt-1 h-4 w-4 text-primary focus:ring-primary"
                      />
                      <div className="ml-3">
                        <label className="block text-sm font-medium text-gray-900">
                          {skill.name}
                        </label>
                        <p className="text-sm text-gray-500">{skill.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-2">
            <Button
              onClick={handleUpdate}
              disabled={isUpdating || !selectedSkillId || selectedSkillId === currentSkillId}
              className="w-full sm:w-auto"
            >
              {isUpdating ? "Updating..." : "Update Skill Level"}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isUpdating}
              className="w-full sm:w-auto mt-2 sm:mt-0"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}