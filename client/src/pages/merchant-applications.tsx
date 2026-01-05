import { useAuth } from "@/hooks/useAuth";
import { useApplicationContext } from "@/contexts/ApplicationContext";
import { useState, useRef } from "react";
import Sidebar from "@/components/layout/sidebar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import Header from "@/components/layout/header";
import MerchantApplicationWizard from "@/components/merchant-application/MerchantApplicationWizard";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";

export default function MerchantApplicationsPage() {
  const { user } = useAuth();
  const { currentApplication } = useApplicationContext();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const pendingDataRef = useRef<any>(null);

  // Track unsaved changes for browser warning
  useUnsavedChanges({
    hasUnsavedChanges,
    message: "You have unsaved changes in your application. Are you sure you want to leave?"
  });

  const handleFormChange = (isDirty: boolean, formData?: any) => {
    setHasUnsavedChanges(isDirty);
    if (formData) {
      pendingDataRef.current = formData;
    }
  };

  const getPendingData = () => {
    return pendingDataRef.current;
  };

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
          hasUnsavedChanges={hasUnsavedChanges}
          onGetPendingData={getPendingData}
        />
        
        <main className="flex-1 overflow-auto p-6">
          {currentApplication ? (
            <MerchantApplicationWizard 
              applicationId={currentApplication.id}
              onboardingMode="full"
              onFormChange={handleFormChange}
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

