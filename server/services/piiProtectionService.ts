/**
 * PII Protection Service
 * 
 * Handles encryption and masking of sensitive personally identifiable information (PII)
 * extracted from documents via OCR. Uses AES-256-GCM encryption with a dedicated key
 * separate from document encryption.
 * 
 * Features:
 * - Field-level encryption for sensitive data (SSN, Tax ID, Account Numbers, etc.)
 * - Data masking for UI display (public view)
 * - Separate encryption key for OCR-extracted PII
 * - Field-type-aware masking (different formats for different field types)
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import { env } from '../env';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits

/**
 * Sensitive fields that should be encrypted
 */
export const SENSITIVE_FIELDS = {
  // W9 Fields
  SIGNER_SSN: 'signerSSN',
  FEDERAL_TAX_ID: 'federalTaxIdNumber',
  
  // Banking Fields
  ROUTING_NUMBER: 'routingNumber',
  ACCOUNT_NUMBER: 'accountNumber',
  
  // ID Fields
  DOB: 'dob',
  LICENSE_NUMBER: 'licenseNumber',
  PASSPORT_NUMBER: 'licenseNumber', // Same field name in ID data
  
  // Business Fields
  EIN_NUMBER: 'einNumber',
  
  // Beneficial Ownership
  OWNER_SSN: 'ssn', // In owners array
} as const;

/**
 * Field types for masking
 */
export type SensitiveFieldType = 
  | 'ssn'           // XXX-XX-1234
  | 'tax_id'        // XX-XXXXXXX
  | 'account_number' // ****5678
  | 'routing_number' // *****6789 (last 4 digits)
  | 'dob'            // **/**/****
  | 'license_number' // Shows last 4 chars
  | 'ein'            // XX-XXXXXXX (same as tax_id)
  | 'phone'          // (XXX) XXX-****
  | 'generic';       // *******

/**
 * Derived encryption key from FIELD_ENCRYPTION_KEY
 */
function getEncryptionKey(): Buffer {
  if (!env.FIELD_ENCRYPTION_KEY) {
    throw new Error('FIELD_ENCRYPTION_KEY environment variable is not set');
  }

  // FIELD_ENCRYPTION_KEY should be a 64-character hex string (256 bits)
  // Convert hex string to Buffer
  if (env.FIELD_ENCRYPTION_KEY.length !== 64) {
    throw new Error('FIELD_ENCRYPTION_KEY must be exactly 64 hex characters (256 bits)');
  }

  try {
    return Buffer.from(env.FIELD_ENCRYPTION_KEY, 'hex');
  } catch (error) {
    throw new Error('FIELD_ENCRYPTION_KEY must be a valid hex string');
  }
}

/**
 * PII Protection Service
 */
export class PIIProtectionService {
  /**
   * Encrypt a sensitive field value
   */
  static encryptField(plaintext: string): string {
    if (!plaintext || plaintext.trim() === '') {
      throw new Error('Cannot encrypt empty value');
    }

    try {
      const key = getEncryptionKey();
      const iv = randomBytes(IV_LENGTH);
      
      const cipher = createCipheriv(ALGORITHM, key, iv);
      const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final()
      ]);
      const tag = cipher.getAuthTag();
      
