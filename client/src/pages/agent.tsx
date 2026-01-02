import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Users, FileText, Clock, CheckCircle, AlertCircle, ArrowRight, Plus, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CreateInvitationCodeForm from "@/components/agent/create-invitation-code-form";
import CreateUserForm from "@/components/agent/create-user-form";

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
  documentStatuses?: Array<{ type: string; status: string }>;
}

interface InvitationCode {
  id: string;
  code: string;
  label: string;
  status: string;
  createdAt: string;
  usedAt?: string;
}

export default function Agent() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showCreateInvitationCode, setShowCreateInvitationCode] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);

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
    
    // Check if MFA setup is required
    if (user?.mfaRequired && !user?.mfaEnabled && !user?.mfaEmailEnabled) {
      navigate("/mfa-setup");
      return;
    }
  }, [isAuthenticated, isLoading, user, toast, navigate]);

  // Fetch merchants in onboarding (only if MFA is set up)
  const { data: onboardingMerchants, isLoading: merchantsLoading } = useQuery({
    queryKey: ["/api/agent/onboarding-merchants"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/agent/onboarding-merchants");
      if (!response.ok) {
        throw new Error("Failed to fetch onboarding merchants");
      }
      return response.json() as Promise<MerchantOnboarding[]>;
    },
    enabled: isAuthenticated && user?.role === 'AGENT' && !!(user?.mfaEnabled || user?.mfaEmailEnabled),
  });

  // Fetch invitation codes created by this agent
  const { data: invitationCodes, isLoading: codesLoading } = useQuery({
    queryKey: ["/api/agent/invitation-codes"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/agent/invitation-codes");
      if (!response.ok) {
        throw new Error("Failed to fetch invitation codes");
      }
      return response.json() as Promise<InvitationCode[]>;
    },
    enabled: isAuthenticated && user?.role === 'AGENT' && !!(user?.mfaEnabled || user?.mfaEmailEnabled),
  });

  // Check if MFA setup is required - redirect immediately
  if (user?.mfaRequired && !user?.mfaEnabled && !user?.mfaEmailEnabled) {
    navigate("/mfa-setup");
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#2563EB] border-t-transparent mx-auto mb-4"></div>
          <p className="text-sm text-gray-500 font-medium">Redirecting to MFA setup...</p>
        </div>
      </div>
    );
  }

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
            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button onClick={() => setShowCreateInvitationCode(true)}>
                <KeyRound className="h-4 w-4 mr-2" />
                Create Invitation Code
              </Button>
              <Button variant="outline" onClick={() => setShowCreateUser(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Merchant User
              </Button>
            </div>

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
                          {merchant.documentStatuses && merchant.documentStatuses.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {merchant.documentStatuses.map((doc, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {doc.type}: {doc.status}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            Started: {new Date(merchant.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigate(`/agent/merchants/${merchant.id}`);
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

            {/* Invitation Codes */}
            <Card>
              <CardHeader>
                <CardTitle>My Invitation Codes</CardTitle>
                <CardDescription>
                  Invitation codes you've created for merchants
                </CardDescription>
              </CardHeader>
              <CardContent>
                {codesLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-4"></div>
                    <p className="text-sm text-gray-500">Loading invitation codes...</p>
                  </div>
                ) : !invitationCodes || invitationCodes.length === 0 ? (
                  <div className="text-center py-8">
                    <KeyRound className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-gray-500 mb-4">No invitation codes created yet</p>
                    <Button onClick={() => setShowCreateInvitationCode(true)} variant="outline">
                      <KeyRound className="h-4 w-4 mr-2" />
                      Create Your First Code
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {invitationCodes.map((code) => (
                      <div
                        key={code.id}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <code className="font-mono font-semibold text-lg">{code.code}</code>
                            <Badge variant={code.status === 'USED' ? 'secondary' : code.status === 'EXPIRED' ? 'destructive' : 'default'}>
                              {code.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">{code.label}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Created: {new Date(code.createdAt).toLocaleDateString()}
                            {code.usedAt && ` • Used: ${new Date(code.usedAt).toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Dialogs */}
      <CreateInvitationCodeForm 
        open={showCreateInvitationCode} 
        onOpenChange={setShowCreateInvitationCode} 
      />
      <CreateUserForm 
        open={showCreateUser} 
        onOpenChange={setShowCreateUser} 
      />
    </div>
  );
}

