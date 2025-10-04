import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Database, User, AlertTriangle } from "lucide-react";

export default function DocumentDebug() {
  const { user } = useAuth();

  // Query for documents with detailed debugging
  const { 
    data: documents = [], 
    error, 
    isLoading, 
    isError, 
    refetch,
    dataUpdatedAt,
    isFetching
  } = useQuery<any[]>({
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
    enabled: !!user?.id,
    retry: 1, // Reduce retries for debugging
  });

  // Query for health check
  const { 
    data: health, 
    error: healthError,
    refetch: refetchHealth
  } = useQuery({
    queryKey: ["/api/health"],
    queryFn: async () => {
      const response = await fetch("/api/health", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    retry: 1,
  });

  const debugInfo = {
    user: {
      id: user?.id,
      email: user?.email,
      role: user?.role,
    },
    query: {
      documentsCount: documents.length,
      isLoading,
      isError,
      isFetching,
      error: error?.message,
      dataUpdatedAt: new Date(dataUpdatedAt).toLocaleString(),
      queryKey: ["/api/documents", user?.id],
    },
    documents: documents.map(doc => ({
      id: doc.id,
      type: doc.documentType,
      status: doc.status,
      originalName: doc.originalName,
      uploadedAt: doc.uploadedAt,
    })),
    health: {
      status: health?.status,
      database: health?.database,
      error: healthError?.message,
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Document Debug Panel
          </CardTitle>
          <div className="flex gap-2">
            <Button 
              onClick={() => refetchHealth()} 
              size="sm" 
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Health
            </Button>
            <Button 
              onClick={() => refetch()} 
              size="sm" 
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Docs
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* User Info */}
        <div>
          <h3 className="font-semibold flex items-center gap-2 mb-2">
            <User className="h-4 w-4" />
            User Information
          </h3>
          <div className="bg-gray-50 p-3 rounded-lg">
            <pre className="text-sm">{JSON.stringify(debugInfo.user, null, 2)}</pre>
          </div>
        </div>

        {/* Health Check */}
        <div>
          <h3 className="font-semibold flex items-center gap-2 mb-2">
            <Database className="h-4 w-4" />
            Server Health
            {health?.database === 'connected' ? (
              <Badge className="bg-green-100 text-green-800">Connected</Badge>
            ) : (
              <Badge className="bg-red-100 text-red-800">Error</Badge>
            )}
          </h3>
          <div className="bg-gray-50 p-3 rounded-lg">
            <pre className="text-sm">{JSON.stringify(debugInfo.health, null, 2)}</pre>
          </div>
        </div>

        {/* Query Status */}
        <div>
          <h3 className="font-semibold flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4" />
            Query Status
            {isError ? (
              <Badge className="bg-red-100 text-red-800">Error</Badge>
            ) : isLoading ? (
              <Badge className="bg-yellow-100 text-yellow-800">Loading</Badge>
            ) : (
              <Badge className="bg-green-100 text-green-800">Success</Badge>
            )}
          </h3>
          <div className="bg-gray-50 p-3 rounded-lg">
            <pre className="text-sm">{JSON.stringify(debugInfo.query, null, 2)}</pre>
          </div>
        </div>

        {/* Documents */}
        <div>
          <h3 className="font-semibold flex items-center gap-2 mb-2">
            <Database className="h-4 w-4" />
            Documents ({documents.length})
          </h3>
          <div className="bg-gray-50 p-3 rounded-lg max-h-60 overflow-auto">
            <pre className="text-sm">{JSON.stringify(debugInfo.documents, null, 2)}</pre>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
