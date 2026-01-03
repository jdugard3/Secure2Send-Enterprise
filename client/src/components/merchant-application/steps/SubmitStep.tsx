import { useCallback } from "react";
import { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Send, AlertCircle } from "lucide-react";
import { MerchantApplicationForm } from "@/lib/merchantApplicationSchemas";

interface SubmitStepProps {
  form: UseFormReturn<MerchantApplicationForm>;
  onSubmit: () => void;
  isSubmitting?: boolean;
}

export function SubmitStep({ form, onSubmit, isSubmitting = false }: SubmitStepProps) {
  // Check all required fields
  const requiredFields = [
    { key: 'dbaBusinessName', label: 'Business Name' },
    { key: 'dbaWebsite', label: 'Website' },
    { key: 'legalBusinessName', label: 'Legal Business Name' },
    { key: 'federalTaxIdNumber', label: 'Federal Tax ID' },
    { key: 'bankName', label: 'Bank Name' },
    { key: 'abaRoutingNumber', label: 'ABA Routing Number' },
    { key: 'ddaNumber', label: 'Account Number' },
    { key: 'agreementAccepted', label: 'Agreement Accepted' },
  ];

  // Log all form values when component mounts
  console.log("🔍 SubmitStep - All form values:", form.getValues());
  console.log("🔍 SubmitStep - Required fields to check:", requiredFields.map(f => f.key));

  // Helper to check if a value is empty (handles masked values, placeholders, etc.)
  const isEmpty = (value: any): boolean => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      // Check for placeholder values
      if (trimmed === '' || trimmed === '[EMPTY]' || trimmed === 'N/A') return true;
      // Masked values (like ****1916 or **********) are considered to have content
      // Only reject if it's ALL stars with no actual content visible
      if (trimmed.match(/^\*+$/) && trimmed.length <= 4) return true; // Only reject if it's 4 or fewer stars
      return false;
    }
    if (typeof value === 'number') return value === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return !value;
  };

  const fieldChecks = requiredFields.map(field => {
    const value = form.getValues(field.key as any);
    
    // Special handling for agreementAccepted checkbox
    let isComplete: boolean;
    if (field.key === 'agreementAccepted') {
      isComplete = value === true;
    } else {
      // For other fields, check if they're not empty
      isComplete = !isEmpty(value);
    }
    
    // Debug logging for incomplete fields
    if (!isComplete) {
      console.log(`❌ SubmitStep - Missing field: ${field.label} (${field.key})`, { 
        value, 
        type: typeof value, 
        isEmpty: isEmpty(value),
        stringValue: String(value),
      });
    }
    
    return { ...field, isComplete, value };
  });

  const allFieldsComplete = fieldChecks.every(check => check.isComplete);
  
  // Always log field statuses for debugging
  console.log("📋 SubmitStep - Field statuses:", fieldChecks.map(f => ({
    label: f.label,
    key: f.key,
    isComplete: f.isComplete,
    value: typeof f.value === 'string' && f.value.length > 50 
      ? f.value.substring(0, 50) + '...' 
      : f.value,
    valueType: typeof f.value,
  })));
  
  const missingFields = fieldChecks.filter(f => !f.isComplete);
  if (missingFields.length > 0) {
    console.error("❌ SubmitStep - Missing fields:", missingFields.map(f => ({
      label: f.label,
      key: f.key,
      value: f.value,
      valueType: typeof f.value,
    })));
  } else {
    console.log("✅ SubmitStep - All required fields are complete!");
  }

  // Log button state
  const buttonDisabled = !allFieldsComplete || isSubmitting;
  console.log("🔘 SubmitStep - Button state:", {
    allFieldsComplete,
    isSubmitting,
    buttonDisabled,
    onSubmit: typeof onSubmit,
  });

  // Wrapper to log when button is clicked - use useCallback to ensure stable reference
  const handleSubmitClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("🖱️ SubmitStep - Submit button clicked!");
    console.log("🖱️ SubmitStep - Button was disabled?", buttonDisabled);
    console.log("🖱️ SubmitStep - isSubmitting:", isSubmitting);
    console.log("🖱️ SubmitStep - allFieldsComplete:", allFieldsComplete);
    console.log("🖱️ SubmitStep - Calling onSubmit prop");
    console.log("🖱️ SubmitStep - onSubmit type:", typeof onSubmit);
    try {
      onSubmit();
      console.log("🖱️ SubmitStep - onSubmit called successfully");
    } catch (error) {
      console.error("🖱️ SubmitStep - Error calling onSubmit:", error);
    }
  }, [onSubmit, buttonDisabled, isSubmitting, allFieldsComplete]);

  // Also log mouse down to see if button receives any events
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    console.log("🖱️ SubmitStep - Button mouse down event!");
    console.log("🖱️ SubmitStep - Button disabled?", buttonDisabled);
  }, [buttonDisabled]);

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold text-green-900 mb-2">
            Ready to Submit
          </h2>
          <p className="text-green-700">
            Review the checklist below to ensure all required information is complete before submitting your application.
          </p>
        </CardContent>
      </Card>

      {/* Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Submission Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {fieldChecks.map((check) => (
            <div
              key={check.key}
              className={`flex items-center gap-3 p-3 rounded-lg ${
                check.isComplete ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
              }`}
            >
              {check.isComplete ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              )}
              <span className={`flex-1 ${check.isComplete ? 'text-green-900' : 'text-yellow-900'}`}>
                {check.label}
              </span>
              <Badge variant={check.isComplete ? 'default' : 'destructive'}>
                {check.isComplete ? 'Complete' : 'Missing'}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-between items-center pt-4 border-t">
        {!allFieldsComplete && (
          <div className="text-sm text-yellow-600">
            <AlertCircle className="inline h-4 w-4 mr-1" />
            Please complete all required fields above to submit
          </div>
        )}
        {console.log("🔘 SubmitStep - Rendering button with:", { buttonDisabled, allFieldsComplete, isSubmitting, hasOnSubmit: !!onSubmit })}
        <Button
          type="button"
          size="lg"
          onClick={handleSubmitClick}
          onMouseDown={handleMouseDown}
          onFocus={() => console.log("🔘 SubmitStep - Button received focus")}
          disabled={buttonDisabled}
          className="bg-green-600 hover:bg-green-700"
          style={{ 
            pointerEvents: buttonDisabled ? 'none' : 'auto',
            cursor: buttonDisabled ? 'not-allowed' : 'pointer'
          }}
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Submitting...
            </>
          ) : (
            <>
              Submit Application
              <Send className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

