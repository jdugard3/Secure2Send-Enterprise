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
  // Webhook URLs are now loaded from environment variables for security
  private static get ZAPIER_DOCUMENT_WEBHOOK_URL() {
    return env.ZAPIER_DOCUMENT_WEBHOOK_URL;
  }
  
  private static get ZAPIER_APPLICATION_WEBHOOK_URL() {
    return env.ZAPIER_APPLICATION_WEBHOOK_URL;
  }

  // IRIS CRM Pipeline Stage Mappings
  // Based on actual IRIS CRM configuration
  private static readonly PIPELINE_STAGES = {
    OPS_PRE_ACTIVE: { status: 158, group: 51 },              // When account is initially created
    SALES_PRE_SALE: { status: 187, group: 48 },              // When application is saved as draft
    SALES_READY_FOR_REVIEW: { status: 193, group: 1 },       // When application is submitted
    UNDERWRITING_READY_FOR_REVIEW: { status: 171, group: 1 }, // When application is approved
    SALES_DECLINED: { status: 149, group: 28 },              // When application is denied/rejected
  } as const;

  /**
   * Format date to IRIS CRM expected format (mm/dd/yyyy)
   * Uses UTC methods to avoid timezone conversion issues
   */
  private static formatDate(dateString: string): string {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      
      // Use UTC methods to avoid timezone conversion issues
      const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
      const day = date.getUTCDate().toString().padStart(2, '0');
      const year = date.getUTCFullYear();
      
      return `${month}/${day}/${year}`;
    } catch {
      return '';
    }
  }

  /**
   * Format phone number to IRIS CRM expected format (111-111-1111)
   * Validates against NANP (North American Numbering Plan) rules
   */
  private static formatPhone(phoneString: string): string {
    if (!phoneString) return '';
    
    // Remove all non-digits
    const digits = phoneString.replace(/\D/g, '');
    
    // Must be exactly 10 digits
    if (digits.length !== 10) {
      console.warn(`⚠️ Invalid phone number length (${digits.length} digits): ${phoneString}`);
      return '';
    }
    
    // Get area code and exchange
    const areaCode = digits.slice(0, 3);
    const exchange = digits.slice(3, 6);
    
    // NANP Validation Rules:
    // 1. Area code cannot start with 0 or 1
    // 2. Area code cannot be N11 (211, 311, 411, etc.)
    // 3. Exchange cannot start with 0 or 1
    // 4. Exchange cannot be N11
    
    const areaCodeFirst = areaCode[0];
    const exchangeFirst = exchange[0];
    
    // Check area code first digit (cannot be 0 or 1)
    if (areaCodeFirst === '0' || areaCodeFirst === '1') {
      console.warn(`⚠️ Invalid area code (starts with ${areaCodeFirst}): ${phoneString}`);
      return '';
    }
    
    // Check if area code is N11 (like 211, 311, 411, 511, 611, 711, 811, 911)
    if (areaCode[1] === '1' && areaCode[2] === '1') {
      console.warn(`⚠️ Invalid area code (N11 format): ${phoneString}`);
      return '';
    }
    
    // Check exchange first digit (cannot be 0 or 1)
    if (exchangeFirst === '0' || exchangeFirst === '1') {
      console.warn(`⚠️ Invalid exchange (starts with ${exchangeFirst}): ${phoneString}`);
      return '';
    }
    
    // Check if exchange is N11
    if (exchange[1] === '1' && exchange[2] === '1') {
      console.warn(`⚠️ Invalid exchange (N11 format): ${phoneString}`);
      return '';
    }
    
    // Additional check: Reject common test/dummy numbers
    const invalidAreaCodes = ['000', '555', '999', '666', '888'];
    if (invalidAreaCodes.includes(areaCode)) {
      console.warn(`⚠️ Invalid/reserved area code (${areaCode}): ${phoneString}`);
      return '';
    }
    
    // Check for obviously fake patterns (all same digit, sequential, etc.)
    if (digits === '0000000000' || digits === '1111111111' || 
        digits === '2222222222' || digits === '1234567890') {
      console.warn(`⚠️ Invalid phone number pattern: ${phoneString}`);
      return '';
    }
    
    // Format as 111-111-1111
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }

  /**
   * Map application values to valid IRIS dropdown options
   */
  private static mapDropdownValue(fieldId: string, value: any): string {
    // Handle boolean conversion first
    if (typeof value === 'boolean') {
      value = value.toString();
    }
    
    const dropdownMappings: Record<string, Record<string, string>> = {
      '3861': { // Entity Type - Based on actual IRIS values
        'SOLE_PROPRIETORSHIP': 'Sole Proprietorship',
        'SOLE PROPRIETORSHIP': 'Sole Proprietorship',
        'LLC': 'LLC', 
        'NON_PROFIT': 'Non-Profit',
        'NON-PROFIT': 'Non-Profit',
        'CORPORATION_PRIVATELY_HELD': 'Corporation',
        'CORPORATION': 'Corporation',
        'PARTNERSHIP_LLP': 'Partnership',
        'PARTNERSHIP': 'Partnership',
        'S_CORP': 'S-Corporation',
        'S-CORP': 'S-Corporation',
      },
      '4269': { // Owner Country - US only
        'US': 'US',
        'USA': 'US', 
        'United States': 'US',
      },
      '4270': { // FR Country - US only
        'US': 'US',
        'USA': 'US',
        'United States': 'US',
      },
      '4305': { // BO's Issuing Country - US only
        'US': 'US',
        'USA': 'US',
        'United States': 'US',
      },
      '4298': { // BO's ID Type - IRIS accepts various formats
        'DRIVERS_LICENSE': "Driver's License",
        'DRIVER_LICENSE': "Driver's License",
        "DRIVER'S LICENSE": "Driver's License",
        'PASSPORT': 'Passport',
        'STATE_ID': 'State ID',
      },
      '4273': { // Multiple Locations - Boolean to Yes/No
        'true': 'No',  // Default to No if not specified
        'false': 'No',
        'Yes': 'Yes',
        'No': 'No',
      },
      '4297': { // BO Control Person - Boolean to Yes/No (default Yes based on diagnostic)
        'true': 'Yes',
        'false': 'No', 
        'Yes': 'Yes',
        'No': 'No',
      },
      '4307': { // BO SSN or TIN from US - Boolean to Yes/No
        'true': 'Yes',
        'false': 'No',
        'Yes': 'Yes', 
        'No': 'No',
      },
      '3779': { // Owner/Officer - Same as FR Owner/Officer
        'Owner': 'Owner',
        'OWNER': 'Owner',
        'Officer': 'Officer',
        'OFFICER': 'Officer',
        'N/A': 'N/A',
        '': 'N/A',
      },
      '3792': { // FR Owner/Officer - Default to N/A
        'Owner': 'Owner',
        'OWNER': 'Owner',
        'Officer': 'Officer',
        'OFFICER': 'Officer',
        'N/A': 'N/A',
        '': 'N/A',
      },
      '4278': { // Business Type - Keep Retail as primary
        'Retail': 'Retail',
        'RETAIL': 'Retail',
        'E-commerce': 'E-commerce',
        'Restaurant': 'Restaurant',
      },
      '4174': { // Previously Processed - Default to "(Please select)"
        'true': '(Please select)',
        'false': '(Please select)',
        'Yes': 'Yes',
        'No': 'No',
        '': '(Please select)',
      },
      '4316': { // Automatic Billing - Default to "(Please select)"
        'true': '(Please select)',
        'false': '(Please select)', 
        'Yes': 'Yes',
        'No': 'No',
        '': '(Please select)',
      },
      '4181': { // Refund/Guarantee - Note different capitalization from 4174/4316
        'true': '(Please Select)',
        'false': '(Please Select)',
        'Yes': 'Yes',
        'No': 'No',
        '': '(Please Select)',
      }
    };
    
    // Return mapped value if it exists, otherwise return empty string
    // Empty strings will be filtered out before sending to IRIS
    // This prevents sending invalid values that IRIS will reject
    const mappedValue = dropdownMappings[fieldId]?.[value];
    if (mappedValue !== undefined) {
      return mappedValue;
    }
    
    // For fields without mappings, return the value as-is (for text fields)
    // For fields with mappings but unmapped values, return empty to skip them
    if (dropdownMappings[fieldId]) {
      console.warn(`⚠️ Unmapped value for field ${fieldId}: "${value}" - skipping field`);
      return '';
    }
    
    return value;
  }

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
   * Update lead status and group (move to different pipeline stage)
   */
  static async updateLeadStatus(
    leadId: string,
    stage: keyof typeof IrisCrmService.PIPELINE_STAGES
  ): Promise<void> {
    try {
      if (!env.IRIS_CRM_API_KEY || !env.IRIS_CRM_SUBDOMAIN) {
        console.warn('⚠️ IRIS CRM API key or subdomain not configured, skipping lead status update');
        return;
      }

      const { status, group } = this.PIPELINE_STAGES[stage];

      console.log(`🔄 Updating IRIS CRM lead ${leadId} to pipeline stage: ${stage}`);
      console.log(`   Status: ${status}, Group: ${group}`);

      const updateData = {
        status,
        group,
      };

      const response = await fetch(`${this.getApiBaseUrl()}/leads/${leadId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': env.IRIS_CRM_API_KEY,
          'accept': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`IRIS CRM status update API error: ${response.status} - ${errorText}`);
      }

      console.log(`✅ IRIS CRM lead ${leadId} successfully moved to ${stage}`);
    } catch (error) {
      console.error(`❌ Failed to update IRIS CRM lead status to ${stage}:`, error);
      // Don't throw - we want to continue with normal flow
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
      // Check if webhook URL is configured
      if (!this.ZAPIER_DOCUMENT_WEBHOOK_URL) {
        console.warn('⚠️ ZAPIER_DOCUMENT_WEBHOOK_URL not configured, skipping document sync to IRIS');
        return;
      }

      console.log('🔄 Syncing document to IRIS CRM via Zapier:', document.originalName);

      // Read file and convert to base64
      const fs = await import('fs');
      const fileBuffer = fs.readFileSync(filePath);
      const fileContent = fileBuffer.toString('base64');

      const payload = {
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
        // Security: Include authentication token (flattened for Zapier)
        auth_token: env.ZAPIER_WEBHOOK_SECRET || '',
        auth_timestamp: new Date().toISOString(),
      };

      const response = await fetch(this.ZAPIER_DOCUMENT_WEBHOOK_URL!, {
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
      // Check if webhook URL is configured
      if (!this.ZAPIER_DOCUMENT_WEBHOOK_URL) {
        console.warn('⚠️ ZAPIER_DOCUMENT_WEBHOOK_URL not configured, skipping document sync to IRIS');
        return;
      }

      const method = fileUrl ? 'URL' : 'buffer';
      console.log(`🔄 Syncing document to IRIS CRM via Zapier (${method}):`, document.originalName);

      const payload = {
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
        // Security: Include authentication token (flattened for Zapier)
        auth_token: env.ZAPIER_WEBHOOK_SECRET || '',
        auth_timestamp: new Date().toISOString(),
      };

      console.log(`📤 Sending ${fileUrl ? 'file URL' : 'base64 content'} to Zapier webhook`);
      if (fileUrl) {
        console.log(`🔗 File URL: ${fileUrl}`);
      }

      const response = await fetch(this.ZAPIER_DOCUMENT_WEBHOOK_URL!, {
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
      // Check if webhook URL is configured
      if (!this.ZAPIER_APPLICATION_WEBHOOK_URL) {
        console.warn('⚠️ ZAPIER_APPLICATION_WEBHOOK_URL not configured, skipping application sync to IRIS');
        return;
      }

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
          mpaSignedDate: this.formatDate(application.mpaSignedDate),
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
          entityStartDate: this.formatDate(application.entityStartDate),
          
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
          ownerBirthday: this.formatDate(application.ownerBirthday),
          ownerStateIssuedIdNumber: application.ownerStateIssuedIdNumber,
          ownerIdExpDate: this.formatDate(application.ownerIdExpDate),
          ownerIssuingState: application.ownerIssuingState,
          ownerIdDateIssued: this.formatDate(application.ownerIdDateIssued),
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
          
          // Complex Objects - Format dates in nested objects
          principalOfficers: application.principalOfficers ? application.principalOfficers.map((officer: any) => ({
            ...officer,
            dob: this.formatDate(officer.dob)
          })) : application.principalOfficers,
          beneficialOwners: application.beneficialOwners ? application.beneficialOwners.map((bo: any) => ({
            ...bo,
            dob: this.formatDate(bo.dob),
            idDateIssued: this.formatDate(bo.idDateIssued),
            idExpDate: this.formatDate(bo.idExpDate)
          })) : application.beneficialOwners,
          financialRepresentative: application.financialRepresentative ? {
            ...application.financialRepresentative,
            birthday: this.formatDate(application.financialRepresentative.birthday),
            idExpDate: this.formatDate(application.financialRepresentative.idExpDate)
          } : application.financialRepresentative,
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
          merchantDate: this.formatDate(application.merchantDate),
          agreementAccepted: application.agreementAccepted,
          corduroSignature: application.corduroSignature,
          corduroName: application.corduroName,
          corduroTitle: application.corduroTitle,
          corduroDate: this.formatDate(application.corduroDate)
        },
        client: {
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.email,
          companyName: user.companyName || '',
        },
        // Security: Include authentication token (flattened for Zapier)
        auth_token: env.ZAPIER_WEBHOOK_SECRET || '',
        auth_timestamp: new Date().toISOString(),
      };

      // Debug: Log the payload being sent to Zapier
      console.log('📤 Sending payload to Zapier webhook:', JSON.stringify(payload, null, 2));

      const response = await fetch(this.ZAPIER_APPLICATION_WEBHOOK_URL!, {
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

      // IRIS CRM Field ID Mapping - Using ACTUAL field IDs with proper formatting
      const fieldMappings = [
        // MPA and Sales Information  
        { id: '3920', value: this.formatDate(application.mpaSignedDate) }, // MPA Signed Date
        { id: '4190', value: application.salesRepName || '' }, // Sales Rep Name
        
        // DBA Information
        { id: '1', value: application.dbaBusinessName || '' }, // *DBA Name
        { id: '3887', value: application.locationAddress || '' }, // *Location Address
        { id: '3888', value: application.city || '' }, // *Location City
        { id: '3889', value: application.state || '' }, // *Location State
        { id: '3890', value: application.zip || '' }, // *Location ZIP
        { id: '9', value: this.formatPhone(application.businessPhone) }, // *Location Phone Number
        { id: '3895', value: application.contactEmail || '' }, // *Location Contact Email
        { id: '3858', value: application.productOrServiceSold || '' }, // *Product or Service Sold
        { id: '3853', value: application.dbaWebsite || '' }, // DBA Website
        { id: '4273', value: this.mapDropdownValue('4273', application.multipleLocations ? 'Yes' : 'No') }, // Multiple Locations?
        
        // Corporate Information
        { id: '2', value: application.legalBusinessName || '' }, // *Legal Name
        { id: '4', value: application.billingAddress || '' }, // *Legal Address
        { id: '6', value: application.city || '' }, // *Legal City (using same city as location)
        { id: '7', value: application.state || '' }, // *Legal State (using same state as location)
        { id: '8', value: application.zip || '' }, // *Legal ZIP (using same zip as location)
        { id: '4271', value: application.legalContactName || '' }, // Legal Contact Name
        { id: '27', value: this.formatPhone(application.legalPhone) }, // *Legal Phone
        { id: '3852', value: application.legalEmail || '' }, // *Legal Email
        { id: '3861', value: this.mapDropdownValue('3861', application.ownershipType) }, // *Entity Type
        { id: '22', value: application.federalTaxIdNumber || '' }, // *Federal Tax ID
        { id: '21', value: application.incorporationState || '' }, // *Incorporation State
        { id: '20', value: this.formatDate(application.entityStartDate) }, // *Entity Start Date
        
        // Transaction and Volume
        { id: '3950', value: application.averageTicket || '' }, // Average Ticket
        { id: '3952', value: application.highTicket || '' }, // High Ticket
        { id: '4061', value: application.monthlySalesVolume || '' }, // Monthly Sales Volume
        { id: '3951', value: application.annualVolume || '' }, // Annual Volume
        { id: '4062', value: application.monthlyTransactions?.toString() || '' }, // Monthly # of Transactions
        { id: '4248', value: application.annualTransactions?.toString() || '' }, // Annual # of Transactions
        
        // Banking Information
        { id: '4254', value: application.accountOwnerFirstName || '' }, // Account Owner First Name
        { id: '4255', value: application.accountOwnerLastName || '' }, // Account Owner Last Name
        { id: '3916', value: application.nameOnBankAccount || '' }, // Name on Bank Account
        { id: '3909', value: application.bankName || '' }, // *Bank Name
        { id: '3910', value: application.abaRoutingNumber || '' }, // *Routing Number
        { id: '3911', value: application.ddaNumber || '' }, // *Account Number
        { id: '4326', value: application.bankOfficerName || '' }, // Bank Officer Name
        { id: '4327', value: this.formatPhone(application.bankOfficerPhone) }, // Bank Officer Phone
        { id: '4328', value: application.bankOfficerEmail || '' }, // Bank Officer Email
        
        // Owner Information
        { id: '4274', value: application.ownerFullName || '' }, // Owner Full Name
        { id: '3782', value: application.ownerFirstName || '' }, // *First Name
        { id: '3781', value: application.ownerLastName || '' }, // *Last Name
        { id: '3779', value: this.mapDropdownValue('3779', application.ownerOfficer) }, // Owner/Officer
        { id: '3780', value: application.ownerTitle || '' }, // *Title (free text field)
        { id: '3778', value: application.ownerOwnershipPercentage?.toString() || '' }, // *Ownership
        { id: '3777', value: this.formatPhone(application.ownerMobilePhone) }, // Owner Mobile Phone Number
        { id: '3871', value: application.ownerEmail || '' }, // Owner Email
        { id: '3872', value: application.ownerSsn || '' }, // Owner SS#
        { id: '3870', value: this.formatDate(application.ownerBirthday) }, // Owner Birthday
        { id: '3868', value: application.ownerStateIssuedIdNumber || '' }, // State Issued ID Number
        { id: '4245', value: this.formatDate(application.ownerIdExpDate) }, // Exp Date
        { id: '3869', value: application.ownerIssuingState || '' }, // Issuing State
        { id: '4322', value: this.formatDate(application.ownerIdDateIssued) }, // Owner ID Date Issued
        { id: '3775', value: application.ownerLegalAddress || '' }, // Owner Legal Address
        { id: '3774', value: application.ownerCity || '' }, // Owner City
        { id: '3773', value: application.ownerState || '' }, // Owner State
        { id: '3772', value: application.ownerZip || '' }, // Owner Zip
        { id: '4269', value: this.mapDropdownValue('4269', application.ownerCountry) }, // Owner Country
        
        // Financial Representative (if exists)
        ...(application.financialRepresentative ? [
          { id: '4318', value: application.financialRepresentative.fullName || '' }, // FR Full Name
          { id: '3796', value: application.financialRepresentative.firstName || '' }, // FR First Name
          { id: '3797', value: application.financialRepresentative.lastName || '' }, // FR Last Name
          { id: '3795', value: application.financialRepresentative.title || '' }, // FR Title
          { id: '3792', value: this.mapDropdownValue('3792', application.financialRepresentative.ownerOfficer) }, // FR Owner/Officer
          { id: '4150', value: application.financialRepresentative.ownershipPercentage?.toString() || '' }, // FR Ownership %
          { id: '3786', value: this.formatPhone(application.financialRepresentative.officePhone) }, // FR Office Phone Number
          { id: '3787', value: this.formatPhone(application.financialRepresentative.mobilePhone) }, // FR Mobile Phone Number
          { id: '4048', value: application.financialRepresentative.email || '' }, // Financial Rep Email
          { id: '3794', value: application.financialRepresentative.ssn || '' }, // FR Social Security Number
          { id: '3783', value: this.formatDate(application.financialRepresentative.birthday) }, // FR Birthday
          { id: '3785', value: application.financialRepresentative.stateIssuedIdNumber || '' }, // FR State Issued ID Number
          { id: '4244', value: this.formatDate(application.financialRepresentative.idExpDate) }, // FR Exp Date
          { id: '3784', value: application.financialRepresentative.issuingState || '' }, // FR Issuing State
          { id: '3791', value: application.financialRepresentative.legalStreetAddress || '' }, // FR Legal Street Address
          { id: '3790', value: application.financialRepresentative.city || '' }, // FR City
          { id: '3789', value: application.financialRepresentative.state || '' }, // FR State
          { id: '3788', value: application.financialRepresentative.zip || '' }, // FR Zip
          { id: '4270', value: this.mapDropdownValue('4270', application.financialRepresentative.country) }, // FR Country
        ] : []),
        
        // Business Operations - Auto-filled fields as specified
        { id: '4278', value: 'Retail' }, // Business Type - Autofill "Retail"
        // Field 3860 (Processed Cards in Past) is a LABEL - cannot be updated
        { id: '4174', value: '(Please select)' }, // Previously Processed? - Default placeholder
        { id: '3859', value: 'N/A' }, // If Yes, Under What Name? - Autofill "N/A"
        { id: '4316', value: '(Please select)' }, // Automatic Billing? - Default placeholder
        // Field 4107 (Cardholder Data 3rd Party) is a LABEL - cannot be updated
        
        // Refund/Guarantee Information
        { id: '4181', value: application.refundGuarantee ? 'Yes' : '(Please Select)' }, // Refund/Guarantee? - Default placeholder
        { id: '4141', value: application.refundDays?.toString() || '' }, // Refund # Days
        
        // POS System - Removed as it's a label field that shouldn't be updated
        
        // Beneficial Owners (if any)
        ...(application.beneficialOwners && application.beneficialOwners.length > 0 ? [
          { id: '4288', value: application.beneficialOwners[0]?.name || '' }, // BO FullName
          { id: '4289', value: application.beneficialOwners[0]?.title || '' }, // BO Title
          { id: '4290', value: application.beneficialOwners[0]?.ownershipPercentage?.toString() || '' }, // BO Entity Ownership %
          { id: '4291', value: application.beneficialOwners[0]?.residentialAddress || '' }, // BO's Home Address
          { id: '4292', value: application.beneficialOwners[0]?.city || '' }, // BO's City
          { id: '4293', value: application.beneficialOwners[0]?.state || '' }, // BO's State
          { id: '4294', value: application.beneficialOwners[0]?.zip || '' }, // BO's ZIP
          { id: '4305', value: this.mapDropdownValue('4305', application.beneficialOwners[0]?.country) }, // BO's Issuing Country
          { id: '4298', value: this.mapDropdownValue('4298', application.beneficialOwners[0]?.idType) }, // BO's ID Type
          { id: '4302', value: application.beneficialOwners[0]?.idNumber || '' }, // BO's Number on ID
          { id: '4306', value: this.formatDate(application.beneficialOwners[0]?.idDateIssued) }, // BO ID Date Issued
          { id: '4301', value: this.formatDate(application.beneficialOwners[0]?.idExpDate) }, // BO ID Expiration Date
          { id: '4295', value: this.formatDate(application.beneficialOwners[0]?.dob) }, // BO Date of Birth
          { id: '4307', value: this.mapDropdownValue('4307', application.beneficialOwners[0]?.ssnOrTinFromUs ? 'Yes' : 'No') }, // BO SSN or TIN from US?
          { id: '4296', value: application.beneficialOwners[0]?.ssn || '' }, // BO Social Security Number
          { id: '4297', value: this.mapDropdownValue('4297', application.beneficialOwners[0]?.controlPerson ? 'Yes' : 'No') }, // BO Control Person?
        ] : []),
        
        // Authorized Contacts (if any)
        ...(application.authorizedContacts && application.authorizedContacts.length > 0 ? [
          { id: '3848', value: application.authorizedContacts[0]?.firstName || '' }, // AC1 First Name
          { id: '3917', value: application.authorizedContacts[0]?.lastName || '' }, // AC1 Last Name
          { id: '4050', value: application.authorizedContacts[0]?.title || '' }, // AC1 Title
          { id: '3847', value: application.authorizedContacts[0]?.email || '' }, // AC1 Email
          { id: '3846', value: this.formatPhone(application.authorizedContacts[0]?.officePhone) }, // AC1 Office Phone Number
          { id: '4151', value: this.formatPhone(application.authorizedContacts[0]?.mobilePhone) }, // AC1 Mobile Phone Number
        ] : []),
        
        // Application Status and Agreement
        // Field 4317 (Application Notes) is a LABEL - cannot be updated
      ];

      // Filter out empty values to avoid overwriting existing data with blanks
      const validFields = fieldMappings.filter(field => 
        field.value && 
        field.value.toString().trim() !== ''
      );

      if (validFields.length === 0) {
        console.log('⚠️ No valid fields to update in IRIS CRM');
        return;
      }

      const updateData: Partial<IrisLead> = {
        fields: validFields.map(field => ({
          id: field.id,
          record: "1", // Use "1" as the record number for main lead record
          value: field.value
        }))
      };

      console.log(`📤 Updating ${validFields.length} fields in IRIS CRM lead:`, leadId);
      console.log('🔍 Fields being updated:', validFields.map(f => `${f.id}: ${f.value}`).join(', '));

      const response = await fetch(`${this.getApiBaseUrl()}/leads/${leadId}`, {
        method: 'PATCH', // Use PATCH instead of PUT
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

  /**
   * Upload a PDF document to IRIS CRM (Step 1 of e-signature workflow)
   * Reference: https://www.iriscrm.com/api/#/paths/~1leads~1{leadId}~1documents/post
   * @param leadId IRIS CRM lead ID
   * @param pdfBuffer PDF file buffer to upload
   * @param filename Filename for the document
   * @returns Document ID from IRIS
   */
  static async uploadDocument(
    leadId: string,
    pdfBuffer: Buffer,
    filename: string
  ): Promise<number> {
    try {
      if (!env.IRIS_CRM_API_KEY || !env.IRIS_CRM_SUBDOMAIN) {
        throw new Error('IRIS CRM API key or subdomain not configured');
      }

      const apiUrl = `${this.getApiBaseUrl()}/leads/${leadId}/documents`;
      console.log(`🔄 Uploading document to IRIS CRM for lead ${leadId}`);
      console.log(`📍 IRIS Document Upload API URL: ${apiUrl}`);

      // Create form data with the PDF
      const FormData = (await import('form-data')).default;
      const form = new FormData();
      
      // Append the PDF file with proper field name
      form.append('file', pdfBuffer, {
        filename: filename,
        contentType: 'application/pdf',
      });
      
      // Add required IRIS API fields
      form.append('filename', filename);
      form.append('label', 'Merchant Application'); // Document label/title
      form.append('tab', 'Documents'); // Tab/category in IRIS

      console.log(`📤 Uploading PDF (${pdfBuffer.length} bytes) to IRIS...`);

      // Use axios for better multipart/form-data support (same as SignNow)
      const axios = (await import('axios')).default;

      const response = await axios.post(apiUrl, form, {
        headers: {
          'X-API-KEY': env.IRIS_CRM_API_KEY,
          'accept': 'application/json',
          ...form.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      console.log(`📥 IRIS API Response Status: ${response.status}`);
      console.log('✅ Document uploaded to IRIS successfully:', response.data);
      
      // Return the document ID from IRIS response
      return response.data.id || response.data.documentId || response.data.document_id;
    } catch (error) {
      console.error('❌ Failed to upload document to IRIS:', error);
      throw error;
    }
  }

  /**
   * Generate an e-signature application in IRIS CRM (Step 2 of e-signature workflow)
   * @param leadId IRIS CRM lead ID (integer)
   * @param fieldId IRIS field ID for e-signature application (integer)
   * @param expirePrevious Whether to expire previously generated applications
   * @returns Generated application ID
   */
  static async generateESignatureApplication(
    leadId: string,
    fieldId: number,
    expirePrevious: boolean = false
  ): Promise<string> {
    try {
      if (!env.IRIS_CRM_API_KEY || !env.IRIS_CRM_SUBDOMAIN) {
        throw new Error('IRIS CRM API key or subdomain not configured');
      }

      const apiUrl = `${this.getApiBaseUrl()}/leads/${leadId}/signatures/${fieldId}/generate`;
      console.log(`🔄 Generating e-signature application for lead ${leadId}, field ${fieldId}`);
      console.log(`📍 IRIS E-Signature Generate API URL: ${apiUrl}`);

      const payload = {
        expire: expirePrevious
      };

      console.log(`📤 Sending generate request with payload:`, payload);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': env.IRIS_CRM_API_KEY,
          'accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log(`📥 IRIS API Response Status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ IRIS E-Signature Generate Error:`, errorText);
        console.error(`❌ Endpoint: ${apiUrl}`);
        console.error(`❌ Lead ID: ${leadId}, Field ID: ${fieldId}`);
        throw new Error(`IRIS e-signature generate API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ E-signature application generated successfully:', result);
      
      // Return the application ID from response
      return result.applicationId || result.id || fieldId.toString();
    } catch (error) {
      console.error('❌ Failed to generate e-signature application:', error);
      throw error;
    }
  }

  /**
   * Send an e-signature document for signing
   * @param leadId IRIS CRM lead ID
   * @param applicationId E-signature application ID
   * @param recipientEmail Email of the signer
   * @param recipientName Name of the signer
   */
  static async sendESignatureDocument(
    leadId: string,
    applicationId: string,
    recipientEmail: string,
    recipientName: string
  ): Promise<void> {
    try {
      if (!env.IRIS_CRM_API_KEY || !env.IRIS_CRM_SUBDOMAIN) {
        throw new Error('IRIS CRM API key or subdomain not configured');
      }

      console.log(`🔄 Sending e-signature document to ${recipientEmail}`);

      const payload = {
        recipient_email: recipientEmail,
        recipient_name: recipientName,
      };

      const response = await fetch(
        `${this.getApiBaseUrl()}/leads/${leadId}/signatures/${applicationId}/send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': env.IRIS_CRM_API_KEY,
            'accept': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`IRIS e-signature send API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ E-signature document sent successfully:', result);
    } catch (error) {
      console.error('❌ Failed to send e-signature document:', error);
      throw error;
    }
  }

  /**
   * Get the status of an e-signature document
   * @param applicationId E-signature application ID
   */
  static async getESignatureStatus(applicationId: string): Promise<{
    status: 'PENDING' | 'SIGNED' | 'DECLINED' | 'EXPIRED';
    signedAt?: string;
  }> {
    try {
      if (!env.IRIS_CRM_API_KEY || !env.IRIS_CRM_SUBDOMAIN) {
        throw new Error('IRIS CRM API key or subdomain not configured');
      }

      console.log(`🔄 Checking e-signature status for application ${applicationId}`);

      const response = await fetch(
        `${this.getApiBaseUrl()}/leads/signatures/${applicationId}/status`,
        {
          method: 'GET',
          headers: {
            'X-API-KEY': env.IRIS_CRM_API_KEY,
            'accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`IRIS e-signature status API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ E-signature status retrieved:', result);
      
      return result;
    } catch (error) {
      console.error('❌ Failed to get e-signature status:', error);
      throw error;
    }
  }

  /**
   * Download a signed document from IRIS CRM
   * @param applicationId E-signature application ID
   */
  static async downloadSignedDocument(applicationId: string): Promise<Buffer> {
    try {
      if (!env.IRIS_CRM_API_KEY || !env.IRIS_CRM_SUBDOMAIN) {
        throw new Error('IRIS CRM API key or subdomain not configured');
      }

      console.log(`🔄 Downloading signed document for application ${applicationId}`);

      const response = await fetch(
        `${this.getApiBaseUrl()}/leads/signatures/${applicationId}/download`,
        {
          method: 'GET',
          headers: {
            'X-API-KEY': env.IRIS_CRM_API_KEY,
            'accept': 'application/pdf',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`IRIS e-signature download API error: ${response.status} - ${errorText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      console.log(`✅ Signed document downloaded successfully: ${buffer.length} bytes`);
      
      return buffer;
    } catch (error) {
      console.error('❌ Failed to download signed document:', error);
      throw error;
    }
  }
}
