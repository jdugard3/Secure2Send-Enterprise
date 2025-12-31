import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, FileText, Mail, Phone, Building, MapPin, Calendar, CreditCard, CheckCircle, XCircle, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MerchantDetail {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    companyName: string | null;
    onboardingStep: string;
    createdAt: string;
  };
  client: {
    id: string;
    status: string;
    createdAt: string;
  };
  merchantApplications: Array<{
    id: string;
    status: string;
    legalBusinessName?: string;
    dbaBusinessName?: string;
    createdAt: string;
    submittedAt?: string;
  }>;
  documents: Array<{
    id: string;
    filename: string;
    originalName: string;
    documentType: string;
    status: string;
    uploadedAt: string;
  }>;
}

export default function AgentMerchantDetail() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/agent/merchants/:merchantId");
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const merchantId = params?.merchantId;

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'AGENT')) {
      toast({
        title: "Unauthorized",
        description: "Agent access required.",
        variant: "destructive",
      });
      setTimeout(() => {
        navigate("/");
      }, 500);
      return;
    }
    
    // Check if MFA setup is required
    if (user?.mfaRequired && !user?.mfaEnabled && !user?.mfaEmailEnabled) {
      navigate("/mfa-setup");
      return;
    }
  }, [isAuthenticated, isLoading, user, toast, navigate]);

  // Fetch merchant details
  const { data: merchantDetail, isLoading: detailLoading } = useQuery<MerchantDetail>({
    queryKey: ["/api/agent/merchants", merchantId],
    queryFn: async () => {
      if (!merchantId) throw new Error("Merchant ID required");
      const response = await apiRequest("GET", `/api/agent/merchants/${merchantId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch merchant details");
      }
      return response.json();
    },
    enabled: !!merchantId && isAuthenticated && user?.role === 'AGENT' && !!(user?.mfaEnabled || user?.mfaEmailEnabled),
  });

  // Check if MFA setup is required - redirect immediately
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

  if (isLoading || !isAuthenticated || user?.role !== 'AGENT') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#2563EB] border-t-transparent mx-auto mb-4"></div>
          <p className="text-sm text-gray-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      'PENDING': { variant: 'secondary', label: 'Pending' },
      'APPROVED': { variant: 'default', label: 'Approved' },
      'REJECTED': { variant: 'destructive', label: 'Rejected' },
      'INCOMPLETE': { variant: 'outline', label: 'Incomplete' },
      'DRAFT': { variant: 'secondary', label: 'Draft' },
      'SUBMITTED': { variant: 'default', label: 'Submitted' },
      'UNDER_REVIEW': { variant: 'secondary', label: 'Under Review' },
    };
    const config = statusConfig[status] || { variant: 'outline' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getOnboardingStepLabel = (step: string) => {
    const stepMap: Record<string, string> = {
      'PART1': 'Basic Information',
      'DOCUMENTS': 'Document Upload',
      'PART2': 'Application Details',
      'REVIEW': 'Review & Submit',
      'COMPLETE': 'Complete'
    };
    return stepMap[step] || step;
  };

  const getDocumentTypeLabel = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (detailLoading) {
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
          <Header title="Merchant Details" subtitle="Loading merchant information..." />
          <main className="flex-1 overflow-auto p-6 lg:p-8 bg-gray-50/50">
            <div className="max-w-7xl mx-auto">
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-4"></div>
                <p className="text-sm text-gray-500">Loading merchant details...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!merchantDetail) {
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
          <Header title="Merchant Details" subtitle="Merchant not found" />
          <main className="flex-1 overflow-auto p-6 lg:p-8 bg-gray-50/50">
            <div className="max-w-7xl mx-auto">
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-500 mb-4">Merchant not found</p>
                  <Button onClick={() => navigate("/agent")} variant="outline">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Agent Portal
                  </Button>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const { user: merchantUser, client, merchantApplications, documents } = merchantDetail;
  const latestApplication = merchantApplications.length > 0 ? merchantApplications[merchantApplications.length - 1] : null;

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
          title="Merchant Details"
          subtitle={`Viewing details for ${merchantUser.companyName || merchantUser.email}`}
        />
        
        <main className="flex-1 overflow-auto p-6 lg:p-8 bg-gray-50/50">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Back Button */}
            <Button 
              onClick={() => navigate("/agent")} 
              variant="outline"
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Agent Portal
            </Button>

            {/* Merchant Information */}
            <Card>
              <CardHeader>
                <CardTitle>Merchant Information</CardTitle>
                <CardDescription>Basic merchant account details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Company Name</label>
                      <p className="text-sm font-semibold mt-1">
                        {merchantUser.companyName || 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Contact Name</label>
                      <p className="text-sm mt-1">
                        {merchantUser.firstName} {merchantUser.lastName}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <p className="text-sm mt-1 flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        {merchantUser.email}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Client Status</label>
                      <div className="mt-1">
                        {getStatusBadge(client.status)}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Onboarding Step</label>
                      <p className="text-sm mt-1">
                        {getOnboardingStepLabel(merchantUser.onboardingStep)}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Account Created</label>
                      <p className="text-sm mt-1 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {new Date(merchantUser.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs for Applications and Documents */}
            <Tabs defaultValue="applications" className="space-y-4">
              <TabsList>
                <TabsTrigger value="applications" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Applications ({merchantApplications.length})
                </TabsTrigger>
                <TabsTrigger value="documents" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Documents ({documents.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="applications" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Merchant Applications</CardTitle>
                    <CardDescription>Application history and status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {merchantApplications.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p>No applications submitted yet</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {merchantApplications.map((app) => (
                          <div
                            key={app.id}
                            className="border border-gray-200 rounded-lg p-4 hover:border-primary transition-colors"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h3 className="font-semibold text-gray-900">
                                  {app.legalBusinessName || app.dbaBusinessName || 'Unnamed Application'}
                                </h3>
                                {app.dbaBusinessName && app.legalBusinessName && (
                                  <p className="text-sm text-gray-500">DBA: {app.dbaBusinessName}</p>
                                )}
                              </div>
                              {getStatusBadge(app.status)}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                Created: {new Date(app.createdAt).toLocaleDateString()}
                              </span>
                              {app.submittedAt && (
                                <span className="flex items-center gap-1">
                                  <CheckCircle className="h-4 w-4" />
                                  Submitted: {new Date(app.submittedAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="documents" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Uploaded Documents</CardTitle>
                    <CardDescription>Documents submitted by the merchant</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {documents.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p>No documents uploaded yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-primary transition-colors"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <FileText className="h-5 w-5 text-gray-400" />
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{doc.originalName}</p>
                                <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                                  <span>Type: {getDocumentTypeLabel(doc.documentType)}</span>
                                  <span>•</span>
                                  <span>Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {getStatusBadge(doc.status)}
                            </div>
                          </div>
                        ))}
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


