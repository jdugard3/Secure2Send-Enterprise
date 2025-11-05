import Mailgun from 'mailgun.js';
import FormData from 'form-data';
import { render } from '@react-email/render';
import { env } from '../env';
import { WelcomeEmail } from '../emails/WelcomeEmail';
import { AccountCreatedEmail } from '../emails/AccountCreatedEmail';
import { DocumentUploadedEmail } from '../emails/DocumentUploadedEmail';
import { DocumentApprovedEmail } from '../emails/DocumentApprovedEmail';
import { DocumentRejectedEmail } from '../emails/DocumentRejectedEmail';
import { AllDocumentsApprovedEmail } from '../emails/AllDocumentsApprovedEmail';
import { NewUserNotificationEmail } from '../emails/NewUserNotificationEmail';
import { NewDocumentNotificationEmail } from '../emails/NewDocumentNotificationEmail';
import { SecurityAlertEmail } from '../emails/SecurityAlertEmail';
import { MfaEnabledEmail } from '../emails/MfaEnabledEmail';
import { MfaDisabledEmail } from '../emails/MfaDisabledEmail';
import { MfaOtpEmail } from '../emails/MfaOtpEmail';
import { MfaMethodChangedEmail } from '../emails/MfaMethodChangedEmail';
import type { User, Document, Client } from '@shared/schema';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Initialize Mailgun email provider
let mailgun: any = null;
if (env.MAILGUN_API_KEY && env.MAILGUN_DOMAIN) {
  const mg = new Mailgun(FormData);
  mailgun = mg.client({
    username: 'api',
    key: env.MAILGUN_API_KEY,
  });
}

export class EmailService {
  private static readonly FROM_EMAIL = env.MAILGUN_FROM_EMAIL || 'Secure2Send <noreply@yourdomain.com>';
  private static readonly ADMIN_EMAIL = env.ADMIN_EMAIL || 'james@smartclick.systems';

  /**
   * Send welcome email to new user
   */
  static async sendWelcomeEmail(user: User): Promise<void> {
    try {
      const emailHtml = await render(WelcomeEmail({
        firstName: user.firstName || 'there',
        companyName: user.companyName || '',
        appUrl: env.APP_URL!,
      }));

      await this.sendEmail({
        to: user.email,
        subject: 'Welcome to Secure2Send - Your Account is Ready!',
        html: emailHtml,
      });

      console.log(`✅ Welcome email sent to ${user.email}`);
    } catch (error) {
      console.error('❌ Failed to send welcome email:', error);
      // Don't throw - email failures shouldn't break the registration flow
    }
  }

  /**
   * Send account created email when admin creates user account
   */
  static async sendAccountCreatedEmail(user: User, temporaryPassword: string): Promise<void> {
    try {
      const emailHtml = await render(AccountCreatedEmail({
        firstName: user.firstName || 'there',
        companyName: user.companyName || '',
        email: user.email,
        temporaryPassword,
        appUrl: env.APP_URL!,
      }));

      await this.sendEmail({
        to: user.email,
        subject: 'Your Secure2Send Account Has Been Created',
        html: emailHtml,
      });

      console.log(`✅ Account created email sent to ${user.email}`);
    } catch (error) {
      console.error('❌ Failed to send account created email:', error);
    }
  }

  /**
   * Send document uploaded confirmation email
   */
  static async sendDocumentUploadedEmail(user: User, document: Document): Promise<void> {
    try {
      const emailHtml = await render(DocumentUploadedEmail({
        firstName: user.firstName || 'there',
        documentType: document.documentType,
        documentName: document.originalName,
        appUrl: env.APP_URL!,
      }));

      await this.sendEmail({
        to: user.email,
        subject: 'Document Uploaded Successfully - Secure2Send',
        html: emailHtml,
      });

      console.log(`✅ Document uploaded email sent to ${user.email} for ${document.documentType}`);
    } catch (error) {
      console.error('❌ Failed to send document uploaded email:', error);
    }
  }

  /**
   * Send document approved notification
   */
  static async sendDocumentApprovedEmail(user: User, document: Document): Promise<void> {
    try {
      const emailHtml = await render(DocumentApprovedEmail({
        firstName: user.firstName || 'there',
        documentType: document.documentType,
        documentName: document.originalName,
        appUrl: env.APP_URL!,
      }));

      await this.sendEmail({
        to: user.email,
        subject: '✅ Document Approved - Secure2Send',
        html: emailHtml,
      });

      console.log(`✅ Document approved email sent to ${user.email} for ${document.documentType}`);
    } catch (error) {
      console.error('❌ Failed to send document approved email:', error);
    }
  }

