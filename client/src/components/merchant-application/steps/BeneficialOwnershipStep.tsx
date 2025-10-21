import { UseFormReturn, useFieldArray } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Users, AlertCircle, Copy } from "lucide-react";
import { MerchantApplicationForm, US_STATES, ID_TYPES, defaultBeneficialOwner } from "@/lib/merchantApplicationSchemas";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

interface BeneficialOwnershipStepProps {
  form: UseFormReturn<MerchantApplicationForm>;
}

const ID_TYPE_LABELS = {
  'DRIVERS_LICENSE': "Driver's License",
  'PASSPORT': 'US Passport', 
  'STATE_ID': 'State ID',
  'OTHER': 'Other (Specify)'
} as const;

export function BeneficialOwnershipStep({ form }: BeneficialOwnershipStepProps) {
  const { toast } = useToast();
  const { fields: beneficialOwners, append, remove } = useFieldArray({
    control: form.control,
    name: "beneficialOwners",
  });

  const addBeneficialOwner = () => {
    append(defaultBeneficialOwner);
  };

  const removeBeneficialOwner = (index: number) => {
    if (beneficialOwners.length > 1) {
      remove(index);
    }
  };

  const copyFromPrimaryOwner = () => {
    const ownerData = form.getValues();
    
    if (!ownerData.ownerFirstName || !ownerData.ownerLastName) {
      toast({
        title: "No Owner Data",
        description: "Please fill in the primary owner information in the Business Information section first.",
        variant: "destructive",
      });
      return;
    }

    const newBeneficialOwner = {
      name: ownerData.ownerFullName || `${ownerData.ownerFirstName} ${ownerData.ownerLastName}`,
      title: ownerData.ownerTitle || "",
      ownershipPercentage: parseFloat(ownerData.ownerOwnershipPercentage || "25"),
      residentialAddress: ownerData.ownerLegalAddress || "",
      city: ownerData.ownerCity || "",
      state: ownerData.ownerState || "FL",
      zip: ownerData.ownerZip || "",
      country: ownerData.ownerCountry || "US",
      phoneNumber: ownerData.ownerMobilePhone || "",
      email: ownerData.ownerEmail || "",
      idType: "DRIVERS_LICENSE" as const,
      idNumber: ownerData.ownerStateIssuedIdNumber || "",
      idState: ownerData.ownerIssuingState || "FL",
      idExpDate: ownerData.ownerIdExpDate || "",
      idDateIssued: ownerData.ownerIdDateIssued || "",
      dob: ownerData.ownerBirthday || "",
      ssn: ownerData.ownerSsn || "",
      ssnOrTinFromUs: true,
      controlPerson: false,
    };

    append(newBeneficialOwner);
    toast({
      title: "Owner Information Copied",
      description: "Primary owner has been added as a beneficial owner.",
    });
  };

  const copyFromAdditionalOwner = (additionalOwnerIndex: number) => {
    const additionalOwners = form.getValues("additionalOwners") || [];
    const additionalOwner = additionalOwners[additionalOwnerIndex];

    if (!additionalOwner) {
      toast({
        title: "No Owner Data",
        description: "Additional owner data not found.",
        variant: "destructive",
      });
      return;
    }

    const newBeneficialOwner = {
      name: additionalOwner.ownerFullName || `${additionalOwner.ownerFirstName} ${additionalOwner.ownerLastName}`,
      title: additionalOwner.ownerTitle || "",
      ownershipPercentage: parseFloat(additionalOwner.ownerOwnershipPercentage || "25"),
      residentialAddress: additionalOwner.ownerLegalAddress || "",
      city: additionalOwner.ownerCity || "",
      state: additionalOwner.ownerState || "FL",
      zip: additionalOwner.ownerZip || "",
      country: additionalOwner.ownerCountry || "US",
      phoneNumber: additionalOwner.ownerMobilePhone || "",
      email: additionalOwner.ownerEmail || "",
      idType: "DRIVERS_LICENSE" as const,
      idNumber: additionalOwner.ownerStateIssuedIdNumber || "",
      idState: additionalOwner.ownerIssuingState || "FL",
      idExpDate: additionalOwner.ownerIdExpDate || "",
      idDateIssued: additionalOwner.ownerIdDateIssued || "",
      dob: additionalOwner.ownerBirthday || "",
      ssn: additionalOwner.ownerSsn || "",
      ssnOrTinFromUs: true,
      controlPerson: false,
    };

    append(newBeneficialOwner);
    toast({
      title: "Owner Information Copied",
      description: `Additional owner #${additionalOwnerIndex + 1} has been added as a beneficial owner.`,
    });
  };

  return (
    <Form {...form}>
      <div className="space-y-8">
        {/* Information Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-blue-900">Beneficial Owner Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800 mb-3">
                <strong>This Beneficial Ownership Addendum shall be attached to and made a part of the original Merchant Agreement between Bank and the undersigned.</strong>
              </p>
              <p className="text-sm text-blue-800 mb-3">
                To help the government fight financial crime, Federal regulation requires certain financial institutions to obtain, verify, and record information about the beneficial owners of legal entity customers. Legal entities can be abused to disguise involvement in terrorist financing, money laundering, tax evasion, corruption, fraud, and other financial crimes. Requiring the disclosure of key individuals who own or control a legal entity (i.e., the beneficial owners) helps law enforcement investigate and prosecute these crimes.
              </p>
              <p className="text-sm text-blue-800 font-medium">
                By signing below, I certify that I have accurately provided the name, address, date of birth and Social Security Number (SSN) for the following individuals (i.e. the beneficial owners):
              </p>
              <ul className="list-disc list-inside mt-2 text-sm text-blue-800 space-y-1">
                <li>Each individual, if any, who owns directly or indirectly, 25 percent or more of the equity interests of the legal entity customer (e.g., each natural person that owns 25 percent or more of the shares of a corporation); AND</li>
                <li>An individual with significant responsibility for managing the legal entity customer (e.g., a Chief Executive Officer, Chief Financial Officer, Chief Operating Officer, Managing Member, General Partner, President, Vice President, or Treasurer).</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Beneficial Owners */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle>Beneficial Owners (25%+ Ownership)</CardTitle>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyFromPrimaryOwner}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Primary Owner
                </Button>
                {(() => {
                  const additionalOwners = form.watch("additionalOwners") || [];
                  return additionalOwners.map((_, index) => (
                    <Button
                      key={index}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => copyFromAdditionalOwner(index)}
                      className="bg-purple-500 hover:bg-purple-600 text-white"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Owner #{index + 1}
                    </Button>
                  ));
                })()}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addBeneficialOwner}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Owner
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {beneficialOwners.map((field, index) => (
              <div key={field.id} className="space-y-6 p-6 border rounded-lg bg-gray-50">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-lg">Beneficial Owner #{index + 1}</h4>
                  {beneficialOwners.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeBeneficialOwner(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Personal Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name={`beneficialOwners.${index}.name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`beneficialOwners.${index}.ssn`}
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name={`beneficialOwners.${index}.ownershipPercentage`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>% Ownership *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="25"
                            max="100"
                            placeholder="25"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 25)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`beneficialOwners.${index}.dob`}
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
                    name={`beneficialOwners.${index}.title`}
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

                {/* Address Information */}
                <Separator />
                <h5 className="font-medium">Residential Address</h5>
                
                <FormField
                  control={form.control}
                  name={`beneficialOwners.${index}.residentialAddress`}
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
                    name={`beneficialOwners.${index}.city`}
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
                    name={`beneficialOwners.${index}.state`}
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
                    name={`beneficialOwners.${index}.zip`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP Code *</FormLabel>
                        <FormControl>
                          <Input placeholder="12345" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name={`beneficialOwners.${index}.phoneNumber`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Home Phone *</FormLabel>
                        <FormControl>
                          <Input placeholder="(555) 123-4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`beneficialOwners.${index}.email`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input placeholder="owner@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* ID Information */}
                <Separator />
                <h5 className="font-medium">Identification</h5>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name={`beneficialOwners.${index}.idType`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type of ID *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select ID type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ID_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {ID_TYPE_LABELS[type]}
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
                    name={`beneficialOwners.${index}.idNumber`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ID Number *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter ID number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name={`beneficialOwners.${index}.idState`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Issuing State</FormLabel>
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
                    name={`beneficialOwners.${index}.idDateIssued`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ID Date Issued *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`beneficialOwners.${index}.idExpDate`}
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name={`beneficialOwners.${index}.country`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter country" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name={`beneficialOwners.${index}.ssnOrTinFromUs`}
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
                              SSN or TIN from US? *
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`beneficialOwners.${index}.controlPerson`}
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
                              Control Person? *
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {index < beneficialOwners.length - 1 && <Separator className="mt-6" />}
              </div>
            ))}
          </CardContent>
        </Card>

      </div>
    </Form>
  );
}
