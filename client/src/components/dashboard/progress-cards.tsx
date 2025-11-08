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
    <div className="space-y-6">
      {/* Top row with Upload Progress and Approval Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Upload Progress</h3>
              <div className="w-10 h-10 bg-[#2563EB]/10 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-[#2563EB]" />
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 font-medium">Documents Uploaded</span>
                <span className="text-xl font-semibold text-gray-900">{uploadedCount} <span className="text-base text-gray-500 font-normal">/ {totalRequired}</span></span>
              </div>
              <Progress value={progressPercentage} className="h-2 bg-gray-200" />
              <p className="text-sm text-gray-500 font-medium">{progressPercentage}% Complete</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Approval Status</h3>
              <div className="w-10 h-10 bg-[#10B981]/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-[#10B981]" />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-[#10B981]/5 rounded-lg border border-[#10B981]/20">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#10B981] rounded-full"></div>
                  <span className="text-sm text-gray-700 font-medium">Approved</span>
                </div>
                <span className="text-lg font-semibold text-gray-900">{approvedCount}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#F59E0B]/5 rounded-lg border border-[#F59E0B]/20">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#F59E0B] rounded-full"></div>
                  <span className="text-sm text-gray-700 font-medium">Pending</span>
                </div>
                <span className="text-lg font-semibold text-gray-900">{pendingCount}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-gray-700 font-medium">Rejected</span>
                </div>
                <span className="text-lg font-semibold text-gray-900">{rejectedCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Full-width Next Steps section below */}
      <Card className="bg-white border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md transition-all">
        <CardContent className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Next Steps</h3>
            <div className="w-10 h-10 bg-[#F59E0B]/10 rounded-lg flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-[#F59E0B]" />
            </div>
          </div>
          <div className="space-y-4">
            {missingDocuments.length > 0 ? (
              <>
                <p className="text-sm text-gray-600 font-medium">Missing required documents:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {missingDocuments.map((doc) => (
                    <div key={doc.key} className="p-4 bg-[#F59E0B]/5 rounded-lg border border-[#F59E0B]/20 hover:border-[#F59E0B]/30 transition-colors">
                      <div className="text-sm font-semibold text-gray-900 mb-1">{doc.name}</div>
                      <div className="text-xs text-gray-600 mb-2 leading-relaxed">{doc.description}</div>
                      <div className="text-xs text-gray-500 font-medium">
                        Max size: {doc.maxSize}MB
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-500 text-center mt-4 font-medium">
                  {missingDocuments.length} document{missingDocuments.length !== 1 ? 's' : ''} remaining
                </p>
              </>
            ) : (
              <div className="text-center py-10 bg-[#10B981]/5 rounded-lg border border-[#10B981]/20">
                <div className="w-12 h-12 bg-[#10B981]/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-6 w-6 text-[#10B981]" />
                </div>
                <p className="text-[#10B981] text-base font-semibold mb-1">All required documents uploaded!</p>
                <p className="text-gray-500 text-sm">Great job completing your compliance requirements</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
