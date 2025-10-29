import { PdfFillService } from '../server/services/pdfFillService';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Script to identify which merchant application fields are NOT being filled
 * This helps us know which fields need text overlay
 */
async function identifyMissingFields() {
  console.log('🔍 Identifying Missing PDF Form Fields\n');
  console.log('='.repeat(80) + '\n');

  // Comprehensive sample application with ALL fields populated
  const comprehensiveApplication: any = {
    id: 'comprehensive-test-456',
    
    // Basic Business Info
    legalBusinessName: 'Green Leaf Dispensary LLC',
    dbaBusinessName: 'Green Leaf Cannabis Co.',
    billingAddress: '123 Main Street, Suite 100',
    locationAddress: '456 Commerce Drive',
    city: 'Denver',
    state: 'CO',
    zip: '80202',
    businessPhone: '303-555-1234',
    businessFaxNumber: '303-555-1235',
    customerServicePhone: '303-555-1236',
    federalTaxIdNumber: '12-3456789',
    
    // Contact Info
    contactName: 'John Doe',
    contactPhoneNumber: '303-555-1237',
    contactEmail: 'john@greenleaf.com',
    websiteAddress: 'https://greenleaf.com',
    dbaWebsite: 'https://greenleaf.com',
    legalContactName: 'Jane Smith',
    legalPhone: '303-555-7777',
    legalEmail: 'legal@greenleaf.com',
    
    // Corporate Info
    ownershipType: 'LLC',
    incorporationState: 'CO',
    entityStartDate: new Date('2020-01-15'),
    
    // Transaction Volume
    averageTicket: '75.00',
    highTicket: '500.00',
    monthlySalesVolume: '50000',
    monthlyTransactions: 650,
    annualVolume: '600000',
    annualTransactions: 7800,
    
    // Banking
    bankName: 'First National Bank',
    abaRoutingNumber: '123456789',
    nameOnBankAccount: 'Green Leaf Dispensary LLC',
    accountName: 'Green Leaf Dispensary LLC',
    ddaNumber: '9876543210',
    accountOwnerFirstName: 'John',
    accountOwnerLastName: 'Doe',
    bankOfficerName: 'Bob Banker',
    bankOfficerPhone: '303-555-7890',
    bankOfficerEmail: 'banker@fnb.com',
    
    // Owner Info (Primary)
    ownerFullName: 'John Michael Doe',
    ownerFirstName: 'John',
    ownerLastName: 'Doe',
    ownerOfficer: 'Owner',
    ownerTitle: 'CEO',
    ownerOwnershipPercentage: '60',
    ownerMobilePhone: '303-555-1111',
    ownerEmail: 'john@greenleaf.com',
    ownerSsn: '123-45-6789',
    ownerBirthday: new Date('1980-05-15'),
    ownerStateIssuedIdNumber: 'CO123456',
    ownerIdExpDate: new Date('2026-05-15'),
    ownerIssuingState: 'CO',
    ownerIdDateIssued: new Date('2021-05-15'),
    ownerLegalAddress: '789 Oak Avenue',
    ownerCity: 'Denver',
    ownerState: 'CO',
    ownerZip: '80203',
    ownerCountry: 'US',
    
    // Business Operations
    businessType: 'Retail',
    refundGuarantee: true,
    refundDays: 30,
    posSystem: 'Dutchie POS',
    multipleLocations: false,
    productOrServiceSold: 'Cannabis and related products',
    
    // MPA Info
    mpaSignedDate: new Date('2025-10-15'),
    salesRepName: 'Sarah Sales',
    
    // Certification
    processedCardsPast: false,
    previouslyProcessed: false,
    automaticBilling: false,
    cardholderData3rdParty: false,
    corporateResolution: 'The Board of Directors hereby authorizes the execution of this merchant processing agreement.',
    merchantName: 'John Doe',
    merchantTitle: 'CEO',
    merchantDate: new Date('2025-10-25'),
    agreementAccepted: true,
    corduroName: 'Corduro Representative',
    corduroTitle: 'Sales Manager',
    corduroDate: new Date('2025-10-26'),
    
    // Principal Officers (4 officers)
    principalOfficers: [
      {
        name: 'John Doe',
        title: 'CEO',
        ssn: '123-45-6789',
        equityPercentage: 60,
        residentialAddress: '789 Oak Avenue',
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
        residentialAddress: '321 Pine Street',
        city: 'Denver',
        state: 'CO',
        zip: '80204',
        email: 'jane@greenleaf.com',
        dob: '1985-08-22',
        phoneNumber: '303-555-2222',
      },
      {
        name: 'Bob Johnson',
        title: 'COO',
        ssn: '456-78-9012',
        equityPercentage: 0,
        residentialAddress: '654 Elm Drive',
        city: 'Denver',
        state: 'CO',
        zip: '80205',
        email: 'bob@greenleaf.com',
        dob: '1978-03-10',
        phoneNumber: '303-555-3333',
      },
      {
        name: 'Alice Williams',
        title: 'CTO',
        ssn: '789-01-2345',
        equityPercentage: 0,
        residentialAddress: '987 Maple Lane',
        city: 'Denver',
        state: 'CO',
        zip: '80206',
        email: 'alice@greenleaf.com',
        dob: '1990-11-30',
        phoneNumber: '303-555-4444',
      },
    ],
    
    // Beneficial Owners (2 owners)
    beneficialOwners: [
      {
        name: 'John Doe',
        title: 'CEO',
        ownershipPercentage: 60,
        residentialAddress: '789 Oak Avenue',
        city: 'Denver',
        state: 'CO',
        zip: '80203',
        country: 'US',
        phoneNumber: '303-555-1111',
        email: 'john@greenleaf.com',
        idType: 'DRIVERS_LICENSE',
        idNumber: 'CO123456',
        idState: 'CO',
        idExpDate: '2026-05-15',
        idDateIssued: '2021-05-15',
        dob: '1980-05-15',
        ssn: '123-45-6789',
        ssnOrTinFromUs: true,
        controlPerson: true,
      },
      {
        name: 'Jane Smith',
        title: 'CFO',
        ownershipPercentage: 40,
        residentialAddress: '321 Pine Street',
        city: 'Denver',
        state: 'CO',
        zip: '80204',
        country: 'US',
        phoneNumber: '303-555-2222',
        email: 'jane@greenleaf.com',
        idType: 'DRIVERS_LICENSE',
        idNumber: 'CO789012',
        idState: 'CO',
        idExpDate: '2027-08-22',
        idDateIssued: '2022-08-22',
        dob: '1985-08-22',
        ssn: '987-65-4321',
        ssnOrTinFromUs: true,
        controlPerson: false,
      },
    ],
    
    // Financial Representative
    financialRepresentative: {
      fullName: 'Robert Finance',
      firstName: 'Robert',
      lastName: 'Finance',
      title: 'Financial Controller',
      ownerOfficer: 'Officer',
      ownershipPercentage: 0,
      officePhone: '303-555-8888',
      mobilePhone: '303-555-9999',
      email: 'robert@greenleaf.com',
      ssn: '234-56-7890',
      birthday: '1975-12-05',
      stateIssuedIdNumber: 'CO345678',
      idExpDate: '2025-12-05',
      issuingState: 'CO',
      legalStreetAddress: '111 Finance Boulevard',
      city: 'Denver',
      state: 'CO',
      zip: '80207',
      country: 'US',
    },
    
    // Authorized Contacts (2 contacts)
    authorizedContacts: [
      {
        firstName: 'Sarah',
        lastName: 'Operations',
        title: 'Operations Manager',
        email: 'sarah@greenleaf.com',
        officePhone: '303-555-6666',
        mobilePhone: '303-555-6667',
      },
      {
        firstName: 'Mike',
        lastName: 'Support',
        title: 'Customer Support Lead',
        email: 'mike@greenleaf.com',
        officePhone: '303-555-7777',
        mobilePhone: '303-555-7778',
      },
    ],
    
    // Equipment (3 items)
    equipmentData: [
      {
        equipmentName: 'PAX A920 PRO',
        quantity: 2,
        price: 395.00,
      },
      {
        equipmentName: 'Clover Station',
        quantity: 1,
        price: 499.00,
      },
      {
        equipmentName: 'Receipt Printer',
        quantity: 2,
        price: 149.00,
      },
    ],
    
    // Processing Categories
    processingCategories: ['CARD_PRESENT_RETAIL', 'CARD_NOT_PRESENT_E_COMMERCE'],
  };

  console.log('📋 Sample Application Data Summary:');
  console.log(`   Business: ${comprehensiveApplication.legalBusinessName}`);
  console.log(`   Principal Officers: ${comprehensiveApplication.principalOfficers.length}`);
  console.log(`   Beneficial Owners: ${comprehensiveApplication.beneficialOwners.length}`);
  console.log(`   Authorized Contacts: ${comprehensiveApplication.authorizedContacts.length}`);
  console.log(`   Equipment Items: ${comprehensiveApplication.equipmentData.length}`);
  console.log(`   Financial Rep: ${comprehensiveApplication.financialRepresentative ? 'Yes' : 'No'}\n`);

  try {
    console.log('🔄 Filling PDF template...\n');
    
    // Fill the PDF
    const filledPdfBuffer = await PdfFillService.fillMerchantApplicationPDF(comprehensiveApplication);

    console.log(`✅ PDF generated: ${(filledPdfBuffer.length / 1024).toFixed(2)} KB\n`);

    // Save to test output
    const outputDir = path.join(__dirname, '../test-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, `comprehensive-test-${Date.now()}.pdf`);
    fs.writeFileSync(outputPath, filledPdfBuffer);

    console.log('='.repeat(80));
    console.log('📄 COMPREHENSIVE TEST PDF GENERATED');
    console.log('='.repeat(80));
    console.log(`\n💾 Saved to: ${outputPath}\n`);
    console.log('📖 NEXT STEPS:\n');
    console.log('1. Open the PDF above');
    console.log('2. Review each section:');
    console.log('   ✓ Business Information');
    console.log('   ✓ Owner/Principal Officers (should show 4 officers)');
    console.log('   ✓ Beneficial Owners (should show 2 owners)');
    console.log('   ✓ Financial Representative');
    console.log('   ✓ Authorized Contacts (should show 2 contacts)');
    console.log('   ✓ Banking Information');
    console.log('   ✓ Equipment List (should show 3 items)');
    console.log('   ✓ Transaction Volume');
    console.log('   ✓ Signatures\n');
    console.log('3. Note any sections that are BLANK or MISSING');
    console.log('4. Tell me which sections need text overlay\n');
    console.log('='.repeat(80));
    console.log('⚠️  WARNINGS FROM PDF FILL:');
    console.log('='.repeat(80));
    console.log('\nCheck the output above for any "Could not set field" warnings.');
    console.log('Those fields either don\'t exist or need text overlay.\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the identification
identifyMissingFields();

