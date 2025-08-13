/**
 * Format a date string to a consistent local date format
 * Handles timezone issues by ensuring dates are interpreted as local time
 * @param dateStr - The date string to format (YYYY-MM-DD format expected)
 * @param options - Intl.DateTimeFormatOptions for formatting
 * @returns Formatted date string
 */
export function formatLocalDate(
  dateStr: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }
): string {
  if (!dateStr) return '';
  
  // Parse the date as local time by appending T00:00:00
  // This prevents timezone shifts when the date is interpreted
  const date = new Date(dateStr + 'T00:00:00');
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    return '';
  }
  
  return date.toLocaleDateString('en-US', options);
}

/**
 * Format a date for display in forms (YYYY-MM-DD format)
 * @param date - The date to format
 * @returns Date string in YYYY-MM-DD format
 */
export function formatDateForInput(date: Date | string | null | undefined): string {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date;
  
  if (isNaN(d.getTime())) {
    return '';
  }
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Parse a date string safely without timezone issues
 * @param dateStr - The date string to parse
 * @returns Date object or null if invalid
 */
export function parseLocalDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  
  // Ensure we parse as local time
  const date = new Date(dateStr + 'T00:00:00');
  
  if (isNaN(date.getTime())) {
    return null;
  }
  
  return date;
}