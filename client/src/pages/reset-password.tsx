import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Shield, Lock, Eye, EyeOff, CheckCircle2, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters long"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordData = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [token, setToken] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const form = useForm<ResetPasswordData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    // Extract token from URL query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    
    if (!tokenParam) {
      toast({
        title: "Invalid Link",
        description: "This password reset link is invalid. Please request a new one.",
        variant: "destructive",
      });
      // Redirect to forgot password page after a delay
      setTimeout(() => navigate('/forgot-password'), 3000);
    } else {
      setToken(tokenParam);
    }
  }, [navigate, toast]);

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordData) => {
      if (!token) {
        throw new Error("No reset token found");
      }
      const response = await apiRequest("POST", "/api/reset-password", {
        token,
        newPassword: data.newPassword,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setResetSuccess(true);
      toast({
        title: "Password Reset Successful",
        description: data.message,
      });
      // Redirect to login page after a delay
      setTimeout(() => navigate('/login'), 3000);
    },
    onError: (error: Error) => {
      toast({
        title: "Password Reset Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ResetPasswordData) => {
    resetPasswordMutation.mutate(data);
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#edf2ff] via-white to-white px-6 py-16">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-10">
            <div className="w-10 h-10 bg-[#2563EB] rounded-lg flex items-center justify-center">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-gray-900">Secure2Send</span>
              <p className="text-xs text-gray-500">Enterprise Platform</p>
            </div>
          </div>

          <Card className="bg-white border border-gray-200 shadow-lg">
            <CardHeader className="pb-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900 mb-2">Invalid Reset Link</CardTitle>
              <CardDescription className="text-gray-600 text-base">
                This password reset link is invalid or has expired.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <Link href="/forgot-password">
                  <Button className="w-full bg-[#2563EB] hover:bg-[#1D4ED8]">
                    Request New Reset Link
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (resetSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#edf2ff] via-white to-white px-6 py-16">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-10">
            <div className="w-10 h-10 bg-[#2563EB] rounded-lg flex items-center justify-center">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-gray-900">Secure2Send</span>
              <p className="text-xs text-gray-500">Enterprise Platform</p>
            </div>
          </div>

          <Card className="bg-white border border-gray-200 shadow-lg">
            <CardHeader className="pb-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900 mb-2">Password Reset Successful!</CardTitle>
              <CardDescription className="text-gray-600 text-base">
                Your password has been successfully changed. You can now log in with your new password.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-4">Redirecting you to the login page...</p>
                <Link href="/login">
                  <Button className="w-full bg-[#2563EB] hover:bg-[#1D4ED8]">
                    Go to Login
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#edf2ff] via-white to-white px-6 py-16">
      <div className="max-w-2xl mx-auto">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-10 h-10 bg-[#2563EB] rounded-lg flex items-center justify-center">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold text-gray-900">Secure2Send</span>
            <p className="text-xs text-gray-500">Enterprise Platform</p>
          </div>
        </div>

        <Card className="bg-white border border-gray-200 shadow-lg">
          <CardHeader className="pb-6">
            <div className="flex items-center gap-3 mb-2">
              <Lock className="h-6 w-6 text-[#2563EB]" />
              <CardTitle className="text-2xl font-bold text-gray-900">Create New Password</CardTitle>
            </div>
            <CardDescription className="text-gray-600 text-base">
              Please enter your new password. Make sure it's strong and secure.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-900">New Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your new password"
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
                      <p className="text-xs text-gray-500 mt-1">
                        Password must be at least 8 characters long
                      </p>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-900">Confirm New Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm your new password"
                            className="h-11 border-2 border-gray-300 focus:border-[#2563EB] focus:ring-[#2563EB] pr-12 text-base"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-gray-500 hover:text-gray-700"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? (
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

                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-[#2563EB] mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-semibold text-blue-900 mb-1">Password Requirements:</p>
                      <ul className="text-blue-700 space-y-1 list-disc list-inside text-xs">
                        <li>At least 8 characters long</li>
                        <li>Mix of letters, numbers, and symbols recommended</li>
                        <li>Avoid common words or personal information</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={resetPasswordMutation.isPending}
                  className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white h-11 text-base font-semibold shadow-md"
                >
                  {resetPasswordMutation.isPending ? "Resetting Password..." : "Reset Password"}
                </Button>
              </form>
            </Form>

            <div className="text-center">
              <Link href="/login">
                <Button variant="link" className="text-[#2563EB] hover:text-[#1D4ED8]">
                  Back to Login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Need help? <a href="mailto:support@secure2send.com" className="text-[#2563EB] hover:underline font-semibold">Contact support</a>
          </p>
        </div>
      </div>
    </div>
  );
}


















