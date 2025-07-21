import { useState } from 'react';

export type ActiveView = 'info' | 'standings' | 'teams';

export const useActiveView = (initialView: ActiveView = 'info') => {
  const [activeView, setActiveView] = useState<ActiveView>(initialView);
  
  return {
    activeView,
    setActiveView
  };
};

export const useScoreSubmissionModal = () => {
  const [showScoreSubmissionModal, setShowScoreSubmissionModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState<number | null>(null);

  const openScoreSubmissionModal = (tierNumber: number) => {
    setSelectedTier(tierNumber);
    setShowScoreSubmissionModal(true);
  };

  const closeScoreSubmissionModal = () => {
    setShowScoreSubmissionModal(false);
    setSelectedTier(null);
  };

  return {
    showScoreSubmissionModal,
    selectedTier,
    openScoreSubmissionModal,
    closeScoreSubmissionModal
  };
};