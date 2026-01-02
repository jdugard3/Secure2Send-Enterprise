import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Copy, Check } from "lucide-react";

interface CreateInvitationCodeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CreateInvitationCodeData {
  label: string;
}

export default function CreateInvitationCodeForm({ open, onOpenChange }: CreateInvitationCodeFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<CreateInvitationCodeData>({
    label: "",
  });

  const createCodeMutation = useMutation({
    mutationFn: async (data: CreateInvitationCodeData) => {
      const response = await apiRequest("POST", "/api/agent/invitation-codes", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Invitation Code Created",
        description: `Code ${data.code} has been generated for ${data.label}.`,
      });
      
      // Clear form
      setFormData({
        label: "",
      });
      
      // Refresh the invitation codes list
      queryClient.invalidateQueries({ queryKey: ["/api/agent/invitation-codes"] });
      
      // Don't close dialog yet - show the code so they can copy it
    },
    onError: (error: Error) => {
      console.error("Create invitation code error:", error);
      toast({
        title: "Failed to Create Invitation Code",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.label || formData.label.trim().length === 0) {
      toast({
        title: "Validation Error",
        description: "Label is required (e.g., 'Joe's Pizza Shop').",
        variant: "destructive",
      });
      return;
    }

    createCodeMutation.mutate(formData);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast({
      title: "Code Copied",
      description: "Invitation code copied to clipboard.",
    });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleClose = () => {
    setFormData({ label: "" });
    createCodeMutation.reset();
    setCopiedCode(null);
    onOpenChange(false);
  };

  const createdCode = createCodeMutation.data;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Invitation Code</DialogTitle>
          <DialogDescription>
            Generate a unique invitation code for a merchant. Merchants who sign up with this code will be associated with you.
          </DialogDescription>
        </DialogHeader>
        
        {!createdCode ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="label">Merchant Label</Label>
              <Input
                id="label"
                type="text"
                value={formData.label}
                onChange={(e) => setFormData({ label: e.target.value })}
                placeholder="Joe's Pizza Shop"
                disabled={createCodeMutation.isPending}
                required
              />
              <p className="text-xs text-gray-500">
                A label to identify who this invitation code is for
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-xs text-blue-800">
                <strong>Note:</strong> Merchants who sign up with this code will be linked to your agent account. You'll be able to track their onboarding progress and application status.
              </p>
            </div>

            <DialogFooter className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={createCodeMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createCodeMutation.isPending}
              >
                {createCodeMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Generate Code
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <p className="text-sm font-medium text-green-800 mb-2">Invitation Code Created!</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white px-3 py-2 rounded border border-green-300 font-mono text-lg font-bold">
                  {createdCode.code}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyCode(createdCode.code)}
                  className="shrink-0"
                >
                  {copiedCode === createdCode.code ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-green-700 mt-2">
                Label: <strong>{createdCode.label}</strong>
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <p className="text-xs text-yellow-800">
                <strong>Important:</strong> Share this code with the merchant. They'll need it to sign up. Once used, the code cannot be reused.
              </p>
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

