import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, render, waitFor } from '@testing-library/react';
import { ManageTeamsTab } from '../ManageTeamsTab';
import { supabase } from '../../../../../lib/supabase';

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

// Mock auth context
vi.mock('../../../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    userProfile: { 
      id: 'test-user-id', 
      is_admin: true,
      name: 'Test User',
      email: 'test@example.com'
    },
  }),
}));

// Mock supabase
vi.mock('../../../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('ManageTeamsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays skill level for individual registrations', async () => {
    // Mock sequential queries
    let leaguesCallCount = 0;
    
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'teams') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: 1,
                name: 'Test Team',
                captain_id: 'captain-id',
                roster: ['player1', 'player2'],
                active: true,
                created_at: '2024-01-01',
                league_id: 1,
                skill_level_id: 2,
                skills: { id: 2, name: 'Intermediate' },
                users: { name: 'Captain Name', email: 'captain@example.com' }
              }
            ],
            error: null
          })
        } as unknown as ReturnType<typeof supabase.from>;
      }
      
      if (table === 'leagues') {
        leaguesCallCount++;
        if (leaguesCallCount === 1) {
          // First call for all leagues
          return {
            select: vi.fn().mockResolvedValue({
              data: [
                { id: 1, name: 'Team League' },
                { id: 2, name: 'Individual League' }
              ],
              error: null
            })
          } as unknown as ReturnType<typeof supabase.from>;
        } else {
          // Second call for individual leagues
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: [
                { id: 2, name: 'Individual League', team_registration: false }
              ],
              error: null
            })
          } as unknown as ReturnType<typeof supabase.from>;
        }
      }
      
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnThis(),
          not: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'user1',
                name: 'Individual Player',
                email: 'player@example.com',
                league_ids: [2]
              }
            ],
            error: null
          })
        } as unknown as ReturnType<typeof supabase.from>;
      }
      
      if (table === 'league_payments') {
        return {
          select: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({
            data: [
              {
                user_id: 'user1',
                league_id: 2,
                amount_due: 100,
                amount_paid: 50,
                status: 'partial',
                skill_level_id: 3,
                skills: { id: 3, name: 'Advanced' }
              }
            ],
            error: null
          })
        } as unknown as ReturnType<typeof supabase.from>;
      }
      
      return {} as unknown as ReturnType<typeof supabase.from>;
    });

    render(<ManageTeamsTab />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Manage Registrations')).toBeInTheDocument();
    });

    // Click on Individual Registrations tab
    const individualTab = screen.getByText('Individual Registrations (1)');
    individualTab.click();

    // Wait for individual registrations to display
    await waitFor(() => {
      expect(screen.getByText('Individual Player')).toBeInTheDocument();
    });

    // Check that skill level is displayed for individual registration
    expect(screen.getByText('Advanced')).toBeInTheDocument();
    expect(screen.getByText('Skill: Advanced')).toBeInTheDocument();
  });

  it('displays skill level for team registrations', async () => {
    // Mock sequential queries
    let leaguesCallCount = 0;
    
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'teams') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: 1,
                name: 'Skilled Team',
                captain_id: 'captain-id',
                roster: ['player1', 'player2'],
                active: true,
                created_at: '2024-01-01',
                league_id: 1,
                skill_level_id: 4,
                skills: { id: 4, name: 'Competitive' },
                users: { name: 'Captain Name', email: 'captain@example.com' }
              }
            ],
            error: null
          })
        } as unknown as ReturnType<typeof supabase.from>;
      }
      
      if (table === 'leagues') {
        leaguesCallCount++;
        if (leaguesCallCount === 1) {
          // First call for all leagues
          return {
            select: vi.fn().mockResolvedValue({
              data: [{ id: 1, name: 'Team League' }],
              error: null
            })
          } as unknown as ReturnType<typeof supabase.from>;
        } else {
          // Second call for individual leagues
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: [],
              error: null
            })
          } as unknown as ReturnType<typeof supabase.from>;
        }
      }
      
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnThis(),
          not: vi.fn().mockResolvedValue({
            data: [],
            error: null
          })
        } as unknown as ReturnType<typeof supabase.from>;
      }
      
      if (table === 'league_payments') {
        return {
          select: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({
            data: [],
            error: null
          })
        } as unknown as ReturnType<typeof supabase.from>;
      }
      
      return {} as unknown as ReturnType<typeof supabase.from>;
    });

    render(<ManageTeamsTab />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Manage Registrations')).toBeInTheDocument();
    });

    // Check that skill level is displayed for team
    expect(screen.getByText('Skilled Team')).toBeInTheDocument();
    expect(screen.getByText('Skill: Competitive')).toBeInTheDocument();
  });
});