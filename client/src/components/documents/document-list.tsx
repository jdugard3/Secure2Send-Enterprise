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

interface DocumentListProps {
  documents?: Document[];
}

export default function DocumentList({ documents: propDocuments }: DocumentListProps = {}) {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: fetchedDocuments = [], isLoading } = useQuery<Document[]>({
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
    enabled: !!user?.id && !propDocuments,
  });

  const documents = propDocuments || fetchedDocuments;

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
    return DOCUMENT_TYPES[type as keyof typeof DOCUMENT_TYPES]?.name || type;
  };

  if (isLoading) {
    return (
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {documents.length === 0 ? (
        <div className="text-center py-8 text-sm text-gray-500">
          <p>No documents uploaded</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
          {documents.map((document) => (
            <div key={document.id} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${
                    document.status === 'APPROVED' ? 'bg-green-100' :
                    document.status === 'PENDING' ? 'bg-yellow-100' :
                    document.status === 'REJECTED' ? 'bg-red-100' :
                    'bg-blue-100'
                  }`}>
                    <FileText className={`h-4 w-4 ${
                      document.status === 'APPROVED' ? 'text-green-600' :
                      document.status === 'PENDING' ? 'text-yellow-600' :
                      document.status === 'REJECTED' ? 'text-red-600' :
                      'text-blue-600'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{document.originalName || 'Unknown'}</p>
                    <p className="text-xs text-gray-500">
                      {getDocumentTypeName(document.documentType)}
                    </p>
                    {document.merchantApplicationId && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {merchantAppMap[document.merchantApplicationId] || 'Unknown Application'}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  {getStatusBadge(document.status || 'PENDING')}
                  <span className="text-xs text-gray-500">
                    {document.uploadedAt ? formatDistanceToNow(new Date(document.uploadedAt), { addSuffix: true }) : 'Unknown'}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedDocument(document)}
                      className="h-7 w-7 p-0"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(document)}
                      className="h-7 w-7 p-0"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(document.id)}
                      disabled={deleteMutation.isPending}
                      className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Rejection Reason */}
              {document.status === 'REJECTED' && document.rejectionReason && (
                <div className="mt-2 ml-11">
                  <div className="bg-red-50 border border-red-200 rounded p-2">
                    <p className="text-xs text-red-800">
                      <strong>Rejection Reason:</strong> {document.rejectionReason}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

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
