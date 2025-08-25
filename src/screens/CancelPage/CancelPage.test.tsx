import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, render } from '../../test/test-utils';
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
  return render(<CancelPage />);
};

describe('CancelPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders cancellation message', () => {
    renderCancelPage();
    
    expect(screen.getByRole('heading', { name: /payment cancelled/i })).toBeInTheDocument();
    expect(screen.getByText(/your payment was cancelled/i)).toBeInTheDocument();
    expect(screen.getByText(/no charges have been made to your account/i)).toBeInTheDocument();
  });

  it('shows cancellation icon', () => {
    renderCancelPage();
    
    // Look for the XCircle icon by finding any svg with the appropriate size and color
    const cancelIcon = document.querySelector('svg.h-16.w-16.text-orange-500');
    expect(cancelIcon).toBeInTheDocument();
    expect(cancelIcon).toHaveClass('text-orange-500');
  });

  it('displays action buttons', () => {
    renderCancelPage();
    
    expect(screen.getByRole('button', { name: /try payment again/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to leagues/i })).toBeInTheDocument();
  });

  it('navigates to leagues page', async () => {
    const user = userEvent.setup();
    
    renderCancelPage();
    
    const leaguesLink = screen.getByRole('link', { name: /back to leagues/i });
    await user.click(leaguesLink);
    
    // The link has to="/leagues" so it should navigate there
    expect(leaguesLink).toHaveAttribute('href', '/leagues');
  });

  it('displays help information', () => {
    renderCancelPage();
    
    expect(screen.getByText(/need help/i)).toBeInTheDocument();
    expect(screen.getByText(/contact us at/i)).toBeInTheDocument();
    expect(screen.getByText(/payments@ofsl.ca/i)).toBeInTheDocument();
  });

  it('shows contact support email', () => {
    renderCancelPage();
    
    const supportEmail = screen.getByText(/payments@ofsl.ca/i);
    expect(supportEmail).toBeInTheDocument();
    expect(supportEmail.tagName).toBe('A');
    expect(supportEmail).toHaveAttribute('href', 'mailto:payments@ofsl.ca');
  });

  it('displays explanation of what happened', () => {
    renderCancelPage();
    
    expect(screen.getByText(/what happened/i)).toBeInTheDocument();
    expect(screen.getByText(/you cancelled the payment process/i)).toBeInTheDocument();
    expect(screen.getByText(/no payment has been processed/i)).toBeInTheDocument();
  });

  it('shows try payment again button', () => {
    renderCancelPage();
    
    const tryAgainButton = screen.getByRole('button', { name: /try payment again/i });
    expect(tryAgainButton).toBeInTheDocument();
    expect(tryAgainButton).toHaveClass('bg-[#B20000]');
  });
});