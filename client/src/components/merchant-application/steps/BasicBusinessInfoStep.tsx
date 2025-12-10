import { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Building2, Briefcase, FileText, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  MerchantApplicationForm,
  US_STATES,
  OWNERSHIP_TYPES,
} from "@/lib/merchantApplicationSchemas";

interface BasicBusinessInfoStepProps {
  form: UseFormReturn<MerchantApplicationForm>;
}

const OWNERSHIP_TYPE_LABELS = {
  NON_PROFIT: "Non-Profit",
  SOLE_PROPRIETORSHIP: "Sole Proprietorship", 
  GOVERNMENT: "Government",
  PERSONAL: "Personal",
  PARTNERSHIP_LLP: "Partnership/LLP",
  FINANCIAL_INSTITUTION: "Financial Institution",
  CORPORATION_PUBLICLY_TRADED: "Corporation (Publicly Traded)",
  CORPORATION_PRIVATELY_HELD: "Corporation (Privately Held)",
  LLC: "LLC",
  S_CORP: "S-Corp"
} as const;

export function BasicBusinessInfoStep({ form }: BasicBusinessInfoStepProps) {
  const { toast } = useToast();

  const copyFromDBA = () => {
    const dbaName = form.getValues("dbaBusinessName");
    const locationAddress = form.getValues("locationAddress");
    const businessPhone = form.getValues("businessPhone");
    const contactEmail = form.getValues("contactEmail");
    
    form.setValue("legalBusinessName", dbaName);
    form.setValue("billingAddress", locationAddress);
    form.setValue("legalContactName", dbaName);
    form.setValue("legalPhone", businessPhone);
    form.setValue("legalEmail", contactEmail);
    
    toast({
      title: "Information Copied",
      description: "Corporate information has been populated with DBA details.",
    });
  };

  return (
    <Form {...form}>
      <div className="space-y-8">
        {/* Welcome Message */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-blue-900 mb-2">
              Let's get started with your business information
            </h2>
            <p className="text-blue-700">
              First, we need some basic details about your business. This should only take a few minutes to complete.
            </p>
          </CardContent>
        </Card>

        {/* MPA Date */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle>Application Date</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="mpaSignedDate"
              render={({ field, fieldState }) => (
                <FormItem className="max-w-sm">
                  <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                    Date of Application *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="date"
                      className={fieldState.error ? "border-destructive focus-visible:ring-destructive" : ""}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* DBA Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle>DBA (Doing Business As) Information</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Enter the name your business operates under and its primary location
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dbaBusinessName"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      DBA Business Name *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Joe's Coffee Shop" 
                        className={fieldState.error ? "border-destructive focus-visible:ring-destructive" : ""}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dbaWebsite"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      Business Website *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="www.example.com" 
                        className={fieldState.error ? "border-destructive focus-visible:ring-destructive" : ""}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="productOrServiceSold"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                    Products/Services Sold *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Describe what your business sells or provides" 
                      className={fieldState.error ? "border-destructive focus-visible:ring-destructive" : ""}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="locationAddress"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                    Business Address *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Street address" 
                      className={fieldState.error ? "border-destructive focus-visible:ring-destructive" : ""}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      City *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="City" 
                        className={fieldState.error ? "border-destructive focus-visible:ring-destructive" : ""}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      State *
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className={fieldState.error ? "border-destructive focus-visible:ring-destructive" : ""}>
                          <SelectValue placeholder="State" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {US_STATES.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="zip"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      ZIP Code *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="12345" 
                        className={fieldState.error ? "border-destructive focus-visible:ring-destructive" : ""}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="multipleLocations"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-end space-x-3 space-y-0 rounded-md border p-3">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="text-sm">
                      Multiple Locations?
                    </FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="businessPhone"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      Business Phone *
                    </FormLabel>
                    <FormControl>
                      <PhoneInput 
                        placeholder="123-456-7890" 
                        className={fieldState.error ? "border-destructive focus-visible:ring-destructive" : ""}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      Contact Email *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="email"
                        placeholder="contact@business.com" 
                        className={fieldState.error ? "border-destructive focus-visible:ring-destructive" : ""}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Corporate Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                <CardTitle>Legal/Corporate Information</CardTitle>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={copyFromDBA}
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy from DBA
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Enter your official registered business information
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="legalBusinessName"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      Legal Business Name *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Registered business name" 
                        className={fieldState.error ? "border-destructive focus-visible:ring-destructive" : ""}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ownershipType"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      Entity Type *
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className={fieldState.error ? "border-destructive focus-visible:ring-destructive" : ""}>
                          <SelectValue placeholder="Select entity type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {OWNERSHIP_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {OWNERSHIP_TYPE_LABELS[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="billingAddress"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                    Legal/Billing Address *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Legal address (if different from DBA)" 
                      className={fieldState.error ? "border-destructive focus-visible:ring-destructive" : ""}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="federalTaxIdNumber"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      Federal Tax ID (EIN) *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="XX-XXXXXXX" 
                        className={fieldState.error ? "border-destructive focus-visible:ring-destructive" : ""}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="incorporationState"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      State of Incorporation *
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className={fieldState.error ? "border-destructive focus-visible:ring-destructive" : ""}>
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {US_STATES.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="entityStartDate"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      Business Start Date *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="date"
                        className={fieldState.error ? "border-destructive focus-visible:ring-destructive" : ""}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="legalContactName"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      Legal Contact Name *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Full name" 
                        className={fieldState.error ? "border-destructive focus-visible:ring-destructive" : ""}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="legalPhone"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      Legal Contact Phone *
                    </FormLabel>
                    <FormControl>
                      <PhoneInput 
                        placeholder="123-456-7890" 
                        className={fieldState.error ? "border-destructive focus-visible:ring-destructive" : ""}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="legalEmail"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      Legal Contact Email *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="email"
                        placeholder="legal@business.com" 
                        className={fieldState.error ? "border-destructive focus-visible:ring-destructive" : ""}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Completion guidance */}
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-green-600 font-bold">1</span>
              </div>
              <div>
                <h3 className="font-semibold text-green-900">Almost there!</h3>
                <p className="text-sm text-green-700 mt-1">
                  Once you complete this step, you'll need to upload some required documents. 
                  Then you can finish the rest of your application.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Form>
  );
}

