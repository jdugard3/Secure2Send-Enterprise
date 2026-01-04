/**
 * Form Utility Functions
 * Shared helpers for form validation and data handling
 */

/**
 * Check if a form field value is empty or invalid
 * 
 * @param value - The field value to check
 * @returns true if the value should be considered empty/invalid
 * 
 * Note: Masked values (like ****1916 for SSN) are considered COMPLETE
 * because they represent existing protected data.
 */
export function isEmpty(value: any): boolean {
  // Null or undefined
  if (value === null || value === undefined) return true;
  
  // String values
  if (typeof value === 'string') {
    const trimmed = value.trim();
    
    // Empty string or placeholder values
    if (trimmed === '' || trimmed === '[EMPTY]' || trimmed === 'N/A') return true;
    
    // Masked values (like ****1916 or ********) are considered COMPLETE
    // because they represent existing protected data
    // Only reject if it's a few stars with no actual content (likely a placeholder)
    if (trimmed.match(/^\*{1,4}$/) && trimmed.length <= 4) return true;
    
    return false;
  }
  
  // Numeric values
  if (typeof value === 'number') return value === 0;
  
  // Arrays
  if (Array.isArray(value)) return value.length === 0;
  
  // Objects
  if (typeof value === 'object') return Object.keys(value).length === 0;
  
  // Fallback
  return !value;
}

/**
 * Format a Social Security Number with dashes
 * 
 * @param value - SSN string (may include dashes or be plain digits)
 * @returns Formatted SSN (e.g., "123-45-6789") or original value if invalid
 * 
 * Examples:
 * - "123456789" -> "123-45-6789"
 * - "123-45-6789" -> "123-45-6789"
 * - "****6789" -> "****6789" (masked values preserved)
 */
export function formatSSN(value: string | null | undefined): string {
  if (!value) return '';
  
  const strValue = String(value).trim();
  
  // If already contains dashes or is masked, return as-is
  if (strValue.includes('-') || strValue.includes('*')) return strValue;
  
  // If it's 9 digits, format with dashes
  if (strValue.match(/^\d{9}$/)) {
    return `${strValue.slice(0, 3)}-${strValue.slice(3, 5)}-${strValue.slice(5)}`;
  }
  
  // Return original value if not a standard 9-digit SSN
  return strValue;
}

/**
 * Remove dashes from SSN for storage/submission
 * 
 * @param value - SSN string with or without dashes
 * @returns SSN without dashes (e.g., "123456789")
 */
export function unformatSSN(value: string | null | undefined): string {
  if (!value) return '';
  return String(value).replace(/-/g, '');
}

