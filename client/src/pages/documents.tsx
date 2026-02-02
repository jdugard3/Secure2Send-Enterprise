import { useAuth } from "@/hooks/useAuth";
import { useApplicationContext } from "@/contexts/ApplicationContext";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Sidebar from "@/components/layout/sidebar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import Header from "@/components/layout/header";
import DocumentUpload from "@/components/documents/document-upload";
import DocumentList from "@/components/documents/document-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FileText, Upload, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface Document {
  id: string;
  originalName: string;
  documentType: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION';
  uploadedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNotes?: string;
  merchantApplicationId?: string;
}

export default function DocumentsPage() {
  const { user } = useAuth();
  const { currentApplication } = useApplicationContext();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Fetch documents for the current application
  const { data: allDocuments = [] } = useQuery<Document[]>({
    queryKey: ["/api/documents", currentApplication?.id],
    queryFn: async () => {
      const response = await fetch("/api/documents", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!user?.id && !!currentApplication?.id,
  });

  // Filter documents by current application
  const documents = currentApplication 
    ? allDocuments.filter(doc => doc.merchantApplicationId === currentApplication.id)
    : [];

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

  if (!currentApplication) {
    return (
      <div className="flex h-screen bg-gray-50">
        <MobileSidebar />
        
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
            showApplicationSwitcher={true}
          />
          
          <main className="flex-1 overflow-auto p-6">
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
              <p className="text-sm text-gray-600">
                Use the application switcher above to select an application and manage its documents.
              </p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <MobileSidebar />
      
      <div className="hidden lg:block">
        <Sidebar 
          isCollapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Document Management"
          subtitle={`Manage documents for ${currentApplication.dbaBusinessName || currentApplication.legalBusinessName || 'your application'}`}
          showApplicationSwitcher={true}
        />
        
        <main className="flex-1 overflow-auto p-6">
          <div className="space-y-4">
            {/* Document Statistics */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">Total</p>
                <p className="text-xl font-semibold text-gray-900">{documents.length}</p>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">Pending</p>
                <p className="text-xl font-semibold text-yellow-600">{documentsByStatus.pending.length}</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">Approved</p>
                <p className="text-xl font-semibold text-green-600">{documentsByStatus.approved.length}</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">Needs Attention</p>
                <p className="text-xl font-semibold text-red-600">
                  {documentsByStatus.rejected.length + documentsByStatus.needsRevision.length}
                </p>
              </div>
            </div>

            {/* Upload Section */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Upload Documents</h3>
              <p className="text-xs text-gray-500 mb-3">
                Upload required documents. Supported formats: PDF, JPG, PNG
              </p>
              <DocumentUpload applicationId={currentApplication.id} />
            </div>

            {/* Documents Tabs */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">Your Documents</h3>
                <Badge className="bg-gray-100 text-gray-800">
                  {documents.length} Total
                </Badge>
              </div>
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="all">
                    All ({documents.length})
                  </TabsTrigger>
                  <TabsTrigger value="pending">
                    Pending ({documentsByStatus.pending.length})
                  </TabsTrigger>
                  <TabsTrigger value="approved">
                    Approved ({documentsByStatus.approved.length})
                  </TabsTrigger>
                  <TabsTrigger value="needs-revision">
                    Needs Revision ({documentsByStatus.needsRevision.length})
                  </TabsTrigger>
                  <TabsTrigger value="rejected">
                    Rejected ({documentsByStatus.rejected.length})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="all" className="mt-4">
                  <DocumentList documents={documents} />
                </TabsContent>
                
                <TabsContent value="pending" className="mt-4">
                  <DocumentList documents={documentsByStatus.pending} />
                </TabsContent>
                
                <TabsContent value="approved" className="mt-4">
                  <DocumentList documents={documentsByStatus.approved} />
                </TabsContent>
                
                <TabsContent value="needs-revision" className="mt-4">
                  <DocumentList documents={documentsByStatus.needsRevision} />
                </TabsContent>
                
                <TabsContent value="rejected" className="mt-4">
                  <DocumentList documents={documentsByStatus.rejected} />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

