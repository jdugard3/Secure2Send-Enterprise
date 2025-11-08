import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Clock, CheckCircle, XCircle } from "lucide-react";

interface AdminStats {
  totalClients: number;
  pendingReview: number;
  approvedToday: number;
  rejectedToday: number;
}

export default function AdminStats() {
  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      const response = await fetch("/api/admin/stats", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <Card className="bg-white border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md transition-all">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium mb-1">Total Clients</p>
              <p className="text-2xl font-semibold text-gray-900">{stats?.totalClients || 0}</p>
            </div>
            <div className="w-10 h-10 bg-[#2563EB]/10 rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5 text-[#2563EB]" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md transition-all">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium mb-1">Pending Review</p>
              <p className="text-2xl font-semibold text-[#F59E0B]">{stats?.pendingReview || 0}</p>
            </div>
            <div className="w-10 h-10 bg-[#F59E0B]/10 rounded-lg flex items-center justify-center">
              <Clock className="h-5 w-5 text-[#F59E0B]" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md transition-all">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium mb-1">Approved Today</p>
              <p className="text-2xl font-semibold text-[#10B981]">{stats?.approvedToday || 0}</p>
            </div>
            <div className="w-10 h-10 bg-[#10B981]/10 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-[#10B981]" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md transition-all">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium mb-1">Rejected Today</p>
              <p className="text-2xl font-semibold text-red-600">{stats?.rejectedToday || 0}</p>
            </div>
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
