import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SuccessPage } from './SuccessPage';

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock Stripe functions
vi.mock('../../lib/stripe', () => ({
  getUserSubscription: vi.fn().mockResolvedValue(null),
  getUserOrders: vi.fn().mockResolvedValue([]),
}));

// Mock stripe-config
vi.mock('../../stripe-config', () => ({
  formatPrice: vi.fn((price) => `$${price.toFixed(2)}`),
}));

// Simple render without AuthProvider for public pages
const renderSuccessPage = (searchParams = '?session_id=cs_test_123') => {
  return render(
    <MemoryRouter initialEntries={[`/success${searchParams}`]}>
      <SuccessPage />
    </MemoryRouter>
  );
};

describe('SuccessPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders success message', async () => {
    renderSuccessPage();
    
    // Wait for component to load (it has useEffect)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /registration complete|payment successful/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/thank you for your purchase/i)).toBeInTheDocument();
  });

  it('shows confirmation details', async () => {
    renderSuccessPage();
    
    // Wait for component to load and check for confirmation email text
    await waitFor(() => {
      expect(screen.getByText(/confirmation email has been sent/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/payment details/i)).toBeInTheDocument();
  });

  it('displays action buttons', async () => {
    renderSuccessPage();
    
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /view my teams/i })).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /browse more leagues/i })).toBeInTheDocument();
  });

  it('navigates to my teams when clicked', async () => {
    renderSuccessPage();
    
    await waitFor(() => {
      const myTeamsLink = screen.getByRole('link', { name: /view my teams/i });
      expect(myTeamsLink).toHaveAttribute('href', '/my-account/teams');
    });
  });

  it('shows success icon', async () => {
    renderSuccessPage();
    
    // Wait for component to load and look for the CheckCircle icon
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /payment successful/i })).toBeInTheDocument();
    });
    const successIcon = document.querySelector('svg.lucide-circle-check-big.h-16.w-16.text-green-500');
    expect(successIcon).toBeInTheDocument();
    expect(successIcon).toHaveClass('text-green-500');
  });

  it('displays payment details section', async () => {
    renderSuccessPage();
    
    await waitFor(() => {
      expect(screen.getByText(/payment details/i)).toBeInTheDocument();
    });
  });

  it('shows confirmation message', async () => {
    renderSuccessPage();
    
    await waitFor(() => {
      expect(screen.getByText(/confirmation email has been sent/i)).toBeInTheDocument();
    });
  });

  it('handles product name from URL params', async () => {
    renderSuccessPage('?session_id=cs_test_123&product=Test%20Product');
    
    await waitFor(() => {
      expect(screen.getByText(/thank you for your purchase of/i)).toBeInTheDocument();
      expect(screen.getByText(/test product/i)).toBeInTheDocument();
    });
  });
});