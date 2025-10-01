import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchActiveAnnouncement } from "../lib/announcement";
import type { SiteAnnouncement } from "../lib/announcement";

interface AnnouncementBarProps {
  visible?: boolean;
}

export function AnnouncementBar({ visible = true }: AnnouncementBarProps) {
  const [announcement, setAnnouncement] = useState<SiteAnnouncement | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadAnnouncement = async () => {
      try {
        const activeAnnouncement = await fetchActiveAnnouncement(controller.signal);
        if (!isMounted) {
          return;
        }
        setAnnouncement(activeAnnouncement);
      } finally {
        if (isMounted) {
          setLoaded(true);
        }
      }
    };

    void loadAnnouncement();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  const message = announcement?.message?.trim();
  const linkUrl = announcement?.link_url?.trim();
  const linkText = announcement?.link_text?.trim();
  const hasLink = Boolean(linkUrl && linkText);
  const isExternalLink = Boolean(linkUrl && /^https?:\/\//i.test(linkUrl));

  if (!loaded || !announcement || !announcement.is_active || !message) {
    return null;
  }

  return (
    <div
      className={`w-full bg-black relative z-50 overflow-hidden transition-all duration-300 ease-in-out
        ${visible ? "max-h-24 opacity-100 translate-y-0 py-2 md:py-2.5" : "max-h-0 opacity-0 -translate-y-2 py-0"}`}
      aria-hidden={!visible}
    >
      <div className="max-w-[1280px] mx-auto px-4 flex items-center justify-center">
        <div className="font-normal text-white text-sm md:text-base text-center">
          <span className="tracking-[0.08px]">{message} </span>
          {hasLink ? (
            isExternalLink ? (
              <a
                href={linkUrl}
                className="text-base md:text-lg underline ml-0 md:ml-2 font-bold"
                target="_blank"
                rel="noopener noreferrer"
              >
                {linkText}
              </a>
            ) : (
              <Link
                to={linkUrl as string}
                className="text-base md:text-lg underline ml-0 md:ml-2 font-bold"
              >
                {linkText}
              </Link>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}
