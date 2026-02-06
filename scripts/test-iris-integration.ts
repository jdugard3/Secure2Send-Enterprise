/**
 * IRIS CRM integration test script
 *
 * Tests the direct IRIS API integration (no Zapier):
 * 1. Credentials / connection
 * 2. Lead creation
 * 3. Lead update with merchant application data (field mapping)
 * 4. Document upload to lead
 * 5. Lead status (pipeline) update
 *
 * Usage:
 *   npx tsx scripts/test-iris-integration.ts              # run all steps
 *   npx tsx scripts/test-iris-integration.ts --connection-only   # only verify env + API connection
 *   npx tsx scripts/test-iris-integration.ts --skip-document      # skip document upload
 *   npx tsx scripts/test-iris-integration.ts --skip-application   # skip application field update
 *
 * Requires .env with at least:
 *   IRIS_CRM_API_KEY, IRIS_CRM_SUBDOMAIN
 *   (Full app .env is required because the script uses server env and IrisCrmService.)
 */

import { config } from 'dotenv';

config();

const args = process.argv.slice(2);
const connectionOnly = args.includes('--connection-only');
const skipDocument = args.includes('--skip-document');
const skipApplication = args.includes('--skip-application');

const TEST_USER = {
  id: 'iris-test-user',
  email: `iris-integration-test-${Date.now()}@secure2send.test`,
  firstName: 'IRIS',
  lastName: 'Integration Test',
  companyName: 'Secure2Send IRIS Test',
  role: 'CLIENT',
  createdAt: new Date(),
  updatedAt: new Date(),
  mfaEnabled: false,
  mfaMethod: null,
  invitationCodeId: null,
  passwordHash: '',
  passwordSalt: null,
} as any;

const TEST_DOCUMENT = {
  id: 'iris-test-doc',
  filename: `iris-test-${Date.now()}.txt`,
  originalName: 'iris-integration-test.txt',
  documentType: 'IRIS_TEST',
  mimeType: 'text/plain',
  fileSize: 0,
  filePath: null,
  r2Key: null,
  merchantApplicationId: null,
  uploadedBy: null,
  status: 'PENDING',
  createdAt: new Date(),
  updatedAt: new Date(),
  clientId: null,
} as any;

// Minimal application: free-text fields only where possible. Dropdown fields left empty
// so they are omitted (IRIS dropdown options can be instance-specific). Use valid NANP phones.
const MINIMAL_APPLICATION = {
  id: 'iris-test-app',
  status: 'DRAFT',
  dbaBusinessName: 'IRIS Test DBA',
  legalBusinessName: 'IRIS Test Legal',
  city: 'Test City',
  state: 'TX',
  zip: '75001',
  businessPhone: '972-317-0100',
  contactEmail: TEST_USER.email,
  locationAddress: '123 Test St',
  billingAddress: '123 Test St',
  legalContactName: 'Test Contact',
  legalPhone: '972-317-0200',
  legalEmail: TEST_USER.email,
  ownershipType: '' as string,
  federalTaxIdNumber: '12-3456789',
  incorporationState: 'Texas',
  entityStartDate: '2020-01-15',
  productOrServiceSold: 'Integration test',
  multipleLocations: false,
  averageTicket: '50',
  highTicket: '500',
  monthlySalesVolume: '10000',
  annualVolume: '120000',
  monthlyTransactions: 100,
  annualTransactions: 1200,
  accountOwnerFirstName: 'Test',
  accountOwnerLastName: 'Owner',
  nameOnBankAccount: 'Test Owner',
  bankName: 'Test Bank',
  abaRoutingNumber: '111000025',
  ddaNumber: '1234567890',
  ownerFirstName: 'IRIS',
  ownerLastName: 'Test',
  ownerFullName: 'IRIS Test',
  ownerTitle: '',
  ownerOfficer: '' as string,
  ownerOwnershipPercentage: 100,
  ownerEmail: TEST_USER.email,
  ownerMobilePhone: '972-317-0300',
  ownerLegalAddress: '123 Test St',
  ownerCity: 'Test City',
  ownerState: 'TX',
  ownerZip: '75001',
  ownerCountry: '' as string,
  businessType: 'Retail',
  previouslyProcessed: undefined as unknown as boolean | undefined,
  automaticBilling: undefined as unknown as boolean | undefined,
  refundGuarantee: false,
  refundDays: null,
  beneficialOwners: [],
  authorizedContacts: [],
  financialRepresentative: null,
};

