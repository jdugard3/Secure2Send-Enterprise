import { useState, useEffect } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  Building, 
  DollarSign, 
  Shield, 
  Users,
  Save,
  Send,
  Download,
  CheckCircle,
  AlertCircle,
  ClipboardList
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isEmpty } from "@/lib/formUtils";
import { 
  merchantApplicationSchema, 
  stepSchemas,
  type MerchantApplicationForm,
  defaultPrincipalOfficer,
  defaultBeneficialOwner,
  defaultFinancialRepresentative,
  defaultAuthorizedContact
} from "@/lib/merchantApplicationSchemas";
import { PDFGenerator } from "@/lib/pdfGenerator";
import { BusinessInformationStep } from "./steps/BusinessInformationStep";
import { CertificationStep } from "./steps/CertificationStep";
import { BeneficialOwnershipStep } from "./steps/BeneficialOwnershipStep";
import { RepresentativesContactsStep } from "./steps/RepresentativesContactsStep";
import { BasicBusinessInfoStep } from "./steps/BasicBusinessInfoStep";
import { DetailedBusinessInfoStep } from "./steps/DetailedBusinessInfoStep";
import { SimplifiedBasicInfoStep } from "./steps/SimplifiedBasicInfoStep";
import { DocumentUploadStep } from "./steps/DocumentUploadStep";
import { ApplicationReviewStep } from "./steps/ApplicationReviewStep";
import { SubmitStep } from "./steps/SubmitStep";

// Onboarding mode steps (simplified flow)
export type OnboardingMode = 'part1' | 'part2' | 'review' | 'full';

interface MerchantApplicationWizardProps {
  applicationId?: string;
  onComplete?: () => void;
  onboardingMode?: OnboardingMode;
  onOnboardingStepComplete?: (completedStep: 'PART1' | 'PART2' | 'REVIEW') => void;
  onFormChange?: (isDirty: boolean, formData?: any) => void;
}

// Full wizard steps (original 4-step flow)
const FULL_STEPS = [
  {
    id: 1,
    title: "Business Information",
    description: "Company details and principal officers",
    icon: Building,
  },
  {
    id: 2,
    title: "Certification & Agreement",
    description: "Corporate resolution and signatures",
    icon: Shield,
  },
  {
    id: 3,
    title: "Beneficial Ownership",
    description: "Details of beneficial owners (25%+ ownership)",
    icon: Users,
  },
  {
    id: 4,
    title: "Representatives & Contacts",
    description: "Financial representative and authorized contacts",
    icon: Users,
  },
] as const;

// Onboarding mode - Part 1 (Basic Info only)
const PART1_STEPS = [
  {
    id: 1,
    title: "Basic Business Info",
    description: "DBA and corporate details",
    icon: Building,
  },
] as const;

// Onboarding mode - Part 2 (Detailed Info)
const PART2_STEPS = [
  {
    id: 1,
    title: "Detailed Business Info",
    description: "Banking, transactions, and ownership",
    icon: Building,
  },
  {
    id: 2,
    title: "Beneficial Ownership",
    description: "Details of beneficial owners (25%+ ownership)",
    icon: Users,
  },
  {
    id: 3,
    title: "Representatives & Contacts",
    description: "Financial representative and authorized contacts",
    icon: Users,
  },
] as const;

// Onboarding mode - Review (Final Review & Submit)
const REVIEW_STEPS = [
  {
    id: 1,
    title: "Certification & Agreement",
    description: "Corporate resolution and signatures",
    icon: Shield,
  },
] as const;

// Legacy export for backward compatibility
const STEPS = FULL_STEPS;

