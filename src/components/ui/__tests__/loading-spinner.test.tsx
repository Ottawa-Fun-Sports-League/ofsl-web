import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LoadingSpinner } from '../loading-spinner';

describe('LoadingSpinner', () => {
  it('should render with default size', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByRole('status', { hidden: true }).firstChild;
    expect(spinner).toHaveClass('h-8 w-8');
  });

  it('should render with small size', () => {
    render(<LoadingSpinner size="sm" />);
    const spinner = screen.getByRole('status', { hidden: true }).firstChild;
    expect(spinner).toHaveClass('h-6 w-6');
  });

  it('should render with large size', () => {
    render(<LoadingSpinner size="lg" />);
    const spinner = screen.getByRole('status', { hidden: true }).firstChild;
    expect(spinner).toHaveClass('h-12 w-12');
  });

  it('should center properly with min-height', () => {
    render(<LoadingSpinner />);
    const container = screen.getByRole('status', { hidden: true });
    expect(container).toHaveClass('flex items-center justify-center min-h-[200px] w-full');
  });

  it('should render fullscreen when specified', () => {
    render(<LoadingSpinner fullScreen />);
    const container = screen.getByRole('status', { hidden: true });
    expect(container).toHaveClass('fixed inset-0 flex items-center justify-center');
  });

  it('should apply custom className', () => {
    render(<LoadingSpinner className="custom-class" />);
    const spinner = screen.getByRole('status', { hidden: true }).firstChild;
    expect(spinner).toHaveClass('custom-class');
  });
});