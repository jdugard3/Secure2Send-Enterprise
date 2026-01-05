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
            showApplicationSwitcher={true}
          />
          
          <main className="flex-1 overflow-auto p-6 lg:p-8 bg-gray-50/50">
            <div className="max-w-7xl mx-auto">
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <CardContent className="p-12 text-center">
                  <Building2 className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Start Your Merchant Application
                  </h2>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Get started with your merchant application. Use the application switcher above to create a new application.
                  </p>
                </CardContent>
              </Card>
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
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Progress Overview */}
            <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white border-0">
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">{applicationName}</h2>
                    <p className="text-slate-300">
                      Step {currentStep} of 4: {stepLabels[currentStep - 1]}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold text-white">
                      {Math.round(progressPercentage)}%
                    </div>
                    <p className="text-slate-400 text-sm">Complete</p>
                  </div>
                </div>
                
                <Progress value={progressPercentage} className="h-2 mb-4" />
                
                <div className="flex items-center gap-2 mt-4">
                  {[1, 2, 3, 4].map((step) => {
                    const isCompleted = step < currentStep;
                    const isCurrent = step === currentStep;
                    
                    return (
                      <div key={step} className="flex items-center flex-1">
                        <div
                          className={`w-full h-2 rounded-full ${
                            isCompleted 
                              ? 'bg-green-400' 
                              : isCurrent 
                              ? 'bg-blue-400' 
                              : 'bg-slate-600'
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Current Step CTA */}
            <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white shadow-lg">
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                    {currentStep === 1 && <FileText className="h-8 w-8 text-blue-600" />}
                    {currentStep === 2 && <Upload className="h-8 w-8 text-blue-600" />}
                    {currentStep === 3 && <ClipboardList className="h-8 w-8 text-blue-600" />}
                    {currentStep === 4 && <Send className="h-8 w-8 text-blue-600" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        STEP {currentStep}
                      </span>
                      <span className="text-xs text-gray-500">Current Task</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {stepLabels[currentStep - 1]}
                    </h3>
                    <p className="text-gray-600">
                      {currentStep === 1 && "Enter your basic business information to get started."}
                      {currentStep === 2 && "Upload all required documents for verification."}
                      {currentStep === 3 && "Review and edit all application details."}
                      {currentStep === 4 && "Submit your application for review."}
                    </p>
                  </div>
                  <Button 
                    size="lg" 
                    onClick={handleContinueApplication}
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg px-8"
                  >
                    {currentStep === 1 && "Start Application"}
                    {currentStep === 2 && "Upload Documents"}
                    {currentStep === 3 && "Review Application"}
                    {currentStep === 4 && "Submit Application"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Step Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((step) => {
                const isCompleted = step < currentStep;
                const isCurrent = step === currentStep;
                const isLocked = step > currentStep;
                
                return (
                  <Card 
                    key={step}
                    className={`cursor-pointer transition-all ${
                      isCompleted 
                        ? 'bg-green-50 border-green-200 hover:shadow-md' 
                        : isCurrent 
                        ? 'ring-2 ring-blue-400 shadow-md' 
                        : 'bg-gray-50 opacity-60'
                    }`}
                    onClick={() => !isLocked && handleContinueApplication()}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-2">
                        {isCompleted ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : isCurrent ? (
                          <Circle className="h-5 w-5 text-blue-600 fill-blue-600" />
                        ) : (
                          <Circle className="h-5 w-5 text-gray-300" />
                        )}
                        <span className={`text-xs font-medium ${
                          isCompleted ? 'text-green-700' : isCurrent ? 'text-blue-700' : 'text-gray-400'
                        }`}>
                          Step {step}
                        </span>
                      </div>
                      <h4 className={`font-medium text-sm ${
                        isLocked ? 'text-gray-400' : 'text-gray-900'
                      }`}>
                        {stepLabels[step - 1]}
                      </h4>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

