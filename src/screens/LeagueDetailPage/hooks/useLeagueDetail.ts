import { useState } from "react";

export type ActiveView =
  | "info"
  | "standings"
  | "schedule"
  | "gyms"
  | "facilitators";

export const useActiveView = (initialView: ActiveView = "info") => {
  const [activeView, setActiveView] = useState<ActiveView>(initialView);

  return {
    activeView,
    setActiveView,
  };
};

export const useScoreSubmissionModal = () => {
  const [showScoreSubmissionModal, setShowScoreSubmissionModal] =
    useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);

  const openScoreSubmissionModal = (matchId: number) => {
    setSelectedMatchId(matchId);
    setShowScoreSubmissionModal(true);
  };

  const closeScoreSubmissionModal = () => {
    setShowScoreSubmissionModal(false);
    setSelectedMatchId(null);
  };

  return {
    showScoreSubmissionModal,
    selectedMatchId,
    openScoreSubmissionModal,
    closeScoreSubmissionModal,
  };
};

