import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  SheetHeader,
  SheetTitle,
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
  Menu,
  ChevronLeft,
  ChevronRight,
  CreditCard
} from "lucide-react";
import type { User } from "@shared/schema";

interface SidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ isCollapsed = false, onToggle }: SidebarProps) {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

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
      // Clear the user data from the cache
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      // Navigate to the login page
      navigate("/login");
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
    },
    onError: (error: Error) => {
      toast({
        title: "Return Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return "U";
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  const navItems = [
    { href: "/", icon: BarChart3, label: "Overview", roles: ["CLIENT"] },
    { href: "/documents", icon: FileUp, label: "Documents", roles: ["CLIENT"] },
    { href: "/merchant-applications", icon: CreditCard, label: "Merchant Applications", roles: ["CLIENT"] },
    { href: "/activity", icon: History, label: "Activity", roles: ["CLIENT"] },
  ];

  const adminItems = [
    { href: "/admin", icon: Users, label: "All Clients", roles: ["ADMIN"] },
    { href: "/admin/documents", icon: ClipboardCheck, label: "Document Review", roles: ["ADMIN"] },
  ];

  const filteredNavItems = navItems.filter(item => 
    item.roles.includes(user?.role || "CLIENT")
  );

  const filteredAdminItems = adminItems.filter(item => 
    item.roles.includes(user?.role || "CLIENT")
  );

  const isActive = (href: string) => {
    if (href === "/" && location === "/") return true;
    if (href !== "/" && location.startsWith(href)) return true;
    return false;
  };

  return (
    <div className={`bg-white shadow-lg border-r border-gray-200 flex flex-col transition-all duration-300 relative ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Collapse Toggle */}
      <div className="absolute -right-3 top-6 z-10">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggle}
          className="h-6 w-6 rounded-full p-0 bg-white border shadow-md"
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </Button>
      </div>

      {/* Logo */}
      <div className={`p-6 border-b border-gray-200 ${isCollapsed ? 'px-3' : ''}`}>
        <div className="flex items-center">
          <Shield className={`h-8 w-8 text-primary ${isCollapsed ? '' : 'mr-3'}`} />
          {!isCollapsed && (
            <div>
              <h1 className="text-xl font-bold text-gray-900">Secure2Send</h1>
              <p className="text-xs text-gray-500">Compliance Platform</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive(item.href) ? "default" : "ghost"}
                className={`w-full ${isCollapsed ? 'justify-center px-2' : 'justify-start'} ${
                  isActive(item.href) 
                    ? "bg-blue-50 text-primary border-r-2 border-primary" 
                    : "text-gray-700 hover:bg-gray-100"
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={`h-4 w-4 ${!isCollapsed ? 'mr-3' : ''}`} />
                {!isCollapsed && item.label}
              </Button>
            </Link>
          );
        })}
        
        {/* Admin Section */}
        {filteredAdminItems.length > 0 && (
          <div className="pt-4 border-t border-gray-200 mt-4">
            {!isCollapsed && (
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 px-3">
                Admin Tools
              </p>
            )}
            {filteredAdminItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive(item.href) ? "default" : "ghost"}
                    className={`w-full ${isCollapsed ? 'justify-center px-2' : 'justify-start'} ${
                      isActive(item.href) 
                        ? "bg-blue-50 text-primary border-r-2 border-primary" 
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon className={`h-4 w-4 ${!isCollapsed ? 'mr-3' : ''}`} />
                    {!isCollapsed && item.label}
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
                {isCollapsed ? (
                  <Button variant="outline" size="sm" className="w-full p-2">
                    <UserCheck className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button variant="outline" className="w-full justify-between text-xs">
                    <div className="flex items-center">
                      <UserCheck className="h-3 w-3 mr-2" />
                      Switch User
                    </div>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                )}
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
                  // When admin, show user list and return option
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

        <div className={`flex items-center ${isCollapsed ? 'justify-center' : ''}`}>
          <Avatar className={`${isCollapsed ? 'h-8 w-8' : 'h-8 w-8 mr-3'}`}>
            <AvatarFallback className="bg-primary text-white text-sm">
              {getInitials(user?.firstName || undefined, user?.lastName || undefined)}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
