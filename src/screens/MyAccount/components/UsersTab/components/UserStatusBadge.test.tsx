import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserStatusBadge } from './UserStatusBadge';

describe('UserStatusBadge', () => {
  it('should render "Active" badge for active status', () => {
    render(<UserStatusBadge status="active" />);
    
    const badge = screen.getByText('Active');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-green-100', 'text-green-800');
  });

  it('should render "Unconfirmed Email" badge for unconfirmed status', () => {
    render(<UserStatusBadge status="unconfirmed" />);
    
    const badge = screen.getByText('Unconfirmed Email');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-yellow-100', 'text-yellow-800');
  });

  it('should render "No Profile" badge for confirmed_no_profile status', () => {
    render(<UserStatusBadge status="confirmed_no_profile" />);
    
    const badge = screen.getByText('No Profile');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-orange-100', 'text-orange-800');
  });

  it('should render "Pending" badge for pending status', () => {
    render(<UserStatusBadge status="pending" />);
    
    const badge = screen.getByText('Pending');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-gray-100', 'text-gray-800');
  });

  it('should render null for undefined status', () => {
    const { container } = render(<UserStatusBadge />);
    
    expect(container.firstChild).toBeNull();
  });

  it('should render null for unknown status', () => {
    // @ts-expect-error Testing invalid status
    const { container } = render(<UserStatusBadge status="unknown" />);
    
    expect(container.firstChild).toBeNull();
  });

  it('should ignore confirmedAt prop (it is not currently used)', () => {
    render(
      <UserStatusBadge 
        status="active" 
        confirmedAt="2024-01-01T10:00:00Z" 
      />
    );
    
    const badge = screen.getByText('Active');
    expect(badge).toBeInTheDocument();
  });

  it('should apply hover styles correctly', () => {
    render(<UserStatusBadge status="active" />);
    
    const badge = screen.getByText('Active');
    expect(badge).toHaveClass('hover:bg-green-100');
  });
});