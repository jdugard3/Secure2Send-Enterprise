import { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Building2, Globe } from "lucide-react";
import { MerchantApplicationForm } from "@/lib/merchantApplicationSchemas";

interface SimplifiedBasicInfoStepProps {
  form: UseFormReturn<MerchantApplicationForm>;
  onContinue: () => void;
  isSubmitting?: boolean;
}

export function SimplifiedBasicInfoStep({ form, onContinue, isSubmitting = false }: SimplifiedBasicInfoStepProps) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = await form.trigger(['dbaBusinessName', 'dbaWebsite']);
    if (isValid) {
      onContinue();
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Welcome Message */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-blue-900 mb-2">
              Let's get started with your business information
            </h2>
            <p className="text-blue-700">
              First, we need some basic details about your business. This should only take a minute to complete.
            </p>
          </CardContent>
        </Card>

        {/* Business Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle>Basic Business Information</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Enter your business name and website to get started
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="dbaBusinessName"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel className={fieldState.error ? "text-destructive" : ""}>
                    Business Name *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., Joe's Coffee Shop" 
                      className={fieldState.error ? "border-destructive focus-visible:ring-destructive" : ""}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    This will be used as your application name
                  </p>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="legalBusinessName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    DBA (Doing Business As) <span className="text-muted-foreground font-normal">(Optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="If different from business name" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    Only if your business operates under a different name than above
                  </p>
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
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="www.example.com" 
                        className={`pl-10 ${fieldState.error ? "border-destructive focus-visible:ring-destructive" : ""}`}
                        {...field} 
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Continue Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                Continue
                <Building2 className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}

