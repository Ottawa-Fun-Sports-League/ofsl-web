import { useState } from 'react';
import { Button } from '../../../../../components/ui/button';
import { Input } from '../../../../../components/ui/input';
import { Copy } from 'lucide-react';
import { LeagueWithTeamCount } from '../types';

interface CopyLeagueDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newName: string) => void;
  league: LeagueWithTeamCount | null;
  saving: boolean;
}

export function CopyLeagueDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  league, 
  saving 
}: CopyLeagueDialogProps) {
  const [newName, setNewName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      onConfirm(newName.trim());
    }
  };

  const handleClose = () => {
    setNewName('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex items-start mb-4">
            <div className="flex-shrink-0">
              <Copy className="h-6 w-6 text-[#B20000]" />
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-gray-900">Copy League</h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  Create a new league with the same settings as &ldquo;{league?.name}&rdquo;
                </p>
              </div>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="original-name" className="block text-sm font-medium text-gray-700">
                Original League
              </label>
              <Input
                id="original-name"
                value={league?.name || ''}
                disabled
                className="bg-gray-50"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="new-name" className="block text-sm font-medium text-gray-700">
                New League Name*
              </label>
              <Input
                id="new-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter name for the new league"
                disabled={saving}
                required
              />
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              <Button
                type="button"
                onClick={handleClose}
                disabled={saving}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving || !newName.trim()}
                className="bg-[#B20000] hover:bg-[#990000] text-white"
              >
                {saving ? 'Creating...' : 'Copy League'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}