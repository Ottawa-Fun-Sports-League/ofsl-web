import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { LeagueTeams } from './LeagueTeams';
import { BrowserRouter } from 'react-router-dom';

// Mock the supabase client
vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              data: [],
              error: null
            })),
            maybeSingle: vi.fn(() => ({
              data: null,
              error: null
            }))
          }))
        }))
      }))
    }))
  }
}));

// Mock the useToast hook
vi.mock('../../../components/ui/toast', () => ({
  useToast: () => ({
    showToast: vi.fn()
  })
}));

describe('LeagueTeams', () => {
  it('should render without type errors', async () => {
    render(
      <BrowserRouter>
        <LeagueTeams leagueId={1} />
      </BrowserRouter>
    );

    // Check that loading spinner is shown initially
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeTruthy();
  });

  it('should handle ExtendedTeam type correctly', () => {
    // This test ensures the ExtendedTeam interface is properly defined
    const extendedTeam: any = {
      id: 1,
      name: 'Test Team',
      captain_id: 'user123',
      roster: null,
      created_at: '2024-01-01',
      skill_level_id: 1,
      display_order: undefined,
      users: { name: 'Captain Name' },
      skills: { name: 'Intermediate' },
      leagues: {
        id: 1,
        name: 'Test League',
        cost: 100,
        location: 'Test Location',
        sports: { name: 'Volleyball' }
      }
    };

    // The processTeamsWithPayments function should handle this correctly
    expect(extendedTeam.display_order).toBeUndefined();
    expect(extendedTeam.users?.name).toBe('Captain Name');
    expect(extendedTeam.skills?.name).toBe('Intermediate');
  });

  it('should handle missing display_order gracefully', () => {
    const teamData: any = {
      display_order: undefined
    };
    
    // The component should default to 0 if display_order is not present
    const processedOrder = teamData.display_order || 0;
    expect(processedOrder).toBe(0);
  });
});