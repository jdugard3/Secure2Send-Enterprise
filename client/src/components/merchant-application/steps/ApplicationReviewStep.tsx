import { useEffect, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { ClipboardList, CheckCircle, AlertCircle, Save } from "lucide-react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { MerchantApplicationForm } from "@/lib/merchantApplicationSchemas";
import { DetailedBusinessInfoStep } from "./DetailedBusinessInfoStep";
import { BeneficialOwnershipStep } from "./BeneficialOwnershipStep";
import { RepresentativesContactsStep } from "./RepresentativesContactsStep";
import { CertificationStep } from "./CertificationStep";
import { useToast } from "@/hooks/use-toast";
import { isEmpty } from "@/lib/formUtils";
import { formatDateForInput } from "@/lib/dateUtils";

interface ApplicationReviewStepProps {
  form: UseFormReturn<MerchantApplicationForm>;
  applicationId: string;
  onContinue: () => void;
  isSubmitting?: boolean;
}

export function ApplicationReviewStep({ form, applicationId, onContinue, isSubmitting = false }: ApplicationReviewStepProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dataLoaded, setDataLoaded] = useState(false);

  // Reload application data when entering Step 3 to get latest auto-applied OCR fields
  const { data: applicationData, refetch: refetchApplication } = useQuery({
    queryKey: [`/api/merchant-applications/${applicationId}`],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/merchant-applications/${applicationId}`);
      return response.json();
    },
    enabled: !!applicationId,
  });

  // Fetch extracted OCR data to merge into form
  const { data: extractedDataResponse, refetch: refetchExtractedData } = useQuery({
    queryKey: ["/api/merchant-applications", applicationId, "extracted-data"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/merchant-applications/${applicationId}/extracted-data?includeSensitive=true`);
      return response.json();
    },
    enabled: !!applicationId,
  });

  // Load application data into form when it's available
  useEffect(() => {
    if (applicationData && !dataLoaded) {
      const formData = {
        ...applicationData,
        // Convert ISO dates to yyyy-MM-dd format for HTML date inputs
        mpaSignedDate: formatDateForInput(applicationData.mpaSignedDate),
        entityStartDate: formatDateForInput(applicationData.entityStartDate),
        merchantDate: formatDateForInput(applicationData.merchantDate),
        corduroDate: formatDateForInput(applicationData.corduroDate),
        ownerBirthday: formatDateForInput(applicationData.ownerBirthday),
        ownerIdExpDate: formatDateForInput(applicationData.ownerIdExpDate),
        ownerIdDateIssued: formatDateForInput(applicationData.ownerIdDateIssued),
        beneficialOwners: (applicationData.beneficialOwners || [{}]).map((owner: any) => ({
          ...owner,
          dob: formatDateForInput(owner.dob),
          idExpDate: formatDateForInput(owner.idExpDate),
          idDateIssued: formatDateForInput(owner.idDateIssued),
        })),
        principalOfficers: (applicationData.principalOfficers || [{}]).map((officer: any) => ({
          ...officer,
          dob: formatDateForInput(officer.dob),
        })),
        financialRepresentative: applicationData.financialRepresentative ? {
          ...applicationData.financialRepresentative,
          birthday: formatDateForInput(applicationData.financialRepresentative.birthday),
          idExpDate: formatDateForInput(applicationData.financialRepresentative.idExpDate),
        } : undefined,
        processingCategories: applicationData.processingCategories || [],
        equipmentData: applicationData.equipmentData || [],
        agreementAccepted: applicationData.agreementAccepted === true ? true : false,
      };
      
      form.reset(formData, { keepDefaultValues: false });
      setDataLoaded(true);
    }
  }, [applicationData, form, dataLoaded]);

  // Merge extracted OCR data into form (fill empty fields with OCR data)
  useEffect(() => {
    if (extractedDataResponse?.extractedData && dataLoaded) {
      // Get all extracted data and merge into form
      const allExtractedData = extractedDataResponse.extractedData.reduce((acc: any, item: any) => {
        if (item.data) {
          return { ...acc, ...item.data };
        }
        return acc;
      }, {});

      // Fill empty fields with extracted data
      Object.entries(allExtractedData).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          const currentValue = form.getValues(key as any);
          const shouldFill = 
            !currentValue || 
            currentValue === '' || 
            currentValue === null ||
            (typeof currentValue === 'string' && currentValue.trim() === '') ||
            (typeof currentValue === 'number' && currentValue === 0) ||
            // Override default values with extracted data
            (key === 'ownershipType' && currentValue === 'SOLE_PROPRIETORSHIP') ||
            (key === 'incorporationState' && currentValue === 'FL') ||
            (key === 'ownerIssuingState' && currentValue === 'FL') ||
            (key === 'ownerState' && currentValue === 'FL') ||
            (key === 'businessType' && currentValue === 'Retail');
          
          if (shouldFill) {
            try {
              form.setValue(key as any, value, { shouldDirty: false, shouldValidate: false });
            } catch (error) {
              // Silently fail if field doesn't exist in schema
            }
          }
        }
      });
    }
  }, [extractedDataResponse, form, dataLoaded]);

  // Refetch data when component mounts (entering Step 3)
  useEffect(() => {
    if (applicationId) {
      setDataLoaded(false);
      queryClient.invalidateQueries({ queryKey: [`/api/merchant-applications/${applicationId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/merchant-applications", applicationId, "extracted-data"] });
      Promise.all([refetchApplication(), refetchExtractedData()]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId]);

  const handleContinue = async () => {
    // Check if required fields are filled first
    const missing = requiredFields.filter(field => isEmpty(form.getValues(field as any)));
    
    if (missing.length > 0) {
      const fieldLabels: Record<string, string> = {
        'dbaBusinessName': 'Business Name (DBA)',
        'dbaWebsite': 'Website',
        'legalBusinessName': 'Legal Business Name',
        'federalTaxIdNumber': 'Federal Tax ID (EIN)',
        'bankName': 'Bank Name',
        'abaRoutingNumber': 'ABA Routing Number',
        'ddaNumber': 'Account Number (DDA)',
      };
      const missingLabels = missing.map(f => fieldLabels[f] || f);
      
      toast({
        title: "Missing Required Fields",
        description: `Please fill in: ${missingLabels.join(', ')}`,
        variant: "destructive",
        duration: 5000,
      });
      return;
    }
    
    // Only validate required fields, not all fields
    const requiredFieldsToValidate = requiredFields as any[];
    const isValid = await form.trigger(requiredFieldsToValidate);
    
    if (isValid) {
      onContinue();
    } else {
      const errors = form.formState.errors;
      const requiredFieldErrors = requiredFieldsToValidate
        .filter(field => (errors as any)[field])
        .map(field => {
          const fieldLabels: Record<string, string> = {
            'dbaBusinessName': 'Business Name (DBA)',
            'dbaWebsite': 'Website',
            'legalBusinessName': 'Legal Business Name',
            'federalTaxIdNumber': 'Federal Tax ID (EIN)',
            'bankName': 'Bank Name',
            'abaRoutingNumber': 'ABA Routing Number',
            'ddaNumber': 'Account Number (DDA)',
          };
          return fieldLabels[field] || field;
        });
      
      toast({
        title: "Validation Error",
        description: `Please fix the errors in: ${requiredFieldErrors.join(', ')}`,
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  // Save draft mutation
  const saveDraftMutation = useMutation({
    mutationFn: async (data: Partial<MerchantApplicationForm>) => {
      const response = await apiRequest("PUT", `/api/merchant-applications/${applicationId}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Draft Saved",
        description: "Your application has been saved as a draft.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/merchant-applications/${applicationId}`] });
      // Invalidate list so ApplicationSwitcher/tracker bar shows updated data without refresh
      queryClient.invalidateQueries({ queryKey: ["/api/merchant-applications"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Save Draft",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSaveDraft = async () => {
    const formData = form.getValues();
    saveDraftMutation.mutate(formData);
  };

  // Check required fields
  const requiredFields = [
    'dbaBusinessName',
    'dbaWebsite',
    'legalBusinessName',
    'federalTaxIdNumber',
    'bankName',
    'abaRoutingNumber',
    'ddaNumber',
  ];

  const missingRequiredFields = requiredFields.filter(field => {
    const value = form.getValues(field as any);
    return isEmpty(value);
  });

  return (
    <Form {...form}>
      <div className="space-y-6">
        {/* Instructions */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-blue-900 mb-2">
              Review Your Application
            </h2>
            <p className="text-blue-700 mb-2">
              Review all the information below. Fields have been pre-filled from your documents where possible.
              Edit any field as needed before submitting.
            </p>
            {extractedDataResponse?.extractedData && extractedDataResponse.extractedData.length > 0 && (
              <p className="text-sm text-blue-600 mt-2">
                <CheckCircle className="inline h-4 w-4 mr-1" />
                {extractedDataResponse.extractedData.length} document(s) processed. Data extracted and merged into the form below.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Missing Fields Warning */}
        {missingRequiredFields.length > 0 && (
          <Card className="border-red-300 bg-red-50 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-6 w-6 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-bold text-red-900 mb-2 text-lg">
                    Missing Required Fields ({missingRequiredFields.length})
                  </h3>
                  <p className="text-sm text-red-800 mb-3">
                    Please fill in the following required fields before you can continue:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {missingRequiredFields.map((field) => {
                      const fieldLabels: Record<string, string> = {
                        'dbaBusinessName': 'Business Name (DBA)',
                        'dbaWebsite': 'Website',
                        'legalBusinessName': 'Legal Business Name',
                        'federalTaxIdNumber': 'Federal Tax ID (EIN)',
                        'bankName': 'Bank Name',
                        'abaRoutingNumber': 'ABA Routing Number',
                        'ddaNumber': 'Account Number (DDA)',
                      };
                      const label = fieldLabels[field] || field;
                      const currentValue = form.getValues(field as any);
                      
                      return (
                        <div key={field} className="flex items-center gap-2 p-2 bg-white rounded border border-red-200">
                          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                          <div className="flex-1">
                            <span className="font-semibold text-red-900">{label}</span>
                            {currentValue && (
                              <span className="text-xs text-red-600 ml-2">
                                (Current: {String(currentValue).substring(0, 20)}{String(currentValue).length > 20 ? '...' : ''})
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-red-700 mt-3 italic">
                    💡 Tip: Scroll down to find these fields in the form below
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Application Sections */}
        <div className="space-y-6 overflow-y-auto pr-2">
          <DetailedBusinessInfoStep form={form} />
          <BeneficialOwnershipStep form={form} />
          <RepresentativesContactsStep form={form} />
          <CertificationStep form={form} />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button
            variant="outline"
            size="lg"
            onClick={handleSaveDraft}
            disabled={saveDraftMutation.isPending || isSubmitting}
            className="border-gray-300"
          >
            {saveDraftMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Draft
              </>
            )}
          </Button>
          
          <div className="flex items-center gap-4">
            {missingRequiredFields.length > 0 && (
              <span className="text-sm text-gray-500">
                {missingRequiredFields.length} required field(s) missing
              </span>
            )}
            <Button
              size="lg"
              onClick={handleContinue}
              disabled={missingRequiredFields.length > 0 || isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  Continue to Submit
                  <ClipboardList className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Form>
  );
}
