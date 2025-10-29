import { PdfFillService } from '../server/services/pdfFillService';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Test script to verify PDF filling works correctly
 */
async function testPdfFill() {
  console.log('🧪 Testing PDF Fill Service\n');
  console.log('='.repeat(80) + '\n');

  // Sample merchant application data
  const sampleApplication: any = {
    id: 'test-123',
    legalBusinessName: 'Green Leaf Dispensary LLC',
    dbaBusinessName: 'Green Leaf',
    billingAddress: '123 Main Street, Suite 100',
    locationAddress: '123 Main Street, Suite 100',
    city: 'Denver',
    state: 'CO',
    zip: '80202',
    businessPhone: '303-555-1234',
    businessFaxNumber: '303-555-1235',
    customerServicePhone: '303-555-1236',
    federalTaxIdNumber: '12-3456789',
    contactName: 'John Doe',
    contactPhoneNumber: '303-555-1237',
    contactEmail: 'john@greenleaf.com',
    websiteAddress: 'https://greenleaf.com',
    dbaWebsite: 'https://greenleaf.com',
    legalContactName: 'John Doe',
    legalPhone: '303-555-1237',
    legalEmail: 'john@greenleaf.com',

    // Banking Information
    bankName: 'First National Bank',
    abaRoutingNumber: '123456789',
    nameOnBankAccount: 'Green Leaf Dispensary LLC',
    accountName: 'Green Leaf Dispensary LLC',
    bankOfficerPhone: '303-555-7890',
    bankOfficerEmail: 'banker@fnb.com',

    // Volume Information
    monthlySalesVolume: '50000',
    annualVolume: '600000',
    mpaSignedDate: new Date('2025-10-15'),

    // Principal Officers
    principalOfficers: [
      {
        name: 'John Doe',
        title: 'CEO',
        ssn: '123-45-6789',
        equityPercentage: 60,
        residentialAddress: '456 Oak Avenue',
        city: 'Denver',
        state: 'CO',
        zip: '80203',
        email: 'john@greenleaf.com',
        dob: '1980-05-15',
        phoneNumber: '303-555-1111',
      },
      {
        name: 'Jane Smith',
        title: 'CFO',
        ssn: '987-65-4321',
        equityPercentage: 40,
        residentialAddress: '789 Pine Street',
        city: 'Denver',
        state: 'CO',
        zip: '80204',
        email: 'jane@greenleaf.com',
        dob: '1985-08-22',
        phoneNumber: '303-555-2222',
      },
    ],

    // Equipment
    equipmentData: [
      {
        equipmentName: 'PAX A920 PRO',
        quantity: 2,
        price: 395.00,
      },
    ],

    // Signature Information
    merchantName: 'John Doe',
    merchantTitle: 'CEO',
    merchantDate: new Date('2025-10-25'),
    corduroName: 'Corduro Representative',
    corduroTitle: 'Sales Manager',
    corduroDate: new Date('2025-10-26'),

    // Other fields
    beneficialOwners: [],
    authorizedContacts: [],
  };

  try {
    console.log('📋 Filling PDF with sample data...\n');

    // Fill the PDF
    const filledPdfBuffer = await PdfFillService.fillMerchantApplicationPDF(sampleApplication);

    console.log(`✅ PDF filled successfully! Size: ${(filledPdfBuffer.length / 1024).toFixed(2)} KB\n`);

    // Save to test output directory
    const outputDir = path.join(__dirname, '../test-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, `filled-application-test-${Date.now()}.pdf`);
    fs.writeFileSync(outputPath, filledPdfBuffer);

    console.log('💾 Filled PDF saved to:');
    console.log(`   ${outputPath}\n`);
    console.log('📖 Please open this file and verify:');
    console.log('   ✓ Business information is correct');
    console.log('   ✓ Contact information is complete');
    console.log('   ✓ Banking information is present');
    console.log('   ✓ Principal officers are filled');
    console.log('   ✓ Equipment information is correct');
    console.log('   ✓ Signature fields are populated');
    console.log('   ✓ Dates are formatted correctly (MM/DD/YYYY)');
    console.log('   ✓ All fields are readable and not overlapping\n');
    console.log('='.repeat(80));
    console.log('✅ Test Complete!');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testPdfFill();

