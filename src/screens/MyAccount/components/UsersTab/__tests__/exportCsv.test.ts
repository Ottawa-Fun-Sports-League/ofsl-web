import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportUsersToCSV, generateExportFilename } from '../utils/exportCsv';
import { User } from '../types';

// Mock DOM methods
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

describe('CSV Export Functionality', () => {
  let mockCreateElement: ReturnType<typeof vi.fn>;
  let mockAppendChild: ReturnType<typeof vi.fn>;
  let mockRemoveChild: ReturnType<typeof vi.fn>;
  let mockClick: ReturnType<typeof vi.fn>;
  let mockLink: HTMLAnchorElement;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Setup DOM mocks
    mockClick = vi.fn();
    mockLink = {
      setAttribute: vi.fn(),
      click: mockClick,
      style: { visibility: '' }
    } as unknown as HTMLAnchorElement;
    
    mockCreateElement = vi.fn(() => mockLink);
    mockAppendChild = vi.fn();
    mockRemoveChild = vi.fn();
    
    document.createElement = mockCreateElement;
    document.body.appendChild = mockAppendChild;
    document.body.removeChild = mockRemoveChild;
  });

  it('should export users data to CSV with selected columns', () => {
    const users: User[] = [
      {
        id: '1',
        profile_id: '1',
        auth_id: 'auth-1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '123-456-7890',
        preferred_position: null,
        is_admin: true,
        is_facilitator: false,
        date_created: '2024-01-01T10:00:00Z',
        date_modified: '2024-01-01T10:00:00Z',
        team_ids: null,
        league_ids: null,
        user_sports_skills: null,
        status: 'active',
        confirmed_at: '2024-01-01T10:00:00Z',
        last_sign_in_at: '2024-01-15T14:30:00Z',
        current_registrations: [
          {
            team_id: 1,
            team_name: 'Team A',
            league_id: 1,
            league_name: 'Winter League',
            sport_id: 1,
            sport_name: 'Volleyball'
          }
        ],
        total_owed: 250,
        total_paid: 100
      },
      {
        id: '2',
        profile_id: '2',
        auth_id: 'auth-2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '098-765-4321',
        preferred_position: null,
        is_admin: false,
        is_facilitator: true,
        date_created: '2024-01-02T09:00:00Z',
        date_modified: '2024-01-02T09:00:00Z',
        team_ids: null,
        league_ids: null,
        user_sports_skills: null,
        status: 'pending',
        confirmed_at: null,
        last_sign_in_at: null,
        current_registrations: null,
        total_owed: 0,
        total_paid: 0
      }
    ];

    // Select all columns for export
    const selectedColumns = ['name', 'email', 'phone', 'status', 'admin', 'facilitator', 'registrations', 'sports', 'total_owed', 'total_paid', 'balance_due', 'date_created', 'last_sign_in'];
    exportUsersToCSV(users, selectedColumns, 'test.csv');

    // Check that the link was created and clicked
    expect(mockCreateElement).toHaveBeenCalledWith('a');
    expect(mockLink.setAttribute).toHaveBeenCalledWith('download', 'test.csv');
    expect(mockClick).toHaveBeenCalled();
    
    // Check blob creation
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('should handle special characters in CSV data', () => {
    const users: User[] = [
      {
        id: '1',
        profile_id: '1',
        auth_id: 'auth-1',
        name: 'John "Johnny" Doe',
        email: 'john,doe@example.com',
        phone: '123-456-7890',
        preferred_position: null,
        is_admin: false,
        is_facilitator: false,
        date_created: '2024-01-01T10:00:00Z',
        date_modified: '2024-01-01T10:00:00Z',
        team_ids: null,
        league_ids: null,
        user_sports_skills: null,
        status: 'active',
        confirmed_at: null,
        last_sign_in_at: null,
        current_registrations: null,
        total_owed: 100.50,
        total_paid: 50.25
      }
    ];

    // Select all columns for export
    const selectedColumns = ['name', 'email', 'phone', 'status', 'admin', 'facilitator', 'registrations', 'sports', 'total_owed', 'total_paid', 'balance_due', 'date_created', 'last_sign_in'];
    exportUsersToCSV(users, selectedColumns, 'test-special-chars.csv');

    // Verify the function completed without errors
    expect(mockCreateElement).toHaveBeenCalled();
    expect(mockClick).toHaveBeenCalled();
  });

  it('should generate filename with current timestamp', () => {
    const mockDate = new Date('2024-03-15T14:30:00');
    vi.spyOn(global, 'Date').mockImplementation(() => mockDate as unknown as Date);

    const filename = generateExportFilename();
    
    expect(filename).toBe('ofsl_users_export_20240315_1430.csv');
  });

  it('should handle users with multiple sports registrations', () => {
    const users: User[] = [
      {
        id: '1',
        profile_id: '1',
        auth_id: 'auth-1',
        name: 'Multi Sport User',
        email: 'multi@example.com',
        phone: '555-555-5555',
        preferred_position: null,
        is_admin: false,
        is_facilitator: false,
        date_created: '2024-01-01T10:00:00Z',
        date_modified: '2024-01-01T10:00:00Z',
        team_ids: null,
        league_ids: null,
        user_sports_skills: null,
        status: 'active',
        confirmed_at: '2024-01-01T10:00:00Z',
        last_sign_in_at: '2024-01-15T14:30:00Z',
        current_registrations: [
          {
            team_id: 1,
            team_name: 'Team A',
            league_id: 1,
            league_name: 'Winter Volleyball',
            sport_id: 1,
            sport_name: 'Volleyball'
          },
          {
            team_id: 0,
            team_name: 'Individual Registration',
            league_id: 2,
            league_name: 'Badminton Drop-in',
            sport_id: 2,
            sport_name: 'Badminton'
          }
        ],
        total_owed: 400,
        total_paid: 400
      }
    ];

    // Select all columns for export
    const selectedColumns = ['name', 'email', 'phone', 'status', 'admin', 'facilitator', 'registrations', 'sports', 'total_owed', 'total_paid', 'balance_due', 'date_created', 'last_sign_in'];
    exportUsersToCSV(users, selectedColumns, 'multi-sport.csv');

    // Check that export was successful
    expect(mockCreateElement).toHaveBeenCalled();
    expect(mockClick).toHaveBeenCalled();
  });

  it('should handle empty user list', () => {
    const users: User[] = [];

    // Select all columns for export
    const selectedColumns = ['name', 'email', 'phone', 'status', 'admin', 'facilitator', 'registrations', 'sports', 'total_owed', 'total_paid', 'balance_due', 'date_created', 'last_sign_in'];
    exportUsersToCSV(users, selectedColumns, 'empty.csv');

    // Should still create a CSV with headers only
    expect(mockCreateElement).toHaveBeenCalled();
    expect(mockClick).toHaveBeenCalled();
  });
});