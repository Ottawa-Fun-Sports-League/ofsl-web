import { useMemo } from 'react';
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
import { RichTextEditor } from '../../../../../components/ui/rich-text-editor';
import { Loader2, RefreshCw, Info, CheckCircle2, AlertTriangle, Mail } from 'lucide-react';
import { Checkbox } from '../../../../../components/ui/checkbox';

interface BulkEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  loadingRecipients: boolean;
  missingEmailCount: number;
  onRefreshRecipients: () => void;
  subject: string;
  onSubjectChange: (value: string) => void;
  body: string;
  onBodyChange: (value: string) => void;
  onSend: () => void;
  sending: boolean;
  sendCopyToInfo: boolean;
  onToggleSendCopyToInfo: (value: boolean) => void;
  sendCopyToFacilitator: boolean;
  onToggleSendCopyToFacilitator: (value: boolean) => void;
  filteredRecipientCount: number;
  manualRecipientCount: number;
  manualOverlapCount: number;
  includeFilteredRecipients: boolean;
  onToggleIncludeFilteredRecipients: (value: boolean) => void;
  resultSummary?: {
    sent: number;
    failed: number;
    invalid: number;
  } | null;
}

const PLACEHOLDER_TOKENS: Array<{ token: string; description: string }> = [
  { token: '{{first_name}}', description: "Replaced with the recipient's first name if available, or their full name." },
  { token: '{{full_name}}', description: "Replaced with the recipient's full name when provided, otherwise their email." },
  { token: '{{email}}', description: "Replaced with the recipient's email address." },
];

