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
import { Loader2, Eye, EyeOff, UserCheck } from "lucide-react";

interface AddAgentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CreateAgentData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export default function AddAgentForm({ open, onOpenChange }: AddAgentFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState<CreateAgentData>({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
  });

  const createAgentMutation = useMutation({
    mutationFn: async (data: CreateAgentData) => {
      const response = await apiRequest("POST", "/api/admin/create-agent", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Agent Created Successfully",
        description: `${data.user.firstName} ${data.user.lastName} has been registered as an agent.`,
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
      console.error("Create agent error:", error);
      toast({
        title: "Failed to Create Agent",
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
        description: "Password must be at least 8 characters long for agent accounts.",
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

    createAgentMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof CreateAgentData, value: string) => {
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
            <UserCheck className="h-5 w-5 text-primary" />
            <DialogTitle>Add New Agent</DialogTitle>
          </div>
          <DialogDescription>
            Create a new agent account for merchant onboarding assistance. Agents will be required to set up MFA on first login.
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
                disabled={createAgentMutation.isPending}
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
                disabled={createAgentMutation.isPending}
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
              placeholder="agent@secure2send.com"
              disabled={createAgentMutation.isPending}
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
                disabled={createAgentMutation.isPending}
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
                disabled={createAgentMutation.isPending}
                required
                minLength={8}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPassword(!showPassword)}
                disabled={createAgentMutation.isPending}
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
              Password must be at least 8 characters long (recommended for agent accounts)
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-xs text-blue-800">
              <strong>Note:</strong> The new agent will be required to set up multi-factor authentication (MFA) on their first login. Agents can assist merchants with onboarding through the Agent Portal.
            </p>
          </div>

          <DialogFooter className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createAgentMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createAgentMutation.isPending}
            >
              {createAgentMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              <UserCheck className="h-4 w-4 mr-2" />
              Create Agent
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

