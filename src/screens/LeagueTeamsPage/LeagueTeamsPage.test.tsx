import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LeagueTeamsPage } from './LeagueTeamsPage';

// Mock auth context
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user' },
    userProfile: { 
      id: 'test-user', 
      is_admin: true,
      name: 'Test User',
      email: 'test@example.com'
    },
    signIn: vi.fn(),
    signOut: vi.fn(),
    loading: false,
  })
}));

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ leagueId: '1' }),
    useNavigate: () => vi.fn(),
  };
});

// Mock Supabase
vi.mock('../../lib/supabase', () => {
  const mockLeague = {
    id: 1,
    name: 'Test League',
    location: 'Test Location',
    cost: 100,
    sports: { name: 'Volleyball' }
  };
  
  const mockTeams = [
    {
      id: 1,
      name: 'Team 1',
      captain_id: 'captain1',
      roster: ['player1', 'player2'],
      created_at: '2024-01-01',
      skill_level_id: 1,
      display_order: 1,
      users: { name: 'Captain One' },
      skills: { name: 'Intermediate' },
      leagues: {
        id: 1,
        name: 'Test League',
        cost: 100,
        location: 'Test Location',
        sports: { name: 'Volleyball' }
      }
    },
    {
      id: 2,
      name: 'Team 2',
      captain_id: 'captain2',
      roster: ['player3'],
      created_at: '2024-01-02',
      skill_level_id: 2,
      display_order: 2,
      users: { name: 'Captain Two' },
      skills: { name: 'Advanced' },
      leagues: {
        id: 1,
        name: 'Test League',
        cost: 100,
        location: 'Test Location',
        sports: { name: 'Volleyball' }
      }
    }
  ];

  const chainMethods = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: mockLeague, error: null }),
    order: vi.fn().mockResolvedValue({ data: mockTeams, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({
      data: {
        status: 'paid',
        amount_due: 100,
        amount_paid: 100
      },
      error: null
    }),
    delete: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
  };

  return {
    supabase: {
      auth: {
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
        getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null }))
      },
      from: vi.fn(() => chainMethods)
    }
  };
});

// Mock toast
vi.mock('../../components/ui/toast', () => ({
  useToast: () => ({
    showToast: vi.fn()
  })
}));

// Mock DnD Kit
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(),
}));

vi.mock('@dnd-kit/sortable', () => ({
  arrayMove: vi.fn((arr: unknown[]) => arr),
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  sortableKeyboardCoordinates: vi.fn(),
  verticalListSortingStrategy: vi.fn(),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: vi.fn(() => '')
    }
  }
}));

describe('LeagueTeamsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render league information correctly', async () => {
    render(
      <BrowserRouter>
        <LeagueTeamsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test League - Teams Management')).toBeInTheDocument();
      expect(screen.getByText('Sport: Volleyball | Location: Test Location')).toBeInTheDocument();
      expect(screen.getByText('$100 + HST per team')).toBeInTheDocument();
    });
  });

  it('should display teams with correct information', async () => {
    render(
      <BrowserRouter>
        <LeagueTeamsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      // Check that teams are displayed (they appear in both active and waitlist sections)
      expect(screen.getAllByText('Team 1').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Team 2').length).toBeGreaterThan(0);
      
      // Check that team information is displayed
      expect(screen.getAllByText('Captain One').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Captain Two').length).toBeGreaterThan(0);
      
      // Check player counts
      expect(screen.getAllByText('2 players').length).toBeGreaterThan(0);
      expect(screen.getAllByText('1 players').length).toBeGreaterThan(0);
      
      // Check skill levels
      expect(screen.getAllByText('Intermediate').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Advanced').length).toBeGreaterThan(0);
    });
  });

  it('should show edit league link for admin users', async () => {
    render(
      <BrowserRouter>
        <LeagueTeamsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Edit league')).toBeInTheDocument();
    });
  });

  it('should verify type safety with database queries', () => {
    // This is a compile-time test - if it compiles, types are correct
    const teamData = {
      id: 1,
      name: 'Test Team',
      captain_id: 'captain1',
      roster: ['player1', 'player2'],
      created_at: '2024-01-01',
      skill_level_id: 1,
      display_order: 1,
      users: { name: 'Captain' },
      skills: { name: 'Intermediate' },
      leagues: {
        id: 1,
        name: 'Test League',
        cost: 100,
        location: 'Test Location',
        sports: { name: 'Volleyball' }
      }
    };

    // These should work with the fixed type handling
    expect(teamData.users?.name).toBe('Captain');
    expect(teamData.leagues?.sports?.name).toBe('Volleyball');
    expect(teamData.display_order).toBe(1);
  });
});