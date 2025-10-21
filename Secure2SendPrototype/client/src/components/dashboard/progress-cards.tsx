import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BarChart3, CheckCircle, Clock, AlertCircle } from "lucide-react";
import type { Document } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { DOCUMENT_TYPES } from "@/lib/constants";

export default function ProgressCards() {
  const { user } = useAuth();
  
  // Only fetch documents for CLIENT users, not for ADMINs
  // Include user ID in query key to ensure proper per-user caching
  const { data: documents = [], error, isLoading, isError } = useQuery<Document[]>({
    queryKey: ["/api/documents", user?.id],
    queryFn: async () => {
      const response = await fetch("/api/documents", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    enabled: user?.role === 'CLIENT' && !!user?.id, // Only fetch if user is a client AND has an ID
    retry: 3,
    staleTime: 1000 * 60 * 5, // Consider data stale after 5 minutes
    gcTime: 1000 * 60 * 10, // Keep in cache for 10 minutes
  });

  // Only show progress for CLIENT users
  if (user?.role !== 'CLIENT') {
    return null;
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded mb-4"></div>
              <div className="h-2 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Show error state
  if (isError) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="col-span-full border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center text-red-800">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>Failed to load documents: {error?.message || 'Unknown error'}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate actual required documents count
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
  const uploadedCount = completedSections.size;
  
  const approvedCount = documents.filter((doc) => doc.status === 'APPROVED').length;
  const pendingCount = documents.filter((doc) => doc.status === 'PENDING').length;
  const rejectedCount = documents.filter((doc) => doc.status === 'REJECTED').length;
  const progressPercentage = totalRequired > 0 ? Math.round((uploadedCount / totalRequired) * 100) : 0;

  // Get actual missing required documents
  const existingDocTypes = new Set(documents.map(doc => doc.documentType));
  const missingDocuments = Object.entries(DOCUMENT_TYPES)
    .filter(([key, docInfo]) => {
      return docInfo.required && !existingDocTypes.has(key as keyof typeof DOCUMENT_TYPES);
    })
    .map(([key, docInfo]) => ({
      key,
      name: docInfo.name,
      description: docInfo.description,
      maxSize: docInfo.maxSize
    }));

  return (
    <div className="space-y-6 mb-8">
      {/* Top row with Upload Progress and Approval Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Upload Progress</h3>
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Documents Uploaded</span>
                <span className="font-medium">{uploadedCount} of {totalRequired}</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              <p className="text-sm text-gray-500">{progressPercentage}% Complete</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Approval Status</h3>
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-success text-sm">Approved</span>
                <span className="font-medium">{approvedCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-warning text-sm">Pending</span>
                <span className="font-medium">{pendingCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-destructive text-sm">Rejected</span>
                <span className="font-medium">{rejectedCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Full-width Next Steps section below */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Next Steps</h3>
            <AlertCircle className="h-5 w-5 text-warning" />
          </div>
          <div className="space-y-3">
            {missingDocuments.length > 0 ? (
              <>
                <p className="text-sm text-gray-600">Missing required documents:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {missingDocuments.map((doc) => (
                    <div key={doc.key} className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="text-sm font-medium text-orange-900">{doc.name}</div>
                      <div className="text-xs text-orange-700 mt-1">{doc.description}</div>
                      <div className="text-xs text-orange-600 mt-1">
                        Max size: {doc.maxSize}MB
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-500 text-center mt-4">
                  {missingDocuments.length} document{missingDocuments.length !== 1 ? 's' : ''} remaining
                </p>
              </>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="text-green-700 text-base font-medium">All required documents uploaded!</p>
                <p className="text-gray-500 text-sm mt-2">Great job completing your compliance requirements</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
