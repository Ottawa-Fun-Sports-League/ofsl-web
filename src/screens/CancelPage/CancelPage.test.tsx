import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, render, waitForAuthToLoad } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
// Router is handled by test-utils
import { CancelPage } from './CancelPage';

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Simple render without AuthProvider for public pages
const renderCancelPage = () => {
  // CancelPage is a static page that doesn't need authentication
  // but AuthProvider is in test-utils, so we need to provide a non-loading state
  return render(<CancelPage />, { user: null, userProfile: null });
};

describe('CancelPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders cancellation message', async () => {
    renderCancelPage();
    await waitForAuthToLoad();
    
    expect(screen.getByRole('heading', { name: /payment cancelled/i })).toBeInTheDocument();
    expect(screen.getByText(/your payment was cancelled/i)).toBeInTheDocument();
    expect(screen.getByText(/no charges have been made to your account/i)).toBeInTheDocument();
  });

  it('shows cancellation icon', async () => {
    renderCancelPage();
    await waitForAuthToLoad();
    
    // Look for the XCircle icon by finding any svg with the appropriate size and color
    const cancelIcon = screen.getByTestId('cancel-icon');
    expect(cancelIcon).toBeInTheDocument();
    expect(cancelIcon).toHaveClass('text-orange-500');
  });

  it('displays action buttons', async () => {
    renderCancelPage();
    await waitForAuthToLoad();
    
    expect(screen.getByRole('button', { name: /try payment again/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to leagues/i })).toBeInTheDocument();
  });

  it('navigates to leagues page', async () => {
    const user = userEvent.setup();
    
    renderCancelPage();
    await waitForAuthToLoad();
    
    const leaguesLink = screen.getByRole('link', { name: /back to leagues/i });
    await user.click(leaguesLink);
    
    // The link has to="/leagues" so it should navigate there
    expect(leaguesLink).toHaveAttribute('href', '/leagues');
  });

  it('displays help information', async () => {
    renderCancelPage();
    await waitForAuthToLoad();
    
    expect(screen.getByText(/need help/i)).toBeInTheDocument();
    expect(screen.getByText(/contact us at/i)).toBeInTheDocument();
    expect(screen.getByText(/payments@ofsl.ca/i)).toBeInTheDocument();
  });

  it('shows contact support email', async () => {
    renderCancelPage();
    await waitForAuthToLoad();
    
    const supportEmail = screen.getByText(/payments@ofsl.ca/i);
    expect(supportEmail).toBeInTheDocument();
    expect(supportEmail.tagName).toBe('A');
    expect(supportEmail).toHaveAttribute('href', 'mailto:payments@ofsl.ca');
  });

  it('displays explanation of what happened', async () => {
    renderCancelPage();
    await waitForAuthToLoad();
    
    expect(screen.getByText(/what happened/i)).toBeInTheDocument();
    expect(screen.getByText(/you cancelled the payment process/i)).toBeInTheDocument();
    expect(screen.getByText(/no payment has been processed/i)).toBeInTheDocument();
  });

  it('shows try payment again button', async () => {
    renderCancelPage();
    await waitForAuthToLoad();
    
    const tryAgainButton = screen.getByRole('button', { name: /try payment again/i });
    expect(tryAgainButton).toBeInTheDocument();
    expect(tryAgainButton).toHaveClass('bg-[#B20000]');
  });
});
