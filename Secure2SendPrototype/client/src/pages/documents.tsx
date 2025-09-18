import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import Sidebar from "@/components/layout/sidebar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import Header from "@/components/layout/header";
import DocumentUpload from "@/components/documents/document-upload";
import DocumentList from "@/components/documents/document-list";
import DocumentDebug from "@/components/debug/DocumentDebug";
import MerchantApplicationWizard from "@/components/merchant-application/MerchantApplicationWizard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FileText, Upload, Clock, CheckCircle, XCircle, AlertCircle, CreditCard, Plus } from "lucide-react";

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
  
  // Get URL parameters to check for existing application ID
  const urlParams = new URLSearchParams(window.location.search);
  const applicationId = urlParams.get('id');
  const isNewApplication = urlParams.get('new') === 'true';
  
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

  // Fetch merchant applications for this user
  const { data: merchantApplications = [] } = useQuery({
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

          {/* Main Content */}
          <div className="px-6 flex-1 flex flex-col">
            <Tabs defaultValue="upload" className="space-y-6 flex-1 flex flex-col">
            <TabsList>
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload Documents
              </TabsTrigger>
              <TabsTrigger value="merchant-application" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Merchant Application
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
              <TabsTrigger value="debug" className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Debug
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="flex-1 p-0 -mx-6 -mb-6 h-full">
              <DocumentUpload />
            </TabsContent>

            <TabsContent value="merchant-application" className="flex-1 p-0 -mx-6 -mb-6 h-full">
              <div className="p-6">
                {/* Show existing applications if any */}
                {!applicationId && merchantApplications.length > 0 && (
                  <Card className="mb-6">
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
                      <div className="space-y-3">
                        {merchantApplications.map((app: any) => {
                          const getStatusColor = (status: string) => {
                            switch (status) {
                              case 'DRAFT': return 'secondary';
                              case 'SUBMITTED': return 'default';
                              case 'UNDER_REVIEW': return 'default';
                              case 'APPROVED': return 'default';
                              case 'REJECTED': return 'destructive';
                              default: return 'secondary';
                            }
                          };

                          const getStatusIcon = (status: string) => {
                            switch (status) {
                              case 'DRAFT': return '📝';
                              case 'SUBMITTED': return '📤';
                              case 'UNDER_REVIEW': return '👀';
                              case 'APPROVED': return '✅';
                              case 'REJECTED': return '❌';
                              default: return '📝';
                            }
                          };

                          return (
                            <div key={app.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-lg">{getStatusIcon(app.status)}</span>
                                  <div className="font-medium">
                                    {app.legalBusinessName || 'Untitled Application'}
                                  </div>
                                  <Badge variant={getStatusColor(app.status)}>
                                    {app.status.replace('_', ' ')}
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
                                  onClick={() => {
                                    window.location.href = `/documents?tab=merchant-application&id=${app.id}`;
                                  }}
                                >
                                  {app.status === 'DRAFT' ? 'Continue' : 'View Details'}
                                </Button>
                                {app.status === 'APPROVED' && (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => {
                                      // TODO: Add PDF download functionality
                                      toast({
                                        title: "PDF Download",
                                        description: "PDF download feature coming soon!",
                                      });
                                    }}
                                  >
                                    Download PDF
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {/* New Application Button */}
                {!applicationId && !isNewApplication && (
                  <Card className="mb-6">
                    <CardContent className="p-6">
                      <div className="text-center">
                        <h3 className="text-lg font-medium mb-2">Start New Merchant Application</h3>
                        <p className="text-gray-600 mb-4">
                          Create a new merchant application to get started with payment processing
                        </p>
                        <Button
                          onClick={() => {
                            window.location.href = '/documents?tab=merchant-application&new=true';
                          }}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          New Application
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {/* Show the wizard when editing/creating */}
                {(applicationId || isNewApplication) && (
                  <MerchantApplicationWizard 
                    applicationId={applicationId || undefined}
                    onComplete={() => {
                      // Refresh the merchant applications list and go back to the list view
                      window.location.href = '/documents?tab=merchant-application';
                    }}
                  />
                )}
              </div>
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

            <TabsContent value="debug" className="space-y-6">
              <DocumentDebug />
            </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}