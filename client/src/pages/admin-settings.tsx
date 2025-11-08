import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Users, UserPlus, Settings as SettingsIcon, Key } from "lucide-react";
import { MfaSettings } from "@/components/MfaSettings";
import AddAdminForm from "@/components/admin/add-admin-form";
import { apiRequest } from "@/lib/queryClient";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
}

export default function AdminSettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showAddAdminForm, setShowAddAdminForm] = useState(false);

  // Fetch all users to show admin accounts
  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/users");
      return response.json();
    },
    enabled: !!user && user.role === 'ADMIN',
  });

  const adminUsers = users?.filter(u => u.role === 'ADMIN') || [];

  if (authLoading || usersLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Admin access required.</p>
      </div>
    );
  }

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

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header 
          title="Admin Settings"
          subtitle="Manage administrator accounts and system preferences"
        />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-gray-50/50">
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
                    <p className="text-sm">{user.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Role</label>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      <p className="text-sm font-medium">Administrator</p>
                    </div>
                  </div>
                  {user.firstName && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">First Name</label>
                      <p className="text-sm">{user.firstName}</p>
                    </div>
                  )}
                  {user.lastName && (
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

            {/* Administrator Management */}
            <Card className="bg-white border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md transition-all">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#2563EB]/10 rounded-lg flex items-center justify-center">
                      <Users className="h-5 w-5 text-[#2563EB]" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold">Administrator Accounts</CardTitle>
                      <CardDescription className="text-sm text-gray-500">
                        Manage system administrator accounts
                      </CardDescription>
                    </div>
                  </div>
                  <Button 
                    onClick={() => setShowAddAdminForm(true)}
                    className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Admin
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground mb-4">
                    <p>Total Administrators: {adminUsers.length}</p>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg divide-y divide-gray-200/50">
                    {adminUsers.map((admin) => (
                      <div 
                        key={admin.id} 
                        className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-[#2563EB]/10 flex items-center justify-center">
                            <Shield className="h-5 w-5 text-[#2563EB]" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {admin.firstName} {admin.lastName}
                              {admin.id === user.id && (
                                <span className="ml-2 text-xs bg-[#2563EB]/10 text-[#2563EB] px-2 py-1 rounded font-medium">You</span>
                              )}
                            </p>
                            <p className="text-sm text-gray-500">{admin.email}</p>
                          </div>
                        </div>
                        <div className="text-right text-sm text-gray-500 font-medium">
                          <p>Added {new Date(admin.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-[#2563EB]/5 border border-[#2563EB]/20 rounded-lg p-4 mt-4">
                    <div className="flex gap-3">
                      <SettingsIcon className="h-5 w-5 text-[#2563EB] flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-gray-700">
                        <p className="font-semibold mb-1 text-gray-900">Admin Account Security</p>
                        <p>All administrator accounts are required to set up multi-factor authentication (MFA) for enhanced security. New admins will be prompted to configure MFA on their first login.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

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
                    <p>Account created: {new Date(user.createdAt!).toLocaleDateString()}</p>
                    {user.updatedAt && (
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
        </main>
      </div>

      {/* Add Admin Form Dialog */}
      <AddAdminForm 
        open={showAddAdminForm} 
        onOpenChange={setShowAddAdminForm} 
      />
    </div>
  );
}

