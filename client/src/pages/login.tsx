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
import { Shield, Eye, EyeOff, CheckCircle, Lock, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { loginSchema, type LoginData } from "@shared/schema";
import { MfaVerificationDual } from "@/components/MfaVerificationDual";
import { Badge } from "@/components/ui/badge";

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
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#2563EB] border-t-transparent mx-auto mb-4"></div>
          <p className="text-base text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Show MFA verification if challenge is active
  if (mfaChallenge) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {/* Logo */}
          <div className="flex items-center justify-center mb-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#2563EB] rounded-lg flex items-center justify-center">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold text-gray-900">Secure2Send</span>
                <p className="text-xs text-gray-500">Enterprise Platform</p>
              </div>
            </div>
          </div>

          <Card className="bg-white border-2 border-gray-200 shadow-lg">
            <CardHeader className="pb-6">
              <div className="flex items-center gap-3 mb-2">
                <Lock className="h-6 w-6 text-[#2563EB]" />
                <CardTitle className="text-2xl font-bold text-gray-900">Multi-Factor Authentication</CardTitle>
              </div>
              <CardDescription className="text-gray-600 text-base">
                Please verify your identity to continue accessing your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MfaVerificationDual
                userId={mfaChallenge.userId}
                email={mfaChallenge.email}
                mfaTotp={mfaChallenge.mfaTotp}
                mfaEmail={mfaChallenge.mfaEmail}
                onVerificationSuccess={handleMfaSuccess}
                onCancel={handleMfaCancel}
              />
            </CardContent>
          </Card>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-[#2563EB] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-900 mb-1">Secure Verification</p>
                <p className="text-xs text-blue-700">
                  Your account is protected with enterprise-grade security. Need help? <a href="mailto:support@secure2send.com" className="text-[#2563EB] hover:underline font-medium">Contact support</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#edf2ff] via-white to-white px-6 py-16">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-5 gap-12">
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#2563EB] rounded-lg flex items-center justify-center">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-gray-900">Secure2Send</span>
              <p className="text-xs text-gray-500">Enterprise Platform</p>
            </div>
          </div>
          <div className="space-y-5">
            <Badge className="bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20 font-medium">
              Unified compliance operations
            </Badge>
            <h1 className="text-3xl lg:text-4xl font-semibold text-gray-900 tracking-tight leading-tight">
              Sign in to orchestrate secure document delivery and review.
            </h1>
            <p className="text-base text-gray-600 leading-relaxed">
              Centralize collaboration between compliance teams, partners, and regulators—without sacrificing speed or control.
            </p>
          </div>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
              SOC 2 aligned infrastructure with AES-256 encryption.
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
              Automated policy checks mapped to your program requirements.
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
              Real-time dashboards covering every outstanding submission.
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <Card className="bg-white border border-gray-200 shadow-lg">
            <CardHeader className="pb-6">
              <CardTitle className="text-2xl font-bold text-gray-900 mb-2">Welcome back</CardTitle>
              <CardDescription className="text-gray-600 text-base">
                Sign in to access your compliance dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-3">
                  <Lock className="h-5 w-5 text-[#2563EB] flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900">Enterprise security</p>
                    <p className="text-xs text-blue-700">Your session is protected with bank-level encryption and adaptive MFA.</p>
                  </div>
                </div>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-gray-900">Email address</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="you@company.com"
                            className="h-11 border-2 border-gray-300 focus:border-[#2563EB] focus:ring-[#2563EB] text-base"
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
                        <FormLabel className="text-sm font-semibold text-gray-900">Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="Enter your password"
                              className="h-11 border-2 border-gray-300 focus:border-[#2563EB] focus:ring-[#2563EB] pr-12 text-base"
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-gray-500 hover:text-gray-700"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-5 w-5" />
                              ) : (
                                <Eye className="h-5 w-5" />
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
                    className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white h-11 text-base font-semibold shadow-md"
                  >
                    {loginMutation.isPending ? "Signing in..." : "Sign in"}
                  </Button>
                </form>
              </Form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-gray-500 font-medium">Or</span>
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Don't have an account?{" "}
                  <Link href="/signup" className="text-[#2563EB] hover:text-[#1D4ED8] hover:underline font-semibold">
                    Sign up for free
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
              <Lock className="h-5 w-5 text-[#2563EB] mx-auto mb-2" />
              <p className="text-xs font-semibold text-gray-900">Secure</p>
            </div>
            <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
              <CheckCircle2 className="h-5 w-5 text-[#10B981] mx-auto mb-2" />
              <p className="text-xs font-semibold text-gray-900">Trusted</p>
            </div>
            <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
              <Shield className="h-5 w-5 text-[#2563EB] mx-auto mb-2" />
              <p className="text-xs font-semibold text-gray-900">Enterprise</p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Need help? <a href="mailto:support@secure2send.com" className="text-[#2563EB] hover:underline font-semibold">Contact support</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}