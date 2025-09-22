import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AnnouncementBar } from "./AnnouncementBar";
import { fetchActiveAnnouncement } from "../lib/announcement";
import type { SiteAnnouncement } from "../lib/announcement";

vi.mock("../lib/announcement", () => ({
  fetchActiveAnnouncement: vi.fn(),
}));

describe("AnnouncementBar", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("does not render when no active announcement exists", async () => {
    vi.mocked(fetchActiveAnnouncement).mockResolvedValue(null);

    const { container } = render(
      <MemoryRouter>
        <AnnouncementBar />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(fetchActiveAnnouncement).toHaveBeenCalled();
    });

    expect(container).toBeEmptyDOMElement();
  });

  it("renders announcement message with internal link", async () => {
    const announcement: SiteAnnouncement = {
      id: "123",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      message: "Winter leagues registration is now open!",
      link_text: "Register now",
      link_url: "/leagues",
      is_active: true,
    };

    vi.mocked(fetchActiveAnnouncement).mockResolvedValue(announcement);

    render(
      <MemoryRouter>
        <AnnouncementBar />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(announcement.message)).toBeInTheDocument();
    });

    const link = screen.getByRole("link", { name: announcement.link_text ?? "" });
    expect(link).toHaveAttribute("href", announcement.link_url);
  });
});
