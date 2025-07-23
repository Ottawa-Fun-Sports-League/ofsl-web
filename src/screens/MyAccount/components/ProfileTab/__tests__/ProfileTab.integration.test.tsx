import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProfileTab } from '../ProfileTab';
import { supabase } from '../../../../../lib/supabase';
import { useAuth } from '../../../../../contexts/AuthContext';

// Mock dependencies
vi.mock('../../../../../contexts/AuthContext');
vi.mock('../../../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      updateUser: vi.fn()
    }
  }
}));

vi.mock('../../../../../components/ui/toast', () => ({
  useToast: () => ({
    showToast: vi.fn()
  })
}));

vi.mock('../../../../../lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn()
  }
}));

describe('ProfileTab - Sports & Skills Persistence', () => {
  const mockUserProfile = {
    id: 'user123',
    auth_id: 'auth123',
    name: 'Test User',
    email: 'test@example.com',
    phone: '1234567890',
    user_sports_skills: []
  };

  const mockRefreshUserProfile = vi.fn();

  const mockSports = [
    { id: 1, name: 'Volleyball' },
    { id: 2, name: 'Badminton' }
  ];

  const mockSkills = [
    { id: 1, name: 'Beginner', description: 'New to the sport' },
    { id: 2, name: 'Intermediate', description: 'Some experience' }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock useAuth
    vi.mocked(useAuth).mockReturnValue({
      userProfile: mockUserProfile,
      refreshUserProfile: mockRefreshUserProfile
    } as any);

    // Mock Supabase queries
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'sports') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: mockSports,
            error: null
          })
        } as any;
      }
      if (table === 'skills') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: mockSkills,
            error: null
          })
        } as any;
      }
      if (table === 'users') {
        return {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              ...mockUserProfile,
              user_sports_skills: [
                { sport_id: 1, skill_id: 1, sport_name: 'Volleyball', skill_name: 'Beginner' }
              ]
            },
            error: null
          })
        } as any;
      }
      return {} as any;
    });
  });

  it('should persist sports and skills when save button is clicked', async () => {
    render(<ProfileTab />);

    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('Sports & Skill Levels')).toBeInTheDocument();
    });

    // Click Add button in the Sports & Skill Levels section
    const sportsSection = screen.getByText('Sports & Skill Levels').parentElement?.parentElement?.parentElement;
    expect(sportsSection).toBeDefined();
    const addButtons = sportsSection!.querySelectorAll('button');
    const addButton = Array.from(addButtons).find(btn => btn.textContent?.includes('Add'));
    expect(addButton).toBeDefined();
    fireEvent.click(addButton!);

    // Select Volleyball
    await waitFor(() => {
      const volleyballButtons = screen.getAllByText('Volleyball');
      expect(volleyballButtons.length).toBeGreaterThan(0);
    });
    const volleyballButtons = screen.getAllByText('Volleyball');
    fireEvent.click(volleyballButtons[0]);

    // Select Beginner skill
    await waitFor(() => {
      const beginnerButtons = screen.getAllByText('Beginner');
      expect(beginnerButtons.length).toBeGreaterThan(0);
    });
    const beginnerButtons = screen.getAllByText('Beginner');
    fireEvent.click(beginnerButtons[0]);

    // Save button should appear
    await waitFor(() => {
      const saveButton = screen.queryByText('Save Changes');
      expect(saveButton).toBeInTheDocument();
    }, { timeout: 3000 });

    // Click save
    fireEvent.click(screen.getByText('Save Changes'));

    // Wait for save to complete
    await waitFor(() => {
      // Verify Supabase update was called with correct data
      const updateCall = vi.mocked(supabase.from).mock.calls.find(
        call => call[0] === 'users'
      );
      expect(updateCall).toBeDefined();

      const updateMethod = vi.mocked(supabase.from).mock.results.find(
        result => result.value?.update
      );
      expect(updateMethod?.value.update).toHaveBeenCalledWith({
        name: 'Test User',
        phone: '1234567890',
        email: 'test@example.com',
        user_sports_skills: [
          {
            sport_id: 1,
            skill_id: 1,
            sport_name: 'Volleyball',
            skill_name: 'Beginner'
          }
        ],
        date_modified: expect.any(String)
      });

      // Verify refresh was called
      expect(mockRefreshUserProfile).toHaveBeenCalled();
    });
  });

  it('should handle edit and update of existing sports/skills', async () => {
    // Update mock to have existing sports/skills
    const profileWithSports = {
      ...mockUserProfile,
      user_sports_skills: [
        { sport_id: 1, skill_id: 1, sport_name: 'Volleyball', skill_name: 'Beginner' }
      ]
    };

    vi.mocked(useAuth).mockReturnValue({
      userProfile: profileWithSports,
      refreshUserProfile: mockRefreshUserProfile
    } as any);

    render(<ProfileTab />);

    // Wait for existing sport/skill to render
    await waitFor(() => {
      expect(screen.getByText('Volleyball')).toBeInTheDocument();
      expect(screen.getByText('Beginner')).toBeInTheDocument();
    });

    // Hover over the sport/skill to show edit button
    const sportSkillElement = screen.getByText('Volleyball').closest('.group');
    fireEvent.mouseOver(sportSkillElement!);

    // Click edit button
    const editButton = sportSkillElement!.querySelector('button[title="Edit"]');
    fireEvent.click(editButton!);

    // Select Intermediate skill
    await waitFor(() => {
      expect(screen.getByText('Intermediate')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Intermediate'));

    // Click save
    await waitFor(() => {
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Save Changes'));

    // Verify update was called with updated skill
    await waitFor(() => {
      const updateMethod = vi.mocked(supabase.from).mock.results.find(
        result => result.value?.update
      );
      expect(updateMethod?.value.update).toHaveBeenCalledWith(
        expect.objectContaining({
          user_sports_skills: [
            {
              sport_id: 1,
              skill_id: 2,
              sport_name: 'Volleyball',
              skill_name: 'Intermediate'
            }
          ]
        })
      );
    });
  });

  it('should handle removal of sports/skills', async () => {
    const profileWithSports = {
      ...mockUserProfile,
      user_sports_skills: [
        { sport_id: 1, skill_id: 1, sport_name: 'Volleyball', skill_name: 'Beginner' },
        { sport_id: 2, skill_id: 2, sport_name: 'Badminton', skill_name: 'Intermediate' }
      ]
    };

    vi.mocked(useAuth).mockReturnValue({
      userProfile: profileWithSports,
      refreshUserProfile: mockRefreshUserProfile
    } as any);

    render(<ProfileTab />);

    // Wait for sports/skills to render
    await waitFor(() => {
      expect(screen.getByText('Volleyball')).toBeInTheDocument();
      expect(screen.getByText('Badminton')).toBeInTheDocument();
    });

    // Remove Volleyball
    const volleyballElement = screen.getByText('Volleyball').closest('.group');
    fireEvent.mouseOver(volleyballElement!);
    
    const removeButton = volleyballElement!.querySelector('button[title="Remove"]');
    fireEvent.click(removeButton!);

    // Click save
    await waitFor(() => {
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Save Changes'));

    // Verify update was called with only Badminton remaining
    await waitFor(() => {
      const updateMethod = vi.mocked(supabase.from).mock.results.find(
        result => result.value?.update
      );
      expect(updateMethod?.value.update).toHaveBeenCalledWith(
        expect.objectContaining({
          user_sports_skills: [
            {
              sport_id: 2,
              skill_id: 2,
              sport_name: 'Badminton',
              skill_name: 'Intermediate'
            }
          ]
        })
      );
    });
  });

  it('should handle save errors gracefully', async () => {
    render(<ProfileTab />);

    // Wait for component to fully load
    await waitFor(() => {
      expect(screen.getByText('Sports & Skill Levels')).toBeInTheDocument();
    });
    
    // Find and click the Add button in the sports section
    const sportsSection = screen.getByText('Sports & Skill Levels').parentElement?.parentElement?.parentElement;
    const addButtons = sportsSection!.querySelectorAll('button');
    const addButton = Array.from(addButtons).find(btn => btn.textContent?.includes('Add'));
    fireEvent.click(addButton!);
    
    // Select sport and skill
    await waitFor(() => {
      expect(screen.getByText('Volleyball')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Volleyball'));
    
    await waitFor(() => {
      expect(screen.getByText('Beginner')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Beginner'));

    // Now mock the failure for the save operation
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            error: new Error('Update failed')
          })
        } as any;
      }
      // Return default mocks for other tables
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: table === 'sports' ? mockSports : mockSkills,
          error: null
        })
      } as any;
    });

    // Wait for save button to appear
    await waitFor(() => {
      const saveButton = sportsSection!.querySelector('button[class*="bg-[#B20000]"]');
      expect(saveButton).toBeInTheDocument();
      expect(saveButton?.textContent).toContain('Save Changes');
    });

    // Click save
    const saveButton = sportsSection!.querySelector('button[class*="bg-[#B20000]"]') as HTMLButtonElement;
    fireEvent.click(saveButton);

    // Save button should still be visible after error
    await waitFor(() => {
      const stillVisibleSaveButton = sportsSection!.querySelector('button[class*="bg-[#B20000]"]');
      expect(stillVisibleSaveButton).toBeInTheDocument();
    });

    // Refresh should not have been called due to error
    expect(mockRefreshUserProfile).not.toHaveBeenCalled();
  });
});