  /**
   * Send document rejected notification
   */
  static async sendDocumentRejectedEmail(user: User, document: Document, rejectionReason: string): Promise<void> {
    try {
      const emailHtml = await render(DocumentRejectedEmail({
        firstName: user.firstName || 'there',
        documentType: document.documentType,
        documentName: document.originalName,
        rejectionReason,
        appUrl: env.APP_URL!,
      }));

      await this.sendEmail({
        to: user.email,
        subject: 'Document Requires Attention - Secure2Send',
        html: emailHtml,
      });

      console.log(`✅ Document rejected email sent to ${user.email} for ${document.documentType}`);
    } catch (error) {
      console.error('❌ Failed to send document rejected email:', error);
    }
  }

  /**
   * Send all documents approved celebration email
   */
  static async sendAllDocumentsApprovedEmail(user: User): Promise<void> {
    try {
      const emailHtml = await render(AllDocumentsApprovedEmail({
        firstName: user.firstName || 'there',
        companyName: user.companyName || '',
        appUrl: env.APP_URL!,
      }));

      await this.sendEmail({
        to: user.email,
        subject: '🎉 Congratulations! All Documents Approved - Secure2Send',
        html: emailHtml,
      });

      console.log(`✅ All documents approved email sent to ${user.email}`);
    } catch (error) {
      console.error('❌ Failed to send all documents approved email:', error);
    }
  }

  /**
   * Send new user registration notification to ALL admins
   */
  static async sendNewUserNotificationEmail(user: User): Promise<void> {
    try {
      const adminEmails = await this.getAdminEmails();
      
      const emailHtml = await render(NewUserNotificationEmail({
        firstName: user.firstName || 'Unknown',
        lastName: user.lastName || 'User',
        email: user.email,
        companyName: user.companyName || 'Not provided',
        registrationDate: new Date().toLocaleDateString(),
        appUrl: env.APP_URL!,
      }));

      // Send to all admin emails
      for (const adminEmail of adminEmails) {
        await this.sendEmail({
          to: adminEmail,
          subject: 'New User Registration - Secure2Send',
          html: emailHtml,
        });
      }

      console.log(`✅ New user notification email sent to ${adminEmails.length} admin(s) for ${user.email}`);
    } catch (error) {
      console.error('❌ Failed to send new user notification email:', error);
    }
  }

  /**
   * Send new document uploaded notification to ALL admins
   */
  static async sendNewDocumentNotificationEmail(user: User, document: Document): Promise<void> {
    try {
      const adminEmails = await this.getAdminEmails();
      
      const emailHtml = await render(NewDocumentNotificationEmail({
        firstName: user.firstName || 'Unknown',
        lastName: user.lastName || 'User',
        email: user.email,
        companyName: user.companyName || 'Not provided',
        documentType: document.documentType,
        documentName: document.originalName,
        uploadDate: new Date().toLocaleDateString(),
        appUrl: env.APP_URL!,
      }));

      // Send to all admin emails
      for (const adminEmail of adminEmails) {
        await this.sendEmail({
          to: adminEmail,
          subject: 'New Document Uploaded for Review - Secure2Send',
          html: emailHtml,
        });
      }

      console.log(`✅ New document notification email sent to ${adminEmails.length} admin(s) for ${document.documentType} from ${user.email}`);
    } catch (error) {
      console.error('❌ Failed to send new document notification email:', error);
    }
  }

  /**
   * Core email sending method with multiple provider support
   */
  private static async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    const { to, subject, html } = options;

    // Console mode - log to console
    if (env.EMAIL_PROVIDER === 'console') {
      console.log('\n📧 EMAIL (Console Mode)');
      console.log('=====================================');
      console.log(`Provider: Console`);
      console.log(`To: ${to}`);
      console.log(`From: ${this.FROM_EMAIL}`);
      console.log(`Subject: ${subject}`);
      console.log('-------------------------------------');
      console.log('HTML Preview:');
      console.log(html.substring(0, 500) + '...');
      console.log('=====================================\n');
      return;
    }

    // Mailgun provider
    if (env.EMAIL_PROVIDER === 'mailgun') {
      if (!mailgun || !env.MAILGUN_DOMAIN) {
        throw new Error('Mailgun API key or domain not configured');
      }

      try {
        const result = await mailgun.messages.create(env.MAILGUN_DOMAIN, {
          from: this.FROM_EMAIL,
          to: [to],
          subject,
          html,
        });

        console.log(`✅ Email sent via Mailgun to ${to} (ID: ${result.id})`);
      } catch (error) {
        console.error(`❌ Failed to send email via Mailgun to ${to}:`, error);
        throw error;
      }
      return;
    }

