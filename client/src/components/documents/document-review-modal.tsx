import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { DOCUMENT_TYPES } from "@/lib/constants";
import { FileText, Download } from "lucide-react";
import { format } from "date-fns";

interface DocumentReviewModalProps {
  document: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function DocumentReviewModal({ document, isOpen, onClose }: DocumentReviewModalProps) {
  const [reviewStatus, setReviewStatus] = useState("");
  const [comments, setComments] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const reviewMutation = useMutation({
    mutationFn: async (data: { status: string; rejectionReason?: string }) => {
      return apiRequest("PUT", `/api/documents/${document.id}/status`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Document review submitted successfully.",
      });
      onClose();
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmitReview = () => {
    if (!reviewStatus) {
      toast({
        title: "Missing Selection",
        description: "Please select a review decision.",
        variant: "destructive",
      });
      return;
    }

    if (reviewStatus === 'REJECTED' && !comments.trim()) {
      toast({
        title: "Missing Comments",
        description: "Please provide a reason for rejection.",
        variant: "destructive",
      });
      return;
    }

    reviewMutation.mutate({
      status: reviewStatus,
      rejectionReason: reviewStatus === 'REJECTED' ? comments : undefined,
    });
  };

  const handleDownload = async () => {
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

  const getDocumentTypeName = (type: string) => {
    return DOCUMENT_TYPES[type as keyof typeof DOCUMENT_TYPES]?.name || type;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-auto">
        <DialogHeader className="pb-4 border-b border-gray-200">
          <DialogTitle className="text-2xl font-bold text-gray-900">Document Review</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-6">
          {/* Left Column - Document Info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
              <h4 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wider">Document Information</h4>
              <dl className="space-y-4">
                {document.client && (
                  <div>
                    <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Client</dt>
                    <dd className="text-sm font-semibold text-gray-900">
                      {document.client.user.firstName} {document.client.user.lastName}
                      {document.client.user.companyName && (
                        <span className="text-gray-600 block mt-1 font-normal">{document.client.user.companyName}</span>
                      )}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Document Type</dt>
                  <dd className="text-sm font-semibold text-gray-900">{getDocumentTypeName(document.documentType)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Filename</dt>
                  <dd className="text-sm font-medium text-gray-900 break-words">{document.originalName}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Upload Date</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {format(new Date(document.uploadedAt), "MMMM d, yyyy 'at' h:mm a")}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">File Size</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {(document.fileSize / 1024 / 1024).toFixed(2)} MB
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Status</dt>
                  <dd className="text-sm">
                    {document.status === 'PENDING' && (
                      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>
                    )}
                    {document.status === 'APPROVED' && (
                      <Badge className="bg-green-100 text-green-800 border-green-200">Approved</Badge>
                    )}
                    {document.status === 'REJECTED' && (
                      <Badge className="bg-red-100 text-red-800 border-red-200">Rejected</Badge>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
          
          {/* Middle Column - Document Preview */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200 h-full flex flex-col">
              <h4 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wider">Document Preview</h4>
              <div className="flex-1 flex items-center justify-center bg-white rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-center p-6">
                  <div className="w-20 h-20 bg-[#2563EB]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-10 w-10 text-[#2563EB]" />
                  </div>
                  <p className="text-gray-700 text-sm font-medium mb-2">
                    {document.mimeType === 'application/pdf' ? 'PDF Document' : 'Image File'}
                  </p>
                  <Button
                    onClick={handleDownload}
                    className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-md mt-2"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Document
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Column - Review Actions */}
          {user?.role === 'ADMIN' && (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl p-6 border-2 border-gray-200 h-full">
                <h4 className="font-bold text-gray-900 mb-6 text-sm uppercase tracking-wider">Review Decision</h4>
                <div className="space-y-5">
                  <div>
                    <Label className="text-sm font-semibold text-gray-900 mb-3 block">
                      Select Action
                    </Label>
                    <Select value={reviewStatus} onValueChange={setReviewStatus}>
                      <SelectTrigger className="w-full h-11 border-2 border-gray-300 focus:border-[#2563EB]">
                        <SelectValue placeholder="Choose an action..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="APPROVED" className="text-green-700 font-medium">
                          ✓ Approve Document
                        </SelectItem>
                        <SelectItem value="REJECTED" className="text-red-700 font-medium">
                          ✗ Reject Document
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-semibold text-gray-900 mb-3 block">
                      Comments {reviewStatus === 'REJECTED' && <span className="text-red-600">(Required)</span>}
                    </Label>
                    <Textarea
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      className="h-32 border-2 border-gray-300 focus:border-[#2563EB] resize-none"
                      placeholder={reviewStatus === 'REJECTED' 
                        ? "Please provide a detailed reason for rejection..." 
                        : "Add approval notes or feedback (optional)..."}
                    />
                  </div>
                  
                  <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                    <Button
                      variant="outline"
                      onClick={onClose}
                      disabled={reviewMutation.isPending}
                      className="border-gray-300 hover:bg-gray-50"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmitReview}
                      disabled={reviewMutation.isPending || !reviewStatus}
                      className={`${
                        reviewStatus === 'APPROVED' 
                          ? 'bg-green-600 hover:bg-green-700' 
                          : 'bg-red-600 hover:bg-red-700'
                      } text-white shadow-md`}
                    >
                      {reviewMutation.isPending 
                        ? "Processing..." 
                        : reviewStatus === 'APPROVED' 
                          ? "✓ Approve" 
                          : "✗ Reject"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
