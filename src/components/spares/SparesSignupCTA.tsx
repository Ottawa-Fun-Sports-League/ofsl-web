import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Users, Plus } from 'lucide-react';
import { SparesSignupModal } from './SparesSignupModal';

interface SparesSignupCTAProps {
  className?: string;
  sportFilter?: string; // Optional filter to show only specific sport
  title?: string;
  description?: string;
  onSuccess?: () => void;
}

export const SparesSignupCTA: React.FC<SparesSignupCTAProps> = ({ 
  className = '',
  sportFilter,
  title,
  description,
  onSuccess 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const defaultTitle = sportFilter 
    ? `Join ${sportFilter} Spares List` 
    : 'Join Spares List';
  
  const defaultDescription = sportFilter
    ? `Register as a substitute player for ${sportFilter} teams that need extra players.`
    : 'Register as a substitute player for sports teams that need extra players.';

  const handleSuccess = () => {
    setIsModalOpen(false);
    if (onSuccess) {
      onSuccess();
    }
  };

  return (
    <>
      <Card className={`${className} border-2 border-dashed border-[#B20000] bg-red-50 hover:bg-red-100 transition-colors`}>
        <CardContent className="p-6 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#B20000] flex items-center justify-center">
              <Users className="h-8 w-8 text-white" />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-[#6F6F6F] mb-2">
                {title || defaultTitle}
              </h3>
              <p className="text-sm text-[#6F6F6F] mb-4">
                {description || defaultDescription}
              </p>
            </div>

            <Button
              onClick={() => setIsModalOpen(true)}
              className="bg-[#B20000] hover:bg-[#8A0000] text-white flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Join Spares List
            </Button>
          </div>
        </CardContent>
      </Card>

      <SparesSignupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        sportFilter={sportFilter}
        onSuccess={handleSuccess}
      />
    </>
  );
};