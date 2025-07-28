import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ViewToggle } from './ViewToggle';

describe('ViewToggle', () => {
  const mockOnViewChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders both card and list buttons', () => {
    render(
      <ViewToggle view="card" onViewChange={mockOnViewChange} />
    );

    expect(screen.getByText('Card')).toBeInTheDocument();
    expect(screen.getByText('List')).toBeInTheDocument();
  });

  it('highlights the active view', () => {
    const { rerender } = render(
      <ViewToggle view="card" onViewChange={mockOnViewChange} />
    );

    // Check card view is active
    const cardButton = screen.getByText('Card').closest('button');
    const listButton = screen.getByText('List').closest('button');
    
    expect(cardButton).toHaveClass('bg-white shadow-sm');
    expect(listButton).not.toHaveClass('bg-white shadow-sm');

    // Rerender with list view active
    rerender(<ViewToggle view="list" onViewChange={mockOnViewChange} />);
    
    expect(cardButton).not.toHaveClass('bg-white shadow-sm');
    expect(listButton).toHaveClass('bg-white shadow-sm');
  });

  it('calls onViewChange when clicking buttons', () => {
    render(
      <ViewToggle view="card" onViewChange={mockOnViewChange} />
    );

    // Click list button
    fireEvent.click(screen.getByText('List'));
    expect(mockOnViewChange).toHaveBeenCalledWith('list');

    // Click card button
    fireEvent.click(screen.getByText('Card'));
    expect(mockOnViewChange).toHaveBeenCalledWith('card');
  });

  it('renders icons for each view', () => {
    render(
      <ViewToggle view="card" onViewChange={mockOnViewChange} />
    );

    // Check for icons
    expect(screen.getByText('Card').closest('button')?.querySelector('.lucide-layout-grid')).toBeInTheDocument();
    expect(screen.getByText('List').closest('button')?.querySelector('.lucide-list')).toBeInTheDocument();
  });
});