import { UseFormReturn, useFieldArray } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Building2, Users, CreditCard, Landmark, FileText, Calculator, Briefcase } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  MerchantApplicationForm,
  US_STATES,
  PROCESSING_CATEGORIES,
  OWNERSHIP_TYPES,
  BUSINESS_TYPES,
  defaultPrincipalOfficer,
  defaultAdditionalOwner
} from "@/lib/merchantApplicationSchemas";

interface BusinessInformationStepProps {
  form: UseFormReturn<MerchantApplicationForm>;
}

const PROCESSING_CATEGORY_LABELS = {
  CARD_PRESENT_RETAIL: "Card Present (Retail)",
  CARD_NOT_PRESENT_E_COMMERCE: "Card Not Present (E-Commerce)"
} as const;

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

const BUSINESS_TYPE_LABELS = {
  'Retail': "Retail",
  'E-Commerce': "E-Commerce",
  'Restaurant': "Restaurant",
  'Professional Services': "Professional Services",
  'Healthcare': "Healthcare",
  'Other': "Other"
} as const;

export function BusinessInformationStep({ form }: BusinessInformationStepProps) {
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
      // Calculate monthly transactions: Monthly Sales Volume / Average Ticket
      const monthlyTransactions = Math.round(monthlySalesVolume / averageTicket);
      form.setValue("monthlyTransactions", monthlyTransactions);
      
      // Calculate annual volume: Monthly Sales Volume * 12
      const annualVolume = (monthlySalesVolume * 12).toString();
      form.setValue("annualVolume", annualVolume);
      
      // Calculate annual transactions: Monthly Transactions * 12
      const annualTransactions = monthlyTransactions * 12;
      form.setValue("annualTransactions", annualTransactions);
    } else {
      // Reset calculated fields if inputs are invalid
      form.setValue("monthlyTransactions", 0);
      form.setValue("annualVolume", "");
      form.setValue("annualTransactions", 0);
    }
  };

  return (
    <Form {...form}>
      <div className="space-y-8">
        {/* MPA and Sales Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle>MPA and Sales Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="mpaSignedDate"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                    MPA Signed Date *
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
              <CardTitle>DBA Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dbaBusinessName"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      DBA Name *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter DBA name" 
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
                      DBA Website *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter website URL" 
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
                name="locationAddress"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      Location Address *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter location address" 
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
                name="productOrServiceSold"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      Product or Service Sold *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Describe products or services" 
                        className={fieldState.error ? "border-destructive focus-visible:ring-destructive" : ""}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                        placeholder="Enter city" 
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
                name="zip"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      ZIP Code *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter ZIP code" 
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
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Multiple Locations?
                      </FormLabel>
                    </div>
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
                      <Input 
                        placeholder="Enter business phone" 
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
                name="contactEmail"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      Contact Email *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="email"
                        placeholder="Enter contact email" 
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
                <CardTitle>Corporate Information</CardTitle>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const dbaName = form.getValues("dbaBusinessName");
                  const locationAddress = form.getValues("locationAddress");
                  const city = form.getValues("city");
                  const state = form.getValues("state");
                  const zip = form.getValues("zip");
                  const businessPhone = form.getValues("businessPhone");
                  const contactEmail = form.getValues("contactEmail");
                  
                  form.setValue("legalBusinessName", dbaName);
                  form.setValue("billingAddress", locationAddress);
                  form.setValue("legalContactName", form.getValues("dbaBusinessName"));
                  form.setValue("legalPhone", businessPhone);
                  form.setValue("legalEmail", contactEmail);
                  
                  toast({
                    title: "DBA Information Copied",
                    description: "Corporate information has been populated with DBA details.",
                  });
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                Copy from DBA Section
              </Button>
            </div>
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
                        placeholder="Enter legal business name" 
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
                name="billingAddress"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      Legal Address *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter legal address" 
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
                name="legalContactName"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      Legal Contact Name *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter legal contact name" 
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
                      Legal Phone *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter legal phone" 
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
                name="legalEmail"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      Legal Email *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="email"
                        placeholder="Enter legal email" 
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="federalTaxIdNumber"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      Federal Tax ID *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter Federal Tax ID" 
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
                      Incorporation State *
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

        {/* Transaction and Volume */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              <CardTitle>Transaction and Volume</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="averageTicket"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      Average Ticket *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter average ticket amount" 
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
                      High Ticket *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter high ticket amount" 
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
                name="monthlySalesVolume"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      Monthly Sales Volume *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter monthly sales volume" 
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
                name="monthlyTransactions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly # of Transactions</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        placeholder="Auto-calculated from volume/average ticket" 
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Banking Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-primary" />
              <CardTitle>Banking Information</CardTitle>
            </div>
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
                        placeholder="Enter account owner first name" 
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
                        placeholder="Enter account owner last name" 
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
                        placeholder="Enter name on bank account" 
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
                        placeholder="Enter bank name" 
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
                      ABA Routing Number *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter 9-digit routing number" 
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
                        placeholder="Enter account number" 
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
                name="bankOfficerName"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      Bank Officer Name *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter bank officer name" 
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
                      <Input 
                        placeholder="Enter bank officer phone" 
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
                name="bankOfficerEmail"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      Bank Officer Email *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="email"
                        placeholder="Enter bank officer email" 
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

        {/* Enhanced Owner Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle>Owner Information</CardTitle>
            </div>
            <p className="text-sm text-orange-600 font-medium mt-2">
              Note: Anyone with &gt;25% ownership must be included in this section and the Beneficial Ownership section.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="ownerFirstName"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      First Name *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter first name" 
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
                name="ownerLastName"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      Last Name *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter last name" 
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
                name="ownerFullName"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      Full Name *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter full name" 
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
                name="ownerTitle"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      Title *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter title (e.g., CEO, President)" 
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
                name="ownerOfficer"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      Owner/Officer *
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className={fieldState.error ? "border-destructive focus-visible:ring-destructive" : ""}>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Owner">Owner</SelectItem>
                        <SelectItem value="Officer">Officer</SelectItem>
                        <SelectItem value="N/A">N/A</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ownerOwnershipPercentage"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      Ownership % *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter ownership percentage" 
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
                name="ownerMobilePhone"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      Mobile Phone *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter mobile phone" 
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
                name="ownerEmail"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      Email *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="email"
                        placeholder="Enter email" 
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
            <h5 className="font-medium">Personal Information</h5>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="ownerSsn"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      SSN *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="XXX-XX-XXXX" 
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
                name="ownerBirthday"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      Date of Birth *
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

              <FormField
                control={form.control}
                name="ownerStateIssuedIdNumber"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      State Issued ID Number *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter ID number" 
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
                name="ownerIssuingState"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      Issuing State *
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
                name="ownerIdDateIssued"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      ID Date Issued *
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

              <FormField
                control={form.control}
                name="ownerIdExpDate"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      ID Expiration Date *
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

            <Separator />
            <h5 className="font-medium">Residential Address</h5>

            <FormField
              control={form.control}
              name="ownerLegalAddress"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                    Legal Address *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter legal address" 
                      className={fieldState.error ? "border-destructive focus-visible:ring-destructive" : ""}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="ownerCity"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      City *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter city" 
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
                name="ownerState"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      State *
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
                name="ownerZip"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      ZIP Code *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter ZIP code" 
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
                name="ownerCountry"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                      Country *
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue="US">
                      <FormControl>
                        <SelectTrigger className={fieldState.error ? "border-destructive focus-visible:ring-destructive" : ""}>
                          <SelectValue placeholder="Select country" />
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
            <div className="flex justify-center mt-6 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addAdditionalOwner}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Additional Owner
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Additional Owners - Dynamically Rendered */}
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
            <CardContent className="space-y-6">
              {/* Additional Owner Fields - Same structure as primary owner */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name={`additionalOwners.${index}.ownerFirstName` as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter first name" {...field} />
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
                        <Input placeholder="Enter last name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`additionalOwners.${index}.ownerFullName` as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name={`additionalOwners.${index}.ownerTitle` as any}
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
                  name={`additionalOwners.${index}.ownerOfficer` as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Owner/Officer *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Owner">Owner</SelectItem>
                          <SelectItem value="Officer">Officer</SelectItem>
                          <SelectItem value="N/A">N/A</SelectItem>
                        </SelectContent>
                      </Select>
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
                        <Input placeholder="Enter ownership %" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name={`additionalOwners.${index}.ownerMobilePhone` as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile Phone *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter mobile phone" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`additionalOwners.${index}.ownerEmail` as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />
              <p className="text-sm font-medium text-gray-700">Personal Information</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name={`additionalOwners.${index}.ownerSsn` as any}
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
                  name={`additionalOwners.${index}.ownerBirthday` as any}
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
              </div>

              <Separator />
              <p className="text-sm font-medium text-gray-700">ID Information</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name={`additionalOwners.${index}.ownerStateIssuedIdNumber` as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State Issued ID # *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter ID number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`additionalOwners.${index}.ownerIssuingState` as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issuing State *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
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
                  name={`additionalOwners.${index}.ownerIdExpDate` as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID Expiration Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />
              <p className="text-sm font-medium text-gray-700">Address Information</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name={`additionalOwners.${index}.ownerLegalAddress` as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Legal Address *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter legal address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`additionalOwners.${index}.ownerCity` as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter city" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name={`additionalOwners.${index}.ownerState` as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
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
                  name={`additionalOwners.${index}.ownerZip` as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ZIP Code *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter ZIP" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`additionalOwners.${index}.ownerCountry` as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter country" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
        ))}

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
                          <SelectValue placeholder="Select business type" />
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
                        placeholder="Enter POS system" 
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
                    <FormLabel>Refund Days</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        placeholder="Enter refund days" 
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
                      <FormLabel>
                        Refund/Guarantee Policy?
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="processingCategories"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Processing Categories *</FormLabel>
                    </div>
                    {PROCESSING_CATEGORIES.map((category) => (
                      <FormField
                        key={category}
                        control={form.control}
                        name="processingCategories"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={category}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
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
                          )
                        }}
                      />
                    ))}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

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
                          <Input placeholder="Enter name" {...field} />
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
                          <Input placeholder="Enter title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name={`principalOfficers.${index}.equityPercentage`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Equity Percentage *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="Enter percentage" 
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                          />
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
                        <FormLabel>Phone Number *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter phone number" {...field} />
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
                        <Input placeholder="Enter residential address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name={`principalOfficers.${index}.city`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter city" {...field} />
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
                    name={`principalOfficers.${index}.zip`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP Code *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter ZIP code" {...field} />
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
      </div>
    </Form>
  );
}
