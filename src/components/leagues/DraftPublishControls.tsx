import { Info } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { convertDateTimeLocalToISO, formatDateTimeForInput } from "../../lib/dateUtils";
import { cn } from "../../lib/utils";
import { useCallback } from "react";

interface DraftPublishControlsProps {
  isDraft: boolean;
  onDraftChange: (value: boolean) => void;
  publishDate: string | null;
  onPublishDateChange: (value: string | null) => void;
  className?: string;
}

export function DraftPublishControls({
  isDraft,
  onDraftChange,
  publishDate,
  onPublishDateChange,
  className = "",
}: DraftPublishControlsProps) {
  const handlePublishDateChange = useCallback(
    (value: string) => {
      if (!value) {
        onPublishDateChange(null);
        return;
      }

      onPublishDateChange(convertDateTimeLocalToISO(value));
    },
    [onPublishDateChange],
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={cn(
          "grid grid-cols-1 gap-4 md:grid-cols-2",
          className,
        )}
      >
        <div className="flex items-center justify-between rounded-xl bg-[#F8F8F8] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[#6F6F6F]">Draft mode</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-gray-400 transition-colors hover:text-[#B20000] focus:outline-none"
                  aria-label="What is draft mode?"
                >
                  <Info className="h-4 w-4" aria-hidden="true" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-center leading-5">
                Keep the league hidden from the public while it&apos;s in progress.
                Only admins can view draft leagues.
              </TooltipContent>
            </Tooltip>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isDraft}
            onClick={() => onDraftChange(!isDraft)}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full border border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-[#B20000]/40 focus:ring-offset-2",
              isDraft ? "bg-[#B20000]" : "bg-gray-300 hover:bg-gray-400",
            )}
          >
            <span className="sr-only">Toggle draft mode</span>
            <span
              aria-hidden="true"
              className={cn(
                "inline-block h-5 w-5 transform rounded-full bg-white transition-transform",
                isDraft ? "translate-x-5" : "translate-x-1",
              )}
            />
          </button>
        </div>

        <div className="flex flex-col gap-3 rounded-xl bg-[#F8F8F8] px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[#6F6F6F]">
                Publish date &amp; time
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-gray-400 transition-colors hover:text-[#B20000] focus:outline-none"
                    aria-label="How does scheduled publishing work?"
                  >
                    <Info className="h-4 w-4" aria-hidden="true" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-center leading-5">
                  Set an automatic go-live time. Leave this empty if you want to publish
                  manually.
                </TooltipContent>
              </Tooltip>
            </div>
            {publishDate ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => onPublishDateChange(null)}
                className="h-7 px-2 text-xs font-medium text-[#B20000] hover:bg-[#B20000]/10"
              >
                Clear
              </Button>
            ) : null}
          </div>
          <Input
            type="datetime-local"
            value={formatDateTimeForInput(publishDate)}
            onChange={(event) => handlePublishDateChange(event.target.value)}
            className="w-full"
            aria-label="Publish date and time"
          />
        </div>
      </div>
    </TooltipProvider>
  );
}
