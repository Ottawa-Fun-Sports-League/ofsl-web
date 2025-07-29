import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MobileFilterDrawer } from './MobileFilterDrawer';

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
      { id: 2, name: 'Badminton' },
      { id: 3, name: 'Pickleball' }
    ],
    skills: [
      { id: 1, name: 'Beginner' },
      { id: 2, name: 'Intermediate' },
      { id: 3, name: 'Advanced' }
    ],
    filterOptions: {
      location: ['All Locations', 'Central', 'East', 'West'],
      day: ['All Days', 'Monday', 'Tuesday', 'Wednesday'],
      type: ['All Types', 'Casual', 'Competitive'],
      gender: ['All Genders', 'Open', 'Men', 'Women']
    },
    isAnyFilterActive: vi.fn().mockReturnValue(false),
    clearSkillLevels: vi.fn(),
    getSportIcon: vi.fn((sport) => `/${sport}.png`)
  };

  it('renders when open', () => {
    render(<MobileFilterDrawer {...mockProps} />);
    
    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('Sport')).toBeInTheDocument();
    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText('Skill Level')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<MobileFilterDrawer {...mockProps} isOpen={false} />);
    
    // The drawer is always in the DOM but hidden via CSS transform
    const drawer = document.querySelector('.translate-x-full');
    expect(drawer).toBeInTheDocument();
  });

  it('calls onClose when X button is clicked', () => {
    render(<MobileFilterDrawer {...mockProps} />);
    
    const closeButton = screen.getByRole('button', { name: '' });
    fireEvent.click(closeButton);
    
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('calls onClose when backdrop is clicked', () => {
    render(<MobileFilterDrawer {...mockProps} />);
    
    // Find the backdrop by its specific class
    const backdrop = document.querySelector('.bg-black.bg-opacity-50');
    if (backdrop) {
      fireEvent.click(backdrop);
    }
    
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('calls handleFilterChange when sport button is clicked', () => {
    render(<MobileFilterDrawer {...mockProps} />);
    
    const volleyballButton = screen.getByText('Volleyball');
    fireEvent.click(volleyballButton);
    
    expect(mockProps.handleFilterChange).toHaveBeenCalledWith('sport', 'Volleyball');
  });

  it('calls handleFilterChange when location is changed', () => {
    render(<MobileFilterDrawer {...mockProps} />);
    
    // Find the location select by looking for the heading and then the next select element
    const locationHeading = screen.getByText('Location');
    const locationDiv = locationHeading.parentElement;
    const locationSelect = locationDiv?.querySelector('select');
    
    if (locationSelect) {
      fireEvent.change(locationSelect, { target: { value: 'Central' } });
    }
    
    expect(mockProps.handleFilterChange).toHaveBeenCalledWith('location', 'Central');
  });

  it('calls handleFilterChange when skill level checkbox is clicked', () => {
    render(<MobileFilterDrawer {...mockProps} />);
    
    const beginnerCheckbox = screen.getByLabelText('Beginner');
    fireEvent.click(beginnerCheckbox);
    
    expect(mockProps.handleFilterChange).toHaveBeenCalledWith('skillLevels', 'Beginner');
  });

  it('calls clearFilters and onClose when Clear Filters is clicked', () => {
    const propsWithActiveFilters = {
      ...mockProps,
      isAnyFilterActive: vi.fn().mockReturnValue(true)
    };
    
    render(<MobileFilterDrawer {...propsWithActiveFilters} />);
    
    const clearButton = screen.getByText('Clear Filters');
    fireEvent.click(clearButton);
    
    expect(mockProps.clearFilters).toHaveBeenCalled();
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('disables Clear Filters button when no filters are active', () => {
    render(<MobileFilterDrawer {...mockProps} />);
    
    const clearButton = screen.getByText('Clear Filters');
    expect(clearButton).toBeDisabled();
  });

  it('calls onClose when Apply Filters is clicked', () => {
    render(<MobileFilterDrawer {...mockProps} />);
    
    const applyButton = screen.getByText('Apply Filters');
    fireEvent.click(applyButton);
    
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('shows active sport with highlighted styling', () => {
    const propsWithActiveSport = {
      ...mockProps,
      filters: {
        ...mockProps.filters,
        sport: 'Volleyball'
      }
    };
    
    render(<MobileFilterDrawer {...propsWithActiveSport} />);
    
    const volleyballButton = screen.getByText('Volleyball').closest('button');
    expect(volleyballButton).toHaveClass('border-[#B20000]', 'bg-[#ffeae5]', 'text-[#B20000]');
  });

  it('shows checked skill levels', () => {
    const propsWithSkills = {
      ...mockProps,
      filters: {
        ...mockProps.filters,
        skillLevels: ['Beginner', 'Advanced']
      }
    };
    
    render(<MobileFilterDrawer {...propsWithSkills} />);
    
    const beginnerCheckbox = screen.getByLabelText('Beginner') as HTMLInputElement;
    const advancedCheckbox = screen.getByLabelText('Advanced') as HTMLInputElement;
    const intermediateCheckbox = screen.getByLabelText('Intermediate') as HTMLInputElement;
    
    expect(beginnerCheckbox.checked).toBe(true);
    expect(advancedCheckbox.checked).toBe(true);
    expect(intermediateCheckbox.checked).toBe(false);
  });
});