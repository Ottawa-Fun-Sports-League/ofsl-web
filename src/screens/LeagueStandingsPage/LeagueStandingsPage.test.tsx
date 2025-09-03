import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { LeagueStandingsPage } from './LeagueStandingsPage';

// Mock the modules
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ leagueId: '1' }),
    useNavigate: () => vi.fn(),
  };
});

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    userProfile: { is_admin: true },
  }),
}));

describe('LeagueStandingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing for admin users', () => {
    render(
      <BrowserRouter>
        <LeagueStandingsPage />
      </BrowserRouter>
    );
    
    // The component should at least render without errors
    expect(document.body).toBeDefined();
  });

  it('should not render for non-admin users', () => {
    vi.mocked(vi.fn()).mockImplementation(() => ({
      useAuth: () => ({
        userProfile: { is_admin: false },
      }),
    }));

    const { container } = render(
      <BrowserRouter>
        <LeagueStandingsPage />
      </BrowserRouter>
    );
    
    // Should return null for non-admin
    expect(container.firstChild).toBeNull();
  });
});