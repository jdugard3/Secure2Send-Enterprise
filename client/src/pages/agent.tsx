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
import { Users, FileText, Clock, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface MerchantOnboarding {
  id: string;
  userId: string;
  clientId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  onboardingStep: string;
  status: string;
  createdAt: string;
  merchantApplicationStatus?: string;
}

export default function Agent() {
  const [location] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'AGENT')) {
      toast({
        title: "Unauthorized",
        description: "Agent access required.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, user, toast]);

  // Fetch merchants in onboarding
  const { data: onboardingMerchants, isLoading: merchantsLoading } = useQuery({
    queryKey: ["/api/agent/onboarding-merchants"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/agent/onboarding-merchants");
      if (!response.ok) {
        throw new Error("Failed to fetch onboarding merchants");
      }
      return response.json() as Promise<MerchantOnboarding[]>;
    },
    enabled: isAuthenticated && user?.role === 'AGENT',
  });

  if (isLoading || !isAuthenticated || user?.role !== 'AGENT') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#2563EB] border-t-transparent mx-auto mb-4"></div>
          <p className="text-sm text-gray-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  const getOnboardingStepLabel = (step: string) => {
    const stepMap: Record<string, string> = {
      'PART1': 'Basic Information',
      'DOCUMENTS': 'Document Upload',
      'PART2': 'Application Details',
      'REVIEW': 'Review & Submit',
      'COMPLETE': 'Complete'
    };
    return stepMap[step] || step;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      'PENDING': { variant: 'secondary', label: 'Pending' },
      'APPROVED': { variant: 'default', label: 'Approved' },
      'REJECTED': { variant: 'destructive', label: 'Rejected' },
      'INCOMPLETE': { variant: 'outline', label: 'Incomplete' },
      'DRAFT': { variant: 'secondary', label: 'Draft' },
      'SUBMITTED': { variant: 'default', label: 'Submitted' },
      'UNDER_REVIEW': { variant: 'secondary', label: 'Under Review' },
    };
    const config = statusConfig[status] || { variant: 'outline' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const merchants = onboardingMerchants || [];
  const inProgressMerchants = merchants.filter(m => m.onboardingStep !== 'COMPLETE');
  const completedMerchants = merchants.filter(m => m.onboardingStep === 'COMPLETE');

  return (
    <div className="flex h-screen bg-white">
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
          title="Agent Portal"
          subtitle="Assist merchants with onboarding and application completion"
        />
        
        <main className="flex-1 overflow-auto p-6 lg:p-8 bg-gray-50/50">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Onboarding</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{inProgressMerchants.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Merchants in progress
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{completedMerchants.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Onboarding complete
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Merchants</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{merchants.length}</div>
                  <p className="text-xs text-muted-foreground">
                    All merchants
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Onboarding Merchants List */}
            <Card>
              <CardHeader>
                <CardTitle>Merchants Needing Assistance</CardTitle>
                <CardDescription>
                  Merchants currently in the onboarding process
                </CardDescription>
              </CardHeader>
              <CardContent>
                {merchantsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-4"></div>
                    <p className="text-sm text-gray-500">Loading merchants...</p>
                  </div>
                ) : inProgressMerchants.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-sm text-gray-500">No merchants currently in onboarding</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {inProgressMerchants.map((merchant) => (
                      <div
                        key={merchant.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-primary hover:shadow-md transition-all"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-900">
                              {merchant.companyName || `${merchant.firstName || ''} ${merchant.lastName || ''}`.trim() || merchant.email}
                            </h3>
                            {getStatusBadge(merchant.status)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {merchant.firstName} {merchant.lastName}
                            </span>
                            <span className="flex items-center gap-1">
                              <FileText className="h-4 w-4" />
                              Step: {getOnboardingStepLabel(merchant.onboardingStep)}
                            </span>
                            {merchant.merchantApplicationStatus && (
                              <span>
                                Application: {getStatusBadge(merchant.merchantApplicationStatus)}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Started: {new Date(merchant.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // TODO: Navigate to merchant detail view
                            toast({
                              title: "Merchant Details",
                              description: `Viewing details for ${merchant.companyName || merchant.email}`,
                            });
                          }}
                        >
                          View Details
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

