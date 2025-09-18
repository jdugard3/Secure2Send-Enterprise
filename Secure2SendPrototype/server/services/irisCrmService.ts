import { env } from '../env';
import type { User, Document, Client } from '@shared/schema';

export interface IrisLead {
  campaign: number;
  status: number;
  source: number;
  group: number;
  users: number[];
  users_emails: string[];
  fields: Array<{
    id: string;
    record: string;
    value: string;
  }>;
}

export interface IrisLeadResponse {
  leadId: string;
  // Add other response fields as needed based on IRIS CRM API response
}

export interface ZapierDocumentPayload {
  leadId: string;
  document: {
    filename: string;
    originalName: string;
    documentType: string;
    fileSize: number;
    mimeType: string;
    // Either file URL (preferred) or base64 content
    fileUrl?: string;
    fileContent?: string;
  };
  client: {
    firstName: string;
    lastName: string;
    email: string;
    companyName: string;
  };
  uploadedAt: string;
}

export class IrisCrmService {
  private static readonly ZAPIER_DOCUMENT_WEBHOOK_URL = 'https://hooks.zapier.com/hooks/catch/15790762/umq3mle/';
  private static readonly ZAPIER_APPLICATION_WEBHOOK_URL = 'https://hooks.zapier.com/hooks/catch/15790762/umqr4bb/';

  /**
   * Get the IRIS CRM API base URL
   */
  private static getApiBaseUrl(): string {
    if (!env.IRIS_CRM_SUBDOMAIN) {
      throw new Error('IRIS_CRM_SUBDOMAIN not configured');
    }
    // Handle both URL patterns: subdomain.iriscrm.com and iris.subdomain.com
    if (env.IRIS_CRM_SUBDOMAIN === 'corduro') {
      return `https://iris.corduro.com/api/v1`;
    }
    return `https://${env.IRIS_CRM_SUBDOMAIN}.iriscrm.com/api/v1`;
  }

