import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import Sidebar from "@/components/layout/sidebar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText, 
  Upload, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Search,
  Filter,
  Calendar,
  User,
  MessageSquare
} from "lucide-react";

interface ActivityItem {
  id: string;
  type: 'UPLOAD' | 'REVIEW' | 'APPROVAL' | 'REJECTION' | 'REVISION_REQUEST';
  documentId: string;
  documentName: string;
  documentType: string;
  timestamp: string;
  user: string;
  status?: string;
  message?: string;
}

export default function ActivityPage() {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterDate, setFilterDate] = useState("all");

  const { data: documents = [] } = useQuery<any[]>({
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
  });

  // Generate activity feed from documents
  const generateActivityFeed = (): ActivityItem[] => {
    const activities: ActivityItem[] = [];

    documents.forEach(doc => {
      // Add upload activity
      activities.push({
        id: `upload-${doc.id}`,
        type: 'UPLOAD',
        documentId: doc.id,
        documentName: doc.originalName,
        documentType: doc.documentType,
        timestamp: doc.uploadedAt,
        user: user?.email || 'Unknown',
        status: doc.status
      });

      // Add review activity if reviewed
      if (doc.reviewedAt) {
        activities.push({
          id: `review-${doc.id}`,
          type: doc.status === 'APPROVED' ? 'APPROVAL' : 
                doc.status === 'REJECTED' ? 'REJECTION' : 'REVIEW',
          documentId: doc.id,
          documentName: doc.originalName,
          documentType: doc.documentType,
          timestamp: doc.reviewedAt,
          user: doc.reviewedBy || 'Admin',
          status: doc.status,
          message: doc.reviewNotes
        });
      }
    });

    return activities.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  };

  const activityFeed = generateActivityFeed();

  // Filter activities
  const filteredActivities = activityFeed.filter(activity => {
    const matchesSearch = activity.documentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.documentType.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === "all" || activity.type === filterType;
    
    const now = new Date();
    const activityDate = new Date(activity.timestamp);
    let matchesDate = true;
    
    if (filterDate === "today") {
      matchesDate = activityDate.toDateString() === now.toDateString();
    } else if (filterDate === "week") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      matchesDate = activityDate >= weekAgo;
    } else if (filterDate === "month") {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      matchesDate = activityDate >= monthAgo;
    }

    return matchesSearch && matchesType && matchesDate;
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'UPLOAD':
        return <Upload className="h-4 w-4" />;
      case 'APPROVAL':
        return <CheckCircle className="h-4 w-4" />;
      case 'REJECTION':
        return <XCircle className="h-4 w-4" />;
      case 'REVISION_REQUEST':
        return <AlertCircle className="h-4 w-4" />;
      case 'REVIEW':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'UPLOAD':
        return 'bg-blue-100 text-blue-800';
      case 'APPROVAL':
        return 'bg-green-100 text-green-800';
      case 'REJECTION':
        return 'bg-red-100 text-red-800';
      case 'REVISION_REQUEST':
        return 'bg-orange-100 text-orange-800';
      case 'REVIEW':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActivityDescription = (activity: ActivityItem) => {
    switch (activity.type) {
      case 'UPLOAD':
        return `uploaded ${activity.documentType} document`;
      case 'APPROVAL':
        return `approved ${activity.documentType} document`;
      case 'REJECTION':
        return `rejected ${activity.documentType} document`;
      case 'REVISION_REQUEST':
        return `requested revision for ${activity.documentType} document`;
      case 'REVIEW':
        return `reviewed ${activity.documentType} document`;
      default:
        return `interacted with ${activity.documentType} document`;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Sidebar */}
      <MobileSidebar />
      
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar 
          isCollapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Activity Timeline"
          subtitle="Track all document activities and reviews"
        />
        
        <main className="flex-1 overflow-auto p-6">
          {/* Activity Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Activities</p>
                    <p className="text-2xl font-bold text-gray-900">{activityFeed.length}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-gray-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Documents Uploaded</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {activityFeed.filter(a => a.type === 'UPLOAD').length}
                    </p>
                  </div>
                  <Upload className="h-8 w-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Reviews Completed</p>
                    <p className="text-2xl font-bold text-green-600">
                      {activityFeed.filter(a => ['APPROVAL', 'REJECTION', 'REVIEW'].includes(a.type)).length}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">This Week</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {activityFeed.filter(a => {
                        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                        return new Date(a.timestamp) >= weekAgo;
                      }).length}
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search documents..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Activity type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Activities</SelectItem>
                    <SelectItem value="UPLOAD">Uploads</SelectItem>
                    <SelectItem value="APPROVAL">Approvals</SelectItem>
                    <SelectItem value="REJECTION">Rejections</SelectItem>
                    <SelectItem value="REVIEW">Reviews</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterDate} onValueChange={setFilterDate}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Time period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Activity Feed */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredActivities.length > 0 ? (
                <div className="space-y-4">
                  {filteredActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full ${getActivityColor(activity.type)}`}>
                        {getActivityIcon(activity.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">
                            <span className="capitalize">{activity.user}</span>{' '}
                            {getActivityDescription(activity)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(activity.timestamp), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                        
                        <p className="text-sm text-gray-600 truncate mt-1">
                          {activity.documentName}
                        </p>
                        
                        {activity.message && (
                          <div className="mt-2 p-2 bg-gray-100 rounded text-sm text-gray-700">
                            <MessageSquare className="h-3 w-3 inline mr-1" />
                            {activity.message}
                          </div>
                        )}
                        
                        {activity.status && (
                          <Badge className={`mt-2 ${getActivityColor(activity.status)}`}>
                            {activity.status.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No activities found matching your criteria</p>
                  {(searchTerm || filterType !== "all" || filterDate !== "all") && (
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => {
                        setSearchTerm("");
                        setFilterType("all");
                        setFilterDate("all");
                      }}
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}