import { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, FileText, CheckCircle, Info } from "lucide-react";
import { MerchantApplicationForm } from "@/lib/merchantApplicationSchemas";

interface CertificationStepProps {
  form: UseFormReturn<MerchantApplicationForm>;
}

export function CertificationStep({ form }: CertificationStepProps) {
  return (
    <Form {...form}>
      <div className="space-y-8">
        {/* Corporate Resolution */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle>Corporate Resolution</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-700 mb-4">
                I, the undersigned hereby certify that I have the office indicated below of the above-named business entity, organized and existing under the laws of the state indicated below and that the foregoing is a true and correct copy of the resolution duly passed at a meeting of the board of directors of the above-named business entity.
              </p>
              <p className="text-sm text-gray-700 mb-4">
                To help the government fight financial crime, Federal regulation requires certain financial institutions to obtain, verify, and record information that identifies each individual or business. All information provided is kept strictly confidential and will not be shared with any other parties except as required by law. By signing this Merchant Application and any agreements required by CORDURO or others who are authorized to investigate any and all statements contained herein, I/we hereby agree to complete and submit this application on behalf of Merchant. By executing this Merchant Application, Merchant gives full power and authority to CORDURO to execute on behalf of MERCHANT any agreements required by BANK or PROCESSOR to permit CORDURO to provide the services contemplated by this Merchant Application and AGREEMENT. By signing this Agreement, Merchant agrees to allow CORDURO to execute on behalf of MERCHANT any agreements required by BANK or PROCESSOR to permit CORDURO to provide the services contemplated by this Agreement.
              </p>
            </div>

            <FormField
              control={form.control}
              name="corporateResolution"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Corporate Resolution Text *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter your corporate resolution..."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Certification & Agreement */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Certification & Agreement</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-2">By signing below, you certify that:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>All information provided is accurate and complete</li>
                    <li>You have the authority to bind the merchant to this agreement</li>
                    <li>You agree to the terms and conditions specified in this application</li>
                    <li>You understand the fees and charges associated with the services</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Merchant Signature Section - Client Only */}
            <div className="max-w-md">
              <h4 className="font-medium text-lg mb-4">Merchant Signature</h4>
              
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="merchantName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter signatory name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="merchantTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="merchantDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="border-t pt-4 mt-6">
                  <p className="text-sm text-gray-600 mb-2">Signature:</p>
                  <div className="h-12 border-b-2 border-gray-300 flex items-end">
                    <span className="text-xs text-gray-500 mb-1">Digital signature will be applied upon submission</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Note about admin approval */}
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 mt-6">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">Pending Administrative Review</p>
                  <p>After submission, this application will be reviewed and signed by a Corduro administrator before final approval.</p>
                </div>
              </div>
            </div>

            {/* Agreement Acceptance - Made more prominent */}
            <div className="border-t pt-6 mt-8 bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-lg mb-4 text-blue-900">Final Agreement</h4>
              <FormField
                control={form.control}
                name="agreementAccepted"
                render={({ field, fieldState }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value || false}
                        onCheckedChange={field.onChange}
                        className={fieldState.error ? "border-destructive" : ""}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className={`text-sm font-medium ${fieldState.error ? "text-destructive" : ""}`}>
                        I agree and accept the terms and conditions specified and referenced in this Merchant Application. *
                      </FormLabel>
                      <p className="text-xs text-gray-600">
                        By checking this box, you acknowledge that you have read and understood all terms and conditions.
                      </p>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </Form>
  );
}
