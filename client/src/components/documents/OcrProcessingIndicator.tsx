import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface OcrProcessingIndicatorProps {
  documentId: string;
  className?: string;
}

interface OcrStatus {
  status: 'processing' | 'complete' | 'not_started';
  extractedDataId?: string | null;
  userReviewed?: boolean;
  appliedToApplication?: boolean;
  extractionTimestamp?: string;
}

export default function OcrProcessingIndicator({
  documentId,
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
        description: "Data has been extracted and automatically applied to your application. Please review before submitting.",
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
    return (
      <div className={`flex items-center gap-2 flex-wrap ${className}`}>
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        <Badge 
          variant="outline" 
          className="bg-green-50 text-green-700 border-green-200"
        >
          OCR Complete - Data Auto-Applied
        </Badge>
        
        {ocrStatus.appliedToApplication && (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            Applied to Application
          </Badge>
        )}
      </div>
    );
  }

  return null;
}

