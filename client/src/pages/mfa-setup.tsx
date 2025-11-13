import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, AlertTriangle } from "lucide-react";
import { MfaSetup } from "@/components/MfaSetup";
import { BackupCodes } from "@/components/BackupCodes";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function MfaSetupPage() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const { toast } = useToast();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  // If user already has MFA enabled (either type), redirect to dashboard
  if (user.mfaEnabled || user.mfaEmailEnabled) {
    navigate("/");
    return null;
  }

  const handleSetupComplete = (codes?: string[]) => {
    // If backup codes were provided (TOTP), show them
    // If no codes (Email MFA), redirect directly
    if (codes && codes.length > 0) {
      setBackupCodes(codes);
      setShowBackupCodes(true);
    } else {
      // Email MFA - no backup codes, redirect immediately
      handleBackupCodesClose();
    }
  };

  const handleBackupCodesClose = async () => {
    // Refresh user data to get updated MFA status
    await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    
    toast({
      title: "MFA Setup Complete!",
      description: "Your account is now secured with multi-factor authentication.",
    });
    
    navigate("/");
  };

  const handleCancel = () => {
    // For forced MFA setup, we don't allow cancellation
    // Users must complete the setup to access the application
    toast({
      title: "Setup Required",
      description: "Multi-factor authentication must be configured to access your account.",
      variant: "destructive",
    });
  };

  if (showBackupCodes) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          {/* Logo and Header */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Shield className="h-12 w-12 text-primary mr-3" />
              <h1 className="text-3xl font-bold text-gray-900">Secure2Send</h1>
            </div>
            <p className="text-gray-600">
              Professional Document Management
            </p>
          </div>

          <BackupCodes
            codes={backupCodes}
            onClose={handleBackupCodesClose}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-8">
        {/* Logo and Header */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-12 w-12 text-primary mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">Secure2Send</h1>
          </div>
          <p className="text-gray-600">
            Professional Document Management
          </p>
        </div>

        {/* Required Setup Notice */}
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Security Setup Required:</strong> To protect your sensitive business information, 
            multi-factor authentication must be configured before accessing your account.
          </AlertDescription>
        </Alert>

        <MfaSetup
          onSetupComplete={handleSetupComplete}
          onCancel={handleCancel}
          isRequired={true}
        />

        {/* Additional Info */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Need help? Contact support at{" "}
            <a href="mailto:support@secure2send.com" className="text-primary hover:underline">
              support@secure2send.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