    throw new Error(`Unknown email provider: ${env.EMAIL_PROVIDER}`);
  }

  /**
   * Send security alert email to admin
   */
  static async sendSecurityAlert(admin: User, alertDetails: {
    type: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    timestamp: string;
    ipAddress: string;
    userEmail: string;
    userName: string;
    details: string;
  }): Promise<void> {
    try {
      const emailHtml = await render(SecurityAlertEmail({
        adminName: admin.firstName || 'Admin',
        alertType: alertDetails.type,
        severity: alertDetails.severity,
        timestamp: alertDetails.timestamp,
        ipAddress: alertDetails.ipAddress,
        userEmail: alertDetails.userEmail,
        userName: alertDetails.userName,
        details: alertDetails.details,
        appUrl: env.APP_URL!,
      }));

      await this.sendEmail({
        to: admin.email,
        subject: `🚨 Security Alert: ${alertDetails.type} - ${alertDetails.severity} Priority`,
        html: emailHtml,
      });

      console.log(`✅ Security alert email sent to ${admin.email} for ${alertDetails.type}`);
    } catch (error) {
      console.error('❌ Failed to send security alert email:', error);
    }
  }

  /**
   * Send MFA enabled notification email
   */
  static async sendMfaEnabledEmail(user: User): Promise<void> {
    try {
      const emailHtml = await render(MfaEnabledEmail({
        firstName: user.firstName || 'there',
        appUrl: env.APP_URL!,
      }));

      await this.sendEmail({
        to: user.email,
        subject: '🔐 Multi-Factor Authentication Enabled - Secure2Send',
        html: emailHtml,
      });

      console.log(`✅ MFA enabled email sent to ${user.email}`);
    } catch (error) {
      console.error('❌ Failed to send MFA enabled email:', error);
    }
  }

  /**
   * Send MFA disabled notification email
   */
  static async sendMfaDisabledEmail(user: User): Promise<void> {
    try {
      const emailHtml = await render(MfaDisabledEmail({
        firstName: user.firstName || 'there',
        appUrl: env.APP_URL!,
      }));

      await this.sendEmail({
        to: user.email,
        subject: '⚠️ Multi-Factor Authentication Disabled - Secure2Send',
        html: emailHtml,
      });

      console.log(`✅ MFA disabled email sent to ${user.email}`);
    } catch (error) {
      console.error('❌ Failed to send MFA disabled email:', error);
    }
  }

  /**
   * Send MFA OTP code via email
   */
  static async sendMfaOtpEmail(user: User, otpCode: string, expiresInMinutes: number = 5): Promise<void> {
    try {
      const emailHtml = await render(MfaOtpEmail({
        firstName: user.firstName || 'there',
        otpCode,
        expiresInMinutes,
      }));

      await this.sendEmail({
        to: user.email,
        subject: `Your Secure2Send verification code: ${otpCode}`,
        html: emailHtml,
      });

      console.log(`✅ MFA OTP email sent to ${user.email}`);
    } catch (error) {
      console.error('❌ Failed to send MFA OTP email:', error);
      throw error; // Re-throw so caller knows it failed
    }
  }

  /**
   * Send MFA method changed notification email
   */
  static async sendMfaMethodChangedEmail(
    user: User, 
    action: 'enabled' | 'disabled', 
    method: 'email' | 'authenticator'
  ): Promise<void> {
    try {
      const emailHtml = await render(MfaMethodChangedEmail({
        firstName: user.firstName || 'there',
        action,
        method,
        timestamp: new Date(),
        appUrl: env.APP_URL!,
      }));

      const methodName = method === 'email' ? 'Email Verification' : 'Authenticator App';
      const actionText = action === 'enabled' ? 'Enabled' : 'Disabled';

      await this.sendEmail({
        to: user.email,
        subject: `🔒 Security Alert: ${methodName} ${actionText} - Secure2Send`,
        html: emailHtml,
      });

      console.log(`✅ MFA method changed email sent to ${user.email} (${method} ${action})`);
    } catch (error) {
      console.error('❌ Failed to send MFA method changed email:', error);
    }
  }

  /**
   * Helper method to get all admin emails from the database
   */
  static async getAdminEmails(): Promise<string[]> {
    try {
      // Fetch all admin users from the database
      const adminUsers = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.role, 'ADMIN'));
      
      const adminEmails = adminUsers.map(admin => admin.email);
      
      // Fallback to configured admin email if no admins found in database
      if (adminEmails.length === 0) {
        console.warn('⚠️ No admin users found in database, using fallback ADMIN_EMAIL');
        return [this.ADMIN_EMAIL];
      }
      
      console.log(`📧 Found ${adminEmails.length} admin email(s):`, adminEmails);
      return adminEmails;
    } catch (error) {
      console.error('❌ Failed to fetch admin emails from database:', error);
      // Fallback to configured admin email on error
      return [this.ADMIN_EMAIL];
    }
  }
}
