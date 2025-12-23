/**
 * TypeScript types for OCR document processing
 */

export interface ExtractedW9Data {
  legalBusinessName?: string;
  dbaBusinessName?: string;
  federalTaxIdNumber?: string;
  businessAddress?: string;
  city?: string;
  state?: string;
  zip?: string;
  signerName?: string;
  signerSSN?: string;
  businessType?: 'SOLE_PROPRIETOR' | 'PARTNERSHIP' | 'LLC' | 'CORPORATION' | 'S_CORP' | 'PARTNERSHIP_LLP';
  confidence: number;
}

export interface ExtractedBankingData {
  bankName?: string;
  routingNumber?: string;
  accountNumber?: string;
  accountHolderName?: string;
  accountHolderFirstName?: string;
  accountHolderLastName?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  confidence: number;
}

export interface ExtractedBankStatementData {
  bankName?: string;
  accountNumber?: string;
  accountHolderName?: string;
  statementPeriod?: string;
  startDate?: string;
  endDate?: string;
  totalDeposits?: number;
  transactionCount?: number;
  largestTransaction?: number;
  averageTransaction?: number;
  monthlySalesVolume?: number;
  confidence: number;
}

export interface ExtractedIDData {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  dob?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  licenseNumber?: string;
  expirationDate?: string;
  issueDate?: string;
  issuingState?: string;
  idType?: 'DRIVERS_LICENSE' | 'PASSPORT' | 'STATE_ID';
  confidence: number;
}

export interface ExtractedBusinessLicenseData {
  legalBusinessName?: string;
  dbaBusinessName?: string;
  businessAddress?: string;
  locationAddress?: string;
  city?: string;
  state?: string;
  zip?: string;
  licenseNumber?: string;
  licenseType?: string;
  issueDate?: string;
  expirationDate?: string;
  businessType?: string;
  confidence: number;
}

export interface ExtractedArticlesOfIncorporationData {
  legalBusinessName?: string;
  incorporationState?: string;
  incorporationDate?: string;
  entityStartDate?: string;
  ownershipType?: 'LLC' | 'CORPORATION_PRIVATELY_HELD' | 'CORPORATION_PUBLICLY_TRADED' | 'S_CORP' | 'PARTNERSHIP_LLP';
  registeredAgentName?: string;
  registeredAgentAddress?: string;
  registeredAgentCity?: string;
  registeredAgentState?: string;
  registeredAgentZip?: string;
  confidence: number;
}

export interface ExtractedSS4EINLetterData {
  einNumber?: string;
  legalBusinessName?: string;
  businessAddress?: string;
  city?: string;
  state?: string;
  zip?: string;
  confidence: number;
}

export interface ExtractedBeneficialOwnershipData {
  owners: Array<{
    fullName?: string;
    firstName?: string;
    lastName?: string;
    ownershipPercentage?: number;
    ssn?: string;
    dob?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    title?: string;
  }>;
  confidence: number;
}

// Union type for all extracted data
export type ExtractedDocumentData =
  | ExtractedW9Data
  | ExtractedBankingData
  | ExtractedBankStatementData
  | ExtractedIDData
  | ExtractedBusinessLicenseData
  | ExtractedArticlesOfIncorporationData
  | ExtractedSS4EINLetterData
  | ExtractedBeneficialOwnershipData;

export interface ProcessingResult {
  success: boolean;
  data: ExtractedDocumentData | null;
  documentHash: string;
  confidenceScore?: number;
  error?: string;
  processingTimeMs?: number;
}

export interface ProcessingOptions {
  documentType: string;
  mimeType: string;
  userId: string;
  merchantApplicationId?: string;
  documentId?: string;
  timeout?: number; // in milliseconds, default 30000
  maxImageSize?: number; // in pixels, default 4096
}

