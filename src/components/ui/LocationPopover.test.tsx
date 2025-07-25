import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { LocationPopover } from './LocationPopover';

describe('LocationPopover', () => {
  it('should not render popover when there are no locations', () => {
    render(
      <LocationPopover locations={[]}>
        <span>Multiple Locations</span>
      </LocationPopover>
    );

    expect(screen.getByText('Multiple Locations')).toBeInTheDocument();
    expect(screen.queryByText('League Gyms:')).not.toBeInTheDocument();
  });

  it('should show popover on hover', async () => {
    const user = userEvent.setup();
    const locations = ['Gym A', 'Gym B', 'Gym C'];

    render(
      <LocationPopover locations={locations}>
        <span>Multiple Locations</span>
      </LocationPopover>
    );

    const trigger = screen.getByText('Multiple Locations');
    
    // Initially popover should not be visible
    expect(screen.queryByText('League Gyms:')).not.toBeInTheDocument();

    // Hover over the trigger
    await user.hover(trigger);

    // Popover should appear
    await waitFor(() => {
      expect(screen.getByText('League Gyms:')).toBeInTheDocument();
      expect(screen.getByText('Gym A')).toBeInTheDocument();
      expect(screen.getByText('Gym B')).toBeInTheDocument();
      expect(screen.getByText('Gym C')).toBeInTheDocument();
    });
  });

  it('should hide popover when mouse leaves', async () => {
    const user = userEvent.setup();
    const locations = ['Gym A', 'Gym B'];

    render(
      <LocationPopover locations={locations}>
        <span>Multiple Locations</span>
      </LocationPopover>
    );

    const trigger = screen.getByText('Multiple Locations');
    
    // Hover to show popover
    await user.hover(trigger);
    await waitFor(() => {
      expect(screen.getByText('League Gyms:')).toBeInTheDocument();
    });

    // Move mouse away
    await user.unhover(trigger);

    // Popover should disappear after a delay
    await waitFor(() => {
      expect(screen.queryByText('League Gyms:')).not.toBeInTheDocument();
    }, { timeout: 200 });
  });

  it('should keep popover open when hovering over it', async () => {
    const user = userEvent.setup();
    const locations = ['Gym A', 'Gym B'];

    render(
      <LocationPopover locations={locations}>
        <span>Multiple Locations</span>
      </LocationPopover>
    );

    const trigger = screen.getByText('Multiple Locations');
    
    // Hover to show popover
    await user.hover(trigger);
    await waitFor(() => {
      expect(screen.getByText('League Gyms:')).toBeInTheDocument();
    });

    // Move to the popover
    const popoverTitle = screen.getByText('League Gyms:');
    await user.hover(popoverTitle);

    // Popover should stay open
    await waitFor(() => {
      expect(screen.getByText('League Gyms:')).toBeInTheDocument();
    }, { timeout: 200 });
  });

  it('should render with custom className', () => {
    render(
      <LocationPopover locations={['Gym A']} className="custom-class">
        <span>Locations</span>
      </LocationPopover>
    );

    const wrapper = screen.getByText('Locations').parentElement?.parentElement;
    expect(wrapper).toHaveClass('inline-block', 'custom-class');
  });
});