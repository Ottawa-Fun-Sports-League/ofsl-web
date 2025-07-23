import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileCompletionPage } from './ProfileCompletionPage';
import { render, mockUser, mockNavigate } from '../../test/test-utils';
import { mockSupabase } from '../../test/mocks/supabase-enhanced';

describe('ProfileCompletionPage', () => {
  const mockSkills = [
    { id: 1, name: 'Beginner' },
    { id: 2, name: 'Recreational' },
    { id: 3, name: 'Intermediate' },
    { id: 4, name: 'Competitive' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock skills fetch
    mockSupabase.from('skills').select().order().then = vi.fn().mockResolvedValue({
      data: mockSkills,
      error: null,
    });
    
    // Mock user has no profile yet
    mockSupabase.from('users').select().eq().single().then = vi.fn().mockResolvedValue({
      data: null,
      error: { code: 'PGRST116' }, // Not found error
    });
  });

  it('renders profile completion form', async () => {
    render(<ProfileCompletionPage />, {
      user: mockUser,
    });
    
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /complete your profile/i })).toBeInTheDocument();
      expect(screen.getByText(/please complete your profile/i)).toBeInTheDocument();
    });
    
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/skill level/i)).toBeInTheDocument();
  });

  it('prefills email from authenticated user', async () => {
    render(<ProfileCompletionPage />, {
      user: mockUser,
    });
    
    await waitFor(() => {
      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveValue('test@example.com');
      expect(emailInput).toBeDisabled();
    });
  });

  it('loads skill levels in dropdown', async () => {
    render(<ProfileCompletionPage />, {
      user: mockUser,
    });
    
    await waitFor(() => {
      const skillSelect = screen.getByRole('combobox', { name: /skill level/i });
      expect(skillSelect).toBeInTheDocument();
    });
    
    // Open dropdown and check options
    const skillSelect = screen.getByRole('combobox', { name: /skill level/i });
    const user = userEvent.setup();
    await user.click(skillSelect);
    
    mockSkills.forEach(skill => {
      expect(screen.getByRole('option', { name: skill.name })).toBeInTheDocument();
    });
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    
    render(<ProfileCompletionPage />, {
      user: mockUser,
    });
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /complete profile/i })).toBeInTheDocument();
    });
    
    const submitButton = screen.getByRole('button', { name: /complete profile/i });
    await user.click(submitButton);
    
    expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/phone number is required/i)).toBeInTheDocument();
  });

  it('validates phone number format', async () => {
    const user = userEvent.setup();
    
    render(<ProfileCompletionPage />, {
      user: mockUser,
    });
    
    await waitFor(() => {
      expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    });
    
    const phoneInput = screen.getByLabelText(/phone number/i);
    await user.type(phoneInput, '123'); // Too short
    
    const submitButton = screen.getByRole('button', { name: /complete profile/i });
    await user.click(submitButton);
    
    expect(await screen.findByText(/please enter a valid 10-digit phone number/i)).toBeInTheDocument();
  });

  it('handles successful profile creation', async () => {
    const user = userEvent.setup();
    
    mockSupabase.from('users').insert().select().single().then = vi.fn().mockResolvedValue({
      data: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'John Doe',
        phone: '6135551234',
        skill_id: 2,
      },
      error: null,
    });
    
    render(<ProfileCompletionPage />, {
      user: mockUser,
    });
    
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /complete your profile/i })).toBeInTheDocument();
    });
    
    // Fill form
    const nameInput = screen.getByLabelText(/full name/i);
    const phoneInput = screen.getByLabelText(/phone number/i);
    const skillSelect = screen.getByRole('combobox', { name: /skill level/i });
    
    await user.type(nameInput, 'John Doe');
    await user.type(phoneInput, '6135551234');
    await user.selectOptions(skillSelect, '2'); // Recreational
    
    const submitButton = screen.getByRole('button', { name: /complete profile/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockSupabase.from('users').insert).toHaveBeenCalledWith({
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'John Doe',
        phone: '6135551234',
        skill_id: 2,
      });
    });
    
    // Should redirect after success
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('handles profile creation error', async () => {
    const user = userEvent.setup();
    
    mockSupabase.from('users').insert().select().single().then = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Failed to create profile' },
    });
    
    render(<ProfileCompletionPage />, {
      user: mockUser,
    });
    
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /complete your profile/i })).toBeInTheDocument();
    });
    
    // Fill form
    const nameInput = screen.getByLabelText(/full name/i);
    const phoneInput = screen.getByLabelText(/phone number/i);
    
    await user.type(nameInput, 'John Doe');
    await user.type(phoneInput, '6135551234');
    
    const submitButton = screen.getByRole('button', { name: /complete profile/i });
    await user.click(submitButton);
    
    expect(await screen.findByText(/failed to create profile/i)).toBeInTheDocument();
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    
    // Make the promise hang
    mockSupabase.from('users').insert().select().single().then = vi.fn(() => new Promise(() => {}));
    
    render(<ProfileCompletionPage />, {
      user: mockUser,
    });
    
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /complete your profile/i })).toBeInTheDocument();
    });
    
    // Fill form
    const nameInput = screen.getByLabelText(/full name/i);
    const phoneInput = screen.getByLabelText(/phone number/i);
    
    await user.type(nameInput, 'John Doe');
    await user.type(phoneInput, '6135551234');
    
    const submitButton = screen.getByRole('button', { name: /complete profile/i });
    await user.click(submitButton);
    
    expect(screen.getByText(/creating profile.../i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it('redirects if user already has a profile', async () => {
    // Mock user already has profile
    mockSupabase.from('users').select().eq().single().then = vi.fn().mockResolvedValue({
      data: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Existing User',
        phone: '6135551234',
        skill_id: 2,
      },
      error: null,
    });
    
    render(<ProfileCompletionPage />, {
      user: mockUser,
      userProfile: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Existing User',
        phone: '6135551234',
        skill_id: 2,
        is_admin: false,
        team_ids: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('requires authentication to access', async () => {
    render(<ProfileCompletionPage />, {
      user: null, // Not authenticated
    });
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  it('formats phone number as user types', async () => {
    const user = userEvent.setup();
    
    render(<ProfileCompletionPage />, {
      user: mockUser,
    });
    
    await waitFor(() => {
      expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    });
    
    const phoneInput = screen.getByLabelText(/phone number/i);
    await user.type(phoneInput, '6135551234');
    
    // Should format as (613) 555-1234
    expect(phoneInput).toHaveValue('(613) 555-1234');
  });

  it('handles network error gracefully', async () => {
    // Mock network error on skills fetch
    mockSupabase.from('skills').select().order().then = vi.fn().mockRejectedValue(
      new Error('Network error')
    );
    
    render(<ProfileCompletionPage />, {
      user: mockUser,
    });
    
    await waitFor(() => {
      // Should still render form even if skills fail to load
      expect(screen.getByRole('heading', { name: /complete your profile/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    });
  });
});