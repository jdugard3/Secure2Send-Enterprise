import { useAuth } from "@/hooks/useAuth";
import { useApplicationContext } from "@/contexts/ApplicationContext";
import { useState } from "react";
import Sidebar from "@/components/layout/sidebar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import Header from "@/components/layout/header";
import MerchantApplicationWizard from "@/components/merchant-application/MerchantApplicationWizard";

export default function MerchantApplicationsPage() {
  const { user } = useAuth();
  const { currentApplication } = useApplicationContext();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      <MobileSidebar />
      
      <div className="hidden lg:block">
        <Sidebar 
          isCollapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Merchant Application"
          subtitle="Complete your merchant application"
          showApplicationSwitcher={true}
        />
        
        <main className="flex-1 overflow-auto p-6">
          {currentApplication ? (
            <MerchantApplicationWizard 
              applicationId={currentApplication.id}
              onboardingMode="full"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-gray-600 mb-4">
                  Use the application switcher above to select or create an application.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

