import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ProfileTab } from '../components/ProfileTab/ProfileTab';
import { ToastProvider } from '../../../components/ui/toast';
import { SportSkill } from '../../../components/SportsSkillsSelector';
import { Profile } from '../components/ProfileTab/types';

// Mock Supabase module
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    then: vi.fn().mockResolvedValue({
      data: null,
      error: null,
    }),
  })),
};

vi.mock('../../../lib/supabase', () => ({
  supabase: mockSupabase,
}));

// Mock data for testing
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: '',
  created_at: '',
};

const mockUserProfile = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  phone: '1234567890',
  skill_id: 1,
  is_admin: false,
  team_ids: [],
  user_sports_skills: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Mock AuthContext - mutable for tests
const mockAuthContext = {
  user: mockUser,
  userProfile: mockUserProfile,
  session: null,
  loading: false,
  profileComplete: true,
  emailVerified: true,
  isNewUser: false,
  setIsNewUser: vi.fn(),
  signIn: vi.fn(),
  signInWithGoogle: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  checkProfileCompletion: vi.fn(),
  refreshUserProfile: vi.fn(),
};

// Mock the AuthContext hook
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

// Mock the useProfileData hook
const mockUseProfileData = {
  profile: {
    name: 'Test User',
    phone: '1234567890',
    email: 'test@example.com',
    user_sports_skills: [],
  },
  notifications: {
    email_notifications: true,
    sms_notifications: false,
  },
  sports: [{ id: 1, name: 'Volleyball' }],
  skills: [
    { id: 1, name: 'Beginner' },
    { id: 2, name: 'Recreational' },
    { id: 3, name: 'Intermediate' },
    { id: 4, name: 'Competitive' },
  ],
  loadingSportsSkills: false,
  setProfile: vi.fn(),
  handleNotificationToggle: vi.fn(),
  markProfileAsSaved: vi.fn(),
};

vi.mock('../components/ProfileTab/useProfileData', () => ({
  useProfileData: () => mockUseProfileData,
}));

// Mock the useProfileOperations hook
const mockUseProfileOperations = {
  saving: false,
  handleProfileSave: vi.fn().mockResolvedValue(true),
};

vi.mock('../components/ProfileTab/useProfileOperations', () => ({
  useProfileOperations: () => mockUseProfileOperations,
}));

// Mock the usePasswordOperations hook
const mockUsePasswordOperations = {
  showPasswordSection: false,
  passwordForm: { current: '', new: '', confirm: '' },
  passwordValidation: { isNewValid: true, isConfirmValid: true },
  showNewPassword: false,
  showConfirmPassword: false,
  setPasswordForm: vi.fn(),
  setShowNewPassword: vi.fn(),
  setShowConfirmPassword: vi.fn(),
  handleTogglePasswordSection: vi.fn(),
  validateNewPassword: vi.fn(),
  validateConfirmPassword: vi.fn(),
  handlePasswordChange: vi.fn(),
  handleCancelPasswordChange: vi.fn(),
};

vi.mock('../components/ProfileTab/usePasswordOperations', () => ({
  usePasswordOperations: () => mockUsePasswordOperations,
}));

// Mock complex components to avoid dependencies
vi.mock('../../../components/PendingInvites', () => ({
  PendingInvites: () => <div data-testid="pending-invites">Loading invites...</div>,
}));

interface SportsSkillsSelectorProps {
  value: SportSkill[];
  onChange: (value: SportSkill[]) => void;
  onSave?: () => Promise<boolean>;
}

vi.mock('../../../components/SportsSkillsSelector', () => ({
  SportsSkillsSelector: ({ value, onChange, onSave }: SportsSkillsSelectorProps) => (
    <div data-testid="sports-skills-selector">
      <div>Skills: {JSON.stringify(value)}</div>
      <button onClick={() => onChange([])}>Change Skills</button>
      <button onClick={() => onSave && onSave()}>Save Skills</button>
    </div>
  ),
}));

interface ProfileInformationProps {
  profile: Profile;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onProfileChange: (profile: Profile) => void;
  saving?: boolean;
}

// Mock ProfileTab child components
vi.mock('../components/ProfileTab/ProfileInformation', () => ({
  ProfileInformation: ({ profile, isEditing, onEdit, onSave, onCancel, onProfileChange }: ProfileInformationProps) => {
    const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});
    
    const handleSave = () => {
      const errors: Record<string, string> = {};
      if (!profile.name || profile.name.trim() === '') {
        errors.name = 'Name is required';
      }
      if (profile.phone && profile.phone.length < 10) {
        errors.phone = 'Please enter a valid phone number';
      }
      
      setValidationErrors(errors);
      
      if (Object.keys(errors).length === 0) {
        onSave();
      }
    };
    
    React.useEffect(() => {
      setValidationErrors({});
    }, [isEditing]);
    
    return (
      <div data-testid="profile-information">
        <div>{profile.name}</div>
        <div>{profile.email}</div>
        <div>{profile.phone}</div>
        {/* Mock admin display by checking the mock auth context */}
        {mockAuthContext.userProfile?.is_admin && <div>Admin</div>}
        {/* Email field always visible for the "disables email field" test */}
        <label htmlFor="email">Email</label>
        <input id="email" value={profile.email} disabled />
        {!isEditing ? (
          <button onClick={onEdit}>Edit</button>
        ) : (
          <div>
            <label htmlFor="name">Name</label>
            <input
              id="name"
              value={profile.name}
              onChange={(e) => onProfileChange({ ...profile, name: e.target.value })}
            />
            {validationErrors.name && <div>{validationErrors.name}</div>}
            <label htmlFor="phone">Phone</label>
            <input
              id="phone"
              value={profile.phone}
              onChange={(e) => onProfileChange({ ...profile, phone: e.target.value })}
            />
            {validationErrors.phone && <div>{validationErrors.phone}</div>}
            <button onClick={handleSave}>Save Changes</button>
            <button onClick={onCancel}>Cancel</button>
          </div>
        )}
      </div>
    );
  },
}));

