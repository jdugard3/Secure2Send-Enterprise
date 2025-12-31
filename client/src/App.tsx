import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import ErrorBoundary from "@/components/ErrorBoundary";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import Home from "@/pages/home";
import Admin from "@/pages/admin";
import AdminSettings from "@/pages/admin-settings";
import Agent from "@/pages/agent";
import AgentMerchantDetail from "@/pages/agent-merchant-detail";
import Documents from "@/pages/documents";
import MerchantApplications from "@/pages/merchant-applications";
import Activity from "@/pages/activity";
import SettingsPage from "@/pages/settings";
import MfaSetupPage from "@/pages/mfa-setup";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/login" component={Login} />
          <Route path="/signup" component={Signup} />
          <Route path="/forgot-password" component={ForgotPassword} />
          <Route path="/reset-password" component={ResetPassword} />
        </>
      ) : (
        <>
          <Route path="/mfa-setup" component={MfaSetupPage} />
          <Route path="/" component={Home} />
          <Route path="/documents" component={Documents} />
          <Route path="/merchant-applications" component={MerchantApplications} />
          <Route path="/activity" component={Activity} />
          <Route path="/settings" component={SettingsPage} />
          {user?.role === 'ADMIN' && (
            <>
              <Route path="/admin" component={Admin} />
              <Route path="/admin/documents" component={Admin} />
              <Route path="/admin/settings" component={AdminSettings} />
            </>
          )}
          {user?.role === 'AGENT' && (
            <>
              <Route path="/agent" component={Agent} />
              <Route path="/agent/merchants/:merchantId" component={AgentMerchantDetail} />
            </>
          )}
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
