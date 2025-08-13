import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../ProtectedRoute';

// Mock dependencies
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
    auth: {
      getSession: vi.fn(),
    },
  },
}));

// Mock the auth context
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  email_confirmed_at: '2024-01-01T00:00:00Z',
  app_metadata: { provider: 'email' },
};

const mockIncompleteProfile = {
  id: 'test-user-id',
  name: null,
  phone: null,
  profile_completed: false,
  user_sports_skills: [],
  is_admin: false,
};

const mockCompleteProfile = {
  id: 'test-user-id',
  name: 'Test User',
  phone: '123-456-7890',
  profile_completed: true,
  user_sports_skills: [{ sport_id: 1, skill_id: 1 }],
  is_admin: false,
};

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../../contexts/AuthContext';

// Mock logger
vi.mock('../../lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('Profile Completion Enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.location for HashRouter compatibility
    Object.defineProperty(window, 'location', {
      value: {
        hash: '',
        href: 'http://localhost:3000/',
        pathname: '/',
      },
      writable: true,
    });
  });

  it('should redirect to profile completion page when profile is incomplete', () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: mockUser,
      userProfile: mockIncompleteProfile,
      loading: false,
      refreshUserProfile: vi.fn(),
    });

    const TestComponent = () => <div>Protected Content</div>;

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <TestComponent />
              </ProtectedRoute>
            }
          />
          <Route path="/complete-profile" element={<div>Complete Profile Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    // Should show profile completion page, not protected content
    expect(screen.getByText('Complete Profile Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should allow access when profile is complete', () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: mockUser,
      userProfile: mockCompleteProfile,
      loading: false,
      refreshUserProfile: vi.fn(),
    });

    const TestComponent = () => <div>Protected Content</div>;

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <TestComponent />
              </ProtectedRoute>
            }
          />
          <Route path="/complete-profile" element={<div>Complete Profile Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    // Should show protected content when profile is complete
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(screen.queryByText('Complete Profile Page')).not.toBeInTheDocument();
  });

  it('should redirect to signup confirmation when email is not confirmed', () => {
    const unconfirmedUser = {
      ...mockUser,
      email_confirmed_at: null,
    };

    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: unconfirmedUser,
      userProfile: mockIncompleteProfile,
      loading: false,
      refreshUserProfile: vi.fn(),
    });

    const TestComponent = () => <div>Protected Content</div>;

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <TestComponent />
              </ProtectedRoute>
            }
          />
          <Route path="/signup-confirmation" element={<div>Signup Confirmation Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    // Should redirect to signup confirmation
    expect(screen.getByText('Signup Confirmation Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should not redirect Google users for email confirmation', () => {
    const googleUser = {
      ...mockUser,
      email_confirmed_at: null,
      app_metadata: { provider: 'google' },
    };

    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: googleUser,
      userProfile: mockCompleteProfile,
      loading: false,
      refreshUserProfile: vi.fn(),
    });

    const TestComponent = () => <div>Protected Content</div>;

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <TestComponent />
              </ProtectedRoute>
            }
          />
          <Route path="/signup-confirmation" element={<div>Signup Confirmation Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    // Google users should access content even without email confirmation
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(screen.queryByText('Signup Confirmation Page')).not.toBeInTheDocument();
  });

  it('should redirect when profile lacks required fields', () => {
    const incompleteFieldsProfile = {
      ...mockCompleteProfile,
      phone: null, // Missing phone
    };

    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: mockUser,
      userProfile: incompleteFieldsProfile,
      loading: false,
      refreshUserProfile: vi.fn(),
    });

    const TestComponent = () => <div>Protected Content</div>;

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <TestComponent />
              </ProtectedRoute>
            }
          />
          <Route path="/complete-profile" element={<div>Complete Profile Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    // Should redirect when required fields are missing
    expect(screen.getByText('Complete Profile Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should redirect when user has no sports skills selected', () => {
    const noSportsProfile = {
      ...mockCompleteProfile,
      user_sports_skills: [], // No sports skills
    };

    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: mockUser,
      userProfile: noSportsProfile,
      loading: false,
      refreshUserProfile: vi.fn(),
    });

    const TestComponent = () => <div>Protected Content</div>;

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <TestComponent />
              </ProtectedRoute>
            }
          />
          <Route path="/complete-profile" element={<div>Complete Profile Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    // Should redirect when sports skills are missing
    expect(screen.getByText('Complete Profile Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});