  /**
   * Create a new lead in IRIS CRM
   */
  static async createLead(user: User): Promise<string | null> {
    try {
      if (!env.IRIS_CRM_API_KEY || !env.IRIS_CRM_SUBDOMAIN) {
        console.warn('⚠️ IRIS CRM API key or subdomain not configured, skipping lead creation');
        return null;
      }

      // Using actual IDs from your IRIS CRM system
      const leadData: IrisLead = {
        campaign: 0,   // Your actual campaign ID
        status: 158,   // Your actual status ID  
        source: 0,     // Your actual source ID
        group: 51,     // Your actual group ID
        users: [280],  // Your actual user ID
        users_emails: ["admin@secure2send.com"], // Keep at least 1 email
        fields: [
          {
            id: "1", // First Name field ID
            record: "1",
            value: user.firstName || ''
          },
          {
            id: "2", // Last Name field ID
            record: "1",
            value: user.lastName || ''
          },
          {
            id: "4", // Email field ID
            record: "1",
            value: user.email
          },
          {
            id: "6", // Company field ID
            record: "1",
            value: user.companyName || ''
          }
        ]
      };

      console.log('🔄 Creating IRIS CRM lead for:', user.email);
      console.log('📤 Lead data being sent:', JSON.stringify(leadData, null, 2));

      const response = await fetch(`${this.getApiBaseUrl()}/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': env.IRIS_CRM_API_KEY,
          'accept': 'application/json',
        },
        body: JSON.stringify(leadData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`IRIS CRM API error: ${response.status} - ${errorText}`);
      }

      const result: IrisLeadResponse = await response.json();
      console.log('✅ IRIS CRM lead created successfully:', result.leadId);
      
      return result.leadId;
    } catch (error) {
      console.error('❌ Failed to create IRIS CRM lead:', error);
      // Don't throw - we want to continue with normal flow
      return null;
    }
  }

  /**
   * Send document to IRIS CRM via Zapier webhook
   */
  static async syncDocumentToIris(
    user: User, 
    document: Document, 
    leadId: string,
    filePath: string
  ): Promise<void> {
    try {
      console.log('🔄 Syncing document to IRIS CRM via Zapier:', document.originalName);

      // Read file and convert to base64
      const fs = await import('fs');
      const fileBuffer = fs.readFileSync(filePath);
      const fileContent = fileBuffer.toString('base64');

      const payload: ZapierDocumentPayload = {
        leadId,
        document: {
          filename: document.filename,
          originalName: document.originalName,
          documentType: document.documentType,
          fileSize: document.fileSize,
          mimeType: document.mimeType,
          fileContent,
        },
        client: {
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.email,
          companyName: user.companyName || '',
        },
        uploadedAt: new Date().toISOString(),
      };

      const response = await fetch(this.ZAPIER_DOCUMENT_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Zapier webhook error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Document synced to IRIS CRM successfully:', result);
    } catch (error) {
      console.error('❌ Failed to sync document to IRIS CRM:', error);
      // Don't throw - we want to continue with normal flow
    }
  }

  /**
   * Send document to IRIS CRM via Zapier webhook with URL (preferred) or Buffer fallback
   */
  static async syncDocumentToIrisWithUrl(
    user: User, 
    document: Document, 
    leadId: string,
    fileUrl?: string,
    fileBuffer?: Buffer
  ): Promise<void> {
    try {
      const method = fileUrl ? 'URL' : 'buffer';
      console.log(`🔄 Syncing document to IRIS CRM via Zapier (${method}):`, document.originalName);

      const payload: ZapierDocumentPayload = {
        leadId,
        document: {
          filename: document.filename,
          originalName: document.originalName,
          documentType: document.documentType,
          fileSize: document.fileSize,
          mimeType: document.mimeType,
          ...(fileUrl ? 
            { fileUrl } : 
            { fileContent: fileBuffer?.toString('base64') || '' }
          )
        },
        client: {
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.email,
          companyName: user.companyName || '',
        },
        uploadedAt: new Date().toISOString(),
      };

      console.log(`📤 Sending ${fileUrl ? 'file URL' : 'base64 content'} to Zapier webhook`);
      if (fileUrl) {
        console.log(`🔗 File URL: ${fileUrl}`);
      }

      const response = await fetch(this.ZAPIER_DOCUMENT_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Zapier webhook error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log(`✅ Document synced to IRIS CRM successfully (${method}):`, result);
    } catch (error) {
      console.error('❌ Failed to sync document to IRIS CRM:', error);
      // Don't throw - we want to continue with normal flow
    }
  }

  /**
   * Send document to IRIS CRM via Zapier webhook using a Buffer
   * (Used when file has already been read into memory)
   */
  static async syncDocumentToIrisWithBuffer(
    user: User, 
    document: Document, 
    leadId: string,
    fileBuffer: Buffer
  ): Promise<void> {
    return this.syncDocumentToIrisWithUrl(user, document, leadId, undefined, fileBuffer);
  }

  /**
   * Alternative method to sync document directly to IRIS CRM API
   * (in case you want to use direct API instead of Zapier webhook)
   */
  static async syncDocumentDirectly(
    leadId: string,
    document: Document,
    filePath: string
  ): Promise<void> {
    try {
      if (!env.IRIS_CRM_API_KEY || !env.IRIS_CRM_SUBDOMAIN) {
        console.warn('⚠️ IRIS CRM API key or subdomain not configured, skipping direct document sync');
        return;
      }

      console.log('🔄 Syncing document directly to IRIS CRM:', document.originalName);

      // Read file for upload
      const fs = await import('fs');
      const FormData = await import('form-data');
      
      const form = new FormData.default();
      form.append('file', fs.createReadStream(filePath));
      form.append('documentType', document.documentType);
      form.append('filename', document.originalName);

      const response = await fetch(`${this.getApiBaseUrl()}/leads/${leadId}/documents`, {
        method: 'POST',
        headers: {
          'X-API-KEY': env.IRIS_CRM_API_KEY,
          'accept': 'application/json',
          // Don't set Content-Type - let FormData set it with boundary
        },
        body: form as any,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`IRIS CRM document API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Document synced directly to IRIS CRM successfully:', result);
    } catch (error) {
      console.error('❌ Failed to sync document directly to IRIS CRM:', error);
      // Don't throw - we want to continue with normal flow
    }
  }

  /**
   * Send merchant application data to IRIS CRM via Zapier webhook
   */
  static async syncMerchantApplicationToIris(
    user: User,
    application: any,
    leadId: string
  ): Promise<void> {
    try {
      console.log('🔄 Syncing merchant application to IRIS CRM via Zapier:', application.id);

      const payload = {
        leadId,
        application: {
          id: application.id,
          status: application.status,
          legalBusinessName: application.legalBusinessName,
          dbaBusinessName: application.dbaBusinessName,
          billingAddress: application.billingAddress,
          locationAddress: application.locationAddress,
          city: application.city,
          state: application.state,
          zip: application.zip,
          businessPhone: application.businessPhone,
          businessFaxNumber: application.businessFaxNumber,
          customerServicePhone: application.customerServicePhone,
          federalTaxIdNumber: application.federalTaxIdNumber,
          contactName: application.contactName,
          contactPhoneNumber: application.contactPhoneNumber,
          contactEmail: application.contactEmail,
          websiteAddress: application.websiteAddress,
          processingCategories: application.processingCategories,
          ownershipType: application.ownershipType,
          principalOfficers: application.principalOfficers,
          bankName: application.bankName,
          abaRoutingNumber: application.abaRoutingNumber,
          accountName: application.accountName,
          ddaNumber: application.ddaNumber,
          feeScheduleData: application.feeScheduleData,
          supportingInformation: application.supportingInformation,
          equipmentData: application.equipmentData,
          beneficialOwners: application.beneficialOwners,
          corporateResolution: application.corporateResolution,
          merchantSignature: application.merchantSignature,
          merchantName: application.merchantName,
          merchantTitle: application.merchantTitle,
          merchantDate: application.merchantDate,
          submittedAt: application.submittedAt,
          createdAt: application.createdAt,
          updatedAt: application.updatedAt
        },
        client: {
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.email,
          companyName: user.companyName || '',
        },
      };

      const response = await fetch(this.ZAPIER_APPLICATION_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Zapier application webhook error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Merchant application synced to IRIS CRM successfully:', result);
    } catch (error) {
      console.error('❌ Failed to sync merchant application to IRIS CRM:', error);
      // Don't throw - we want to continue with normal flow
    }
  }

  /**
   * Update lead information in IRIS CRM
   */
  static async updateLead(leadId: string, updateData: Partial<IrisLead>): Promise<void> {
    try {
      if (!env.IRIS_CRM_API_KEY || !env.IRIS_CRM_SUBDOMAIN) {
        console.warn('⚠️ IRIS CRM API key or subdomain not configured, skipping lead update');
        return;
      }

      console.log('🔄 Updating IRIS CRM lead:', leadId);

      const response = await fetch(`${this.getApiBaseUrl()}/leads/${leadId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': env.IRIS_CRM_API_KEY,
          'accept': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`IRIS CRM update API error: ${response.status} - ${errorText}`);
      }

      console.log('✅ IRIS CRM lead updated successfully');
    } catch (error) {
      console.error('❌ Failed to update IRIS CRM lead:', error);
      // Don't throw - we want to continue with normal flow
    }
  }
}
