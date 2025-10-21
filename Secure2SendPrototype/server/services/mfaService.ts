import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { storage } from '../storage';
import { User } from '@shared/schema';
import { EmailService } from './emailService';

const scryptAsync = promisify(scrypt);

export class MfaService {
  private static readonly APP_NAME = 'Secure2Send Enterprise';
  private static readonly BACKUP_CODES_COUNT = 10;
  private static readonly BACKUP_CODE_LENGTH = 8;
  private static readonly EMAIL_OTP_LENGTH = 6;
  private static readonly EMAIL_OTP_EXPIRY_MINUTES = 5;
  private static readonly EMAIL_OTP_MAX_ATTEMPTS = 5;
  private static readonly EMAIL_RATE_LIMIT_MAX = 3;
  private static readonly EMAIL_RATE_LIMIT_WINDOW_MINUTES = 15;

  /**
   * Generate a new MFA secret for a user
   */
  static generateSecret(userEmail: string): { secret: string; qrCodeUrl: string; manualEntryKey: string } {
    const secret = speakeasy.generateSecret({
      name: userEmail,
      issuer: this.APP_NAME,
      length: 32,
    });

    return {
      secret: secret.base32,
      qrCodeUrl: secret.otpauth_url!,
      manualEntryKey: secret.base32,
    };
  }

  /**
   * Generate QR code data URL for display
   */
  static async generateQRCode(otpauthUrl: string): Promise<string> {
    try {
      return await QRCode.toDataURL(otpauthUrl);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Verify a TOTP token against a secret
   */
  static verifyToken(token: string, secret: string, window: number = 1): boolean {
    try {
      return speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window, // Allow 1 step before/after current time (30 seconds each)
      });
    } catch (error) {
      console.error('Failed to verify TOTP token:', error);
      return false;
    }
  }

  /**
   * Generate backup codes for account recovery
   */
  static async generateBackupCodes(): Promise<{ codes: string[]; hashedCodes: string[] }> {
    const codes: string[] = [];
    const hashedCodes: string[] = [];

    for (let i = 0; i < this.BACKUP_CODES_COUNT; i++) {
      // Generate a random backup code
      const code = this.generateBackupCode();
      codes.push(code);

      // Hash the code for storage
      const hashedCode = await this.hashBackupCode(code);
      hashedCodes.push(hashedCode);
    }

    return { codes, hashedCodes };
  }

