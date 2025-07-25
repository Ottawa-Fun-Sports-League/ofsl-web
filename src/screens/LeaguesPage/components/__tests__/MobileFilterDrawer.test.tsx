import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MobileFilterDrawer } from '../MobileFilterDrawer';

describe('MobileFilterDrawer', () => {
  const mockProps = {
    isOpen: true,
    onClose: vi.fn(),
    filters: {
      sport: 'All Sports',
      location: 'All Locations',
      skillLevels: [],
      day: 'All Days',
      type: 'All Types',
      gender: 'All Genders'
    },
    handleFilterChange: vi.fn(),
    clearFilters: vi.fn(),
    sports: [
      { id: 1, name: 'Volleyball' },
      { id: 2, name: 'Badminton' }
    ],
    skills: [
      { id: 1, name: 'Beginner' },
      { id: 2, name: 'Intermediate' },
      { id: 3, name: 'Advanced' }
    ],
    filterOptions: {
      location: ['All Locations', 'Central', 'East', 'West'],
      day: ['All Days', 'Monday', 'Tuesday', 'Wednesday'],
      type: ['All Types', 'League', 'Tournament'],
      gender: ['All Genders', 'Open', 'Mens', 'Womens']
    },
    isAnyFilterActive: vi.fn(() => false),
    clearSkillLevels: vi.fn()
  };

  it('should render skill level checkboxes', () => {
    render(<MobileFilterDrawer {...mockProps} />);
    
    expect(screen.getByText('Skill Level')).toBeInTheDocument();
    expect(screen.getByLabelText('Beginner')).toBeInTheDocument();
    expect(screen.getByLabelText('Intermediate')).toBeInTheDocument();
    expect(screen.getByLabelText('Advanced')).toBeInTheDocument();
  });

  it('should call handleFilterChange with correct parameters when skill level is selected', () => {
    render(<MobileFilterDrawer {...mockProps} />);
    
    const beginnerCheckbox = screen.getByLabelText('Beginner');
    fireEvent.click(beginnerCheckbox);
    
    expect(mockProps.handleFilterChange).toHaveBeenCalledWith('skillLevels', 'Beginner');
  });

  it('should show checked state for selected skill levels', () => {
    const propsWithSelectedSkills = {
      ...mockProps,
      filters: {
        ...mockProps.filters,
        skillLevels: ['Intermediate', 'Advanced']
      }
    };
    
    render(<MobileFilterDrawer {...propsWithSelectedSkills} />);
    
    const beginnerCheckbox = screen.getByLabelText('Beginner') as HTMLInputElement;
    const intermediateCheckbox = screen.getByLabelText('Intermediate') as HTMLInputElement;
    const advancedCheckbox = screen.getByLabelText('Advanced') as HTMLInputElement;
    
    expect(beginnerCheckbox.checked).toBe(false);
    expect(intermediateCheckbox.checked).toBe(true);
    expect(advancedCheckbox.checked).toBe(true);
  });

  it('should call clearSkillLevels when All Skill Levels is clicked', () => {
    render(<MobileFilterDrawer {...mockProps} />);
    
    const allSkillLevelsButton = screen.getByText('All Skill Levels');
    fireEvent.click(allSkillLevelsButton);
    
    expect(mockProps.clearSkillLevels).toHaveBeenCalled();
  });
});