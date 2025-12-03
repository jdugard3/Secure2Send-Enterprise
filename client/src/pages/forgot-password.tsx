import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Shield, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const { toast } = useToast();
  const [emailSent, setEmailSent] = useState(false);

  const form = useForm<ForgotPasswordData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordData) => {
      const response = await apiRequest("POST", "/api/forgot-password", data);
      return response.json();
    },
    onSuccess: (data) => {
      setEmailSent(true);
      toast({
        title: "Email Sent",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ForgotPasswordData) => {
    forgotPasswordMutation.mutate(data);
  };

  if (emailSent) {
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
            <CardHeader className="pb-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</CardTitle>
              <CardDescription className="text-gray-600 text-base">
                If an account exists with that email address, we've sent password reset instructions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-[#2563EB] mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold text-blue-900 mb-1">What to do next:</p>
                    <ul className="text-blue-700 space-y-1 list-disc list-inside">
                      <li>Check your inbox for an email from Secure2Send</li>
                      <li>Click the password reset link in the email</li>
                      <li>The link will expire in 60 minutes for security</li>
                      <li>Check your spam folder if you don't see the email</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="text-center space-y-4">
                <Link href="/login">
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Login
                  </Button>
                </Link>

                <p className="text-sm text-gray-600">
                  Didn't receive an email?{" "}
                  <button
                    onClick={() => setEmailSent(false)}
                    className="text-[#2563EB] hover:text-[#1D4ED8] hover:underline font-semibold"
                  >
                    Try again
                  </button>
                </p>
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
            <CardTitle className="text-2xl font-bold text-gray-900 mb-2">Reset Your Password</CardTitle>
            <CardDescription className="text-gray-600 text-base">
              Enter your email address and we'll send you instructions to reset your password.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-900">Email address</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <Input
                            type="email"
                            placeholder="you@company.com"
                            className="h-11 border-2 border-gray-300 focus:border-[#2563EB] focus:ring-[#2563EB] pl-11 text-base"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={forgotPasswordMutation.isPending}
                  className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white h-11 text-base font-semibold shadow-md"
                >
                  {forgotPasswordMutation.isPending ? "Sending..." : "Send Reset Instructions"}
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
              <Link href="/login">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Login
                </Button>
              </Link>
            </div>

            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold text-amber-900 mb-1">Security Note</p>
                  <p className="text-amber-700">
                    For your security, password reset links expire after 60 minutes and can only be used once.
                  </p>
                </div>
              </div>
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










