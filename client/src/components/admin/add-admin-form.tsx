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
import { Loader2, Eye, EyeOff, Shield } from "lucide-react";

interface AddAdminFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CreateAdminData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export default function AddAdminForm({ open, onOpenChange }: AddAdminFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState<CreateAdminData>({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
  });

  const createAdminMutation = useMutation({
    mutationFn: async (data: CreateAdminData) => {
      const response = await apiRequest("POST", "/api/admin/create-admin", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Admin Created Successfully",
        description: `${data.user.firstName} ${data.user.lastName} has been registered as an administrator.`,
      });
      
      // Clear form
      setFormData({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
      });
      
      // Refresh the users list
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      
      // Close dialog
      onOpenChange(false);
    },
    onError: (error: Error) => {
      console.error("Create admin error:", error);
      toast({
        title: "Failed to Create Admin",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.email || !formData.password || !formData.firstName || !formData.lastName) {
      toast({
        title: "Validation Error",
        description: "All fields are required.",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 8) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 8 characters long for admin accounts.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.email.includes("@")) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    createAdminMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof CreateAdminData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <DialogTitle>Add New Administrator</DialogTitle>
          </div>
          <DialogDescription>
            Create a new administrator account with full system access. Admins will be required to set up MFA on first login.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                type="text"
                value={formData.firstName}
                onChange={(e) => handleInputChange("firstName", e.target.value)}
                placeholder="John"
                disabled={createAdminMutation.isPending}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                type="text"
                value={formData.lastName}
                onChange={(e) => handleInputChange("lastName", e.target.value)}
                placeholder="Doe"
                disabled={createAdminMutation.isPending}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="admin@secure2send.com"
              disabled={createAdminMutation.isPending}
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={generatePassword}
                disabled={createAdminMutation.isPending}
                className="h-auto p-0 text-xs text-primary hover:text-primary/80"
              >
                Generate Secure Password
              </Button>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                placeholder="Enter secure password"
                disabled={createAdminMutation.isPending}
                required
                minLength={8}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPassword(!showPassword)}
                disabled={createAdminMutation.isPending}
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Password must be at least 8 characters long (recommended for admin accounts)
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
            <p className="text-xs text-amber-800">
              <strong>Security Note:</strong> The new admin will be required to set up multi-factor authentication (MFA) on their first login for enhanced security.
            </p>
          </div>

          <DialogFooter className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createAdminMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createAdminMutation.isPending}
            >
              {createAdminMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              <Shield className="h-4 w-4 mr-2" />
              Create Admin
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

