import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, FileCheck, Users, Clock, ArrowRight, CheckCircle2, Lock, TrendingUp, Award, Zap } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200/50 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-[#2563EB]" />
              <span className="text-base font-medium text-gray-900">Secure2Send</span>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                onClick={() => window.location.href = '/login'}
                variant="ghost"
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 h-9 px-4 text-sm font-medium"
              >
                Sign in
              </Button>
              <Button 
                onClick={() => window.location.href = '/signup'}
                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white h-9 px-4 text-sm font-medium shadow-sm"
              >
                Get started
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-24 pb-20 px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Content */}
            <div>
              <Badge className="mb-6 bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20 font-medium">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Trusted by enterprise businesses
              </Badge>
              <h1 className="text-5xl lg:text-6xl font-semibold text-gray-900 mb-6 leading-tight tracking-tight">
                Enterprise compliance
                <span className="block text-[#2563EB] mt-2">made simple</span>
              </h1>
              <p className="text-xl text-gray-500 mb-8 leading-relaxed font-light">
                Streamline your compliance workflow with our secure platform. Submit, track, and manage all your compliance documents in one place.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={() => window.location.href = '/signup'}
                  className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white h-11 px-6 text-sm font-medium shadow-sm"
                >
                  Get started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => window.location.href = '/login'}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900 h-11 px-6 text-sm font-medium"
                >
                  Sign in
                </Button>
              </div>
            </div>
            
            {/* Right: Trust Indicators */}
            <div className="space-y-6">
              <Card className="bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] border-0 shadow-lg">
                <CardContent className="p-8 text-white">
                  <div className="flex items-center gap-3 mb-4">
                    <Award className="h-8 w-8" />
                    <h3 className="text-xl font-bold">Enterprise Grade</h3>
                  </div>
                  <p className="text-blue-100 leading-relaxed mb-4">
                    Built for businesses that demand the highest levels of security and compliance.
                  </p>
                  <div className="pt-4 border-t border-blue-400/30">
                    <div>
                      <div className="text-2xl font-bold mb-1">99.9%</div>
                      <div className="text-sm text-blue-100">Uptime SLA</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 lg:px-8 bg-gray-50/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-semibold text-gray-900 mb-3 tracking-tight">
              Everything you need
            </h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">
              A comprehensive platform for compliance management
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="bg-white border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-[#2563EB]/10 rounded-lg flex items-center justify-center mb-5">
                  <Lock className="h-6 w-6 text-[#2563EB]" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 leading-snug">
                  <span className="block">Enterprise-grade</span>
                  <span className="block">security</span>
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Enterprise-grade encryption protects your sensitive compliance documents at rest and in transit.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-[#10B981]/10 rounded-lg flex items-center justify-center mb-5">
                  <FileCheck className="h-6 w-6 text-[#10B981]" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Streamlined intake</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Guided drag-and-drop workflows remove guesswork from regulatory document submission.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-5">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Specialist validation</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Senior compliance analysts vet each file against regulatory and partner requirements.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-[#F59E0B]/10 rounded-lg flex items-center justify-center mb-5">
                  <Zap className="h-6 w-6 text-[#F59E0B]" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Expedited turnaround</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Prioritized queues and automation deliver the response times stakeholders expect.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-5">
                  <TrendingUp className="h-6 w-6 text-indigo-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Operational visibility</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Live status dashboards surface every submission, owner, and dependency in one command center.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-5">
                  <Clock className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Responsive support desk</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Compliance-focused specialists resolve escalations during extended business hours.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-16 px-6 lg:px-8 bg-white border-y border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Trusted by Enterprise Businesses</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-[#2563EB] mb-2">500+</div>
              <div className="text-gray-600 font-medium">Enterprise Clients</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-[#10B981] mb-2">99.9%</div>
              <div className="text-gray-600 font-medium">Uptime Guarantee</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-600 mb-2">SOC 2</div>
              <div className="text-gray-600 font-medium">Compliant</div>
            </div>
          </div>
        </div>
      </section>


      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#2563EB]" />
              <span className="text-sm font-medium text-gray-900">Secure2Send</span>
            </div>
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} Secure2Send. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
