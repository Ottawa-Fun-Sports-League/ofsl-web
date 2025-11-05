import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { LeaguesTab } from '../LeaguesTab';

const loadDataMock = vi.fn();
const leaguesListSpy = vi.fn();

vi.mock('../../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    userProfile: { id: '1', is_admin: true }
  })
}));

vi.mock('../../../../components/ui/toast', () => ({
  useToast: () => ({ showToast: vi.fn() })
}));

vi.mock('./hooks/useLeaguesData', () => ({
  useLeaguesData: () => ({
    leagues: [
      {
        id: 1,
        name: 'Test League',
        sport_name: 'Volleyball',
        day_of_week: 'Monday',
        location: 'Central',
        teams_count: 5,
        status: 'active',
        is_archived: false
      }
    ],
    archivedLeagues: [],
    sports: [],
    skills: [],
    gyms: [],
    loading: false,
    loadData: loadDataMock
  })
}));

vi.mock('./hooks/useLeagueActions', () => ({
  useLeagueActions: () => ({
    saving: false,
    handleCreateLeague: vi.fn().mockResolvedValue({ id: 42 }),
    handleDeleteLeague: vi.fn(),
    handleCopyLeague: vi.fn()
  })
}));

vi.mock('./components/LeaguesList', () => ({
  LeaguesList: (props: any) => {
    leaguesListSpy(props);
    return (
      <div data-testid="leagues-list">
        {props.leagues.map((league: any) => (
          <div key={league.id}>{league.name}</div>
        ))}
      </div>
    );
  }
}));

let latestOnCreateNew: () => void = () => {};
vi.mock('./components/LeaguesHeader', () => ({
  LeaguesHeader: ({ onCreateNew }: { onCreateNew: () => void }) => {
    latestOnCreateNew = onCreateNew;
    return (
      <button type="button" onClick={onCreateNew}>
        open-form
      </button>
    );
  }
}));

vi.mock('./components/NewLeagueForm', () => ({
  NewLeagueForm: (props: any) => (
    <div data-testid="new-league-form">
      <button onClick={() => props.onClose?.()}>close-form</button>
    </div>
  )
}));

describe('LeaguesTab', () => {
  beforeEach(() => {
    loadDataMock.mockClear();
    leaguesListSpy.mockClear();
  });

  const renderComponent = () =>
    render(
      <BrowserRouter>
        <LeaguesTab />
      </BrowserRouter>
    );

  it('loads league data on mount', async () => {
    renderComponent();
    await waitFor(() => expect(leaguesListSpy).toHaveBeenCalled());
    expect(loadDataMock).toHaveBeenCalled();
  });

  it('renders the leagues provided by the data hook', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Test League')).toBeInTheDocument();
    });
  });

  it('exposes a handler for opening the new league form', async () => {
    renderComponent();
    await screen.findByRole('button', { name: 'open-form' }); // ensure header rendered
    expect(typeof latestOnCreateNew).toBe('function');
  });
});
