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

// Beneficial Owner Schema  
export const beneficialOwnerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  ssn: z.string().regex(/^\d{3}-\d{2}-\d{4}$/, "SSN must be in format XXX-XX-XXXX"),
  ownershipPercentage: z.number().min(25, "Must own at least 25%").max(100),
  dob: z.string().min(1, "Date of birth is required"),
  title: z.string().min(1, "Title is required"),
  residentialAddress: z.string().min(1, "Residential address is required"),
  city: z.string().min(1, "City is required"),
  state: z.enum(US_STATES),
  zip: z.string().regex(/^\d{5}(-\d{4})?$/, "ZIP code must be 5 or 9 digits"),
  phoneNumber: z.string().min(10, "Phone number is required"),
  email: z.string().email("Valid email is required"),
  idType: z.enum(['DRIVERS_LICENSE', 'PASSPORT', 'OTHER']),
  idNumber: z.string().min(1, "ID number is required"),
  idState: z.enum(US_STATES).optional(),
  idExpDate: z.string().min(1, "ID expiration date is required"),
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

// Business Information Schema (Step 1)
export const businessInformationSchema = z.object({
  legalBusinessName: z.string().min(1, "Legal business name is required"),
  dbaBusinessName: z.string().optional(),
  billingAddress: z.string().min(1, "Billing address is required"),
  locationAddress: z.string().min(1, "Location address is required"),
  city: z.string().min(1, "City is required"),
  state: z.enum(US_STATES, { errorMap: () => ({ message: "Please select a valid state" }) }),
  zip: z.string().regex(/^\d{5}(-\d{4})?$/, "ZIP code must be 5 or 9 digits"),
  businessPhone: z.string().min(10, "Business phone is required"),
  businessFaxNumber: z.string().optional(),
  customerServicePhone: z.string().min(10, "Customer service phone is required"),
  federalTaxIdNumber: z.string().min(1, "Federal Tax ID is required"),
  contactName: z.string().min(1, "Contact name is required"),
  contactPhoneNumber: z.string().min(10, "Contact phone is required"),
  contactEmail: z.string().email("Valid contact email is required"),
  websiteAddress: z.string().url("Valid website URL is required").optional().or(z.literal("")),
  
  // Business Description
  processingCategories: z.array(z.enum(PROCESSING_CATEGORIES)).min(1, "Select at least one processing category"),
  ownershipType: z.enum(OWNERSHIP_TYPES, { errorMap: () => ({ message: "Please select an ownership type" }) }),
  
  // Principal Officers
  principalOfficers: z.array(principalOfficerSchema).min(1, "At least one principal officer is required"),
  
  // Settlement/Banking
  bankName: z.string().min(1, "Bank name is required"),
  abaRoutingNumber: z.string().regex(/^\d{9}$/, "ABA routing number must be 9 digits"),
  accountName: z.string().min(1, "Account name is required"),
  ddaNumber: z.string().min(1, "DDA number is required"),
});

// Fee Schedule Schema (Step 2)
export const feeScheduleStepSchema = z.object({
  feeScheduleData: z.array(feeScheduleSchema).optional().default([]),
  supportingInformation: z.array(supportingInformationSchema).optional().default([]),
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
});

// Individual step schemas for validation
export const stepSchemas = {
  1: businessInformationSchema,
  2: feeScheduleStepSchema,
  3: certificationSchema,
  4: beneficialOwnershipSchema,
} as const;

// Types
export type BusinessInformation = z.infer<typeof businessInformationSchema>;
export type FeeScheduleStep = z.infer<typeof feeScheduleStepSchema>;
export type Certification = z.infer<typeof certificationSchema>;
export type BeneficialOwnership = z.infer<typeof beneficialOwnershipSchema>;
export type MerchantApplicationForm = z.infer<typeof merchantApplicationSchema>;
export type PrincipalOfficer = z.infer<typeof principalOfficerSchema>;
export type BeneficialOwner = z.infer<typeof beneficialOwnerSchema>;
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

export const defaultBeneficialOwner: Partial<BeneficialOwner> = {
  name: "",
  ssn: "",
  dob: "",
  ownershipPercentage: 25,
  title: "",
  residentialAddress: "",
  city: "",
  state: undefined,
  zip: "",
  phoneNumber: "",
  email: "",
  idType: 'DRIVERS_LICENSE',
  idNumber: "",
  idState: undefined,
  idExpDate: "",
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
