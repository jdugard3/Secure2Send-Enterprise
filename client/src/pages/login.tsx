import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Shield, Eye, EyeOff, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { loginSchema, type LoginData } from "@shared/schema";
import { MfaVerificationDual } from "@/components/MfaVerificationDual";

export default function Login() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [mfaChallenge, setMfaChallenge] = useState<{
    userId: string;
    email: string;
    mfaTotp?: boolean;
    mfaEmail?: boolean;
  } | null>(null);
  const { toast } = useToast();

  const form = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginData) => {
      const response = await apiRequest("POST", "/api/login", data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.mfaRequired) {
        // MFA challenge required
        setMfaChallenge({
          userId: data.userId,
          email: data.email,
          mfaTotp: data.mfaTotp,
          mfaEmail: data.mfaEmail,
        });
        toast({
          title: "MFA Required",
          description: "Please verify your identity with multi-factor authentication.",
        });
      } else if (data.mfaSetupRequired) {
        // MFA setup required for new users
        queryClient.setQueryData(["/api/auth/user"], data);
        toast({
          title: "Security Setup Required",
          description: "Please set up multi-factor authentication to secure your account.",
          variant: "default",
        });
        navigate("/mfa-setup");
      } else {
        // Normal login success
        queryClient.setQueryData(["/api/auth/user"], data);
        toast({
          title: "Login Successful",
          description: "Welcome back to Secure2Send!",
        });
        // Check if there's a redirect path stored from session timeout
        const redirectPath = sessionStorage.getItem('redirectAfterLogin');
        if (redirectPath) {
          sessionStorage.removeItem('redirectAfterLogin');
          navigate(redirectPath);
        } else {
          navigate("/");
        }
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      // Check if there's a redirect path stored from session timeout
      const redirectPath = sessionStorage.getItem('redirectAfterLogin');
      if (redirectPath) {
        sessionStorage.removeItem('redirectAfterLogin');
        navigate(redirectPath);
      } else {
        navigate("/");
      }
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Show session timeout message if user was redirected here
  useEffect(() => {
    const redirectPath = sessionStorage.getItem('redirectAfterLogin');
    if (redirectPath && !isAuthenticated) {
      toast({
        title: "Session Expired",
        description: "Your session has timed out. Please log in again to continue.",
        variant: "default",
      });
    }
  }, [toast, isAuthenticated]);

  const onSubmit = (data: LoginData) => {
    loginMutation.mutate(data);
  };

  const handleMfaSuccess = (userData: any) => {
    queryClient.setQueryData(["/api/auth/user"], userData);
    toast({
      title: "Login Successful",
      description: "Welcome back to Secure2Send!",
    });
    // Check if there's a redirect path stored from session timeout
    const redirectPath = sessionStorage.getItem('redirectAfterLogin');
    if (redirectPath) {
      sessionStorage.removeItem('redirectAfterLogin');
      navigate(redirectPath);
    } else {
      navigate("/");
    }
  };

  const handleMfaCancel = () => {
    setMfaChallenge(null);
    form.reset();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show MFA verification if challenge is active
  if (mfaChallenge) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          {/* Logo and Header */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Shield className="h-12 w-12 text-primary mr-3" />
              <h1 className="text-3xl font-bold text-gray-900">Secure2Send</h1>
            </div>
            <p className="text-gray-600">
              Professional Document Management
            </p>
          </div>

          <MfaVerificationDual
            userId={mfaChallenge.userId}
            email={mfaChallenge.email}
            mfaTotp={mfaChallenge.mfaTotp}
            mfaEmail={mfaChallenge.mfaEmail}
            onVerificationSuccess={handleMfaSuccess}
            onCancel={handleMfaCancel}
          />

          {/* Additional Info */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Need help? Contact support at{" "}
              <a href="mailto:support@secure2send.com" className="text-primary hover:underline">
                support@secure2send.com
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Header */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-12 w-12 text-primary mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">Secure2Send</h1>
          </div>
          <p className="text-gray-600">
            Professional Document Management
          </p>
        </div>

        {/* Login Card */}
        <Card className="bg-white shadow-xl border-0">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Welcome Back</CardTitle>
            <CardDescription className="text-center">
              Sign in to access your compliance dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Features List */}
            <div className="space-y-3">
              <div className="flex items-center text-sm text-gray-600">
                <CheckCircle className="h-4 w-4 text-green-500 mr-3" />
                Secure document upload and storage
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <CheckCircle className="h-4 w-4 text-green-500 mr-3" />
                Real-time compliance tracking
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <CheckCircle className="h-4 w-4 text-green-500 mr-3" />
                Admin review and approval system
              </div>
            </div>

            {/* Login Form */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="Enter your email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={loginMutation.isPending}
                  className="w-full bg-primary hover:bg-primary/90 text-white py-3 text-lg font-medium"
                  size="lg"
                >
                  {loginMutation.isPending ? "Signing In..." : "Sign In"}
                </Button>
              </form>
            </Form>

            {/* Signup Link */}
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{" "}
                <Link href="/signup" className="text-primary hover:underline font-medium">
                  Create one here
                </Link>
              </p>
            </div>

            {/* Info Text */}
            <p className="text-xs text-gray-500 text-center">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Need help? Contact support at{" "}
            <a href="mailto:support@secure2send.com" className="text-primary hover:underline">
              support@secure2send.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}