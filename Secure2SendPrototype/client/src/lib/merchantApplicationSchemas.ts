import { z } from "zod";

// US States list for validation
export const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
] as const;

export const PROCESSING_CATEGORIES = [
  'MOBILE',
  'CARD_NOT_PRESENT_E_COMMERCE', 
  'CARD_PRESENT_RETAIL',
  'MAIL_ORDER_TELEPHONE_MOTO',
  'OTHER'
] as const;

export const OWNERSHIP_TYPES = [
  'NON_PROFIT',
  'SOLE_PROPRIETORSHIP', 
  'GOVERNMENT',
  'PERSONAL',
  'PARTNERSHIP_LLP',
  'FINANCIAL_INSTITUTION',
  'CORPORATION_PUBLICLY_TRADED',
  'CORPORATION_PRIVATELY_HELD',
  'LLC',
  'S_CORP'
] as const;

// Business Types for IRIS integration
export const BUSINESS_TYPES = [
  'Retail',
  'E-Commerce',
  'Restaurant',
  'Professional Services',
  'Healthcare',
  'Other'
] as const;

// ID Types for beneficial ownership
export const ID_TYPES = [
  'DRIVERS_LICENSE',
  'PASSPORT',
  'STATE_ID',
  'OTHER'
] as const;

// Financial Representative Schema
export const financialRepresentativeSchema = z.object({
  fullName: z.string().min(1, "FR full name is required"),
  firstName: z.string().min(1, "FR first name is required"),
  lastName: z.string().min(1, "FR last name is required"),
  title: z.string().min(1, "FR title is required"),
  ownerOfficer: z.string().min(1, "Owner/Officer status is required"),
  ownershipPercentage: z.number().min(0).max(100),
  officePhone: z.string().min(10, "Office phone is required"),
  mobilePhone: z.string().min(10, "Mobile phone is required"),
  email: z.string().email("Valid email is required"),
  ssn: z.string().regex(/^\d{3}-\d{2}-\d{4}$/, "SSN must be in format XXX-XX-XXXX"),
  birthday: z.string().min(1, "Birthday is required"),
  stateIssuedIdNumber: z.string().min(1, "State issued ID number is required"),
  idExpDate: z.string().min(1, "ID expiration date is required"),
  issuingState: z.enum(US_STATES),
  legalStreetAddress: z.string().min(1, "Legal address is required"),
  city: z.string().min(1, "City is required"),
  state: z.enum(US_STATES),
  zip: z.string().regex(/^\d{5}(-\d{4})?$/, "ZIP code must be 5 or 9 digits"),
  country: z.string().default("US"),
});

// Authorized Contact Schema
export const authorizedContactSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  title: z.string().min(1, "Title is required"),
  email: z.string().email("Valid email is required"),
  officePhone: z.string().min(10, "Office phone is required"),
  mobilePhone: z.string().min(10, "Mobile phone is required"),
});

// Transaction and Volume Schema
export const transactionVolumeSchema = z.object({
  averageTicket: z.string().min(1, "Average ticket is required"),
  highTicket: z.string().min(1, "High ticket is required"),
  monthlySalesVolume: z.string().min(1, "Monthly sales volume is required"),
  monthlyTransactions: z.number().min(1, "Monthly transactions is required").optional(),
  annualVolume: z.string().optional(), // Auto-calculated
  annualTransactions: z.number().optional(), // Auto-calculated
});

// Principal Officer Schema
export const principalOfficerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  title: z.string().min(1, "Title is required"),
  ssn: z.string().regex(/^\d{3}-\d{2}-\d{4}$/, "SSN must be in format XXX-XX-XXXX"),
  dob: z.string().min(1, "Date of birth is required"),
  equityPercentage: z.number().min(0).max(100),
  residentialAddress: z.string().min(1, "Residential address is required"),
  city: z.string().min(1, "City is required"),
  state: z.enum(US_STATES, { errorMap: () => ({ message: "Please select a valid state" }) }),
  zip: z.string().regex(/^\d{5}(-\d{4})?$/, "ZIP code must be 5 or 9 digits"),
  phoneNumber: z.string().min(10, "Phone number is required"),
});

