import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle, Eye } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface OcrProcessingIndicatorProps {
  documentId: string;
  onReviewClick?: () => void;
  className?: string;
}

interface OcrStatus {
  status: 'processing' | 'complete' | 'not_started';
  extractedDataId?: string | null;
  confidenceScore?: number;
  userReviewed?: boolean;
  appliedToApplication?: boolean;
  extractionTimestamp?: string;
}

export default function OcrProcessingIndicator({
  documentId,
  onReviewClick,
  className = "",
}: OcrProcessingIndicatorProps) {
  const { toast } = useToast();
  const [pollingInterval, setPollingInterval] = useState<number | false>(2000); // Poll every 2 seconds

  // Poll OCR status
  const { data: ocrStatus, isLoading, error } = useQuery<OcrStatus>({
    queryKey: ["/api/documents", documentId, "ocr-status"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/documents/${documentId}/ocr-status`);
      return response.json();
    },
    enabled: !!documentId,
    refetchInterval: pollingInterval, // Poll while processing
    retry: 2,
  });

  // Stop polling once processing is complete
  useEffect(() => {
    if (ocrStatus?.status === 'complete') {
      setPollingInterval(false); // Stop polling
      toast({
        title: "OCR Processing Complete",
        description: "Data has been extracted from your document. Click 'Review Data' to view.",
      });
    }
  }, [ocrStatus?.status, toast]);

  if (isLoading && !ocrStatus) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
        <span className="text-sm text-gray-600">Checking OCR status...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <AlertCircle className="h-4 w-4 text-red-500" />
        <span className="text-sm text-red-600">Error checking OCR status</span>
      </div>
    );
  }

  if (!ocrStatus) {
    return null;
  }

  // Not started
  if (ocrStatus.status === 'not_started') {
    return null;
  }

  // Processing
  if (ocrStatus.status === 'processing') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          Processing OCR...
        </Badge>
        <span className="text-xs text-gray-500">Extracting data from document</span>
      </div>
    );
  }

  // Complete
  if (ocrStatus.status === 'complete' && ocrStatus.extractedDataId) {
    const confidenceScore = ocrStatus.confidenceScore || 0;
    const confidenceColor = 
      confidenceScore >= 0.95 ? 'green' :
      confidenceScore >= 0.80 ? 'yellow' :
      'red';

    return (
      <div className={`flex items-center gap-2 flex-wrap ${className}`}>
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        <Badge 
          variant="outline" 
          className={`${
            confidenceColor === 'green' ? 'bg-green-50 text-green-700 border-green-200' :
            confidenceColor === 'yellow' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
            'bg-red-50 text-red-700 border-red-200'
          }`}
        >
          OCR Complete
          {confidenceScore > 0 && (
            <span className="ml-1">
              ({Math.round(confidenceScore * 100)}% confidence)
            </span>
          )}
        </Badge>
        
        {ocrStatus.userReviewed && (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            Reviewed
          </Badge>
        )}
        
        {ocrStatus.appliedToApplication && (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            Applied
          </Badge>
        )}

        {onReviewClick && (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Review Data button clicked', { documentId, extractedDataId: ocrStatus.extractedDataId });
              try {
                onReviewClick();
              } catch (error) {
                console.error('Error in onReviewClick:', error);
              }
            }}
            className="h-7 text-xs"
          >
            <Eye className="h-3 w-3 mr-1" />
            {ocrStatus.userReviewed ? 'View Data' : 'Review Data'}
          </Button>
        )}
      </div>
    );
  }

  return null;
}

