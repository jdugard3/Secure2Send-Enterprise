import { randomInt } from 'crypto';
import { scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { storage } from '../storage';
import { User } from '@shared/schema';
import { EmailService } from './emailService';

const scryptAsync = promisify(scrypt);

export class EmailMfaService {
  private static readonly OTP_LENGTH = 6;
  private static readonly OTP_EXPIRY_MINUTES = 5;
  private static readonly MAX_OTP_ATTEMPTS = 5;
  private static readonly RATE_LIMIT_WINDOW_MINUTES = 15;
  private static readonly RATE_LIMIT_MAX_SENDS = 3;

  /**
   * Generate a 6-digit OTP code
   */
  static generateOtp(): string {
    // Generate a secure random 6-digit number
    const otp = randomInt(0, 1000000).toString().padStart(this.OTP_LENGTH, '0');
    return otp;
  }

  /**
   * Hash an OTP for secure storage
   */
  private static async hashOtp(otp: string): Promise<string> {
    const salt = randomInt(0, 1000000).toString();
    const buf = (await scryptAsync(otp, salt, 64)) as Buffer;
    return `${buf.toString('hex')}.${salt}`;
  }

  /**
   * Verify an OTP against the stored hash
   */
  private static async verifyOtp(suppliedOtp: string, storedHash: string): Promise<boolean> {
    try {
      const [hashed, salt] = storedHash.split('.');
      const hashedBuf = Buffer.from(hashed, 'hex');
      const suppliedBuf = (await scryptAsync(suppliedOtp, salt, 64)) as Buffer;
      return timingSafeEqual(hashedBuf, suppliedBuf);
    } catch (error) {
      console.error('Error verifying OTP:', error);
      return false;
    }
  }

  /**
   * Check if user has exceeded rate limit for OTP sends
   */
  static async checkRateLimit(userId: string): Promise<{ allowed: boolean; resetAt?: Date; sendCount?: number }> {
    try {
      const rateLimitData = await storage.getEmailRateLimitData(userId);
      const now = new Date();

      // If no rate limit data or window has expired, allow and reset
      if (!rateLimitData.resetAt || rateLimitData.resetAt <= now) {
        return { allowed: true, sendCount: 0 };
      }

      // Within rate limit window, check count
      const sendCount = rateLimitData.sendCount || 0;
      if (sendCount >= this.RATE_LIMIT_MAX_SENDS) {
        return { 
          allowed: false, 
          resetAt: rateLimitData.resetAt,
          sendCount
        };
      }

      return { allowed: true, sendCount };
    } catch (error) {
      console.error('Error checking rate limit:', error);
      return { allowed: false };
    }
  }

  /**
   * Send OTP email for MFA setup
   */
  static async sendSetupOtp(userId: string): Promise<{ success: boolean; error?: string; resetAt?: Date }> {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Check rate limit
      const rateLimitCheck = await this.checkRateLimit(userId);
      if (!rateLimitCheck.allowed) {
        const minutesRemaining = rateLimitCheck.resetAt 
          ? Math.ceil((rateLimitCheck.resetAt.getTime() - Date.now()) / 60000)
          : 15;
        return { 
          success: false, 
          error: `Rate limit exceeded. Please try again in ${minutesRemaining} minute(s).`,
          resetAt: rateLimitCheck.resetAt
        };
      }

      // Generate OTP
      const otp = this.generateOtp();
      const hashedOtp = await this.hashOtp(otp);
      const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60000);

      // Store OTP in database
      const now = new Date();
      const isFirstSendInWindow = rateLimitCheck.sendCount === 0;
      
      await storage.saveEmailOtp(userId, hashedOtp, expiresAt);
      
      // Update rate limit
      if (isFirstSendInWindow) {
        const resetAt = new Date(now.getTime() + this.RATE_LIMIT_WINDOW_MINUTES * 60000);
        await storage.updateEmailRateLimit(userId, 1, resetAt);
      } else {
        const currentCount = rateLimitCheck.sendCount || 0;
        const rateLimitData = await storage.getEmailRateLimitData(userId);
        await storage.updateEmailRateLimit(
          userId, 
          currentCount + 1, 
          rateLimitData.resetAt || new Date()
        );
      }

      // Send email
      await EmailService.sendMfaOtpEmail(user, otp, this.OTP_EXPIRY_MINUTES);

      console.log(`✅ Setup OTP sent to ${user.email}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to send setup OTP:', error);
      return { success: false, error: 'Failed to send OTP email. Please try again.' };
    }
  }

  /**
   * Verify OTP during setup and enable email MFA
   */
  static async verifySetupOtp(userId: string, otp: string, currentPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Verify current password for security
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

      // Get OTP data
      const otpData = await storage.getEmailOtpData(userId);
      
      if (!otpData.otp || !otpData.expiresAt) {
        return { success: false, error: 'No OTP found. Please request a new code.' };
      }

      const now = new Date();
      if (otpData.expiresAt <= now) {
        return { success: false, error: 'OTP has expired. Please request a new code.' };
      }

      // Check attempts
      if (otpData.attempts >= this.MAX_OTP_ATTEMPTS) {
        await storage.clearEmailOtp(userId);
        return { success: false, error: 'Too many failed attempts. Please request a new code.' };
      }

      // Verify OTP
      const isValid = await this.verifyOtp(otp, otpData.otp);
      
      if (!isValid) {
        await storage.incrementEmailOtpAttempts(userId);
        const remainingAttempts = this.MAX_OTP_ATTEMPTS - otpData.attempts - 1;
        return { 
          success: false, 
          error: `Invalid code. ${remainingAttempts} attempt(s) remaining.` 
        };
      }

      // OTP is valid - enable email MFA
      await storage.enableEmailMfa(userId);
      await storage.clearEmailOtp(userId);

      console.log(`✅ Email MFA enabled for user ${userId}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to verify setup OTP:', error);
      return { success: false, error: 'Failed to verify OTP. Please try again.' };
    }
  }

  /**
   * Send OTP email for login
   */
  static async sendLoginOtp(userId: string): Promise<{ success: boolean; error?: string; resetAt?: Date }> {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      if (!user.mfaEmailEnabled) {
        return { success: false, error: 'Email MFA is not enabled for this user' };
      }

      // Check rate limit
      const rateLimitCheck = await this.checkRateLimit(userId);
      if (!rateLimitCheck.allowed) {
        const minutesRemaining = rateLimitCheck.resetAt 
          ? Math.ceil((rateLimitCheck.resetAt.getTime() - Date.now()) / 60000)
          : 15;
        return { 
          success: false, 
          error: `Too many attempts. Please try again in ${minutesRemaining} minute(s).`,
          resetAt: rateLimitCheck.resetAt
        };
      }

      // Generate OTP
      const otp = this.generateOtp();
      const hashedOtp = await this.hashOtp(otp);
      const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60000);

      // Store OTP in database
      const now = new Date();
      const isFirstSendInWindow = rateLimitCheck.sendCount === 0;
      
      await storage.saveEmailOtp(userId, hashedOtp, expiresAt);
      
      // Update rate limit
      if (isFirstSendInWindow) {
        const resetAt = new Date(now.getTime() + this.RATE_LIMIT_WINDOW_MINUTES * 60000);
        await storage.updateEmailRateLimit(userId, 1, resetAt);
      } else {
        const currentCount = rateLimitCheck.sendCount || 0;
        const rateLimitData = await storage.getEmailRateLimitData(userId);
        await storage.updateEmailRateLimit(
          userId, 
          currentCount + 1, 
          rateLimitData.resetAt || new Date()
        );
      }

      // Send email
      await EmailService.sendMfaOtpEmail(user, otp, this.OTP_EXPIRY_MINUTES);

      console.log(`✅ Login OTP sent to ${user.email}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to send login OTP:', error);
      return { success: false, error: 'Failed to send OTP email. Please try again.' };
    }
  }

  /**
   * Verify OTP during login
   */
  static async verifyLoginOtp(userId: string, otp: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      if (!user.mfaEmailEnabled) {
        return { success: false, error: 'Email MFA is not enabled for this user' };
      }

      // Get OTP data
      const otpData = await storage.getEmailOtpData(userId);
      
      if (!otpData.otp || !otpData.expiresAt) {
        return { success: false, error: 'No OTP found. Please request a new code.' };
      }

      const now = new Date();
      if (otpData.expiresAt <= now) {
        await storage.clearEmailOtp(userId);
        return { success: false, error: 'OTP has expired. Please request a new code.' };
      }

      // Check attempts
      if (otpData.attempts >= this.MAX_OTP_ATTEMPTS) {
        await storage.clearEmailOtp(userId);
        return { success: false, error: 'Too many failed attempts. Please request a new code.' };
      }

      // Verify OTP
      const isValid = await this.verifyOtp(otp, otpData.otp);
      
      if (!isValid) {
        await storage.incrementEmailOtpAttempts(userId);
        const remainingAttempts = this.MAX_OTP_ATTEMPTS - otpData.attempts - 1;
        return { 
          success: false, 
          error: `Invalid code. ${remainingAttempts} attempt(s) remaining.` 
        };
      }

      // OTP is valid - clear it and mark as used
      await storage.clearEmailOtp(userId);

      console.log(`✅ Login OTP verified for user ${userId}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to verify login OTP:', error);
      return { success: false, error: 'Failed to verify OTP. Please try again.' };
    }
  }

  /**
   * Disable email MFA for a user
   */
  static async disableEmailMfa(userId: string, currentPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Verify current password
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

      // Check if this is the only MFA method and it's required
      if (user.mfaRequired && !user.mfaEnabled && user.mfaEmailEnabled) {
        return { 
          success: false, 
          error: 'Cannot disable email MFA as it is your only authentication method and MFA is required for your account.' 
        };
      }

      // Disable email MFA
      await storage.disableEmailMfa(userId);

      console.log(`✅ Email MFA disabled for user ${userId}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to disable email MFA:', error);
      return { success: false, error: 'Failed to disable email MFA. Please try again.' };
    }
  }

  /**
   * Get email MFA status for a user
   */
  static async getEmailMfaStatus(userId: string): Promise<{
    enabled: boolean;
    setupAt?: Date;
    lastUsed?: Date;
  }> {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return { enabled: false };
      }

      return {
        enabled: user.mfaEmailEnabled || false,
        setupAt: user.mfaSetupAt ? new Date(user.mfaSetupAt) : undefined,
        lastUsed: user.mfaLastUsed ? new Date(user.mfaLastUsed) : undefined,
      };
    } catch (error) {
      console.error('Failed to get email MFA status:', error);
      return { enabled: false };
    }
  }
}

