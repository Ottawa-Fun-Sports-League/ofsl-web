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
import { HomePageContentForm } from "./components/HomePageContentForm";
import { SportPageContentForm } from "./components/SportPageContentForm";
import { VolleyballContentForm } from "./components/VolleyballContentForm";
import { DEFAULT_BADMINTON_CONTENT } from "../../../BadmintonPage/BadmintonPage";
import { DEFAULT_PICKLEBALL_CONTENT } from "../../../PickleballPage/PickleballPage";

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
  const [activeTab, setActiveTab] = useState<
    "announcement" | "home" | "badminton" | "pickleball" | "volleyball"
  >("announcement");

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

  const handleTextChange =
    (field: "message" | "linkText" | "linkUrl") =>
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

    const result = await saveAnnouncement({
      id: currentAnnouncement?.id,
      message: trimmedMessage,
      linkText: trimmedLinkText || null,
      linkUrl: trimmedLinkUrl || null,
      isActive: formState.isActive,
    });

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
      <div className="max-w-5xl mx-auto">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const renderAnnouncementForm = () => (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <form id="site-settings-form" onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
        <div className="border-b border-gray-200 pb-5">
          <h2 className="text-2xl font-semibold text-[#6F6F6F]">Announcement Bar</h2>
          <p className="mt-2 text-sm text-gray-500">
            Update the message displayed at the top of the website. Leave the announcement disabled
            to hide the bar for visitors.
          </p>
          {lastUpdatedLabel ? (
            <p className="mt-2 text-xs text-gray-400">Last updated {lastUpdatedLabel}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label
            className="block text-sm font-medium text-[#6F6F6F]"
            htmlFor="announcement-message"
          >
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
            <label
              className="block text-sm font-medium text-[#6F6F6F]"
              htmlFor="announcement-link-text"
            >
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
            <label
              className="block text-sm font-medium text-[#6F6F6F]"
              htmlFor="announcement-link-url"
            >
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
      </form>
    </div>
  );

  const renderActiveTab = () => {
    switch (activeTab) {
      case "announcement":
        return renderAnnouncementForm();
      case "home":
        return <HomePageContentForm />;
      case "badminton":
        return (
          <SportPageContentForm
            pageSlug="badminton"
            label="Badminton Landing Page"
            description="Update the hero banner, intro text, and default imagery used on the badminton landing page."
            defaultContent={DEFAULT_BADMINTON_CONTENT}
          />
        );
      case "pickleball":
        return (
          <SportPageContentForm
            pageSlug="pickleball"
            label="Pickleball Landing Page"
            description="Manage the hero and supporting copy for pickleball, including the default card imagery."
            defaultContent={DEFAULT_PICKLEBALL_CONTENT}
          />
        );
      case "volleyball":
        return <VolleyballContentForm />;
      default:
        return null;
    }
  };

  const tabs: Array<{
    id: typeof activeTab;
    label: string;
  }> = [
    { id: "announcement", label: "Announcement" },
    { id: "home", label: "Home Page" },
    { id: "badminton", label: "Badminton" },
    { id: "volleyball", label: "Volleyball" },
    { id: "pickleball", label: "Pickleball" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-12">
      <div className="sticky top-[64px] z-20 bg-white/95 backdrop-blur border-b border-gray-200">
        <div className="flex flex-wrap items-center gap-2 px-4 py-4">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                type="button"
                variant={tab.id === activeTab ? "default" : "outline"}
                className={
                  tab.id === activeTab
                    ? "bg-[#B20000] hover:bg-[#8A0000] text-white"
                    : "text-[#6F6F6F] border-gray-300"
                }
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {(() => {
              const formId = (() => {
                switch (activeTab) {
                  case "announcement":
                    return "site-settings-form";
                  case "home":
                    return "site-settings-form-home";
                  case "badminton":
                    return "site-settings-form-badminton";
                  case "pickleball":
                    return "site-settings-form-pickleball";
                  case "volleyball":
                    return "site-settings-form-volleyball";
                  default:
                    return null;
                }
              })();

              if (!formId) return null;

              const handleDiscard = () => {
                const form = document.getElementById(formId) as HTMLFormElement | null;
                form?.reset();
              };

              return (
                <>
                  <Button
                    type="submit"
                    form={formId}
                    className="bg-[#B20000] hover:bg-[#8A0000] text-white"
                  >
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="text-[#6F6F6F] border-gray-300"
                    onClick={handleDiscard}
                  >
                    Discard
                  </Button>
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {renderActiveTab()}
    </div>
  );
}