      // Combine: iv (16) + tag (16) + encrypted data
      // Note: Using fixed key, so no salt needed (key is already derived from env var)
      const combined = Buffer.concat([iv, tag, encrypted]);
      return combined.toString('base64');
    } catch (error) {
      console.error('PII encryption error:', error);
      throw new Error('Failed to encrypt sensitive field');
    }
  }

  /**
   * Decrypt a sensitive field value
   */
  static decryptField(encryptedData: string): string {
    if (!encryptedData || encryptedData.trim() === '') {
      throw new Error('Cannot decrypt empty value');
    }

    try {
      const key = getEncryptionKey();
      const combined = Buffer.from(encryptedData, 'base64');
      
      // Extract: iv (16) + tag (16) + encrypted data
      const iv = combined.subarray(0, IV_LENGTH);
      const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
      const encrypted = combined.subarray(IV_LENGTH + TAG_LENGTH);
      
      const decipher = createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(tag);
      
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);
      
      return decrypted.toString('utf8');
    } catch (error) {
      console.error('PII decryption error:', error);
      throw new Error('Failed to decrypt sensitive field');
    }
  }

  /**
   * Check if a string is encrypted (base64 format check)
   */
  static isEncrypted(value: string): boolean {
    try {
      const decoded = Buffer.from(value, 'base64');
      // Encrypted data should be at least iv(16) + tag(16) = 32 bytes
      return decoded.length >= 32;
    } catch {
      return false;
    }
  }

  /**
   * Mask sensitive value based on field type
   */
  static maskSensitiveValue(value: string | undefined | null, fieldType: SensitiveFieldType = 'generic'): string | undefined {
    if (!value || value.trim() === '') {
      return undefined;
    }

    // Remove any formatting
    const cleaned = value.replace(/\D/g, ''); // Remove non-digits
    const original = value.trim();

    switch (fieldType) {
      case 'ssn':
        // Format: XXX-XX-1234 (show last 4 digits)
        if (cleaned.length === 9) {
          return `***-**-${cleaned.slice(-4)}`;
        }
        // If already formatted, preserve format
        if (original.match(/^\d{3}-\d{2}-\d{4}$/)) {
          return `***-**-${original.slice(-4)}`;
        }
        return `***-**-${cleaned.slice(-4)}`;

      case 'tax_id':
      case 'ein':
        // Format: XX-XXXXXXX (show last 4 digits)
        if (cleaned.length === 9) {
          return `**-****${cleaned.slice(-4)}`;
        }
        // If already formatted, preserve format
        if (original.match(/^\d{2}-\d{7}$/)) {
          return `**-****${original.slice(-4)}`;
        }
        return `**-****${cleaned.slice(-4)}`;

      case 'account_number':
        // Format: ****5678 (show last 4 digits)
        const accountLast4 = cleaned.length >= 4 ? cleaned.slice(-4) : cleaned;
        return `****${accountLast4}`;

      case 'routing_number':
        // Format: *****6789 (show last 4 digits, routing numbers are 9 digits)
        if (cleaned.length === 9) {
          return `*****${cleaned.slice(-4)}`;
        }
        const routingLast4 = cleaned.length >= 4 ? cleaned.slice(-4) : cleaned;
        return `*****${routingLast4}`;

      case 'dob':
        // Format: **/**/**** (hide full date)
        if (original.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
          return `**/**/****`;
        }
        if (original.match(/^\d{4}-\d{2}-\d{2}$/)) {
          return `****-**-**`;
        }
        return '**/**/****';

      case 'license_number':
        // Format: Show last 4 characters
        if (original.length >= 4) {
          return `****${original.slice(-4)}`;
        }
        return '****';

      case 'phone':
        // Format: (XXX) XXX-****
        if (cleaned.length === 10) {
          return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-****`;
        }
        return '***-***-****';

      case 'generic':
      default:
        // Generic masking: show last 4 characters if length > 4
        if (original.length > 4) {
          return `****${original.slice(-4)}`;
        }
        return '****';
    }
  }

  /**
   * Separate extracted data into public (masked) and encrypted fields
   */
  static separatePublicAndEncrypted<T extends Record<string, any>>(
    extractedData: T
  ): {
    public: T;
    encrypted: Record<string, string>;
  } {
    const publicData: any = { ...extractedData };
    const encryptedFields: Record<string, string> = {};

    // Process SSN fields
    if ('signerSSN' in extractedData && extractedData.signerSSN) {
      encryptedFields.signerSSN = this.encryptField(String(extractedData.signerSSN));
      publicData.signerSSN = this.maskSensitiveValue(extractedData.signerSSN, 'ssn');
    }

    // Process Tax ID / EIN
    if ('federalTaxIdNumber' in extractedData && extractedData.federalTaxIdNumber) {
      encryptedFields.federalTaxIdNumber = this.encryptField(String(extractedData.federalTaxIdNumber));
      publicData.federalTaxIdNumber = this.maskSensitiveValue(extractedData.federalTaxIdNumber, 'tax_id');
    }

    if ('einNumber' in extractedData && extractedData.einNumber) {
      encryptedFields.einNumber = this.encryptField(String(extractedData.einNumber));
      publicData.einNumber = this.maskSensitiveValue(extractedData.einNumber, 'ein');
    }

    // Process Banking fields
    if ('routingNumber' in extractedData && extractedData.routingNumber) {
      encryptedFields.routingNumber = this.encryptField(String(extractedData.routingNumber));
      publicData.routingNumber = this.maskSensitiveValue(extractedData.routingNumber, 'routing_number');
    }

    if ('accountNumber' in extractedData && extractedData.accountNumber) {
      encryptedFields.accountNumber = this.encryptField(String(extractedData.accountNumber));
      publicData.accountNumber = this.maskSensitiveValue(extractedData.accountNumber, 'account_number');
    }

    // Process ID fields
    if ('dob' in extractedData && extractedData.dob) {
      encryptedFields.dob = this.encryptField(String(extractedData.dob));
      publicData.dob = this.maskSensitiveValue(extractedData.dob, 'dob');
    }

    if ('licenseNumber' in extractedData && extractedData.licenseNumber) {
      encryptedFields.licenseNumber = this.encryptField(String(extractedData.licenseNumber));
      publicData.licenseNumber = this.maskSensitiveValue(extractedData.licenseNumber, 'license_number');
    }

    // Process Beneficial Ownership owners array
    if ('owners' in extractedData && Array.isArray(extractedData.owners)) {
      publicData.owners = extractedData.owners.map((owner: any, index: number) => {
        const maskedOwner = { ...owner };
        
        if (owner.ssn) {
          const fieldKey = `owners.${index}.ssn`;
          encryptedFields[fieldKey] = this.encryptField(String(owner.ssn));
          maskedOwner.ssn = this.maskSensitiveValue(owner.ssn, 'ssn');
        }
        
        if (owner.dob) {
          const fieldKey = `owners.${index}.dob`;
          encryptedFields[fieldKey] = this.encryptField(String(owner.dob));
          maskedOwner.dob = this.maskSensitiveValue(owner.dob, 'dob');
        }
        
        return maskedOwner;
      });
    }

    return {
      public: publicData as T,
      encrypted: encryptedFields,
    };
  }

  /**
   * Decrypt encrypted fields and merge back into public data
   */
  static decryptAndMerge(
    publicData: Record<string, any>,
    encryptedFields: Record<string, string>
  ): Record<string, any> {
    const decrypted = { ...publicData };

    // Decrypt simple fields
    const simpleFields = ['signerSSN', 'federalTaxIdNumber', 'einNumber', 'routingNumber', 'accountNumber', 'dob', 'licenseNumber'];
    
    for (const field of simpleFields) {
      if (field in encryptedFields) {
        try {
          decrypted[field] = this.decryptField(encryptedFields[field]);
        } catch (error) {
          console.error(`Failed to decrypt field ${field}:`, error);
          // Keep masked value if decryption fails
        }
      }
    }

    // Decrypt owners array fields
    if ('owners' in decrypted && Array.isArray(decrypted.owners)) {
      decrypted.owners = decrypted.owners.map((owner: any, index: number) => {
        const decryptedOwner = { ...owner };
        
        const ssnKey = `owners.${index}.ssn`;
        if (ssnKey in encryptedFields) {
          try {
            decryptedOwner.ssn = this.decryptField(encryptedFields[ssnKey]);
          } catch (error) {
            console.error(`Failed to decrypt owner ${index} SSN:`, error);
          }
        }
        
        const dobKey = `owners.${index}.dob`;
        if (dobKey in encryptedFields) {
          try {
            decryptedOwner.dob = this.decryptField(encryptedFields[dobKey]);
          } catch (error) {
            console.error(`Failed to decrypt owner ${index} DOB:`, error);
          }
        }
        
        return decryptedOwner;
      });
    }

    return decrypted;
  }

  /**
   * Encrypt multiple fields at once
   */
  static encryptFields(fields: Record<string, string>): Record<string, string> {
    const encrypted: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(fields)) {
      if (value && value.trim()) {
        try {
          encrypted[key] = this.encryptField(value);
        } catch (error) {
          console.error(`Failed to encrypt field ${key}:`, error);
          // Skip failed fields
        }
      }
    }
    
    return encrypted;
  }

  /**
   * Decrypt multiple fields at once
   */
  static decryptFields(fields: Record<string, string>): Record<string, string | null> {
    const decrypted: Record<string, string | null> = {};
    
    for (const [key, value] of Object.entries(fields)) {
      if (value && this.isEncrypted(value)) {
        try {
          decrypted[key] = this.decryptField(value);
        } catch (error) {
          console.error(`Failed to decrypt field ${key}:`, error);
          decrypted[key] = null;
        }
      } else {
        decrypted[key] = value || null;
      }
    }
    
    return decrypted;
  }
}

