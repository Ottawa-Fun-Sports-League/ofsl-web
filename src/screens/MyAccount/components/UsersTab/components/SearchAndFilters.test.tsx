import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchAndFilters } from './SearchAndFilters';
import { INITIAL_FILTERS } from '../constants';

describe('SearchAndFilters', () => {
  const baseProps = {
    searchTerm: '',
    filters: INITIAL_FILTERS,
    isAnyFilterActive: false,
    onSearchChange: vi.fn(),
    onFilterChange: vi.fn(),
    onClearFilters: vi.fn(),
  };

  it('renders search inputs for desktop and mobile layouts', () => {
    render(<SearchAndFilters {...baseProps} />);

    expect(screen.getByPlaceholderText('Search users by name, email, or phone...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search users...')).toBeInTheDocument();
  });

  it('renders role and participation checkboxes', () => {
    render(<SearchAndFilters {...baseProps} />);

    expect(screen.getByLabelText('Administrator')).toBeInTheDocument();
    expect(screen.getByLabelText('Facilitator')).toBeInTheDocument();
    expect(screen.getByLabelText('Active Player')).toBeInTheDocument();
    expect(screen.getByLabelText('Not in League')).toBeInTheDocument();
  });

  it('invokes onFilterChange when any checkbox is toggled', () => {
    const onFilterChange = vi.fn();
    render(<SearchAndFilters {...baseProps} onFilterChange={onFilterChange} />);

    fireEvent.click(screen.getByLabelText('Administrator'));
    fireEvent.click(screen.getByLabelText('Facilitator'));
    fireEvent.click(screen.getByLabelText('Active Player'));
    fireEvent.click(screen.getByLabelText('Not in League'));

    expect(onFilterChange).toHaveBeenNthCalledWith(1, 'administrator');
    expect(onFilterChange).toHaveBeenNthCalledWith(2, 'facilitator');
    expect(onFilterChange).toHaveBeenNthCalledWith(3, 'activePlayer');
    expect(onFilterChange).toHaveBeenNthCalledWith(4, 'playersNotInLeague');
  });

  it('reflects checked state based on active filters', () => {
    const filters = {
      ...INITIAL_FILTERS,
      administrator: true,
      playersNotInLeague: true,
    };

    render(<SearchAndFilters {...baseProps} filters={filters} />);

    expect((screen.getByLabelText('Administrator') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('Not in League') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('Facilitator') as HTMLInputElement).checked).toBe(false);
  });

  it('shows and triggers clear filters when filters are active', () => {
    const onClearFilters = vi.fn();
    render(
      <SearchAndFilters
        {...baseProps}
        isAnyFilterActive
        onClearFilters={onClearFilters}
      />
    );

    const clearButtons = screen.getAllByText('Clear all filters');
    expect(clearButtons.length).toBeGreaterThan(0);
    fireEvent.click(clearButtons[0]);
    expect(onClearFilters).toHaveBeenCalled();
  });

  it('debounces search input by delegating to onSearchChange for each field', () => {
    const onSearchChange = vi.fn();
    render(<SearchAndFilters {...baseProps} onSearchChange={onSearchChange} />);

    const desktopSearch = screen.getByPlaceholderText('Search users by name, email, or phone...');
    fireEvent.change(desktopSearch, { target: { value: 'alice' } });

    const mobileSearch = screen.getByPlaceholderText('Search users...');
    fireEvent.change(mobileSearch, { target: { value: 'bob' } });

    expect(onSearchChange).toHaveBeenNthCalledWith(1, 'alice');
    expect(onSearchChange).toHaveBeenNthCalledWith(2, 'bob');
  });
});
