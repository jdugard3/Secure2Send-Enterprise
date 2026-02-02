import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, CheckCircle, MessageSquare, Clock, AlertCircle, X, Trash2, Building2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { DOCUMENT_TYPES } from "@/lib/constants";
import OcrProcessingIndicator from "./OcrProcessingIndicator";

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
  merchantAppMap: Record<string, string>;
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
  onUploadStaged,
  merchantAppMap
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
    <div className={`w-full max-w-4xl border rounded-lg ${
      isDragActive ? 'border-[#2563EB] border-2 bg-blue-50' : 'border-gray-200 bg-white'
    }`}>
      <div className={`p-3 border-b ${
        documentInfo.required ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200'
      }`}>
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-900">
            {documentInfo.name}
          </h4>
          {documentInfo.required ? (
            <Badge className="bg-blue-100 text-blue-800 text-xs">Required</Badge>
          ) : (
            <Badge className="bg-gray-100 text-gray-600 text-xs">Optional</Badge>
          )}
        </div>
      </div>
      
      <div className="p-4 space-y-3">
        {/* Upload Area */}
        <div
          {...getRootProps()}
          className={`
            relative min-h-[100px] border-2 border-dashed rounded p-3 text-center cursor-pointer
            ${isDragActive ? 
              'border-[#2563EB] bg-blue-50 border-solid' : 
              'border-gray-300'
            }
          `}
        >
          <input {...getInputProps()} />
          
          {isUploading ? (
            <div className="flex flex-col items-center justify-center space-y-2 py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#2563EB]"></div>
              <p className="text-xs text-gray-600">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-2 py-4">
              <Upload className={`h-6 w-6 ${isDragActive ? 'text-[#2563EB]' : 'text-gray-400'}`} />
              <div className="text-center">
                <p className="text-xs text-gray-600">
                  {isDragActive ? 'Drop files here' : 'Drag & Drop files here or'}
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2 h-7 text-xs"
                  type="button"
                >
                  Browse
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Staged Files - Ready to Upload */}
        {stagedFiles.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-700">Ready to Upload</p>
              <Button
                size="sm"
                onClick={() => onUploadStaged(documentType)}
                disabled={isUploading}
                className="h-7 text-xs bg-[#2563EB] hover:bg-[#1D4ED8]"
              >
                <Upload className="h-3 w-3 mr-1" />
                Upload ({stagedFiles.length})
              </Button>
            </div>
            <div className="space-y-1">
              {stagedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="h-3 w-3 text-blue-600 flex-shrink-0" />
                    <span className="truncate">{file.name}</span>
                    <span className="text-gray-500 flex-shrink-0">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveStagedFile(index, documentType)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3 text-gray-600" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Uploaded Documents */}
        {existingDocs.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-700">Uploaded Documents</p>
            <div className="space-y-2">
              {existingDocs.map((doc) => (
                <div key={doc.id} className={`flex items-center justify-between p-2 border rounded text-xs ${
                  doc.status === 'APPROVED' ? 'bg-green-50 border-green-200' :
                  doc.status === 'PENDING' ? 'bg-yellow-50 border-yellow-200' :
                  doc.status === 'REJECTED' ? 'bg-red-50 border-red-200' :
                  'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {doc.status === 'APPROVED' ? (
                      <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                    ) : doc.status === 'PENDING' ? (
                      <Clock className="h-3 w-3 text-yellow-600 flex-shrink-0" />
                    ) : doc.status === 'REJECTED' ? (
                      <XCircle className="h-3 w-3 text-red-600 flex-shrink-0" />
                    ) : (
                      <FileText className="h-3 w-3 text-gray-600 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{doc.originalName}</p>
                      <p className="text-gray-500">
                        {new Date(doc.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                    {getStatusBadge(doc.status)}
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete "${doc.originalName}"?`)) {
                          onDelete(doc.id);
                        }
                      }}
                      className="h-6 w-6 p-0 text-red-600"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Info Footer */}
        <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
          <p>{documentInfo.description}</p>
          <p className="mt-1">
            Accepted: PDF, JPEG, PNG (max {documentInfo.maxSize}MB per file)
          </p>
        </div>
      </div>
    </div>
  );
}

export default function DocumentUpload({ applicationId }: { applicationId?: string }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploadingTypes, setUploadingTypes] = useState<Set<string>>(new Set());
  const [stagedFilesByType, setStagedFilesByType] = useState<Record<string, File[]>>({});
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewDocumentId, setReviewDocumentId] = useState<string>("");
  const [reviewMerchantApplicationId, setReviewMerchantApplicationId] = useState<string>("");

  // Fetch merchant applications for the merchant app map only
  const { data: merchantApplications = [] } = useQuery<any[]>({
    queryKey: ["/api/merchant-applications", user?.id],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/merchant-applications");
      return response.json();
    },
    enabled: !!user?.id,
  });

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

  // Create a map of merchant application IDs to names for quick lookup
  const merchantAppMap = merchantApplications.reduce((acc: Record<string, string>, app: any) => {
    acc[app.id] = app.dbaBusinessName || app.legalBusinessName || 'Unnamed Application';
    return acc;
  }, {});

  const uploadMutation = useMutation({
    mutationFn: async ({ files, documentType, merchantApplicationId }: { files: File[]; documentType: string; merchantApplicationId: string }) => {
      if (!merchantApplicationId) {
        throw new Error("Please select a merchant application before uploading documents");
      }

      const uploadedDocs = [];
      
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("documentType", documentType);
        formData.append("merchantApplicationId", merchantApplicationId);

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
      if (!applicationId) {
        toast({
          title: "No Application Selected",
          description: "Please select an application using the switcher in the header.",
          variant: "destructive",
        });
        return;
      }
      setUploadingTypes(prev => new Set(prev).add(documentType));
      uploadMutation.mutate({ files, documentType, merchantApplicationId: applicationId });
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
    <div className="w-full">
      {!applicationId && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-gray-900 mb-1">No Application Selected</p>
              <p className="text-xs text-gray-600">
                Please select an application using the switcher in the header before uploading documents.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Required Documents Section */}
        <div>
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Required Documents</h3>
            <p className="text-xs text-gray-500">These documents are mandatory for compliance review</p>
          </div>
          <div className="flex flex-col gap-4">
            {Object.entries(DOCUMENT_TYPES)
              .filter(([_, docInfo]) => docInfo.required)
              .map(([key, docInfo]) => (
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
                  merchantAppMap={merchantAppMap}
                />
              ))}
          </div>
        </div>

          {/* Optional Documents Section */}
          <div>
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Optional Documents</h3>
              <p className="text-xs text-gray-500">These documents are optional but may be helpful for your application</p>
            </div>
          <div className="flex flex-col gap-4">
            {Object.entries(DOCUMENT_TYPES)
              .filter(([_, docInfo]) => !docInfo.required)
              .map(([key, docInfo]) => (
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
                  merchantAppMap={merchantAppMap}
                />
              ))}
          </div>
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
            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <h3 className="text-xs font-semibold text-gray-900 mb-2">Upload Progress</h3>
              <div className="space-y-2">
                {/* Progress Bar */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">
                      Required Document Sections
                    </span>
                    <span className="text-xs font-medium text-gray-900">
                      {completedRequired} of {totalRequired} ({progressPercentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        progressPercentage === 100 ? 'bg-green-600' : 'bg-[#2563EB]'
                      }`}
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
                
                {/* Stats */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                  <span>{documents.length} total documents</span>
                  <span>{documents.filter(d => d.status === 'PENDING').length} pending</span>
                  <span>{documents.filter(d => d.status === 'APPROVED').length} approved</span>
                </div>
                
                {progressPercentage === 100 && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded flex items-center">
                    <CheckCircle className="h-3 w-3 text-green-600 mr-1 flex-shrink-0" />
                    <span className="text-xs text-green-800 font-medium">
                      All required document sections completed
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