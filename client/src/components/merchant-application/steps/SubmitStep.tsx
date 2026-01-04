import { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Send, AlertCircle } from "lucide-react";
import { MerchantApplicationForm } from "@/lib/merchantApplicationSchemas";
import { isEmpty } from "@/lib/formUtils";

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

  const fieldChecks = requiredFields.map(field => {
    const value = form.getValues(field.key as any);
    
    // Special handling for agreementAccepted checkbox
    const isComplete = field.key === 'agreementAccepted' 
      ? value === true 
      : !isEmpty(value);
    
    return { ...field, isComplete, value };
  });

  const allFieldsComplete = fieldChecks.every(check => check.isComplete);

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
      <div className="flex justify-end items-center pt-4 border-t">
        {!allFieldsComplete && (
          <div className="text-sm text-yellow-600 mr-auto">
            <AlertCircle className="inline h-4 w-4 mr-1" />
            Please complete all required fields above to submit
          </div>
        )}
        <Button
          type="button"
          size="lg"
          onClick={onSubmit}
          disabled={!allFieldsComplete || isSubmitting}
          className="bg-green-600 hover:bg-green-700"
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
