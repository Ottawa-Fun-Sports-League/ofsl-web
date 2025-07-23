import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SuccessPage } from './SuccessPage';
import { render, mockNavigate, mockUser, mockUserProfile } from '../../test/test-utils';

describe('SuccessPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock URL with session_id
    Object.defineProperty(window, 'location', {
      value: {
        ...window.location,
        search: '?session_id=cs_test_123',
      },
      writable: true,
    });
  });

  it('renders success message', () => {
    render(<SuccessPage />);
    
    expect(screen.getByRole('heading', { name: /payment successful/i })).toBeInTheDocument();
    expect(screen.getByText(/thank you for your payment/i)).toBeInTheDocument();
    expect(screen.getByText(/your team registration is confirmed/i)).toBeInTheDocument();
  });

  it('shows confirmation details', () => {
    render(<SuccessPage />);
    
    expect(screen.getByText(/what's next/i)).toBeInTheDocument();
    expect(screen.getByText(/you will receive an email confirmation/i)).toBeInTheDocument();
    expect(screen.getByText(/league schedule will be sent/i)).toBeInTheDocument();
    expect(screen.getByText(/captain will receive team management/i)).toBeInTheDocument();
  });

  it('displays action buttons', () => {
    render(<SuccessPage />);
    
    expect(screen.getByRole('link', { name: /view my teams/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to home/i })).toBeInTheDocument();
  });

  it('navigates to my teams when authenticated', async () => {
    const user = userEvent.setup();
    
    render(<SuccessPage />, {
      user: mockUser,
      userProfile: mockUserProfile,
    });
    
    const myTeamsLink = screen.getByRole('link', { name: /view my teams/i });
    await user.click(myTeamsLink);
    
    expect(mockNavigate).toHaveBeenCalledWith('/my-account/teams');
  });

  it('navigates to home page', async () => {
    const user = userEvent.setup();
    
    render(<SuccessPage />);
    
    const homeLink = screen.getByRole('link', { name: /back to home/i });
    await user.click(homeLink);
    
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('shows success icon', () => {
    render(<SuccessPage />);
    
    const successIcon = screen.getByTestId('success-icon');
    expect(successIcon).toBeInTheDocument();
    expect(successIcon).toHaveClass('text-green-500');
  });

  it('displays session id when present', () => {
    render(<SuccessPage />);
    
    expect(screen.getByText(/payment reference:/i)).toBeInTheDocument();
    expect(screen.getByText(/cs_test_123/)).toBeInTheDocument();
  });

  it('handles missing session id', () => {
    // Remove session_id from URL
    Object.defineProperty(window, 'location', {
      value: {
        ...window.location,
        search: '',
      },
      writable: true,
    });
    
    render(<SuccessPage />);
    
    // Should still show success page but without reference
    expect(screen.getByRole('heading', { name: /payment successful/i })).toBeInTheDocument();
    expect(screen.queryByText(/payment reference:/i)).not.toBeInTheDocument();
  });

  it('shows login prompt for unauthenticated users', () => {
    render(<SuccessPage />, {
      user: null,
    });
    
    expect(screen.getByText(/sign in to view your teams/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
  });

  it('preserves return URL when navigating to login', async () => {
    const user = userEvent.setup();
    
    render(<SuccessPage />, {
      user: null,
    });
    
    const signInLink = screen.getByRole('link', { name: /sign in/i });
    await user.click(signInLink);
    
    expect(mockNavigate).toHaveBeenCalledWith('/login');
    // Should store current URL for redirect after login
    expect(localStorage.setItem).toHaveBeenCalledWith('redirectAfterLogin', '/success');
  });

  it('clears cart/session data on mount', () => {
    render(<SuccessPage />);
    
    // Should clear any temporary cart data
    expect(sessionStorage.clear).toHaveBeenCalled();
  });

  it('displays contact support message', () => {
    render(<SuccessPage />);
    
    expect(screen.getByText(/questions\?/i)).toBeInTheDocument();
    expect(screen.getByText(/contact.*support@ofsl.ca/i)).toBeInTheDocument();
  });

  it('renders in mobile view appropriately', () => {
    // Mock mobile viewport
    global.innerWidth = 375;
    global.innerHeight = 667;
    
    render(<SuccessPage />);
    
    // Check that content is still visible and properly sized
    expect(screen.getByRole('heading', { name: /payment successful/i })).toBeInTheDocument();
    
    const container = screen.getByRole('main');
    expect(container).toHaveClass('min-h-screen');
  });
});