  /**
   * Generate a single backup code
   */
  private static generateBackupCode(): string {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    
    for (let i = 0; i < this.BACKUP_CODE_LENGTH; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Format as XXXX-XXXX for readability
    return result.substring(0, 4) + '-' + result.substring(4);
  }

  /**
   * Hash a backup code for secure storage
   */
  private static async hashBackupCode(code: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const buf = (await scryptAsync(code.replace('-', ''), salt, 64)) as Buffer;
    return `${buf.toString('hex')}.${salt}`;
  }

  /**
   * Verify a backup code against stored hashed codes
   */
  static async verifyBackupCode(code: string, hashedCodes: string[]): Promise<{ isValid: boolean; usedCodeIndex: number }> {
    const cleanCode = code.replace('-', '').toUpperCase();

    for (let i = 0; i < hashedCodes.length; i++) {
      const hashedCode = hashedCodes[i];
      if (!hashedCode) continue; // Skip already used codes

      try {
        const [hashed, salt] = hashedCode.split('.');
        const hashedBuf = Buffer.from(hashed, 'hex');
        const suppliedBuf = (await scryptAsync(cleanCode, salt, 64)) as Buffer;
        
        if (timingSafeEqual(hashedBuf, suppliedBuf)) {
          return { isValid: true, usedCodeIndex: i };
        }
      } catch (error) {
        console.error('Error verifying backup code:', error);
        continue;
      }
    }

    return { isValid: false, usedCodeIndex: -1 };
  }

  /**
   * Enable MFA for a user
   */
  static async enableMfa(userId: string, secret: string, verificationToken: string): Promise<{ success: boolean; backupCodes?: string[]; error?: string }> {
    try {
      // First verify the token to ensure the user has set up their authenticator correctly
      if (!this.verifyToken(verificationToken, secret)) {
        return { success: false, error: 'Invalid verification code. Please check your authenticator app.' };
      }

      // Generate backup codes
      const { codes: backupCodes, hashedCodes } = await this.generateBackupCodes();

      // Update user in database
      await storage.enableUserMfa(userId, secret, hashedCodes);

      // Get user for email notification
      const user = await storage.getUser(userId);
      if (user) {
        // Send MFA enabled notification email
        EmailService.sendMfaEnabledEmail(user).catch(error => {
          console.error('Failed to send MFA enabled email:', error);
        });
      }

      console.log(`✅ MFA enabled for user ${userId}`);
      return { success: true, backupCodes };
    } catch (error) {
      console.error('Failed to enable MFA:', error);
      return { success: false, error: 'Failed to enable MFA. Please try again.' };
    }
  }

  /**
   * Disable MFA for a user
   */
  static async disableMfa(userId: string, currentPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify current password before disabling MFA
      const user = await storage.getUser(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Import password comparison function
      const { hashPassword } = await import('../auth');
      const { scrypt, timingSafeEqual } = await import('crypto');
      const { promisify } = await import('util');
      const scryptAsync = promisify(scrypt);
      
      const comparePasswords = async (supplied: string, stored: string): Promise<boolean> => {
        const [hashed, salt] = stored.split(".");
        const hashedBuf = Buffer.from(hashed, "hex");
        const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
        return timingSafeEqual(hashedBuf, suppliedBuf);
      };
      if (!(await comparePasswords(currentPassword, user.password))) {
        return { success: false, error: 'Invalid password' };
      }

      // Disable MFA in database
      await storage.disableUserMfa(userId);

      // Send MFA disabled notification email
      EmailService.sendMfaDisabledEmail(user).catch(error => {
        console.error('Failed to send MFA disabled email:', error);
      });

      console.log(`✅ MFA disabled for user ${userId}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to disable MFA:', error);
      return { success: false, error: 'Failed to disable MFA. Please try again.' };
    }
  }

  /**
   * Verify MFA during login (TOTP or backup code)
   */
  static async verifyMfaForLogin(userId: string, code: string): Promise<{ success: boolean; isBackupCode?: boolean; error?: string }> {
    try {
      const user = await storage.getUser(userId);
      if (!user || !user.mfaEnabled || !user.mfaSecret) {
        return { success: false, error: 'MFA not enabled for this user' };
      }

      // First try TOTP verification
      if (this.verifyToken(code, user.mfaSecret)) {
        // Update last used timestamp
        await storage.updateUserMfaLastUsed(userId);
        return { success: true, isBackupCode: false };
      }

      // If TOTP fails, try backup codes
      if (user.mfaBackupCodes && user.mfaBackupCodes.length > 0) {
        const { isValid, usedCodeIndex } = await this.verifyBackupCode(code, user.mfaBackupCodes);
        
        if (isValid) {
          // Mark the backup code as used by setting it to null
          const updatedBackupCodes = [...user.mfaBackupCodes];
          updatedBackupCodes[usedCodeIndex] = null as any; // Mark as used
          
          await storage.updateUserMfaBackupCodes(userId, updatedBackupCodes.filter(code => code !== null));
          await storage.updateUserMfaLastUsed(userId);
          
          console.log(`✅ Backup code used for user ${userId}`);
          return { success: true, isBackupCode: true };
        }
      }

      return { success: false, error: 'Invalid verification code' };
    } catch (error) {
      console.error('Failed to verify MFA for login:', error);
      return { success: false, error: 'MFA verification failed. Please try again.' };
    }
  }

  /**
   * Generate new backup codes (invalidates old ones)
   */
  static async regenerateBackupCodes(userId: string, currentPassword: string): Promise<{ success: boolean; backupCodes?: string[]; error?: string }> {
    try {
      // Verify current password
      const user = await storage.getUser(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Import password comparison function
      const { scrypt, timingSafeEqual } = await import('crypto');
      const { promisify } = await import('util');
      const scryptAsync = promisify(scrypt);
      
      const comparePasswords = async (supplied: string, stored: string): Promise<boolean> => {
        const [hashed, salt] = stored.split(".");
        const hashedBuf = Buffer.from(hashed, "hex");
        const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
        return timingSafeEqual(hashedBuf, suppliedBuf);
      };
      if (!(await comparePasswords(currentPassword, user.password))) {
        return { success: false, error: 'Invalid password' };
      }

      if (!user.mfaEnabled) {
        return { success: false, error: 'MFA is not enabled' };
      }

      // Generate new backup codes
      const { codes: backupCodes, hashedCodes } = await this.generateBackupCodes();

      // Update in database
      await storage.updateUserMfaBackupCodes(userId, hashedCodes);

      console.log(`✅ Backup codes regenerated for user ${userId}`);
      return { success: true, backupCodes };
    } catch (error) {
      console.error('Failed to regenerate backup codes:', error);
      return { success: false, error: 'Failed to regenerate backup codes. Please try again.' };
    }
  }

  /**
   * Check if user has MFA enabled
   */
  static async isMfaEnabled(userId: string): Promise<boolean> {
    try {
      const user = await storage.getUser(userId);
      return user?.mfaEnabled || false;
    } catch (error) {
      console.error('Failed to check MFA status:', error);
      return false;
    }
  }

  /**
   * Get MFA status and backup codes count for user
   */
  static async getMfaStatus(userId: string): Promise<{
    enabled: boolean;
    setupAt?: Date;
    lastUsed?: Date;
    backupCodesRemaining: number;
    emailEnabled?: boolean;
    emailLastSentAt?: Date;
    emailSendCount?: number;
  }> {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return { enabled: false, backupCodesRemaining: 0 };
      }

      const backupCodesRemaining = user.mfaBackupCodes?.filter(code => code !== null).length || 0;

      return {
        enabled: user.mfaEnabled || false,
        setupAt: user.mfaSetupAt || undefined,
        lastUsed: user.mfaLastUsed || undefined,
        backupCodesRemaining,
        emailEnabled: user.mfaEmailEnabled || false,
        emailLastSentAt: user.mfaEmailLastSentAt || undefined,
        emailSendCount: user.mfaEmailSendCount || 0,
      };
    } catch (error) {
      console.error('Failed to get MFA status:', error);
      return { enabled: false, backupCodesRemaining: 0 };
    }
  }

  // ============================================
  // Email OTP Methods
  // ============================================

  /**
   * Generate a random 6-digit OTP code
   */
  static generateEmailOtp(): string {
    const digits = '0123456789';
    let otp = '';
    
    for (let i = 0; i < this.EMAIL_OTP_LENGTH; i++) {
      const randomIndex = Math.floor(Math.random() * digits.length);
      otp += digits[randomIndex];
    }
    
    return otp;
  }

  /**
   * Hash an email OTP code for secure storage
   */
  private static async hashEmailOtp(code: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const buf = (await scryptAsync(code, salt, 64)) as Buffer;
    return `${buf.toString('hex')}.${salt}`;
  }

  /**
   * Verify an email OTP code against stored hashed code
   */
  private static async verifyEmailOtpHash(code: string, hashedCode: string): Promise<boolean> {
    try {
      const [hashed, salt] = hashedCode.split('.');
      const hashedBuf = Buffer.from(hashed, 'hex');
      const suppliedBuf = (await scryptAsync(code, salt, 64)) as Buffer;
      return timingSafeEqual(hashedBuf, suppliedBuf);
    } catch (error) {
      console.error('Error verifying email OTP hash:', error);
      return false;
    }
  }

  /**
   * Check rate limit for email OTP sends
   */
  static async checkEmailOtpRateLimit(userId: string): Promise<{
    allowed: boolean;
    remainingAttempts: number;
    resetAt?: Date;
  }> {
    try {
      const rateLimitData = await storage.getEmailRateLimitData(userId);
      const now = new Date();

      // Check if rate limit window has expired
      if (rateLimitData.resetAt && now > rateLimitData.resetAt) {
        // Reset the counter
        const newResetAt = new Date(now.getTime() + this.EMAIL_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);
        await storage.updateEmailRateLimit(userId, 0, newResetAt);
        return {
          allowed: true,
          remainingAttempts: this.EMAIL_RATE_LIMIT_MAX,
          resetAt: newResetAt,
        };
      }

      // Check if under rate limit
      if (rateLimitData.sendCount >= this.EMAIL_RATE_LIMIT_MAX) {
        return {
          allowed: false,
          remainingAttempts: 0,
          resetAt: rateLimitData.resetAt,
        };
      }

      return {
        allowed: true,
        remainingAttempts: this.EMAIL_RATE_LIMIT_MAX - rateLimitData.sendCount,
        resetAt: rateLimitData.resetAt,
      };
    } catch (error) {
      console.error('Failed to check rate limit:', error);
      return { allowed: false, remainingAttempts: 0 };
    }
  }

  /**
   * Send email OTP code to user
   */
  static async sendEmailOtp(userId: string, email: string): Promise<{
    success: boolean;
    error?: string;
    expiresAt?: Date;
  }> {
    try {
      // Check rate limit
      const rateLimit = await this.checkEmailOtpRateLimit(userId);
      if (!rateLimit.allowed) {
        const resetTime = rateLimit.resetAt 
          ? new Date(rateLimit.resetAt).toLocaleTimeString() 
          : 'soon';
        return {
          success: false,
          error: `Rate limit exceeded. You can request another code at ${resetTime}.`,
        };
      }

      // Generate OTP
      const otpCode = this.generateEmailOtp();
      const hashedOtp = await this.hashEmailOtp(otpCode);
      const expiresAt = new Date(Date.now() + this.EMAIL_OTP_EXPIRY_MINUTES * 60 * 1000);

      // Save to database
      await storage.saveEmailOtp(userId, hashedOtp, expiresAt);

      // Update rate limit
      const rateLimitData = await storage.getEmailRateLimitData(userId);
      const newSendCount = rateLimitData.sendCount + 1;
      const resetAt = rateLimitData.resetAt || 
        new Date(Date.now() + this.EMAIL_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);
      await storage.updateEmailRateLimit(userId, newSendCount, resetAt);

      // Get user for email
      const user = await storage.getUser(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Send email
      await EmailService.sendMfaOtpEmail(user, otpCode, this.EMAIL_OTP_EXPIRY_MINUTES);

      console.log(`✅ Email OTP sent to ${email} (expires at ${expiresAt.toISOString()})`);
      return { success: true, expiresAt };
    } catch (error) {
      console.error('Failed to send email OTP:', error);
      return { success: false, error: 'Failed to send verification code. Please try again.' };
    }
  }

  /**
   * Verify email OTP code
   */
  static async verifyEmailOtp(userId: string, code: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Get OTP data
      const otpData = await storage.getEmailOtpData(userId);

      // Check if OTP exists
      if (!otpData.otp) {
        return { success: false, error: 'No verification code found. Please request a new code.' };
      }

      // Check attempts
      if (otpData.attempts >= this.EMAIL_OTP_MAX_ATTEMPTS) {
        await storage.clearEmailOtp(userId);
        return { 
          success: false, 
          error: 'Too many failed attempts. Please request a new verification code.' 
        };
      }

      // Check expiration
      if (!otpData.expiresAt || new Date() > otpData.expiresAt) {
        await storage.clearEmailOtp(userId);
        return { success: false, error: 'Verification code has expired. Please request a new code.' };
      }

      // Verify code
      const isValid = await this.verifyEmailOtpHash(code, otpData.otp);

      if (!isValid) {
        // Increment failed attempts
        await storage.incrementEmailOtpAttempts(userId);
        const remainingAttempts = this.EMAIL_OTP_MAX_ATTEMPTS - (otpData.attempts + 1);
        return { 
          success: false, 
          error: `Invalid verification code. ${remainingAttempts} attempts remaining.` 
        };
      }

      // Success - clear OTP
      await storage.clearEmailOtp(userId);
      console.log(`✅ Email OTP verified for user ${userId}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to verify email OTP:', error);
      return { success: false, error: 'Verification failed. Please try again.' };
    }
  }

  /**
   * Enable email MFA for a user
   */
  static async enableEmailMfa(userId: string, password: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Verify password
      const user = await storage.getUser(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Import password comparison
      const { scrypt, timingSafeEqual } = await import('crypto');
      const { promisify } = await import('util');
      const scryptAsync = promisify(scrypt);
      
      const comparePasswords = async (supplied: string, stored: string): Promise<boolean> => {
        const [hashed, salt] = stored.split(".");
        const hashedBuf = Buffer.from(hashed, "hex");
        const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
        return timingSafeEqual(hashedBuf, suppliedBuf);
      };

      if (!(await comparePasswords(password, user.password))) {
        return { success: false, error: 'Invalid password' };
      }

      // Send verification OTP
      const otpResult = await this.sendEmailOtp(userId, user.email);
      if (!otpResult.success) {
        return { success: false, error: otpResult.error };
      }

      console.log(`✅ Email MFA setup initiated for user ${userId}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to initiate email MFA:', error);
      return { success: false, error: 'Failed to enable email MFA. Please try again.' };
    }
  }

  /**
   * Verify and activate email MFA
   */
  static async verifyAndActivateEmailMfa(userId: string, code: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Verify OTP
      const verifyResult = await this.verifyEmailOtp(userId, code);
      if (!verifyResult.success) {
        return verifyResult;
      }

      // Enable email MFA
      await storage.enableEmailMfa(userId);

      // Get user for notification email
      const user = await storage.getUser(userId);
      if (user) {
        EmailService.sendMfaMethodChangedEmail(user, 'enabled', 'email').catch(error => {
          console.error('Failed to send MFA method changed email:', error);
        });
      }

      console.log(`✅ Email MFA enabled for user ${userId}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to activate email MFA:', error);
      return { success: false, error: 'Failed to enable email MFA. Please try again.' };
    }
  }

  /**
   * Disable email MFA
   */
  static async disableEmailMfa(userId: string, password: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Verify password
      const user = await storage.getUser(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Import password comparison
      const { scrypt, timingSafeEqual } = await import('crypto');
      const { promisify } = await import('util');
      const scryptAsync = promisify(scrypt);
      
      const comparePasswords = async (supplied: string, stored: string): Promise<boolean> => {
        const [hashed, salt] = stored.split(".");
        const hashedBuf = Buffer.from(hashed, "hex");
        const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
        return timingSafeEqual(hashedBuf, suppliedBuf);
      };

      if (!(await comparePasswords(password, user.password))) {
        return { success: false, error: 'Invalid password' };
      }

      // Check if at least one MFA method will remain
      if (!user.mfaEnabled && user.mfaEmailEnabled) {
        return {
          success: false,
          error: 'Cannot disable email MFA. You must have at least one MFA method enabled.',
        };
      }

      // Disable email MFA
      await storage.disableEmailMfa(userId);

      // Send notification email
      EmailService.sendMfaMethodChangedEmail(user, 'disabled', 'email').catch(error => {
        console.error('Failed to send MFA method changed email:', error);
      });

      console.log(`✅ Email MFA disabled for user ${userId}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to disable email MFA:', error);
      return { success: false, error: 'Failed to disable email MFA. Please try again.' };
    }
  }

  /**
   * Verify MFA for login (handles both TOTP and email OTP)
   */
  static async verifyMfaForLoginWithMethod(
    userId: string, 
    code: string, 
    method: 'totp' | 'email'
  ): Promise<{
    success: boolean;
    isBackupCode?: boolean;
    error?: string;
  }> {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Verify based on method
      if (method === 'totp' && user.mfaEnabled && user.mfaSecret) {
        // TOTP verification
        if (this.verifyToken(code, user.mfaSecret)) {
          await storage.updateUserMfaLastUsed(userId);
          return { success: true, isBackupCode: false };
        }
      } else if (method === 'email' && user.mfaEmailEnabled) {
        // Email OTP verification
        const result = await this.verifyEmailOtp(userId, code);
        if (result.success) {
          await storage.updateUserMfaLastUsed(userId);
          return { success: true, isBackupCode: false };
        }
        return { success: false, error: result.error };
      }

      // If primary method fails, try backup codes
      if (user.mfaBackupCodes && user.mfaBackupCodes.length > 0) {
        const { isValid, usedCodeIndex } = await this.verifyBackupCode(code, user.mfaBackupCodes);
        
        if (isValid) {
          const updatedBackupCodes = [...user.mfaBackupCodes];
          updatedBackupCodes[usedCodeIndex] = null as any;
          
          await storage.updateUserMfaBackupCodes(userId, updatedBackupCodes.filter(c => c !== null));
          await storage.updateUserMfaLastUsed(userId);
          
          console.log(`✅ Backup code used for user ${userId}`);
          return { success: true, isBackupCode: true };
        }
      }

      return { success: false, error: 'Invalid verification code' };
    } catch (error) {
      console.error('Failed to verify MFA for login:', error);
      return { success: false, error: 'MFA verification failed. Please try again.' };
    }
  }
}
