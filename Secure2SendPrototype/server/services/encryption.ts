import { createCipher, createDecipher, randomBytes, scryptSync, createCipheriv, createDecipheriv } from "crypto";
import { env } from "../env";

export class EncryptionService {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32;
  private static readonly IV_LENGTH = 16;
  private static readonly TAG_LENGTH = 16;

  // Generate encryption key from master secret
  private static deriveKey(salt: Buffer): Buffer {
    return scryptSync(env.SESSION_SECRET, salt, this.KEY_LENGTH);
  }

  // Encrypt sensitive field
  static encryptField(plaintext: string): string {
    try {
      const salt = randomBytes(16);
      const iv = randomBytes(this.IV_LENGTH);
      const key = this.deriveKey(salt);
      
      const cipher = createCipheriv(this.ALGORITHM, key, iv);
      const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
      const tag = cipher.getAuthTag();
      
      // Combine salt + iv + tag + encrypted data
      const combined = Buffer.concat([salt, iv, tag, encrypted]);
      return combined.toString('base64');
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt field');
    }
  }

  // Decrypt sensitive field
  static decryptField(encryptedData: string): string {
    try {
      const combined = Buffer.from(encryptedData, 'base64');
      
      const salt = combined.subarray(0, 16);
      const iv = combined.subarray(16, 16 + this.IV_LENGTH);
      const tag = combined.subarray(16 + this.IV_LENGTH, 16 + this.IV_LENGTH + this.TAG_LENGTH);
      const encrypted = combined.subarray(16 + this.IV_LENGTH + this.TAG_LENGTH);
      
      const key = this.deriveKey(salt);
      const decipher = createDecipheriv(this.ALGORITHM, key, iv);
      decipher.setAuthTag(tag);
      
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      return decrypted.toString('utf8');
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt field');
    }
  }

  // Check if data is encrypted (base64 format check)
  static isEncrypted(data: string): boolean {
    try {
      const decoded = Buffer.from(data, 'base64');
      return decoded.length > 48; // salt(16) + iv(16) + tag(16) + min data
    } catch {
      return false;
    }
  }

  // Encrypt multiple fields at once
  static encryptFields(fields: Record<string, string>): Record<string, string> {
    const encrypted: Record<string, string> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value && value.trim()) {
        encrypted[key] = this.encryptField(value);
      }
    }
    return encrypted;
  }

  // Decrypt multiple fields at once
  static decryptFields(fields: Record<string, string | null>): Record<string, string | null> {
    const decrypted: Record<string, string | null> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value && this.isEncrypted(value)) {
        try {
          decrypted[key] = this.decryptField(value);
        } catch (error) {
          console.error(`Failed to decrypt field ${key}:`, error);
          decrypted[key] = null; // Return null for failed decryption
        }
      } else {
        decrypted[key] = value;
      }
    }
    return decrypted;
  }
}
