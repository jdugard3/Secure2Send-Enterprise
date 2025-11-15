import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, Percent, FileText } from "lucide-react";

// Pricing terms schema
const pricingTermsSchema = z.object({
  otherServices: z.object({
    qualification: z.string().min(1, "Qualification is required"),
    discFee: z.coerce.number().min(0).max(100, "Must be between 0-100%"),
    perItem: z.coerce.number().min(0, "Per item fee is required"),
  }),
  surcharge: z.object({
    qualification: z.string().default("Consumer"),
    discFee: z.coerce.number().min(0).max(100).optional(),
    perItem: z.coerce.number().min(0, "Per item fee is required"),
    minimumFee: z.coerce.number().min(0).optional(),
  }),
  fees: z.object({
    qualification: z.string().min(1, "Qualification is required"),
    discFee: z.coerce.number().min(0).max(100).optional(),
    perItem: z.coerce.number().min(0).optional(),
  }),
});

export type PricingTermsData = z.infer<typeof pricingTermsSchema>;

interface PricingTermsModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: PricingTermsData) => void;
  isLoading?: boolean;
  initialData?: PricingTermsData;
}

export function PricingTermsModal({
  open,
  onClose,
  onSubmit,
  isLoading = false,
  initialData,
}: PricingTermsModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PricingTermsData>({
    resolver: zodResolver(pricingTermsSchema),
    defaultValues: initialData || {
      otherServices: {
        qualification: "",
        discFee: 0,
        perItem: 0,
      },
      surcharge: {
        qualification: "Consumer",
        discFee: 0,
        perItem: 0,
        minimumFee: 0,
      },
      fees: {
        qualification: "",
        discFee: 0,
        perItem: 0,
      },
    },
  });

  const handleFormSubmit = (data: PricingTermsData) => {
    onSubmit(data);
    reset();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Set Pricing Terms
          </DialogTitle>
          <DialogDescription>
            Enter the pricing terms that will be included in the merchant agreement (Page 3).
            These terms will be saved with the approved application and included in all documents.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Other Services Section */}
          <div className="border rounded-lg p-4 bg-slate-50">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              Other Services
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="otherServices.qualification">
                  Qualification <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="otherServices.qualification"
                  {...register("otherServices.qualification")}
                  placeholder="e.g., Retail, Delivery"
                />
                {errors.otherServices?.qualification && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.otherServices.qualification.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="otherServices.discFee" className="flex items-center gap-1">
                  <Percent className="h-3 w-3" />
                  Disc Fee (%) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="otherServices.discFee"
                  type="number"
                  step="0.01"
                  {...register("otherServices.discFee")}
                  placeholder="e.g., 3.5"
                />
                {errors.otherServices?.discFee && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.otherServices.discFee.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="otherServices.perItem" className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  Per Item ($) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="otherServices.perItem"
                  type="number"
                  step="0.01"
                  {...register("otherServices.perItem")}
                  placeholder="e.g., 0.25"
                />
                {errors.otherServices?.perItem && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.otherServices.perItem.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Surcharge Section */}
          <div className="border rounded-lg p-4 bg-blue-50">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              Surcharge
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="surcharge.qualification">
                  Qualification <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="surcharge.qualification"
                  {...register("surcharge.qualification")}
                  defaultValue="Consumer"
                  placeholder="Consumer"
                />
                {errors.surcharge?.qualification && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.surcharge.qualification.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="surcharge.discFee" className="flex items-center gap-1">
                  <Percent className="h-3 w-3" />
                  Disc Fee (%)
                </Label>
                <Input
                  id="surcharge.discFee"
                  type="number"
                  step="0.01"
                  {...register("surcharge.discFee")}
                  placeholder="e.g., 3.99"
                />
                {errors.surcharge?.discFee && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.surcharge.discFee.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="surcharge.perItem" className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  Per Item ($) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="surcharge.perItem"
                  type="number"
                  step="0.01"
                  {...register("surcharge.perItem")}
                  placeholder="e.g., 0.00"
                />
                {errors.surcharge?.perItem && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.surcharge.perItem.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="surcharge.minimumFee" className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  Minimum Fee ($)
                </Label>
                <Input
                  id="surcharge.minimumFee"
                  type="number"
                  step="0.01"
                  {...register("surcharge.minimumFee")}
                  placeholder="e.g., 0.00"
                />
                {errors.surcharge?.minimumFee && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.surcharge.minimumFee.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Fees Section */}
          <div className="border rounded-lg p-4 bg-green-50">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              Fees
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="fees.qualification">
                  Qualification <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="fees.qualification"
                  {...register("fees.qualification")}
                  placeholder="e.g., ACH, Chargebacks"
                />
                {errors.fees?.qualification && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.fees.qualification.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="fees.discFee" className="flex items-center gap-1">
                  <Percent className="h-3 w-3" />
                  Disc Fee (%)
                </Label>
                <Input
                  id="fees.discFee"
                  type="number"
                  step="0.01"
                  {...register("fees.discFee")}
                  placeholder="e.g., 0.00"
                />
                {errors.fees?.discFee && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.fees.discFee.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="fees.perItem" className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  Per Item ($)
                </Label>
                <Input
                  id="fees.perItem"
                  type="number"
                  step="0.01"
                  {...register("fees.perItem")}
                  placeholder="e.g., 0.00"
                />
                {errors.fees?.perItem && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.fees.perItem.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Approving..." : "Approve Application"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

