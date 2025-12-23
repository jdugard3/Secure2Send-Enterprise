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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Loader2, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  Lock,
  Save
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
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
  confidenceScore?: number;
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
  const [editedData, setEditedData] = useState<Record<string, any>>({});
  const [confirmedFields, setConfirmedFields] = useState<Set<string>>(new Set());
  const [isApplying, setIsApplying] = useState(false);

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

  // Initialize edited data when extracted data loads
  useEffect(() => {
    if (extractedData?.data) {
      setEditedData(extractedData.data);
      // Pre-confirm high-confidence fields (>95%)
      const highConfidenceFields = new Set<string>();
      if (extractedData.confidenceScore && extractedData.confidenceScore >= 0.95) {
        Object.keys(extractedData.data).forEach(key => {
          if (extractedData.data[key] !== null && extractedData.data[key] !== undefined && extractedData.data[key] !== '') {
            highConfidenceFields.add(key);
          }
        });
      }
      setConfirmedFields(highConfidenceFields);
    }
  }, [extractedData]);

  // Apply extracted data mutation
  const applyMutation = useMutation({
    mutationFn: async (data: { extractedDataId: string; reviewedFields: Record<string, any> }) => {
      const response = await apiRequest(
        "POST",
        `/api/merchant-applications/${merchantApplicationId}/apply-extracted-data`,
        data
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Data Applied Successfully",
        description: "Extracted data has been applied to your merchant application.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/merchant-applications", merchantApplicationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/merchant-applications", merchantApplicationId, "extracted-data"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Apply Data",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFieldChange = (field: string, value: any) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleToggleConfirm = (field: string) => {
    setConfirmedFields(prev => {
      const newSet = new Set(prev);
      if (newSet.has(field)) {
        newSet.delete(field);
      } else {
        newSet.add(field);
      }
      return newSet;
    });
  };

  const handleApply = () => {
    if (!extractedData) return;

    // Only include confirmed fields
    const reviewedFields: Record<string, any> = {};
    confirmedFields.forEach(field => {
      if (editedData[field] !== undefined && editedData[field] !== null) {
        reviewedFields[field] = editedData[field];
      }
    });

    if (Object.keys(reviewedFields).length === 0) {
      toast({
        title: "No Fields Selected",
        description: "Please confirm at least one field before applying.",
        variant: "destructive",
      });
      return;
    }

    setIsApplying(true);
    applyMutation.mutate({
      extractedDataId: extractedData.id,
      reviewedFields,
    });
  };

  const confidenceScore = extractedData?.confidenceScore || 0;
  const confidenceColor = 
    confidenceScore >= 0.95 ? 'green' :
    confidenceScore >= 0.80 ? 'yellow' :
    'red';

  const isLowConfidence = confidenceScore < 0.80;

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
            Review and confirm the extracted data before applying it to your merchant application.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {/* Confidence Score Alert */}
            {isLowConfidence && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Low Confidence Score ({Math.round(confidenceScore * 100)}%)</strong>
                  <br />
                  Please carefully review all fields. Some data may be inaccurate.
                </AlertDescription>
              </Alert>
            )}

            {/* Confidence Badge */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Confidence Score:</span>
              <Badge 
                variant="outline"
                className={`${
                  confidenceColor === 'green' ? 'bg-green-50 text-green-700 border-green-200' :
                  confidenceColor === 'yellow' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                  'bg-red-50 text-red-700 border-red-200'
                }`}
              >
                {Math.round(confidenceScore * 100)}%
              </Badge>
            </div>

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

            {/* Editable Fields */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Extracted Fields</h3>
              {Object.entries(extractedData.data || {}).map(([key, value]) => {
                // Skip confidence field (it's metadata, not data)
                if (key === 'confidence') return null;

                const displayKey = key
                  .replace(/([A-Z])/g, ' $1')
                  .replace(/^./, str => str.toUpperCase())
                  .trim();
                
                const isConfirmed = confirmedFields.has(key);
                const isEmpty = value === null || value === undefined || value === '';

                return (
                  <div key={key} className="space-y-2 p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={key} className="text-sm font-medium">
                        {displayKey}
                      </Label>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`confirm-${key}`}
                          checked={isConfirmed}
                          onCheckedChange={() => handleToggleConfirm(key)}
                        />
                        <Label 
                          htmlFor={`confirm-${key}`} 
                          className="text-xs text-gray-600 cursor-pointer"
                        >
                          Confirm
                        </Label>
                      </div>
                    </div>
                    <Input
                      id={key}
                      value={editedData[key] || ''}
                      onChange={(e) => handleFieldChange(key, e.target.value)}
                      placeholder={isEmpty ? 'No data extracted' : ''}
                      disabled={extractedData.appliedToApplication}
                      className={isEmpty ? 'bg-gray-50' : ''}
                    />
                    {isEmpty && (
                      <p className="text-xs text-gray-500 italic">No value extracted for this field</p>
                    )}
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

        <DialogFooter className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {confirmedFields.size} of {Object.keys(extractedData.data || {}).filter(k => k !== 'confidence').length} fields confirmed
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isApplying}>
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              disabled={isApplying || confirmedFields.size === 0 || extractedData.appliedToApplication}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {isApplying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Apply to Application
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

