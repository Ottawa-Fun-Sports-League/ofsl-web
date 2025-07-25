import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LeagueGyms } from './LeagueGyms';

// Mock the GymMapWebComponent component
vi.mock('./GymMapWebComponent', () => ({
  GymMapWebComponent: () => null
}));

describe('LeagueGyms', () => {
  const mockGyms = [
    {
      id: 1,
      gym: 'Test Gym 1',
      address: '123 Main St, City, State',
      locations: ['Downtown', 'Central']
    },
    {
      id: 2,
      gym: 'Test Gym 2',
      address: '456 Oak Ave, City, State',
      locations: ['West End']
    }
  ];

  const mockGymDetails = [
    {
      id: 1,
      gym: 'Test Gym 1',
      address: '123 Main St, City, State',
      instructions: 'Enter through the main entrance and check in at the front desk',
      locations: ['Downtown', 'Central']
    },
    {
      id: 2,
      gym: 'Test Gym 2',
      address: '456 Oak Ave, City, State',
      instructions: null,
      locations: ['West End']
    }
  ];

  it('should render empty state when no gyms are provided', () => {
    render(<LeagueGyms gyms={[]} />);
    
    expect(screen.getByText('No Gyms Available')).toBeInTheDocument();
    expect(screen.getByText('No gym locations have been assigned to this league yet.')).toBeInTheDocument();
  });

  it('should render gym cards with basic info', () => {
    render(<LeagueGyms gyms={mockGyms} />);
    
    expect(screen.getByText('Test Gym 1')).toBeInTheDocument();
    expect(screen.getByText('Test Gym 2')).toBeInTheDocument();
    expect(screen.getByText('123 Main St, City, State')).toBeInTheDocument();
    expect(screen.getByText('456 Oak Ave, City, State')).toBeInTheDocument();
  });

  it('should render location chips', () => {
    render(<LeagueGyms gyms={mockGyms} />);
    
    expect(screen.getByText('Downtown')).toBeInTheDocument();
    expect(screen.getByText('Central')).toBeInTheDocument();
    expect(screen.getByText('West End')).toBeInTheDocument();
  });

  it('should render Google Maps links', () => {
    render(<LeagueGyms gyms={mockGyms} />);
    
    const mapLinks = screen.getAllByText('View on Google Maps');
    expect(mapLinks).toHaveLength(2);
    expect(mapLinks[0].closest('a')).toHaveAttribute('href', expect.stringContaining('123%20Main%20St'));
    expect(mapLinks[0].closest('a')).toHaveAttribute('target', '_blank');
  });

  it('should render access instructions when gym details are provided', () => {
    render(<LeagueGyms gyms={mockGyms} gymDetails={mockGymDetails} />);
    
    expect(screen.getByText('Access Instructions')).toBeInTheDocument();
    expect(screen.getByText('Enter through the main entrance and check in at the front desk')).toBeInTheDocument();
  });

  it('should not render access instructions when not available', () => {
    render(<LeagueGyms gyms={mockGyms} gymDetails={mockGymDetails} />);
    
    // Should only have one Access Instructions section (for gym 1)
    expect(screen.getAllByText('Access Instructions')).toHaveLength(1);
  });
});