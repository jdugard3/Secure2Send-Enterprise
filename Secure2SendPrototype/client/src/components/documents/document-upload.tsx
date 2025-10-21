import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, CheckCircle, MessageSquare, Clock, AlertCircle, X, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { DOCUMENT_TYPES } from "@/lib/constants";

interface DocumentUploadZoneProps {
  documentType: string;
  documentInfo: any;
  existingDocs: any[];
  onUpload: (files: File[], documentType: string) => void;
  onDelete: (documentId: string) => void;
  isUploading: boolean;
  stagedFiles: File[];
  onStageFiles: (files: File[], documentType: string) => void;
  onRemoveStagedFile: (index: number, documentType: string) => void;
  onUploadStaged: (documentType: string) => void;
}

function DocumentUploadZone({ 
  documentType, 
  documentInfo, 
  existingDocs,
  onUpload, 
  onDelete,
  isUploading,
  stagedFiles,
  onStageFiles,
  onRemoveStagedFile,
  onUploadStaged
}: DocumentUploadZoneProps) {
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onStageFiles(acceptedFiles, documentType);
      toast({
        title: "Files selected",
        description: `${acceptedFiles.length} file(s) ready to upload. Click "Upload Files" to proceed.`,
      });
    }
  }, [onStageFiles, documentType, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    multiple: true
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge className="bg-green-100 text-green-800 text-xs">Approved</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800 text-xs">Pending</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-800 text-xs">Rejected</Badge>;
      case 'NEEDS_REVISION':
        return <Badge className="bg-orange-100 text-orange-800 text-xs">Needs Revision</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 text-xs">Unknown</Badge>;
    }
  };

  const hasContent = existingDocs.length > 0 || stagedFiles.length > 0;

  return (
    <Card className={`w-full transition-all duration-200 min-h-[400px] ${
      isDragActive ? 'border-primary border-2 bg-blue-50' : 
      'hover:border-gray-300 hover:shadow-md bg-white'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-gray-900">
            {documentInfo.name}
          </CardTitle>
          {documentInfo.required ? (
            <Badge variant="outline" className="text-xs">Required</Badge>
          ) : (
            <Badge variant="outline" className="text-xs bg-gray-100">Optional</Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div
          {...getRootProps()}
          className={`
            relative min-h-[120px] border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all duration-200
            ${isDragActive ? 
              'border-primary bg-blue-50 border-solid' : 
              'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }
          `}
        >
          <input {...getInputProps()} />
          
          {isUploading ? (
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm font-medium text-gray-700">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-2">
              <Upload className={`h-8 w-8 ${isDragActive ? 'text-primary' : 'text-gray-400'}`} />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">
                  {isDragActive ? 'Drop files here' : 'Drag & Drop files here or'}
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
              <p className="text-xs text-gray-500 mt-2">
                Multiple files allowed
              </p>
            </div>
          )}
        </div>

        {/* Staged Files - Ready to Upload */}
        {stagedFiles.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-900">Ready to Upload</h4>
              <Button
                size="sm"
                onClick={() => onUploadStaged(documentType)}
                disabled={isUploading}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Upload className="h-3 w-3 mr-1" />
                Upload Files ({stagedFiles.length})
              </Button>
            </div>
            <div className="space-y-1">
              {stagedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <span className="truncate font-medium">{file.name}</span>
                    <span className="text-gray-500 flex-shrink-0">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveStagedFile(index, documentType)}
                    className="h-6 w-6 p-0 hover:bg-red-100 ml-2"
                  >
                    <X className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Uploaded Documents */}
        {existingDocs.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-900">Uploaded Documents</h4>
            <div className="space-y-2">
              {existingDocs.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{doc.originalName}</p>
                      <p className="text-xs text-gray-500">
                        Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                    {getStatusBadge(doc.status)}
                  </div>
                  <div className="flex items-center space-x-1 ml-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('Comments clicked for', doc.originalName);
                      }}
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      <span className="text-xs">Comments</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete "${doc.originalName}"?`)) {
                          onDelete(doc.id);
                        }
                      }}
                      className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      <span className="text-xs">Delete</span>
                    </Button>
                  </div>
                  {doc.reviewNotes && (
                    <div className="mt-2 p-2 bg-yellow-50 rounded text-xs text-gray-700 border border-yellow-200">
                      <strong>Review Notes:</strong> {doc.reviewNotes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Info Footer */}
        <div className="text-xs text-gray-500 pt-2 border-t">
          <p>{documentInfo.description}</p>
          <p className="mt-1">
            Accepted: PDF, JPEG, PNG (max {documentInfo.maxSize}MB per file)
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
  const [stagedFilesByType, setStagedFilesByType] = useState<Record<string, File[]>>({});

  // Get existing documents to show completed uploads
  const { data: documents = [], refetch, error, isLoading, isError } = useQuery<any[]>({
    queryKey: ["/api/documents", user?.id],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/documents");
      return response.json();
    },
    enabled: !!user?.id,
    retry: 3,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ files, documentType }: { files: File[]; documentType: string }) => {
      const uploadedDocs = [];
      
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("documentType", documentType);

        const response = await apiRequest("POST", "/api/documents", formData);
        const data = await response.json();
        uploadedDocs.push(data);
      }
      
      return { uploadedDocs, documentType };
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Documents uploaded successfully!",
        description: `${data.uploadedDocs.length} file(s) have been submitted for review.`,
      });
      
      // Clear staged files for this type
      setStagedFilesByType(prev => {
        const newStaged = { ...prev };
        delete newStaged[data.documentType];
        return newStaged;
      });
      
      // Invalidate to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/documents", user?.id] });
      
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

  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await apiRequest("DELETE", `/api/documents/${documentId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Document deleted",
        description: "The document has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/documents", user?.id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
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
    if (files && files.length > 0) {
      setUploadingTypes(prev => new Set(prev).add(documentType));
      uploadMutation.mutate({ files, documentType });
    }
  };

  const handleDelete = (documentId: string) => {
    deleteMutation.mutate(documentId);
  };

  // Group documents by type
  const documentsByType = documents.reduce((acc, doc) => {
    if (!acc[doc.documentType]) {
      acc[doc.documentType] = [];
    }
    acc[doc.documentType].push(doc);
    return acc;
  }, {} as Record<string, any[]>);

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
              existingDocs={documentsByType[key] || []}
              onUpload={() => {}}
              onDelete={handleDelete}
              isUploading={uploadingTypes.has(key)}
              stagedFiles={stagedFilesByType[key] || []}
              onStageFiles={handleStageFiles}
              onRemoveStagedFile={handleRemoveStagedFile}
              onUploadStaged={handleUploadStaged}
            />
          ))}
        </div>

        {documents.length > 0 && (() => {
          // Calculate required document sections
          const requiredDocTypes = Object.entries(DOCUMENT_TYPES)
            .filter(([_, info]) => info.required)
            .map(([key]) => key);
          
          const totalRequired = requiredDocTypes.length;
          
          // Count unique document sections (not individual documents)
          const completedSections = new Set();
          documents.forEach(doc => {
            // Only count if this document type is in our current required list
            if (requiredDocTypes.includes(doc.documentType)) {
              completedSections.add(doc.documentType);
            }
          });
          const completedRequired = completedSections.size;
          
          const progressPercentage = totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 0;
          
          return (
            <div className="mt-12 p-6 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-4 text-lg">Upload Progress</h3>
              <div className="space-y-4">
                {/* Progress Bar */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Required Document Sections
                    </span>
                    <span className="text-sm font-bold text-gray-900">
                      {completedRequired} of {totalRequired} completed ({progressPercentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-500 ${
                        progressPercentage === 100 ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
                
                {/* Stats */}
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-gray-500 mr-2" />
                    <span className="text-sm text-gray-700 font-medium">
                      {documents.length} total documents uploaded
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
                
                {progressPercentage === 100 && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2 flex-shrink-0" />
                    <span className="text-sm text-green-800 font-medium">
                      All required document sections completed! 🎉
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}