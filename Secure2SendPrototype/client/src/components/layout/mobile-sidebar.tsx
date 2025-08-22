import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { 
  Shield, 
  BarChart3, 
  FileUp, 
  History, 
  Users, 
  ClipboardCheck,
  LogOut,
  ChevronDown,
  UserCheck,
  Menu
} from "lucide-react";
import type { User } from "@shared/schema";

export function MobileSidebar() {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  // Query to get all users for admin impersonation
  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const response = await fetch("/api/admin/users", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    enabled: user?.role === 'ADMIN' || user?.isImpersonating,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/logout");
      return response.json();
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      // Navigate to the landing page
      navigate("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Logout Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const impersonateMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("POST", "/api/admin/impersonate", { userId });
      return response.json();
    },
    onSuccess: (adminWithImpersonation) => {
      queryClient.setQueryData(["/api/auth/user"], adminWithImpersonation);
      toast({
        title: "User Switched",
        description: `Now viewing as ${adminWithImpersonation.impersonatedUser?.firstName} ${adminWithImpersonation.impersonatedUser?.lastName}`,
      });
      // Navigate to client home page after successful impersonation
      navigate("/");
      setOpen(false); // Close mobile sidebar
    },
    onError: (error: Error) => {
      toast({
        title: "Switch Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const stopImpersonationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/stop-impersonate");
      return response.json();
    },
    onSuccess: (adminUser) => {
      queryClient.setQueryData(["/api/auth/user"], adminUser);
      toast({
        title: "Returned to Admin",
        description: "Now viewing as admin account",
      });
      // Navigate back to admin dashboard after returning from impersonation
      navigate("/admin");
      setOpen(false); // Close mobile sidebar
    },
    onError: (error: Error) => {
      toast({
        title: "Return Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const clientItems = [
    { label: "Home", href: "/", icon: BarChart3, roles: ["CLIENT"] },
    { label: "Documents", href: "/documents", icon: FileUp, roles: ["CLIENT"] },
    { label: "Activity", href: "/activity", icon: History, roles: ["CLIENT"] },
  ];

  const adminItems = [
    { label: "Admin Dashboard", href: "/admin", icon: Users, roles: ["ADMIN"] },
    { label: "Document Review", href: "/admin/documents", icon: ClipboardCheck, roles: ["ADMIN"] },
  ];

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return "U";
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  const filteredClientItems = clientItems.filter(item => 
    item.roles.includes(user?.role || "CLIENT")
  );
  const filteredAdminItems = adminItems.filter(item => 
    item.roles.includes(user?.role || "CLIENT")
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="fixed top-4 left-4 z-50 lg:hidden bg-white shadow-md"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-64">
        <div className="flex flex-col h-full bg-white">
          {/* Logo */}
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-primary">Secure2Send</h1>
            <p className="text-sm text-gray-600">Cannabis Compliance</p>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 px-4 py-6">
            {/* Client Section */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 px-3">
                Dashboard
              </p>
              {filteredClientItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={isActive(item.href) ? "default" : "ghost"}
                      className={`w-full justify-start ${
                        isActive(item.href) 
                          ? "bg-blue-50 text-primary border-r-2 border-primary" 
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                      onClick={() => setOpen(false)}
                    >
                      <Icon className="mr-3 h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </div>

            {/* Admin Section */}
            {filteredAdminItems.length > 0 && (
              <div className="pt-4 border-t border-gray-200 mt-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 px-3">
                  Admin Tools
                </p>
                {filteredAdminItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.href} href={item.href}>
                      <Button
                        variant={isActive(item.href) ? "default" : "ghost"}
                        className={`w-full justify-start ${
                          isActive(item.href) 
                            ? "bg-blue-50 text-primary border-r-2 border-primary" 
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                        onClick={() => setOpen(false)}
                      >
                        <Icon className="mr-3 h-4 w-4" />
                        {item.label}
                      </Button>
                    </Link>
                  );
                })}
              </div>
            )}
          </nav>
          
          {/* User Profile */}
          <div className="p-4 border-t border-gray-200">
            {/* Admin User Switcher - show for admins or when impersonating */}
            {(user?.role === 'ADMIN' || user?.isImpersonating) && (
              <div className="mb-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between text-xs">
                      <div className="flex items-center">
                        <UserCheck className="h-3 w-3 mr-2" />
                        Switch User
                      </div>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="start">
                    {user?.isImpersonating ? (
                      // When impersonating, only show return to admin option
                      <DropdownMenuItem
                        onClick={() => stopImpersonationMutation.mutate()}
                        disabled={stopImpersonationMutation.isPending}
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        Return to Admin
                      </DropdownMenuItem>
                    ) : (
                      // When admin, show user list
                      <>
                        {allUsers.filter(u => u.role === 'CLIENT').map((clientUser) => (
                          <DropdownMenuItem
                            key={clientUser.id}
                            onClick={() => impersonateMutation.mutate(clientUser.id)}
                            disabled={impersonateMutation.isPending}
                          >
                            <div className="flex items-center w-full">
                              <Avatar className="h-6 w-6 mr-2">
                                <AvatarFallback className="text-xs">
                                  {getInitials(clientUser.firstName || undefined, clientUser.lastName || undefined)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <p className="text-sm">{clientUser.firstName} {clientUser.lastName}</p>
                                <p className="text-xs text-muted-foreground">{clientUser.email}</p>
                              </div>
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            <div className="flex items-center">
              <Avatar className="h-8 w-8 mr-3">
                <AvatarFallback className="bg-primary text-white text-sm">
                  {getInitials(user?.firstName || undefined, user?.lastName || undefined)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {user?.role?.toLowerCase()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="text-gray-400 hover:text-gray-600"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}