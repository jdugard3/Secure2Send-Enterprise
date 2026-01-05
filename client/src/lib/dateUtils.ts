/**
 * Date Utility Functions
 * Shared helpers for date formatting and handling
 */

/**
 * Convert ISO date string to yyyy-MM-dd format for HTML date inputs
 * 
 * @param isoDate - ISO date string or any date string
 * @returns Formatted date string (yyyy-MM-dd) or empty string if invalid
 * 
 * Examples:
 * - "2024-01-15T12:00:00.000Z" -> "2024-01-15"
 * - "01/15/2024" -> "2024-01-15"
 * - null -> ""
 * - invalid date -> ""
 */
export function formatDateForInput(isoDate: string | null | undefined): string {
  if (!isoDate) return "";
  
  try {
    // Clean the date string
    let cleanDate = String(isoDate).trim();
    
    // Handle dates that might have extra characters before the year
    cleanDate = cleanDate.replace(/^[^\d]*(\d{4})/, '$1');
    
    // Parse the date
    const date = new Date(cleanDate);
    
    // Validate the date
    if (isNaN(date.getTime())) return "";
    
    // Sanity check the year
    const year = date.getFullYear();
    if (year < 1900 || year > 2100) return "";
    
    // Return in yyyy-MM-dd format
    return date.toISOString().split('T')[0];
  } catch {
    return "";
  }
}

/**
 * Format a date for display (e.g., "January 15, 2024")
 * 
 * @param date - Date string or Date object
 * @returns Formatted date string for display
 */
export function formatDateForDisplay(date: string | Date | null | undefined): string {
  if (!date) return "";
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return "";
    
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return "";
  }
}

