/**
 * DocuSeal integration test script
 *
 * Verifies DOCUSEAL_API_KEY, DOCUSEAL_API_BASE_URL, and DOCUSEAL_REPLY_TO
 * by creating a one-off submission from a minimal PDF and sending the signing
 * link to an email address.
 *
 * Usage:
 *   npx tsx scripts/test-docuseal.ts                    # send to DOCUSEAL_TEST_EMAIL
 *   npx tsx scripts/test-docuseal.ts you@example.com      # send to you@example.com
 *   npx tsx scripts/test-docuseal.ts --status <id>       # check status of submission
 *
 * Required in .env:
 *   DOCUSEAL_API_KEY
 * Optional: DOCUSEAL_API_BASE_URL, DOCUSEAL_REPLY_TO, DOCUSEAL_TEST_EMAIL (signer email)
 */

import { config } from 'dotenv';
config();

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const statusOnly = args[0] === '--status';
const submissionIdForStatus = args[1];
const signerEmail = statusOnly ? undefined : (args[0] && !args[0].startsWith('--') ? args[0] : process.env.DOCUSEAL_TEST_EMAIL);

async function createMinimalPdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([612, 792]);
  page.drawText('DocuSeal connectivity test – please sign below.', {
    x: 50,
    y: 700,
    size: 14,
    font,
    color: rgb(0, 0, 0),
  });
  page.drawText(`Generated at ${new Date().toISOString()}`, {
    x: 50,
    y: 670,
    size: 10,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });
  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}

async function runCreateTest() {
  if (!signerEmail) {
    console.log('Usage:');
    console.log('  npx tsx scripts/test-docuseal.ts <signer-email>');
    console.log('  DOCUSEAL_TEST_EMAIL=you@example.com npx tsx scripts/test-docuseal.ts');
    console.log('');
    console.log('Set DOCUSEAL_TEST_EMAIL in .env or pass the signer email as the first argument.');
    process.exit(1);
  }

  console.log('🧪 DocuSeal integration test\n');
  console.log('Signer email:', signerEmail);
  console.log('');

  const { DocuSealService } = await import('../server/services/docuSealService');
  const { env } = await import('../server/env');

  console.log('Config:');
  console.log('  DOCUSEAL_API_BASE_URL:', env.DOCUSEAL_API_BASE_URL || 'https://api.docuseal.com');
  console.log('  DOCUSEAL_API_KEY:', env.DOCUSEAL_API_KEY ? `✓ Set (${env.DOCUSEAL_API_KEY.length} chars)` : '✗ Missing');
  console.log('  DOCUSEAL_REPLY_TO:', env.DOCUSEAL_REPLY_TO || '(not set)');
  console.log('');

  if (!env.DOCUSEAL_API_KEY) {
    console.error('❌ DOCUSEAL_API_KEY is required. Add it to your .env file.');
    process.exit(1);
  }

  const pdfBuffer = await createMinimalPdf();
  const filename = `docuseal-test-${Date.now()}.pdf`;

  console.log('Creating submission and sending signing email...\n');

  const { submissionId, signerEmbedUrl } = await DocuSealService.createSubmissionFromPdf(
    pdfBuffer,
    filename,
    {
      toEmail: signerEmail,
      toName: 'Test Signer',
      fromEmail: env.DOCUSEAL_REPLY_TO || 'noreply@example.com',
      subject: 'Secure2Send – DocuSeal test (please sign)',
      message: 'This is a test from the Secure2Send DocuSeal integration. Please open the link and sign the document.',
    }
  );

  console.log('✅ Submission created successfully.\n');
  console.log('Submission ID:', submissionId);
  if (signerEmbedUrl) console.log('Signer embed URL:', signerEmbedUrl);
  console.log('');
  console.log('Next steps:');
  console.log('1. Check the inbox for', signerEmail, '(and spam folder).');
  console.log('2. Open the signing link in the email and complete the signature.');
  console.log('3. Check status: npx tsx scripts/test-docuseal.ts --status', submissionId);
  console.log('');
}

async function runStatusCheck() {
  if (!submissionIdForStatus) {
    console.log('Usage: npx tsx scripts/test-docuseal.ts --status <submission-id>');
    process.exit(1);
  }

  const { DocuSealService } = await import('../server/services/docuSealService');
  const { env } = await import('../server/env');

  if (!env.DOCUSEAL_API_KEY) {
    console.error('❌ DOCUSEAL_API_KEY is required.');
    process.exit(1);
  }

  console.log('🔍 Checking DocuSeal submission status:', submissionIdForStatus, '\n');

  const status = await DocuSealService.getDocumentStatus(submissionIdForStatus);
  console.log('Status:', status.status);
  console.log('Completed at:', status.completedAt ?? '(not yet)');
  console.log('Signers:', JSON.stringify(status.signers, null, 2));
}

async function main() {
  try {
    if (statusOnly) {
      await runStatusCheck();
    } else {
      await runCreateTest();
    }
  } catch (err) {
    console.error('❌ Error:', err instanceof Error ? err.message : err);
    if (err instanceof Error && err.cause) console.error('Cause:', err.cause);
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('401') || msg.includes('Not authenticated')) {
      console.error('');
      console.error('💡 401 usually means: use the API key from the same DocuSeal instance as DOCUSEAL_API_BASE_URL.');
      console.error('   For https://api.docuseal.com get the key from https://console.docuseal.com/api');
      console.error('   For a self-hosted/Cloudflare instance use that instance’s admin API key.');
    }
    process.exit(1);
  }
}

main();
