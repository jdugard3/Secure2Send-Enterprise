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

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header 
          title="Admin Settings"
          subtitle="Manage administrator accounts and system preferences"
        />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Profile Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Shield className="h-6 w-6 text-primary" />
                  <div>
                    <CardTitle>Your Admin Profile</CardTitle>
                    <CardDescription>
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
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Users className="h-6 w-6 text-primary" />
                    <div>
                      <CardTitle>Administrator Accounts</CardTitle>
                      <CardDescription>
                        Manage system administrator accounts
                      </CardDescription>
                    </div>
                  </div>
                  <Button onClick={() => setShowAddAdminForm(true)}>
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
                  
                  <div className="border rounded-lg divide-y">
                    {adminUsers.map((admin) => (
                      <div 
                        key={admin.id} 
                        className="p-4 flex items-center justify-between hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Shield className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {admin.firstName} {admin.lastName}
                              {admin.id === user.id && (
                                <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">You</span>
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground">{admin.email}</p>
                          </div>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <p>Added {new Date(admin.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mt-4">
                    <div className="flex gap-2">
                      <SettingsIcon className="h-5 w-5 text-blue-700 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">Admin Account Security</p>
                        <p>All administrator accounts are required to set up multi-factor authentication (MFA) for enhanced security. New admins will be prompted to configure MFA on their first login.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Account Activity */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Key className="h-6 w-6 text-primary" />
                  <div>
                    <CardTitle>Account Activity</CardTitle>
                    <CardDescription>
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

