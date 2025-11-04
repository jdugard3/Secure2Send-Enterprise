import FormData from 'form-data';
import { env } from '../env';

interface SignNowDocumentUploadResponse {
  id: string;
}

interface SignNowFieldResponse {
  id: string;
}

interface SignNowSigner {
  email: string;
  role_id?: string;
  role?: string;
  order: number;
  reassign?: string;
  decline_by_signature?: string;
  expiration_days?: number;
  reminder?: number;
  authentication_type?: string;
  password?: string;
  password_method?: string;
  attributes?: Array<{
    name: string;
    value: string;
  }>;
}

interface SignNowInvitePayload {
  document_id: string;
  to: SignNowSigner[];
  from: string;
  subject?: string;
  message?: string;
  cc?: string[];
  redirect_uri?: string;
  decline_redirect_uri?: string;
}

interface SignNowDocumentStatus {
  id: string;
  user_id: string;
  document_name: string;
  page_count: number;
  created: string;
  updated: string;
  original_filename: string;
  owner: string;
  template: boolean;
  signatures: Array<{
    id: string;
    page_number: number;
    email: string;
    created: string;
    updated?: string;
    signed?: string;
    user_id?: string;
    element_id: string;
  }>;
}

export class SignNowService {
  private static getApiBaseUrl(): string {
    return env.SIGNNOW_API_BASE_URL || 'https://api.signnow.com';
  }

  /**
   * Get the API key and validate it's configured
   */
  private static getApiKey(): string {
    if (!env.SIGNNOW_API_KEY) {
      throw new Error('SignNow API key not configured. Please set SIGNNOW_API_KEY in your .env file.');
    }
    return env.SIGNNOW_API_KEY;
  }

