import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Checkbox } from "../../../../components/ui/checkbox";
import { LoadingSpinner } from "../../../../components/ui/loading-spinner";
import { useToast } from "../../../../components/ui/toast";
import {
  fetchLatestAnnouncement,
  saveAnnouncement,
  type SiteAnnouncement,
} from "../../../../lib/announcement";
import { logger } from "../../../../lib/logger";

interface FormState {
  message: string;
  linkText: string;
  linkUrl: string;
  isActive: boolean;
}

const DEFAULT_FORM_STATE: FormState = {
  message: "",
  linkText: "",
  linkUrl: "",
  isActive: false,
};

export function SiteSettingsTab() {
  const { showToast } = useToast();
  const [formState, setFormState] = useState<FormState>(DEFAULT_FORM_STATE);
  const [currentAnnouncement, setCurrentAnnouncement] = useState<SiteAnnouncement | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadAnnouncement = async () => {
      try {
        const announcement = await fetchLatestAnnouncement(controller.signal);
        if (!isMounted) {
          return;
        }

        if (announcement) {
          setCurrentAnnouncement(announcement);
          setFormState({
            message: announcement.message ?? "",
            linkText: announcement.link_text ?? "",
            linkUrl: announcement.link_url ?? "",
            isActive: announcement.is_active,
          });
        } else {
          setFormState(DEFAULT_FORM_STATE);
        }
      } catch (error) {
        logger.error("Failed to load site announcement", error as Error);
        if (isMounted) {
          showToast("Couldn't load the current announcement.", "error");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadAnnouncement();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [showToast]);

  const isDirty = useMemo(() => {
    const baseline = currentAnnouncement;

    if (!baseline) {
      return (
        formState.message.trim() !== "" ||
        formState.linkText.trim() !== "" ||
        formState.linkUrl.trim() !== "" ||
        formState.isActive !== DEFAULT_FORM_STATE.isActive
      );
    }

    return (
      (baseline.message ?? "") !== formState.message ||
      (baseline.link_text ?? "") !== formState.linkText ||
      (baseline.link_url ?? "") !== formState.linkUrl ||
      baseline.is_active !== formState.isActive
    );
  }, [currentAnnouncement, formState]);

  const lastUpdatedLabel = useMemo(() => {
    if (!currentAnnouncement?.updated_at) {
      return null;
    }

    try {
      return new Date(currentAnnouncement.updated_at).toLocaleString();
    } catch (error) {
      logger.error("Failed to parse announcement updated_at", error as Error, {
        value: currentAnnouncement.updated_at,
      });
      return currentAnnouncement.updated_at;
    }
  }, [currentAnnouncement]);

  const handleTextChange = (
    field: "message" | "linkText" | "linkUrl",
  ) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { value } = event.target;
      setFormState((prev) => ({
        ...prev,
        [field]: value,
      }));
    };

  const handleActiveChange = (checked: boolean) => {
    setFormState((prev) => ({
      ...prev,
      isActive: checked,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedMessage = formState.message.trim();
    const trimmedLinkText = formState.linkText.trim();
    const trimmedLinkUrl = formState.linkUrl.trim();

    if (!trimmedMessage) {
      showToast("Announcement message cannot be empty.", "warning");
      return;
    }

    if ((trimmedLinkText && !trimmedLinkUrl) || (!trimmedLinkText && trimmedLinkUrl)) {
      showToast("Link text and URL must both be provided.", "warning");
      return;
    }

    setSaving(true);

    const result = await saveAnnouncement({
      id: currentAnnouncement?.id,
      message: trimmedMessage,
      linkText: trimmedLinkText || null,
      linkUrl: trimmedLinkUrl || null,
      isActive: formState.isActive,
    });

    setSaving(false);

    if (!result) {
      showToast("Failed to save announcement.", "error");
      return;
    }

    setCurrentAnnouncement(result);
    setFormState({
      message: result.message ?? "",
      linkText: result.link_text ?? "",
      linkUrl: result.link_url ?? "",
      isActive: result.is_active,
    });

    showToast("Announcement updated.", "success");
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="px-6 py-5 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-[#6F6F6F]">Announcement Bar</h2>
          <p className="mt-2 text-sm text-gray-500">
            Update the message displayed at the top of the website. Leave the announcement disabled to hide the bar for visitors.
          </p>
          {lastUpdatedLabel ? (
            <p className="mt-2 text-xs text-gray-400">Last updated {lastUpdatedLabel}</p>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#6F6F6F]" htmlFor="announcement-message">
              Message
            </label>
            <textarea
              id="announcement-message"
              value={formState.message}
              onChange={handleTextChange("message")}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-[#333333] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B20000] focus-visible:ring-offset-1"
              placeholder="Share important updates, deadlines, or announcements"
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#6F6F6F]" htmlFor="announcement-link-text">
                Link Text
              </label>
              <Input
                id="announcement-link-text"
                value={formState.linkText}
                onChange={handleTextChange("linkText")}
                placeholder="e.g. Register now"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#6F6F6F]" htmlFor="announcement-link-url">
                Link URL
              </label>
              <Input
                id="announcement-link-url"
                value={formState.linkUrl}
                onChange={handleTextChange("linkUrl")}
                placeholder="e.g. /leagues or https://example.com"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Checkbox
              id="announcement-active"
              checked={formState.isActive}
              onCheckedChange={(checked) => handleActiveChange(checked === true)}
            />
            <label htmlFor="announcement-active" className="text-sm text-[#6F6F6F]">
              Display announcement bar on the site
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              type="submit"
              disabled={saving || !isDirty}
              className="min-w-[120px]"
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
