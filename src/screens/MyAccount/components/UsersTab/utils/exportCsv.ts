import { User } from '../types';

export function exportUsersToCSV(users: User[], filename: string = 'users_export.csv') {
  // Define the columns to export
  const headers = [
    'Name',
    'Email',
    'Phone',
    'Status',
    'Admin',
    'Facilitator',
    'Registrations',
    'Sports',
    'Total Owed',
    'Total Paid',
    'Balance Due',
    'Date Created',
    'Last Sign In'
  ];

  // Convert users data to CSV rows
  const rows = users.map(user => {
    // Get sports from registrations
    const sports = new Set<string>();
    user.current_registrations?.forEach(reg => {
      if (reg.sport_name) sports.add(reg.sport_name);
    });
    
    // Get registration count
    const registrationCount = user.current_registrations?.length || 0;
    
    // Calculate balance due
    const balanceDue = (user.total_owed || 0) - (user.total_paid || 0);
    
    return [
      user.name || '',
      user.email || '',
      user.phone || '',
      user.status || 'active',
      user.is_admin ? 'Yes' : 'No',
      user.is_facilitator ? 'Yes' : 'No',
      registrationCount.toString(),
      Array.from(sports).join('; '),
      `$${(user.total_owed || 0).toFixed(2)}`,
      `$${(user.total_paid || 0).toFixed(2)}`,
      `$${balanceDue.toFixed(2)}`,
      formatDate(user.date_created),
      user.last_sign_in_at ? formatDate(user.last_sign_in_at) : ''
    ];
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