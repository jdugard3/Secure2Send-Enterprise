import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

interface MerchantApplication {
  id: string;
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  legalBusinessName?: string;
  dbaBusinessName?: string;
  currentStep?: number;
  createdAt: string;
  updatedAt: string;
}

interface ApplicationContextType {
  currentApplication: MerchantApplication | null;
  allApplications: MerchantApplication[];
  isLoading: boolean;
  switchApplication: (applicationId: string, pendingData?: any) => Promise<void>;
  createNewApplication: () => Promise<void>;
  refreshApplications: () => void;
  getApplicationProgress: (app: MerchantApplication) => number;
  getApplicationDisplayName: (app: MerchantApplication) => string;
  saveCurrentApplicationData: (data: any) => Promise<void>;
}

const ApplicationContext = createContext<ApplicationContextType | undefined>(undefined);

export function ApplicationProvider({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [currentApplicationId, setCurrentApplicationId] = useState<string | null>(null);

  // Fetch all applications for the current user
  const { data: allApplications = [], isLoading, refetch } = useQuery<MerchantApplication[]>({
    queryKey: ["/api/merchant-applications", user?.id],
    queryFn: async () => {
      const response = await fetch("/api/merchant-applications", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!user?.id && isAuthenticated,
  });

  // Get current application from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const appIdFromUrl = params.get('applicationId') || params.get('id');
    
    if (appIdFromUrl) {
      setCurrentApplicationId(appIdFromUrl);
    } else if (allApplications.length > 0 && !currentApplicationId) {
      // Auto-select first draft application if none selected
      const firstDraft = allApplications.find(app => app.status === 'DRAFT');
      if (firstDraft) {
        setCurrentApplicationId(firstDraft.id);
      }
    }
  }, [allApplications, currentApplicationId]);

  // Update URL when current application changes
  useEffect(() => {
    if (currentApplicationId) {
      const params = new URLSearchParams(window.location.search);
      const currentUrlAppId = params.get('applicationId') || params.get('id');
      
      if (currentUrlAppId !== currentApplicationId) {
        params.set('applicationId', currentApplicationId);
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [currentApplicationId]);

  const currentApplication = allApplications.find(app => app.id === currentApplicationId) || null;

  const saveCurrentApplicationData = async (data: any) => {
    if (!currentApplicationId) {
      return;
    }

    try {
      const response = await fetch(`/api/merchant-applications/${currentApplicationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to save application data");
      }

      // Update cached data
      const updatedApp = await response.json();
      queryClient.setQueryData([`/api/merchant-applications/${currentApplicationId}`], updatedApp);
      queryClient.invalidateQueries({ queryKey: ["/api/merchant-applications"] });
    } catch (error) {
      console.error("Error saving application data:", error);
      throw error;
    }
  };

  const switchApplication = async (applicationId: string, pendingData?: any) => {
    // If there's pending data from the current application, save it first
    if (pendingData && currentApplicationId) {
      try {
        await saveCurrentApplicationData(pendingData);
      } catch (error) {
        console.error("Failed to auto-save before switching:", error);
        // Continue with switch even if save fails
      }
    }

    setCurrentApplicationId(applicationId);
    
    // Update URL to include the new application ID
    const params = new URLSearchParams(window.location.search);
    params.set('applicationId', applicationId);
    
    // Preserve current path, just update the query param
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({}, '', newUrl);
    
    // Invalidate queries to refresh data for the new application
    queryClient.invalidateQueries({ queryKey: [`/api/merchant-applications/${applicationId}`] });
    queryClient.invalidateQueries({ queryKey: ["/api/documents", applicationId] });
  };

  const createNewApplication = async () => {
    try {
      const response = await fetch("/api/merchant-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error("Failed to create application");
      }

      const newApp = await response.json();
      
      // Refresh applications list
      await refetch();
      
      // Switch to the new application
      switchApplication(newApp.id);
      
      // Navigate to the application wizard
      setLocation(`/merchant-applications?applicationId=${newApp.id}`);
    } catch (error) {
      console.error("Error creating application:", error);
      throw error;
    }
  };

  const refreshApplications = () => {
    refetch();
  };

  const getApplicationProgress = (app: MerchantApplication): number => {
    // Calculate progress based on currentStep (1-4 = 25%, 50%, 75%, 100%)
    if (app.status === 'SUBMITTED' || app.status === 'UNDER_REVIEW' || 
        app.status === 'APPROVED' || app.status === 'REJECTED') {
      return 100;
    }
    
    const step = app.currentStep || 1;
    return Math.min((step / 4) * 100, 100);
  };

  const getApplicationDisplayName = (app: MerchantApplication): string => {
    // Priority: dbaBusinessName > legalBusinessName > date-based name
    if (app.dbaBusinessName && !app.dbaBusinessName.includes('Application -')) {
      return app.dbaBusinessName;
    }
    if (app.legalBusinessName && !app.legalBusinessName.includes('Application -')) {
      return app.legalBusinessName;
    }
    // Return date-based name as fallback
    const date = new Date(app.createdAt);
    return `Application - ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  return (
    <ApplicationContext.Provider
      value={{
        currentApplication,
        allApplications,
        isLoading,
        switchApplication,
        createNewApplication,
        refreshApplications,
        getApplicationProgress,
        getApplicationDisplayName,
        saveCurrentApplicationData,
      }}
    >
      {children}
    </ApplicationContext.Provider>
  );
}

export function useApplicationContext() {
  const context = useContext(ApplicationContext);
  if (context === undefined) {
    throw new Error("useApplicationContext must be used within an ApplicationProvider");
  }
  return context;
}

