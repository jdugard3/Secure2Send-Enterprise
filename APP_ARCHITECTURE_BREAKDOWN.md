# Secure2Send Enterprise - Complete App Architecture Breakdown

## 📋 Table of Contents
1. [Overview](#overview)
2. [Architecture Stack](#architecture-stack)
3. [Database Schema](#database-schema)
4. [File Upload System](#file-upload-system)
5. [Merchant Application Structure](#merchant-application-structure)
6. [Document Types](#document-types)
7. [OCR/AI Integration Points](#ocrai-integration-points)
8. [Key Services & APIs](#key-services--apis)

---

## Overview

**Secure2Send Enterprise** is a merchant onboarding platform that allows businesses to:
- Create and submit merchant applications for payment processing
- Upload required documents (W9, bank statements, IDs, etc.)
- Track application status through an admin review process
- Integrate with IRIS CRM for lead management
- Generate and e-sign PDF applications

**Tech Stack:**
- **Backend**: Express.js (Node.js/TypeScript)
- **Frontend**: React + TypeScript + Vite
- **Database**: PostgreSQL (via Drizzle ORM)
- **Storage**: Cloudflare R2 (S3-compatible) + local filesystem
- **Authentication**: Session-based with MFA (TOTP + Email OTP)
- **Deployment**: Fly.io

---

## Architecture Stack

### Backend Structure
```
server/
├── index.ts              # Express app entry point
├── routes.ts             # All API routes (3000+ lines)
├── auth.ts               # Authentication middleware
├── db.ts                 # Database connection
├── storage.ts            # Database operations (CRUD)
├── env.ts                # Environment configuration
├── middleware/
│   ├── fileValidation.ts    # File upload validation
│   ├── rateLimiting.ts      # Rate limiting
│   ├── mfaRequired.ts       # MFA enforcement
│   └── errorHandler.ts      # Error handling
└── services/
    ├── cloudflareR2.ts      # File storage service
    ├── pdfFillService.ts    # PDF form filling
    ├── irisCrmService.ts    # IRIS CRM integration
    ├── emailService.ts      # Email notifications
    ├── auditService.ts      # Audit logging
    └── encryption.ts        # Data encryption
```

### Frontend Structure
```
client/src/
├── components/
│   ├── merchant-application/    # Application wizard
│   ├── documents/               # Document upload/list
│   ├── admin/                   # Admin dashboard
│   └── layout/                  # Navigation/sidebar
├── pages/                       # Route pages
├── lib/
│   ├── merchantApplicationSchemas.ts  # Form validation schemas
│   └── queryClient.ts          # API client
└── hooks/                       # React hooks
```

---

## Database Schema

### Core Tables

#### `users`
- User accounts (ADMIN or CLIENT role)
- MFA settings (TOTP + Email OTP)
- Password reset tokens
- Onboarding progress tracking

#### `clients`
- Links users to client profiles
- Status: PENDING, APPROVED, REJECTED, INCOMPLETE
- IRIS CRM lead ID integration

#### `merchant_applications`
**This is the main table for OCR/AI autofill!**

Contains 100+ fields organized into:
- **Business Information**: Legal name, DBA, addresses, phone, tax ID
- **Banking**: Bank name, routing number, account number, bank officer info
- **Ownership**: Principal officers, beneficial owners (25%+), ownership percentages
- **Transactions**: Monthly/annual volume, average/high ticket amounts
- **Contacts**: Financial representative, authorized contacts
- **Certification**: Corporate resolution, signatures, agreement acceptance
- **IRIS Integration**: Lead IDs, sales rep info, MPA dates

**Key JSONB Fields** (arrays stored as JSON):
- `principalOfficers[]` - Array of officer objects
- `beneficialOwners[]` - Array of owner objects (25%+ ownership)
- `authorizedContacts[]` - Array of contact objects
- `financialRepresentative` - Single object
- `feeScheduleData` - Pricing/fee information
- `equipmentData[]` - Equipment orders

#### `documents`
- File metadata (filename, size, mime type)
- Document type (see Document Types below)
- Status: PENDING, APPROVED, REJECTED
- Links to `merchant_applications` via `merchantApplicationId`
- Cloudflare R2 storage keys/URLs
- File path (local fallback)

#### `sensitive_data`
- Encrypted PII (SSN, bank account numbers, routing numbers, tax IDs)
- Separate table for security compliance

---

## File Upload System

### Upload Flow

1. **Client Upload** (`client/src/components/documents/document-upload.tsx`)
   - User selects file(s) via drag-and-drop or file picker
   - File validated client-side (size, type)
   - FormData sent to `/api/documents` endpoint

2. **Server Processing** (`server/routes.ts` line 60)
   ```typescript
   POST /api/documents
   - Requires: file, documentType, merchantApplicationId
   - Middleware: requireAuth, secureUpload.single('file')
   - Validates: File type, size, MIME type, document type
   - Storage: Uploads to Cloudflare R2 (or local fallback)
   - Database: Creates document record
   - Audit: Logs upload action
   - Email: Sends confirmation to user
   ```

3. **File Storage**
   - **Primary**: Cloudflare R2 (S3-compatible)
     - Path: `documents/{clientId}/{hash}_{timestamp}.{ext}`
     - Server-side encryption (AES256)
   - **Fallback**: Local filesystem (`uploads/` directory)
   - **Metadata**: Stored in `documents` table

4. **File Validation** (`server/middleware/fileValidation.ts`)
   - MIME type checking
   - File signature validation (magic bytes)
   - Size limits (varies by document type)
   - Allowed types: PDF, JPEG, PNG

### File Access
- **Download**: `/api/documents/:id/download` (authenticated, rate-limited)
- **Admin Review**: Admins can approve/reject documents
- **R2 URLs**: Public URLs if `CLOUDFLARE_R2_PUBLIC_URL` configured

---

## Merchant Application Structure

### Application Wizard Steps

The application is broken into **4 main steps** (or simplified onboarding modes):

#### Step 1: Business Information
**Fields to extract from documents:**
- `legalBusinessName` - From Articles of Incorporation, Business License
- `dbaBusinessName` - From Business License, W9
- `billingAddress`, `locationAddress` - From Business License, Bank Statements
- `city`, `state`, `zip` - From any address document
- `businessPhone`, `contactEmail` - From business documents
- `federalTaxIdNumber` - From W9, SS4 EIN Letter
- `ownershipType` - From Articles of Incorporation
- `incorporationState` - From Articles of Incorporation
- `entityStartDate` - From Articles of Incorporation

**Banking Information:**
- `bankName` - From Bank Statements, Voided Check
- `abaRoutingNumber` - From Voided Check, Bank Statements
- `ddaNumber` (account number) - From Voided Check, Bank Statements
- `nameOnBankAccount` - From Voided Check, Bank Statements
- `accountOwnerFirstName`, `accountOwnerLastName` - From Voided Check

**Transaction Volume:**
- `monthlySalesVolume`, `annualVolume` - From Bank Statements
- `averageTicket`, `highTicket` - From Bank Statements (calculate)

**Principal Officers** (JSONB array):
```typescript
{
  name: string,
  title: string,
  ssn: string,           // From W9, Driver's License
  dob: string,           // From Driver's License, Passport
  equityPercentage: number,
  residentialAddress: string,
  city: string,
  state: string,
  zip: string,
  phoneNumber: string,
  email?: string,
  idNumber?: string,     // From Driver's License
  idExpDate?: string
}
```

#### Step 2: Certification & Agreement
- `corporateResolution` - Text field (usually manual)
- `merchantName`, `merchantTitle` - Signature fields
- `agreementAccepted` - Boolean checkbox

#### Step 3: Beneficial Ownership
**Beneficial Owners** (JSONB array - 25%+ ownership):
```typescript
{
  name: string,
  title: string,
  ownershipPercentage: number,  // Must be >= 25
  residentialAddress: string,
  city: string,
  state: string,
  zip: string,
  phoneNumber: string,
  email: string,
  idType: 'DRIVERS_LICENSE' | 'PASSPORT' | 'STATE_ID',
  idNumber: string,              // From ID document
  idState: string,
  idExpDate: string,
  idDateIssued: string,
  dob: string,                   // From ID document
  ssn: string,                   // From W9, Beneficial Ownership form
  ssnOrTinFromUs: boolean,
  controlPerson: boolean
}
```

#### Step 4: Representatives & Contacts
**Financial Representative:**
```typescript
{
  fullName: string,
  firstName: string,
  lastName: string,
  title: string,
  ownerOfficer: string,
  ownershipPercentage: number,
  officePhone: string,
  mobilePhone: string,
  email: string,
  ssn: string,
  birthday: string,
  stateIssuedIdNumber: string,
  idExpDate: string,
  issuingState: string,
  legalStreetAddress: string,
  city: string,
  state: string,
  zip: string,
  country: string
}
```

**Authorized Contacts** (array, max 2):
```typescript
{
  firstName: string,
  lastName: string,
  title: string,
  email: string,
  officePhone: string,
  mobilePhone: string
}
```

### Application Status Flow
```
DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED/REJECTED
```

---

## Document Types

### Supported Document Types (from schema)
```typescript
'SS4_EIN_LETTER'           // IRS EIN confirmation letter
'W9'                        // W-9 tax form
'BENEFICIAL_OWNERSHIP'      // Beneficial ownership form
'DRIVERS_LICENSE'           // Driver's license (ID)
'PASSPORT'                  // Passport (ID)
'SEED_TO_SALE_INFO'         // Cannabis-specific
'POS_INFO'                  // Point of sale information
'BANKING_INFO'              // Banking information form
'BANK_STATEMENTS'           // Bank statements (PDF/images)
'ARTICLES_OF_INCORPORATION' // Corporate documents
'OPERATING_AGREEMENT'       // LLC operating agreement
'BUSINESS_LICENSE'          // Business license
'VOIDED_CHECK'              // Voided check (banking)
'COA_PRODUCTS'              // Certificate of Analysis
'PROVIDER_CONTRACT'         // Provider contract
'INSURANCE_COVERAGE'        // Insurance documents
```

### Document-to-Field Mapping (for OCR/AI)

#### W9 Form
**Extract:**
- Business name → `legalBusinessName`
- DBA name → `dbaBusinessName`
- Tax ID (EIN/SSN) → `federalTaxIdNumber`
- Address → `billingAddress`
- Signer name → `principalOfficers[0].name`
- Signer SSN → `principalOfficers[0].ssn`

#### Voided Check
**Extract:**
- Bank name → `bankName`
- Routing number (bottom left) → `abaRoutingNumber`
- Account number (bottom center) → `ddaNumber`
- Account holder name → `nameOnBankAccount`, `accountOwnerFirstName`, `accountOwnerLastName`
- Address (if present) → Banking address fields

#### Bank Statements
**Extract:**
- Bank name → `bankName`
- Account number → `ddaNumber`
- Account holder → `nameOnBankAccount`
- Monthly deposits → `monthlySalesVolume` (calculate average)
- Transaction count → `monthlyTransactions`
- Largest transaction → `highTicket`
- Average transaction → `averageTicket` (calculate)

#### Driver's License / Passport
**Extract:**
- Full name → `beneficialOwners[].name` or `principalOfficers[].name`
- Date of birth → `dob` / `ownerBirthday`
- Address → `residentialAddress` / `ownerLegalAddress`
- License number → `stateIssuedIdNumber` / `ownerStateIssuedIdNumber`
- Expiration date → `idExpDate` / `ownerIdExpDate`
- Issue date → `idDateIssued` / `ownerIdDateIssued`
- State → `issuingState` / `ownerIssuingState`

#### Business License
**Extract:**
- Business name → `legalBusinessName`
- DBA name → `dbaBusinessName`
- Business address → `locationAddress`, `city`, `state`, `zip`
- License number → Store in `supportingInformation`
- Issue date → `entityStartDate` (if incorporation date not available)
- Business type → `businessType`

#### Articles of Incorporation
**Extract:**
- Legal business name → `legalBusinessName`
- Incorporation state → `incorporationState`
- Incorporation date → `entityStartDate`
- Business type → `ownershipType` (map to enum)
- Registered agent → `legalContactName`
- Registered agent address → `billingAddress`

#### SS4 EIN Letter
**Extract:**
- EIN number → `federalTaxIdNumber`
- Business name → `legalBusinessName`
- Address → `billingAddress`

#### Beneficial Ownership Form
**Extract:**
- Owner names → `beneficialOwners[].name`
- Ownership percentages → `beneficialOwners[].ownershipPercentage`
- SSNs → `beneficialOwners[].ssn`
- Addresses → `beneficialOwners[].residentialAddress`
- DOBs → `beneficialOwners[].dob`

---

## OCR/AI Integration Points

### Recommended Implementation Strategy

#### 1. **Document Processing Service** (New)
Create: `server/services/documentProcessingService.ts`

**Responsibilities:**
- Accept document file (PDF/image)
- Determine document type (classification)
- Extract structured data using OCR/AI
- Map extracted data to merchant application fields
- Return structured JSON for autofill

**API Design:**
```typescript
class DocumentProcessingService {
  // Main entry point
  static async processDocument(
    fileBuffer: Buffer,
    mimeType: string,
    documentType: string,
    merchantApplicationId: string
  ): Promise<ExtractedData> {
    // 1. Classify document type (if not provided)
    // 2. Run OCR/AI extraction
    // 3. Map to application schema
    // 4. Return structured data
  }

  // Document-specific extractors
  static async extractFromW9(fileBuffer: Buffer): Promise<W9Data>
  static async extractFromVoidedCheck(fileBuffer: Buffer): Promise<BankingData>
  static async extractFromBankStatement(fileBuffer: Buffer): Promise<TransactionData>
  static async extractFromDriversLicense(fileBuffer: Buffer): Promise<IDData>
  static async extractFromBusinessLicense(fileBuffer: Buffer): Promise<BusinessData>
  // ... etc
}
```

#### 2. **Integration Point: After Document Upload**

**Location**: `server/routes.ts` line 60 (`POST /api/documents`)

**Flow:**
```typescript
// After document is uploaded and stored:
1. Upload file → Cloudflare R2 / local storage
2. Create document record in database
3. [NEW] Trigger OCR/AI processing (async)
4. [NEW] Extract data from document
5. [NEW] Auto-fill merchant application fields
6. [NEW] Notify user of autofill completion
```

**Implementation:**
```typescript
// In routes.ts, after document creation:
const document = await storage.createDocument(documentData);

// Trigger async OCR processing (don't block response)
if (env.ENABLE_OCR_AUTOFILL) {
  DocumentProcessingService.processDocumentAsync(
    file.path, // or R2 URL
    file.mimetype,
    documentType,
    merchantApplicationId
  ).catch(error => {
    console.error('OCR processing failed:', error);
    // Don't fail the upload if OCR fails
  });
}
```

#### 3. **New API Endpoint: Autofill Application**

**Endpoint**: `POST /api/merchant-applications/:id/autofill`

**Purpose**: Manually trigger autofill from uploaded documents

**Flow:**
```typescript
1. Get all documents for merchant application
2. Process each document with OCR/AI
3. Merge extracted data (handle conflicts)
4. Update merchant application with extracted fields
5. Return updated application
```

#### 4. **Frontend Integration**

**Location**: `client/src/components/documents/document-upload.tsx`

**Add:**
- Checkbox: "Auto-fill application from this document"
- Progress indicator during OCR processing
- Toast notification when autofill completes
- Show extracted fields in a modal for user review/confirmation

---

## Key Services & APIs

### Existing Services You Can Leverage

#### `PdfFillService` (`server/services/pdfFillService.ts`)
- **Purpose**: Fills PDF templates with application data
- **Use Case**: After OCR extraction, you can verify by generating a PDF
- **Key Method**: `fillMerchantApplicationPDF(application: MerchantApplication)`

#### `CloudflareR2Service` (`server/services/cloudflareR2.ts`)
- **Purpose**: File storage and retrieval
- **Use Case**: Get document files for OCR processing
- **Key Methods**:
  - `uploadFile()` - Already used
  - `getDownloadUrl()` - Get secure URL for OCR service

#### `Storage` (`server/storage.ts`)
- **Purpose**: Database operations
- **Use Case**: Update merchant application with extracted data
- **Key Methods**:
  - `getMerchantApplicationById(id)`
  - `updateMerchantApplication(id, data)`
  - `getDocumentsByMerchantApplicationId(id)`

### API Endpoints Reference

#### Document Endpoints
- `POST /api/documents` - Upload document
- `GET /api/documents` - List user's documents
- `GET /api/documents/:id/download` - Download document
- `DELETE /api/documents/:id` - Delete document

#### Merchant Application Endpoints
- `GET /api/merchant-applications` - List applications
- `GET /api/merchant-applications/:id` - Get application
- `POST /api/merchant-applications` - Create application
- `PUT /api/merchant-applications/:id` - Update application
- `POST /api/merchant-applications/:id/submit` - Submit for review
- `GET /api/merchant-applications/:id/pdf` - Generate PDF

---

## Recommended OCR/AI Tools

### Option 1: AWS Textract
- **Pros**: Excellent form extraction, handles PDFs/images, structured data extraction
- **Cons**: Cost per page, AWS dependency
- **Best For**: W9, Bank Statements, Forms with fixed layouts

### Option 2: Google Document AI
- **Pros**: Pre-trained models for common forms (W9, invoices), good accuracy
- **Cons**: Google Cloud dependency, setup complexity
- **Best For**: Tax forms, invoices, structured documents

### Option 3: OpenAI Vision API (GPT-4 Vision)
- **Pros**: Flexible, can understand context, good for unstructured documents
- **Cons**: More expensive, less specialized for forms
- **Best For**: Business licenses, articles of incorporation, unstructured text

### Option 4: Tesseract OCR + Custom Parsing
- **Pros**: Free, open-source, full control
- **Cons**: Requires custom parsing logic, lower accuracy
- **Best For**: Simple text extraction, budget-conscious

### Option 5: Hybrid Approach (Recommended)
- **Textract** for structured forms (W9, voided checks)
- **GPT-4 Vision** for unstructured documents (business licenses, articles)
- **Custom regex/parsing** for simple extractions (phone numbers, addresses)

---

## Implementation Checklist

### Phase 1: Setup OCR Service
- [ ] Choose OCR/AI provider(s)
- [ ] Set up API keys in environment variables
- [ ] Create `DocumentProcessingService` class
- [ ] Implement document type classification
- [ ] Test with sample documents

### Phase 2: Document-Specific Extractors
- [ ] W9 form extractor
- [ ] Voided check extractor
- [ ] Bank statement extractor
- [ ] Driver's license extractor
- [ ] Business license extractor
- [ ] Articles of incorporation extractor

### Phase 3: Data Mapping
- [ ] Map extracted data to merchant application schema
- [ ] Handle field conflicts (multiple documents)
- [ ] Validate extracted data (phone numbers, SSNs, etc.)
- [ ] Store confidence scores for user review

### Phase 4: Integration
- [ ] Add OCR trigger to document upload endpoint
- [ ] Create autofill API endpoint
- [ ] Add frontend UI for autofill review
- [ ] Add user confirmation step before applying autofill

### Phase 5: Testing & Refinement
- [ ] Test with real documents
- [ ] Handle edge cases (poor quality scans, handwritten text)
- [ ] Add error handling and fallbacks
- [ ] Monitor OCR accuracy and costs

---

## Security Considerations

1. **PII Handling**: Extracted SSNs, account numbers must be encrypted (use `sensitive_data` table)
2. **Data Validation**: Validate all extracted data before saving (use existing Zod schemas)
3. **User Confirmation**: Always require user review/confirmation before autofill
4. **Audit Logging**: Log all OCR operations and autofill actions
5. **Error Handling**: Don't expose OCR service errors to users (log internally)
6. **Rate Limiting**: Limit OCR processing to prevent abuse

---

## Next Steps

1. **Review this document** and identify which document types to prioritize
2. **Choose OCR/AI provider** based on budget and accuracy needs
3. **Start with one document type** (recommend W9 or Voided Check - most structured)
4. **Build proof of concept** for that document type
5. **Iterate and expand** to other document types

---

## Questions to Consider

1. **Accuracy Requirements**: What accuracy level is acceptable? (90%? 95%?)
2. **User Review**: Should users review all extracted data, or only low-confidence fields?
3. **Conflict Resolution**: What happens if two documents have conflicting data?
4. **Cost Management**: How to handle OCR costs? (per-document fee? monthly limit?)
5. **Fallback Strategy**: What if OCR fails? (manual entry, retry, different provider?)

---

**Last Updated**: Generated for OCR/AI autofill implementation planning
**Contact**: Review with development team before implementation



