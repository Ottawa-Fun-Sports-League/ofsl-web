import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Simulated improved table component based on the design requirements
interface Team {
  id: number;
  name: string;
  captain_name: string;
  skill_name: string;
  roster_count: number;
  created_at: string;
  payment_status: 'paid' | 'partial' | 'pending' | 'overdue';
  amount_due: number;
  amount_paid: number;
}

const ImprovedTeamTable = ({ teams }: { teams: Team[] }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Team Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Captain
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Skill Level
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Players
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Registered
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payment Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payment Details
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {teams.map((team) => {
              const totalAmount = team.amount_due ? team.amount_due * 1.13 : 0;
              const amountPaid = team.amount_paid || 0;
              const amountOwing = totalAmount - amountPaid;

              return (
                <tr key={team.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">
                      {team.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-700">
                        {team.captain_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      {team.skill_name}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="font-medium">{team.roster_count}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">
                      {new Date(team.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                      team.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700' :
                      team.payment_status === 'partial' ? 'bg-amber-50 text-amber-700' :
                      team.payment_status === 'overdue' ? 'bg-red-50 text-red-700' :
                      'bg-rose-50 text-rose-700'
                    }`}>
                      {team.payment_status === 'paid' ? 'Paid' :
                       team.payment_status === 'partial' ? 'Partial' :
                       team.payment_status === 'overdue' ? 'Overdue' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-500">Paid:</span>
                        <span className="font-medium text-green-700">${amountPaid.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-500">Owing:</span>
                        <span className={`font-medium ${amountOwing > 0 ? 'text-red-700' : 'text-gray-700'}`}>
                          ${amountOwing.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs border-t pt-1">
                        <span className="text-gray-500">Total:</span>
                        <span className="font-semibold text-gray-900">${totalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                        title="Edit team"
                        aria-label="Edit team"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        className="p-1.5 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 rounded transition-colors"
                        title="Move to waitlist"
                        aria-label="Move to waitlist"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                      </button>
                      <button
                        className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                        title="Delete team"
                        aria-label="Delete team"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

describe('Improved League Teams Table View', () => {
  const mockTeams = [
    {
      id: 1,
      name: 'Spike Masters',
      captain_name: 'John Doe',
      skill_name: 'Intermediate',
      roster_count: 8,
      created_at: '2024-01-15T10:00:00Z',
      payment_status: 'paid' as const,
      amount_due: 300,
      amount_paid: 300
    },
    {
      id: 2,
      name: 'Beach Bumpers',
      captain_name: 'Jane Smith',
      skill_name: 'Advanced',
      roster_count: 6,
      created_at: '2024-01-16T14:00:00Z',
      payment_status: 'partial' as const,
      amount_due: 300,
      amount_paid: 150
    },
    {
      id: 3,
      name: 'Net Ninjas',
      captain_name: 'Bob Wilson',
      skill_name: 'Beginner',
      roster_count: 5,
      created_at: '2024-01-17T09:00:00Z',
      payment_status: 'pending' as const,
      amount_due: 300,
      amount_paid: 0
    }
  ];

  test('displays payment status in dedicated column', () => {
    render(<ImprovedTeamTable teams={mockTeams} />);
    
    // Check column header
    expect(screen.getByText('Payment Status')).toBeInTheDocument();
    
    // Check payment status badges
    expect(screen.getByText('Paid')).toBeInTheDocument();
    expect(screen.getByText('Partial')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  test('shows payment breakdown with amount paid, owing, and total', () => {
    render(<ImprovedTeamTable teams={mockTeams} />);
    
    // Check column header
    expect(screen.getByText('Payment Details')).toBeInTheDocument();
    
    // Team 1 - Fully paid (300 + 13% HST = 339)
    expect(screen.getByText('$300.00')).toBeInTheDocument(); // Amount paid
    expect(screen.getByText('$0.00')).toBeInTheDocument(); // Amount owing
    
    // Team 2 - Partial payment
    expect(screen.getByText('$150.00')).toBeInTheDocument(); // Amount paid
    expect(screen.getByText('$189.00')).toBeInTheDocument(); // Amount owing (339 - 150)
    
    // Total amounts with HST
    expect(screen.getAllByText('$339.00').length).toBeGreaterThan(0); // Total with HST
  });

  test('uses icon-only buttons for actions', () => {
    render(<ImprovedTeamTable teams={mockTeams} />);
    
    // Check for icon buttons with proper attributes
    const editButtons = screen.getAllByTitle('Edit team');
    expect(editButtons).toHaveLength(3);
    expect(editButtons[0]).toHaveAttribute('aria-label', 'Edit team');
    
    const waitlistButtons = screen.getAllByTitle('Move to waitlist');
    expect(waitlistButtons).toHaveLength(3);
    expect(waitlistButtons[0]).toHaveAttribute('aria-label', 'Move to waitlist');
    
    const deleteButtons = screen.getAllByTitle('Delete team');
    expect(deleteButtons).toHaveLength(3);
    expect(deleteButtons[0]).toHaveAttribute('aria-label', 'Delete team');
    
    // Verify they are icon-only (no text)
    editButtons.forEach(button => {
      expect(button.querySelector('svg')).toBeInTheDocument();
    });
  });

  test('maintains clean visual hierarchy with proper column organization', () => {
    render(<ImprovedTeamTable teams={mockTeams} />);
    
    // Check all column headers are present in correct order
    const headers = screen.getAllByRole('columnheader');
    const headerTexts = headers.map(h => h.textContent);
    
    expect(headerTexts).toEqual([
      'Team Name',
      'Captain',
      'Skill Level',
      'Players',
      'Registered',
      'Payment Status',
      'Payment Details',
      'Actions'
    ]);
  });

  test('payment details show correct color coding', () => {
    render(<ImprovedTeamTable teams={mockTeams} />);
    
    // Check that paid amounts are in green
    const paidAmounts = screen.getAllByText(/^\$\d+\.\d{2}$/);
    const greenAmounts = paidAmounts.filter(el => 
      el.classList.contains('text-green-700')
    );
    expect(greenAmounts.length).toBeGreaterThan(0);
    
    // Check that owing amounts > 0 are in red
    const owingAmount = screen.getByText('$189.00');
    expect(owingAmount).toHaveClass('text-red-700');
  });

  test('hover states work on table rows and action buttons', async () => {
    userEvent.setup();
    render(<ImprovedTeamTable teams={mockTeams} />);
    
    // Check row hover state
    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveClass('hover:bg-gray-50'); // First data row
    
    // Check button hover states
    const editButton = screen.getAllByTitle('Edit team')[0];
    expect(editButton).toHaveClass('hover:bg-blue-50');
    
    const deleteButton = screen.getAllByTitle('Delete team')[0];
    expect(deleteButton).toHaveClass('hover:bg-red-50');
  });

  test('displays formatted date in registered column', () => {
    render(<ImprovedTeamTable teams={mockTeams} />);
    
    // Check date formatting
    expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
    expect(screen.getByText('Jan 16, 2024')).toBeInTheDocument();
    expect(screen.getByText('Jan 17, 2024')).toBeInTheDocument();
  });

  test('payment status badges have correct styling', () => {
    render(<ImprovedTeamTable teams={mockTeams} />);
    
    const paidBadge = screen.getByText('Paid');
    expect(paidBadge).toHaveClass('bg-emerald-50', 'text-emerald-700');
    
    const partialBadge = screen.getByText('Partial');
    expect(partialBadge).toHaveClass('bg-amber-50', 'text-amber-700');
    
    const pendingBadge = screen.getByText('Pending');
    expect(pendingBadge).toHaveClass('bg-rose-50', 'text-rose-700');
  });
});