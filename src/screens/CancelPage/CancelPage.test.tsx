import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CancelPage } from './CancelPage';
import { render, mockNavigate } from '../../test/test-utils';

describe('CancelPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders cancellation message', () => {
    render(<CancelPage />);
    
    expect(screen.getByRole('heading', { name: /payment cancelled/i })).toBeInTheDocument();
    expect(screen.getByText(/your payment was cancelled/i)).toBeInTheDocument();
    expect(screen.getByText(/no charges have been made/i)).toBeInTheDocument();
  });

  it('shows cancellation icon', () => {
    render(<CancelPage />);
    
    const cancelIcon = screen.getByTestId('cancel-icon');
    expect(cancelIcon).toBeInTheDocument();
    expect(cancelIcon).toHaveClass('text-red-500');
  });

  it('displays action buttons', () => {
    render(<CancelPage />);
    
    expect(screen.getByRole('link', { name: /browse leagues/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to home/i })).toBeInTheDocument();
  });

  it('navigates to leagues page', async () => {
    const user = userEvent.setup();
    
    render(<CancelPage />);
    
    const browseLeaguesLink = screen.getByRole('link', { name: /browse leagues/i });
    await user.click(browseLeaguesLink);
    
    expect(mockNavigate).toHaveBeenCalledWith('/leagues');
  });

  it('navigates to home page', async () => {
    const user = userEvent.setup();
    
    render(<CancelPage />);
    
    const homeLink = screen.getByRole('link', { name: /back to home/i });
    await user.click(homeLink);
    
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('displays help information', () => {
    render(<CancelPage />);
    
    expect(screen.getByText(/having trouble/i)).toBeInTheDocument();
    expect(screen.getByText(/if you experienced any issues/i)).toBeInTheDocument();
    expect(screen.getByText(/support@ofsl.ca/i)).toBeInTheDocument();
  });

  it('shows reason for common cancellations', () => {
    render(<CancelPage />);
    
    expect(screen.getByText(/common reasons for cancellation/i)).toBeInTheDocument();
    expect(screen.getByText(/changed your mind/i)).toBeInTheDocument();
    expect(screen.getByText(/need to check team availability/i)).toBeInTheDocument();
    expect(screen.getByText(/payment method issues/i)).toBeInTheDocument();
  });

  it('displays session preservation message', () => {
    render(<CancelPage />);
    
    expect(screen.getByText(/your spot is not reserved/i)).toBeInTheDocument();
    expect(screen.getByText(/complete registration to secure/i)).toBeInTheDocument();
  });

  it('clears cart data on mount', () => {
    render(<CancelPage />);
    
    // Should clear any temporary cart data
    expect(sessionStorage.removeItem).toHaveBeenCalledWith('pendingRegistration');
  });

  it('shows contact support prominently', () => {
    render(<CancelPage />);
    
    const supportEmail = screen.getByText(/support@ofsl.ca/i);
    expect(supportEmail).toBeInTheDocument();
    expect(supportEmail.tagName).toBe('A');
    expect(supportEmail).toHaveAttribute('href', 'mailto:support@ofsl.ca');
  });

  it('handles return to previous league', () => {
    // Mock sessionStorage with previous league info
    sessionStorage.getItem = vi.fn().mockReturnValue(JSON.stringify({
      leagueId: 1,
      leagueName: 'Spring Volleyball League',
    }));
    
    render(<CancelPage />);
    
    expect(screen.getByText(/return to spring volleyball league/i)).toBeInTheDocument();
    const returnLink = screen.getByRole('link', { name: /return to spring volleyball league/i });
    expect(returnLink).toHaveAttribute('href', '/leagues/1');
  });

  it('renders mobile-friendly layout', () => {
    // Mock mobile viewport
    global.innerWidth = 375;
    global.innerHeight = 667;
    
    render(<CancelPage />);
    
    // Check that content is still visible
    expect(screen.getByRole('heading', { name: /payment cancelled/i })).toBeInTheDocument();
    
    const container = screen.getByRole('main');
    expect(container).toHaveClass('min-h-screen');
  });

  it('shows try again message', () => {
    render(<CancelPage />);
    
    expect(screen.getByText(/ready to try again/i)).toBeInTheDocument();
    expect(screen.getByText(/when you're ready to complete/i)).toBeInTheDocument();
  });
});