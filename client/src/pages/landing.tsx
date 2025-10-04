import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, FileCheck, Users, Clock, ArrowRight } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-primary mr-3" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Secure2Send</h1>
                <p className="text-xs text-gray-500">Compliance Platform</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={() => window.location.href = '/login'}
                variant="outline"
                className="border-primary text-primary hover:bg-primary hover:text-white"
              >
                Sign In
              </Button>
              <Button 
                onClick={() => window.location.href = '/signup'}
                className="bg-primary hover:bg-blue-700"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Cannabis Compliance
            <span className="block text-primary">Made Simple</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Streamline your cannabis business compliance document submission and approval process with our secure, professional platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              onClick={() => window.location.href = '/signup'}
              className="bg-primary hover:bg-blue-700 text-lg px-8 py-4"
            >
              Get Started Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => window.location.href = '/login'}
              className="border-2 border-primary text-primary hover:bg-primary hover:text-white text-lg px-8 py-4"
            >
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Why Choose Secure2Send?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Secure Platform</h3>
                <p className="text-gray-600">Bank-level security for all your sensitive compliance documents</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <FileCheck className="h-6 w-6 text-success" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Easy Upload</h3>
                <p className="text-gray-600">Drag & drop interface for quick and easy document submission</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Expert Review</h3>
                <p className="text-gray-600">Professional compliance experts review your submissions</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-6 w-6 text-warning" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Fast Processing</h3>
                <p className="text-gray-600">Quick turnaround times to keep your business moving</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Streamline Your Compliance?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join hundreds of cannabis businesses who trust Secure2Send with their compliance needs.
          </p>
          <Button 
            size="lg"
            onClick={() => window.location.href = '/signup'}
            className="bg-primary hover:bg-blue-700 text-lg px-8 py-4"
          >
            Start Your Account
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-primary mr-2" />
            <span className="text-lg font-semibold text-gray-900">Secure2Send</span>
          </div>
          <p className="text-gray-600">
            © 2024 Secure2Send. Professional cannabis compliance document management.
          </p>
        </div>
      </footer>
    </div>
  );
}
