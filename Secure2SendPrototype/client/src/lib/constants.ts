export const DOCUMENT_TYPES = {
  SS4_EIN_LETTER: {
    name: "SS-4 IRS EIN Confirmation Letter or W9",
    description: "Official IRS documentation showing your business EIN number",
    required: true,
    maxSize: 10,
    acceptedTypes: ["application/pdf", "image/jpeg", "image/png"]
  },
  W9: {
    name: "W9 Form", 
    description: "IRS Form W-9 for tax reporting purposes",
    required: true,
    maxSize: 10,
    acceptedTypes: ["application/pdf", "image/jpeg", "image/png"]
  },
  BENEFICIAL_OWNERSHIP: {
    name: "Beneficial Ownership Details",
    description: "For any owner with 20% or more ownership",
    required: true,
    maxSize: 10,
    acceptedTypes: ["application/pdf", "image/jpeg", "image/png"]
  },
  DRIVERS_LICENSE: {
    name: "Driver's License (front and back) or US Passport",
    description: "Government-issued photo identification",
    required: true,
    maxSize: 10,
    acceptedTypes: ["image/jpeg", "image/png", "application/pdf"]
  },
  
  CANNABIS_LICENSE: {
    name: "State & Local Cannabis License #'s",
    description: "All relevant cannabis business licenses",
    required: true,
    maxSize: 10,
    acceptedTypes: ["application/pdf", "image/jpeg", "image/png"]
  },
  SEED_TO_SALE_INFO: {
    name: "Seed-to-Sale Provider and ID",
    description: "Track and trace system information",
    required: true,
    maxSize: 5,
    acceptedTypes: ["application/pdf", "image/jpeg", "image/png"]
  },
  POS_INFO: {
    name: "POS Provider and ID",
    description: "Point of sale system information",
    required: true,
    maxSize: 5,
    acceptedTypes: ["application/pdf", "image/jpeg", "image/png"]
  },
  BANKING_INFO: {
    name: "Banking Information",
    description: "Routing and account information",
    required: true,
    maxSize: 10,
    acceptedTypes: ["application/pdf", "image/jpeg", "image/png"]
  },
  BANK_STATEMENTS: {
    name: "3 Most Recent Business Bank Statements",
    description: "Full detail, minimum 1 month",
    required: true,
    maxSize: 20,
    acceptedTypes: ["application/pdf"]
  },
  ARTICLES_OF_INCORPORATION: {
    name: "Articles of Incorporation",
    description: "Legal business formation documents",
    required: true,
    maxSize: 10,
    acceptedTypes: ["application/pdf"]
  },
  OPERATING_AGREEMENT: {
    name: "Operating Agreement or Bylaws",
    description: "If applicable to business structure",
    required: false,
    maxSize: 10,
    acceptedTypes: ["application/pdf"]
  },
  BUSINESS_LICENSE: {
    name: "Business License & State/Local Permits",
    description: "As required by state law",
    required: true,
    maxSize: 10,
    acceptedTypes: ["application/pdf", "image/jpeg", "image/png"]
  },
  VOIDED_CHECK: {
    name: "Voided Check or Bank Letter",
    description: "On official bank letterhead",
    required: true,
    maxSize: 10,
    acceptedTypes: ["application/pdf", "image/jpeg", "image/png"]
  },
  COA_PRODUCTS: {
    name: "COA's for Products You Produce",
    description: "Certificate of Analysis documentation",
    required: true,
    maxSize: 10,
    acceptedTypes: ["application/pdf"]
  },
  PROVIDER_CONTRACT: {
    name: "Provider Contract",
    description: "Service provider agreements",
    required: true,
    maxSize: 10,
    acceptedTypes: ["application/pdf"]
  },
  INSURANCE_COVERAGE: {
    name: "Insurance Coverage",
    description: "General liability insurance",
    required: true,
    maxSize: 10,
    acceptedTypes: ["application/pdf"]
  }
};
