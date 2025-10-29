import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { DOCUMENT_TYPES } from "@/lib/constants";
import DocumentReviewModal from "./document-review-modal";
import { FileText, Download, Eye, RotateCcw, Trash2, Building2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Document } from "@shared/schema";

export default function DocumentList() {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery<Document[]>({
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

  // Fetch merchant applications to display names
  const { data: merchantApplications = [] } = useQuery<any[]>({
    queryKey: ["/api/merchant-applications", user?.id],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/merchant-applications");
      return response.json();
    },
    enabled: !!user?.id,
  });

  // Create a map of merchant application IDs to names for quick lookup
  const merchantAppMap = merchantApplications.reduce((acc: Record<string, string>, app: any) => {
    acc[app.id] = app.dbaBusinessName || app.legalBusinessName || 'Unnamed Application';
    return acc;
  }, {});

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/documents/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Document deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/documents", user?.id] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDownload = async (document: Document) => {
    try {
      const response = await fetch(`/api/documents/${document.id}/download`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Download failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.originalName;
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Unable to download the document.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            Approved
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            Pending
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            {status}
          </Badge>
        );
    }
  };

  const getDocumentTypeName = (type: string) => {
    return DOCUMENT_TYPES[type as keyof typeof DOCUMENT_TYPES]?.name || type;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">Your Documents</h3>
        </div>
        
        {documents.length === 0 ? (
          <CardContent className="p-6 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No documents uploaded</h4>
            <p className="text-gray-600">Upload your first compliance document to get started.</p>
          </CardContent>
        ) : (
          <div className="divide-y divide-gray-200">
            {documents.map((document) => (
              <div key={document.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{document.originalName || 'Unknown'}</h4>
                      <p className="text-sm text-gray-500">
                        {getDocumentTypeName(document.documentType)}
                      </p>
                      {document.merchantApplicationId ? (
                        <div className="flex items-center gap-1 mt-1">
                          <Building2 className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {merchantAppMap[document.merchantApplicationId] || 'Unknown Application'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-xs text-orange-600 font-medium">
                            Not linked to application
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    {getStatusBadge(document.status || 'PENDING')}
                    <span className="text-sm text-gray-500">
                      {document.uploadedAt ? formatDistanceToNow(new Date(document.uploadedAt), { addSuffix: true }) : 'Unknown'}
                    </span>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedDocument(document)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(document)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {document.status === 'REJECTED' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {/* Handle re-upload */}}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(document.id)}
                        disabled={deleteMutation.isPending}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Rejection Reason */}
                {document.status === 'REJECTED' && document.rejectionReason && (
                  <div className="mt-3 ml-14">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm text-red-800">
                        <strong>Rejection Reason:</strong> {document.rejectionReason}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {selectedDocument && (
        <DocumentReviewModal
          document={selectedDocument}
          isOpen={!!selectedDocument}
          onClose={() => setSelectedDocument(null)}
        />
      )}
    </>
  );
}