  /**
   * Get authorization headers for SignNow API requests
   */
  private static getAuthHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.getApiKey()}`,
    };
  }

  /**
   * Upload a PDF document to SignNow using axios for better multipart support
   */
  static async uploadDocument(
    pdfBuffer: Buffer,
    filename: string
  ): Promise<string> {
    try {
      console.log(`📤 Uploading document to SignNow: ${filename}`);
      console.log(`📦 Buffer size: ${pdfBuffer.length} bytes`);

      // Use axios for better multipart/form-data support
      const axios = (await import('axios')).default;
      const FormData = (await import('form-data')).default;

      const form = new FormData();
      form.append('file', pdfBuffer, {
        filename: filename,
        contentType: 'application/pdf',
      });

      console.log(`📤 Sending upload request to SignNow...`);

      const response = await axios.post(
        `${this.getApiBaseUrl()}/document`,
        form,
        {
          headers: {
            ...this.getAuthHeaders(),
            ...form.getHeaders(),
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }
      );

      console.log(`✅ Document uploaded to SignNow, ID: ${response.data.id}`);
      
      return response.data.id;
    } catch (error: any) {
      console.error('❌ SignNow document upload failed');
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', JSON.stringify(error.response.data));
        throw new Error(`SignNow upload failed: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else {
        console.error('Error:', error.message);
        throw error;
      }
    }
  }

  /**
   * Create a simple freeform invite (no roles/fields required)
   * Signers can click anywhere on the document to sign
   */
  static async createFreeformInvite(
    documentId: string,
    toEmail: string,
    fromEmail: string,
    subject?: string,
    message?: string
  ): Promise<void> {
    try {
      console.log(`📧 Creating freeform signing invite for document ${documentId}`);
      console.log(`📤 Sending to: ${toEmail} from: ${fromEmail}`);

      const payload = {
        to: toEmail,
        from: fromEmail,
        subject: subject || 'Please sign this document',
        message: message || 'You have been requested to sign a document. Please review and sign.',
      };

      console.log(`📤 Sending freeform invite...`);

      const response = await fetch(`${this.getApiBaseUrl()}/document/${documentId}/invite`, {
        method: 'POST',
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ SignNow freeform invite failed:', errorText);
        throw new Error(`SignNow invite failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Freeform invite sent successfully:', result);
    } catch (error) {
      console.error('❌ Failed to create SignNow freeform invite:', error);
      throw error;
    }
  }

  /**
   * Add signature fields to a document for multiple signers
   */
  static async addSignatureFields(
    documentId: string,
    signers: Array<{ email: string; name: string; role: string }>
  ): Promise<void> {
    try {
      console.log(`✍️  Adding signature fields to document ${documentId}`);

      // Add signature fields for each signer
      // Field positions: page 1, bottom of document for signatures
      const fields = {
        fields: signers.map((signer, index) => ({
          type: 'signature',
          page_number: 0, // First page (0-indexed)
          x: 100 + (index * 250), // Space signatures horizontally
          y: 700, // Near bottom of page
          width: 200,
          height: 50,
          required: true,
          role: signer.role,
        }))
      };

      console.log(`📤 Adding ${signers.length} signature fields...`);

      const response = await fetch(`${this.getApiBaseUrl()}/document/${documentId}`, {
        method: 'PUT',
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fields),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to add signature fields:', errorText);
        throw new Error(`Failed to add signature fields: ${response.status} - ${errorText}`);
      }

      console.log('✅ Signature fields added successfully');
    } catch (error) {
      console.error('❌ Failed to add signature fields:', error);
      throw error;
    }
  }

  /**
   * Create a signing invite with multiple signers
   */
  static async createInvite(
    documentId: string,
    signers: Array<{ email: string; name: string; order: number }>,
    fromEmail: string,
    subject?: string,
    message?: string
  ): Promise<void> {
    try {
      console.log(`📧 Creating signing invite for document ${documentId}`);
      console.log(`👥 Signers:`, signers.map(s => `${s.name} (${s.email}) - Order: ${s.order}`));

      // For freeform invites (email-based signing), we don't specify authentication_type
      const signNowSigners: SignNowSigner[] = signers.map(signer => ({
        email: signer.email,
        order: signer.order,
      }));

      const payload: SignNowInvitePayload = {
        document_id: documentId,
        to: signNowSigners,
        from: fromEmail,
        subject: subject || 'Please sign this document',
        message: message || 'You have been requested to sign a document. Please review and sign.',
      };

      console.log(`📤 Sending invite payload:`, JSON.stringify(payload, null, 2));

      const response = await fetch(`${this.getApiBaseUrl()}/document/${documentId}/invite`, {
        method: 'POST',
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ SignNow invite creation failed:', errorText);
        throw new Error(`SignNow invite failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Signing invites sent successfully:', result);
    } catch (error) {
      console.error('❌ Failed to create SignNow invite:', error);
      throw error;
    }
  }

  /**
   * Get document status including signature completion
   */
  static async getDocumentStatus(documentId: string): Promise<{
    status: 'NOT_SENT' | 'PENDING' | 'SIGNED' | 'DECLINED' | 'EXPIRED';
    signers: Array<{
      email: string;
      signed: boolean;
      signedAt?: string;
    }>;
    completedAt?: string;
  }> {
    try {
      console.log(`🔍 Checking status for document ${documentId}`);

      const response = await fetch(`${this.getApiBaseUrl()}/document/${documentId}`, {
        method: 'GET',
        headers: {
          ...this.getAuthHeaders(),
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ SignNow status check failed:', errorText);
        throw new Error(`SignNow status check failed: ${response.status} - ${errorText}`);
      }

      const data: SignNowDocumentStatus = await response.json();
      
      console.log('📄 Raw SignNow document data:', JSON.stringify(data, null, 2));
      
      // Analyze signatures
      // In SignNow, if a signature has 'data' (base64 image), it means it's been signed
      const signers = data.signatures?.map(sig => ({
        email: sig.email,
        signed: !!(sig.data && sig.data.length > 0), // Check if signature data exists
        signedAt: sig.created ? new Date(parseInt(sig.created) * 1000).toISOString() : undefined,
      })) || [];

      console.log(`📝 Found ${signers.length} signature fields`);
      console.log(`✍️  Signers:`, signers);

      const allSigned = signers.length > 0 && signers.every(s => s.signed);
      const anySigned = signers.some(s => s.signed);
      
      let status: 'NOT_SENT' | 'PENDING' | 'SIGNED' | 'DECLINED' | 'EXPIRED';
      if (allSigned) {
        status = 'SIGNED';
      } else if (anySigned) {
        status = 'PENDING'; // Partially signed
      } else {
        status = 'PENDING'; // Awaiting all signatures
      }

      const completedAt = allSigned 
        ? signers.reduce((latest, s) => {
            if (!s.signedAt) return latest;
            if (!latest) return s.signedAt;
            return new Date(s.signedAt) > new Date(latest) ? s.signedAt : latest;
          }, undefined as string | undefined)
        : undefined;

      console.log(`📊 Calculated status: ${status} (allSigned: ${allSigned}, anySigned: ${anySigned})`);
      console.log(`📊 Signers detail:`, { signers, completedAt });

      return {
        status,
        signers,
        completedAt,
      };
    } catch (error) {
      console.error('❌ Failed to get SignNow document status:', error);
      throw error;
    }
  }

  /**
   * Download the signed document
   */
  static async downloadSignedDocument(documentId: string): Promise<Buffer> {
    try {
      console.log(`📥 Downloading signed document ${documentId}`);

      const response = await fetch(
        `${this.getApiBaseUrl()}/document/${documentId}/download?type=collapsed`,
        {
          method: 'GET',
          headers: {
            ...this.getAuthHeaders(),
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ SignNow document download failed:', errorText);
        throw new Error(`SignNow download failed: ${response.status} - ${errorText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      console.log(`✅ Document downloaded successfully (${buffer.length} bytes)`);
      
      return buffer;
    } catch (error) {
      console.error('❌ Failed to download document from SignNow:', error);
      throw error;
    }
  }

  /**
   * Cancel a pending document invite (optional)
   */
  static async cancelInvite(documentId: string): Promise<void> {
    try {
      console.log(`🚫 Canceling invite for document ${documentId}`);

      const response = await fetch(`${this.getApiBaseUrl()}/document/${documentId}`, {
        method: 'DELETE',
        headers: {
          ...this.getAuthHeaders(),
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ SignNow cancel invite failed:', errorText);
        throw new Error(`SignNow cancel failed: ${response.status} - ${errorText}`);
      }

      console.log('✅ Invite canceled successfully');
    } catch (error) {
      console.error('❌ Failed to cancel SignNow invite:', error);
      throw error;
    }
  }
}

