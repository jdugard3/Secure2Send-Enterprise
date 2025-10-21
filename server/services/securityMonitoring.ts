import { auditLogs, users } from "@shared/schema";
import { db } from "../db";
import { eq, and, gte, sql, desc } from "drizzle-orm";
import { EmailService } from "./emailService";
import { env } from "../env";

interface SecurityAlert {
  type: 'FAILED_LOGIN_ATTEMPTS' | 'SUSPICIOUS_FILE_ACCESS' | 'ADMIN_ACTION' | 'DATA_BREACH_ATTEMPT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  userId?: string;
  ipAddress?: string;
  details: Record<string, any>;
  timestamp: Date;
}

export class SecurityMonitoringService {
  private static alertThresholds = {
    FAILED_LOGIN_ATTEMPTS: 5, // Alert after 5 failed attempts in 15 minutes
    SUSPICIOUS_FILE_ACCESS: 10, // Alert after 10 file downloads in 5 minutes
    ADMIN_ACTIONS_PER_HOUR: 50, // Alert if admin performs more than 50 actions per hour
  };

  // Monitor failed login attempts
  static async checkFailedLoginAttempts(ipAddress: string, userId?: string): Promise<void> {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    
    try {
      // Count failed login attempts from this IP in the last 15 minutes
      const failedAttempts = await db
        .select({ count: sql<number>`count(*)` })
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.action, 'USER_LOGIN'),
            eq(auditLogs.ipAddress, ipAddress),
            gte(auditLogs.timestamp, fifteenMinutesAgo),
            sql`details->>'successful' = 'false'`
          )
        );

      const attemptCount = failedAttempts[0]?.count || 0;

      if (attemptCount >= this.alertThresholds.FAILED_LOGIN_ATTEMPTS) {
        await this.triggerSecurityAlert({
          type: 'FAILED_LOGIN_ATTEMPTS',
          severity: 'HIGH',
          userId,
          ipAddress,
          details: {
            attemptCount,
            timeWindow: '15 minutes',
            lastAttempt: new Date()
          },
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('Error checking failed login attempts:', error);
    }
  }

  // Monitor suspicious file access patterns
  static async checkSuspiciousFileAccess(userId: string, ipAddress: string): Promise<void> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    try {
      const fileAccess = await db
        .select({ count: sql<number>`count(*)` })
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.userId, userId),
            eq(auditLogs.action, 'DOCUMENT_DOWNLOAD'),
            gte(auditLogs.timestamp, fiveMinutesAgo)
          )
        );

      const accessCount = fileAccess[0]?.count || 0;

      if (accessCount >= this.alertThresholds.SUSPICIOUS_FILE_ACCESS) {
        await this.triggerSecurityAlert({
          type: 'SUSPICIOUS_FILE_ACCESS',
          severity: 'MEDIUM',
          userId,
          ipAddress,
          details: {
            downloadCount: accessCount,
            timeWindow: '5 minutes',
            timestamp: new Date()
          },
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('Error checking suspicious file access:', error);
    }
  }

  // Monitor admin activity
  static async checkAdminActivity(adminId: string, ipAddress: string): Promise<void> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    try {
      const adminActions = await db
        .select({ count: sql<number>`count(*)` })
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.userId, adminId),
            gte(auditLogs.timestamp, oneHourAgo),
            sql`action IN ('DOCUMENT_APPROVE', 'DOCUMENT_REJECT', 'CLIENT_STATUS_UPDATE', 'ADMIN_IMPERSONATE_START')`
          )
        );

      const actionCount = adminActions[0]?.count || 0;

      if (actionCount >= this.alertThresholds.ADMIN_ACTIONS_PER_HOUR) {
        await this.triggerSecurityAlert({
          type: 'ADMIN_ACTION',
          severity: 'MEDIUM',
          userId: adminId,
          ipAddress,
          details: {
            actionCount,
            timeWindow: '1 hour',
            timestamp: new Date()
          },
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('Error checking admin activity:', error);
    }
  }

  // Detect potential data breach attempts
  static async checkDataBreachAttempts(userId: string, ipAddress: string, action: string): Promise<void> {
    // Look for patterns that might indicate data breach attempts
    const suspiciousPatterns = [
      'SENSITIVE_DATA_ACCESS',
      'DOCUMENT_DOWNLOAD',
      'ADMIN_IMPERSONATE_START'
    ];

    if (!suspiciousPatterns.includes(action)) return;

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    try {
      // Check for multiple sensitive actions from same user/IP
      const sensitiveActions = await db
        .select({ count: sql<number>`count(*)` })
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.userId, userId),
            eq(auditLogs.ipAddress, ipAddress),
            gte(auditLogs.timestamp, oneHourAgo),
            sql`action IN ('SENSITIVE_DATA_ACCESS', 'DOCUMENT_DOWNLOAD', 'ADMIN_IMPERSONATE_START')`
          )
        );

      const actionCount = sensitiveActions[0]?.count || 0;

      if (actionCount >= 20) { // 20 sensitive actions in 1 hour
        await this.triggerSecurityAlert({
          type: 'DATA_BREACH_ATTEMPT',
          severity: 'CRITICAL',
          userId,
          ipAddress,
          details: {
            sensitiveActionCount: actionCount,
            timeWindow: '1 hour',
            lastAction: action,
            timestamp: new Date()
          },
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('Error checking data breach attempts:', error);
    }
  }

  // Trigger security alert
  private static async triggerSecurityAlert(alert: SecurityAlert): Promise<void> {
    try {
      // Log the security alert
      console.warn(`🚨 SECURITY ALERT [${alert.severity}]: ${alert.type}`, {
        userId: alert.userId,
        ipAddress: alert.ipAddress,
        details: alert.details,
        timestamp: alert.timestamp
      });

      // Get user details if available
      let userDetails = null;
      if (alert.userId) {
        const user = await db
          .select()
          .from(users)
          .where(eq(users.id, alert.userId))
          .limit(1);
        userDetails = user[0] || null;
      }

      // Send email alert to admins for HIGH and CRITICAL alerts
      if (alert.severity === 'HIGH' || alert.severity === 'CRITICAL') {
        await this.sendSecurityAlertEmail(alert, userDetails);
      }

      // In production, you would also:
      // 1. Send to SIEM system (Splunk, ELK, etc.)
      // 2. Create incident in incident management system
      // 3. Send to Slack/Teams for immediate notification
      // 4. Trigger automated response (IP blocking, account suspension)

    } catch (error) {
      console.error('Error triggering security alert:', error);
    }
  }

  // Send security alert email to admins
  private static async sendSecurityAlertEmail(alert: SecurityAlert, userDetails: any): Promise<void> {
    try {
      // Get all admin users
      const admins = await db
        .select()
        .from(users)
        .where(eq(users.role, 'ADMIN'));

      const alertDetails = {
        type: alert.type,
        severity: alert.severity,
        timestamp: alert.timestamp.toISOString(),
        ipAddress: alert.ipAddress || 'Unknown',
        userEmail: userDetails?.email || 'Unknown',
        userName: userDetails ? `${userDetails.firstName} ${userDetails.lastName}` : 'Unknown',
        details: JSON.stringify(alert.details, null, 2)
      };

      // Send alert to each admin
      for (const admin of admins) {
        await EmailService.sendSecurityAlert(admin, alertDetails);
      }
    } catch (error) {
      console.error('Error sending security alert email:', error);
    }
  }

  // Get security dashboard data
  static async getSecurityDashboard(timeRange: 'day' | 'week' | 'month' = 'day') {
    const timeRangeMap = {
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000
    };

    const startTime = new Date(Date.now() - timeRangeMap[timeRange]);

    try {
      // Failed login attempts
      const failedLogins = await db
        .select({ count: sql<number>`count(*)` })
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.action, 'USER_LOGIN'),
            gte(auditLogs.timestamp, startTime),
            sql`details->>'successful' = 'false'`
          )
        );

      // Successful logins
      const successfulLogins = await db
        .select({ count: sql<number>`count(*)` })
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.action, 'USER_LOGIN'),
            gte(auditLogs.timestamp, startTime),
            sql`details->>'successful' = 'true'`
          )
        );

      // Document downloads
      const documentDownloads = await db
        .select({ count: sql<number>`count(*)` })
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.action, 'DOCUMENT_DOWNLOAD'),
            gte(auditLogs.timestamp, startTime)
          )
        );

      // Admin actions
      const adminActions = await db
        .select({ count: sql<number>`count(*)` })
        .from(auditLogs)
        .where(
          and(
            gte(auditLogs.timestamp, startTime),
            sql`action IN ('DOCUMENT_APPROVE', 'DOCUMENT_REJECT', 'CLIENT_STATUS_UPDATE', 'ADMIN_IMPERSONATE_START')`
          )
        );

      // Recent suspicious activities
      const suspiciousActivities = await db
        .select()
        .from(auditLogs)
        .where(
          and(
            gte(auditLogs.timestamp, startTime),
            sql`action IN ('SENSITIVE_DATA_ACCESS', 'ADMIN_IMPERSONATE_START')`
          )
        )
        .orderBy(desc(auditLogs.timestamp))
        .limit(10);

      return {
        timeRange,
        metrics: {
          failedLogins: failedLogins[0]?.count || 0,
          successfulLogins: successfulLogins[0]?.count || 0,
          documentDownloads: documentDownloads[0]?.count || 0,
          adminActions: adminActions[0]?.count || 0
        },
        suspiciousActivities
      };
    } catch (error) {
      console.error('Error getting security dashboard:', error);
      throw error;
    }
  }
}

console.log("✅ Security monitoring service configured");
console.log("   - Failed login monitoring: enabled");
console.log("   - Suspicious file access monitoring: enabled");
console.log("   - Admin activity monitoring: enabled");
console.log("   - Data breach attempt detection: enabled");

