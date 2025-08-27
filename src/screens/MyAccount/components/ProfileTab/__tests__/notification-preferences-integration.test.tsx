import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationPreferences } from '../NotificationPreferences';
import { NotificationPreferences as NotificationPreferencesType } from '../types';

describe('NotificationPreferences Integration', () => {
  const mockNotifications: NotificationPreferencesType = {
    emailNotifications: true,
    gameReminders: false,
    leagueUpdates: true,
    paymentReminders: false,
  };

  const mockOnToggle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all notification preference toggles', () => {
    render(
      <NotificationPreferences
        notifications={mockNotifications}
        onNotificationToggle={mockOnToggle}
      />
    );

    expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
    expect(screen.getByText('Email Notifications')).toBeInTheDocument();
    expect(screen.getByText('Game Reminders')).toBeInTheDocument();
    expect(screen.getByText('League Updates')).toBeInTheDocument();
    expect(screen.getByText('Payment Reminders')).toBeInTheDocument();
  });

  it('should display correct toggle states', () => {
    render(
      <NotificationPreferences
        notifications={mockNotifications}
        onNotificationToggle={mockOnToggle}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    
    expect(checkboxes[0]).toBeChecked(); // emailNotifications: true
    expect(checkboxes[1]).not.toBeChecked(); // gameReminders: false  
    expect(checkboxes[2]).toBeChecked(); // leagueUpdates: true
    expect(checkboxes[3]).not.toBeChecked(); // paymentReminders: false
  });

  it('should call onNotificationToggle when toggle is clicked', async () => {
    render(
      <NotificationPreferences
        notifications={mockNotifications}
        onNotificationToggle={mockOnToggle}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    
    fireEvent.click(checkboxes[0]); // Toggle email notifications
    expect(mockOnToggle).toHaveBeenCalledWith('emailNotifications');

    fireEvent.click(checkboxes[1]); // Toggle game reminders
    expect(mockOnToggle).toHaveBeenCalledWith('gameReminders');

    fireEvent.click(checkboxes[2]); // Toggle league updates
    expect(mockOnToggle).toHaveBeenCalledWith('leagueUpdates');

    fireEvent.click(checkboxes[3]); // Toggle payment reminders
    expect(mockOnToggle).toHaveBeenCalledWith('paymentReminders');

    expect(mockOnToggle).toHaveBeenCalledTimes(4);
  });

  it('should show saving state when saving prop is true', () => {
    render(
      <NotificationPreferences
        notifications={mockNotifications}
        onNotificationToggle={mockOnToggle}
        saving={true}
      />
    );

    expect(screen.getByText('Saving...')).toBeInTheDocument();
    
    // Look for the spinner by its class
    const container = screen.getByText('Saving...').closest('div');
    const spinner = container?.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('animate-spin');
  });

  it('should disable toggles when saving', () => {
    render(
      <NotificationPreferences
        notifications={mockNotifications}
        onNotificationToggle={mockOnToggle}
        saving={true}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    
    checkboxes.forEach(checkbox => {
      expect(checkbox).toBeDisabled();
    });
  });

  it('should not call onNotificationToggle when saving and toggle is clicked', () => {
    render(
      <NotificationPreferences
        notifications={mockNotifications}
        onNotificationToggle={mockOnToggle}
        saving={true}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    
    fireEvent.click(checkboxes[0]);
    
    expect(mockOnToggle).not.toHaveBeenCalled();
  });

  it('should apply correct CSS classes when saving', () => {
    render(
      <NotificationPreferences
        notifications={mockNotifications}
        onNotificationToggle={mockOnToggle}
        saving={true}
      />
    );

    const labels = screen.getAllByText('Email Notifications')[0].closest('div')?.nextElementSibling;
    expect(labels).toHaveClass('cursor-not-allowed');
  });

  it('should apply correct CSS classes when not saving', () => {
    render(
      <NotificationPreferences
        notifications={mockNotifications}
        onNotificationToggle={mockOnToggle}
        saving={false}
      />
    );

    const labels = screen.getAllByText('Email Notifications')[0].closest('div')?.nextElementSibling;
    expect(labels).toHaveClass('cursor-pointer');
  });

  it('should show proper descriptions for each notification type', () => {
    render(
      <NotificationPreferences
        notifications={mockNotifications}
        onNotificationToggle={mockOnToggle}
      />
    );

    expect(screen.getByText('Receive general updates via email')).toBeInTheDocument();
    expect(screen.getByText('Get notified before upcoming games')).toBeInTheDocument();
    expect(screen.getByText('Stay informed about league news and changes')).toBeInTheDocument();
    expect(screen.getByText('Receive reminders for upcoming payments')).toBeInTheDocument();
  });
});