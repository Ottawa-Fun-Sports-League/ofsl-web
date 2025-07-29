import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SportsSkillsSelector } from '../SportsSkillsSelector';
import { supabase } from '../../lib/supabase';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

// Mock logger
vi.mock('../../lib/logger', () => ({
  logger: {
    error: vi.fn()
  }
}));

describe('SportsSkillsSelector - Integration Test', () => {
  const mockSports = [
    { id: 1, name: 'Volleyball' },
    { id: 2, name: 'Badminton' }
  ];

  const mockSkills = [
    { id: 1, name: 'Beginner', description: 'New to the sport' },
    { id: 2, name: 'Intermediate', description: 'Some experience' },
    { id: 3, name: 'Advanced', description: 'Very experienced' }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful sports and skills fetch
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'sports') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: mockSports,
            error: null
          })
        } as unknown as ReturnType<typeof supabase.from>;
      }
      if (table === 'skills') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: mockSkills,
            error: null
          })
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {} as unknown as ReturnType<typeof supabase.from>;
    });
  });
  it('should complete full workflow: add, edit, remove, and save sports/skills', async () => {
    const mockOnChange = vi.fn();
    const mockOnSave = vi.fn().mockResolvedValue(true);

    const { rerender } = render(
      <SportsSkillsSelector
        value={[]}
        onChange={mockOnChange}
        onSave={mockOnSave}
        showTitle={true}
      />
    );

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByText('Sports & Skill Levels')).toBeInTheDocument();
    });

    // Step 1: Add a sport/skill
    fireEvent.click(screen.getByText('Add'));
    
    await waitFor(() => {
      expect(screen.getByText('Add Sport & Skill Level')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Volleyball'));
    fireEvent.click(screen.getByText('Beginner'));

    // Verify onChange was called
    expect(mockOnChange).toHaveBeenCalledWith([
      {
        sport_id: 1,
        skill_id: 1,
        sport_name: 'Volleyball',
        skill_name: 'Beginner'
      }
    ]);

    // Verify Save Changes button appears
    expect(screen.getByText('Save Changes')).toBeInTheDocument();

    // Step 2: Save the changes
    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
    });

    // Simulate parent component updating the value after successful save
    rerender(
      <SportsSkillsSelector
        value={[
          {
            sport_id: 1,
            skill_id: 1,
            sport_name: 'Volleyball',
            skill_name: 'Beginner'
          }
        ]}
        onChange={mockOnChange}
        onSave={mockOnSave}
        showTitle={true}
      />
    );

    // Save button should disappear after successful save
    await waitFor(() => {
      expect(screen.queryByText('Save Changes')).not.toBeInTheDocument();
    });

    // Step 3: Edit the sport/skill
    const volleyballElement = screen.getByText('Volleyball').closest('.group');
    fireEvent.mouseOver(volleyballElement!);
    
    const editButton = volleyballElement!.querySelector('button[title="Edit"]');
    fireEvent.click(editButton!);

    expect(screen.getByText('Edit Sport & Skill Level')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Intermediate'));

    expect(mockOnChange).toHaveBeenLastCalledWith([
      {
        sport_id: 1,
        skill_id: 2,
        sport_name: 'Volleyball',
        skill_name: 'Intermediate'
      }
    ]);

    // Save button should reappear
    expect(screen.getByText('Save Changes')).toBeInTheDocument();

    // Step 4: Cancel changes
    fireEvent.click(screen.getByText('Cancel'));

    // Verify onChange was called to restore original value
    expect(mockOnChange).toHaveBeenLastCalledWith([
      {
        sport_id: 1,
        skill_id: 1,
        sport_name: 'Volleyball',
        skill_name: 'Beginner'
      }
    ]);

    // Save button should disappear
    expect(screen.queryByText('Save Changes')).not.toBeInTheDocument();

    // Step 5: Remove the sport/skill
    fireEvent.mouseOver(volleyballElement!);
    
    const removeButton = volleyballElement!.querySelector('button[title="Remove"]');
    fireEvent.click(removeButton!);

    expect(mockOnChange).toHaveBeenCalledWith([]);
    expect(screen.getByText('Save Changes')).toBeInTheDocument();

    // Save removal
    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledTimes(2);
    });

    // Simulate empty value after save
    rerender(
      <SportsSkillsSelector
        value={[]}
        onChange={mockOnChange}
        onSave={mockOnSave}
        showTitle={true}
      />
    );

    // Should show empty state
    await waitFor(() => {
      expect(screen.getByText(/You haven.*t selected any sports or skill levels yet/i)).toBeInTheDocument();
    });
  });

  it('should handle save failures gracefully', async () => {
    const mockOnChange = vi.fn();
    const mockOnSave = vi.fn().mockResolvedValue(false); // Simulate save failure

    render(
      <SportsSkillsSelector
        value={[]}
        onChange={mockOnChange}
        onSave={mockOnSave}
        showTitle={true}
      />
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading sports data...')).not.toBeInTheDocument();
    });

    // Add a sport/skill
    fireEvent.click(screen.getByText('Add'));
    fireEvent.click(screen.getByText('Volleyball'));
    fireEvent.click(screen.getByText('Beginner'));

    // Try to save
    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
    });

    // Save button should still be visible since save failed
    expect(screen.getByText('Save Changes')).toBeInTheDocument();

    // The value should still show unsaved changes
    expect(mockOnChange).toHaveBeenCalledWith([
      {
        sport_id: 1,
        skill_id: 1,
        sport_name: 'Volleyball',
        skill_name: 'Beginner'
      }
    ]);
  });
});