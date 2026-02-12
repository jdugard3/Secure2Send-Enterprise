import { env } from '../env';

/** DocuSeal submission status from API */
interface DocuSealSubmission {
  id: number;
  status: 'pending' | 'completed' | 'declined' | 'expired';
  completed_at: string | null;
  submitters: Array<{
    id: number;
    email: string;
    name: string | null;
    status: string;
    completed_at: string | null;
  }>;
}

/** Response from POST /submissions/pdf */
interface DocuSealCreateSubmissionResponse {
  id: number;
  status: string;
  submitters: Array<{
    id: number;
    email: string;
    status: string;
    slug?: string;
    embed_src?: string;
  }>;
}

/** Response from GET /submissions/{id}/documents */
interface DocuSealDocumentsResponse {
  id: number;
  documents: Array<{ name: string; url: string }>;
}

/** Status shape returned to routes (matches former SignNow getDocumentStatus) */
export type ESignatureStatus = 'NOT_SENT' | 'PENDING' | 'SIGNED' | 'DECLINED' | 'EXPIRED';

export class DocuSealService {
  private static getApiBaseUrl(): string {
    return env.DOCUSEAL_API_BASE_URL || 'https://api.docuseal.com';
  }

  private static getApiKey(): string {
    const key = env.DOCUSEAL_API_KEY?.trim();
    if (!key) {
      throw new Error('DocuSeal API key not configured. Please set DOCUSEAL_API_KEY in your .env file.');
    }
    return key;
  }

