import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Settings as SettingsIcon, User, Shield, Bell, Key } from "lucide-react";
import { MfaSettings } from "@/components/MfaSettings";

export default function SettingsPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Please log in to access settings.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Account Settings</h1>
            <p className="text-muted-foreground">
              Manage your account preferences and security settings
            </p>
          </div>
        </div>

        <Separator />

        <div className="grid gap-8">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <User className="h-6 w-6 text-primary" />
                <div>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Your basic account information
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
                  <p className="text-sm capitalize">{user.role?.toLowerCase()}</p>
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
                {user.companyName && (
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">Company</label>
                    <p className="text-sm">{user.companyName}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <MfaSettings />

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

          {/* Notifications */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Bell className="h-6 w-6 text-primary" />
                <div>
                  <CardTitle>Notifications</CardTitle>
                  <CardDescription>
                    Email notification preferences
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <p>✅ Document upload confirmations</p>
                  <p>✅ Document status updates</p>
                  <p>✅ Security alerts</p>
                  <p>✅ Account activity notifications</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Email notifications are currently managed automatically based on your account activity.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
