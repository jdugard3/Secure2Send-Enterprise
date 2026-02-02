import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Building2,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  Phone,
  MapPin,
  FileText,
  Download,
  Eye,
  Trash2,
  AlertCircle,
  User,
  Smartphone
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import Sidebar from "@/components/layout/sidebar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import Header from "@/components/layout/header";
import DocumentReviewModal from "@/components/documents/document-review-modal";
import { DOCUMENT_TYPES } from "@/lib/constants";

export default function AdminCompanyDetail() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/admin/company/:id");
  const companyId = params?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);

  // Fetch company details
  const { data: company, isLoading } = useQuery({
    queryKey: [`/api/admin/company/${companyId}`],
    queryFn: async () => {
      const response = await fetch(`/api/admin/company/${companyId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch company details");
      return response.json();
    },
    enabled: !!companyId,
  });

  // Fetch company documents
  const { data: documents = [] } = useQuery({
    queryKey: [`/api/admin/company/${companyId}/documents`],
    queryFn: async () => {
      const response = await fetch(`/api/documents?clientId=${companyId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch documents");
      return response.json();
    },
    enabled: !!companyId,
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/admin/users/${company.user.id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User Deleted",
        description: "The user and all associated data have been deleted.",
      });
      navigate("/admin");
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Approved</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Rejected</Badge>;
      case 'INCOMPLETE':
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Incomplete</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Unknown</Badge>;
    }
  };

  const getDocumentStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const getDocumentTypeName = (type: string) => {
    const docType = DOCUMENT_TYPES[type as keyof typeof DOCUMENT_TYPES];
    return docType?.name || type.replace(/_/g, ' ');
  };

  if (isLoading || !company) {
    return (
      <div className="flex h-screen bg-white">
        <MobileSidebar />
        <div className="hidden lg:block">
          <Sidebar 
            isCollapsed={sidebarCollapsed} 
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
          />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

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
          title={company.companyName || "Company Details"}
          subtitle="View and manage company information"
        />
        
        <main className="flex-1 overflow-auto p-6 lg:p-8 bg-gray-50/50">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Back Button */}
            <Button
              variant="ghost"
              onClick={() => navigate("/admin")}
              className="mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Companies
            </Button>

            {/* Company Header */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-gray-100 text-gray-700">
                      {company.companyName?.substring(0, 2).toUpperCase() || 
                       `${company.user.firstName?.[0] || ''}${company.user.lastName?.[0] || ''}`.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div>
                    <h1 className="text-lg font-semibold text-gray-900 mb-1">
                      {company.companyName || 'No Company Name'}
                    </h1>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(company.status)}
                      <span className="text-xs text-gray-500">
                        Joined {company.createdAt ? formatDistanceToNow(new Date(company.createdAt), { addSuffix: true }) : 'recently'}
                      </span>
                    </div>
                  </div>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete User & Company</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure? This will permanently delete:
                        <ul className="mt-2 list-disc list-inside space-y-1">
                          <li>User: {company.user.firstName} {company.user.lastName}</li>
                          <li>Company: {company.companyName}</li>
                          <li>All documents and data</li>
                        </ul>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteUserMutation.mutate()}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Delete Everything
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* User Information */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Contact Information</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-600 mb-1">Name</p>
                    <p className="font-medium text-gray-900">
                      {company.user.firstName} {company.user.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Email</p>
                    <a href={`mailto:${company.user.email}`} className="font-medium text-[#2563EB] hover:underline">
                      {company.user.email}
                    </a>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Role</p>
                    <Badge className="bg-gray-100 text-gray-800">{company.user.role || 'CLIENT'}</Badge>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">MFA Status</p>
                    <div className="flex items-center gap-2">
                      {company.user.mfaEnabled && (
                        <Badge variant="outline" className="text-xs">
                          Authenticator
                        </Badge>
                      )}
                      {company.user.mfaEmailEnabled && (
                        <Badge variant="outline" className="text-xs">
                          Email
                        </Badge>
                      )}
                      {!company.user.mfaEnabled && !company.user.mfaEmailEnabled && (
                        <Badge variant="secondary" className="text-xs">Not Set Up</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Document Summary */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Document Summary</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded p-3 text-center">
                    <div className="text-2xl font-semibold text-gray-900">{documents.length}</div>
                    <div className="text-xs text-gray-600 mt-1">Total</div>
                  </div>
                  <div className="bg-yellow-50 rounded p-3 text-center">
                    <div className="text-2xl font-semibold text-yellow-600">
                      {documents.filter((d: any) => d.status === 'PENDING').length}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Pending</div>
                  </div>
                  <div className="bg-green-50 rounded p-3 text-center">
                    <div className="text-2xl font-semibold text-green-600">
                      {documents.filter((d: any) => d.status === 'APPROVED').length}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Approved</div>
                  </div>
                  <div className="bg-red-50 rounded p-3 text-center">
                    <div className="text-2xl font-semibold text-red-600">
                      {documents.filter((d: any) => d.status === 'REJECTED').length}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Rejected</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Documents List */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Documents</h3>
              {documents.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-500">
                  <p>No documents uploaded yet</p>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
                  {documents.map((doc: any) => (
                    <div 
                      key={doc.id}
                      className="flex items-center justify-between p-3"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                          <FileText className="h-4 w-4 text-gray-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {getDocumentTypeName(doc.documentType)}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {doc.originalName}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Uploaded {formatDistanceToNow(new Date(doc.uploadedAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {getDocumentStatusBadge(doc.status)}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedDocument(doc)}
                          className="h-7"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Review
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Document Review Modal */}
      {selectedDocument && (
        <DocumentReviewModal
          document={selectedDocument}
          isOpen={!!selectedDocument}
          onClose={() => setSelectedDocument(null)}
        />
      )}
    </div>
  );
}
