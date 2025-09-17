import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
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
  Download
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  merchantApplicationSchema, 
  stepSchemas,
  type MerchantApplicationForm,
  defaultPrincipalOfficer,
  defaultBeneficialOwner
} from "@/lib/merchantApplicationSchemas";
import { PDFGenerator } from "@/lib/pdfGenerator";
import { BusinessInformationStep } from "./steps/BusinessInformationStep";
import { FeeScheduleStep } from "./steps/FeeScheduleStep";
import { CertificationStep } from "./steps/CertificationStep";
import { BeneficialOwnershipStep } from "./steps/BeneficialOwnershipStep";

interface MerchantApplicationWizardProps {
  applicationId?: string;
  onComplete?: () => void;
}

const STEPS = [
  {
    id: 1,
    title: "Business Information",
    description: "Company details and principal officers",
    icon: Building,
  },
  {
    id: 2,
    title: "Fee Schedule & Equipment",
    description: "Processing fees and equipment requirements",
    icon: DollarSign,
  },
  {
    id: 3,
    title: "Certification & Agreement",
    description: "Corporate resolution and signatures",
    icon: Shield,
  },
  {
    id: 4,
    title: "Beneficial Ownership",
    description: "Details of beneficial owners (25%+ ownership)",
    icon: Users,
  },
] as const;

export default function MerchantApplicationWizard({ 
  applicationId: initialApplicationId, 
  onComplete 
}: MerchantApplicationWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [applicationId, setApplicationId] = useState(initialApplicationId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const form = useForm<MerchantApplicationForm>({
    resolver: zodResolver(merchantApplicationSchema),
    defaultValues: {
      // Business Information
      legalBusinessName: "",
      dbaBusinessName: "",
      billingAddress: "",
      locationAddress: "",
      city: "",
      state: undefined, // This will be handled by the select component
      zip: "",
      businessPhone: "",
      businessFaxNumber: "",
      customerServicePhone: "",
      federalTaxIdNumber: "",
      contactName: "",
      contactPhoneNumber: "",
      contactEmail: "",
      websiteAddress: "",
      processingCategories: [],
      ownershipType: undefined, // This will be handled by the select component
      
      // Principal Officers
      principalOfficers: [defaultPrincipalOfficer],
      
      // Banking
      bankName: "",
      abaRoutingNumber: "",
      accountName: "",
      ddaNumber: "",
      
      // Fee Schedule
      feeScheduleData: [],
      supportingInformation: [],
      equipmentData: [],
      
      // Beneficial Ownership
      beneficialOwners: [defaultBeneficialOwner],
      
      // Certification
      corporateResolution: "",
      merchantSignature: "",
      merchantSignatureDate: "",
      partnerSignature: "",
      partnerSignatureDate: "",
      agreementAccepted: false,
    },
    mode: "onChange",
  });

  // Sync applicationId with initial prop
  useEffect(() => {
    setApplicationId(initialApplicationId);
  }, [initialApplicationId]);

  // Load existing data into form when available
  useEffect(() => {
    if (existingApplication) {
      form.reset({
        ...existingApplication,
        // Ensure arrays are properly initialized
        processingCategories: existingApplication.processingCategories || [],
        principalOfficers: existingApplication.principalOfficers || [{}],
        beneficialOwners: existingApplication.beneficialOwners || [{}],
        equipmentData: existingApplication.equipmentData || [],
      });
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
        window.history.replaceState(
          null, 
          '', 
          `/documents?tab=merchant-application&id=${data.id}`
        );
      }
      queryClient.setQueryData([`/api/merchant-applications/${data.id}`], data);
    },
    onError: (error) => {
      console.error('Auto-save failed:', error);
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
      const saveResponse = await apiRequest(saveMethod, saveEndpoint, data);
      const savedApp = await saveResponse.json();

      // Then submit it
      const submitResponse = await apiRequest(
        'PUT', 
        `/api/merchant-applications/${savedApp.id}/status`,
        { status: 'SUBMITTED' }
      );
      return submitResponse.json();
    },
    onSuccess: () => {
      toast({
        title: "Application Submitted",
        description: "Your merchant application has been submitted for review.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant-applications'] });
      onComplete?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleNext = async () => {
    // Get fields for current step
    const stepFields = getStepFields(currentStep);
    
    // Trigger validation for current step fields
    const isValid = await form.trigger(stepFields);
    
    if (!isValid) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors on this step before continuing.",
        variant: "destructive",
      });
      return;
    }
    
    // Auto-save before moving to next step
    const stepData = form.getValues();
    autoSaveMutation.mutate(stepData);
    
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Helper function to get field names for each step
  const getStepFields = (step: number): string[] => {
    switch (step) {
      case 1:
        return [
          'legalBusinessName', 'billingAddress', 'locationAddress', 'city', 'state', 'zip',
          'businessPhone', 'customerServicePhone', 'federalTaxIdNumber', 'contactName',
          'contactPhoneNumber', 'contactEmail', 'processingCategories', 'ownershipType'
        ];
      case 2:
        return [
          'bankName', 'abaRoutingNumber', 'accountName', 'ddaNumber'
        ];
      case 3:
        return [
          'corporateResolution', 'merchantSignature', 'merchantSignatureDate', 'agreementAccepted'
        ];
      case 4:
        return [
          'beneficialOwners'
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
      const formData = form.getValues();
      await merchantApplicationSchema.parseAsync(formData);
      await submitMutation.mutateAsync(formData);
    } catch (error) {
      toast({
        title: "Validation Error", 
        description: "Please complete all required fields before submitting.",
        variant: "destructive",
      });
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
    switch (currentStep) {
      case 1:
        return <BusinessInformationStep form={form} />;
      case 2:
        return <FeeScheduleStep form={form} />;
      case 3:
        return <CertificationStep form={form} />;
      case 4:
        return <BeneficialOwnershipStep form={form} />;
      default:
        return null;
    }
  };

  const progress = (currentStep / STEPS.length) * 100;
  const currentStepInfo = STEPS[currentStep - 1];
  const Icon = currentStepInfo.icon;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

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
              Step {currentStep} of {STEPS.length}
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
            {STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : isCompleted
                      ? 'bg-green-100 text-green-700'
                      : 'bg-muted text-muted-foreground'
                  }`}
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

      {/* Navigation Footer */}
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
              {currentStep < STEPS.length ? (
                <Button onClick={handleNext}>
                  Next
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
    </div>
  );
}