export function BulkEmailModal({
  isOpen,
  onClose,
  loadingRecipients,
  missingEmailCount,
  onRefreshRecipients,
  subject,
  onSubjectChange,
  body,
  onBodyChange,
  onSend,
  sending,
  sendCopyToInfo,
  onToggleSendCopyToInfo,
  sendCopyToFacilitator,
  onToggleSendCopyToFacilitator,
  includeFilteredRecipients,
  onToggleIncludeFilteredRecipients,
  filteredRecipientCount,
  manualRecipientCount,
  manualOverlapCount,
  resultSummary,
}: BulkEmailModalProps) {
  const filteredCount = includeFilteredRecipients ? filteredRecipientCount : 0;
  const manualOnlyCount = includeFilteredRecipients
    ? Math.max(manualRecipientCount - manualOverlapCount, 0)
    : manualRecipientCount;
  const totalRecipients = filteredCount + manualOnlyCount;

  const summaryText = useMemo(() => {
    if (loadingRecipients) {
      return 'Loading recipients...';
    }
    if (totalRecipients === 0) {
      return 'No recipients selected. Add users manually or adjust your filters.';
    }
    let base = `${totalRecipients.toLocaleString()} recipient${totalRecipients === 1 ? '' : 's'} will receive an individual email.`;
    if (includeFilteredRecipients && missingEmailCount > 0) {
      base += ` ${missingEmailCount} filtered user${missingEmailCount === 1 ? ' is' : 's are'} missing an email address will be skipped.`;
    }
    if (!includeFilteredRecipients) {
      if (manualRecipientCount > 0) {
        base += ` Only manually selected contacts (${manualRecipientCount}) will receive this message.`;
      } else {
        base += ' Only manually selected contacts will receive this message.';
      }
    } else if (manualRecipientCount > 0) {
      if (manualOnlyCount > 0) {
        base += ` Includes ${manualOnlyCount} manually added contact${manualOnlyCount === 1 ? '' : 's'}.`;
      }
      if (manualOverlapCount > 0) {
        base += ` (${manualOverlapCount} already matched the filtered list.)`;
      }
    }
    return base;
  }, [includeFilteredRecipients, loadingRecipients, manualOnlyCount, manualOverlapCount, manualRecipientCount, missingEmailCount, totalRecipients]);

  const isSendDisabled = sending || loadingRecipients || totalRecipients === 0 || !subject.trim() || !body.trim();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Send Bulk Email</DialogTitle>
          <DialogDescription>
            Craft a message to everyone in the current filtered list. Each user receives their own email with optional personalization tokens.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex flex-col gap-3 rounded-md border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-start gap-2">
              {loadingRecipients ? (
                <Loader2 className="h-4 w-4 animate-spin text-[#B20000] mt-1" />
              ) : (
                <Info className="h-4 w-4 text-[#B20000] mt-1" />
              )}
              <p className="text-sm text-gray-700">
                {summaryText}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRefreshRecipients}
                disabled={loadingRecipients || sending}
                className="border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Recipients
              </Button>
              {resultSummary && (resultSummary.sent > 0 || resultSummary.failed > 0 || resultSummary.invalid > 0) && (
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                  <span className="flex items-center gap-1 text-green-700">
                    <CheckCircle2 className="h-4 w-4" /> Sent: {resultSummary.sent}
                  </span>
                  {resultSummary.failed > 0 && (
                    <span className="flex items-center gap-1 text-red-600">
                      <AlertTriangle className="h-4 w-4" /> Failed: {resultSummary.failed}
                    </span>
                  )}
                  {resultSummary.invalid > 0 && (
                    <span className="flex items-center gap-1 text-orange-600">
                      <AlertTriangle className="h-4 w-4" /> Skipped: {resultSummary.invalid}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700" htmlFor="bulk-email-subject">
              Subject
            </label>
            <Input
              id="bulk-email-subject"
              name="bulk-email-subject"
              placeholder="Enter subject line"
              value={subject}
              onChange={(event) => onSubjectChange(event.target.value)}
              maxLength={200}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Message</label>
              <span className="text-xs text-gray-500">Supports HTML formatting</span>
            </div>
            <RichTextEditor
              value={body}
              onChange={onBodyChange}
              placeholder="Write your email message..."
              rows={12}
            />
            <div className="rounded-md border border-dashed border-gray-300 bg-white p-3">
              <p className="text-xs font-semibold text-gray-600 mb-2">Available personalization tokens</p>
              <ul className="space-y-1 text-xs text-gray-600">
                {PLACEHOLDER_TOKENS.map(({ token, description }) => (
                  <li key={token} className="flex gap-2">
                    <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-[#B20000]">{token}</code>
                    <span>{description}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-md border border-gray-200 bg-white p-4 space-y-3">
            <p className="text-sm font-medium text-gray-700">Send copies</p>
            <p className="text-xs text-gray-600">
              These addresses will receive the same personalized message once. Leave checked to keep OFSL staff in the loop.
            </p>
            <div className="space-y-2">
              <label className="flex items-start gap-3 text-sm text-gray-700">
                <Checkbox
                  id="bulk-email-copy-info"
                  checked={sendCopyToInfo}
                  onCheckedChange={(checked) => onToggleSendCopyToInfo(checked === true)}
                />
                <span>
                  <strong>info@ofsl.ca</strong>
                  <span className="block text-xs text-gray-500">General OFSL inbox receives a copy.</span>
                </span>
              </label>
              <label className="flex items-start gap-3 text-sm text-gray-700">
                <Checkbox
                  id="bulk-email-copy-facilitator"
                  checked={sendCopyToFacilitator}
                  onCheckedChange={(checked) => onToggleSendCopyToFacilitator(checked === true)}
                />
                <span>
                  <strong>facilitator@ofsl.ca</strong>
                  <span className="block text-xs text-gray-500">Facilitator inbox gets the same message.</span>
                </span>
              </label>
            </div>
          </div>

          <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
            <label className="flex items-start gap-3 text-sm text-gray-700">
              <Checkbox
                id="bulk-email-include-filtered"
                checked={includeFilteredRecipients}
                onCheckedChange={(checked) => onToggleIncludeFilteredRecipients(checked === true)}
              />
              <span>
                <strong>Include users matching current filters</strong>
                <span className="block text-xs text-gray-500">When unchecked, only manually added contacts will be emailed.</span>
              </span>
            </label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={sending}
            className="border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onSend}
            disabled={isSendDisabled}
            className="bg-[#B20000] hover:bg-[#8A0000] text-white flex items-center gap-2"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            <span>{sending ? 'Sending…' : 'Send Email'}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
