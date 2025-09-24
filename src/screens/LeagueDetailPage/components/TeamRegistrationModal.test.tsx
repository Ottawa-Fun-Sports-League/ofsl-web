import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TeamRegistrationModal } from "./TeamRegistrationModal";
import { BrowserRouter } from "react-router-dom";
import { supabase } from "../../../lib/supabase";
import type { League } from "../../../lib/leagues";

// Mock supabase
vi.mock("../../../lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({ data: { cost: 100 }, error: null }),
          ),
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: { id: 1, name: "Test Team" },
              error: null,
            }),
          ),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
    functions: {
      invoke: vi.fn(() => Promise.resolve({ error: null })),
    },
    auth: {
      getSession: vi.fn(() =>
        Promise.resolve({
          data: { session: { access_token: "test-token" } },
        }),
      ),
    },
  },
}));

// Mock toast
const mockShowToast = vi.fn();
vi.mock("../../../components/ui/toast", () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock AuthContext
const mockUser = {
  id: "test-user-id",
  email: "test@example.com",
};

const mockUserProfile = {
  id: "test-user-id",
  name: "Test User",
  phone: "123-456-7890",
  user_sports_skills: [{ sport_id: 1, skill_id: 2 }],
  profile_completed: true,
  team_ids: [],
};

vi.mock("../../../contexts/AuthContext", () => ({
  useAuth: () => ({
    user: mockUser,
    userProfile: mockUserProfile,
    loading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    updateProfile: vi.fn(),
    refreshUserProfile: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const mockLeague: Partial<League> = {
  id: 1,
  name: "Test League",
  cost: 100,
  sport_name: "Volleyball",
  skill_name: "Intermediate",
  day_of_week: 3,
  start_date: "2024-01-01",
  end_date: "2024-03-01",
  hide_day: false,
  gyms: [
    {
      id: 1,
      gym: "Test Gym",
      address: "123 Test St",
      locations: ["East", "West"],
    },
  ],
};

const renderComponent = (props = {}) => {
  return render(
    <BrowserRouter>
      <TeamRegistrationModal
        showModal={true}
        closeModal={vi.fn()}
        leagueId={1}
        leagueName="Test League"
        league={mockLeague}
        isWaitlist={false}
        {...props}
      />
    </BrowserRouter>,
  );
};

describe("TeamRegistrationModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders modal with league information", () => {
    renderComponent();

    // Check league name is displayed
    expect(screen.getByText("Test League")).toBeInTheDocument();

    // Check league details are displayed
    expect(screen.getByText("Wednesday")).toBeInTheDocument();
    expect(screen.getByText("East, West")).toBeInTheDocument();
    expect(screen.getByText(/Jan 1, 2024 - Mar 1, 2024/)).toBeInTheDocument();

    // Check cost is displayed in the league info section
    const costLabel = screen.getByText("Cost:");
    expect(costLabel).toBeInTheDocument();

    // Check the cost amount is displayed
    const costText = costLabel.parentElement?.textContent;
    expect(costText).toContain("$113.00");
  });


  it("handles waitlist registration", () => {
    renderComponent({ isWaitlist: true });

    // Check waitlist-specific content
    expect(screen.getByText("Join Waitlist")).toBeInTheDocument();
    expect(screen.getByText(/League's Full \(For Now!\)/)).toBeInTheDocument();
    expect(screen.getByText("Yes, join waitlist")).toBeInTheDocument();

    // Team name input should not be present for waitlist
    expect(
      screen.queryByPlaceholderText("Enter your team name"),
    ).not.toBeInTheDocument();
  });

  it("sends email confirmation without deposit info when league has no deposit", async () => {
    // Mock league without deposit
    const leagueNoDeposit = {
      ...mockLeague,
      deposit_amount: null,
      deposit_date: null,
    };

    // Mock skills and team creation
    vi.mocked(supabase.from).mockImplementation(
      (table: string): ReturnType<typeof supabase.from> => {
        if (table === "skills") {
          return {
            select: vi.fn(() => ({
              order: vi.fn(() =>
                Promise.resolve({
                  data: [
                    { id: 2, name: "Intermediate", description: "Some experience", order_index: 2 },
                  ],
                  error: null,
                }),
              ),
            })),
          } as unknown as ReturnType<typeof supabase.from>;
        }
        if (table === "leagues") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: { cost: 100 },
                    error: null,
                  }),
                ),
              })),
            })),
          } as unknown as ReturnType<typeof supabase.from>;
        }
        if (table === "teams") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  order: vi.fn(() => ({
                    limit: vi.fn(() =>
                      Promise.resolve({
                        data: [],
                        error: null,
                      }),
                    ),
                  })),
                })),
              })),
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: {
                      id: 1,
                      name: "Test Team",
                      active: true,
                      skill_level_id: 2,
                    },
                    error: null,
                  }),
                ),
              })),
            })),
          } as unknown as ReturnType<typeof supabase.from>;
        }
        if (table === "users") {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null })),
            })),
          } as unknown as ReturnType<typeof supabase.from>;
        }
        return {} as unknown as ReturnType<typeof supabase.from>;
      },
    );

    renderComponent({ league: leagueNoDeposit });

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText("Team Name *")).toBeInTheDocument();
    });

    // Fill in team name
    const teamNameInput = screen.getByPlaceholderText("Enter your team name");
    fireEvent.change(teamNameInput, { target: { value: "Test Team No Deposit" } });

    // Select skill level
    const skillSelect = screen.getByRole("combobox");
    fireEvent.change(skillSelect, { target: { value: "2" } });

    // Submit form
    const submitButton = screen.getByRole("button", { name: "Register" });
    fireEvent.click(submitButton);

    // Wait for email function to be called
    await waitFor(() => {
      expect(vi.mocked(supabase.functions.invoke)).toHaveBeenCalledWith(
        "send-registration-confirmation",
        expect.objectContaining({
          body: expect.objectContaining({
            teamName: "Test Team No Deposit",
            leagueName: "Test League",
            depositAmount: null,
            depositDate: null,
            isWaitlist: false,
          }),
        }),
      );
    });
  });

  it("sends email confirmation without deposit info when league has only depositAmount", async () => {
    // Mock league with only deposit amount (no date)
    const leagueWithOnlyAmount = {
      ...mockLeague,
      deposit_amount: 200,
      deposit_date: null,
    };

    // Mock skills and team creation
    vi.mocked(supabase.from).mockImplementation(
      (table: string): ReturnType<typeof supabase.from> => {
        if (table === "skills") {
          return {
            select: vi.fn(() => ({
              order: vi.fn(() =>
                Promise.resolve({
                  data: [
                    { id: 2, name: "Intermediate", description: "Some experience", order_index: 2 },
                  ],
                  error: null,
                }),
              ),
            })),
          } as unknown as ReturnType<typeof supabase.from>;
        }
        if (table === "leagues") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: { cost: 100 },
                    error: null,
                  }),
                ),
              })),
            })),
          } as unknown as ReturnType<typeof supabase.from>;
        }
        if (table === "teams") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  order: vi.fn(() => ({
                    limit: vi.fn(() =>
                      Promise.resolve({
                        data: [],
                        error: null,
                      }),
                    ),
                  })),
                })),
              })),
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: {
                      id: 1,
                      name: "Test Team",
                      active: true,
                      skill_level_id: 2,
                    },
                    error: null,
                  }),
                ),
              })),
            })),
          } as unknown as ReturnType<typeof supabase.from>;
        }
        if (table === "users") {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null })),
            })),
          } as unknown as ReturnType<typeof supabase.from>;
        }
        return {} as unknown as ReturnType<typeof supabase.from>;
      },
    );

    renderComponent({ league: leagueWithOnlyAmount });

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText("Team Name *")).toBeInTheDocument();
    });

    // Fill in team name
    const teamNameInput = screen.getByPlaceholderText("Enter your team name");
    fireEvent.change(teamNameInput, { target: { value: "Test Team Only Amount" } });

    // Select skill level
    const skillSelect = screen.getByRole("combobox");
    fireEvent.change(skillSelect, { target: { value: "2" } });

    // Submit form
    const submitButton = screen.getByRole("button", { name: "Register" });
    fireEvent.click(submitButton);

    // Wait for email function to be called - should pass deposit amount but no payment section in email
    await waitFor(() => {
      expect(vi.mocked(supabase.functions.invoke)).toHaveBeenCalledWith(
        "send-registration-confirmation",
        expect.objectContaining({
          body: expect.objectContaining({
            teamName: "Test Team Only Amount",
            leagueName: "Test League",
            depositAmount: 200,
            depositDate: null,
            isWaitlist: false,
          }),
        }),
      );
    });
  });

  it("sends email confirmation with deposit info when league has deposit", async () => {
    // Mock league with deposit
    const leagueWithDeposit = {
      ...mockLeague,
      deposit_amount: 50,
      deposit_date: "2025-01-20",
    };

    // Mock skills and team creation
    vi.mocked(supabase.from).mockImplementation(
      (table: string): ReturnType<typeof supabase.from> => {
        if (table === "skills") {
          return {
            select: vi.fn(() => ({
              order: vi.fn(() =>
                Promise.resolve({
                  data: [
                    { id: 2, name: "Intermediate", description: "Some experience", order_index: 2 },
                  ],
                  error: null,
                }),
              ),
            })),
          } as unknown as ReturnType<typeof supabase.from>;
        }
        if (table === "leagues") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: { cost: 100 },
                    error: null,
                  }),
                ),
              })),
            })),
          } as unknown as ReturnType<typeof supabase.from>;
        }
        if (table === "teams") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  order: vi.fn(() => ({
                    limit: vi.fn(() =>
                      Promise.resolve({
                        data: [],
                        error: null,
                      }),
                    ),
                  })),
                })),
              })),
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: {
                      id: 1,
                      name: "Test Team",
                      active: true,
                      skill_level_id: 2,
                    },
                    error: null,
                  }),
                ),
              })),
            })),
          } as unknown as ReturnType<typeof supabase.from>;
        }
        if (table === "users") {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null })),
            })),
          } as unknown as ReturnType<typeof supabase.from>;
        }
        return {} as unknown as ReturnType<typeof supabase.from>;
      },
    );

    renderComponent({ league: leagueWithDeposit });

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText("Team Name *")).toBeInTheDocument();
    });

    // Fill in team name
    const teamNameInput = screen.getByPlaceholderText("Enter your team name");
    fireEvent.change(teamNameInput, { target: { value: "Test Team With Deposit" } });

    // Select skill level
    const skillSelect = screen.getByRole("combobox");
    fireEvent.change(skillSelect, { target: { value: "2" } });

    // Submit form
    const submitButton = screen.getByRole("button", { name: "Register" });
    fireEvent.click(submitButton);

    // Wait for email function to be called with deposit info
    await waitFor(() => {
      expect(vi.mocked(supabase.functions.invoke)).toHaveBeenCalledWith(
        "send-registration-confirmation",
        expect.objectContaining({
          body: expect.objectContaining({
            teamName: "Test Team With Deposit",
            leagueName: "Test League",
            depositAmount: 50,
            depositDate: "2025-01-20",
            isWaitlist: false,
          }),
        }),
      );
    });
  });

  it("hides disallowed skill levels for restricted leagues", async () => {
    const restrictedLeague = {
      ...mockLeague,
      skill_ids: [2],
      skill_names: ["Intermediate"],
    };

    vi.mocked(supabase.from).mockImplementation(
      (table: string): ReturnType<typeof supabase.from> => {
        if (table === "skills") {
          return {
            select: vi.fn(() => ({
              order: vi.fn(() =>
                Promise.resolve({
                  data: [
                    { id: 1, name: "Beginner", description: "New to the sport", order_index: 1 },
                    { id: 2, name: "Intermediate", description: "Some experience", order_index: 2 },
                  ],
                  error: null,
                }),
              ),
            })),
          } as unknown as ReturnType<typeof supabase.from>;
        }

        return {
          select: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            eq: vi.fn(() => ({
              single: vi.fn(() =>
                Promise.resolve({
                  data: { cost: 100 },
                  error: null,
                }),
              ),
              order: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
              })),
            })),
          })),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() =>
                Promise.resolve({
                  data: { id: 1, name: "Test Team" },
                  error: null,
                }),
              ),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          })),
        } as unknown as ReturnType<typeof supabase.from>;
      },
    );

    renderComponent({ league: restrictedLeague });

    await waitFor(() => {
      expect(screen.getByText("Team Name *")).toBeInTheDocument();
    });

    const skillSelect = screen.getByRole("combobox");
    expect(within(skillSelect).queryByRole("option", { name: /^Beginner/ })).not.toBeInTheDocument();
    expect(within(skillSelect).getByRole("option", { name: /Intermediate/ })).toBeInTheDocument();
  });

  it("allows beginner registrations when the league includes beginner", async () => {
    const beginnerFriendlyLeague = {
      ...mockLeague,
      skill_ids: [1, 2],
      skill_names: ["Beginner", "Intermediate"],
    };

    vi.mocked(supabase.from).mockImplementation(
      (table: string): ReturnType<typeof supabase.from> => {
        if (table === "skills") {
          return {
            select: vi.fn(() => ({
              order: vi.fn(() =>
                Promise.resolve({
                  data: [
                    { id: 1, name: "Beginner", description: "New to the sport", order_index: 1 },
                    { id: 2, name: "Intermediate", description: "Some experience", order_index: 2 },
                  ],
                  error: null,
                }),
              ),
            })),
          } as unknown as ReturnType<typeof supabase.from>;
        }
        if (table === "leagues") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: { cost: 100, team_registration: true },
                    error: null,
                  }),
                ),
              })),
            })),
          } as unknown as ReturnType<typeof supabase.from>;
        }
        if (table === "teams") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  order: vi.fn(() => ({
                    limit: vi.fn(() =>
                      Promise.resolve({
                        data: [],
                        error: null,
                      }),
                    ),
                  })),
                })),
              })),
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: {
                      id: 1,
                      name: "Beginner Buddies",
                      active: true,
                      skill_level_id: 1,
                    },
                    error: null,
                  }),
                ),
              })),
            })),
          } as unknown as ReturnType<typeof supabase.from>;
        }
        if (table === "league_payments") {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: { id: 1 },
                    error: null,
                  }),
                ),
              })),
            })),
          } as unknown as ReturnType<typeof supabase.from>;
        }
        if (table === "users") {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null })),
            })),
          } as unknown as ReturnType<typeof supabase.from>;
        }
        return {} as unknown as ReturnType<typeof supabase.from>;
      },
    );

    renderComponent({ league: beginnerFriendlyLeague });

    await waitFor(() => {
      expect(screen.getByText("Team Name *")).toBeInTheDocument();
    });

    const teamNameInput = screen.getByPlaceholderText("Enter your team name");
    fireEvent.change(teamNameInput, { target: { value: "Beginner Buddies" } });

    const skillSelect = screen.getByRole("combobox");
    fireEvent.change(skillSelect, { target: { value: "1" } });

    const submitButton = screen.getByRole("button", { name: "Register" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(vi.mocked(supabase.functions.invoke)).toHaveBeenCalledWith(
        "send-registration-confirmation",
        expect.objectContaining({
          body: expect.objectContaining({
            teamName: "Beginner Buddies",
            leagueName: "Test League",
            isWaitlist: false,
          }),
        }),
      );
    });
  });
});
