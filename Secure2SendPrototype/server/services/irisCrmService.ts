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
            id: "6", // First Name field ID
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
            id: "1", // Company field ID
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
          // Basic Application Info
          id: application.id,
          status: application.status,
          submittedAt: application.submittedAt,
          createdAt: application.createdAt,
          updatedAt: application.updatedAt,
          
          // MPA and Sales Information
          mpaSignedDate: application.mpaSignedDate,
          salesRepName: application.salesRepName,
          
          // DBA Information
          dbaBusinessName: application.dbaBusinessName,
          dbaWebsite: application.dbaWebsite,
          locationAddress: application.locationAddress,
          productOrServiceSold: application.productOrServiceSold,
          city: application.city,
          state: application.state,
          zip: application.zip,
          multipleLocations: application.multipleLocations,
          businessPhone: application.businessPhone,
          contactEmail: application.contactEmail,
          
          // Corporate Information
          legalBusinessName: application.legalBusinessName,
          billingAddress: application.billingAddress,
          legalContactName: application.legalContactName,
          legalPhone: application.legalPhone,
          legalEmail: application.legalEmail,
          ownershipType: application.ownershipType,
          federalTaxIdNumber: application.federalTaxIdNumber,
          incorporationState: application.incorporationState,
          entityStartDate: application.entityStartDate,
          
          // Transaction and Volume
          averageTicket: application.averageTicket,
          highTicket: application.highTicket,
          monthlySalesVolume: application.monthlySalesVolume,
          monthlyTransactions: application.monthlyTransactions,
          annualVolume: application.annualVolume,
          annualTransactions: application.annualTransactions,
          
          // Enhanced Banking Information
          accountOwnerFirstName: application.accountOwnerFirstName,
          accountOwnerLastName: application.accountOwnerLastName,
          nameOnBankAccount: application.nameOnBankAccount,
          bankName: application.bankName,
          abaRoutingNumber: application.abaRoutingNumber,
          ddaNumber: application.ddaNumber,
          bankOfficerName: application.bankOfficerName,
          bankOfficerPhone: application.bankOfficerPhone,
          bankOfficerEmail: application.bankOfficerEmail,
          
          // Enhanced Owner Information
          ownerFullName: application.ownerFullName,
          ownerFirstName: application.ownerFirstName,
          ownerLastName: application.ownerLastName,
          ownerOfficer: application.ownerOfficer,
          ownerTitle: application.ownerTitle,
          ownerOwnershipPercentage: application.ownerOwnershipPercentage,
          ownerMobilePhone: application.ownerMobilePhone,
          ownerEmail: application.ownerEmail,
          ownerSsn: application.ownerSsn,
          ownerBirthday: application.ownerBirthday,
          ownerStateIssuedIdNumber: application.ownerStateIssuedIdNumber,
          ownerIdExpDate: application.ownerIdExpDate,
          ownerIssuingState: application.ownerIssuingState,
          ownerIdDateIssued: application.ownerIdDateIssued,
          ownerLegalAddress: application.ownerLegalAddress,
          ownerCity: application.ownerCity,
          ownerState: application.ownerState,
          ownerZip: application.ownerZip,
          ownerCountry: application.ownerCountry,
          
          // Business Operations
          businessType: application.businessType,
          refundGuarantee: application.refundGuarantee,
          refundDays: application.refundDays,
          posSystem: application.posSystem,
          processingCategories: application.processingCategories,
          
          // Complex Objects
          principalOfficers: application.principalOfficers,
          beneficialOwners: application.beneficialOwners,
          financialRepresentative: application.financialRepresentative,
          authorizedContacts: application.authorizedContacts,
          
          // Legacy Fields (for backward compatibility)
          businessFaxNumber: application.businessFaxNumber,
          customerServicePhone: application.customerServicePhone,
          contactName: application.contactName,
          contactPhoneNumber: application.contactPhoneNumber,
          websiteAddress: application.websiteAddress,
          accountName: application.accountName,
          feeScheduleData: application.feeScheduleData,
          supportingInformation: application.supportingInformation,
          equipmentData: application.equipmentData,
          
          // Certification Fields
          processedCardsPast: application.processedCardsPast,
          previouslyProcessed: application.previouslyProcessed,
          automaticBilling: application.automaticBilling,
          cardholderData3rdParty: application.cardholderData3rdParty,
          corporateResolution: application.corporateResolution,
          merchantSignature: application.merchantSignature,
          merchantName: application.merchantName,
          merchantTitle: application.merchantTitle,
          merchantDate: application.merchantDate,
          agreementAccepted: application.agreementAccepted,
          corduroSignature: application.corduroSignature,
          corduroName: application.corduroName,
          corduroTitle: application.corduroTitle,
          corduroDate: application.corduroDate
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
   * Map merchant application fields to IRIS CRM field IDs and update lead
   */
  static async updateLeadWithMerchantApplication(
    leadId: string,
    application: any
  ): Promise<void> {
    try {
      if (!env.IRIS_CRM_API_KEY || !env.IRIS_CRM_SUBDOMAIN) {
        console.warn('⚠️ IRIS CRM API key or subdomain not configured, skipping lead update');
        return;
      }

      console.log('🔄 Updating IRIS CRM lead with merchant application data:', leadId);

      // IRIS CRM Field ID Mapping
      // Note: These field IDs should be updated based on your actual IRIS CRM configuration
      const fieldMappings = [
        // Basic Business Information
        { id: 'field_legal_business_name', value: application.legalBusinessName || '' },
        { id: 'field_dba_name', value: application.dbaBusinessName || '' },
        { id: 'field_dba_website', value: application.dbaWebsite || '' },
        { id: 'field_business_phone', value: application.businessPhone || '' },
        { id: 'field_contact_email', value: application.contactEmail || '' },
        { id: 'field_federal_tax_id', value: application.federalTaxIdNumber || '' },
        
        // Address Information
        { id: 'field_location_address', value: application.locationAddress || '' },
        { id: 'field_city', value: application.city || '' },
        { id: 'field_state', value: application.state || '' },
        { id: 'field_zip_code', value: application.zip || '' },
        
        // Corporate Information
        { id: 'field_legal_contact_name', value: application.legalContactName || '' },
        { id: 'field_legal_phone', value: application.legalPhone || '' },
        { id: 'field_legal_email', value: application.legalEmail || '' },
        { id: 'field_ownership_type', value: application.ownershipType || '' },
        { id: 'field_incorporation_state', value: application.incorporationState || '' },
        { id: 'field_entity_start_date', value: application.entityStartDate || '' },
        
        // Transaction and Volume
        { id: 'field_average_ticket', value: application.averageTicket || '' },
        { id: 'field_high_ticket', value: application.highTicket || '' },
        { id: 'field_monthly_sales_volume', value: application.monthlySalesVolume || '' },
        { id: 'field_monthly_transactions', value: application.monthlyTransactions?.toString() || '' },
        { id: 'field_annual_volume', value: application.annualVolume || '' },
        { id: 'field_annual_transactions', value: application.annualTransactions?.toString() || '' },
        
        // Banking Information
        { id: 'field_account_owner_first_name', value: application.accountOwnerFirstName || '' },
        { id: 'field_account_owner_last_name', value: application.accountOwnerLastName || '' },
        { id: 'field_name_on_bank_account', value: application.nameOnBankAccount || '' },
        { id: 'field_bank_name', value: application.bankName || '' },
        { id: 'field_aba_routing_number', value: application.abaRoutingNumber || '' },
        { id: 'field_account_number', value: application.ddaNumber || '' },
        { id: 'field_bank_officer_name', value: application.bankOfficerName || '' },
        { id: 'field_bank_officer_phone', value: application.bankOfficerPhone || '' },
        { id: 'field_bank_officer_email', value: application.bankOfficerEmail || '' },
        
        // Business Operations
        { id: 'field_business_type', value: application.businessType || '' },
        { id: 'field_product_service_sold', value: application.productOrServiceSold || '' },
        { id: 'field_pos_system', value: application.posSystem || '' },
        { id: 'field_refund_guarantee', value: application.refundGuarantee ? 'Yes' : 'No' },
        { id: 'field_refund_days', value: application.refundDays?.toString() || '' },
        { id: 'field_multiple_locations', value: application.multipleLocations ? 'Yes' : 'No' },
        
        // MPA and Sales Information
        { id: 'field_mpa_signed_date', value: application.mpaSignedDate || '' },
        { id: 'field_sales_rep_name', value: application.salesRepName || '' },
        
        // Owner Information
        { id: 'field_owner_full_name', value: application.ownerFullName || '' },
        { id: 'field_owner_first_name', value: application.ownerFirstName || '' },
        { id: 'field_owner_last_name', value: application.ownerLastName || '' },
        { id: 'field_owner_title', value: application.ownerTitle || '' },
        { id: 'field_owner_ownership_percentage', value: application.ownerOwnershipPercentage?.toString() || '' },
        { id: 'field_owner_mobile_phone', value: application.ownerMobilePhone || '' },
        { id: 'field_owner_email', value: application.ownerEmail || '' },
        { id: 'field_owner_country', value: application.ownerCountry || '' },
        
        // Application Status
        { id: 'field_application_status', value: application.status || '' },
        { id: 'field_agreement_accepted', value: application.agreementAccepted ? 'Yes' : 'No' },
      ];

      // Filter out empty values to avoid overwriting existing data with blanks
      const validFields = fieldMappings.filter(field => field.value && field.value.trim() !== '');

      if (validFields.length === 0) {
        console.log('⚠️ No valid fields to update in IRIS CRM');
        return;
      }

      const updateData: Partial<IrisLead> = {
        fields: validFields.map(field => ({
          id: field.id,
          record: leadId,
          value: field.value
        }))
      };

      console.log(`📤 Updating ${validFields.length} fields in IRIS CRM lead:`, leadId);
      console.log('🔍 Fields being updated:', validFields.map(f => `${f.id}: ${f.value}`).join(', '));

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
        throw new Error(`IRIS CRM field mapping API error: ${response.status} - ${errorText}`);
      }

      console.log('✅ IRIS CRM lead updated successfully with merchant application data');
    } catch (error) {
      console.error('❌ Failed to update IRIS CRM lead with merchant application:', error);
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
