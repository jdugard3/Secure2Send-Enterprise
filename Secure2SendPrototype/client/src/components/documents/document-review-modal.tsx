import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Document Review</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-4">Document Information</h4>
            <dl className="space-y-3">
              {document.client && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Client</dt>
                  <dd className="text-sm text-gray-900">
                    {document.client.user.firstName} {document.client.user.lastName}
                    {document.client.user.companyName && (
                      <span className="text-gray-500"> - {document.client.user.companyName}</span>
                    )}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500">Document Type</dt>
                <dd className="text-sm text-gray-900">{getDocumentTypeName(document.documentType)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Filename</dt>
                <dd className="text-sm text-gray-900">{document.originalName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Upload Date</dt>
                <dd className="text-sm text-gray-900">
                  {format(new Date(document.uploadedAt), "MMMM d, yyyy 'at' h:mm a")}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">File Size</dt>
                <dd className="text-sm text-gray-900">
                  {(document.fileSize / 1024 / 1024).toFixed(2)} MB
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Current Status</dt>
                <dd className="text-sm text-gray-900 capitalize">{document.status.toLowerCase()}</dd>
              </div>
            </dl>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-4">Document Preview</h4>
            <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
              <div className="text-center">
                <FileText className="h-16 w-16 text-primary mx-auto mb-4" />
                <p className="text-gray-600 text-sm mb-4">
                  {document.mimeType === 'application/pdf' ? 'PDF Document' : 'Image File'}
                </p>
                <Button
                  onClick={handleDownload}
                  variant="outline"
                  className="text-primary border-primary hover:bg-blue-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Full Document
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {user?.role === 'ADMIN' && (
          <div className="pt-6 border-t border-gray-200">
            <h4 className="font-medium text-gray-900 mb-4">Review Action</h4>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Review Decision
                </Label>
                <Select value={reviewStatus} onValueChange={setReviewStatus}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select action..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="APPROVED">Approve Document</SelectItem>
                    <SelectItem value="REJECTED">Reject Document</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Comments {reviewStatus === 'REJECTED' && "(Required for rejection)"}
                </Label>
                <Textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="h-24"
                  placeholder="Enter reason for rejection or approval notes..."
                />
              </div>
              
              <div className="flex items-center justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={reviewMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitReview}
                  disabled={reviewMutation.isPending}
                  className="bg-primary hover:bg-blue-700"
                >
                  {reviewMutation.isPending ? "Submitting..." : "Submit Review"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
