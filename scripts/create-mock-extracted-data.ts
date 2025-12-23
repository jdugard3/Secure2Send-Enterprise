/**
 * Script to create mock extracted document data for testing Phase 4 endpoints
 * 
 * Usage:
 *   tsx scripts/create-mock-extracted-data.ts <documentId> <merchantApplicationId> <userId> [documentType]
 * 
 * Example:
 *   tsx scripts/create-mock-extracted-data.ts doc-123 app-456 user-789 W9
 */

import { storage } from "../server/storage";
import { PIIProtectionService } from "../server/services/piiProtectionService";
import crypto from "crypto";

type DocumentType = "W9" | "VOIDED_CHECK" | "BANK_STATEMENT" | "DRIVERS_LICENSE" | "BUSINESS_LICENSE" | "ARTICLES_OF_INCORPORATION";

async function createMockExtractedData() {
  const documentId = process.argv[2];
  const merchantApplicationId = process.argv[3];
  const userId = process.argv[4];
  const documentType = (process.argv[5] || "W9") as DocumentType;

  if (!documentId || !merchantApplicationId || !userId) {
    console.error("❌ Missing required arguments");
    console.error("");
    console.error("Usage: tsx scripts/create-mock-extracted-data.ts <documentId> <merchantApplicationId> <userId> [documentType]");
    console.error("");
    console.error("Arguments:");
    console.error("  documentId           - Document ID from database");
    console.error("  merchantApplicationId - Merchant application ID from database");
    console.error("  userId               - User ID from database");
    console.error("  documentType         - Optional: W9, VOIDED_CHECK, BANK_STATEMENT, DRIVERS_LICENSE, BUSINESS_LICENSE, ARTICLES_OF_INCORPORATION (default: W9)");
    console.error("");
    console.error("Example:");
    console.error("  tsx scripts/create-mock-extracted-data.ts doc-123 app-456 user-789 W9");
    process.exit(1);
  }

  // Verify document exists
  const document = await storage.getDocumentById(documentId);
  if (!document) {
    console.error(`❌ Document not found: ${documentId}`);
    process.exit(1);
  }

  // Verify merchant application exists
  const merchantApplication = await storage.getMerchantApplicationById(merchantApplicationId);
  if (!merchantApplication) {
    console.error(`❌ Merchant application not found: ${merchantApplicationId}`);
    process.exit(1);
  }

  // Verify user exists
  const user = await storage.getUser(userId);
  if (!user) {
    console.error(`❌ User not found: ${userId}`);
    process.exit(1);
  }

  console.log("📋 Creating mock extracted data...");
  console.log(`   Document ID: ${documentId}`);
  console.log(`   Merchant Application ID: ${merchantApplicationId}`);
  console.log(`   User ID: ${userId}`);
  console.log(`   Document Type: ${documentType}`);
  console.log("");

  // Create mock extracted data based on document type
  let mockExtractedData: any;

  switch (documentType) {
    case "W9":
      mockExtractedData = {
        legalBusinessName: "Acme Corporation",
        dbaBusinessName: "Acme Corp",
        federalTaxIdNumber: "12-3456789",
        businessAddress: "123 Main Street",
        city: "Denver",
        state: "CO",
        zip: "80202",
        signerName: "John Doe",
        signerSSN: "123-45-6789",
        businessType: "CORPORATION",
        confidence: 0.95,
      };
      break;

    case "VOIDED_CHECK":
      mockExtractedData = {
        bankName: "First National Bank",
        routingNumber: "123456789",
        accountNumber: "9876543210",
        accountHolderName: "Acme Corporation",
        address: "123 Main Street",
        city: "Denver",
        state: "CO",
        zip: "80202",
        confidence: 0.92,
      };
      break;

    case "BANK_STATEMENT":
      mockExtractedData = {
        bankName: "First National Bank",
        accountNumber: "9876543210",
        accountHolderName: "Acme Corporation",
        statementPeriod: "2024-01-01 to 2024-01-31",
        totalDeposits: 125000.50,
        transactionCount: 450,
        largestTransaction: 5000.00,
        averageTransaction: 277.78,
        monthlySalesVolume: 125000.50,
        confidence: 0.90,
      };
      break;

    case "DRIVERS_LICENSE":
      mockExtractedData = {
        fullName: "John Doe",
        firstName: "John",
        lastName: "Doe",
        dob: "1985-05-15",
        address: "123 Main Street",
        city: "Denver",
        state: "CO",
        zip: "80202",
        licenseNumber: "DL123456789",
        expirationDate: "2026-05-15",
        issueDate: "2020-05-15",
        confidence: 0.93,
      };
      break;

    case "BUSINESS_LICENSE":
      mockExtractedData = {
        legalBusinessName: "Acme Corporation",
        dbaBusinessName: "Acme Corp",
        businessAddress: "123 Main Street",
        city: "Denver",
        state: "CO",
        zip: "80202",
        licenseNumber: "BL-2024-001234",
        issueDate: "2024-01-15",
        expirationDate: "2025-01-15",
        licenseType: "General Business",
        confidence: 0.91,
      };
      break;

    case "ARTICLES_OF_INCORPORATION":
      mockExtractedData = {
        legalBusinessName: "Acme Corporation",
        incorporationState: "Delaware",
        incorporationDate: "2020-01-15",
        ownershipType: "CORPORATION",
        registeredAgent: "Corporate Services Inc.",
        registeredAddress: "456 Corporate Blvd, Wilmington, DE 19801",
        confidence: 0.94,
      };
      break;

    default:
      console.error(`❌ Unknown document type: ${documentType}`);
      console.error("Valid types: W9, VOIDED_CHECK, BANK_STATEMENT, DRIVERS_LICENSE, BUSINESS_LICENSE, ARTICLES_OF_INCORPORATION");
      process.exit(1);
  }

  // Encrypt and mask sensitive fields
  console.log("🔒 Encrypting sensitive fields...");
  const { public: publicData, encrypted: encryptedFields } = PIIProtectionService.separatePublicAndEncrypted(
    mockExtractedData
  );

  // Create document hash (mock)
  const documentHash = crypto.createHash("sha256")
    .update(JSON.stringify(mockExtractedData))
    .update(documentId)
    .digest("hex");

  // Check if extracted data already exists for this document
  const existingData = await storage.getExtractedDocumentDataByDocumentId(documentId);
  if (existingData) {
    console.log("");
    console.log("⚠️  Extracted data already exists for this document:");
    console.log(`   ID: ${existingData.id}`);
    console.log(`   Created: ${existingData.createdAt}`);
    console.log(`   Confidence: ${existingData.confidenceScore}`);
    console.log("");
    console.log("To create new data, delete the existing record first or use a different document ID.");
    process.exit(1);
  }

  // Insert into database
  console.log("💾 Saving to database...");
  const extractedData = await storage.createExtractedDocumentData({
    documentId,
    merchantApplicationId,
    userId,
    extractedDataPublic: publicData,
    encryptedFields,
    documentHash,
    confidenceScore: mockExtractedData.confidence?.toFixed(2) || "0.95",
    processingIpAddress: "127.0.0.1",
    processingUserAgent: "Test Script - create-mock-extracted-data.ts",
  });

  console.log("");
  console.log("✅ Mock extracted data created successfully!");
  console.log("");
  console.log("Details:");
  console.log(`   ID: ${extractedData.id}`);
  console.log(`   Document ID: ${extractedData.documentId}`);
  console.log(`   Merchant Application ID: ${extractedData.merchantApplicationId}`);
  console.log(`   Confidence Score: ${extractedData.confidenceScore}`);
  console.log(`   Created: ${extractedData.createdAt}`);
  console.log(`   Expires: ${extractedData.expiresAt}`);
  console.log("");
  console.log("Public (masked) data:");
  console.log(JSON.stringify(publicData, null, 2));
  console.log("");
  console.log("Encrypted fields count:", Object.keys(encryptedFields).length);
  console.log("");
  console.log("🔗 Test endpoints:");
  console.log(`   GET  /api/merchant-applications/${merchantApplicationId}/extracted-data`);
  console.log(`   GET  /api/merchant-applications/${merchantApplicationId}/extracted-data?includeSensitive=true`);
  console.log(`   POST /api/merchant-applications/${merchantApplicationId}/apply-extracted-data`);
}

createMockExtractedData().catch((error) => {
  console.error("❌ Error creating mock extracted data:", error);
  process.exit(1);
});

