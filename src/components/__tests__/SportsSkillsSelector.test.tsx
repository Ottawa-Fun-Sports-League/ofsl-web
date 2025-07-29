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

describe('SportsSkillsSelector', () => {
  const mockOnChange = vi.fn();
  const mockOnSave = vi.fn();

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

  it('should render with initial empty state', async () => {
    render(
      <SportsSkillsSelector
        value={[]}
        onChange={mockOnChange}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/You haven.*t selected any sports or skill levels yet/i)).toBeInTheDocument();
    });
  });

  it('should add a new sport and skill', async () => {
    render(
      <SportsSkillsSelector
        value={[]}
        onChange={mockOnChange}
        onSave={mockOnSave}
      />
    );

    // Wait for sports to load
    await waitFor(() => {
      expect(screen.getByText('Add')).toBeInTheDocument();
    });

    // Click Add button
    fireEvent.click(screen.getByText('Add'));

    // Select Volleyball
    await waitFor(() => {
      expect(screen.getByText('Volleyball')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Volleyball'));

    // Select Beginner skill
    await waitFor(() => {
      expect(screen.getByText('Beginner')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Beginner'));

    // Verify onChange was called with the new sport/skill
    expect(mockOnChange).toHaveBeenCalledWith([
      {
        sport_id: 1,
        skill_id: 1,
        sport_name: 'Volleyball',
        skill_name: 'Beginner'
      }
    ]);
  });

  it('should edit an existing sport and skill', async () => {
    const initialValue = [
      {
        sport_id: 1,
        skill_id: 1,
        sport_name: 'Volleyball',
        skill_name: 'Beginner'
      }
    ];

    render(
      <SportsSkillsSelector
        value={initialValue}
        onChange={mockOnChange}
        onSave={mockOnSave}
      />
    );

    // Wait for the sport/skill to render
    await waitFor(() => {
      expect(screen.getByText('Volleyball')).toBeInTheDocument();
      expect(screen.getByText('Beginner')).toBeInTheDocument();
    });

    // Hover to show edit button and click it
    const sportSkillElement = screen.getByText('Volleyball').closest('.group');
    fireEvent.mouseOver(sportSkillElement!);
    
    const editButton = sportSkillElement!.querySelector('button[title="Edit"]');
    expect(editButton).toBeInTheDocument();
    fireEvent.click(editButton!);

    // Should show "Edit Sport & Skill Level" title
    await waitFor(() => {
      expect(screen.getByText('Edit Sport & Skill Level')).toBeInTheDocument();
    });

    // Select Intermediate skill
    fireEvent.click(screen.getByText('Intermediate'));

    // Verify onChange was called with updated skill
    expect(mockOnChange).toHaveBeenLastCalledWith([
      {
        sport_id: 1,
        skill_id: 2,
        sport_name: 'Volleyball',
        skill_name: 'Intermediate'
      }
    ]);
  });

  it('should remove a sport and skill', async () => {
    const initialValue = [
      {
        sport_id: 1,
        skill_id: 1,
        sport_name: 'Volleyball',
        skill_name: 'Beginner'
      }
    ];

    render(
      <SportsSkillsSelector
        value={initialValue}
        onChange={mockOnChange}
        onSave={mockOnSave}
      />
    );

    // Wait for the sport/skill to render
    await waitFor(() => {
      expect(screen.getByText('Volleyball')).toBeInTheDocument();
    });

    // Hover to show remove button and click it
    const sportSkillElement = screen.getByText('Volleyball').closest('.group');
    fireEvent.mouseOver(sportSkillElement!);
    
    const removeButton = sportSkillElement!.querySelector('button[title="Remove"]');
    expect(removeButton).toBeInTheDocument();
    fireEvent.click(removeButton!);

    // Verify onChange was called with empty array
    expect(mockOnChange).toHaveBeenCalledWith([]);
  });

  it('should show save button when there are unsaved changes', async () => {
    render(
      <SportsSkillsSelector
        value={[]}
        onChange={mockOnChange}
        onSave={mockOnSave}
        showTitle={true}
      />
    );

    // Initially no save button
    expect(screen.queryByText('Save Changes')).not.toBeInTheDocument();

    // Add a sport/skill
    await waitFor(() => {
      expect(screen.getByText('Add')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Add'));
    
    await waitFor(() => {
      expect(screen.getByText('Volleyball')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Volleyball'));
    
    await waitFor(() => {
      expect(screen.getByText('Beginner')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Beginner'));

    // Save button should appear
    await waitFor(() => {
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });
  });

  it('should save changes when save button is clicked', async () => {
    mockOnSave.mockResolvedValue(true);

    render(
      <SportsSkillsSelector
        value={[]}
        onChange={mockOnChange}
        onSave={mockOnSave}
        showTitle={true}
      />
    );

    // Add a sport/skill
    await waitFor(() => {
      expect(screen.getByText('Add')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Add'));
    
    fireEvent.click(screen.getByText('Volleyball'));
    fireEvent.click(screen.getByText('Beginner'));

    // Click save
    await waitFor(() => {
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Save Changes'));

    // Verify onSave was called
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
    });
  });

  it('should cancel changes when cancel button is clicked', async () => {
    const initialValue = [
      {
        sport_id: 1,
        skill_id: 1,
        sport_name: 'Volleyball',
        skill_name: 'Beginner'
      }
    ];

    render(
      <SportsSkillsSelector
        value={initialValue}
        onChange={mockOnChange}
        onSave={mockOnSave}
        showTitle={true}
      />
    );

    // Remove the sport/skill
    await waitFor(() => {
      expect(screen.getByText('Volleyball')).toBeInTheDocument();
    });

    const sportSkillElement = screen.getByText('Volleyball').closest('.group');
    fireEvent.mouseOver(sportSkillElement!);
    
    const removeButton = sportSkillElement!.querySelector('button[title="Remove"]');
    fireEvent.click(removeButton!);

    // Cancel button should appear
    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    // Click cancel
    fireEvent.click(screen.getByText('Cancel'));

    // Verify onChange was called to restore original value
    expect(mockOnChange).toHaveBeenLastCalledWith(initialValue);
  });
});