import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TeamsSection } from './TeamsSection';
import { describe, it, expect, vi } from 'vitest';
import { Team, LeaguePayment } from './types';
import { ToastProvider } from '../../../../components/ui/toast';

describe('TeamsSection - Payment Status Display', () => {
  const mockOnUnregister = vi.fn();
  const mockOnLeaveTeam = vi.fn();
  const mockOnManageTeammates = vi.fn();

  const baseTeam: Team = {
    id: 1,
    name: 'Test Team',
    captain_id: 'user123',
    roster: ['user123', 'user456'],
    active: true,
    league: {
      id: 1,
      name: 'Winter League 2024',
      location: 'Downtown Arena',
      cost: 200
    }
  };

  const basePayment: LeaguePayment = {
    id: 1,
    team_id: 1,
    league_name: 'Winter League 2024',
    team_name: 'Test Team',
    amount_due: 200,
    amount_paid: 0,
    status: 'pending',
    due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    payment_method: null
  };

  it('displays payment status section with correct information', () => {
    const partialPayment: LeaguePayment = {
      id: 1,
      team_id: 1,
      league_name: 'Winter League 2024',
      team_name: 'Test Team',
      amount_due: 200,
      amount_paid: 100,
      status: 'partial',
      due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      payment_method: null
    };

    render(
      <MemoryRouter>
        <ToastProvider>
          <TeamsSection
            teams={[baseTeam]}
            currentUserId="user123"
            leaguePayments={[partialPayment]}
            unregisteringPayment={null}
            leavingTeam={null}
            onUnregister={mockOnUnregister}
            onLeaveTeam={mockOnLeaveTeam}
            onManageTeammates={mockOnManageTeammates}
          />
        </ToastProvider>
      </MemoryRouter>
    );

    // Check that team information is displayed
    expect(screen.getByText('Test Team')).toBeInTheDocument();
    expect(screen.getByText('Winter League 2024')).toBeInTheDocument();
  });

  it('shows overdue warning for overdue payments', () => {
    const overduePayment = {
      ...basePayment,
      status: 'overdue' as const,
      due_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    };

    render(
      <MemoryRouter>
        <ToastProvider>
          <TeamsSection
        teams={[baseTeam]}
        currentUserId="user123"
        leaguePayments={[overduePayment]}
        unregisteringPayment={null}
        leavingTeam={null}
        onUnregister={mockOnUnregister}
        onLeaveTeam={mockOnLeaveTeam}
        onManageTeammates={mockOnManageTeammates}
      />
        </ToastProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(/Overdue since/)).toBeInTheDocument();
  });

  it('shows success message for fully paid teams', () => {
    const paidPayment = {
      ...basePayment,
      amount_paid: 226,
      status: 'paid' as const
    };

    render(
      <MemoryRouter>
        <ToastProvider>
          <TeamsSection
        teams={[baseTeam]}
        currentUserId="user123"
        leaguePayments={[paidPayment]}
        unregisteringPayment={null}
        leavingTeam={null}
        onUnregister={mockOnUnregister}
        onLeaveTeam={mockOnLeaveTeam}
        onManageTeammates={mockOnManageTeammates}
      />
        </ToastProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('Fully paid - Thank you!')).toBeInTheDocument();
  });

  it('shows captain reminder for teams with balance due', () => {
    const partialPayment: LeaguePayment = {
      ...basePayment,
      amount_paid: 50,
      status: 'partial'
    };

    render(
      <MemoryRouter>
        <ToastProvider>
          <TeamsSection
        teams={[baseTeam]}
        currentUserId="user123" // Captain
        leaguePayments={[partialPayment]}
        unregisteringPayment={null}
        leavingTeam={null}
        onUnregister={mockOnUnregister}
        onLeaveTeam={mockOnLeaveTeam}
        onManageTeammates={mockOnManageTeammates}
      />
        </ToastProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(/As team captain, you are responsible/)).toBeInTheDocument();
  });

  it('does not show captain reminder for non-captains', () => {
    const partialPayment: LeaguePayment = {
      ...basePayment,
      amount_paid: 50,
      status: 'partial'
    };

    render(
      <MemoryRouter>
        <ToastProvider>
          <TeamsSection
        teams={[baseTeam]}
        currentUserId="user456" // Not captain
        leaguePayments={[partialPayment]}
        unregisteringPayment={null}
        leavingTeam={null}
        onUnregister={mockOnUnregister}
        onLeaveTeam={mockOnLeaveTeam}
        onManageTeammates={mockOnManageTeammates}
      />
        </ToastProvider>
      </MemoryRouter>
    );

    expect(screen.queryByText(/As team captain, you are responsible/)).not.toBeInTheDocument();
  });

  it('shows payment status even when no payment record exists', () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <TeamsSection
        teams={[baseTeam]}
        currentUserId="user123"
        leaguePayments={[]} // No payment record
        unregisteringPayment={null}
        leavingTeam={null}
        onUnregister={mockOnUnregister}
        onLeaveTeam={mockOnLeaveTeam}
        onManageTeammates={mockOnManageTeammates}
      />
        </ToastProvider>
      </MemoryRouter>
    );

    // Should show payment balance based on league cost
    expect(screen.getByText(/balance/i)).toBeInTheDocument();
    expect(screen.getByText(/226\.00/)).toBeInTheDocument(); // 200 * 1.13
  });

  it('hides schedule details when league schedule visibility is false', () => {
    const hiddenScheduleTeam: Team = {
      ...baseTeam,
      league: {
        ...baseTeam.league!,
        schedule_visible: false
      },
      currentMatchup: {
        status: 'scheduled',
        weekNumber: 3,
        opponents: ['Rival Team'],
        location: 'Main Gym',
        timeSlot: '7:00 PM',
        court: 'Court 1'
      }
    };

    render(
      <MemoryRouter>
        <ToastProvider>
          <TeamsSection
            teams={[hiddenScheduleTeam]}
            currentUserId="user123"
            leaguePayments={[basePayment]}
            unregisteringPayment={null}
            leavingTeam={null}
            onUnregister={mockOnUnregister}
            onLeaveTeam={mockOnLeaveTeam}
            onManageTeammates={mockOnManageTeammates}
          />
        </ToastProvider>
      </MemoryRouter>
    );

    expect(screen.queryByText(/View full schedule/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Location:/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Schedule is currently hidden by league administrators/i)).toBeInTheDocument();
    expect(screen.getByText('Standings')).toBeInTheDocument();
  });
});
