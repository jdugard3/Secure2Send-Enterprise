import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import Header from "@/components/layout/header";
import ProgressCards from "@/components/dashboard/progress-cards";
import DocumentUpload from "@/components/documents/document-upload";
import DocumentList from "@/components/documents/document-list";

export default function Home() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const authFailureCount = useRef(0);
  const lastAuthCheck = useRef(Date.now());

  // Redirect admins to admin dashboard, or redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        const now = Date.now();
        // Only count as a failure if it's been more than 10 seconds since last check
        // This prevents counting initial loads or rapid re-renders as failures
        if (now - lastAuthCheck.current > 10000) {
          authFailureCount.current += 1;
        }
        lastAuthCheck.current = now;

        // Only redirect after multiple consecutive failures to avoid kicking users out on temporary issues
        if (authFailureCount.current >= 2) {
          toast({
            title: "Session Expired",
            description: "Your session has expired. Please log in again.",
            variant: "destructive",
          });
          setTimeout(() => {
            window.location.href = "/login";
          }, 1500); // Longer delay to allow user to see the message
        }
        return;
      } else {
        // Reset failure count on successful auth
        authFailureCount.current = 0;
      }
      
      // Redirect admins to the admin dashboard (unless they're impersonating)
      if (user?.role === 'ADMIN' && !user?.isImpersonating) {
        navigate("/admin");
        return;
      }
    }
  }, [isAuthenticated, isLoading, user, toast, navigate]);

  if (isLoading || !isAuthenticated || (user?.role === 'ADMIN' && !user?.isImpersonating)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#2563EB] border-t-transparent mx-auto mb-4"></div>
          <p className="text-sm text-gray-500 font-medium">Loading...</p>
        </div>
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
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Dashboard"
          subtitle="Manage your compliance documents"
        />
        
        <main className="flex-1 overflow-auto p-6 lg:p-8 bg-gray-50/50">
          <div className="max-w-7xl mx-auto space-y-6">
            <ProgressCards />
            
            <div>
              <DocumentUpload />
            </div>
            
            <DocumentList />
          </div>
        </main>
      </div>
    </div>
  );
}
