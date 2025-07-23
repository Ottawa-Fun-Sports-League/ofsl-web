import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileTab } from '../components/ProfileTab/ProfileTab';
import { render, mockUser, mockUserProfile } from '../../../test/test-utils';
import { mockSupabase } from '../../../test/mocks/supabase-enhanced';

describe('ProfileTab', () => {
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
  });

  it('renders profile form with user data', async () => {
    render(<ProfileTab />, {
      user: mockUser,
      userProfile: mockUserProfile,
    });
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1234567890')).toBeInTheDocument();
    });
  });

  it('displays skill level dropdown with options', async () => {
    render(<ProfileTab />, {
      user: mockUser,
      userProfile: mockUserProfile,
    });
    
    await waitFor(() => {
      const skillSelect = screen.getByLabelText(/skill level/i);
      expect(skillSelect).toBeInTheDocument();
    });
    
    // Check that skills are loaded in the select
    const skillSelect = screen.getByRole('combobox', { name: /skill level/i });
    expect(skillSelect).toHaveTextContent('Beginner'); // Default skill_id: 1
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    
    render(<ProfileTab />, {
      user: mockUser,
      userProfile: mockUserProfile,
    });
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
    });
    
    // Clear name field
    const nameInput = screen.getByLabelText(/name/i);
    await user.clear(nameInput);
    
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);
    
    expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
  });

  it('validates phone number format', async () => {
    const user = userEvent.setup();
    
    render(<ProfileTab />, {
      user: mockUser,
      userProfile: mockUserProfile,
    });
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('1234567890')).toBeInTheDocument();
    });
    
    const phoneInput = screen.getByLabelText(/phone/i);
    await user.clear(phoneInput);
    await user.type(phoneInput, '123'); // Too short
    
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);
    
    expect(await screen.findByText(/please enter a valid phone number/i)).toBeInTheDocument();
  });

  it('handles successful profile update', async () => {
    const user = userEvent.setup();
    
    mockSupabase.from('users').update().eq().then = vi.fn().mockResolvedValue({
      data: { ...mockUserProfile, name: 'Updated Name' },
      error: null,
    });
    
    render(<ProfileTab />, {
      user: mockUser,
      userProfile: mockUserProfile,
    });
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
    });
    
    const nameInput = screen.getByLabelText(/name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Name');
    
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);
    
    await waitFor(() => {
      expect(mockSupabase.from('users').update).toHaveBeenCalledWith({
        name: 'Updated Name',
        phone: '1234567890',
        skill_id: 1,
      });
    });
    
    expect(await screen.findByText(/profile updated successfully/i)).toBeInTheDocument();
  });

  it('handles profile update error', async () => {
    const user = userEvent.setup();
    
    mockSupabase.from('users').update().eq().then = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Failed to update profile' },
    });
    
    render(<ProfileTab />, {
      user: mockUser,
      userProfile: mockUserProfile,
    });
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
    });
    
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);
    
    expect(await screen.findByText(/failed to update profile/i)).toBeInTheDocument();
  });

  it('shows loading state during save', async () => {
    const user = userEvent.setup();
    
    // Make the promise hang to see loading state
    mockSupabase.from('users').update().eq().then = vi.fn(() => new Promise(() => {}));
    
    render(<ProfileTab />, {
      user: mockUser,
      userProfile: mockUserProfile,
    });
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
    });
    
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);
    
    expect(screen.getByText(/saving.../i)).toBeInTheDocument();
    expect(saveButton).toBeDisabled();
  });

  it('disables email field as it cannot be changed', async () => {
    render(<ProfileTab />, {
      user: mockUser,
      userProfile: mockUserProfile,
    });
    
    await waitFor(() => {
      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toBeDisabled();
    });
  });

  it('updates skill level', async () => {
    const user = userEvent.setup();
    
    mockSupabase.from('users').update().eq().then = vi.fn().mockResolvedValue({
      data: { ...mockUserProfile, skill_id: 3 },
      error: null,
    });
    
    render(<ProfileTab />, {
      user: mockUser,
      userProfile: mockUserProfile,
    });
    
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /skill level/i })).toBeInTheDocument();
    });
    
    const skillSelect = screen.getByRole('combobox', { name: /skill level/i });
    await user.selectOptions(skillSelect, '3'); // Intermediate
    
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);
    
    await waitFor(() => {
      expect(mockSupabase.from('users').update).toHaveBeenCalledWith({
        name: 'Test User',
        phone: '1234567890',
        skill_id: 3,
      });
    });
  });

  it('shows admin badge for admin users', async () => {
    const adminProfile = { ...mockUserProfile, is_admin: true };
    
    render(<ProfileTab />, {
      user: mockUser,
      userProfile: adminProfile,
    });
    
    await waitFor(() => {
      expect(screen.getByText(/admin/i)).toBeInTheDocument();
    });
  });

  it('handles missing skills data gracefully', async () => {
    mockSupabase.from('skills').select().order().then = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Failed to fetch skills' },
    });
    
    render(<ProfileTab />, {
      user: mockUser,
      userProfile: mockUserProfile,
    });
    
    await waitFor(() => {
      // Should still render the form
      expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
      // Skill select should have a fallback option
      const skillSelect = screen.getByRole('combobox', { name: /skill level/i });
      expect(skillSelect).toBeInTheDocument();
    });
  });

  it('formats phone number display', async () => {
    const user = userEvent.setup();
    
    render(<ProfileTab />, {
      user: mockUser,
      userProfile: mockUserProfile,
    });
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('1234567890')).toBeInTheDocument();
    });
    
    const phoneInput = screen.getByLabelText(/phone/i);
    await user.clear(phoneInput);
    await user.type(phoneInput, '6135551234');
    
    // Should format as (613) 555-1234
    await waitFor(() => {
      expect(phoneInput).toHaveValue('(613) 555-1234');
    });
  });
});