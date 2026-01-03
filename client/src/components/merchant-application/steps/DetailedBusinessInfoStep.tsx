import { UseFormReturn, useFieldArray } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Users, Landmark, Calculator, Briefcase } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  MerchantApplicationForm,
  US_STATES,
  PROCESSING_CATEGORIES,
  BUSINESS_TYPES,
  defaultPrincipalOfficer,
  defaultAdditionalOwner
} from "@/lib/merchantApplicationSchemas";

interface DetailedBusinessInfoStepProps {
  form: UseFormReturn<MerchantApplicationForm>;
}

const PROCESSING_CATEGORY_LABELS = {
  CARD_PRESENT_RETAIL: "Card Present (Retail)",
  CARD_NOT_PRESENT_E_COMMERCE: "Card Not Present (E-Commerce)"
} as const;

const BUSINESS_TYPE_LABELS = {
  'Retail': "Retail",
  'E-Commerce': "E-Commerce",
  'Restaurant': "Restaurant",
  'Professional Services': "Professional Services",
  'Healthcare': "Healthcare",
  'Other': "Other"
} as const;

export function DetailedBusinessInfoStep({ form }: DetailedBusinessInfoStepProps) {
  const { toast } = useToast();
  const { fields: principalOfficers, append, remove } = useFieldArray({
    control: form.control,
    name: "principalOfficers",
  });

  const { fields: additionalOwners, append: appendOwner, remove: removeOwner } = useFieldArray({
    control: form.control,
    name: "additionalOwners",
  });

  const addPrincipalOfficer = () => {
    append(defaultPrincipalOfficer as any);
  };

  const removePrincipalOfficer = (index: number) => {
    if (principalOfficers.length > 1) {
      remove(index);
    }
  };

  const addAdditionalOwner = () => {
    appendOwner(defaultAdditionalOwner as any);
    toast({
      title: "Additional Owner Added",
      description: "A new owner section has been added below.",
    });
  };

  const removeAdditionalOwner = (index: number) => {
    removeOwner(index);
    toast({
      title: "Owner Removed",
      description: "The additional owner has been removed.",
    });
  };

  // Auto-calculation logic for derived fields
  const calculateDerivedFields = () => {
    const averageTicketValue = form.getValues("averageTicket");
    const monthlySalesVolumeValue = form.getValues("monthlySalesVolume");
    
    const averageTicket = parseFloat(averageTicketValue) || 0;
    const monthlySalesVolume = parseFloat(monthlySalesVolumeValue) || 0;
    
    if (averageTicket > 0 && monthlySalesVolume > 0) {
      const monthlyTransactions = Math.round(monthlySalesVolume / averageTicket);
      form.setValue("monthlyTransactions", monthlyTransactions);
      
      const annualVolume = (monthlySalesVolume * 12).toString();
      form.setValue("annualVolume", annualVolume);
      
      const annualTransactions = monthlyTransactions * 12;
      form.setValue("annualTransactions", annualTransactions);
    } else {
      form.setValue("monthlyTransactions", 0);
      form.setValue("annualVolume", "");
      form.setValue("annualTransactions", 0);
    }
  };

  return (
    <Form {...form}>
      <div className="space-y-8">
        {/* Info Banner */}
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-purple-900 mb-2">
              Complete Your Application Details
            </h2>
            <p className="text-purple-700">
              Great progress! Now let's add your banking, transaction, and owner information to complete your application.
            </p>
          </CardContent>
        </Card>

        {/* Transaction and Volume */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              <CardTitle>Transaction and Volume Information</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Provide estimates of your expected transaction volumes
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="averageTicket"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      Average Ticket ($) *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., 50.00" 
                        className={fieldState.error ? "border-destructive focus-visible:ring-destructive" : ""}
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          setTimeout(calculateDerivedFields, 100);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="highTicket"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      High Ticket ($) *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., 500.00" 
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
                name="monthlySalesVolume"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      Monthly Sales Volume ($) *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., 10000.00" 
                        className={fieldState.error ? "border-destructive focus-visible:ring-destructive" : ""}
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          setTimeout(calculateDerivedFields, 100);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Calculated Fields (Auto-filled)</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="monthlyTransactions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-600">Monthly Transactions</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          disabled
                          className="bg-gray-100"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="annualVolume"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-600">Annual Volume ($)</FormLabel>
                      <FormControl>
                        <Input 
                          disabled
                          className="bg-gray-100"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="annualTransactions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-600">Annual Transactions</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          disabled
                          className="bg-gray-100"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Corporate Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              <CardTitle>Corporate Information</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Legal business details and tax identification
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
                        placeholder="Legal name as registered" 
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="ownershipType"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      Ownership Type *
                    </FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className={fieldState.error ? "border-destructive" : ""}>
                          <SelectValue placeholder="Select ownership type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SOLE_PROPRIETORSHIP">Sole Proprietorship</SelectItem>
                          <SelectItem value="PARTNERSHIP">Partnership</SelectItem>
                          <SelectItem value="LLC">LLC</SelectItem>
                          <SelectItem value="CORPORATION">Corporation</SelectItem>
                          <SelectItem value="S_CORP">S-Corp</SelectItem>
                        </SelectContent>
                      </Select>
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
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className={fieldState.error ? "border-destructive" : ""}>
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent>
                          {US_STATES.map((state) => (
                            <SelectItem key={state} value={state}>
                              {state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
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
                      Entity Start Date *
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
          </CardContent>
        </Card>

        {/* Banking Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-primary" />
              <CardTitle>Banking Information</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Provide your business bank account details for payment processing
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="accountOwnerFirstName"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      Account Owner First Name *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="First name" 
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
                name="accountOwnerLastName"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      Account Owner Last Name *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Last name" 
                        className={fieldState.error ? "border-destructive focus-visible:ring-destructive" : ""}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nameOnBankAccount"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      Name on Bank Account *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Exactly as it appears on account" 
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
                name="bankName"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      Bank Name *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Chase, Bank of America" 
                        className={fieldState.error ? "border-destructive focus-visible:ring-destructive" : ""}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="abaRoutingNumber"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      Routing Number (ABA) *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="9-digit routing number" 
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
                name="ddaNumber"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      Account Number *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Account number" 
                        className={fieldState.error ? "border-destructive focus-visible:ring-destructive" : ""}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />
            <p className="text-sm font-medium text-gray-700">Bank Contact (for verification)</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="bankOfficerName"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      Bank Officer Name *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Officer name" 
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
                name="bankOfficerPhone"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      Bank Officer Phone *
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
                name="bankOfficerEmail"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      Bank Officer Email *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="email"
                        placeholder="officer@bank.com" 
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

        {/* Business Operations */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              <CardTitle>Business Operations</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="businessType"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      Business Type *
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className={fieldState.error ? "border-destructive focus-visible:ring-destructive" : ""}>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {BUSINESS_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {BUSINESS_TYPE_LABELS[type]}
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
                name="posSystem"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      POS System *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Square, Clover" 
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
                name="refundDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Refund Policy (Days)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        placeholder="e.g., 30" 
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="refundGuarantee"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Has Refund/Guarantee Policy</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="processingCategories"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-base">Processing Categories *</FormLabel>
                    <div className="space-y-2 mt-2">
                      {PROCESSING_CATEGORIES.map((category) => (
                        <FormField
                          key={category}
                          control={form.control}
                          name="processingCategories"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(category)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, category])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== category
                                          )
                                        )
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {PROCESSING_CATEGORY_LABELS[category]}
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Primary Owner Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle>Primary Owner Information</CardTitle>
            </div>
            <p className="text-sm text-orange-600 font-medium mt-2">
              Note: Anyone with &gt;25% ownership must be included here and in the Beneficial Ownership section.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="ownerFirstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="First name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ownerLastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Last name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ownerTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., CEO, Owner" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="ownerOwnershipPercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ownership %</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 100" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ownerMobilePhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Phone</FormLabel>
                    <FormControl>
                      <PhoneInput 
                        placeholder="123-456-7890" 
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
                name="ownerEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="owner@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />
            <p className="text-sm font-medium text-gray-700">Personal Identification</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="ownerSsn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SSN</FormLabel>
                    <FormControl>
                      <Input placeholder="XXX-XX-XXXX" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ownerBirthday"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ownerStateIssuedIdNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Driver's License / ID Number</FormLabel>
                    <FormControl>
                      <Input placeholder="ID number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="ownerIssuingState"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID Issuing State</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
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
                name="ownerIdDateIssued"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID Issue Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ownerIdExpDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID Expiration Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />
            <p className="text-sm font-medium text-gray-700">Owner's Residential Address</p>

            <FormField
              control={form.control}
              name="ownerLegalAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address</FormLabel>
                  <FormControl>
                    <Input placeholder="Street address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="ownerCity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="City" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ownerState"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
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
                name="ownerZip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ZIP Code</FormLabel>
                    <FormControl>
                      <Input placeholder="12345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ownerCountry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue="US">
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Country" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="US">United States</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Add Additional Owner Button */}
            <div className="flex justify-center pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addAdditionalOwner}
                className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Additional Owner
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Additional Owners */}
        {additionalOwners.map((owner, index) => (
          <Card key={owner.id} className="border-2 border-blue-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  <CardTitle>Additional Owner #{index + 1}</CardTitle>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAdditionalOwner(index)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name={`additionalOwners.${index}.ownerFirstName` as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="First name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`additionalOwners.${index}.ownerLastName` as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Last name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`additionalOwners.${index}.ownerOwnershipPercentage` as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ownership % *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 25" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name={`additionalOwners.${index}.ownerEmail` as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="email@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`additionalOwners.${index}.ownerMobilePhone` as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile Phone *</FormLabel>
                      <FormControl>
                        <PhoneInput 
                          placeholder="123-456-7890" 
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Principal Officers */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle>Principal Officers</CardTitle>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPrincipalOfficer}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Officer
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {principalOfficers.map((field, index) => (
              <div key={field.id} className="space-y-4 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Principal Officer {index + 1}</h4>
                  {principalOfficers.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removePrincipalOfficer(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name={`principalOfficers.${index}.name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`principalOfficers.${index}.title`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., CEO, CFO" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name={`principalOfficers.${index}.ssn`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SSN *</FormLabel>
                        <FormControl>
                          <Input placeholder="XXX-XX-XXXX" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`principalOfficers.${index}.dob`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Birth *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`principalOfficers.${index}.equityPercentage`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Equity % *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="e.g., 25" 
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name={`principalOfficers.${index}.residentialAddress`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Residential Address *</FormLabel>
                      <FormControl>
                        <Input placeholder="Street address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name={`principalOfficers.${index}.city`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City *</FormLabel>
                        <FormControl>
                          <Input placeholder="City" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`principalOfficers.${index}.state`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
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
                    name={`principalOfficers.${index}.zip`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP *</FormLabel>
                        <FormControl>
                          <Input placeholder="12345" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`principalOfficers.${index}.phoneNumber`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone *</FormLabel>
                        <FormControl>
                          <PhoneInput 
                            placeholder="123-456-7890" 
                            value={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Completion guidance */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-bold">3</span>
              </div>
              <div>
                <h3 className="font-semibold text-blue-900">You're making great progress!</h3>
                <p className="text-sm text-blue-700 mt-1">
                  After completing this section, you'll add beneficial ownership details and certifications to finish your application.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Form>
  );
}

