import { auditLogs, type User } from "@shared/schema";
import { db } from "../db";
import type { Request } from "express";
import { eq, and, desc } from "drizzle-orm";

export class AuditService {
  static async logAction(
    user: User,
    action: string,
    req: Request,
    details: {
      resourceType?: string;
      resourceId?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        userId: user.id,
        action: action as any,
        resourceType: details.resourceType,
        resourceId: details.resourceId,
        details: details.metadata || {},
        ipAddress: this.getClientIP(req),
        userAgent: req.get('User-Agent') || '',
      });
    } catch (error) {
      console.error('Audit logging failed:', error);
      // Don't throw - audit failures shouldn't break app functionality
    }
  }

  private static getClientIP(req: Request): string {
    return (req.ip || 
           req.connection?.remoteAddress || 
           req.socket?.remoteAddress || 
           (req.connection as any)?.socket?.remoteAddress ||
           'unknown');
  }

  // Get audit trail for specific resource
  static async getAuditTrail(resourceType: string, resourceId: string) {
    return await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.resourceType, resourceType),
          eq(auditLogs.resourceId, resourceId)
        )
      )
      .orderBy(desc(auditLogs.timestamp));
  }

  // Get audit trail for specific user
  static async getUserAuditTrail(userId: string, limit: number = 100) {
    return await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit);
  }

  // Get recent audit logs (admin overview)
  static async getRecentAuditLogs(limit: number = 50) {
    return await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit);
  }

  // Log authentication events
  static async logLogin(user: User, req: Request, successful: boolean = true) {
    await this.logAction(user, 'USER_LOGIN', req, {
      resourceType: 'user',
      resourceId: user.id,
      metadata: { 
        successful, 
        email: user.email,
        role: user.role 
      }
    });
  }

  static async logLogout(user: User, req: Request) {
    await this.logAction(user, 'USER_LOGOUT', req, {
      resourceType: 'user',
      resourceId: user.id,
      metadata: { 
        email: user.email,
        role: user.role 
      }
    });
  }

  // Log document events
  static async logDocumentUpload(user: User, req: Request, documentId: string, documentType: string, filename: string) {
    await this.logAction(user, 'DOCUMENT_UPLOAD', req, {
      resourceType: 'document',
      resourceId: documentId,
      metadata: { 
        documentType,
        filename,
        action: 'upload'
      }
    });
  }

  static async logDocumentDownload(user: User, req: Request, documentId: string, filename: string) {
    await this.logAction(user, 'DOCUMENT_DOWNLOAD', req, {
      resourceType: 'document',
      resourceId: documentId,
      metadata: { 
        filename,
        action: 'download'
      }
    });
  }

  static async logDocumentStatusChange(user: User, req: Request, documentId: string, oldStatus: string, newStatus: string, rejectionReason?: string | null) {
    const action = newStatus === 'APPROVED' ? 'DOCUMENT_APPROVE' : 
                   newStatus === 'REJECTED' ? 'DOCUMENT_REJECT' : 
                   'DOCUMENT_STATUS_UPDATE';

    await this.logAction(user, action, req, {
      resourceType: 'document',
      resourceId: documentId,
      metadata: { 
        oldStatus,
        newStatus,
        rejectionReason: rejectionReason || undefined,
        action: 'status_change'
      }
    });
  }

  static async logDocumentDelete(user: User, req: Request, documentId: string, filename: string) {
    await this.logAction(user, 'DOCUMENT_DELETE', req, {
      resourceType: 'document',
      resourceId: documentId,
      metadata: { 
        filename,
        action: 'delete'
      }
    });
  }

  // Log client events
  static async logClientStatusUpdate(user: User, req: Request, clientId: string, oldStatus: string, newStatus: string) {
    await this.logAction(user, 'CLIENT_STATUS_UPDATE', req, {
      resourceType: 'client',
      resourceId: clientId,
      metadata: { 
        oldStatus,
        newStatus,
        action: 'status_update'
      }
    });
  }

  // Log admin impersonation events
  static async logImpersonationStart(admin: User, req: Request, targetUserId: string, targetUserEmail: string) {
    await this.logAction(admin, 'ADMIN_IMPERSONATE_START', req, {
      resourceType: 'user',
      resourceId: targetUserId,
      metadata: { 
        adminId: admin.id,
        adminEmail: admin.email,
        targetUserId,
        targetUserEmail,
        action: 'impersonate_start'
      }
    });
  }

  static async logImpersonationEnd(admin: User, req: Request, targetUserId: string, targetUserEmail: string) {
    await this.logAction(admin, 'ADMIN_IMPERSONATE_END', req, {
      resourceType: 'user',
      resourceId: targetUserId,
      metadata: { 
        adminId: admin.id,
        adminEmail: admin.email,
        targetUserId,
        targetUserEmail,
        action: 'impersonate_end'
      }
    });
  }

  // Log sensitive data access
  static async logSensitiveDataAccess(user: User, req: Request, clientId: string, dataType: string) {
    await this.logAction(user, 'SENSITIVE_DATA_ACCESS', req, {
      resourceType: 'sensitive_data',
      resourceId: clientId,
      metadata: { 
        dataType,
        action: 'access'
      }
    });
  }

  static async logSensitiveDataUpdate(user: User, req: Request, clientId: string, dataType: string, fieldsUpdated: string[]) {
    await this.logAction(user, 'SENSITIVE_DATA_UPDATE', req, {
      resourceType: 'sensitive_data',
      resourceId: clientId,
      metadata: { 
        dataType,
        fieldsUpdated,
        action: 'update'
      }
    });
  }
}
