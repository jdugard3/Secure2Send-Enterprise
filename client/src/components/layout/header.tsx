import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface HeaderProps {
  title: string;
  subtitle: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const stopImpersonationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/stop-impersonate");
      return response.json();
    },
    onSuccess: (adminUser) => {
      queryClient.setQueryData(["/api/auth/user"], adminUser);
      toast({
        title: "Returned to Admin",
        description: "Now viewing as admin account",
      });
      // Navigate back to admin dashboard after returning from impersonation
      navigate("/admin");
    },
    onError: (error: Error) => {
      toast({
        title: "Return Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div>
      {/* Impersonation Banner */}
      {user?.isImpersonating && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Shield className="h-4 w-4 text-amber-600 mr-2" />
              <span className="text-sm font-medium text-amber-800">
                Admin View: You are viewing as {user.impersonatedUser?.firstName} {user.impersonatedUser?.lastName}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => stopImpersonationMutation.mutate()}
              disabled={stopImpersonationMutation.isPending}
              className="text-amber-700 border-amber-300 hover:bg-amber-100"
            >
              <ArrowLeft className="h-3 w-3 mr-1" />
              Return to Admin
            </Button>
          </div>
        </div>
      )}
      
      {/* Regular Header */}
      <header className="bg-white border-b border-gray-200/50 px-6 lg:px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">{title}</h2>
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="secondary" className="bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20 font-medium">
              <div className="w-2 h-2 bg-[#10B981] rounded-full mr-2"></div>
              Active
            </Badge>
          </div>
        </div>
      </header>
    </div>
  );
}
