import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Sidebar from "@/components/layout/sidebar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import Header from "@/components/layout/header";
import MerchantApplicationWizard, { type OnboardingMode } from "@/components/merchant-application/MerchantApplicationWizard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CreditCard, Plus, Trash2, Eye, Edit, FileText } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface MerchantApplication {
  id: string;
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  legalBusinessName?: string;
  dbaBusinessName?: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  lastSavedAt?: string;
}

export default function MerchantApplicationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Use state for URL parameters to make them reactive
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [isNewApplication, setIsNewApplication] = useState(false);
  const [urlStep, setUrlStep] = useState<string | null>(null);
  
  // Determine the actual onboarding mode based on user's database onboarding step
  // This is the SOURCE OF TRUTH - not URL params
  const userOnboardingStep = user?.onboardingStep;
  const isInOnboardingFlow = userOnboardingStep && userOnboardingStep !== 'COMPLETE' && user?.role !== 'ADMIN';
  
  // Map the user's onboarding step to the wizard mode
  const getOnboardingMode = (): OnboardingMode | null => {
    if (!isInOnboardingFlow) return null; // Use full wizard
    
    switch (userOnboardingStep) {
      case 'PART1':
        return 'part1';
      case 'DOCUMENTS':
        return null; // Should be on documents page, not here
      case 'PART2':
        return 'part2';
      case 'REVIEW':
        return 'review';
      default:
        return null;
    }
  };
  
  const onboardingMode = getOnboardingMode();
  
  // Update state when URL changes (only for applicationId)
  useEffect(() => {
    const updateFromUrl = () => {
      const urlParams = new URLSearchParams(window.location.search);
      setApplicationId(urlParams.get('id'));
      setIsNewApplication(urlParams.get('new') === 'true');
      setUrlStep(urlParams.get('step'));
    };
    
    // Update on mount
    updateFromUrl();
    
    // Listen for URL changes (popstate, pushstate, replacestate)
    window.addEventListener('popstate', updateFromUrl);
    
    // Custom event for when we update URL manually
    window.addEventListener('urlchange', updateFromUrl);
    
    return () => {
      window.removeEventListener('popstate', updateFromUrl);
      window.removeEventListener('urlchange', updateFromUrl);
    };
  }, []);
  
  // Fetch merchant applications for this user
  const { data: merchantApplications = [], isLoading } = useQuery<MerchantApplication[]>({
    queryKey: ["/api/merchant-applications", user?.id],
    queryFn: async () => {
      const response = await fetch("/api/merchant-applications", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!user?.id,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/merchant-applications/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Application Deleted",
        description: "The draft application has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/merchant-applications"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusIcon = (status: string | undefined) => {
    switch (status) {
      case 'DRAFT': return '📝';
      case 'SUBMITTED': return '📤';
      case 'UNDER_REVIEW': return '👀';
      case 'APPROVED': return '✅';
      case 'REJECTED': return '❌';
      default: return '📝';
    }
  };

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'DRAFT': return 'secondary';
      case 'SUBMITTED': return 'default';
      case 'UNDER_REVIEW': return 'default';
      case 'APPROVED': return 'default';
      case 'REJECTED': return 'destructive';
      default: return 'secondary';
    }
  };

  const handleViewApplication = (id: string) => {
    // Use pushState for better navigation without full page reload
    window.history.pushState({}, '', `/merchant-applications?id=${id}`);
    window.dispatchEvent(new Event('urlchange'));
  };

  const handleEditApplication = (id: string) => {
    // Use pushState for better navigation without full page reload
    window.history.pushState({}, '', `/merchant-applications?id=${id}`);
    window.dispatchEvent(new Event('urlchange'));
  };

  const handleNewApplication = async () => {
    try {
      // Reset onboarding step to PART1 when starting a new application
      // This ensures the progress bar functionality is active every time
      if (user?.onboardingStep !== 'PART1') {
        await updateOnboardingStepMutation.mutateAsync('PART1');
      }
      
      // Use pushState for better navigation without full page reload
      window.history.pushState({}, '', '/merchant-applications?new=true&step=part1');
      window.dispatchEvent(new Event('urlchange'));
    } catch (error) {
      console.error('Failed to reset onboarding step:', error);
      // Still navigate even if step update fails
      window.history.pushState({}, '', '/merchant-applications?new=true&step=part1');
      window.dispatchEvent(new Event('urlchange'));
    }
  };

  const handleBackToList = () => {
    // Use pushState for better navigation without full page reload
    window.history.pushState({}, '', '/merchant-applications');
    window.dispatchEvent(new Event('urlchange'));
  };

  // Mutation to update onboarding step
  const updateOnboardingStepMutation = useMutation({
    mutationFn: async (step: string) => {
      const response = await apiRequest("PUT", "/api/user/onboarding-step", { step });
      return response.json();
    },
    onSuccess: () => {
      // Invalidate user query to refresh onboarding state
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  // Handle onboarding step completion
  const handleOnboardingStepComplete = async (completedStep: 'PART1' | 'PART2' | 'REVIEW') => {
    try {
      // Determine the next step
      const nextStepMap: Record<string, { step: string; redirect: string }> = {
        'PART1': { step: 'DOCUMENTS', redirect: '/documents' },
        'PART2': { step: 'REVIEW', redirect: '/merchant-applications?step=review' },
        'REVIEW': { step: 'COMPLETE', redirect: '/' },
      };
      
      const next = nextStepMap[completedStep];
      if (next) {
        await updateOnboardingStepMutation.mutateAsync(next.step);
        
        toast({
          title: "Step Complete! ✓",
          description: completedStep === 'REVIEW' 
            ? "Your application has been submitted successfully!" 
            : "Great progress! Moving to the next step.",
        });
        
        // Navigate to next step
        navigate(next.redirect);
      }
    } catch (error) {
      console.error('Failed to update onboarding step:', error);
      toast({
        title: "Error",
        description: "Failed to save progress. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Group applications by status
  const applicationsByStatus = {
    draft: merchantApplications.filter(app => app.status === 'DRAFT'),
    submitted: merchantApplications.filter(app => app.status === 'SUBMITTED'),
    underReview: merchantApplications.filter(app => app.status === 'UNDER_REVIEW'),
    approved: merchantApplications.filter(app => app.status === 'APPROVED'),
    rejected: merchantApplications.filter(app => app.status === 'REJECTED'),
  };

  return (
    <div className="flex h-screen bg-gray-50">
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
          title="Merchant Applications"
          subtitle="Manage your merchant application submissions"
        />
        
        <main className="flex-1 overflow-auto p-6">
          {/* Show wizard when editing/creating or in onboarding mode */}
          {(applicationId || isNewApplication || onboardingMode) ? (
            <div className="space-y-6">
              {/* Only show back button when NOT in onboarding mode */}
              {!isInOnboardingFlow && (
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={handleBackToList}
                    className="flex items-center gap-2"
                  >
                    ← Back to Applications
                  </Button>
                </div>
              )}
              
              <MerchantApplicationWizard 
                applicationId={isNewApplication ? undefined : (applicationId || (isInOnboardingFlow ? merchantApplications[0]?.id : undefined))}
                onComplete={isInOnboardingFlow ? undefined : handleBackToList}
                onboardingMode={onboardingMode || 'full'}
                onOnboardingStepComplete={isInOnboardingFlow ? handleOnboardingStepComplete : undefined}
              />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Applications</p>
                        <p className="text-2xl font-bold text-gray-900">{merchantApplications.length}</p>
                      </div>
                      <CreditCard className="h-8 w-8 text-gray-400" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Draft Applications</p>
                        <p className="text-2xl font-bold text-yellow-600">{applicationsByStatus.draft.length}</p>
                      </div>
                      <FileText className="h-8 w-8 text-yellow-400" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Under Review</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {applicationsByStatus.submitted.length + applicationsByStatus.underReview.length}
                        </p>
                      </div>
                      <Eye className="h-8 w-8 text-blue-400" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Approved</p>
                        <p className="text-2xl font-bold text-green-600">{applicationsByStatus.approved.length}</p>
                      </div>
                      <CreditCard className="h-8 w-8 text-green-400" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* New Application Button */}
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <h3 className="text-lg font-medium mb-2">Start New Merchant Application</h3>
                    <p className="text-gray-600 mb-4">
                      Create a new merchant application to get started with payment processing
                    </p>
                    <Button
                      onClick={handleNewApplication}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      New Application
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Applications List */}
              {merchantApplications.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-blue-500" />
                      Your Merchant Applications
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                      View and manage your merchant application submissions
                    </p>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-500">Loading applications...</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {merchantApplications.map((app) => (
                          <div key={app.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg">{getStatusIcon(app.status)}</span>
                                <div className="font-medium">
                                  {app.legalBusinessName || 'Untitled Application'}
                                </div>
                                <Badge variant={getStatusColor(app.status)}>
                                  {app.status?.replace('_', ' ') || 'DRAFT'}
                                </Badge>
                              </div>
                              <div className="text-sm text-gray-500 space-y-1">
                                {app.status === 'DRAFT' && app.lastSavedAt && (
                                  <div>Last saved: {new Date(app.lastSavedAt).toLocaleString()}</div>
                                )}
                                {app.status === 'SUBMITTED' && app.submittedAt && (
                                  <div>Submitted: {new Date(app.submittedAt).toLocaleString()}</div>
                                )}
                                {app.status === 'APPROVED' && app.reviewedAt && (
                                  <div>Approved: {new Date(app.reviewedAt).toLocaleString()}</div>
                                )}
                                {app.status === 'REJECTED' && app.reviewedAt && (
                                  <div>
                                    Rejected: {new Date(app.reviewedAt).toLocaleString()}
                                    {app.rejectionReason && (
                                      <div className="text-red-600 mt-1">Reason: {app.rejectionReason}</div>
                                    )}
                                  </div>
                                )}
                                {app.dbaBusinessName && (
                                  <div>DBA: {app.dbaBusinessName}</div>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewApplication(app.id)}
                              >
                                {app.status === 'DRAFT' ? (
                                  <>
                                    <Edit className="h-4 w-4 mr-1" />
                                    Continue
                                  </>
                                ) : (
                                  <>
                                    <Eye className="h-4 w-4 mr-1" />
                                    View Details
                                  </>
                                )}
                              </Button>
                              
                              {app.status === 'DRAFT' && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Draft Application</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete this draft application? This action cannot be undone.
                                        {app.legalBusinessName && (
                                          <div className="mt-2 font-medium">
                                            Application: {app.legalBusinessName}
                                          </div>
                                        )}
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteMutation.mutate(app.id)}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                              
                              {app.status === 'APPROVED' && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      const response = await fetch(`/api/merchant-applications/${app.id}/download-pdf`, {
                                        credentials: 'include',
                                      });
                                      
                                      if (!response.ok) {
                                        const error = await response.json();
                                        throw new Error(error.message || 'Download failed');
                                      }
                                      
                                      const blob = await response.blob();
                                      const url = window.URL.createObjectURL(blob);
                                      const a = window.document.createElement('a');
                                      a.href = url;
                                      a.download = `merchant-application-${app.legalBusinessName || app.dbaBusinessName || app.id}.pdf`;
                                      window.document.body.appendChild(a);
                                      a.click();
                                      window.URL.revokeObjectURL(url);
                                      window.document.body.removeChild(a);
                                      
                                      toast({
                                        title: "Success",
                                        description: "Application PDF downloaded successfully.",
                                      });
                                    } catch (error) {
                                      toast({
                                        title: "Download Failed",
                                        description: error instanceof Error ? error.message : "Unable to download the PDF.",
                                        variant: "destructive",
                                      });
                                    }
                                  }}
                                >
                                  Download PDF
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Empty state */}
              {merchantApplications.length === 0 && !isLoading && (
                <Card>
                  <CardContent className="p-12">
                    <div className="text-center">
                      <CreditCard className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Applications Yet</h3>
                      <p className="text-gray-600 mb-6">
                        You haven't created any merchant applications yet. Get started by creating your first application.
                      </p>
                      <Button
                        onClick={handleNewApplication}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Your First Application
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