  private static getAuthHeaders(): Record<string, string> {
    return {
      'X-Auth-Token': this.getApiKey(),
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  /**
   * Create a submission from a PDF and send it to the signer (replaces SignNow upload + freeform invite).
   * Uses Option B: one signature field with normalized coordinates on the last page.
   * Returns the submission id and optional signer embed URL for in-app signing.
   */
  static async createSubmissionFromPdf(
    pdfBuffer: Buffer,
    filename: string,
    options: {
      toEmail: string;
      toName: string;
      fromEmail: string;
      subject: string;
      message: string;
    }
  ): Promise<{ submissionId: string; signerEmbedUrl: string | null }> {
    try {
      console.log(`📤 Creating DocuSeal submission: ${filename}`);
      console.log(`📦 Buffer size: ${pdfBuffer.length} bytes`);

      const base64File = pdfBuffer.toString('base64');
      const replyTo = env.DOCUSEAL_REPLY_TO || options.fromEmail;

      // Option B: one signature field with normalized coordinates (0-1). Place near bottom of first page.
      const body = {
        name: filename.replace(/\.pdf$/i, ''),
        send_email: true,
        order: 'preserved',
        reply_to: replyTo,
        message: {
          subject: options.subject,
          body: options.message,
        },
        documents: [
          {
            name: filename.replace(/\.pdf$/i, ''),
            file: base64File,
            fields: [
              {
                name: 'Signature',
                type: 'signature',
                required: true,
                areas: [
                  {
                    page: 1,
                    x: 0.15,
                    y: 0.88,
                    w: 0.7,
                    h: 0.06,
                  },
                ],
              },
            ],
          },
        ],
        submitters: [
          {
            name: options.toName,
            role: 'Signer',
            email: options.toEmail,
            order: 0,
          },
        ],
      };

      const response = await fetch(`${this.getApiBaseUrl()}/submissions/pdf`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ DocuSeal create submission failed:', errorText);
        throw new Error(`DocuSeal create submission failed: ${response.status} - ${errorText}`);
      }

      const data: DocuSealCreateSubmissionResponse = await response.json();
      const submissionId = String(data.id);
      const firstSubmitter = data.submitters?.[0];
      const signerEmbedUrl =
        firstSubmitter?.embed_src ||
        (firstSubmitter?.slug ? `https://docuseal.com/s/${firstSubmitter.slug}` : null);
      if (signerEmbedUrl) console.log(`✅ Signer embed URL: ${signerEmbedUrl}`);
      console.log(`✅ DocuSeal submission created, ID: ${submissionId}`);
      return { submissionId, signerEmbedUrl };
    } catch (error) {
      console.error('❌ Failed to create DocuSeal submission:', error);
      throw error;
    }
  }

  /**
   * Get submission status. Returns same shape as former SignNow getDocumentStatus for drop-in use in routes.
   */
  static async getDocumentStatus(submissionId: string): Promise<{
    status: ESignatureStatus;
    signers: Array<{ email: string; signed: boolean; signedAt?: string }>;
    completedAt?: string;
  }> {
    try {
      console.log(`🔍 Checking DocuSeal submission status: ${submissionId}`);

      const response = await fetch(`${this.getApiBaseUrl()}/submissions/${submissionId}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ DocuSeal status check failed:', errorText);
        throw new Error(`DocuSeal status check failed: ${response.status} - ${errorText}`);
      }

      const data: DocuSealSubmission = await response.json();

      const signers = (data.submitters || []).map((s) => ({
        email: s.email,
        signed: s.status === 'completed',
        signedAt: s.completed_at || undefined,
      }));

      const statusMap: Record<string, ESignatureStatus> = {
        pending: 'PENDING',
        completed: 'SIGNED',
        declined: 'DECLINED',
        expired: 'EXPIRED',
      };
      const status = statusMap[data.status] || 'PENDING';
      const completedAt = data.completed_at || undefined;

      console.log(`📊 DocuSeal status: ${status}`);
      return { status, signers, completedAt };
    } catch (error) {
      console.error('❌ Failed to get DocuSeal submission status:', error);
      throw error;
    }
  }

  /**
   * Download the signed document(s). Fetches document URL(s) with auth and returns merged or single PDF buffer.
   */
  static async downloadSignedDocument(submissionId: string): Promise<Buffer> {
    try {
      console.log(`📥 Downloading signed document from DocuSeal submission ${submissionId}`);

      const response = await fetch(
        `${this.getApiBaseUrl()}/submissions/${submissionId}/documents?merge=true`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ DocuSeal documents list failed:', errorText);
        throw new Error(`DocuSeal download failed: ${response.status} - ${errorText}`);
      }

      const data: DocuSealDocumentsResponse = await response.json();
      const documents = data.documents || [];

      if (documents.length === 0) {
        throw new Error('DocuSeal returned no documents for this submission');
      }

      // Fetch first document URL (with merge=true we may get one URL; otherwise concatenate)
      const buffers: Buffer[] = [];
      for (const doc of documents) {
        const docResponse = await fetch(doc.url, {
          method: 'GET',
          headers: { 'X-Auth-Token': this.getApiKey() },
        });
        if (!docResponse.ok) {
          throw new Error(`Failed to fetch document ${doc.name}: ${docResponse.status}`);
        }
        const arr = await docResponse.arrayBuffer();
        buffers.push(Buffer.from(arr));
      }

      const buffer = buffers.length === 1 ? buffers[0] : Buffer.concat(buffers);
      console.log(`✅ Downloaded signed document from DocuSeal (${buffer.length} bytes)`);
      return buffer;
    } catch (error) {
      console.error('❌ Failed to download document from DocuSeal:', error);
      throw error;
    }
  }

  /**
   * Cancel a pending submission (optional). DELETE /submissions/{id}.
   */
  static async cancelInvite(submissionId: string): Promise<void> {
    try {
      console.log(`🚫 Canceling DocuSeal submission ${submissionId}`);

      const response = await fetch(`${this.getApiBaseUrl()}/submissions/${submissionId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ DocuSeal cancel failed:', errorText);
        throw new Error(`DocuSeal cancel failed: ${response.status} - ${errorText}`);
      }

      console.log('✅ DocuSeal submission canceled');
    } catch (error) {
      console.error('❌ Failed to cancel DocuSeal submission:', error);
      throw error;
    }
  }
}
