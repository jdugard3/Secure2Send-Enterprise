import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, CheckCircle, X, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { DOCUMENT_TYPES } from "@/lib/constants";

interface DocumentUploadStepProps {
  applicationId: string;
  onContinue: () => void;
  isSubmitting?: boolean;
}

export function DocumentUploadStep({ applicationId, onContinue, isSubmitting = false }: DocumentUploadStepProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [stagedFilesByType, setStagedFilesByType] = useState<Record<string, File[]>>({});
  const [uploadingTypes, setUploadingTypes] = useState<Set<string>>(new Set());

  // Get existing documents for this application
  const { data: documents = [], refetch } = useQuery<any[]>({
    queryKey: ["/api/documents", applicationId],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/documents");
      const allDocs = await response.json();
      return allDocs.filter((doc: any) => doc.merchantApplicationId === applicationId);
    },
    enabled: !!applicationId && !!user?.id,
  });

  // Group documents by type
  const documentsByType = documents.reduce((acc: Record<string, any[]>, doc: any) => {
    if (!acc[doc.documentType]) {
      acc[doc.documentType] = [];
    }
    acc[doc.documentType].push(doc);
    return acc;
  }, {});

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ files, documentType }: { files: File[]; documentType: string }) => {
      const uploadedDocs = [];
      
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("documentType", documentType);
        formData.append("merchantApplicationId", applicationId);

        const response = await apiRequest("POST", "/api/documents", formData);
        const data = await response.json();
        uploadedDocs.push(data);
      }
      
      return { uploadedDocs, documentType };
    },
    onSuccess: (data) => {
      toast({
        title: "Documents uploaded successfully!",
        description: `${data.uploadedDocs.length} file(s) have been uploaded.`,
      });
      
      // Clear staged files for this type
      setStagedFilesByType(prev => {
        const newStaged = { ...prev };
        delete newStaged[data.documentType];
        return newStaged;
      });
      
      // Refresh documents list
      queryClient.invalidateQueries({ queryKey: ["/api/documents", applicationId] });
      refetch();
      
      setUploadingTypes(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.documentType);
        return newSet;
      });
    },
    onError: (error: Error, variables) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
      setUploadingTypes(prev => {
        const newSet = new Set(prev);
        newSet.delete(variables.documentType);
        return newSet;
      });
    },
  });

  const handleStageFiles = (files: File[], documentType: string) => {
    setStagedFilesByType(prev => ({
      ...prev,
      [documentType]: [...(prev[documentType] || []), ...files]
    }));
  };

  const handleRemoveStagedFile = (index: number, documentType: string) => {
    setStagedFilesByType(prev => {
      const files = [...(prev[documentType] || [])];
      files.splice(index, 1);
      const newStaged = { ...prev };
      if (files.length === 0) {
        delete newStaged[documentType];
      } else {
        newStaged[documentType] = files;
      }
      return newStaged;
    });
  };

  const handleUploadStaged = (documentType: string) => {
    const files = stagedFilesByType[documentType];
    if (!files || files.length === 0) return;
    
    setUploadingTypes(prev => new Set(prev).add(documentType));
    uploadMutation.mutate({ files, documentType });
  };

  // Check if all required documents are uploaded
  const requiredDocumentTypes = Object.entries(DOCUMENT_TYPES)
    .filter(([_, info]) => info.required)
    .map(([type]) => type);

  const allRequiredUploaded = requiredDocumentTypes.every(type => {
    const docs = documentsByType[type] || [];
    return docs.length > 0 && docs.some((doc: any) => doc.status !== 'REJECTED');
  });

  const handleContinue = () => {
    if (!allRequiredUploaded) {
      toast({
        title: "Required documents missing",
        description: "Please upload all required documents before continuing.",
        variant: "destructive",
      });
      return;
    }
    onContinue();
  };

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold text-blue-900 mb-2">
            Upload Required Documents
          </h2>
          <p className="text-blue-700">
            Upload all required documents for verification. You can upload multiple files at once for each document type.
            OCR processing will run automatically in the background.
          </p>
        </CardContent>
      </Card>

      {/* Document Upload Zones */}
      <div className="space-y-4">
        {Object.entries(DOCUMENT_TYPES).map(([documentType, documentInfo]) => {
          const existingDocs = documentsByType[documentType] || [];
          const stagedFiles = stagedFilesByType[documentType] || [];
          const isUploading = uploadingTypes.has(documentType);
          const hasUploaded = existingDocs.length > 0 && existingDocs.some((doc: any) => doc.status !== 'REJECTED');

          return (
            <DocumentUploadZone
              key={documentType}
              documentType={documentType}
              documentInfo={documentInfo}
              existingDocs={existingDocs}
              stagedFiles={stagedFiles}
              isUploading={isUploading}
              hasUploaded={hasUploaded}
              onStageFiles={(files) => handleStageFiles(files, documentType)}
              onRemoveStagedFile={(index) => handleRemoveStagedFile(index, documentType)}
              onUploadStaged={() => handleUploadStaged(documentType)}
            />
          );
        })}
      </div>

      {/* Continue Button */}
      <div className="flex justify-end pt-4 border-t">
        <Button
          size="lg"
          onClick={handleContinue}
          disabled={!allRequiredUploaded || isSubmitting}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processing...
            </>
          ) : (
            <>
              Continue to Review
              <Upload className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

interface DocumentUploadZoneProps {
  documentType: string;
  documentInfo: typeof DOCUMENT_TYPES[keyof typeof DOCUMENT_TYPES];
  existingDocs: any[];
  stagedFiles: File[];
  isUploading: boolean;
  hasUploaded: boolean;
  onStageFiles: (files: File[]) => void;
  onRemoveStagedFile: (index: number) => void;
  onUploadStaged: () => void;
}

function DocumentUploadZone({
  documentType,
  documentInfo,
  existingDocs,
  stagedFiles,
  isUploading,
  hasUploaded,
  onStageFiles,
  onRemoveStagedFile,
  onUploadStaged,
}: DocumentUploadZoneProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onStageFiles(acceptedFiles);
    }
  }, [onStageFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    multiple: true
  });

  return (
    <Card className={`${hasUploaded ? 'border-green-200 bg-green-50/50' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hasUploaded ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <FileText className="h-5 w-5 text-gray-400" />
            )}
            <CardTitle className="text-sm font-medium">
              {documentInfo.name}
            </CardTitle>
          </div>
          {documentInfo.required && (
            <Badge variant={hasUploaded ? "default" : "destructive"}>
              {hasUploaded ? "Uploaded" : "Required"}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {documentInfo.description}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing Documents */}
        {existingDocs.length > 0 && (
          <div className="space-y-2">
            {existingDocs.map((doc: any) => (
              <div key={doc.id} className="flex items-center justify-between p-2 bg-white rounded border">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{doc.originalName}</span>
                  {doc.status === 'APPROVED' && (
                    <Badge className="bg-green-100 text-green-800 text-xs">Approved</Badge>
                  )}
                  {doc.status === 'PENDING' && (
                    <Badge className="bg-yellow-100 text-yellow-800 text-xs">Pending</Badge>
                  )}
                  {doc.status === 'REJECTED' && (
                    <Badge className="bg-red-100 text-red-800 text-xs">Rejected</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Staged Files */}
        {stagedFiles.length > 0 && (
          <div className="space-y-2">
            {stagedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-200">
                <span className="text-sm text-blue-900">{file.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveStagedFile(index)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              onClick={onUploadStaged}
              disabled={isUploading}
              size="sm"
              className="w-full"
            >
              {isUploading ? "Uploading..." : `Upload ${stagedFiles.length} file(s)`}
            </Button>
          </div>
        )}

        {/* Upload Zone */}
        {stagedFiles.length === 0 && (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-blue-500 bg-blue-50'
                : hasUploaded
                ? 'border-green-300 bg-green-50/50'
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className={`h-8 w-8 mx-auto mb-2 ${hasUploaded ? 'text-green-600' : 'text-gray-400'}`} />
            <p className="text-sm text-gray-600">
              {hasUploaded ? "Click to add more files" : "Drag files here or click to select"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Accepted: PDF, JPEG, PNG (max {documentInfo.maxSize}MB per file)
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

