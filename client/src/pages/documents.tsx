import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useLocation } from "wouter";
import Sidebar from "@/components/layout/sidebar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import Header from "@/components/layout/header";
import DocumentUpload from "@/components/documents/document-upload";
import DocumentList from "@/components/documents/document-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FileText, Upload, Clock, CheckCircle, XCircle, AlertCircle, ArrowRight } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Document {
  id: string;
  originalName: string;
  documentType: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION';
  uploadedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNotes?: string;
}

export default function DocumentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  
  // Check if we're in onboarding mode - either via URL param or user's onboarding step
  const isOnboardingMode = (() => {
    const params = new URLSearchParams(window.location.search);
    const urlParam = params.get('onboardingMode') === 'true';
    // Also check if user is on DOCUMENTS step in their onboarding journey
    const userOnDocumentsStep = user?.onboardingStep === 'DOCUMENTS';
    
    // Debug logging
    console.log('📄 Documents Page - Onboarding Check:', {
      urlParam,
      userOnboardingStep: user?.onboardingStep,
      userOnDocumentsStep,
      isOnboardingMode: urlParam || userOnDocumentsStep
    });
    
    return urlParam || userOnDocumentsStep;
  })();
  
  const { data: documents = [] } = useQuery<Document[]>({
    queryKey: ["/api/documents", user?.id],
    queryFn: async () => {
      const response = await fetch("/api/documents", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!user?.id,
  });

  // Mutation to update onboarding step
  const updateOnboardingStep = useMutation({
    mutationFn: async (step: 'PART1' | 'DOCUMENTS' | 'PART2' | 'COMPLETE') => {
      const response = await apiRequest('PUT', '/api/user/onboarding-step', { step });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Documents Saved",
        description: "Proceeding to detailed business information...",
      });
      navigate('/merchant-applications?onboardingMode=part2');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleContinueToPart2 = () => {
    updateOnboardingStep.mutate('PART2');
  };


  // Group documents by status
  const documentsByStatus = {
    pending: documents.filter(doc => doc.status === 'PENDING'),
    approved: documents.filter(doc => doc.status === 'APPROVED'),
    rejected: documents.filter(doc => doc.status === 'REJECTED'),
    needsRevision: documents.filter(doc => doc.status === 'NEEDS_REVISION'),
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-4 w-4" />;
      case 'APPROVED':
        return <CheckCircle className="h-4 w-4" />;
      case 'REJECTED':
        return <XCircle className="h-4 w-4" />;
      case 'NEEDS_REVISION':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'NEEDS_REVISION':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
          title="Document Management"
          subtitle="Upload and track your compliance documents"
        />
        
        <main className="flex-1 overflow-auto">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 p-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Documents</p>
                    <p className="text-2xl font-bold text-gray-900">{documents.length}</p>
                  </div>
                  <FileText className="h-8 w-8 text-gray-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending Review</p>
                    <p className="text-2xl font-bold text-yellow-600">{documentsByStatus.pending.length}</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Approved</p>
                    <p className="text-2xl font-bold text-green-600">{documentsByStatus.approved.length}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Need Action</p>
                    <p className="text-2xl font-bold text-red-600">
                      {documentsByStatus.rejected.length + documentsByStatus.needsRevision.length}
                    </p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-red-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Onboarding Mode: Continue Button */}
          {isOnboardingMode && (
            <div className="px-6 mb-6">
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-blue-900">
                        {documents.length > 0 
                          ? "Documents Uploaded Successfully!" 
                          : "Upload Your Required Documents"}
                      </h3>
                      <p className="text-sm text-blue-700 mt-1">
                        {documents.length > 0 
                          ? `You've uploaded ${documents.length} document${documents.length !== 1 ? 's' : ''}. You can continue to the detailed application or upload more documents.`
                          : "Please upload all required documents before proceeding to the next step."}
                      </p>
                    </div>
                    <Button 
                      onClick={handleContinueToPart2}
                      disabled={documents.length === 0 || updateOnboardingStep.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                      size="lg"
                    >
                      {updateOnboardingStep.isPending ? 'Saving...' : 'Continue to Detailed Application'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Main Content */}
          <div className="px-6 flex-1 flex flex-col">
            <Tabs defaultValue="upload" className="space-y-6 flex-1 flex flex-col">
            <TabsList>
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload Documents
              </TabsTrigger>
              <TabsTrigger value="all" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                All Documents
              </TabsTrigger>
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pending ({documentsByStatus.pending.length})
              </TabsTrigger>
              <TabsTrigger value="approved" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Approved ({documentsByStatus.approved.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="flex-1 p-0 -mx-6 -mb-6 h-full">
              <DocumentUpload />
            </TabsContent>


            <TabsContent value="all" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>All Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <DocumentList />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pending" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-yellow-500" />
                    Pending Review
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {documentsByStatus.pending.length > 0 ? (
                    <DocumentList />
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No documents pending review</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="approved" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Approved Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {documentsByStatus.approved.length > 0 ? (
                    <DocumentList />
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No approved documents yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}