// Beneficial Owner Schema (Enhanced for IRIS CRM)
export const beneficialOwnerSchema = z.object({
  // Basic Information
  name: z.string().min(1, "Name is required"),
  title: z.string().min(1, "Title is required"),
  ownershipPercentage: z.number().min(25, "Must own at least 25%").max(100),
  
  // Address Information
  residentialAddress: z.string().min(1, "Residential address is required"),
  city: z.string().min(1, "City is required"),
  state: z.enum(US_STATES),
  zip: z.string().regex(/^\d{5}(-\d{4})?$/, "ZIP code must be 5 or 9 digits"),
  country: z.string().default("US"),
  
  // Contact Information
  phoneNumber: z.string().min(10, "Phone number is required"),
  email: z.string().email("Valid email is required"),
  
  // Identification
  idType: z.enum(ID_TYPES),
  idNumber: z.string().min(1, "ID number is required"),
  idState: z.enum(US_STATES).optional(),
  idExpDate: z.string().min(1, "ID expiration date is required"),
  idDateIssued: z.string().min(1, "ID date issued is required"),
  
  // Personal Information
  dob: z.string().min(1, "Date of birth is required"),
  ssn: z.string().regex(/^\d{3}-\d{2}-\d{4}$/, "SSN must be in format XXX-XX-XXXX"),
  ssnOrTinFromUs: z.boolean().default(true),
  controlPerson: z.boolean().default(false),
});

// Fee Schedule Schema
export const feeScheduleSchema = z.object({
  qualificationDiscountFee: z.number().min(0).optional(),
  qualificationPerItem: z.number().min(0).optional(),
  minimumFee: z.number().min(0).optional(),
  consumerFee: z.number().default(3.50),
  dispensaryFee: z.number().default(1.00),
});

// Supporting Information Schema
export const supportingInformationSchema = z.object({
  salesInformation: z.object({
    averageTicket: z.number().min(0).optional(),
    highTicket: z.number().min(0).optional(),
    monthlyVolume: z.number().min(0).optional(),
    annualVolume: z.number().min(0).optional(),
  }).optional(),
  monthlyFees: z.object({
    monthlyMin: z.number().default(10.00),
    monthlyServiceFee: z.number().default(0.00),
    wirelessFee: z.number().default(0.00),
    industryNonCompliance: z.number().default(0.00),
    miscMonthlyFee: z.number().default(0.00),
    chargebackFee: z.number().default(25.00),
  }).optional(),
  miscellaneous: z.object({
    salesTerminalPurchaseDesired: z.boolean().default(false),
    generalFee: z.number().default(35.00),
    rushFee: z.number().default(35.00),
    achRejectFee: z.number().default(35.00),
    onlineReportingFee: z.number().default(35.00),
    monthlyServiceFee: z.number().default(10.00),
    monthlyFee: z.number().default(0.00),
    reprintTransactionFee: z.number().default(35.00),
    batchFee: z.number().default(0.00),
  }).optional(),
});

// Equipment Schema
export const equipmentSchema = z.object({
  equipmentName: z.string().optional(),
  quantity: z.number().min(0).default(1),
  price: z.number().min(0).default(395.00),
  notes: z.string().optional(),
  shippingCost: z.number().min(0).optional(),
  billToMerchant: z.boolean().default(true),
});

