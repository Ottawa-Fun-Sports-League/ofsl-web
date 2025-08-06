import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SportsSkillsSelector } from './SportsSkillsSelector';
import { supabase } from '../lib/supabase';

// Mock supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock logger
vi.mock('../lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('SportsSkillsSelector', () => {
  const mockSports = [
    { id: 1, name: 'Volleyball' },
    { id: 2, name: 'Badminton' },
  ];

  const mockSkills = [
    { id: 1, name: 'Beginner', description: 'New to the sport', order_index: 1 },
    { id: 2, name: 'Intermediate', description: 'Some experience', order_index: 2 },
    { id: 3, name: 'Advanced', description: 'Experienced player', order_index: 3 },
  ];

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Setup default successful responses
    const fromMock = vi.fn((table) => {
      if (table === 'sports') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: mockSports,
            error: null,
          }),
        };
      }
      if (table === 'skills') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: mockSkills,
            error: null,
          }),
        };
      }
      return {};
    });

    (supabase.from as any).mockImplementation(fromMock);
  });

  it('should allow adding multiple sports without saving', async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <SportsSkillsSelector
        value={[]}
        onChange={onChange}
        showTitle={false}
      />
    );

    // Wait for sports and skills to load
    await waitFor(() => {
      expect(screen.getByText('Sports & Skill Levels *')).toBeInTheDocument();
    });

    // Click Add button to open the interface (get the first one in the header)
    const addButtons = screen.getAllByRole('button', { name: /add/i });
    fireEvent.click(addButtons[0]);

    // Select first sport (Volleyball)
    await waitFor(() => {
      expect(screen.getByText('Volleyball')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Volleyball'));

    // Select skill level (Intermediate)
    await waitFor(() => {
      expect(screen.getByText('Intermediate')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Intermediate'));

    // Verify onChange was called with the first sport
    expect(onChange).toHaveBeenCalledWith([
      {
        sport_id: 1,
        skill_id: 2,
        sport_name: 'Volleyball',
        skill_name: 'Intermediate',
      },
    ]);

    // Rerender with the new value
    rerender(
      <SportsSkillsSelector
        value={[
          {
            sport_id: 1,
            skill_id: 2,
            sport_name: 'Volleyball',
            skill_name: 'Intermediate',
          },
        ]}
        onChange={onChange}
        showTitle={false}
      />
    );

    // The Add button should still be visible for adding more sports
    await waitFor(() => {
      const addButtons = screen.getAllByRole('button', { name: /add/i });
      expect(addButtons.length).toBeGreaterThan(0);
    });

    // Click Add button again to add second sport (get the first one in the header)
    const addButtons2 = screen.getAllByRole('button', { name: /add/i });
    fireEvent.click(addButtons2[0]);

    // Select second sport (Badminton)
    await waitFor(() => {
      expect(screen.getByText('Badminton')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Badminton'));

    // Select skill level (Advanced)
    await waitFor(() => {
      expect(screen.getByText('Advanced')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Advanced'));

    // Verify onChange was called with both sports
    expect(onChange).toHaveBeenCalledWith([
      {
        sport_id: 1,
        skill_id: 2,
        sport_name: 'Volleyball',
        skill_name: 'Intermediate',
      },
      {
        sport_id: 2,
        skill_id: 3,
        sport_name: 'Badminton',
        skill_name: 'Advanced',
      },
    ]);
  });

  it('should show Add button when no sports are selected', async () => {
    render(
      <SportsSkillsSelector
        value={[]}
        onChange={vi.fn()}
        showTitle={false}
      />
    );

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Sports & Skill Levels *')).toBeInTheDocument();
    });

    // Add buttons should be visible (there are two - one in header, one in empty state)
    const addButtons = screen.getAllByRole('button', { name: /add/i });
    expect(addButtons.length).toBeGreaterThan(0);
  });

  it('should show Add button even when sports are already selected', async () => {
    render(
      <SportsSkillsSelector
        value={[
          {
            sport_id: 1,
            skill_id: 1,
            sport_name: 'Volleyball',
            skill_name: 'Beginner',
          },
        ]}
        onChange={vi.fn()}
        showTitle={false}
      />
    );

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Sports & Skill Levels *')).toBeInTheDocument();
    });

    // Add button should still be visible
    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument();
  });

  it('should hide Add button when all available sports are selected', async () => {
    render(
      <SportsSkillsSelector
        value={[
          {
            sport_id: 1,
            skill_id: 1,
            sport_name: 'Volleyball',
            skill_name: 'Beginner',
          },
          {
            sport_id: 2,
            skill_id: 2,
            sport_name: 'Badminton',
            skill_name: 'Intermediate',
          },
        ]}
        onChange={vi.fn()}
        showTitle={false}
      />
    );

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Sports & Skill Levels *')).toBeInTheDocument();
    });

    // Add button should not be visible when all sports are selected
    expect(screen.queryByRole('button', { name: /add/i })).not.toBeInTheDocument();
  });
});