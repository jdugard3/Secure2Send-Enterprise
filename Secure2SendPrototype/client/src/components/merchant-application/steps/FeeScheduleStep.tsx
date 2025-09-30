import { UseFormReturn, useFieldArray } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, DollarSign, Package, Settings as SettingsIcon } from "lucide-react";
import { MerchantApplicationForm, defaultEquipment } from "@/lib/merchantApplicationSchemas";

interface FeeScheduleStepProps {
  form: UseFormReturn<MerchantApplicationForm>;
}

export function FeeScheduleStep({ form }: FeeScheduleStepProps) {
  const { fields: equipmentFields, append, remove } = useFieldArray({
    control: form.control,
    name: "equipmentData",
  });

  const addEquipment = () => {
    append(defaultEquipment);
  };

  const removeEquipment = (index: number) => {
    remove(index);
  };

  return (
    <Form {...form}>
      <div className="space-y-8">
        {/* Fee Schedule */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <CardTitle>Fee Schedule</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 p-3 text-left">Qualification</th>
                    <th className="border border-gray-300 p-3 text-center">Disc Fee (%)</th>
                    <th className="border border-gray-300 p-3 text-center">Per Item ($)</th>
                    <th className="border border-gray-300 p-3 text-center">Minimum Fee</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 p-3 font-medium">Other Services</td>
                    <td className="border border-gray-300 p-3">
                <FormField
                  control={form.control}
                  name={"feeScheduleData.qualificationDiscountFee" as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="text-center"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                    </td>
                    <td className="border border-gray-300 p-3">
                <FormField
                  control={form.control}
                  name={"feeScheduleData.qualificationPerItem" as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="text-center"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                    </td>
                    <td className="border border-gray-300 p-3">
                <FormField
                  control={form.control}
                  name={"feeScheduleData.minimumFee" as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="text-center"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3 font-medium">Consumer</td>
                    <td className="border border-gray-300 p-3 text-center">$3.50</td>
                    <td className="border border-gray-300 p-3 font-medium">Dispensary</td>
                    <td className="border border-gray-300 p-3 text-center">Cost + 2%</td>
                    <td className="border border-gray-300 p-3 text-center">$1.00</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Supporting Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5 text-primary" />
              <CardTitle>Supporting Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Sales Information */}
            <div>
              <h4 className="font-medium mb-4">Sales Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name={"supportingInformation.salesInformation.averageTicket" as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Average Ticket</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={"supportingInformation.salesInformation.highTicket" as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>High Ticket</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={"supportingInformation.salesInformation.monthlyVolume" as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Volume</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={"supportingInformation.salesInformation.annualVolume" as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Annual Volume</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Monthly Fees */}
            <div>
              <h4 className="font-medium mb-4">Monthly Fees</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name={"supportingInformation.monthlyFees.monthlyMin" as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Min</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={field.value || "10.00"}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 10.00)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={"supportingInformation.monthlyFees.monthlyServiceFee" as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Service Fee</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={field.value || "0.00"}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0.00)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={"supportingInformation.monthlyFees.wirelessFee" as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wireless Fee</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={field.value || "0.00"}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0.00)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={"supportingInformation.monthlyFees.industryNonCompliance" as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry Non-Compliance</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={field.value || "0.00"}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0.00)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={"supportingInformation.monthlyFees.miscMonthlyFee" as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Misc Monthly Fee</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={field.value || "0.00"}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0.00)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={"supportingInformation.monthlyFees.chargebackFee" as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Chargeback Fee</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={field.value || "25.00"}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 25.00)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Miscellaneous */}
            <div>
              <h4 className="font-medium mb-4">Miscellaneous</h4>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name={"supportingInformation.miscellaneous.salesTerminalPurchaseDesired" as any}
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={!!field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Sales Terminal Purchase Desired</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name={"supportingInformation.miscellaneous.generalFee" as any}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>General Fee</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={field.value || "35.00"}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 35.00)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={"supportingInformation.miscellaneous.rushFee" as any}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rush Fee</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={field.value || "35.00"}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 35.00)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={"supportingInformation.miscellaneous.achRejectFee" as any}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ACH Reject Fee</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={field.value || "35.00"}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 35.00)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={"supportingInformation.miscellaneous.onlineReportingFee" as any}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Online Reporting Fee</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={field.value || "35.00"}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 35.00)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={"supportingInformation.miscellaneous.monthlyServiceFee" as any}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Service Fee</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={field.value || "10.00"}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 10.00)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={"supportingInformation.miscellaneous.batchFee" as any}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Batch Fee</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={field.value || "0.00"}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0.00)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Equipment */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <CardTitle>Equipment</CardTitle>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addEquipment}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Equipment
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {equipmentFields.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No equipment added yet.</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addEquipment}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Equipment
                </Button>
              </div>
            )}

            {equipmentFields.map((field, index) => (
              <div key={field.id} className="space-y-4 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Equipment #{index + 1}</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeEquipment(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name={`equipmentData.${index}.equipmentName`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Equipment Name</FormLabel>
                        <FormControl>
                          <Input placeholder="PAX A920 PRO" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`equipmentData.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            defaultValue="1"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`equipmentData.${index}.price`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            defaultValue="395.00"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 395.00)}
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
                    name={`equipmentData.${index}.shippingCost`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shipping Cost</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`equipmentData.${index}.billToMerchant`}
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 mt-6">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Bill To Merchant</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name={`equipmentData.${index}.notes`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Input placeholder="Additional notes..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {index < equipmentFields.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </Form>
  );
}
