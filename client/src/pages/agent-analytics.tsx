import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  CheckCircle, 
  FileText, 
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Activity
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AnalyticsData {
  overview: {
    totalMerchants: number;
    completedOnboarding: number;
    inProgress: number;
    needsAttention: number;
  };
  conversionFunnel: {
    invitationsSent: number;
    signups: number;
    startedApplication: number;
    submittedApplication: number;
    signupConversionRate: number;
    onboardingCompletionRate: number;
    applicationCompletionRate: number;
  };
  recentActivity: {
    last30Days: number;
    averageTimeToComplete: number | null;
  };
  topPerformers: Array<{
    merchantId: string;
    companyName: string;
    completedAt: string;
  }>;
}

export default function AgentAnalytics() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Check authentication and MFA
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        toast({
          title: "Authentication Required",
          description: "Please log in to access the agent analytics.",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      // Check if MFA setup is required first (before any role-based redirects)
      if (user?.mfaRequired && !user?.mfaEnabled && !user?.mfaEmailEnabled) {
        navigate("/mfa-setup");
        return;
      }

      // Check if user is an agent
      if (user?.role !== 'AGENT') {
        toast({
          title: "Access Denied",
          description: "You must be an agent to access this page.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }
    }
  }, [isAuthenticated, isLoading, user, toast, navigate]);

  // Fetch analytics data
  const { data: analytics, isLoading: analyticsLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/agent/analytics"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/agent/analytics");
      if (!response.ok) {
        throw new Error("Failed to fetch analytics");
      }
      return response.json();
    },
    enabled: isAuthenticated && user?.role === 'AGENT' && !!(user?.mfaEnabled || user?.mfaEmailEnabled),
  });

  // Render loading or redirect states
  if (isLoading || !isAuthenticated || (user?.mfaRequired && !user?.mfaEnabled && !user?.mfaEmailEnabled)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (user?.role !== 'AGENT') {
    return null;
  }

  return (
    <div className="flex h-screen bg-white">
      <MobileSidebar />
      <div className="hidden lg:block">
        <Sidebar 
          isCollapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Analytics"
          subtitle="Track your merchant acquisition and conversion metrics"
        />
        
        <main className="flex-1 overflow-auto p-6 lg:p-8 bg-gray-50/50">
          <div className="max-w-7xl mx-auto space-y-6">

            {analyticsLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-4"></div>
                <p className="text-sm text-gray-500">Loading analytics...</p>
              </div>
            ) : !analytics ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-sm text-gray-500">No analytics data available</p>
              </div>
            ) : (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Merchants</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{analytics.overview.totalMerchants}</div>
                      <p className="text-xs text-muted-foreground">
                        All merchants
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{analytics.overview.inProgress}</div>
                      <p className="text-xs text-muted-foreground">
                        Active onboarding
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Completed</CardTitle>
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{analytics.overview.completedOnboarding}</div>
                      <p className="text-xs text-muted-foreground">
                        Finished onboarding
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Needs Attention</CardTitle>
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{analytics.overview.needsAttention}</div>
                      <p className="text-xs text-muted-foreground">
                        Stuck &gt; 3 days
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Conversion Funnel */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Conversion Funnel
                    </CardTitle>
                    <CardDescription>
                      Track how merchants progress through your onboarding flow
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Invitations → Signups */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Invitations Sent</span>
                          <span className="text-2xl font-bold">{analytics.conversionFunnel.invitationsSent}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500" style={{ width: '100%' }}></div>
                        </div>
                      </div>

                      <div className="flex items-center justify-center text-gray-400">
                        <ArrowDownRight className="h-4 w-4" />
                        <span className="text-xs ml-1">{analytics.conversionFunnel.signupConversionRate}% conversion</span>
                      </div>

                      {/* Signups */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Signups</span>
                          <span className="text-2xl font-bold">{analytics.conversionFunnel.signups}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500" 
                            style={{ 
                              width: `${analytics.conversionFunnel.invitationsSent > 0 
                                ? (analytics.conversionFunnel.signups / analytics.conversionFunnel.invitationsSent) * 100 
                                : 0}%` 
                            }}
                          ></div>
                        </div>
                      </div>

                      <div className="flex items-center justify-center text-gray-400">
                        <ArrowDownRight className="h-4 w-4" />
                        <span className="text-xs ml-1">{analytics.conversionFunnel.onboardingCompletionRate}% complete onboarding</span>
                      </div>

                      {/* Started Application */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Started Application</span>
                          <span className="text-2xl font-bold">{analytics.conversionFunnel.startedApplication}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-purple-500" 
                            style={{ 
                              width: `${analytics.conversionFunnel.signups > 0 
                                ? (analytics.conversionFunnel.startedApplication / analytics.conversionFunnel.signups) * 100 
                                : 0}%` 
                            }}
                          ></div>
                        </div>
                      </div>

                      <div className="flex items-center justify-center text-gray-400">
                        <ArrowDownRight className="h-4 w-4" />
                        <span className="text-xs ml-1">{analytics.conversionFunnel.applicationCompletionRate}% submit application</span>
                      </div>

                      {/* Submitted Application */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Submitted Application</span>
                          <span className="text-2xl font-bold">{analytics.conversionFunnel.submittedApplication}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-500" 
                            style={{ 
                              width: `${analytics.conversionFunnel.startedApplication > 0 
                                ? (analytics.conversionFunnel.submittedApplication / analytics.conversionFunnel.startedApplication) * 100 
                                : 0}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Recent Activity */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Recent Activity
                      </CardTitle>
                      <CardDescription>
                        Performance in the last 30 days
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">New Signups</span>
                          <div className="flex items-center gap-2">
                            <ArrowUpRight className="h-4 w-4 text-green-600" />
                            <span className="text-2xl font-bold">{analytics.recentActivity.last30Days}</span>
                          </div>
                        </div>
                        
                        {analytics.recentActivity.averageTimeToComplete && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">Avg. Time to Complete</span>
                            <span className="text-lg font-semibold">
                              {analytics.recentActivity.averageTimeToComplete} days
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Top Performers */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5" />
                        Top Performers
                      </CardTitle>
                      <CardDescription>
                        Recently completed merchants
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {analytics.topPerformers.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">No completed merchants yet</p>
                      ) : (
                        <div className="space-y-3">
                          {analytics.topPerformers.map((merchant, index) => (
                            <div key={merchant.merchantId} className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Badge variant="outline" className="w-6 h-6 flex items-center justify-center">
                                  {index + 1}
                                </Badge>
                                <span className="text-sm font-medium">{merchant.companyName}</span>
                              </div>
                              <span className="text-xs text-gray-500">
                                {new Date(merchant.completedAt).toLocaleDateString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

