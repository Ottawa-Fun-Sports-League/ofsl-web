import { User } from '../types';

interface ColumnConfig {
  key: string;
  header: string;
  getValue: (user: User) => string;
}

const COLUMN_CONFIGS: ColumnConfig[] = [
  {
    key: 'name',
    header: 'Name',
    getValue: (user) => user.name || ''
  },
  {
    key: 'email',
    header: 'Email',
    getValue: (user) => user.email || ''
  },
  {
    key: 'phone',
    header: 'Phone',
    getValue: (user) => user.phone || ''
  },
  {
    key: 'status',
    header: 'Status',
    getValue: (user) => user.status || 'active'
  },
  {
    key: 'admin',
    header: 'Admin',
    getValue: (user) => user.is_admin ? 'Yes' : 'No'
  },
  {
    key: 'facilitator',
    header: 'Facilitator',
    getValue: (user) => user.is_facilitator ? 'Yes' : 'No'
  },
  {
    key: 'registrations',
    header: 'Registrations',
    getValue: (user) => (user.current_registrations?.length || 0).toString()
  },
  {
    key: 'sports',
    header: 'Sports',
    getValue: (user) => {
      const sports = new Set<string>();
      user.current_registrations?.forEach(reg => {
        if (reg.sport_name) sports.add(reg.sport_name);
      });
      return Array.from(sports).join('; ');
    }
  },
  {
    key: 'total_owed',
    header: 'Total Owed (incl. 13% tax)',
    getValue: (user) => `$${(user.total_owed || 0).toFixed(2)}`
  },
  {
    key: 'total_paid',
    header: 'Total Paid',
    getValue: (user) => `$${(user.total_paid || 0).toFixed(2)}`
  },
  {
    key: 'balance_due',
    header: 'Balance Due',
    getValue: (user) => {
      const balanceDue = (user.total_owed || 0) - (user.total_paid || 0);
      return `$${balanceDue.toFixed(2)}`;
    }
  },
  {
    key: 'date_created',
    header: 'Date Created',
    getValue: (user) => formatDate(user.date_created)
  },
  {
    key: 'last_sign_in',
    header: 'Last Sign In',
    getValue: (user) => user.last_sign_in_at ? formatDate(user.last_sign_in_at) : ''
  }
];

export function exportUsersToCSV(
  users: User[], 
  selectedColumns: string[], 
  filename: string = 'users_export.csv',
  options?: { registrationCounts?: Record<string, number> }
) {
  // Filter columns based on selection
  const columnsToExport = COLUMN_CONFIGS.filter(col => selectedColumns.includes(col.key));
  
  // Get headers for selected columns
  const headers = columnsToExport.map(col => col.header);

  // Convert users data to CSV rows with only selected columns
  const rows = users.map(user => {
    return columnsToExport.map(col => {
      if (col.key === 'registrations' && options?.registrationCounts) {
        const count = options.registrationCounts[user.id];
        if (typeof count === 'number') return String(count);
      }
      return col.getValue(user);
    });
  });

  // Combine headers and rows
  const csvContent = [
    headers,
    ...rows
  ].map(row => 
    row.map(cell => {
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      const cellStr = String(cell);
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(',')
  ).join('\n');

  // Create and download the file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL
  URL.revokeObjectURL(url);
}

function formatDate(dateString: string): string {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  } catch {
    return '';
  }
}

export function generateExportFilename(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  
  return `ofsl_users_export_${year}${month}${day}_${hours}${minutes}.csv`;
}
