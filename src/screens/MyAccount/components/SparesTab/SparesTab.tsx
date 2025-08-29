import React, { useState, useCallback } from 'react';
import { MySparesRegistrations } from '../../../../components/spares/MySparesRegistrations';
import { SparesListView } from '../../../../components/spares/SparesListView';

export const SparesTab: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  // Function to trigger refresh of spares list
  const handleSparesChange = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  return (
    <div className="space-y-8">
      {/* User's Own Registrations - now includes integrated signup */}
      <MySparesRegistrations 
        className="shadow-lg" 
        onSparesChange={handleSparesChange}
      />
      
      {/* Spares List View - Access controlled by component itself */}
      <SparesListView 
        className="shadow-lg" 
        key={refreshKey}
      />
    </div>
  );
};