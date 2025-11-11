import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  ArrowRight,
  CheckCircle2,
  Lock,
  TrendingUp,
  Zap,
  Building2,
  Banknote,
  Handshake,
  Quote,
  BookOpen,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

export default function Landing() {
  const solutions = [
    {
      title: "Financial Institutions",
      description:
        "Launch or scale compliant programs with automated monitoring, intelligent workflows, and expert advisory support.",
      icon: Building2,
      action: "Build your program"
    },
    {
      title: "High-Risk Businesses",
      description:
        "Access banking, lending, insurance, and payments through a single onboarding experience tailored to regulated industries.",
      icon: Banknote,
      action: "Explore marketplace"
    },
    {
      title: "Service Providers",
      description:
        "Connect with thousands of compliant-ready operators and embed services through modern API integrations.",
      icon: Handshake,
      action: "Partner with us"
    }
  ];

  const spotlightTestimonial = {
    quote:
      "Secure2Send has been an excellent partner from the start. Their team shares deep expertise, listens to our needs, and built a program our institution feels confident scaling.",
    name: "Tausif Lodi",
    title: "Business Development Officer, Signal Financial Federal Credit Union",
    logo: "Signal Financial"
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
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
      <section className="relative overflow-hidden bg-gradient-to-b from-[#edf2ff] via-white to-white">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-24 w-96 h-96 bg-[#2563EB]/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-10 w-80 h-80 bg-[#10B981]/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-24">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <Badge className="bg-white border border-[#2563EB]/20 text-[#2563EB] font-medium shadow-sm">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Compliance platform for modern financial leaders
              </Badge>
              <div className="space-y-6">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-gray-900 leading-tight">
                  Turn complex compliance into trusted client experiences.
                </h1>
                <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
                  Secure2Send blends enterprise technology, expert insights, and verified providers so you can expand into high-opportunity markets with confidence.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => window.location.href = '/signup'}
                  className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white h-11 px-6 text-sm font-medium shadow-md"
                >
                  Speak to an expert
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/documents'}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900 h-11 px-6 text-sm font-medium"
                >
                  Explore solutions
                </Button>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
                  Regulator-ready workflows
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
                  Dedicated onboarding team
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
                  API & data integrations
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -top-10 -left-10 w-24 h-24 bg-white/60 border border-white rounded-2xl shadow-lg blur-sm" />
              <div className="rounded-3xl overflow-hidden shadow-2xl ring-1 ring-black/5">
                <img
                  src="https://images.unsplash.com/photo-1580894908361-967195033215?auto=format&fit=crop&w=1280&q=80"
                  alt="Financial compliance leaders collaborating"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#0f172a]/10 via-transparent to-transparent" />
            </div>
          </div>
        </div>
      </section>

      {/* Solutions */}
      <section className="py-20 px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <Badge className="bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/20 font-medium">
              Platform solutions
            </Badge>
            <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 tracking-tight">
              Purpose-built experiences for every stakeholder on your compliance journey
            </h2>
            <p className="text-lg text-gray-500">
              From onboarding to monitoring and ongoing advisory, Secure2Send equips teams with the infrastructure needed to run safe, scalable programs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {solutions.map(({ title, description, icon: Icon, action }) => (
              <Card
                key={title}
                className="bg-white border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md transition-all"
              >
                <CardContent className="p-8 space-y-5">
                  <div className="w-12 h-12 rounded-lg bg-[#2563EB]/10 flex items-center justify-center">
                    <Icon className="h-6 w-6 text-[#2563EB]" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
                  </div>
                  <Button
                    variant="link"
                    className="px-0 text-[#2563EB] hover:text-[#1D4ED8] text-sm font-medium"
                  >
                    {action} <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Highlights */}
      <section className="py-20 px-6 lg:px-8 bg-gray-50/50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-8 space-y-4">
                <div className="flex items-center gap-3">
                  <Lock className="h-5 w-5 text-[#2563EB]" />
                  <p className="text-sm font-semibold text-gray-900">
                    Enterprise-grade security
                  </p>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Enterprise-grade encryption protects your sensitive compliance documents at rest and in transit.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-8 space-y-4">
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-[#F59E0B]" />
                  <p className="text-sm font-semibold text-gray-900">
                    Expedited turnaround
                  </p>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Prioritized queues and automation deliver the response times stakeholders expect.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-8 space-y-4">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-indigo-600" />
                  <p className="text-sm font-semibold text-gray-900">
                    Operational visibility
                  </p>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Live status dashboards surface every submission, owner, and dependency in one command center.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonial Spotlight */}
      <section className="relative overflow-hidden py-20 px-6 lg:px-8">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1600&q=80"
            alt="Modern compliance team collaborating in an office"
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0f172a]/80 via-[#1e1b4b]/60 to-transparent" />
        </div>
        <div className="relative max-w-6xl mx-auto text-white">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="space-y-6 max-w-3xl">
              <div className="flex items-center gap-3 text-sm uppercase tracking-widest text-white/70 font-semibold">
                <button
                  type="button"
                  className="h-10 w-10 rounded-full border border-white/30 flex items-center justify-center hover:bg-white/10 transition"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className="h-10 w-10 rounded-full border border-white/30 flex items-center justify-center hover:bg-white/10 transition"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
              <p className="text-2xl lg:text-3xl leading-relaxed font-medium">
                “{spotlightTestimonial.quote}”
              </p>
              <div className="space-y-2">
                <div className="text-lg font-semibold">{spotlightTestimonial.logo}</div>
                <div className="text-base font-medium">{spotlightTestimonial.name}</div>
                <div className="text-sm text-white/80">{spotlightTestimonial.title}</div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="inline-flex h-2 w-2 rounded-full bg-white" />
                <span className="inline-flex h-2 w-2 rounded-full bg-white/50" />
                <span className="inline-flex h-2 w-2 rounded-full bg-white/50" />
                <span className="inline-flex h-2 w-2 rounded-full bg-white/50" />
              </div>
              <Button
                variant="ghost"
                className="text-white hover:bg-white/10 hover:text-white w-fit px-0"
              >
                Read their story
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
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
