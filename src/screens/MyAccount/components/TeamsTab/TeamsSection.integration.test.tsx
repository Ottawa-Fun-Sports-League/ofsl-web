import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { TeamsSection } from './TeamsSection';
import { describe, it, expect, vi } from 'vitest';
import { Team, LeaguePayment } from './types';

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

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
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    payment_method: null
  };

  it('displays payment status section with correct information', () => {
    const partialPayment = {
      ...basePayment,
      amount_paid: 100,
      status: 'partial' as const
    };

    renderWithRouter(
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
    );

    // Check that payment status section is displayed
    expect(screen.getByText('Payment Status')).toBeInTheDocument();
    
    // Check payment amounts
    expect(screen.getByText('Total Due')).toBeInTheDocument();
    expect(screen.getByText('$226.00')).toBeInTheDocument(); // 200 * 1.13
    expect(screen.getByText('Paid')).toBeInTheDocument();
    expect(screen.getByText('$100.00')).toBeInTheDocument();
    expect(screen.getByText('Balance')).toBeInTheDocument();
    expect(screen.getByText('$126.00')).toBeInTheDocument(); // 226 - 100
    
    // Check progress
    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByText('44%')).toBeInTheDocument();
    
    // Check due date
    expect(screen.getByText(/Due in \d+ days/)).toBeInTheDocument();
  });

  it('shows overdue warning for overdue payments', () => {
    const overduePayment = {
      ...basePayment,
      status: 'overdue' as const,
      due_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    };

    renderWithRouter(
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
    );

    expect(screen.getByText(/Overdue since/)).toBeInTheDocument();
  });

  it('shows success message for fully paid teams', () => {
    const paidPayment = {
      ...basePayment,
      amount_paid: 226,
      status: 'paid' as const
    };

    renderWithRouter(
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
    );

    expect(screen.getByText('Fully paid - Thank you!')).toBeInTheDocument();
  });

  it('shows captain reminder for teams with balance due', () => {
    const partialPayment = {
      ...basePayment,
      amount_paid: 50,
      status: 'partial' as const
    };

    renderWithRouter(
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
    );

    expect(screen.getByText(/As team captain, you are responsible/)).toBeInTheDocument();
  });

  it('does not show captain reminder for non-captains', () => {
    const partialPayment = {
      ...basePayment,
      amount_paid: 50,
      status: 'partial' as const
    };

    renderWithRouter(
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
    );

    expect(screen.queryByText(/As team captain, you are responsible/)).not.toBeInTheDocument();
  });

  it('shows payment status even when no payment record exists', () => {
    renderWithRouter(
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
    );

    // Should still show payment status based on league cost
    expect(screen.getByText('Payment Status')).toBeInTheDocument();
    expect(screen.getAllByText('$226.00')).toHaveLength(2); // Total due and balance
    expect(screen.getByText('$0.00')).toBeInTheDocument(); // No payment made
  });
});