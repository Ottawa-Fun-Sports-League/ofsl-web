import { useState, useEffect } from "react";
import { Button } from "../../../../components/ui/button";
import { AlertCircle } from "lucide-react";
import { supabase } from "../../../../lib/supabase";
import { useToast } from "../../../../components/ui/toast";

interface MissingSkillLevelPromptProps {
  missingSkillRegistrations: Array<{
    paymentId: number;
    leagueName: string;
    isTeam: boolean;
    teamId?: number;
  }>;
  onComplete: () => void;
}

const SKILL_LEVELS = [
  { id: 1, name: "Beginner", description: "New to the sport or casual player" },
  { id: 2, name: "Intermediate", description: "Regular player with good fundamentals" },
  { id: 3, name: "Advanced", description: "Experienced competitive player" },
  { id: 4, name: "Competitive", description: "High-level competitive player" },
  { id: 5, name: "Elite", description: "Tournament-level player" },
];

export function MissingSkillLevelPrompt({
  missingSkillRegistrations,
  onComplete,
}: MissingSkillLevelPromptProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedSkillId, setSelectedSkillId] = useState<number | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (missingSkillRegistrations.length > 0) {
      setIsOpen(true);
      setCurrentIndex(0);
    }
  }, [missingSkillRegistrations]);

  if (!isOpen || missingSkillRegistrations.length === 0) return null;

  const currentRegistration = missingSkillRegistrations[currentIndex];
  const isLastRegistration = currentIndex === missingSkillRegistrations.length - 1;

  // Removed handleSkip - users must set their skill level

  const handleUpdate = async () => {
    if (!selectedSkillId) {
      showToast("Please select a skill level", "error");
      return;
    }

    setIsUpdating(true);

    try {
      if (currentRegistration.isTeam && currentRegistration.teamId) {
        // Update team skill level
        const { error } = await supabase
          .from("teams")
          .update({ skill_level_id: selectedSkillId })
          .eq("id", currentRegistration.teamId);

        if (error) throw error;
      } else {
        // Update individual registration skill level
        const { error } = await supabase
          .from("league_payments")
          .update({ skill_level_id: selectedSkillId })
          .eq("id", currentRegistration.paymentId);

        if (error) throw error;
      }

      showToast("Skill level updated successfully", "success");

      if (isLastRegistration) {
        setIsOpen(false);
        onComplete();
      } else {
        setCurrentIndex(currentIndex + 1);
        setSelectedSkillId(null);
      }
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
          aria-hidden="true"
        />

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">
          &#8203;
        </span>

        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div className="sm:flex sm:items-start">
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 sm:mx-0 sm:h-10 sm:w-10">
              <AlertCircle className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Skill Level Required
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  You must set your skill level for:{" "}
                  <strong>{currentRegistration.leagueName}</strong>
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {currentIndex + 1} of {missingSkillRegistrations.length} registration{missingSkillRegistrations.length > 1 ? 's' : ''} need{missingSkillRegistrations.length === 1 ? 's' : ''} skill level
                </p>
              </div>

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
              disabled={isUpdating || !selectedSkillId}
              className="w-full sm:w-auto"
            >
              {isUpdating ? "Updating..." : "Set Skill Level"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}