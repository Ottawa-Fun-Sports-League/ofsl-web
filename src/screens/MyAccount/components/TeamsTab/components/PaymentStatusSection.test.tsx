import { render, screen } from '@testing-library/react';
import { PaymentStatusSection } from './PaymentStatusSection';
import { describe, it, expect } from 'vitest';

describe('PaymentStatusSection', () => {
  it('renders payment status for partial payment', () => {
    const payment = {
      id: 1,
      amount_due: 100,
      amount_paid: 50,
      status: 'partial',
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
    };

    render(<PaymentStatusSection payment={payment} isCaptain={true} />);

    // Check that all key elements are displayed
    expect(screen.getByText('Payment Status')).toBeInTheDocument();
    expect(screen.getByText('Total Due')).toBeInTheDocument();
    expect(screen.getByText('$113.00')).toBeInTheDocument(); // 100 * 1.13
    expect(screen.getByText('Paid')).toBeInTheDocument();
    expect(screen.getByText('$50.00')).toBeInTheDocument();
    expect(screen.getByText('Balance')).toBeInTheDocument();
    expect(screen.getByText('$63.00')).toBeInTheDocument(); // 113 - 50
    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByText('44%')).toBeInTheDocument(); // 50/113 * 100
    expect(screen.getByText(/Due in \d+ days/)).toBeInTheDocument();
  });

  it('renders payment status for fully paid', () => {
    const payment = {
      id: 1,
      amount_due: 100,
      amount_paid: 113,
      status: 'paid',
      due_date: new Date().toISOString()
    };

    render(<PaymentStatusSection payment={payment} isCaptain={true} />);

    expect(screen.getByText('Payment Status')).toBeInTheDocument();
    expect(screen.getAllByText('$113.00')).toHaveLength(2); // Total due and amount paid
    expect(screen.getByText('$0.00')).toBeInTheDocument(); // Balance
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('Fully paid - Thank you!')).toBeInTheDocument();
    expect(screen.queryByText(/Due in/)).not.toBeInTheDocument(); // No due date for paid
  });

  it('renders overdue payment warning', () => {
    const payment = {
      id: 1,
      amount_due: 100,
      amount_paid: 0,
      status: 'overdue',
      due_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days ago
    };

    const { container } = render(<PaymentStatusSection payment={payment} isCaptain={true} />);

    expect(screen.getByText(/Overdue since/)).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('bg-red-50');
  });

  it('shows captain reminder when balance is due', () => {
    const payment = {
      id: 1,
      amount_due: 100,
      amount_paid: 50,
      status: 'partial'
    };

    render(<PaymentStatusSection payment={payment} isCaptain={true} />);

    expect(screen.getByText(/As team captain, you are responsible/)).toBeInTheDocument();
  });

  it('does not show captain reminder for non-captains', () => {
    const payment = {
      id: 1,
      amount_due: 100,
      amount_paid: 50,
      status: 'partial'
    };

    render(<PaymentStatusSection payment={payment} isCaptain={false} />);

    expect(screen.queryByText(/As team captain/)).not.toBeInTheDocument();
  });

  it('does not render when there is no cost', () => {
    const { container } = render(<PaymentStatusSection leagueCost={0} isCaptain={true} />);
    expect(container.firstChild).toBeNull();
  });

  it('calculates from league cost when no payment exists', () => {
    render(<PaymentStatusSection leagueCost={200} isCaptain={true} />);

    expect(screen.getAllByText('$226.00')).toHaveLength(2); // Total due and balance
    expect(screen.getByText('$0.00')).toBeInTheDocument(); // Paid amount
    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});