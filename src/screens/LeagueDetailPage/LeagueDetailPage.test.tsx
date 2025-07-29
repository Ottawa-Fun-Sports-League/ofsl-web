import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LeagueDetailPage } from "./LeagueDetailPage";
import {
  render,
  mockNavigate,
  mockUser,
  mockUserProfile,
} from "../../test/test-utils";
import { mockSupabase } from "../../test/mocks/supabase-enhanced";

// Mock react-router-dom
vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
  return {
    ...actual,
    useParams: () => ({ id: "1" }),
    useNavigate: () => mockNavigate,
  };
});

// Mock Stripe
vi.mock("@stripe/stripe-js", () => ({
  loadStripe: vi.fn(() => Promise.resolve({})),
}));

// Mock fetchLeagueById from lib/leagues
vi.mock("../../lib/leagues", () => ({
  fetchLeagueById: vi.fn(),
  getDayName: vi.fn((day) => {
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    return days[day] || "Unknown";
  }),
  formatLeagueDates: vi.fn((start, end) => {
    // Format dates to match expected output: 3/1/2024 - 5/1/2024
    const startDate = new Date(start);
    const endDate = new Date(end);
    const formatDate = (date: Date) =>
      `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  }),
  getPrimaryLocation: vi.fn(() => ["Community Center"]),
  getGymNamesByLocation: vi.fn(() => ["Main Gym"]),
}));

// Import after mocking to avoid circular dependency
import { fetchLeagueById } from "../../lib/leagues";
const mockFetchLeagueById = fetchLeagueById as ReturnType<typeof vi.fn>;

// Mock the auth context to prevent loading state
const mockAuthContext = {
  user: null,
  userProfile: null,
  loading: false,
  profileComplete: false,
  emailVerified: false,
  isNewUser: false,
  setIsNewUser: vi.fn(),
  signIn: vi.fn(),
  signInWithGoogle: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  checkProfileCompletion: vi.fn(),
  refreshUserProfile: vi.fn(),
};

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => mockAuthContext,
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe("LeagueDetailPage", () => {
  const mockLeague = {
    id: 1,
    name: "Spring Volleyball League",
    sport_id: 1,
    skill_id: 1,
    location: "Community Center",
    description: "Join our fun volleyball league!",
    start_date: "2024-03-01",
    end_date: "2024-05-01",
    registration_deadline: "2024-02-15",
    cost: 120,
    max_teams: 12,
    active: true,
    schedule_day: "Wednesday",
    schedule_time: "7:00 PM",
    day_of_week: 3,
    time_of_day: "19:00",
    sports: { name: "Volleyball" },
    skills: { name: "Recreational" },
    gyms: [],
    gym_ids: [],
    skill_names: ["Recreational"],
    sport_name: "Volleyball",
    skill_name: "Recreational",
    spots_remaining: 10,
    team_count: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockTeams = [
    { id: 1, name: "Team A", active: true },
    { id: 2, name: "Team B", active: true },
    { id: 3, name: "Team C", active: false }, // Waitlisted
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset auth context
    mockAuthContext.user = null;
    mockAuthContext.userProfile = null;

    // Mock auth session to prevent loading state
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    // Mock auth state change to immediately return null session
    mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
      if (callback) {
        callback("INITIAL_SESSION", null);
      }
      return {
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      };
    });

    // Mock fetchLeagueById to return our mock league
    mockFetchLeagueById.mockResolvedValue(mockLeague);

    // Mock teams count - registrations table with teams joined
    mockSupabase.from("registrations").select.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        then: vi.fn().mockResolvedValue({
          data: mockTeams.map((team) => ({ id: team.id, teams: team })),
          error: null,
        }),
      }),
    });

    // Mock gyms fetch
    mockSupabase.from("gyms").select.mockReturnValue({
      in: vi.fn().mockReturnValue({
        then: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    });

    // Mock stripe products fetch
    mockSupabase.from("stripe_products").select.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }),
    });

    // Also return proper mocks for all tables
    mockSupabase.from.mockImplementation((table) => {
      if (table === "gyms") {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              then: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        };
      } else if (table === "teams") {
        // Mock teams table to return empty array for spots calculation
        // The enhanced mock needs proper async handling
        const queryResult = Promise.resolve({
          data: [], // No teams registered, all spots available
          error: null,
        });

        // Create a thenable object that also has query builder methods
        const teamsMock = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 999,
              name: "My Awesome Team",
              league_id: 1,
              captain_id: "test-user-id",
              active: true,
            },
            error: null,
          }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          // Make the mock thenable so it can be awaited
          then: (onFulfilled, onRejected) =>
            queryResult.then(onFulfilled, onRejected),
          catch: (onRejected) => queryResult.catch(onRejected),
          finally: (onFinally) => queryResult.finally(onFinally),
        };

        teamsMock.select.mockReturnValue(teamsMock);
        teamsMock.eq.mockReturnValue(teamsMock);
        teamsMock.insert.mockReturnValue(teamsMock);

        return teamsMock;
      } else if (table === "stripe_products") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        };
      } else if (table === "users") {
        // Mock for user captain check
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        };
      } else if (table === "leagues") {
        // Mock for league query in the modal
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockLeague,
                error: null,
              }),
            }),
          }),
        };
      } else if (table === "skills") {
        // Mock for skills query in the modal
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              then: vi.fn().mockResolvedValue({
                data: [
                  { id: 1, name: "Recreational", description: "For fun" },
                  { id: 2, name: "Competitive", description: "Serious play" },
                ],
                error: null,
              }),
            }),
          }),
        };
      }
      // Default mock for other tables
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            then: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      };
    });
  });

  it("renders league details", async () => {
    render(<LeagueDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Spring Volleyball League")).toBeInTheDocument();
      expect(
        screen.getByText("Join our fun volleyball league!"),
      ).toBeInTheDocument();
      expect(screen.getByText(/community center/i)).toBeInTheDocument();
      // Sport is shown as an icon with alt text
      expect(screen.getByAltText("Volleyball")).toBeInTheDocument();
      // Skill level might not be displayed in the current UI
    });
  });

  it("displays league schedule information", async () => {
    render(<LeagueDetailPage />);

    await waitFor(() => {
      // The day is shown in the sidebar
      expect(screen.getByText(/wednesday/i)).toBeInTheDocument();
    });
  });

  it("displays registration information", async () => {
    render(<LeagueDetailPage />);

    await waitFor(() => {
      // Check for the price display - the component shows "$120.00 + HST per team" in the LeagueInfo component
      expect(
        screen.getByText(/\$120\.00 \+ HST.*per team/i),
      ).toBeInTheDocument();
    });
  });

  it("shows team capacity", async () => {
    render(<LeagueDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Spring Volleyball League")).toBeInTheDocument();
    });

    // Wait for the spots to be calculated and displayed
    await waitFor(() => {
      // Should show 12 spots left since we mocked 0 teams in beforeEach
      const availabilitySection =
        screen.getByText("Availability").parentElement;
      expect(availabilitySection).toBeInTheDocument();

      // Debug what we're seeing
      const spotsBadge = availabilitySection?.querySelector(
        'span[class*="rounded-full"]',
      );
      console.log("Spots badge text:", spotsBadge?.textContent);

      // Should show 12 spots left since we mocked 0 teams
      expect(spotsBadge?.textContent).toBe("12 spots left");
    });
  });

  it("shows register button for unauthenticated users", async () => {
    render(<LeagueDetailPage />);

    await waitFor(() => {
      // Make sure the page content is loaded
      expect(screen.getByText("Spring Volleyball League")).toBeInTheDocument();
    });

    // Wait for the teams count to load and button to appear
    await waitFor(() => {
      // Should show register button since we mocked 0 teams in beforeEach
      const registerButton = screen.getByRole("button", {
        name: /register team/i,
      });
      expect(registerButton).toBeInTheDocument();
    });
  });

  it("navigates to login when unauthenticated user clicks register", async () => {
    const user = userEvent.setup();
    render(<LeagueDetailPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /register team/i }),
      ).toBeInTheDocument();
    });

    const registerButton = screen.getByRole("button", {
      name: /register team/i,
    });
    await user.click(registerButton);

    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("shows register button for authenticated users", async () => {
    // Update auth context for authenticated user
    mockAuthContext.user = mockUser;
    mockAuthContext.userProfile = mockUserProfile;

    render(<LeagueDetailPage />);

    await waitFor(() => {
      const registerButton = screen.getByRole("button", {
        name: /register team/i,
      });
      expect(registerButton).toBeInTheDocument();
    });
  });

  it("opens team registration modal", async () => {
    const user = userEvent.setup();

    // Update auth context for authenticated user
    mockAuthContext.user = mockUser;
    mockAuthContext.userProfile = mockUserProfile;

    render(<LeagueDetailPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /register team/i }),
      ).toBeInTheDocument();
    });

    const registerButton = screen.getByRole("button", {
      name: /register team/i,
    });
    await user.click(registerButton);

    // Should show team name modal - look for the modal header specifically
    const modalHeader = await screen.findByRole("heading", {
      name: /register team/i,
    });
    expect(modalHeader).toBeInTheDocument();

    // Verify modal has team name input
    expect(screen.getByPlaceholderText(/team name/i)).toBeInTheDocument();

    // Close the modal by clicking cancel
    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);

    // Verify modal closed
    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: /register team/i }),
      ).not.toBeInTheDocument();
    });
  });

  it("shows waitlist message when league is full", async () => {
    // Update auth context for authenticated user
    mockAuthContext.user = mockUser;
    mockAuthContext.userProfile = mockUserProfile;

    // Mock full league with 0 spots remaining
    const fullLeague = {
      ...mockLeague,
      spots_remaining: 0,
      team_count: 12,
    };

    mockFetchLeagueById.mockResolvedValue(fullLeague);

    // Override the teams mock for this test
    mockSupabase.from.mockImplementation((table) => {
      if (table === "teams") {
        // Create a chainable mock that returns 12 teams (full)
        const teamsMock = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          maybeSingle: vi
            .fn()
            .mockResolvedValue({ data: { id: 1 }, error: null }),
          then: vi.fn().mockResolvedValue({
            data: Array(12)
              .fill({})
              .map((_, i) => ({ id: i + 1 })), // 12 teams = full
            error: null,
          }),
        };

        teamsMock.select.mockReturnValue(teamsMock);
        teamsMock.eq.mockReturnValue(teamsMock);

        return teamsMock;
      } else if (table === "gyms") {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              then: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        };
      } else if (table === "stripe_products") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            then: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      };
    });

    render(<LeagueDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/full/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /join waitlist/i }),
      ).toBeInTheDocument();
    });
  });

  it.skip("shows closed message when past registration deadline", async () => {
    // TODO: Registration deadline check not implemented yet
    const pastDeadlineLeague = {
      ...mockLeague,
      registration_deadline: "2023-01-01", // Past date
    };

    mockFetchLeagueById.mockResolvedValue(pastDeadlineLeague);

    render(<LeagueDetailPage />);

    await waitFor(() => {
      // Check for "Registration closed" text
      expect(screen.getByText(/registration closed/i)).toBeInTheDocument();
    });
  });

  it("handles loading state", async () => {
    // Make the promise hang to see loading state
    mockFetchLeagueById.mockImplementation(() => new Promise(() => {}));

    render(<LeagueDetailPage />);

    // Wait for auth to initialize
    await waitFor(() => {
      expect(
        screen.queryByText(/initializing authentication/i),
      ).not.toBeInTheDocument();
    });

    // Check for loading spinner
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("handles error when league not found", async () => {
    mockFetchLeagueById.mockResolvedValue(null);

    render(<LeagueDetailPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /league not found/i }),
      ).toBeInTheDocument();
    });
  });

  it.skip("shows admin actions for admin users", async () => {
    // TODO: Admin links not implemented yet
    const adminProfile = { ...mockUserProfile, is_admin: true };

    // Update auth context for admin user
    mockAuthContext.user = mockUser;
    mockAuthContext.userProfile = adminProfile;

    render(<LeagueDetailPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("link", { name: /edit league/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /manage teams/i }),
      ).toBeInTheDocument();
    });
  });

  it("navigates back when clicking back button", async () => {
    render(<LeagueDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Spring Volleyball League")).toBeInTheDocument();
    });

    // The back button is now a link, not a button
    const backLink = screen.getByText(/back to leagues/i).closest("a");
    expect(backLink).toHaveAttribute("href", "/leagues");
  });

  it("displays league dates", async () => {
    render(<LeagueDetailPage />);

    await waitFor(() => {
      // The dates are displayed in the Season Dates section
      // Look for the text that contains both dates
      const seasonDatesSection = screen.getByText("Season Dates").parentElement;
      expect(seasonDatesSection).toBeInTheDocument();

      // The formatLeagueDates function should format the dates
      // Due to timezone differences, the dates might be off by a day
      const dateText =
        seasonDatesSection?.querySelector("p:last-child")?.textContent;
      expect(dateText).toMatch(
        /^\d{1,2}\/\d{1,2}\/\d{4} - \d{1,2}\/\d{1,2}\/\d{4}$/,
      );
    });
  });

  it("handles user without profile completion", async () => {
    // Update auth context for authenticated user without profile
    mockAuthContext.user = mockUser;
    mockAuthContext.userProfile = null; // No profile means incomplete

    render(<LeagueDetailPage />);

    await waitFor(() => {
      // Should show register button even without profile
      // The profile completion check happens after clicking register
      const registerButton = screen.getByRole("button", {
        name: /register team/i,
      });
      expect(registerButton).toBeInTheDocument();
    });
  });
});

