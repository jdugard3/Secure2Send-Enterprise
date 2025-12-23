/**
 * Test script for OCR Document Processing Service
 * 
 * Usage:
 *   npm run test:ocr <file-path> <document-type>
 * 
 * Example:
 *   npm run test:ocr ./test-documents/sample-w9.pdf W9
 *   npm run test:ocr ./test-documents/voided-check.jpg VOIDED_CHECK
 */

import { config } from 'dotenv';
config();

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { SecureDocumentProcessingService } from '../server/services/documentProcessingService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supported document types
const DOCUMENT_TYPES = [
  'W9',
  'VOIDED_CHECK',
  'BANK_STATEMENTS',
  'DRIVERS_LICENSE',
  'PASSPORT',
  'BUSINESS_LICENSE',
  'ARTICLES_OF_INCORPORATION',
  'SS4_EIN_LETTER',
  'BENEFICIAL_OWNERSHIP',
] as const;

// MIME type detection
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

async function testOCR() {
  console.log('\n🧪 Testing OCR Document Processing Service\n');
  console.log('='.repeat(80) + '\n');

  // Get file path and document type from command line
  const filePath = process.argv[2];
  const documentType = process.argv[3]?.toUpperCase();

  if (!filePath) {
    console.error('❌ Please provide a file path!');
    console.log('\nUsage: npm run test:ocr <file-path> <document-type>\n');
    console.log('Example:');
    console.log('  npm run test:ocr ./test-documents/sample-w9.pdf W9');
    console.log('  npm run test:ocr ./test-documents/voided-check.jpg VOIDED_CHECK\n');
    console.log('Supported document types:');
    DOCUMENT_TYPES.forEach(type => console.log(`  - ${type}`));
    console.log('');
    process.exit(1);
  }

  if (!documentType || !DOCUMENT_TYPES.includes(documentType as any)) {
    console.error('❌ Please provide a valid document type!');
    console.log('\nSupported document types:');
    DOCUMENT_TYPES.forEach(type => console.log(`  - ${type}`));
    console.log('');
    process.exit(1);
  }

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    console.log('\nPlease provide a valid file path.\n');
    process.exit(1);
  }

  // Check environment variables
  if (!process.env.ENABLE_OCR_AUTOFILL || process.env.ENABLE_OCR_AUTOFILL !== 'true') {
    console.warn('⚠️  WARNING: ENABLE_OCR_AUTOFILL is not set to "true"');
    console.log('   OCR processing will be skipped.\n');
  }

  if (!process.env.OPENAI_API_KEY_OCR_ONLY) {
    console.error('❌ OPENAI_API_KEY_OCR_ONLY is not set!');
    console.log('\nPlease set the following environment variables:');
    console.log('  - OPENAI_API_KEY_OCR_ONLY (your OpenAI API key)');
    console.log('  - ENABLE_OCR_AUTOFILL=true (to enable OCR processing)');
    console.log('  - OPENAI_ORG_ID (optional, your OpenAI organization ID)\n');
    process.exit(1);
  }

  // Get file info
  const fileStats = fs.statSync(filePath);
  const fileSizeKB = (fileStats.size / 1024).toFixed(2);
  const mimeType = getMimeType(filePath);

  console.log('📄 File Information:');
  console.log(`   Path: ${filePath}`);
  console.log(`   Size: ${fileSizeKB} KB`);
  console.log(`   Type: ${mimeType}`);
  console.log(`   Document Type: ${documentType}\n`);

  // Check file size (GPT-4 Vision limit: 20MB per image, 512MB per PDF)
  const maxSize = mimeType === 'application/pdf' ? 512 * 1024 * 1024 : 20 * 1024 * 1024;
  if (fileStats.size > maxSize) {
    console.error(`❌ File size exceeds limit (${maxSize / (1024 * 1024)}MB)`);
    process.exit(1);
  }

  try {
    console.log('📖 Reading file...');
    const fileBuffer = fs.readFileSync(filePath);
    console.log('✅ File read successfully\n');

    console.log('🔍 Processing document with GPT-4 Vision...');
    console.log('   This may take 10-30 seconds...\n');

    const startTime = Date.now();

    const result = await SecureDocumentProcessingService.processDocument(fileBuffer, {
      documentType,
      mimeType,
      userId: 'test-user-id',
      merchantApplicationId: 'test-app-id',
      timeout: 30000,
    });

    const processingTime = Date.now() - startTime;

    console.log('='.repeat(80));
    console.log('📊 Processing Results\n');

    if (result.success) {
      console.log('✅ OCR Processing: SUCCESS\n');
      console.log(`⏱️  Processing Time: ${processingTime}ms`);
      console.log(`🔐 Document Hash: ${result.documentHash}`);
      console.log(`📈 Confidence Score: ${(result.confidenceScore! * 100).toFixed(1)}%\n`);

      if (result.data) {
        console.log('📋 Extracted Data:');
        console.log(JSON.stringify(result.data, null, 2));
        console.log('');

        // Save extracted data to file
        const outputDir = path.join(__dirname, '../test-output');
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        const outputPath = path.join(
          outputDir,
          `extracted-data-${documentType.toLowerCase()}-${Date.now()}.json`
        );
        fs.writeFileSync(outputPath, JSON.stringify(result.data, null, 2));
        console.log(`💾 Extracted data saved to:`);
        console.log(`   ${outputPath}\n`);
      }
    } else {
      console.log('❌ OCR Processing: FAILED\n');
      console.log(`Error: ${result.error}\n`);
      if (result.processingTimeMs) {
        console.log(`⏱️  Processing Time: ${result.processingTimeMs}ms\n`);
      }
    }

    console.log('='.repeat(80));
    console.log('✅ Test Complete!\n');

    // Exit with appropriate code
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('❌ Test failed with exception:');
    console.error(error);
    console.log('\n💡 Troubleshooting tips:');
    console.log('  1. Verify OPENAI_API_KEY_OCR_ONLY is correct');
    console.log('  2. Check your OpenAI account has credits/quota');
    console.log('  3. Ensure ENABLE_OCR_AUTOFILL=true');
    console.log('  4. Verify the file is a valid PDF or image');
    console.log('  5. Check file size is within limits (20MB for images, 512MB for PDFs)\n');
    process.exit(1);
  }
}

// Run the test
testOCR();

