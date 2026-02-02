import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useApplicationContext } from "@/contexts/ApplicationContext";
import Sidebar from "@/components/layout/sidebar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  FileText, 
  Upload, 
  ClipboardList, 
  Send, 
  ArrowRight, 
  CheckCircle,
  Circle,
  Building2
} from "lucide-react";

export default function Home() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const { currentApplication, getApplicationProgress, getApplicationDisplayName } = useApplicationContext();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const authFailureCount = useRef(0);
  const lastAuthCheck = useRef(Date.now());

  const stepLabels = ['Basic Info', 'Documents', 'Review', 'Submit'];

  // Redirect admins to admin dashboard, or redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        const now = Date.now();
        if (now - lastAuthCheck.current > 10000) {
          authFailureCount.current += 1;
        }
        lastAuthCheck.current = now;

        if (authFailureCount.current >= 2) {
          toast({
            title: "Session Expired",
            description: "Your session has expired. Please log in again.",
            variant: "destructive",
          });
          setTimeout(() => {
            window.location.href = "/login";
          }, 1500);
        }
        return;
      } else {
        authFailureCount.current = 0;
      }
      
      if (user?.mfaRequired && !user?.mfaEnabled && !user?.mfaEmailEnabled) {
        navigate("/mfa-setup");
        return;
      }
      
      if (user?.role === 'ADMIN' && !user?.isImpersonating) {
        navigate("/admin");
        return;
      }
      
      if (user?.role === 'AGENT') {
        navigate("/agent");
        return;
      }
    }
  }, [isAuthenticated, isLoading, user, toast, navigate]);

  if (user?.mfaRequired && !user?.mfaEnabled && !user?.mfaEmailEnabled) {
    navigate("/mfa-setup");
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2563EB] border-t-transparent mx-auto mb-4"></div>
          <p className="text-sm text-gray-500 font-medium">Redirecting to MFA setup...</p>
        </div>
      </div>
    );
  }

  if (isLoading || !isAuthenticated || (user?.role === 'ADMIN' && !user?.isImpersonating)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2563EB] border-t-transparent mx-auto mb-4"></div>
          <p className="text-sm text-gray-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // If no current application, show empty state
  if (!currentApplication) {
    return (
      <div className="flex h-screen bg-white">
        <MobileSidebar />
        <div className="hidden lg:block">
          <Sidebar 
            isCollapsed={sidebarCollapsed} 
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
          />
        </div>
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header 
            title="Application Overview"
            subtitle="Manage your merchant applications"
            showApplicationSwitcher={false}
          />
          
          <main className="flex-1 overflow-auto p-6 lg:p-8 bg-gray-50/50">
            <div className="max-w-4xl mx-auto">
              {/* Empty State */}
              <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded bg-gray-100 mb-4">
                  <Building2 className="h-6 w-6 text-gray-600" />
                </div>
                
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Start Your Merchant Application
                </h2>
                
                <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
                  Complete your merchant application to get approved and start processing transactions.
                </p>
                
                <Button 
                  onClick={() => navigate('/merchant-applications')}
                  className="bg-[#2563EB] hover:bg-[#1D4ED8]"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Start New Application
                </Button>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const currentStep = currentApplication.currentStep || 1;
  const progressPercentage = getApplicationProgress(currentApplication);
  const applicationName = getApplicationDisplayName(currentApplication);

  const handleContinueApplication = () => {
    navigate(`/merchant-applications?applicationId=${currentApplication.id}`);
  };

  return (
    <div className="flex h-screen bg-white">
      <MobileSidebar />
      <div className="hidden lg:block">
        <Sidebar 
          isCollapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Application Overview"
          subtitle="Manage your merchant applications"
          showApplicationSwitcher={true}
        />
        
        <main className="flex-1 overflow-auto p-6 lg:p-8 bg-gray-50/50">
          <div className="max-w-7xl mx-auto space-y-4">
            {/* Progress Overview */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">{applicationName}</h2>
                  <p className="text-sm text-gray-600">
                    Step {currentStep} of 4: {stepLabels[currentStep - 1]}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-semibold text-gray-900">
                    {Math.round(progressPercentage)}%
                  </div>
                  <p className="text-xs text-gray-500">Complete</p>
                </div>
              </div>
              
              <Progress value={progressPercentage} className="h-2" />
            </div>

            {/* Current Step CTA */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                  {currentStep === 1 && <FileText className="h-5 w-5 text-gray-600" />}
                  {currentStep === 2 && <Upload className="h-5 w-5 text-gray-600" />}
                  {currentStep === 3 && <ClipboardList className="h-5 w-5 text-gray-600" />}
                  {currentStep === 4 && <Send className="h-5 w-5 text-gray-600" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                      STEP {currentStep}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-1">
                    {stepLabels[currentStep - 1]}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {currentStep === 1 && "Enter your basic business information to get started."}
                    {currentStep === 2 && "Upload all required documents for verification."}
                    {currentStep === 3 && "Review and edit all application details."}
                    {currentStep === 4 && "Submit your application for review."}
                  </p>
                </div>
                <Button 
                  onClick={handleContinueApplication}
                  className="bg-[#2563EB] hover:bg-[#1D4ED8]"
                >
                  {currentStep === 1 && "Start Application"}
                  {currentStep === 2 && "Upload Documents"}
                  {currentStep === 3 && "Review Application"}
                  {currentStep === 4 && "Submit Application"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Step Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((step) => {
                const isCompleted = step < currentStep;
                const isCurrent = step === currentStep;
                const isLocked = step > currentStep;
                
                return (
                  <div
                    key={step}
                    className={`bg-white border rounded-lg p-3 cursor-pointer ${
                      isCurrent 
                        ? 'border-[#2563EB]' 
                        : isCompleted
                        ? 'border-green-200'
                        : 'border-gray-200 opacity-60'
                    }`}
                    onClick={() => !isLocked && handleContinueApplication()}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {isCompleted ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : isCurrent ? (
                        <Circle className="h-4 w-4 text-[#2563EB] fill-[#2563EB]" />
                      ) : (
                        <Circle className="h-4 w-4 text-gray-300" />
                      )}
                      <span className={`text-xs font-medium ${
                        isCompleted ? 'text-green-700' : isCurrent ? 'text-[#2563EB]' : 'text-gray-400'
                      }`}>
                        Step {step}
                      </span>
                    </div>
                    <h4 className={`text-sm font-medium ${
                      isLocked ? 'text-gray-400' : 'text-gray-900'
                    }`}>
                      {stepLabels[step - 1]}
                    </h4>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

