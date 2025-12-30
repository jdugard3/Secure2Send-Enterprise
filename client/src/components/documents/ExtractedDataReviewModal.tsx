import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle,
  Lock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface ExtractedDataReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  merchantApplicationId: string;
  extractedDataId?: string;
  documentId?: string;
}

interface ExtractedDataItem {
  id: string;
  documentId: string;
  data: Record<string, any>;
  userReviewed: boolean;
  reviewedAt?: string;
  appliedToApplication: boolean;
  appliedAt?: string;
  extractionTimestamp?: string;
  hasSensitiveFields: boolean;
}

export default function ExtractedDataReviewModal({
  isOpen,
  onClose,
  merchantApplicationId,
  extractedDataId,
  documentId,
}: ExtractedDataReviewModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showSensitiveFields, setShowSensitiveFields] = useState(false);

  // Fetch extracted data
  const { data: extractedDataResponse, isLoading, error, refetch } = useQuery<{
    success: boolean;
    extractedData: ExtractedDataItem[];
    count: number;
  }>({
    queryKey: ["/api/merchant-applications", merchantApplicationId, "extracted-data", showSensitiveFields],
    queryFn: async () => {
      const url = `/api/merchant-applications/${merchantApplicationId}/extracted-data${showSensitiveFields ? '?includeSensitive=true' : ''}`;
      const response = await apiRequest("GET", url);
      return response.json();
    },
    enabled: isOpen && !!merchantApplicationId,
    retry: 2,
  });

  // Find the specific extracted data item
  const extractedData = extractedDataResponse?.extractedData?.find(
    (item) => 
      (extractedDataId && item.id === extractedDataId) ||
      (documentId && item.documentId === documentId)
  ) || extractedDataResponse?.extractedData?.[0];



  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Extracted Data</DialogTitle>
            <DialogDescription>Loading extracted data...</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !extractedData) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Extracted Data</DialogTitle>
            <DialogDescription>Error loading extracted data</DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error instanceof Error ? error.message : 'Failed to load extracted data'}
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button onClick={() => refetch()}>Retry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Review Extracted Data
            {extractedData.appliedToApplication && (
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Applied
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            View the extracted data that has been automatically applied to your merchant application. Please review it in your application form before submitting.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">

            {/* Sensitive Fields Toggle */}
            {extractedData.hasSensitiveFields && (
              <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    Sensitive Fields {showSensitiveFields ? 'Visible' : 'Hidden'}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowSensitiveFields(!showSensitiveFields)}
                  className="bg-white"
                >
                  {showSensitiveFields ? (
                    <>
                      <EyeOff className="h-3 w-3 mr-1" />
                      Hide Sensitive
                    </>
                  ) : (
                    <>
                      <Eye className="h-3 w-3 mr-1" />
                      Show Sensitive
                    </>
                  )}
                </Button>
              </div>
            )}

            <Separator />

            {/* Read-Only Fields */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Extracted Fields (Read-Only)</h3>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This data has been automatically applied to your application. Please review and verify it in your application form before submitting.
                </AlertDescription>
              </Alert>
              {Object.entries(extractedData.data || {}).map(([key, value]) => {
                // Skip confidence field (it's metadata, not data)
                if (key === 'confidence') return null;

                const displayKey = key
                  .replace(/([A-Z])/g, ' $1')
                  .replace(/^./, str => str.toUpperCase())
                  .trim();
                
                const isEmpty = value === null || value === undefined || value === '';

                return (
                  <div key={key} className="space-y-2 p-3 border rounded-lg bg-gray-50">
                    <Label htmlFor={key} className="text-sm font-medium">
                      {displayKey}
                    </Label>
                    <div className="text-sm text-gray-900 p-2 bg-white border rounded">
                      {isEmpty ? (
                        <span className="text-gray-400 italic">No data extracted</span>
                      ) : (
                        String(value)
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {Object.keys(extractedData.data || {}).filter(k => k !== 'confidence').length === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No data was extracted from this document.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

