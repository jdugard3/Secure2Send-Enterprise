import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Users, UserPlus, Settings as SettingsIcon, Key, Mail, Smartphone, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MfaSettings } from "@/components/MfaSettings";
import AddAdminForm from "@/components/admin/add-admin-form";
import AddAgentForm from "@/components/admin/add-agent-form";
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

export default function AdminSettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showAddAdminForm, setShowAddAdminForm] = useState(false);
  const [showAddAgentForm, setShowAddAgentForm] = useState(false);

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
  const agentUsers = users?.filter(u => u.role === 'AGENT') || [];

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
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Your Admin Profile</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 mb-1">Email</p>
                  <p className="font-medium text-gray-900">{user.email}</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Role</p>
                  <p className="font-medium text-gray-900">Administrator</p>
                </div>
                {user.firstName && (
                  <div>
                    <p className="text-gray-600 mb-1">First Name</p>
                    <p className="font-medium text-gray-900">{user.firstName}</p>
                  </div>
                )}
                {user.lastName && (
                  <div>
                    <p className="text-gray-600 mb-1">Last Name</p>
                    <p className="font-medium text-gray-900">{user.lastName}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Security Settings */}
            <MfaSettings />

            {/* Administrator Management */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Administrator Accounts</h3>
                  <p className="text-xs text-gray-500 mt-1">Total: {adminUsers.length}</p>
                </div>
                <Button 
                  onClick={() => setShowAddAdminForm(true)}
                  size="sm"
                  variant="outline"
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  Add Admin
                </Button>
              </div>
              
              {adminUsers.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-500">
                  <p>No administrators found</p>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
                  {adminUsers.map((admin) => (
                    <div 
                      key={admin.id} 
                      className="p-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="h-8 w-8 rounded bg-gray-100 flex items-center justify-center">
                          <Shield className="h-4 w-4 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {admin.firstName} {admin.lastName}
                            {admin.id === user.id && (
                              <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">You</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500">{admin.email}</p>
                        </div>
                      </div>
                      <div className="text-right text-xs text-gray-500">
                        <p>{new Date(admin.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Agent Management */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Agent Accounts</h3>
                  <p className="text-xs text-gray-500 mt-1">Total: {agentUsers.length}</p>
                </div>
                <Button 
                  onClick={() => setShowAddAgentForm(true)}
                  size="sm"
                  variant="outline"
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  Add Agent
                </Button>
              </div>
              
              {agentUsers.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-500">
                  <p>No agents found</p>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
                  {agentUsers.map((agent) => (
                    <div 
                      key={agent.id} 
                      className="p-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="h-8 w-8 rounded bg-gray-100 flex items-center justify-center">
                          <UserCheck className="h-4 w-4 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {agent.firstName} {agent.lastName}
                          </p>
                          <p className="text-xs text-gray-500">{agent.email}</p>
                        </div>
                      </div>
                      <div className="text-right text-xs text-gray-500">
                        <p>{new Date(agent.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Account Activity */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Account Activity</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-gray-600">Account created</p>
                  <p className="font-medium text-gray-900">{new Date(user.createdAt!).toLocaleDateString()}</p>
                </div>
                {user.updatedAt && (
                  <div>
                    <p className="text-gray-600">Last updated</p>
                    <p className="font-medium text-gray-900">{new Date(user.updatedAt).toLocaleDateString()}</p>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-3">
                  For detailed activity logs, visit the{" "}
                  <a href="/activity" className="text-[#2563EB] hover:underline">
                    Activity page
                  </a>
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Add Admin Form Dialog */}
      <AddAdminForm 
        open={showAddAdminForm} 
        onOpenChange={setShowAddAdminForm} 
      />

      {/* Add Agent Form Dialog */}
      <AddAgentForm 
        open={showAddAgentForm} 
        onOpenChange={setShowAddAgentForm} 
      />
    </div>
  );
}

