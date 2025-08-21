import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, CheckCircle, MessageSquare, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { DOCUMENT_TYPES } from "@/lib/constants";

interface DocumentUploadZoneProps {
  documentType: string;
  documentInfo: any;
  existingDoc?: any;
  onUpload: (file: File, documentType: string) => void;
  isUploading: boolean;
}

function DocumentUploadZone({ 
  documentType, 
  documentInfo, 
  existingDoc,
  onUpload, 
  isUploading 
}: DocumentUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0 && !existingDoc) {
      onUpload(acceptedFiles[0], documentType);
    }
  }, [onUpload, documentType, existingDoc]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    maxFiles: 1,
    disabled: !!existingDoc
  });

  const getStatusBadge = () => {
    if (!existingDoc) return null;
    
    switch (existingDoc.status) {
      case 'APPROVED':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending Review</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      case 'NEEDS_REVISION':
        return <Badge className="bg-orange-100 text-orange-800">Needs Revision</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  return (
    <Card className={`w-full transition-all duration-200 h-full ${
      existingDoc ? 'bg-gray-100 border-gray-300 shadow-sm' : 
      isDragActive ? 'border-primary border-2 bg-blue-50' : 
      'hover:border-gray-300 hover:shadow-md bg-white'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className={`text-sm font-medium ${
            existingDoc ? 'text-gray-600' : 'text-gray-900'
          }`}>
            {documentInfo.name}
          </CardTitle>
          {getStatusBadge()}
        </div>
        {documentInfo.required && (
          <Badge variant="outline" className="text-xs w-fit">
            Required
          </Badge>
        )}
      </CardHeader>
      
      <CardContent>
        <div
          {...getRootProps()}
          className={`
            relative min-h-[160px] border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200
            ${existingDoc ? 
              'border-gray-300 bg-gray-100 cursor-not-allowed' : 
              isDragActive ? 
                'border-primary bg-blue-50 border-solid' : 
                'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }
          `}
        >
          <input {...getInputProps()} />
          
          {existingDoc ? (
            // Uploaded state - greyed out
            <div className="flex flex-col items-center justify-center space-y-2">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <p className="text-sm font-medium text-gray-600">
                {existingDoc.originalName}
              </p>
              <p className="text-xs text-gray-500">
                Uploaded {new Date(existingDoc.uploadedAt).toLocaleDateString()}
              </p>
              
              {/* Comments section */}
              <div className="mt-3 flex items-center space-x-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-blue-600 hover:text-blue-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Open comments dialog
                    console.log('Comments clicked for', existingDoc.originalName);
                  }}
                >
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Comments
                </Button>
              </div>
              
              {existingDoc.reviewNotes && (
                <div className="mt-2 p-2 bg-yellow-50 rounded text-xs text-gray-700 border border-yellow-200">
                  <strong>Review Notes:</strong> {existingDoc.reviewNotes}
                </div>
              )}
            </div>
          ) : isUploading ? (
            // Uploading state with progress bar
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm font-medium text-gray-700">Uploading...</p>
              <div className="w-full max-w-xs">
                <Progress value={75} className="w-full" />
                <p className="text-xs text-gray-500 mt-1">Processing document...</p>
              </div>
            </div>
          ) : (
            // Upload state
            <div className="flex flex-col items-center justify-center space-y-2">
              <Upload className={`h-8 w-8 ${isDragActive ? 'text-primary' : 'text-gray-400'}`} />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">
                  {isDragActive ? 'Drop file here' : 'Drag & Drop files here or'}
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2 bg-orange-500 hover:bg-orange-600 text-white border-orange-500"
                  type="button"
                >
                  Browse for files
                </Button>
              </div>
            </div>
          )}
        </div>
        
        <div className={`mt-3 text-xs ${
          existingDoc ? 'text-gray-500' : 'text-gray-500'
        }`}>
          <p>{documentInfo.description}</p>
          <p className="mt-1">
            Accepted: {documentInfo.acceptedTypes.join(", ")} (max {documentInfo.maxSize}MB)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DocumentUpload() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploadingTypes, setUploadingTypes] = useState<Set<string>>(new Set());

  // Get existing documents to show completed uploads
  const { data: documents = [], refetch, error, isLoading, isError } = useQuery<any[]>({
    queryKey: ["/api/documents", user?.id],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/documents");
      return response.json();
    },
    enabled: !!user?.id, // Only fetch when user ID is available
    retry: 3,
    staleTime: 1000 * 60 * 5, // Consider data stale after 5 minutes
    gcTime: 1000 * 60 * 10, // Keep in cache for 10 minutes
  });

  // Debug logging for troubleshooting
  console.log('DocumentUpload Debug:', {
    userId: user?.id,
    documentsCount: documents.length,
    isLoading,
    isError,
    error: error?.message,
    documents: documents.map(d => ({ id: d.id, type: d.documentType, status: d.status }))
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, documentType }: { file: File; documentType: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentType", documentType);

      const response = await apiRequest("POST", "/api/documents", formData);
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Document uploaded successfully!",
        description: `${DOCUMENT_TYPES[variables.documentType as keyof typeof DOCUMENT_TYPES]?.name} has been submitted for review.`,
      });
      
      // Immediately update the local cache to show the new document
      queryClient.setQueryData(["/api/documents", user?.id], (oldData: any[] = []) => {
        return [...oldData, data];
      });
      
      // Also invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["/api/documents", user?.id] });
      
      setUploadingTypes(prev => {
        const newSet = new Set(prev);
        newSet.delete(variables.documentType);
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

  const handleUpload = (file: File, documentType: string) => {
    setUploadingTypes(prev => new Set(prev).add(documentType));
    uploadMutation.mutate({ file, documentType });
  };

  // Create a map of existing documents by type
  const existingDocsByType = documents.reduce((acc, doc) => {
    acc[doc.documentType] = doc;
    return acc;
  }, {} as Record<string, any>);

  // Show loading state
  if (isLoading) {
    return (
      <div className="w-full h-full min-h-screen bg-white">
        <div className="h-full p-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900">Document Upload</h2>
            <p className="text-gray-600 mt-3 text-lg">Loading your documents...</p>
          </div>
          <div className="flex flex-wrap gap-8 pb-8 justify-center">
            {Object.entries(DOCUMENT_TYPES).map(([key]) => (
              <div key={key} className="w-80 h-64 bg-gray-100 animate-pulse rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (isError) {
    return (
      <div className="w-full h-full min-h-screen bg-white">
        <div className="h-full p-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900">Document Upload</h2>
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center justify-center text-red-800">
                <AlertCircle className="h-5 w-5 mr-2" />
                <span>Failed to load documents: {error?.message || 'Unknown error'}</span>
              </div>
              <button 
                onClick={() => refetch()}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-screen bg-white">
      <div className="h-full p-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900">Document Upload</h2>
          <p className="text-gray-600 mt-3 text-lg">
            Upload your compliance documents. Each document type has its own upload area.
          </p>
        </div>

        <div className="flex flex-wrap gap-8 pb-8 justify-center">
          {Object.entries(DOCUMENT_TYPES).map(([key, docInfo]) => (
            <DocumentUploadZone
              key={key}
              documentType={key}
              documentInfo={docInfo}
              existingDoc={existingDocsByType[key]}
              onUpload={handleUpload}
              isUploading={uploadingTypes.has(key)}
            />
          ))}
        </div>

        {documents.length > 0 && (
          <div className="mt-12 p-6 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-4 text-lg">Upload Progress</h3>
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <span className="text-sm text-gray-700 font-medium">
                  {documents.length} documents uploaded
                </span>
              </div>
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-yellow-500 mr-2" />
                <span className="text-sm text-gray-700 font-medium">
                  {documents.filter(d => d.status === 'PENDING').length} pending review
                </span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <span className="text-sm text-gray-700 font-medium">
                  {documents.filter(d => d.status === 'APPROVED').length} approved
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}