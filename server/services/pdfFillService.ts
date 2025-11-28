import { PDFDocument, PDFTextField, PDFCheckBox } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import type { MerchantApplication } from '@shared/schema';

/**
 * Service to fill PDF forms with merchant application data
 */
export class PdfFillService {
  // Use process.cwd() which is /app in Docker container
  // This is more reliable than __dirname in bundled code
  private static readonly PDF_TEMPLATE_PATH = path.join(
    process.cwd(),
    'templates/NEW CorduroMSA_CRB (combined).pdf'
  );

  private static readonly KINDTAP_AGREEMENT_PATH = path.join(
    process.cwd(),
    'uploads/KindTap Merchant Agreement_08012023.pdf'
  );

  /**
   * Fill the merchant application PDF with data
   */
  static async fillMerchantApplicationPDF(
    application: MerchantApplication
  ): Promise<Buffer> {
    try {
      console.log('📄 Loading PDF template from:', this.PDF_TEMPLATE_PATH);

      // Load the PDF template
      const pdfBytes = fs.readFileSync(this.PDF_TEMPLATE_PATH);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const form = pdfDoc.getForm();

      console.log(`📋 Filling PDF for application: ${application.id}`);

      // Parse JSON fields safely
      const principalOfficers = this.parseJSON(application.principalOfficers) || [];
      const beneficialOwners = this.parseJSON(application.beneficialOwners) || [];
      const authorizedContacts = this.parseJSON(application.authorizedContacts) || [];
      const equipmentData = this.parseJSON(application.equipmentData) || [];

      // Fill Business Information
      this.setTextField(form, 'Legal Name of Business or Corporate Owner Registered with the IRS', application.legalBusinessName);
      this.setTextField(form, 'DBA Doing Business As Name', application.dbaBusinessName);
      this.setTextField(form, 'Billing Address', application.billingAddress);
      this.setTextField(form, 'Location Address', application.locationAddress);
      this.setTextField(form, 'City', application.city);
      this.setTextField(form, 'State', application.state);
      this.setTextField(form, 'Zip', application.zip);
      
      // Duplicate city/state/zip for location
      this.setTextField(form, 'City_2', application.city);
      this.setTextField(form, 'State_2', application.state);
      this.setTextField(form, 'Zip_2', application.zip);
      
      // Contact Information
      this.setTextField(form, 'Business Phone', application.businessPhone);
      this.setTextField(form, 'Business Fax Number', application.businessFaxNumber);
      this.setTextField(form, 'Customer Service Phone', application.customerServicePhone);
      this.setTextField(form, 'Federal Tax ID Number', application.federalTaxIdNumber);
      this.setTextField(form, 'Contact NameOffice Manager', application.contactName || application.legalContactName);
      this.setTextField(form, 'Contact Phone Number', application.contactPhoneNumber || application.legalPhone);
      this.setTextField(form, 'Contact Email', application.contactEmail || application.legalEmail);
      this.setTextField(form, 'Website Address', application.websiteAddress || application.dbaWebsite);

      // Banking Information
      this.setTextField(form, 'Bank Name', application.bankName);
      this.setTextField(form, 'ABA  Routing Number', application.abaRoutingNumber);
      this.setTextField(form, 'Account Name', application.nameOnBankAccount || application.accountName);
      this.setTextField(form, 'Bank Officer Phone', application.bankOfficerPhone);
      this.setTextField(form, 'Bank Officer Email', application.bankOfficerEmail);

      // Principal Officers (up to 5 supported)
      this.fillPrincipalOfficers(form, principalOfficers);

      // Volume Information
      this.setTextField(form, 'Monthly Vol ume', application.monthlySalesVolume);
      this.setTextField(form, 'Annual Vol ume', application.annualVolume);
      this.setTextField(form, 'Date', application.mpaSignedDate ? this.formatDate(application.mpaSignedDate) : '');

      // Equipment - default PAX A920 PRO is already filled in template
      if (equipmentData.length > 0) {
        this.fillEquipment(form, equipmentData);
      }

      // Pricing Terms (Page 3) - Fee Schedule
      const feeScheduleData = this.parseJSON(application.feeScheduleData);
      if (feeScheduleData) {
        this.fillPricingTerms(form, feeScheduleData);
      }

      // Signature fields
      this.setTextField(form, 'Name', application.merchantName);
      this.setTextField(form, 'Title', application.merchantTitle);
      this.setTextField(form, 'Date_2', application.merchantDate ? this.formatDate(application.merchantDate) : '');
      
      // Corduro signature fields
      this.setTextField(form, 'Name_2', application.corduroName || '');
      this.setTextField(form, 'Title_2', application.corduroTitle || '');
      this.setTextField(form, 'Date_3', application.corduroDate ? this.formatDate(application.corduroDate) : '');

      // Flatten the form so it becomes non-editable (optional - good for final documents)
      // form.flatten();

      console.log('✅ PDF filled successfully');

      // Save and return the filled PDF
      const filledPdfBytes = await pdfDoc.save();
      return Buffer.from(filledPdfBytes);
    } catch (error) {
      console.error('❌ Error filling PDF:', error);
      throw new Error(`Failed to fill PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fill principal officer fields
   */
  private static fillPrincipalOfficers(form: any, officers: any[]) {
    const suffixes = ['', '_2', '_3', '_4'];
    const citySuffixes = ['_3', '_4', '_5', '_6']; // City and State have underscores
    const administratorSuffix = '_5';

    for (let i = 0; i < Math.min(officers.length, 4); i++) {
      const officer = officers[i];
      const suffix = suffixes[i];
      const citySuffix = citySuffixes[i];

      // Basic info fields (Page 5)
      this.setTextField(form, `Principal ${i + 1} Name`, officer.name);
      this.setTextField(form, `SSN${suffix}`, officer.ssn);
      this.setTextField(form, ` Ownership${suffix}`, officer.equityPercentage ? `${officer.equityPercentage}%` : '');
      this.setTextField(form, `Residential Address${suffix}`, officer.residentialAddress);
      this.setTextField(form, `City${citySuffix}`, officer.city);
      this.setTextField(form, `State${citySuffix}`, officer.state);
      this.setTextField(form, `TitleZip${suffix}`, officer.zip);
      this.setTextField(form, `Email${suffix}`, officer.email);
      this.setTextField(form, `Date of Birth${suffix}`, officer.dob ? this.formatDate(officer.dob) : '');
      this.setTextField(form, `Cell Phone${suffix}`, officer.phoneNumber);
      this.setTextField(form, `Home Phone${suffix}`, officer.homePhone || officer.phoneNumber);
      this.setTextField(form, `State Issued ID${suffix}`, officer.idState || '');
      this.setTextField(form, `ID Number${suffix}`, officer.idNumber || '');
      this.setTextField(form, `Exp Date${suffix}`, officer.idExpDate ? this.formatDate(officer.idExpDate) : '');
    }

    // Administrator field (5th officer)
    if (officers.length >= 5) {
      const admin = officers[4];
      this.setTextField(form, 'Administrator Name', admin.name);
      this.setTextField(form, `SSN${administratorSuffix}`, admin.ssn);
      this.setTextField(form, ` Ownership${administratorSuffix}`, admin.equityPercentage ? `${admin.equityPercentage}%` : '');
      this.setTextField(form, `Residential Address${administratorSuffix}`, admin.residentialAddress);
      this.setTextField(form, 'City_7', admin.city);
      this.setTextField(form, 'State_7', admin.state);
      this.setTextField(form, `TitleZip${administratorSuffix}`, admin.zip);
      this.setTextField(form, `Email${administratorSuffix}`, admin.email);
      this.setTextField(form, `Date of Birth${administratorSuffix}`, admin.dob ? this.formatDate(admin.dob) : '');
      this.setTextField(form, `Cell Phone${administratorSuffix}`, admin.phoneNumber);
    }
  }

  /**
   * Fill equipment fields
   */
  private static fillEquipment(form: any, equipmentData: any[]) {
    const rows = ['Row1', 'Row2', 'Row3', 'Row4', 'Row5', 'Row6'];
    
    for (let i = 0; i < Math.min(equipmentData.length, 6); i++) {
      const equipment = equipmentData[i];
      const row = rows[i];
      
      this.setTextField(form, `Equi pment Na me${row}`, equipment.equipmentName || '');
      this.setTextField(form, `Qua nti ty${row}`, equipment.quantity?.toString() || '');
      this.setTextField(form, `Pri ce${row}`, equipment.price ? `$ ${equipment.price.toFixed(2)}` : '');
    }
  }

  /**
   * Fill pricing terms (Page 3 - Fee Schedule)
   */
  private static fillPricingTerms(form: any, feeScheduleData: any) {
    try {
      // Other Services section (Row 1)
      if (feeScheduleData.otherServices) {
        const os = feeScheduleData.otherServices;
        this.setTextField(form, 'Other ServicesRow1', os.qualification || '');
        this.setTextField(form, 'Other ServicesRow1_2', os.discFee ? `${os.discFee}%` : '');
        this.setTextField(form, 'Other ServicesRow1_3', os.perItem ? `$${os.perItem.toFixed(2)}` : '');
      }

      // Surcharge section (Consumer row)
      if (feeScheduleData.surcharge) {
        const sc = feeScheduleData.surcharge;
        this.setTextField(form, 'QualificationCons umer', sc.qualification || 'Consumer');
        this.setTextField(form, 'FeesCons umer', sc.discFee ? `${sc.discFee}%` : '');
        this.setTextField(form, 'Per Item Cons umer', sc.perItem ? `$${sc.perItem.toFixed(2)}` : '');
        this.setTextField(form, 'Minimum FeeCons umer', sc.minimumFee ? `$${sc.minimumFee.toFixed(2)}` : '');
      }

      // Fees section (Base row)
      if (feeScheduleData.fees) {
        const fees = feeScheduleData.fees;
        this.setTextField(form, 'Qualification', fees.qualification || '');
        this.setTextField(form, 'Fees', fees.discFee ? `${fees.discFee}%` : '');
        this.setTextField(form, 'Per Item', fees.perItem ? `$${fees.perItem.toFixed(2)}` : '');
      }

      console.log('✅ Pricing terms filled successfully');
    } catch (error) {
      console.error('❌ Error filling pricing terms:', error);
      // Don't fail the entire PDF generation if pricing fails
    }
  }

  /**
   * Safely set a text field value
   */
  private static setTextField(form: any, fieldName: string, value: string | null | undefined) {
    try {
      if (value !== null && value !== undefined) {
        const field = form.getTextField(fieldName);
        field.setText(String(value));
      }
    } catch (error) {
      // Field might not exist or might not be a text field - log but don't fail
      console.warn(`⚠️  Could not set field "${fieldName}":`, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Safely set a checkbox field value
   */
  private static setCheckBox(form: any, fieldName: string, checked: boolean) {
    try {
      const field = form.getCheckBox(fieldName);
      if (checked) {
        field.check();
      } else {
        field.uncheck();
      }
    } catch (error) {
      // Field might not exist - log but don't fail
      console.warn(`⚠️  Could not set checkbox "${fieldName}":`, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Format date for PDF display (MM/DD/YYYY)
   */
  private static formatDate(dateString: string | Date): string {
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      if (isNaN(date.getTime())) return '';
      
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const year = date.getFullYear();
      
      return `${month}/${day}/${year}`;
    } catch {
      return '';
    }
  }

  /**
   * Safely parse JSON fields
   */
  private static parseJSON(value: any): any {
    if (!value) return null;
    if (typeof value === 'object') return value;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Get initials from a full name
   */
  private static getInitials(fullName: string): string {
    if (!fullName) return '';
    
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    
    return parts
      .filter(part => part.length > 0)
      .map(part => part[0].toUpperCase())
      .join('');
  }

  /**
   * Save filled PDF to a temporary file
   */
  static async saveTempPDF(pdfBuffer: Buffer, applicationId: string): Promise<string> {
    const tempDir = path.join(__dirname, '../../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFilePath = path.join(tempDir, `filled-application-${applicationId}-${Date.now()}.pdf`);
    fs.writeFileSync(tempFilePath, pdfBuffer);
    
    console.log(`✅ Temp PDF saved to: ${tempFilePath}`);
    return tempFilePath;
  }

  /**
   * Clean up temporary PDF file
   */
  static async cleanupTempPDF(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️  Cleaned up temp PDF: ${filePath}`);
      }
    } catch (error) {
      console.warn(`⚠️  Failed to clean up temp PDF: ${filePath}`, error);
    }
  }

  /**
   * Merge the filled merchant application PDF with the KindTap agreement PDF
   * Returns a buffer of the merged PDF
   */
  static async mergePDFWithKindTapAgreement(
    filledApplicationBuffer: Buffer
  ): Promise<Buffer> {
    try {
      console.log('📑 Starting PDF merge with KindTap agreement...');

      // Check if KindTap agreement exists
      if (!fs.existsSync(this.KINDTAP_AGREEMENT_PATH)) {
        throw new Error(`KindTap agreement PDF not found at: ${this.KINDTAP_AGREEMENT_PATH}`);
      }

      // Load both PDFs
      const filledPdfDoc = await PDFDocument.load(filledApplicationBuffer);
      const kindtapPdfBytes = fs.readFileSync(this.KINDTAP_AGREEMENT_PATH);
      const kindtapPdfDoc = await PDFDocument.load(kindtapPdfBytes);

      console.log(`📄 Filled application pages: ${filledPdfDoc.getPageCount()}`);
      console.log(`📄 KindTap agreement pages: ${kindtapPdfDoc.getPageCount()}`);

      // Create a new PDF to hold the merged result
      const mergedPdf = await PDFDocument.create();

      // Copy all pages from the filled application
      const applicationPages = await mergedPdf.copyPages(
        filledPdfDoc,
        filledPdfDoc.getPageIndices()
      );
      applicationPages.forEach(page => mergedPdf.addPage(page));

      // Copy all pages from the KindTap agreement
      const kindtapPages = await mergedPdf.copyPages(
        kindtapPdfDoc,
        kindtapPdfDoc.getPageIndices()
      );
      kindtapPages.forEach(page => mergedPdf.addPage(page));

      console.log(`✅ Merged PDF created with ${mergedPdf.getPageCount()} total pages`);

      // Save and return the merged PDF
      const mergedPdfBytes = await mergedPdf.save();
      return Buffer.from(mergedPdfBytes);
    } catch (error) {
      console.error('❌ Error merging PDFs:', error);
      throw new Error(
        `Failed to merge PDF with KindTap agreement: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Fill merchant application PDF and optionally merge with KindTap agreement
   */
  static async fillAndMergeMerchantApplicationPDF(
    application: MerchantApplication,
    includeKindTapAgreement: boolean = false
  ): Promise<Buffer> {
    try {
      // First, fill the merchant application PDF
      const filledPdfBuffer = await this.fillMerchantApplicationPDF(application);

      // If KindTap agreement should be included, merge it
      if (includeKindTapAgreement) {
        console.log('📋 Including KindTap agreement in document package...');
        return await this.mergePDFWithKindTapAgreement(filledPdfBuffer);
      }

      // Otherwise, just return the filled application
      return filledPdfBuffer;
    } catch (error) {
      console.error('❌ Error in fillAndMergeMerchantApplicationPDF:', error);
      throw error;
    }
  }
}