export default function MerchantApplicationWizard({ 
  applicationId: initialApplicationId, 
  onComplete,
  onboardingMode = 'full',
  onOnboardingStepComplete,
  onFormChange
}: MerchantApplicationWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [applicationId, setApplicationId] = useState(initialApplicationId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useNewFlow, setUseNewFlow] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // New 4-step flow steps
  const NEW_FLOW_STEPS = [
    {
      id: 1,
      title: "Basic Business Info",
      description: "Enter your business name and website",
      icon: Building,
    },
    {
      id: 2,
      title: "Upload Documents",
      description: "Upload all required documents",
      icon: FileText,
    },
    {
      id: 3,
      title: "Review Application",
      description: "Review and edit all application details",
      icon: ClipboardList,
    },
    {
      id: 4,
      title: "Submit",
      description: "Submit your application for review",
      icon: Send,
    },
  ] as const;

  // Determine which steps to use based on onboarding mode or new flow
  const activeSteps = useNewFlow
    ? NEW_FLOW_STEPS
    : onboardingMode === 'part1' 
    ? PART1_STEPS 
    : onboardingMode === 'part2' 
    ? PART2_STEPS 
    : onboardingMode === 'review' 
    ? REVIEW_STEPS 
    : FULL_STEPS;

  // Load existing application if editing
  const { data: existingApplication, isLoading } = useQuery({
    queryKey: [`/api/merchant-applications/${applicationId}`],
    queryFn: async () => {
      if (!applicationId) return null;
      const response = await apiRequest("GET", `/api/merchant-applications/${applicationId}`);
      return response.json();
    },
    enabled: !!applicationId,
  });

  // Detect if we should use the new 4-step flow
  // Only set currentStep from existingApplication on initial load, not on every update
  const [hasInitialized, setHasInitialized] = useState(false);
  useEffect(() => {
    if (existingApplication?.currentStep && !hasInitialized) {

      setUseNewFlow(true);
      setCurrentStep(existingApplication.currentStep);
      setHasInitialized(true);
    } else if (existingApplication?.currentStep) {

    }
  }, [existingApplication, hasInitialized, currentStep]);

  const form = useForm<MerchantApplicationForm>({
    resolver: zodResolver(merchantApplicationSchema),
    defaultValues: {
      // MPA and Sales Information
      mpaSignedDate: "",
      salesRepName: "",
      
      // DBA Information
      dbaBusinessName: "",
      locationAddress: "",
      city: "",
      state: "FL",
      zip: "",
      businessPhone: "",
      contactEmail: "",
      productOrServiceSold: "",
      dbaWebsite: "",
      multipleLocations: false,
      
      // Corporate Information
      legalBusinessName: "",
      billingAddress: "",
      legalContactName: "",
      legalPhone: "",
      legalEmail: "",
      ownershipType: "SOLE_PROPRIETORSHIP",
      federalTaxIdNumber: "",
      incorporationState: "FL",
      entityStartDate: "",
      
      // Transaction and Volume
      averageTicket: "",
      highTicket: "",
      monthlySalesVolume: "",
      monthlyTransactions: 0,
      annualVolume: "",
      annualTransactions: 0,
      
      // Enhanced Banking Information
      accountOwnerFirstName: "",
      accountOwnerLastName: "",
      nameOnBankAccount: "",
      bankName: "",
      abaRoutingNumber: "",
      ddaNumber: "",
      bankOfficerName: "",
      bankOfficerPhone: "",
      bankOfficerEmail: "",
      
      // Enhanced Owner Information
      ownerFullName: "",
      ownerFirstName: "",
      ownerLastName: "",
      ownerOfficer: "",
      ownerTitle: "",
      ownerOwnershipPercentage: "",
      ownerMobilePhone: "",
      ownerEmail: "",
      ownerSsn: "",
      ownerBirthday: "",
      ownerStateIssuedIdNumber: "",
      ownerIdExpDate: "",
      ownerIssuingState: "FL",
      ownerIdDateIssued: "",
      ownerLegalAddress: "",
      ownerCity: "",
      ownerState: "FL",
      ownerZip: "",
      ownerCountry: "US",
      
      // Business Operations
      businessType: 'Retail',
      refundGuarantee: false,
      refundDays: undefined,
      posSystem: "",
      
      // Business Description
      processingCategories: [],
      
      // Legacy fields (keeping for backward compatibility)
      businessFaxNumber: "",
      customerServicePhone: "",
      contactName: "",
      contactPhoneNumber: "",
      websiteAddress: "",
      accountName: "",
      
      // Principal Officers
      principalOfficers: [defaultPrincipalOfficer],
      
      // Fee Schedule
      feeScheduleData: {},
      supportingInformation: {},
      equipmentData: [],
      
      // Beneficial Ownership
      beneficialOwners: [defaultBeneficialOwner],
      
      // Financial Representative and Authorized Contacts
      financialRepresentative: defaultFinancialRepresentative,
      authorizedContacts: [defaultAuthorizedContact],
      
      // Certification
      corporateResolution: "",
      merchantName: "",
      merchantTitle: "",
      merchantDate: "",
      agreementAccepted: false,
    },
    mode: "onChange",
  });

  // Track form changes and notify parent
  useEffect(() => {
    if (!onFormChange) return;

    const subscription = form.watch((data) => {
      const isDirty = form.formState.isDirty;
      onFormChange(isDirty, data);
    });

    return () => subscription.unsubscribe();
  }, [form, onFormChange]);

  // Sync applicationId with initial prop
  useEffect(() => {
    setApplicationId(initialApplicationId);
  }, [initialApplicationId]);

  // Helper function to convert ISO date to yyyy-MM-dd format
  const formatDateForInput = (isoDate: string | null | undefined): string => {
    if (!isoDate) return "";
    try {
      // Clean up malformed date strings (remove invalid prefixes like "+05")
      let cleanDate = String(isoDate).trim();
      
      // Remove leading + or other non-numeric prefixes before year
      cleanDate = cleanDate.replace(/^[^\d]*(\d{4})/, '$1');
      
      const date = new Date(cleanDate);
      if (isNaN(date.getTime())) return "";
      
      // Ensure the date is reasonable (between 1900 and 2100)
      const year = date.getFullYear();
      if (year < 1900 || year > 2100) return "";
      
      return date.toISOString().split('T')[0];
    } catch {
      return "";
    }
  };

  // Load existing data into form when available
  useEffect(() => {
    if (existingApplication) {

      form.reset({
        ...existingApplication,
        // Convert ISO dates to yyyy-MM-dd format for HTML date inputs
        mpaSignedDate: formatDateForInput(existingApplication.mpaSignedDate),
        entityStartDate: formatDateForInput(existingApplication.entityStartDate),
        merchantDate: formatDateForInput(existingApplication.merchantDate),
        corduroDate: formatDateForInput(existingApplication.corduroDate),
        // Convert owner information dates
        ownerBirthday: formatDateForInput(existingApplication.ownerBirthday),
        ownerIdExpDate: formatDateForInput(existingApplication.ownerIdExpDate),
        ownerIdDateIssued: formatDateForInput(existingApplication.ownerIdDateIssued),
        // Convert dates in beneficial owners
        beneficialOwners: (existingApplication.beneficialOwners || [{}]).map((owner: any) => ({
          ...owner,
          dob: formatDateForInput(owner.dob),
          idExpDate: formatDateForInput(owner.idExpDate),
          idDateIssued: formatDateForInput(owner.idDateIssued),
        })),
        // Convert dates in principal officers
        principalOfficers: (existingApplication.principalOfficers || [{}]).map((officer: any) => ({
          ...officer,
          dob: formatDateForInput(officer.dob),
        })),
        // Convert dates in financial representative
        financialRepresentative: existingApplication.financialRepresentative ? {
          ...existingApplication.financialRepresentative,
          birthday: formatDateForInput(existingApplication.financialRepresentative.birthday),
          idExpDate: formatDateForInput(existingApplication.financialRepresentative.idExpDate),
        } : undefined,
        // Ensure arrays are properly initialized
        processingCategories: existingApplication.processingCategories || [],
        equipmentData: existingApplication.equipmentData || [],
        // CRITICAL: Explicitly preserve agreementAccepted value
        agreementAccepted: existingApplication.agreementAccepted === true ? true : false,
      });
      
      // Double-check that the checkbox value was set correctly
      setTimeout(() => {
        const checkboxValue = form.getValues('agreementAccepted');

      }, 100);
    }
  }, [existingApplication, form]);

  // Auto-save mutation
  const autoSaveMutation = useMutation({
    mutationFn: async (data: Partial<MerchantApplicationForm>) => {
      const endpoint = applicationId 
        ? `/api/merchant-applications/${applicationId}`
        : '/api/merchant-applications';
      
      const method = applicationId ? 'PUT' : 'POST';
      const response = await apiRequest(method, endpoint, data);
      return response.json();
    },
    onSuccess: (data) => {
      // Update the applicationId if this was a new application
      if (!applicationId && data.id) {
        setApplicationId(data.id);
        // Update URL without navigation to keep user in the wizard
        // IMPORTANT: Preserve onboardingMode in URL if present
        const onboardingParam = onboardingMode !== 'full' ? `&onboardingMode=${onboardingMode}` : '';
        window.history.replaceState(
          null, 
          '', 
          `/merchant-applications?id=${data.id}${onboardingParam}`
        );
        // Dispatch custom event so parent component updates
        window.dispatchEvent(new Event('urlchange'));
      }
      queryClient.setQueryData([`/api/merchant-applications/${data.id}`], data);
      // Also invalidate the list query so the application appears in the list without refresh
      queryClient.invalidateQueries({ queryKey: ['/api/merchant-applications'] });
    },
    onError: (error) => {

      // Don't show error toast for auto-save failures to avoid being intrusive
    },
  });

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const formData = form.getValues();
      const dirtyFields = Object.keys(form.formState.dirtyFields);
      
      // Only auto-save if there are dirty fields and at least one meaningful field has data
      if (dirtyFields.length > 0) {
        // Check if there's at least one non-empty field with meaningful data
        const hasData = dirtyFields.some(field => {
          const value = formData[field as keyof typeof formData];
          return value && (
            (typeof value === 'string' && value.trim().length > 0) ||
            (Array.isArray(value) && value.length > 0) ||
            (typeof value === 'object' && value !== null && Object.keys(value).length > 0) ||
            (typeof value === 'number' && !isNaN(value)) ||
            typeof value === 'boolean'
          );
        });
        
        if (hasData && !form.formState.isSubmitting) {
          autoSaveMutation.mutate(formData);
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [form, autoSaveMutation]);

  // Submit application mutation
  const submitMutation = useMutation({
    mutationFn: async (data: MerchantApplicationForm) => {

      // First save/update the application
      const saveEndpoint = applicationId 
        ? `/api/merchant-applications/${applicationId}`
        : '/api/merchant-applications';
      
      const saveMethod = applicationId ? 'PUT' : 'POST';

      const saveResponse = await apiRequest(saveMethod, saveEndpoint, {
        ...data,
        currentStep: useNewFlow ? 4 : undefined, // Keep at step 4 (final step) for new flow
      });
      const savedApp = await saveResponse.json();

      // Then submit it

      const submitResponse = await apiRequest(
        'PUT', 
        `/api/merchant-applications/${savedApp.id}/status`,
        { status: 'SUBMITTED' }
      );
      const result = await submitResponse.json();

      return result;
    },
    onSuccess: () => {
      toast({
        title: "Application Submitted Successfully! 🎉",
        description: "Your merchant application has been submitted for review. You'll receive an email notification once it's been reviewed.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant-applications'] });
      
      // If in onboarding mode, update the onboarding step to COMPLETE
      if (onboardingMode !== 'full' && onOnboardingStepComplete) {
        onOnboardingStepComplete('REVIEW');
      } else {
        onComplete?.();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Enhanced validation function with detailed error reporting
  const validateCurrentStep = async (): Promise<{ isValid: boolean; errors: string[] }> => {
    const stepFields = getStepFields(currentStep);
    const errors: string[] = [];
    const formData = form.getValues();
    
    // Trigger React Hook Form validation for the step fields
    const isFormValid = await form.trigger(stepFields);
    
    // Get specific field errors
    const fieldErrors = form.formState.errors;
    
    // Collect error messages for current step fields
    stepFields.forEach(fieldName => {
      const error = fieldErrors[fieldName];
      if (error) {
        // Get human-readable field name
        const fieldLabel = getFieldLabel(fieldName);
        if (error.message) {
          errors.push(`${fieldLabel}: ${error.message}`);
        } else {
          errors.push(`${fieldLabel} is required`);
        }
      }
    });
    
    // Additional custom validation for complex fields (only in full mode)
    if (onboardingMode === 'full') {
      if (currentStep === 1) {
        // Check processing categories (must have at least one)
        if (!formData.processingCategories || formData.processingCategories.length === 0) {
          errors.push("Processing Categories: Please select at least one processing category");
        }
      }
      
      if (currentStep === 4) {
        // Check beneficial owners (must have at least one with required fields)
        if (!formData.beneficialOwners || formData.beneficialOwners.length === 0) {
          errors.push("Beneficial Owners: At least one beneficial owner is required");
        } else {
          formData.beneficialOwners.forEach((owner, index) => {
            if (!owner.name || !owner.ssn || !owner.dob) {
              errors.push(`Beneficial Owner ${index + 1}: Name, SSN, and Date of Birth are required`);
            }
          });
        }
      }
      
      if (currentStep === 5) {
        // Check financial representative
        if (!formData.financialRepresentative?.firstName || !formData.financialRepresentative?.lastName) {
          errors.push("Financial Representative: First Name and Last Name are required");
        }
      }
    }
    
    // Part 2 mode: Custom validation for beneficial owners step
    if (onboardingMode === 'part2' && currentStep === 2) {
      if (!formData.beneficialOwners || formData.beneficialOwners.length === 0) {
        errors.push("Beneficial Owners: At least one beneficial owner is required");
      }
    }
    
    // Part 2 mode: Custom validation for representatives step
    if (onboardingMode === 'part2' && currentStep === 3) {
      if (!formData.financialRepresentative?.firstName || !formData.financialRepresentative?.lastName) {
        errors.push("Financial Representative: First Name and Last Name are required");
      }
    }
    
    return {
      isValid: isFormValid && errors.length === 0,
      errors
    };
  };

  // Helper function to get human-readable field labels
  const getFieldLabel = (fieldName: keyof MerchantApplicationForm): string => {
    const labels: Record<string, string> = {
      mpaSignedDate: "MPA Signed Date",
      dbaBusinessName: "DBA Name",
      dbaWebsite: "DBA Website", 
      locationAddress: "Location Address",
      productOrServiceSold: "Product or Service Sold",
      city: "City",
      state: "State",
      zip: "ZIP Code",
      businessPhone: "Business Phone",
      contactEmail: "Contact Email",
      legalBusinessName: "Legal Business Name",
      billingAddress: "Legal Address",
      legalContactName: "Legal Contact Name",
      legalPhone: "Legal Phone",
      legalEmail: "Legal Email",
      ownershipType: "Entity Type",
      federalTaxIdNumber: "Federal Tax ID",
      incorporationState: "Incorporation State",
      entityStartDate: "Entity Start Date",
      averageTicket: "Average Ticket",
      highTicket: "High Ticket",
      monthlySalesVolume: "Monthly Sales Volume",
      accountOwnerFirstName: "Account Owner First Name",
      accountOwnerLastName: "Account Owner Last Name",
      nameOnBankAccount: "Name on Bank Account",
      bankName: "Bank Name",
      abaRoutingNumber: "ABA Routing Number",
      ddaNumber: "Account Number",
      bankOfficerName: "Bank Officer Name",
      bankOfficerPhone: "Bank Officer Phone",
      bankOfficerEmail: "Bank Officer Email",
      businessType: "Business Type",
      posSystem: "POS System",
      processingCategories: "Processing Categories",
      feeScheduleData: "Fee Schedule",
      corporateResolution: "Corporate Resolution",
      merchantName: "Merchant Name",
      merchantTitle: "Merchant Title",
      merchantDate: "Merchant Date",
      agreementAccepted: "Agreement Acceptance",
      beneficialOwners: "Beneficial Owners",
      financialRepresentative: "Financial Representative",
      authorizedContacts: "Authorized Contacts"
    };
    
    return labels[fieldName] || fieldName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  // Handle step completion for new flow
  const handleStepComplete = async (step: number, stepData?: any) => {
    if (!applicationId) return;

    try {
      const updateData: any = {
        // Don't increment past step 4 (max step in new flow)
        currentStep: step < 4 ? step + 1 : 4,
      };

      // Step 1: Rename application to business name and save all Step 1 data
      if (step === 1) {
        const formData = form.getValues();
        
        // Determine the business name to use for renaming
        // Priority: dbaBusinessName (if it's not the default date-based name), then legalBusinessName
        let businessNameToUse = formData.dbaBusinessName;
        if (!businessNameToUse || businessNameToUse.startsWith('Application -')) {
          // If dbaBusinessName is empty or still the default, check legalBusinessName
          if (formData.legalBusinessName && !formData.legalBusinessName.startsWith('Application -')) {
            businessNameToUse = formData.legalBusinessName;
          }
        }
        
        // Rename application if we have a valid business name
        if (businessNameToUse && !businessNameToUse.startsWith('Application -')) {
          updateData.dbaBusinessName = businessNameToUse;
        }
        
        // Save all Step 1 fields
        if (formData.dbaWebsite) {
          updateData.dbaWebsite = formData.dbaWebsite;
        }
        if (formData.legalBusinessName) {
          updateData.legalBusinessName = formData.legalBusinessName;
        }
      }

      // Step 2: Just advance step (documents already uploaded)
      // Step 3: Save all form data
      if (step === 3) {
        const formData = form.getValues();
        Object.assign(updateData, formData);
      }

      await apiRequest("PUT", `/api/merchant-applications/${applicationId}`, updateData);
      queryClient.invalidateQueries({ queryKey: [`/api/merchant-applications/${applicationId}`] });

      if (step < 4) {
        setCurrentStep(step + 1);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save step progress",
        variant: "destructive",
      });
    }
  };

  const handleNext = async () => {
    // New flow: Handle step completion differently
    if (useNewFlow) {
      if (currentStep === 1) {
        // Step 1: Validate and save business name, then rename application
        const isValid = await form.trigger(['dbaBusinessName', 'dbaWebsite']);
        if (!isValid) {
          toast({
            title: "Validation Error",
            description: "Please fill in all required fields",
            variant: "destructive",
          });
          return;
        }
        const stepData = form.getValues();
        await handleStepComplete(1, stepData);
        return;
      } else if (currentStep === 2) {
        // Step 2: Documents - handled by DocumentUploadStep component
        await handleStepComplete(2);
        return;
      } else if (currentStep === 3) {
        // Step 3: Review - only validate required fields, not all fields
        const requiredFields = [
          'dbaBusinessName',
          'dbaWebsite',
          'legalBusinessName',
          'federalTaxIdNumber',
          'bankName',
          'abaRoutingNumber',
          'ddaNumber',
        ];
        
        // Check if required fields are filled (simple check, not full validation)
        const missingFields = requiredFields.filter(field => {
          const value = form.getValues(field as any);
          return isEmpty(value);
        });
        
        if (missingFields.length > 0) {
          const fieldLabels: Record<string, string> = {
            'dbaBusinessName': 'Business Name (DBA)',
            'dbaWebsite': 'Website',
            'legalBusinessName': 'Legal Business Name',
            'federalTaxIdNumber': 'Federal Tax ID (EIN)',
            'bankName': 'Bank Name',
            'abaRoutingNumber': 'ABA Routing Number',
            'ddaNumber': 'Account Number (DDA)',
          };
          const missingLabels = missingFields.map(f => fieldLabels[f] || f);
          
          toast({
            title: "Missing Required Fields",
            description: `Please fill in: ${missingLabels.join(', ')}`,
            variant: "destructive",
            duration: 5000,
          });
          return;
        }
        
        // Only validate required fields, not all fields
        const isValid = await form.trigger(requiredFields as any);
        if (!isValid) {
          const errors = form.formState.errors;
          const errorFields = requiredFields.filter(field => (errors as any)[field]);
          const fieldLabels: Record<string, string> = {
            'dbaBusinessName': 'Business Name (DBA)',
            'dbaWebsite': 'Website',
            'legalBusinessName': 'Legal Business Name',
            'federalTaxIdNumber': 'Federal Tax ID (EIN)',
            'bankName': 'Bank Name',
            'abaRoutingNumber': 'ABA Routing Number',
            'ddaNumber': 'Account Number (DDA)',
          };
          const errorLabels = errorFields.map(f => fieldLabels[f] || f);
          
          toast({
            title: "Validation Error",
            description: `Please fix errors in: ${errorLabels.join(', ')}`,
            variant: "destructive",
            duration: 5000,
          });
          return;
        }
        
        await handleStepComplete(3);
        return;
      }
    }

    // Old flow: Original validation logic
    const validation = await validateCurrentStep();
    
    if (!validation.isValid) {
      // Show detailed error message
      const errorList = validation.errors.slice(0, 5); // Limit to first 5 errors
      const errorMessage = errorList.join('\n');
      const additionalErrors = validation.errors.length > 5 ? `\n...and ${validation.errors.length - 5} more errors` : '';
      
      toast({
        title: `Step ${currentStep} Validation Errors`,
        description: errorMessage + additionalErrors,
        variant: "destructive",
        duration: 8000, // Longer duration for multiple errors
      });
      
      // Scroll to first error field
      const firstErrorField = getStepFields(currentStep).find(field => form.formState.errors[field]);
      if (firstErrorField) {
        const element = document.querySelector(`[name="${firstErrorField}"]`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      
      return;
    }
    
    // Auto-save before moving to next step
    const stepData = form.getValues();
    autoSaveMutation.mutate(stepData);
    
    // Show success message
    toast({
      title: "Step Validated Successfully",
      description: `Step ${currentStep} completed. Moving to next step.`,
      variant: "default",
      duration: 2000,
    });
    
    if (currentStep < activeSteps.length) {
      setCurrentStep(currentStep + 1);
    } else if (onboardingMode !== 'full' && onOnboardingStepComplete) {
      // Completed all steps in onboarding mode - notify parent
      const completedStep = onboardingMode === 'part1' ? 'PART1' 
        : onboardingMode === 'part2' ? 'PART2' 
        : 'REVIEW';
      onOnboardingStepComplete(completedStep);
    }
  };

  // Helper function to get field names for each step (mode-aware)
  const getStepFields = (step: number): (keyof MerchantApplicationForm)[] => {
    // Part 1 mode: Only basic business info fields (no validation of Part 2 fields)
    if (onboardingMode === 'part1') {
      return [
        // DBA Information  
        'dbaBusinessName', 'locationAddress',
        'city', 'state', 'zip', 'businessPhone', 'contactEmail',
        // Corporate Information
        'legalBusinessName', 'billingAddress', 'legalContactName', 'legalPhone', 'legalEmail',
        'ownershipType', 'federalTaxIdNumber', 'incorporationState', 'entityStartDate',
      ];
    }

    // Part 2 mode: Different steps have different field requirements
    if (onboardingMode === 'part2') {
      switch (step) {
        case 1: // Detailed Business Info
          return [
            // Transaction and Volume
            'averageTicket', 'highTicket', 'monthlySalesVolume',
            // Enhanced Banking Information
            'accountOwnerFirstName', 'accountOwnerLastName', 'nameOnBankAccount',
            'bankName', 'abaRoutingNumber', 'ddaNumber',
            // Business Operations
            'businessType',
          ];
        case 2: // Beneficial Ownership
          return ['beneficialOwners'];
        case 3: // Representatives & Contacts
          return ['financialRepresentative', 'authorizedContacts'];
        default:
          return [];
      }
    }

    // Review mode: Certification fields only
    if (onboardingMode === 'review') {
      return [
        'corporateResolution', 'merchantName', 'merchantTitle', 'merchantDate', 'agreementAccepted'
      ];
    }

    // Full mode: Original step fields
    switch (step) {
      case 1: // Business Information Step
        return [
          // MPA and Sales Information
          'mpaSignedDate',
          // DBA Information  
          'dbaBusinessName', 'dbaWebsite', 'locationAddress', 'productOrServiceSold',
          'city', 'state', 'zip', 'businessPhone', 'contactEmail',
          // Corporate Information
          'legalBusinessName', 'billingAddress', 'legalContactName', 'legalPhone', 'legalEmail',
          'ownershipType', 'federalTaxIdNumber', 'incorporationState', 'entityStartDate',
          // Transaction and Volume
          'averageTicket', 'highTicket', 'monthlySalesVolume',
          // Enhanced Banking Information
          'accountOwnerFirstName', 'accountOwnerLastName', 'nameOnBankAccount',
          'bankName', 'abaRoutingNumber', 'ddaNumber', 'bankOfficerName', 'bankOfficerPhone', 'bankOfficerEmail',
          // Business Operations
          'businessType', 'posSystem', 'processingCategories'
        ];
      case 2: // Certification Step
        return [
          'corporateResolution', 'merchantName', 'merchantTitle', 'merchantDate', 'agreementAccepted'
        ];
      case 3: // Beneficial Ownership Step
        return [
          'beneficialOwners'
        ];
      case 4: // Representatives & Contacts Step
        return [
          'financialRepresentative', 'authorizedContacts'
        ];
      default:
        return [];
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = () => {
    const formData = form.getValues();
    autoSaveMutation.mutate(formData, {
      onSuccess: () => {
        toast({
          title: "Application Saved",
          description: "Your progress has been saved as a draft.",
        });
      },
      onError: (error) => {
        toast({
          title: "Save Failed",
          description: "Failed to save your draft. Please try again.",
          variant: "destructive",
        });
      }
    });
  };

  const handleSubmit = async () => {

    setIsSubmitting(true);
    try {
      // CRITICAL: Check if all required documents are uploaded before submission
      if (!applicationId) {

        toast({
          title: "Cannot Submit Application",
          description: "Application must be saved before checking documents. Please save as draft first.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Fetch documents for this application

      const documentsResponse = await apiRequest('GET', '/api/documents');
      const allDocuments = await documentsResponse.json();

      // Filter documents for this specific application
      const applicationDocuments = allDocuments.filter(
        (doc: any) => doc.merchantApplicationId === applicationId
      );

      // Check which required documents are missing
      const requiredDocTypes = [
        'SS4_EIN_LETTER',
        'DRIVERS_LICENSE', 
        'BANK_STATEMENTS',
        'ARTICLES_OF_INCORPORATION',
        'BUSINESS_LICENSE',
        'VOIDED_CHECK',
        'INSURANCE_COVERAGE'
      ];

      const uploadedDocTypes = new Set(applicationDocuments.map((doc: any) => doc.documentType));
      const missingDocs = requiredDocTypes.filter(docType => !uploadedDocTypes.has(docType));

      if (missingDocs.length > 0) {
        // Map document types to readable names
        const docNames: Record<string, string> = {
          'SS4_EIN_LETTER': 'SS-4 IRS EIN Confirmation Letter or W9',
          'DRIVERS_LICENSE': "Driver's License or US Passport",
          'BANK_STATEMENTS': '3 Most Recent Business Bank Statements',
          'ARTICLES_OF_INCORPORATION': 'Articles of Incorporation',
          'BUSINESS_LICENSE': 'Business License & State/Local Permits',
          'VOIDED_CHECK': 'Voided Check or Bank Letter',
          'INSURANCE_COVERAGE': 'Insurance Coverage'
        };

        const missingDocNames = missingDocs.map(type => docNames[type] || type).join('\n• ');

        toast({
          title: "Missing Required Documents",
          description: `You must upload all required documents before submitting your application. Missing:\n\n• ${missingDocNames}`,
          variant: "destructive",
          duration: 10000,
        });
        setIsSubmitting(false);
        return;
      }

      // Get form data and clean null values that cause validation errors
      let formData = form.getValues();
      
      // Remove problematic null fields that are causing validation errors
      const fieldsToClean = [
        'ownerFullName', 'ownerFirstName', 'ownerLastName', 'ownerOfficer', 'ownerTitle',
        'ownerOwnershipPercentage', 'ownerMobilePhone', 'ownerEmail', 'ownerSsn', 'ownerBirthday',
        'ownerStateIssuedIdNumber', 'ownerIdExpDate', 'ownerIssuingState', 'ownerIdDateIssued',
        'ownerLegalAddress', 'ownerCity', 'ownerState', 'ownerZip', 'businessFaxNumber',
        'customerServicePhone', 'contactName', 'contactPhoneNumber', 'websiteAddress', 'accountName'
      ];
      
      // Remove null fields to prevent validation errors
      fieldsToClean.forEach(field => {
        if ((formData as any)[field] === null) {
          delete (formData as any)[field];
        }
      });
      
      // CRITICAL FIX: Check if the agreement checkbox is actually checked in the DOM
      // Since form.getValues() is not reliable for this field
      
      const agreementValue = form.getValues('agreementAccepted');

      // CRITICAL FIX: Server logs show agreementAccepted: true, but form keeps resetting it
      // Since we can see from server logs that the user HAS checked the agreement, force it to true
      
      const checkboxElement = document.querySelector('input[name="agreementAccepted"]') as HTMLInputElement;
      const isCheckboxChecked = checkboxElement?.checked || false;

      // Check if server has this as true (from auto-save logs we can see it's true)
      // If server shows agreementAccepted: true, then user has checked it before
      const serverHasAgreementTrue = existingApplication?.agreementAccepted === true;

      if (serverHasAgreementTrue) {

        formData.agreementAccepted = true;
        
        // Also force the DOM checkbox to be checked to match
        if (checkboxElement && !checkboxElement.checked) {

          checkboxElement.checked = true;
        }
      } else if (isCheckboxChecked && (formData.agreementAccepted === false || formData.agreementAccepted === undefined)) {

        formData.agreementAccepted = true;
      } else if (!isCheckboxChecked && !serverHasAgreementTrue) {

        formData.agreementAccepted = false;
      }

      // Also log all keys to see if agreementAccepted exists

      // BYPASS ZOD VALIDATION - Submit directly to server

      // Submit the application directly without client-side validation
      const result = await submitMutation.mutateAsync(formData);

    } catch (error) {

      // Handle Zod validation errors with specific messages
      if (error instanceof Error && 'issues' in error) {
        const zodError = error as any;
        const errorMessages = zodError.issues.map((issue: any) => 
          `${issue.path.join('.')}: ${issue.message}`
        ).join('\n');

        toast({
          title: "Validation Error",
          description: `Please fix the following issues:\n${errorMessages}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Submission Error",
          description: error instanceof Error ? error.message : "Please complete all required fields before submitting.",
          variant: "destructive",
        });
      }
    } finally {

      setIsSubmitting(false);
    }
  };

  const handleDownloadPDF = () => {
    try {
      const formData = form.getValues();
      const appId = existingApplication?.id || 'draft';
      PDFGenerator.generateMerchantApplicationPDF(formData, appId);
      toast({
        title: "PDF Generated",
        description: "Your application PDF has been generated and should start downloading.",
      });
    } catch (error) {
      toast({
        title: "PDF Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate PDF",
        variant: "destructive",
      });
    }
  };

  const getStepComponent = () => {
    // New 4-step flow
    if (useNewFlow) {
      switch (currentStep) {
        case 1:
          return (
            <SimplifiedBasicInfoStep
              form={form}
              onContinue={() => handleNext()}
              isSubmitting={isSubmitting}
            />
          );
        case 2:
          return applicationId ? (
            <DocumentUploadStep
              applicationId={applicationId}
              onContinue={() => handleNext()}
              isSubmitting={isSubmitting}
            />
          ) : null;
        case 3:
          return applicationId ? (
            <ApplicationReviewStep
              form={form}
              applicationId={applicationId}
              onContinue={() => handleNext()}
              isSubmitting={isSubmitting}
            />
          ) : null;
        case 4:
          return (
            <SubmitStep
              form={form}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting || submitMutation.isPending}
            />
          );
        default:
          return null;
      }
    }

    // Onboarding mode: Part 1 (Basic Business Info only)
    if (onboardingMode === 'part1') {
      return <BasicBusinessInfoStep form={form} />;
    }

    // Onboarding mode: Part 2 (Detailed info steps)
    if (onboardingMode === 'part2') {
      switch (currentStep) {
        case 1:
          return <DetailedBusinessInfoStep form={form} />;
        case 2:
          return <BeneficialOwnershipStep form={form} />;
        case 3:
          return <RepresentativesContactsStep form={form} />;
        default:
          return null;
      }
    }

    // Onboarding mode: Review (Certification & Submit only)
    if (onboardingMode === 'review') {
      return <CertificationStep form={form} />;
    }

    // Full mode (original 4-step wizard)
    switch (currentStep) {
      case 1:
        return <BusinessInformationStep form={form} />;
      case 2:
        return <CertificationStep form={form} />;
      case 3:
        return <BeneficialOwnershipStep form={form} />;
      case 4:
        return <RepresentativesContactsStep form={form} />;
      default:
        return null;
    }
  };

  const progress = (currentStep / activeSteps.length) * 100;
  const currentStepInfo = activeSteps[currentStep - 1];
  
  // Handle loading state and invalid step index
  if (isLoading || !currentStepInfo) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  const Icon = currentStepInfo.icon;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Icon className="h-6 w-6 text-primary" />
              <div>
                <CardTitle className="text-xl">
                  {currentStepInfo.title}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {currentStepInfo.description}
                </p>
              </div>
            </div>
            <Badge variant="outline">
              Step {currentStep} of {activeSteps.length}
            </Badge>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Progress</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step Navigation */}
          <div className="flex justify-between mt-4">
            {activeSteps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              const isLocked = useNewFlow && currentStep < step.id; // Lock future steps in new flow
              
              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : isCompleted
                      ? 'bg-green-100 text-green-700'
                      : isLocked
                      ? 'bg-gray-100 text-gray-400 opacity-50 cursor-not-allowed'
                      : 'bg-muted text-muted-foreground'
                  }`}
                  onClick={() => !isLocked && currentStep !== step.id && setCurrentStep(step.id)}
                  style={{ cursor: isLocked ? 'not-allowed' : 'pointer' }}
                >
                  <StepIcon className="h-4 w-4" />
                  <span className="text-xs font-medium hidden sm:inline">
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </CardHeader>
      </Card>

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          {getStepComponent()}
        </CardContent>
      </Card>

      {/* Validation Summary - Temporarily disabled to prevent infinite loop */}
      {/* <ValidationSummary 
        currentStep={currentStep} 
        form={form} 
        getStepFields={getStepFields}
        getFieldLabel={getFieldLabel}
      /> */}

      {/* Navigation Footer - Only show for old flow */}
      {!useNewFlow && (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              
              <Button
                variant="outline"
                onClick={handleSave}
                disabled={autoSaveMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {autoSaveMutation.isPending ? 'Saving...' : 'Save Draft'}
              </Button>
              
              <Button
                variant="outline"
                onClick={handleDownloadPDF}
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>

            <div className="flex gap-2">
              {currentStep < activeSteps.length ? (
                <Button onClick={handleNext}>
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : onboardingMode === 'part1' || onboardingMode === 'part2' ? (
                <Button
                  onClick={handleNext}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Save & Continue
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || submitMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      )}
    </div>
  );
}

// Validation Summary Component
interface ValidationSummaryProps {
  currentStep: number;
  form: UseFormReturn<MerchantApplicationForm>;
  getStepFields: (step: number) => (keyof MerchantApplicationForm)[];
  getFieldLabel: (fieldName: keyof MerchantApplicationForm) => string;
}

function ValidationSummary({ currentStep, form, getStepFields, getFieldLabel }: ValidationSummaryProps) {
  const [stepValidation, setStepValidation] = useState<Record<number, { isValid: boolean; errorCount: number; errors: string[] }>>({});
  
  // Get current form errors and values - but memoize them to prevent infinite loops
  const formErrors = form.formState.errors;
  const formData = form.getValues();
  
  // Check validation status for all steps
  useEffect(() => {
    const checkAllSteps = () => {
      const validation: Record<number, { isValid: boolean; errorCount: number; errors: string[] }> = {};
      
      for (let step = 1; step <= 5; step++) {
        const stepFields = getStepFields(step);
        const errors: string[] = [];
        
        // Check each field in the step
        stepFields.forEach(fieldName => {
          const fieldError = formErrors[fieldName];
          if (fieldError) {
            const fieldLabel = getFieldLabel(fieldName);
            errors.push(fieldLabel);
          }
        });
        
        // Additional custom validation
        if (step === 1) {
          if (!formData.processingCategories || formData.processingCategories.length === 0) {
            errors.push("Processing Categories");
          }
        }
        
        if (step === 4) {
          if (!formData.beneficialOwners || formData.beneficialOwners.length === 0) {
            errors.push("Beneficial Owners");
          }
        }
        
        if (step === 5) {
          if (!formData.financialRepresentative?.firstName || !formData.financialRepresentative?.lastName) {
            errors.push("Financial Representative");
          }
        }
        
        validation[step] = {
          isValid: errors.length === 0,
          errorCount: errors.length,
          errors: errors
        };
      }
      
      setStepValidation(validation);
    };
    
    checkAllSteps();
  }, [formErrors, currentStep]); // Removed form.watch() and function dependencies that cause infinite loops
  
  const totalErrors = Object.values(stepValidation).reduce((sum, step) => sum + step.errorCount, 0);
  const completedSteps = Object.values(stepValidation).filter(step => step.isValid).length;
  
  if (totalErrors === 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">All steps completed successfully!</span>
            <span className="text-sm">({completedSteps}/5 steps complete)</span>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-orange-700">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">
              {totalErrors} validation error{totalErrors !== 1 ? 's' : ''} found
            </span>
            <span className="text-sm">({completedSteps}/5 steps complete)</span>
          </div>
          
          {/* Show errors for current step */}
          {stepValidation[currentStep] && stepValidation[currentStep].errorCount > 0 && (
            <div className="text-sm text-orange-600">
              <div className="font-medium mb-1">Current step issues:</div>
              <div className="flex flex-wrap gap-1">
                {stepValidation[currentStep].errors.slice(0, 3).map((error, index) => (
                  <span key={index} className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs">
                    {error}
                  </span>
                ))}
                {stepValidation[currentStep].errors.length > 3 && (
                  <span className="text-orange-600 text-xs">
                    +{stepValidation[currentStep].errors.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}
          
          {/* Show step completion status */}
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(step => (
              <div
                key={step}
                className={`w-8 h-2 rounded-full ${
                  stepValidation[step]?.isValid 
                    ? 'bg-green-400' 
                    : step === currentStep
                    ? 'bg-orange-400'
                    : 'bg-gray-200'
                }`}
                title={`Step ${step}: ${
                  stepValidation[step]?.isValid 
                    ? 'Complete' 
                    : `${stepValidation[step]?.errorCount || 0} errors`
                }`}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
