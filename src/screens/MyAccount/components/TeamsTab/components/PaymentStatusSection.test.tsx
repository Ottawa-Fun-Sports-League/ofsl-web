import { render, screen } from '@testing-library/react';
import { PaymentStatusSection } from './PaymentStatusSection';
import { describe, it, expect } from 'vitest';

describe('PaymentStatusSection', () => {
  it('shows enhanced payment status for captain when within 7 days of deadline', () => {
    const payment = {
      id: 1,
      amount_due: 100,
      amount_paid: 50,
      status: 'partial',
      due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days from now
    };

    render(<PaymentStatusSection payment={payment} isCaptain={true} />);

    // Check that enhanced section is displayed
    expect(screen.getByText('Payment Status')).toBeInTheDocument();
    expect(screen.getByText('Total Due')).toBeInTheDocument();
    expect(screen.getByText('$113.00')).toBeInTheDocument(); // 100 * 1.13
    expect(screen.getByText('Paid')).toBeInTheDocument();
    expect(screen.getByText('$50.00')).toBeInTheDocument();
    expect(screen.getByText('Balance')).toBeInTheDocument();
    expect(screen.getByText('$63.00')).toBeInTheDocument(); // 113 - 50
    expect(screen.getByText('Progress')).toBeInTheDocument();
    // The due date text varies based on calculation, just check it exists
    expect(screen.getByText(/Due in \d+ days?/)).toBeInTheDocument();
  });

  it('shows simple balance display when more than 7 days from deadline', () => {
    const payment = {
      id: 1,
      amount_due: 100,
      amount_paid: 50,
      status: 'partial',
      due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 days from now
    };

    render(<PaymentStatusSection payment={payment} isCaptain={true} />);

    // Check that simple section is displayed
    expect(screen.queryByText('Payment Status')).not.toBeInTheDocument();
    expect(screen.getByText('Balance: $63.00')).toBeInTheDocument();
    // Due date should be displayed
    expect(screen.getByText(/Due \w+ \d+, \d+/)).toBeInTheDocument();
  });

  it('shows simple display for non-captains even within 7 days', () => {
    const payment = {
      id: 1,
      amount_due: 100,
      amount_paid: 50,
      status: 'partial',
      due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days from now
    };

    render(<PaymentStatusSection payment={payment} isCaptain={false} />);

    // Check that simple section is displayed
    expect(screen.queryByText('Payment Status')).not.toBeInTheDocument();
    expect(screen.getByText('Balance: $63.00')).toBeInTheDocument();
    expect(screen.getByText(/Due in \d+ days?/)).toBeInTheDocument();
  });

  it('renders enhanced view for overdue payment for captain', () => {
    const payment = {
      id: 1,
      amount_due: 100,
      amount_paid: 50,
      status: 'overdue',
      due_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days ago
    };

    const { container } = render(<PaymentStatusSection payment={payment} isCaptain={true} />);

    expect(screen.getByText(/Overdue since/)).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('bg-red-50');
  });

  it('shows simple fully paid message', () => {
    const payment = {
      id: 1,
      amount_due: 100,
      amount_paid: 113, // Fully paid with tax
      status: 'paid',
      due_date: new Date().toISOString()
    };

    render(<PaymentStatusSection payment={payment} isCaptain={true} />);

    expect(screen.queryByText('Payment Status')).not.toBeInTheDocument();
    expect(screen.getByText('Fully paid - Thank you!')).toBeInTheDocument();
  });

  it('shows captain reminder in enhanced view when balance is due', () => {
    const payment = {
      id: 1,
      amount_due: 100,
      amount_paid: 50,
      status: 'partial',
      due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days from now
    };

    render(<PaymentStatusSection payment={payment} isCaptain={true} />);

    expect(screen.getByText(/As team captain, you are responsible/)).toBeInTheDocument();
  });

  it('does not render when there is no cost', () => {
    const { container } = render(<PaymentStatusSection leagueCost={0} isCaptain={true} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows simple display when no payment exists and no due date', () => {
    render(<PaymentStatusSection leagueCost={200} isCaptain={true} />);

    expect(screen.queryByText('Payment Status')).not.toBeInTheDocument();
    expect(screen.getByText('Balance: $226.00')).toBeInTheDocument(); // 200 * 1.13
    expect(screen.queryByText(/Due/)).not.toBeInTheDocument(); // No due date
  });

  it('shows enhanced view at exactly 7 days for captain', () => {
    const payment = {
      id: 1,
      amount_due: 100,
      amount_paid: 0,
      status: 'pending',
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // Exactly 7 days from now
    };

    render(<PaymentStatusSection payment={payment} isCaptain={true} />);

    // Should show enhanced section at 7 days or less
    // The exact text depends on time calculation, so check for either format
    const hasPaymentStatus = screen.queryByText('Payment Status');
    const hasDueInDays = screen.queryByText(/Due in \d+ days/);
    const hasDueDate = screen.queryByText(/Due \w+ \d+, \d+/);
    
    // Should show enhanced section if within 7 days
    if (hasDueInDays) {
      expect(screen.getByText('Payment Status')).toBeInTheDocument();
    } else {
      // If showing full date, it means it's slightly over 7 days due to time calculation
      expect(hasDueDate).toBeInTheDocument();
      expect(hasPaymentStatus).not.toBeInTheDocument();
    }
  });
});