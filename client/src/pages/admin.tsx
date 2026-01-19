import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import Header from "@/components/layout/header";
import ReviewQueue from "@/components/admin/review-queue";
import AdminOverview from "@/components/admin/admin-overview";
import MerchantApplicationsList from "@/components/admin/merchant-applications-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Users as UsersIcon, UserPlus, Settings as SettingsIcon, Key, Mail, Smartphone, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import AddAdminForm from "@/components/admin/add-admin-form";
import AddAgentForm from "@/components/admin/add-agent-form";
import { MfaSettings } from "@/components/MfaSettings";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
  mfaEnabled?: boolean;
  mfaEmailEnabled?: boolean;
}

export default function Admin() {
  const [location] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentTab, setCurrentTab] = useState<string>("dashboard");
  const [showAddAdminForm, setShowAddAdminForm] = useState(false);
  const [showAddAgentForm, setShowAddAgentForm] = useState(false);

  // Fetch all users for the Users tab
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/users");
      return response.json();
    },
    enabled: !!user && user.role === 'ADMIN',
  });

  // Listen to hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) || "dashboard";
      setCurrentTab(hash);
    };
    
    // Set initial tab from hash
    handleHashChange();
    
    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'ADMIN')) {
      toast({
        title: "Unauthorized",
        description: "Admin access required.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, user, toast]);

  if (isLoading || !isAuthenticated || user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#2563EB] border-t-transparent mx-auto mb-4"></div>
          <p className="text-sm text-gray-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Get title and subtitle based on current tab
  const getTabTitle = () => {
    switch (currentTab) {
      case 'dashboard':
        return { title: "Admin Dashboard", subtitle: "Overview of all companies, users, and pending documents" };
      case 'users':
        return { title: "User Management", subtitle: "Manage admin and agent accounts" };
      case 'applications':
        return { title: "Applications", subtitle: "View and manage all merchant applications" };
      case 'documents':
        return { title: "Document Review", subtitle: "Review and approve client documents" };
      case 'settings':
        return { title: "Admin Settings", subtitle: "Configure system settings and preferences" };
      default:
        return { title: "Admin Dashboard", subtitle: "Overview of all companies, users, and pending documents" };
    }
  };

  const { title, subtitle } = getTabTitle();

  const adminUsers = users.filter(u => u.role === 'ADMIN');
  const agentUsers = users.filter(u => u.role === 'AGENT');

  // Render content based on current tab
  const renderTabContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <AdminOverview />;
      
      case 'users':
        const clientUsers = users.filter(u => u.role === 'CLIENT');
        return (
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Admin Accounts Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      Administrator Accounts
                    </CardTitle>
                    <CardDescription>
                      Manage administrator accounts and permissions
                    </CardDescription>
                  </div>
                  <Button onClick={() => setShowAddAdminForm(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Admin
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {adminUsers.map((admin) => (
                    <div key={admin.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Shield className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{admin.firstName} {admin.lastName}</p>
                          <p className="text-sm text-gray-500">{admin.email}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            Created {new Date(admin.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{admin.role}</Badge>
                        {admin.mfaEnabled && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            MFA Enabled
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Agent Accounts Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <UsersIcon className="h-5 w-5 text-blue-600" />
                      Agent Accounts
                    </CardTitle>
                    <CardDescription>
                      Manage agent accounts and their access
                    </CardDescription>
                  </div>
                  <Button onClick={() => setShowAddAgentForm(true)} variant="outline">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Agent
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {agentUsers.length > 0 ? (
                    agentUsers.map((agent) => (
                      <div key={agent.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
                            <UsersIcon className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{agent.firstName} {agent.lastName}</p>
                            <p className="text-sm text-gray-500">{agent.email}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              Created {new Date(agent.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                            {agent.role}
                          </Badge>
                          {agent.mfaEnabled && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              MFA Enabled
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-8">No agent accounts yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Client User Accounts Section */}
            <Card>
              <CardHeader>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <UsersIcon className="h-5 w-5 text-purple-600" />
                    Client User Accounts
                  </CardTitle>
                  <CardDescription>
                    Standard user accounts for merchants and businesses
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {clientUsers.length > 0 ? (
                    clientUsers.map((client) => (
                      <div key={client.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center">
                            <UsersIcon className="h-5 w-5 text-purple-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{client.firstName} {client.lastName}</p>
                            <p className="text-sm text-gray-500">{client.email}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              Created {new Date(client.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-purple-50 text-purple-700">
                            {client.role}
                          </Badge>
                          {client.mfaEnabled && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              MFA Enabled
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-8">No client accounts yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Add Admin Form Dialog */}
            <AddAdminForm open={showAddAdminForm} onOpenChange={setShowAddAdminForm} />
            
            {/* Add Agent Form Dialog */}
            <AddAgentForm open={showAddAgentForm} onOpenChange={setShowAddAgentForm} />
          </div>
        );
      
      case 'applications':
        return (
          <div className="max-w-7xl mx-auto">
            <MerchantApplicationsList />
          </div>
        );
      
      case 'documents':
        return <ReviewQueue />;
      
      case 'settings':
        return (
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Profile Information */}
            <Card className="bg-white border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md transition-all">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#2563EB]/10 rounded-lg flex items-center justify-center">
                    <Shield className="h-5 w-5 text-[#2563EB]" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold">Your Admin Profile</CardTitle>
                    <CardDescription className="text-sm text-gray-500">
                      Your administrator account information
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="text-sm">{user?.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Role</label>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      <p className="text-sm font-medium">Administrator</p>
                    </div>
                  </div>
                  {user?.firstName && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">First Name</label>
                      <p className="text-sm">{user.firstName}</p>
                    </div>
                  )}
                  {user?.lastName && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Last Name</label>
                      <p className="text-sm">{user.lastName}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Security Settings */}
            <MfaSettings />

            {/* Account Activity */}
            <Card className="bg-white border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md transition-all">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#2563EB]/10 rounded-lg flex items-center justify-center">
                    <Key className="h-5 w-5 text-[#2563EB]" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold">Account Activity</CardTitle>
                    <CardDescription className="text-sm text-gray-500">
                      Recent account activity and login history
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    {user?.createdAt && <p>Account created: {new Date(user.createdAt).toLocaleDateString()}</p>}
                    {user?.updatedAt && (
                      <p>Last updated: {new Date(user.updatedAt).toLocaleDateString()}</p>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    For detailed activity logs, visit the{" "}
                    <a href="/activity" className="text-primary hover:underline">
                      Activity page
                    </a>
                    .
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      
      default:
        return <AdminOverview />;
    }
  };

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
          title={title}
          subtitle={subtitle}
        />
        
        <main className="flex-1 overflow-auto p-6 lg:p-8 bg-gray-50/50">
          {renderTabContent()}
        </main>
      </div>
    </div>
  );
}
