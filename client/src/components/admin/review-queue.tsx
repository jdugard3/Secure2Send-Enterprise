import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DOCUMENT_TYPES } from "@/lib/constants";
import DocumentReviewModal from "../documents/document-review-modal";
import { Eye, CheckCircle, XCircle, Download, FileText, Filter, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { DocumentWithClient } from "@shared/schema";

export default function ReviewQueue() {
  const [selectedDocument, setSelectedDocument] = useState<DocumentWithClient | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");

  const { data: documents = [], isLoading } = useQuery<DocumentWithClient[]>({
    queryKey: ["/api/documents"],
    queryFn: async () => {
      const response = await fetch("/api/documents", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
  });

  // Get unique clients for the filter dropdown
  const uniqueClients = documents.reduce((acc: any[], doc) => {
    const existingClient = acc.find(client => client.id === doc.client.id);
    if (!existingClient && doc.client) {
      acc.push(doc.client);
    }
    return acc;
  }, []);

  const filteredDocuments = documents.filter((doc) => {
    const statusMatch = statusFilter === "all" || doc.status === statusFilter.toUpperCase();
    const clientMatch = clientFilter === "all" || doc.client.id === clientFilter;
    return statusMatch && clientMatch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <Badge className="bg-green-100 text-green-700 border border-green-200 font-semibold px-3 py-1">
            <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
            Approved
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge className="bg-amber-100 text-amber-700 border border-amber-200 font-semibold px-3 py-1">
            <Clock className="h-3.5 w-3.5 mr-1.5" />
            Pending Review
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge className="bg-red-100 text-red-700 border border-red-200 font-semibold px-3 py-1">
            <XCircle className="h-3.5 w-3.5 mr-1.5" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getDocumentTypeName = (type: string) => {
    return DOCUMENT_TYPES[type as keyof typeof DOCUMENT_TYPES]?.name || type;
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return "U";
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  const getClientDisplayName = (client: any) => {
    if (!client?.user) return 'Unknown Client';
    const { firstName, lastName, companyName, email } = client.user;
    if (companyName) return companyName;
    if (firstName || lastName) return `${firstName || ''} ${lastName || ''}`.trim();
    return email || 'Unknown Client';
  };

  const handleDownload = async (document: any) => {
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
      console.error('Download error:', error);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
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
      <Card className="bg-white border border-gray-200 shadow-sm">
        <div className="px-8 py-6 border-b border-gray-200">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Document Review Queue</h3>
              <p className="text-sm text-gray-500 mt-1">
                {filteredDocuments.length} {filteredDocuments.length === 1 ? 'document' : 'documents'} 
                {statusFilter !== 'all' && ` (${statusFilter})`}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Filter by client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {uniqueClients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-4 w-4">
                          <AvatarFallback className="text-xs">
                            {getInitials(client.user?.firstName, client.user?.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        {getClientDisplayName(client)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Documents</SelectItem>
                  <SelectItem value="pending">Pending Only</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>

        {filteredDocuments.length === 0 ? (
          <CardContent className="p-8 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <FileText className="h-6 w-6 text-gray-400" />
            </div>
            <h4 className="text-base font-semibold text-gray-900 mb-2">No documents found</h4>
            <p className="text-sm text-gray-500">
              {statusFilter === "all" ? 
                "No documents have been uploaded yet." : 
                `No ${statusFilter} documents found.`
              }
            </p>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="px-8 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-8 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Document
                  </th>
                  <th className="px-8 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-8 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Uploaded
                  </th>
                  <th className="px-8 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-8 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredDocuments.map((document: any) => (
                  <tr key={document.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center">
                        <Avatar className="h-10 w-10 mr-4 ring-2 ring-gray-100 group-hover:ring-blue-100 transition-all">
                          <AvatarImage src={document.client?.user?.profileImageUrl} />
                          <AvatarFallback className="bg-[#2563EB]/10 text-[#2563EB] font-semibold">
                            {getInitials(document.client?.user?.firstName, document.client?.user?.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {document.client?.user?.firstName} {document.client?.user?.lastName}
                          </div>
                          {document.client?.user?.companyName && (
                            <div className="text-xs text-gray-500 mt-0.5">
                              {document.client.user.companyName}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors mr-3">
                          <FileText className="h-5 w-5 text-[#2563EB]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-medium text-gray-900 truncate block max-w-md">
                            {document.originalName}
                          </span>
                          <span className="text-xs text-gray-500">
                            {(document.fileSize / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {getDocumentTypeName(document.documentType)}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-sm text-gray-600 font-medium">
                      {formatDistanceToNow(new Date(document.uploadedAt), { addSuffix: true })}
                    </td>
                    <td className="px-8 py-5">
                      {getStatusBadge(document.status)}
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedDocument(document)}
                          className="text-gray-600 hover:text-[#2563EB] hover:bg-blue-50 transition-colors"
                          title="Review document"
                        >
                          <Eye className="h-4 w-4 mr-1.5" />
                          Review
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(document)}
                          className="text-gray-600 hover:text-[#2563EB] hover:bg-blue-50 transition-colors"
                          title="Download document"
                        >
                          <Download className="h-4 w-4 mr-1.5" />
                          Download
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
