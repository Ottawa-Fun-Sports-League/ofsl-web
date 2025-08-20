import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExportColumnsModal, EXPORT_COLUMNS } from '../ExportColumnsModal';

describe('ExportColumnsModal', () => {
  const mockOnClose = vi.fn();
  const mockOnExport = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render modal with all column options', () => {
    render(
      <ExportColumnsModal
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
        userCount={10}
      />
    );

    // Check title and description
    expect(screen.getByText('Export Users to CSV')).toBeInTheDocument();
    expect(screen.getByText(/Select the columns you want to include/)).toBeInTheDocument();
    expect(screen.getByText(/10 users will be exported/)).toBeInTheDocument();

    // Check all columns are present
    EXPORT_COLUMNS.forEach(column => {
      expect(screen.getByLabelText(column.label)).toBeInTheDocument();
    });

    // Check buttons
    expect(screen.getByText('Select All')).toBeInTheDocument();
    expect(screen.getByText('Deselect All')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText(/Export \(\d+ columns?\)/)).toBeInTheDocument();
  });

  it('should have all columns selected by default', () => {
    render(
      <ExportColumnsModal
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
        userCount={5}
      />
    );

    // Check that all default selected columns are checked
    EXPORT_COLUMNS.forEach(column => {
      const checkbox = screen.getByLabelText(column.label) as HTMLInputElement;
      if (column.defaultSelected) {
        expect(checkbox).toBeChecked();
      }
    });

    // Export button should show count of selected columns
    const defaultSelectedCount = EXPORT_COLUMNS.filter(col => col.defaultSelected).length;
    expect(screen.getByText(`Export (${defaultSelectedCount} columns)`)).toBeInTheDocument();
  });

  it('should toggle column selection when clicked', () => {
    render(
      <ExportColumnsModal
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
        userCount={5}
      />
    );

    const nameCheckbox = screen.getByLabelText('Name') as HTMLInputElement;
    expect(nameCheckbox).toBeChecked();

    // Uncheck the name column
    fireEvent.click(nameCheckbox);
    expect(nameCheckbox).not.toBeChecked();

    // Check it again
    fireEvent.click(nameCheckbox);
    expect(nameCheckbox).toBeChecked();
  });

  it('should select all columns when Select All is clicked', () => {
    render(
      <ExportColumnsModal
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
        userCount={5}
      />
    );

    // First deselect all
    fireEvent.click(screen.getByText('Deselect All'));
    
    EXPORT_COLUMNS.forEach(column => {
      const checkbox = screen.getByLabelText(column.label) as HTMLInputElement;
      expect(checkbox).not.toBeChecked();
    });

    // Then select all
    fireEvent.click(screen.getByText('Select All'));
    
    EXPORT_COLUMNS.forEach(column => {
      const checkbox = screen.getByLabelText(column.label) as HTMLInputElement;
      expect(checkbox).toBeChecked();
    });

    expect(screen.getByText(`Export (${EXPORT_COLUMNS.length} columns)`)).toBeInTheDocument();
  });

  it('should deselect all columns when Deselect All is clicked', () => {
    render(
      <ExportColumnsModal
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
        userCount={5}
      />
    );

    fireEvent.click(screen.getByText('Deselect All'));
    
    EXPORT_COLUMNS.forEach(column => {
      const checkbox = screen.getByLabelText(column.label) as HTMLInputElement;
      expect(checkbox).not.toBeChecked();
    });

    // Export button should be disabled when no columns selected
    const exportButton = screen.getByText('Export (0 columns)');
    expect(exportButton).toBeDisabled();
  });

  it('should call onExport with selected columns when Export is clicked', () => {
    render(
      <ExportColumnsModal
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
        userCount={5}
      />
    );

    // Deselect some columns
    fireEvent.click(screen.getByLabelText('Phone'));
    fireEvent.click(screen.getByLabelText('Admin'));
    fireEvent.click(screen.getByLabelText('Facilitator'));

    // Click export
    const exportButton = screen.getByText(/Export \(\d+ columns?\)/);
    fireEvent.click(exportButton);

    // Should call onExport with selected column keys
    expect(mockOnExport).toHaveBeenCalledWith(
      expect.arrayContaining(['name', 'email', 'status', 'registrations', 'sports'])
    );
    expect(mockOnExport).toHaveBeenCalledWith(
      expect.not.arrayContaining(['phone', 'admin', 'facilitator'])
    );

    // Should also close the modal
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should call onClose when Cancel is clicked', () => {
    render(
      <ExportColumnsModal
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
        userCount={5}
      />
    );

    fireEvent.click(screen.getByText('Cancel'));
    
    expect(mockOnClose).toHaveBeenCalled();
    expect(mockOnExport).not.toHaveBeenCalled();
  });

  it('should handle single user count correctly', () => {
    render(
      <ExportColumnsModal
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
        userCount={1}
      />
    );

    expect(screen.getByText(/1 user will be exported/)).toBeInTheDocument();
  });

  it('should not show user count when it is 0', () => {
    render(
      <ExportColumnsModal
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
        userCount={0}
      />
    );

    expect(screen.queryByText(/will be exported/)).not.toBeInTheDocument();
  });
});