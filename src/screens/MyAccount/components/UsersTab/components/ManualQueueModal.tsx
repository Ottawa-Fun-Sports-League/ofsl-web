import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../../../components/ui/dialog';
import { Button } from '../../../../../components/ui/button';
import { Input } from '../../../../../components/ui/input';
import { MailX, UserRound } from 'lucide-react';
import { BulkEmailRecipient } from '../types';

interface ManualQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipients: BulkEmailRecipient[];
  onRemoveRecipient: (email: string) => void;
  onClearRecipients: () => void;
}

export function ManualQueueModal({
  isOpen,
  onClose,
  recipients,
  onRemoveRecipient,
  onClearRecipients,
}: ManualQueueModalProps) {
  const [search, setSearch] = useState('');

  const filteredRecipients = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return recipients;
    return recipients.filter((recipient) => {
      const email = recipient.email?.toLowerCase() ?? '';
      const name = recipient.name?.toLowerCase() ?? '';
      return email.includes(term) || name.includes(term);
    });
  }, [recipients, search]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manual Email Queue</DialogTitle>
          <DialogDescription>
            Review the contacts you&apos;ve manually added. Removing someone here will exclude them from the next bulk email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <UserRound className="h-4 w-4 text-purple-600" />
              {recipients.length} contact{recipients.length === 1 ? '' : 's'} in queue
            </div>
            <Input
              placeholder="Filter by name or email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="md:w-72"
            />
          </div>

          <div className="max-h-80 overflow-y-auto rounded-md border border-gray-200 bg-gray-50">
            <div className="divide-y divide-gray-200">
              {filteredRecipients.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500">
                  {recipients.length === 0
                    ? 'The queue is currently empty.'
                    : 'No contacts match your filter.'}
                </p>
              ) : (
                filteredRecipients.map((recipient) => (
                  <div
                    key={recipient.email}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {recipient.name ? `${recipient.name} (${recipient.email})` : recipient.email}
                      </p>
                      {recipient.userId ? (
                        <p className="text-xs text-gray-500">User ID: {recipient.userId}</p>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveRecipient(recipient.email)}
                      className="text-gray-500 hover:text-red-600"
                      aria-label={`Remove ${recipient.name ?? recipient.email} from queue`}
                    >
                      <MailX className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Close
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onClearRecipients}
            className="border-purple-300 text-purple-700 hover:bg-purple-100"
            disabled={recipients.length === 0}
          >
            Clear Queue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
