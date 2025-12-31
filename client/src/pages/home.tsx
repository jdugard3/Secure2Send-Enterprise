import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import Header from "@/components/layout/header";
import ProgressCards from "@/components/dashboard/progress-cards";
import DocumentUpload from "@/components/documents/document-upload";
import DocumentList from "@/components/documents/document-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Upload, 
  ClipboardList, 
  Send, 
  ArrowRight, 
  CheckCircle,
  Circle
} from "lucide-react";

export default function Home() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const authFailureCount = useRef(0);
  const lastAuthCheck = useRef(Date.now());

  // Redirect admins to admin dashboard, or redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        const now = Date.now();
        // Only count as a failure if it's been more than 10 seconds since last check
        // This prevents counting initial loads or rapid re-renders as failures
        if (now - lastAuthCheck.current > 10000) {
          authFailureCount.current += 1;
        }
        lastAuthCheck.current = now;

        // Only redirect after multiple consecutive failures to avoid kicking users out on temporary issues
        if (authFailureCount.current >= 2) {
          toast({
            title: "Session Expired",
            description: "Your session has expired. Please log in again.",
            variant: "destructive",
          });
          setTimeout(() => {
            window.location.href = "/login";
          }, 1500); // Longer delay to allow user to see the message
        }
        return;
      } else {
        // Reset failure count on successful auth
        authFailureCount.current = 0;
      }
      
      // Check if MFA setup is required first (before any role-based redirects)
      if (user?.mfaRequired && !user?.mfaEnabled && !user?.mfaEmailEnabled) {
        navigate("/mfa-setup");
        return;
      }
      
      // Redirect admins to the admin dashboard (unless they're impersonating)
      if (user?.role === 'ADMIN' && !user?.isImpersonating) {
        navigate("/admin");
        return;
      }
      
      // Redirect agents to the agent portal (only if MFA is set up)
      if (user?.role === 'AGENT') {
        navigate("/agent");
        return;
      }
    }
  }, [isAuthenticated, isLoading, user, toast, navigate]);

  // Check if MFA setup is required - redirect immediately without rendering
  if (user?.mfaRequired && !user?.mfaEnabled && !user?.mfaEmailEnabled) {
    navigate("/mfa-setup");
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#2563EB] border-t-transparent mx-auto mb-4"></div>
          <p className="text-sm text-gray-500 font-medium">Redirecting to MFA setup...</p>
        </div>
      </div>
    );
  }

  if (isLoading || !isAuthenticated || (user?.role === 'ADMIN' && !user?.isImpersonating)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#2563EB] border-t-transparent mx-auto mb-4"></div>
          <p className="text-sm text-gray-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if user is in onboarding mode (not COMPLETE)
  const isOnboarding = user?.onboardingStep && user.onboardingStep !== 'COMPLETE';
  const currentOnboardingStep = user?.onboardingStep || 'PART1';

  // Onboarding step configuration
  const onboardingSteps = [
    {
      id: 'PART1',
      title: 'Basic Business Information',
      description: 'Enter your business name, address, and corporate details to get started.',
      icon: FileText,
      href: '/merchant-applications?step=part1',
      buttonText: 'Start Application',
      color: 'blue',
    },
    {
      id: 'DOCUMENTS',
      title: 'Upload Required Documents',
      description: 'Upload your business documents for verification. Required documents include EIN letter, driver\'s license, and bank statements.',
      icon: Upload,
      href: '/documents',
      buttonText: 'Upload Documents',
      color: 'purple',
    },
    {
      id: 'PART2',
      title: 'Complete Application Details',
      description: 'Add your banking information, transaction details, and owner information to complete your application.',
      icon: ClipboardList,
      href: '/merchant-applications?step=part2',
      buttonText: 'Continue Application',
      color: 'indigo',
    },
    {
      id: 'REVIEW',
      title: 'Review & Submit',
      description: 'Review your complete application and submit for approval. Make sure all information is accurate.',
      icon: Send,
      href: '/merchant-applications?step=review',
      buttonText: 'Review & Submit',
      color: 'green',
    },
  ];

  const STEP_ORDER = ['PART1', 'DOCUMENTS', 'PART2', 'REVIEW', 'COMPLETE'];
  const currentStepIndex = STEP_ORDER.indexOf(currentOnboardingStep);
  const currentStepConfig = onboardingSteps.find(s => s.id === currentOnboardingStep);

  return (
    <div className="flex h-screen bg-white">
      {/* Mobile Sidebar */}
      <MobileSidebar />
      
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar 
          isCollapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title={isOnboarding ? "Welcome to Secure2Send" : "Dashboard"}
          subtitle={isOnboarding ? "Complete your merchant application" : "Manage your compliance documents"}
        />
        
        <main className="flex-1 overflow-auto p-6 lg:p-8 bg-gray-50/50">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Onboarding Mode: Show guided experience */}
            {isOnboarding && currentStepConfig ? (
              <>
                {/* Progress Overview */}
                <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white border-0">
                  <CardContent className="p-8">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-2xl font-bold mb-1">
                          Hello, {user?.firstName || 'there'}! 👋
                        </h2>
                        <p className="text-slate-300">
                          You're on step {currentStepIndex + 1} of 4. Let's complete your merchant application.
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-4xl font-bold text-white">
                          {Math.round((currentStepIndex / 4) * 100)}%
                        </div>
                        <p className="text-slate-400 text-sm">Complete</p>
                      </div>
                    </div>
                    
                    {/* Progress Steps */}
                    <div className="flex items-center gap-2 mt-4">
                      {onboardingSteps.map((step, index) => {
                        const isCompleted = index < currentStepIndex;
                        const isCurrent = step.id === currentOnboardingStep;
                        
                        return (
                          <div key={step.id} className="flex items-center flex-1">
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
                <Card className={`border-2 border-${currentStepConfig.color}-200 bg-gradient-to-br from-${currentStepConfig.color}-50 to-white shadow-lg`}>
                  <CardContent className="p-8">
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                      <div className={`w-16 h-16 rounded-2xl bg-${currentStepConfig.color}-100 flex items-center justify-center flex-shrink-0`}>
                        <currentStepConfig.icon className={`h-8 w-8 text-${currentStepConfig.color}-600`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-${currentStepConfig.color}-100 text-${currentStepConfig.color}-700`}>
                            STEP {currentStepIndex + 1}
                          </span>
                          <span className="text-xs text-gray-500">Current Task</span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          {currentStepConfig.title}
                        </h3>
                        <p className="text-gray-600">
                          {currentStepConfig.description}
                        </p>
                      </div>
                      <Button 
                        size="lg" 
                        onClick={() => navigate(currentStepConfig.href)}
                        className={`bg-${currentStepConfig.color}-600 hover:bg-${currentStepConfig.color}-700 text-white shadow-lg px-8`}
                      >
                        {currentStepConfig.buttonText}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Step Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {onboardingSteps.map((step, index) => {
                    const isCompleted = index < currentStepIndex;
                    const isCurrent = step.id === currentOnboardingStep;
                    const isLocked = index > currentStepIndex;
                    const Icon = step.icon;
                    
                    return (
                      <Card 
                        key={step.id}
                        className={`cursor-pointer transition-all ${
                          isCompleted 
                            ? 'bg-green-50 border-green-200 hover:shadow-md' 
                            : isCurrent 
                            ? 'ring-2 ring-blue-400 shadow-md' 
                            : 'bg-gray-50 opacity-60'
                        }`}
                        onClick={() => !isLocked && navigate(step.href)}
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
                              Step {index + 1}
                            </span>
                          </div>
                          <h4 className={`font-medium text-sm ${
                            isLocked ? 'text-gray-400' : 'text-gray-900'
                          }`}>
                            {step.title}
                          </h4>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </>
            ) : (
              // Completed onboarding: Show normal dashboard
              <>
                <ProgressCards />
                <div>
                  <DocumentUpload />
                </div>
                <DocumentList />
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