async function main() {
  console.log('\n🧪 IRIS CRM integration test\n');
  console.log('Options:', { connectionOnly, skipDocument, skipApplication });

  // Load env and service (validates full app env)
  let env: any;
  let IrisCrmService: any;
  try {
    const envModule = await import('../server/env');
    env = envModule.env;
    const irisModule = await import('../server/services/irisCrmService');
    IrisCrmService = irisModule.IrisCrmService;
  } catch (e) {
    console.error('❌ Failed to load server env or IrisCrmService. Ensure .env has IRIS_CRM_API_KEY, IRIS_CRM_SUBDOMAIN, DATABASE_URL, SESSION_SECRET.');
    console.error(e);
    process.exit(1);
  }

  if (!env.IRIS_CRM_API_KEY || !env.IRIS_CRM_SUBDOMAIN) {
    console.error('❌ IRIS_CRM_API_KEY and IRIS_CRM_SUBDOMAIN must be set in .env');
    process.exit(1);
  }

  console.log('✓ IRIS_CRM_API_KEY:', env.IRIS_CRM_API_KEY.substring(0, 12) + '...');
  console.log('✓ IRIS_CRM_SUBDOMAIN:', env.IRIS_CRM_SUBDOMAIN);

  const baseUrl =
    env.IRIS_CRM_SUBDOMAIN === 'corduro'
      ? 'https://iris.corduro.com/api/v1'
      : `https://${env.IRIS_CRM_SUBDOMAIN}.iriscrm.com/api/v1`;

  // --- Step 1: Connection check (GET one lead; 401 = bad credentials, 404/200 = API reachable) ---
  console.log('\n--- 1. Connection check ---');
  try {
    const res = await fetch(`${baseUrl}/leads/1`, {
      headers: {
        'X-API-KEY': env.IRIS_CRM_API_KEY,
        accept: 'application/json',
      },
    });
    if (res.status === 401) {
      console.error('❌ IRIS API rejected credentials (401). Check IRIS_CRM_API_KEY.');
      process.exit(1);
    }
    if (res.ok || res.status === 404) {
      console.log('✅ IRIS API connection OK (credentials accepted)');
    } else {
      const text = await res.text();
      console.log('⚠️ IRIS API returned', res.status, text ? text.slice(0, 200) : '');
    }
  } catch (e: any) {
    console.error('❌ Connection check failed:', e.message || e);
    process.exit(1);
  }

  if (connectionOnly) {
    console.log('\n✅ --connection-only: stopping after connection check.\n');
    process.exit(0);
  }

  // --- Step 2: Create lead ---
  console.log('\n--- 2. Create test lead ---');
  let leadId: string | null = null;
  try {
    leadId = await IrisCrmService.createLead(TEST_USER);
    if (leadId) {
      console.log('✅ Lead created:', leadId);
    } else {
      console.error('❌ createLead returned null');
      process.exit(1);
    }
  } catch (e: any) {
    console.error('❌ Create lead failed:', e.message || e);
    process.exit(1);
  }

  // --- Step 3: Update lead with application data ---
  if (!skipApplication) {
    console.log('\n--- 3. Update lead with merchant application data ---');
    try {
      await IrisCrmService.updateLeadWithMerchantApplication(leadId!, MINIMAL_APPLICATION);
      console.log('✅ Lead updated with application fields');
    } catch (e: any) {
      console.error('❌ Update lead with application failed:', e.message || e);
      console.error('   Tip: If IRIS rejects dropdown/field values (instance-specific), run with --skip-application.');
    }
  } else {
    console.log('\n--- 3. Update lead with application data (skipped) ---');
  }

  // --- Step 4: Upload document ---
  if (!skipDocument) {
    console.log('\n--- 4. Upload test document ---');
    const testFileBuffer = Buffer.from('IRIS CRM integration test – Secure2Send. ' + new Date().toISOString(), 'utf8');
    (TEST_DOCUMENT as any).fileSize = testFileBuffer.length;
    try {
      await IrisCrmService.uploadDocumentToIris(leadId!, TEST_DOCUMENT, { fileBuffer: testFileBuffer });
      console.log('✅ Document uploaded');
    } catch (e: any) {
      console.error('❌ Document upload failed:', e.message || e);
    }
  } else {
    console.log('\n--- 4. Upload test document (skipped) ---');
  }

  // --- Step 5: Update lead status ---
  console.log('\n--- 5. Update lead status (pipeline) ---');
  try {
    await IrisCrmService.updateLeadStatus(leadId!, 'SALES_PRE_SALE');
    console.log('✅ Lead status updated to SALES_PRE_SALE');
  } catch (e: any) {
    console.error('❌ Update lead status failed:', e.message || e);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  console.log('Lead ID:', leadId);
  console.log('Verify in IRIS CRM: open the lead and check application fields, Documents tab, and pipeline stage.');
  console.log('');
}

main();