// Business Information Schema (Step 1) - Enhanced for IRIS CRM
export const businessInformationSchema = z.object({
  // MPA and Sales Information
  mpaSignedDate: z.string().min(1, "MPA signed date is required"),
  salesRepName: z.string().optional(),
  
  // DBA Information
  dbaBusinessName: z.string().min(1, "DBA name is required"),
  locationAddress: z.string().min(1, "Location address is required"),
  city: z.string().min(1, "City is required"),
  state: z.enum(US_STATES, { errorMap: () => ({ message: "Please select a valid state" }) }),
  zip: z.string().regex(/^\d{5}(-\d{4})?$/, "ZIP code must be 5 or 9 digits"),
  businessPhone: z.string().min(10, "Business phone is required"),
  contactEmail: z.string().email("Valid contact email is required"),
  productOrServiceSold: z.string().min(1, "Product or service sold is required"),
  dbaWebsite: z.string().min(1, "DBA website is required"),
  multipleLocations: z.boolean().default(false),
  
  // Corporate Information
  legalBusinessName: z.string().min(1, "Legal business name is required"),
  billingAddress: z.string().min(1, "Legal address is required"),
  legalContactName: z.string().min(1, "Legal contact name is required"),
  legalPhone: z.string().min(10, "Legal phone is required"),
  legalEmail: z.string().email("Valid legal email is required"),
  ownershipType: z.enum(OWNERSHIP_TYPES, { errorMap: () => ({ message: "Please select an ownership type" }) }),
  federalTaxIdNumber: z.string().min(1, "Federal Tax ID is required"),
  incorporationState: z.enum(US_STATES, { errorMap: () => ({ message: "Please select incorporation state" }) }),
  entityStartDate: z.string().min(1, "Entity start date is required"),
  
  // Transaction and Volume
  ...transactionVolumeSchema.shape,
  
  // Enhanced Banking Information
  accountOwnerFirstName: z.string().min(1, "Account owner first name is required"),
  accountOwnerLastName: z.string().min(1, "Account owner last name is required"),
  nameOnBankAccount: z.string().min(1, "Name on bank account is required"),
  bankName: z.string().min(1, "Bank name is required"),
  abaRoutingNumber: z.string().regex(/^\d{9}$/, "ABA routing number must be 9 digits"),
  ddaNumber: z.string().min(1, "Account number is required"),
  bankOfficerName: z.string().min(1, "Bank officer name is required"),
  bankOfficerPhone: z.string().min(10, "Bank officer phone is required"),
  bankOfficerEmail: z.string().email("Valid bank officer email is required"),
  
  // Enhanced Owner Information (IRIS CRM fields - optional for now)
  ownerFullName: z.string().optional(),
  ownerFirstName: z.string().optional(),
  ownerLastName: z.string().optional(),
  ownerOfficer: z.string().optional(),
  ownerTitle: z.string().optional(),
  ownerOwnershipPercentage: z.string().optional(),
  ownerMobilePhone: z.string().optional(),
  ownerEmail: z.string().optional(),
  ownerSsn: z.string().optional(),
  ownerBirthday: z.string().optional(),
  ownerStateIssuedIdNumber: z.string().optional(),
  ownerIdExpDate: z.string().optional(),
  ownerIssuingState: z.enum(US_STATES).optional(),
  ownerIdDateIssued: z.string().optional(),
  ownerLegalAddress: z.string().optional(),
  ownerCity: z.string().optional(),
  ownerState: z.enum(US_STATES).optional(),
  ownerZip: z.string().optional(),
  ownerCountry: z.string().default("US"),
  
  // Business Operations
  businessType: z.enum(BUSINESS_TYPES).default('Retail'),
  refundGuarantee: z.boolean().default(false),
  refundDays: z.number().min(0).optional(),
  posSystem: z.string().min(1, "POS system is required"),
  
  // Business Description
  processingCategories: z.array(z.enum(PROCESSING_CATEGORIES)).min(1, "Select at least one processing category"),
  
  // Legacy fields (keeping for backward compatibility) - all optional
  businessFaxNumber: z.string().optional(),
  customerServicePhone: z.string().optional(),
  contactName: z.string().optional(),
  contactPhoneNumber: z.string().optional(),
  websiteAddress: z.string().optional(),
  accountName: z.string().optional(), // Replaced by nameOnBankAccount
  
  // Principal Officers (keeping existing structure)
  principalOfficers: z.array(principalOfficerSchema).min(1, "At least one principal officer is required"),
});

// Fee Schedule Schema (Step 2)
export const feeScheduleStepSchema = z.object({
  feeScheduleData: feeScheduleSchema.optional().default({}),
  supportingInformation: supportingInformationSchema.optional().default({}),
  equipmentData: z.array(equipmentSchema).optional().default([]),
});

// Certification Schema (Step 3)  
export const certificationSchema = z.object({
  corporateResolution: z.string().min(1, "Corporate resolution is required"),
  merchantName: z.string().min(1, "Merchant name is required"),
  merchantTitle: z.string().min(1, "Merchant title is required"),
  merchantDate: z.string().min(1, "Merchant signature date is required"),
  agreementAccepted: z.boolean().refine(val => val === true, {
    message: "You must accept the terms and conditions"
  }),
});

// Beneficial Ownership Schema (Step 4)
export const beneficialOwnershipSchema = z.object({
  beneficialOwners: z.array(beneficialOwnerSchema).min(1, "At least one beneficial owner is required"),
});