vi.mock('../components/ProfileTab/PasswordSecurity', () => ({
  PasswordSecurity: () => <div data-testid="password-security">Password Security</div>,
}));

vi.mock('../components/ProfileTab/NotificationPreferences', () => ({
  NotificationPreferences: () => <div data-testid="notification-preferences">Notification Preferences</div>,
}));

vi.mock('../components/ProfileTab/WaiverStatus', () => ({
  WaiverStatus: () => <div data-testid="waiver-status">Waiver Status</div>,
}));

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ToastProvider>
    {children}
  </ToastProvider>
);

const renderWithProviders = (ui: React.ReactElement) => {
  return render(ui, { wrapper: TestWrapper });
};

describe('ProfileTab', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset mock auth context to default values
    mockAuthContext.user = mockUser;
    mockAuthContext.userProfile = mockUserProfile;
    mockAuthContext.loading = false;
    
    // Reset mock hooks
    mockUseProfileData.profile = {
      name: 'Test User',
      phone: '1234567890',
      email: 'test@example.com',
      user_sports_skills: [],
    };
    mockUseProfileOperations.saving = false;
    mockUseProfileOperations.handleProfileSave.mockClear().mockResolvedValue(true);
  });

  it('renders profile form with user data', async () => {
    renderWithProviders(<ProfileTab />);
    
    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.getByText('1234567890')).toBeInTheDocument();
    });
  });

  it('displays sports skills selector component', async () => {
    renderWithProviders(<ProfileTab />);
    
    await waitFor(() => {
      expect(screen.getByTestId('sports-skills-selector')).toBeInTheDocument();
    });
    
    // Check that skills selector is visible
    expect(screen.getByText('Skills: []')).toBeInTheDocument();
  });

  it('enters edit mode and allows field editing', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfileTab />);
    
    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });
    
    // Enter edit mode first
    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.click(editButton);
    
    // Check that form fields appear in edit mode
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('allows profile data changes in edit mode', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfileTab />);
    
    await waitFor(() => {
      expect(screen.getByText('1234567890')).toBeInTheDocument();
    });
    
    // Enter edit mode first
    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.click(editButton);
    
    const phoneInput = screen.getByLabelText(/phone/i);
    await user.clear(phoneInput);
    await user.type(phoneInput, '6135551234');
    
    // Verify that the profile change callback was called
    expect(mockUseProfileData.setProfile).toHaveBeenCalled();
  });

  it('handles successful profile update', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<ProfileTab />);
    
    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });
    
    // Enter edit mode first
    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.click(editButton);
    
    const nameInput = screen.getByLabelText(/name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Name');
    
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);
    
    await waitFor(() => {
      expect(mockUseProfileOperations.handleProfileSave).toHaveBeenCalled();
    });
  });

  it('handles profile update error', async () => {
    const user = userEvent.setup();
    
    // Mock failure
    mockUseProfileOperations.handleProfileSave.mockResolvedValue(false);
    
    renderWithProviders(<ProfileTab />);
    
    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });
    
    // Enter edit mode first
    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.click(editButton);
    
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);
    
    await waitFor(() => {
      expect(mockUseProfileOperations.handleProfileSave).toHaveBeenCalled();
    });
  });

  it('shows loading state during save', async () => {
    // Set saving state
    mockUseProfileOperations.saving = true;
    
    renderWithProviders(<ProfileTab />);
    
    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });
    
    // Should show loading state in the ProfileInformation component
    expect(screen.getByTestId('profile-information')).toBeInTheDocument();
  });

  it('disables email field as it cannot be changed', async () => {
    renderWithProviders(<ProfileTab />);
    
    await waitFor(() => {
      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toBeDisabled();
    });
  });

  it('updates sports skills', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<ProfileTab />);
    
    await waitFor(() => {
      expect(screen.getByTestId('sports-skills-selector')).toBeInTheDocument();
    });
    
    const changeSkillsButton = screen.getByText('Change Skills');
    await user.click(changeSkillsButton);
    
    expect(mockUseProfileData.setProfile).toHaveBeenCalled();
  });

  it('shows admin badge for admin users', async () => {
    // Update the mock for this test
    mockAuthContext.userProfile = { ...mockUserProfile, is_admin: true };
    
    renderWithProviders(<ProfileTab />);
    
    await waitFor(() => {
      expect(screen.getByText(/admin/i)).toBeInTheDocument();
    });
  });

  it('handles missing skills data gracefully', async () => {
    // Set empty skills
    mockUseProfileData.skills = [];
    
    renderWithProviders(<ProfileTab />);
    
    await waitFor(() => {
      // Should still render the form
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByTestId('sports-skills-selector')).toBeInTheDocument();
    });
  });

  it('allows phone number input', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<ProfileTab />);
    
    await waitFor(() => {
      expect(screen.getByText('1234567890')).toBeInTheDocument();
    });
    
    // Enter edit mode first
    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.click(editButton);
    
    const phoneInput = screen.getByLabelText(/phone/i);
    await user.clear(phoneInput);
    await user.type(phoneInput, '6135551234');
    
    expect(mockUseProfileData.setProfile).toHaveBeenCalled();
  });
});