/**
 * Log Sanitization Utility
 * Removes sensitive data from logs to prevent PII exposure
 */

interface SanitizationConfig {
  maskChar?: string;
  showFirst?: number;
  showLast?: number;
}

export class LogSanitizer {
  // Sensitive field patterns
  private static readonly SENSITIVE_FIELDS = [
    'ssn',
    'socialSecurityNumber',
    'taxId',
    'federalTaxIdNumber',
    'bankAccountNumber',
    'accountNumber',
    'ddaNumber',
    'routingNumber',
    'abaRoutingNumber',
    'password',
    'secret',
    'token',
    'apiKey',
    'creditCard',
    'cvv',
    'pin',
    'idNumber',
    'stateIssuedIdNumber',
    'driversLicense',
  ];

  // SSN pattern: XXX-XX-XXXX or XXXXXXXXX
  private static readonly SSN_PATTERN = /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g;
  
  // Credit card pattern
  private static readonly CC_PATTERN = /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g;
  
  // Email pattern (for partial masking)
  private static readonly EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;

  /**
   * Sanitize an object for logging
   */
  static sanitizeObject(obj: any, depth: number = 0, maxDepth: number = 10): any {
    if (depth > maxDepth) return '[Max Depth Reached]';
    if (obj === null || obj === undefined) return obj;
    
    // Handle primitives
    if (typeof obj !== 'object') {
      return this.sanitizeString(String(obj));
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item, depth + 1, maxDepth));
    }

    // Handle objects
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      
      // Check if field name indicates sensitive data
      if (this.SENSITIVE_FIELDS.some(field => lowerKey.includes(field.toLowerCase()))) {
        sanitized[key] = this.maskSensitiveValue(value);
      } else if (typeof value === 'object') {
        sanitized[key] = this.sanitizeObject(value, depth + 1, maxDepth);
      } else if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Sanitize a string (removes patterns like SSN, CC)
   */
  private static sanitizeString(str: string): string {
    if (typeof str !== 'string') return str;

    return str
      // Mask SSNs
      .replace(this.SSN_PATTERN, '***-**-****')
      // Mask credit cards
      .replace(this.CC_PATTERN, '****-****-****-****')
      // Partially mask emails (keep domain for debugging)
      .replace(this.EMAIL_PATTERN, (email) => {
        const [username, domain] = email.split('@');
        const maskedUsername = username.length > 2 
          ? `${username[0]}${'*'.repeat(username.length - 2)}${username[username.length - 1]}`
          : '***';
        return `${maskedUsername}@${domain}`;
      });
  }

  /**
   * Mask a sensitive value
   */
  private static maskSensitiveValue(value: any, config: SanitizationConfig = {}): string {
    if (value === null || value === undefined || value === '') {
      return '[EMPTY]';
    }

    const {
      maskChar = '*',
      showFirst = 0,
      showLast = 0,
    } = config;

    const strValue = String(value);
    
    // If value is very short, completely mask it
    if (strValue.length <= showFirst + showLast) {
      return maskChar.repeat(8);
    }

    // Show first and last characters, mask the middle
    const first = strValue.substring(0, showFirst);
    const last = strValue.substring(strValue.length - showLast);
    const maskedLength = Math.max(8, strValue.length - showFirst - showLast);
    
    return `${first}${maskChar.repeat(maskedLength)}${last}`;
  }

  /**
   * Create a safe log message (for console.log, etc.)
   */
  static createSafeLogMessage(message: string, data?: any): string {
    let logMessage = message;

    if (data) {
      const sanitizedData = this.sanitizeObject(data);
      logMessage += ` ${JSON.stringify(sanitizedData, null, 2)}`;
    }

    return this.sanitizeString(logMessage);
  }

  /**
   * Safe console.log wrapper
   */
  static log(message: string, data?: any): void {
    const safeMessage = this.createSafeLogMessage(message, data);
    console.log(safeMessage);
  }

  /**
   * Safe console.error wrapper
   */
  static error(message: string, error?: any, data?: any): void {
    const safeMessage = this.createSafeLogMessage(message, data);
    console.error(safeMessage);
    
    // Log error separately (but don't include in sanitized message)
    if (error) {
      console.error('Error details:', error instanceof Error ? error.message : error);
    }
  }

  /**
   * Safe console.warn wrapper
   */
  static warn(message: string, data?: any): void {
    const safeMessage = this.createSafeLogMessage(message, data);
    console.warn(safeMessage);
  }

  /**
   * Create audit-safe version of request body
   * Shows structure but masks sensitive values
   */
  static sanitizeRequestBody(body: any): any {
    return this.sanitizeObject(body);
  }

  /**
   * Redact sensitive fields completely (for audit logs)
   */
  static redactForAudit(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map(item => this.redactForAudit(item));
    }

    const redacted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      
      if (this.SENSITIVE_FIELDS.some(field => lowerKey.includes(field.toLowerCase()))) {
        redacted[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        redacted[key] = this.redactForAudit(value);
      } else {
        redacted[key] = value;
      }
    }

    return redacted;
  }
}

// Export safe logging functions
export const safeLog = {
  log: (msg: string, data?: any) => LogSanitizer.log(msg, data),
  error: (msg: string, error?: any, data?: any) => LogSanitizer.error(msg, error, data),
  warn: (msg: string, data?: any) => LogSanitizer.warn(msg, data),
  info: (msg: string, data?: any) => LogSanitizer.log(msg, data),
};