// Financial Representative and Authorized Contacts Schema (Step 5)
export const representativesContactsSchema = z.object({
  // Financial Representative
  financialRepresentative: financialRepresentativeSchema.optional(),
  
  // Authorized Contacts
  authorizedContacts: z.array(authorizedContactSchema).min(1, "At least one authorized contact is required").max(2, "Maximum 2 authorized contacts allowed"),
});

// Complete Application Schema
export const merchantApplicationSchema = z.object({
  // Step 1: Business Information
  ...businessInformationSchema.shape,
  
  // Step 2: Fee Schedule
  ...feeScheduleStepSchema.shape,
  
  // Step 3: Certification
  ...certificationSchema.shape,
  
  // Step 4: Beneficial Ownership
  ...beneficialOwnershipSchema.shape,
  
  // Step 5: Representatives and Contacts
  ...representativesContactsSchema.shape,
});

// Individual step schemas for validation
export const stepSchemas = {
  1: businessInformationSchema,
  2: feeScheduleStepSchema,
  3: certificationSchema,
  4: beneficialOwnershipSchema,
  5: representativesContactsSchema,
} as const;

// Types
export type BusinessInformation = z.infer<typeof businessInformationSchema>;
export type FeeScheduleStep = z.infer<typeof feeScheduleStepSchema>;
export type Certification = z.infer<typeof certificationSchema>;
export type BeneficialOwnership = z.infer<typeof beneficialOwnershipSchema>;
export type RepresentativesContacts = z.infer<typeof representativesContactsSchema>;
export type MerchantApplicationForm = z.infer<typeof merchantApplicationSchema>;
export type PrincipalOfficer = z.infer<typeof principalOfficerSchema>;
export type BeneficialOwner = z.infer<typeof beneficialOwnerSchema>;
export type FinancialRepresentative = z.infer<typeof financialRepresentativeSchema>;
export type AuthorizedContact = z.infer<typeof authorizedContactSchema>;
export type TransactionVolume = z.infer<typeof transactionVolumeSchema>;
export type FeeSchedule = z.infer<typeof feeScheduleSchema>;
export type SupportingInformation = z.infer<typeof supportingInformationSchema>;
export type Equipment = z.infer<typeof equipmentSchema>;

// Default values
export const defaultPrincipalOfficer: Partial<PrincipalOfficer> = {
  name: "",
  title: "",
  ssn: "",
  dob: "",
  equityPercentage: 0,
  residentialAddress: "",
  city: "",
  state: undefined,
  zip: "",
  phoneNumber: "",
};

export const defaultBeneficialOwner: BeneficialOwner = {
  name: "",
  title: "",
  ownershipPercentage: 25,
  residentialAddress: "",
  city: "",
  state: "AL", // Default to first state
  zip: "",
  country: "US",
  phoneNumber: "",
  email: "",
  idType: 'DRIVERS_LICENSE',
  idNumber: "",
  idState: "AL", // Default to first state
  idExpDate: "",
  idDateIssued: "",
  dob: "",
  ssn: "",
  ssnOrTinFromUs: true,
  controlPerson: false,
};

export const defaultEquipment: Equipment = {
  equipmentName: 'PAX A920 PRO',
  quantity: 1,
  price: 395.00,
  billToMerchant: true,
};

export const defaultFeeSchedule: FeeSchedule = {
  consumerFee: 3.50,
  dispensaryFee: 1.00,
};

// New default values for IRIS CRM fields
export const defaultFinancialRepresentative: Partial<FinancialRepresentative> = {
  fullName: "",
  firstName: "",
  lastName: "",
  title: "",
  ownerOfficer: "",
  ownershipPercentage: 0,
  officePhone: "",
  mobilePhone: "",
  email: "",
  ssn: "",
  birthday: "",
  stateIssuedIdNumber: "",
  idExpDate: "",
  issuingState: "AL",
  legalStreetAddress: "",
  city: "",
  state: "AL",
  zip: "",
  country: "US",
};

export const defaultAuthorizedContact: AuthorizedContact = {
  firstName: "",
  lastName: "",
  title: "",
  email: "",
  officePhone: "",
  mobilePhone: "",
};

export const defaultTransactionVolume: TransactionVolume = {
  averageTicket: "",
  highTicket: "",
  monthlySalesVolume: "",
  monthlyTransactions: undefined,
  annualVolume: undefined,
  annualTransactions: undefined,
};
