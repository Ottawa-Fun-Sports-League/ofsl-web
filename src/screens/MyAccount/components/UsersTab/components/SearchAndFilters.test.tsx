import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchAndFilters } from './SearchAndFilters';
import { INITIAL_FILTERS } from '../constants';

describe('SearchAndFilters - Sport Filters', () => {
  const defaultProps = {
    searchTerm: '',
    filters: INITIAL_FILTERS,
    isAnyFilterActive: false,
    onSearchChange: vi.fn(),
    onFilterChange: vi.fn(),
    onClearFilters: vi.fn()
  };

  it('should render all sport filter checkboxes', () => {
    render(<SearchAndFilters {...defaultProps} />);
    
    // Check for sport filter labels
    expect(screen.getByLabelText('Volleyball (In League)')).toBeInTheDocument();
    expect(screen.getByLabelText('Volleyball (All)')).toBeInTheDocument();
    expect(screen.getByLabelText('Badminton (All)')).toBeInTheDocument();
    expect(screen.getByLabelText('Not in League')).toBeInTheDocument();
  });

  it('should call onFilterChange when volleyball in league filter is clicked', () => {
    const onFilterChange = vi.fn();
    render(<SearchAndFilters {...defaultProps} onFilterChange={onFilterChange} />);
    
    const volleyballInLeagueCheckbox = screen.getByLabelText('Volleyball (In League)');
    fireEvent.click(volleyballInLeagueCheckbox);
    
    expect(onFilterChange).toHaveBeenCalledWith('volleyballPlayersInLeague');
  });

  it('should call onFilterChange when volleyball all filter is clicked', () => {
    const onFilterChange = vi.fn();
    render(<SearchAndFilters {...defaultProps} onFilterChange={onFilterChange} />);
    
    const volleyballAllCheckbox = screen.getByLabelText('Volleyball (All)');
    fireEvent.click(volleyballAllCheckbox);
    
    expect(onFilterChange).toHaveBeenCalledWith('volleyballPlayersAll');
  });

  it('should call onFilterChange when badminton all filter is clicked', () => {
    const onFilterChange = vi.fn();
    render(<SearchAndFilters {...defaultProps} onFilterChange={onFilterChange} />);
    
    const badmintonAllCheckbox = screen.getByLabelText('Badminton (All)');
    fireEvent.click(badmintonAllCheckbox);
    
    expect(onFilterChange).toHaveBeenCalledWith('badmintonPlayersAll');
  });

  it('should call onFilterChange when not in league filter is clicked', () => {
    const onFilterChange = vi.fn();
    render(<SearchAndFilters {...defaultProps} onFilterChange={onFilterChange} />);
    
    const notInLeagueCheckbox = screen.getByLabelText('Not in League');
    fireEvent.click(notInLeagueCheckbox);
    
    expect(onFilterChange).toHaveBeenCalledWith('playersNotInLeague');
  });

  it('should show checked state for active sport filters', () => {
    const activeFilters = {
      ...INITIAL_FILTERS,
      volleyballPlayersInLeague: true,
      badmintonPlayersAll: true
    };
    
    render(<SearchAndFilters {...defaultProps} filters={activeFilters} />);
    
    const volleyballInLeagueCheckbox = screen.getByLabelText('Volleyball (In League)') as HTMLInputElement;
    const badmintonAllCheckbox = screen.getByLabelText('Badminton (All)') as HTMLInputElement;
    const volleyballAllCheckbox = screen.getByLabelText('Volleyball (All)') as HTMLInputElement;
    
    expect(volleyballInLeagueCheckbox.checked).toBe(true);
    expect(badmintonAllCheckbox.checked).toBe(true);
    expect(volleyballAllCheckbox.checked).toBe(false);
  });

  it('should show clear filters button when sport filters are active', () => {
    render(<SearchAndFilters {...defaultProps} isAnyFilterActive={true} />);
    
    const clearButtons = screen.getAllByText('Clear all filters');
    expect(clearButtons.length).toBeGreaterThan(0);
  });

  it('should call onClearFilters when clear button is clicked', () => {
    const onClearFilters = vi.fn();
    render(
      <SearchAndFilters 
        {...defaultProps} 
        isAnyFilterActive={true}
        onClearFilters={onClearFilters}
      />
    );
    
    const clearButtons = screen.getAllByText('Clear all filters');
    fireEvent.click(clearButtons[0]); // Click the first clear button
    
    expect(onClearFilters).toHaveBeenCalled();
  });

  it('should maintain existing role filters alongside sport filters', () => {
    render(<SearchAndFilters {...defaultProps} />);
    
    // Check that role filters still exist
    expect(screen.getByLabelText('Administrator')).toBeInTheDocument();
    expect(screen.getByLabelText('Facilitator')).toBeInTheDocument();
    expect(screen.getByLabelText('Active Player')).toBeInTheDocument();
    
    // Check that sport filters also exist
    expect(screen.getByLabelText('Volleyball (In League)')).toBeInTheDocument();
    expect(screen.getByLabelText('Badminton (All)')).toBeInTheDocument();
  });
});