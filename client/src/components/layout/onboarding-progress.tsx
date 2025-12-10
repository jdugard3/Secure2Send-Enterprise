import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Check, Circle, Lock, FileText, Upload, ClipboardList, Send } from "lucide-react";

interface OnboardingStep {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "PART1",
    label: "Basic Info",
    description: "Business details",
    icon: FileText,
    href: "/merchant-applications?step=part1",
  },
  {
    id: "DOCUMENTS",
    label: "Documents",
    description: "Upload required docs",
    icon: Upload,
    href: "/documents",
  },
  {
    id: "PART2",
    label: "Details",
    description: "Complete application",
    icon: ClipboardList,
    href: "/merchant-applications?step=part2",
  },
  {
    id: "REVIEW",
    label: "Submit",
    description: "Review & submit",
    icon: Send,
    href: "/merchant-applications?step=review",
  },
];

const STEP_ORDER = ["PART1", "DOCUMENTS", "PART2", "REVIEW", "COMPLETE"];

interface OnboardingProgressProps {
  isCollapsed?: boolean;
}

export function OnboardingProgress({ isCollapsed = false }: OnboardingProgressProps) {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  
  // Don't show for admins
  if (user?.role === "ADMIN") {
    return null;
  }

  const currentStep = user?.onboardingStep || "PART1";
  const currentStepIndex = STEP_ORDER.indexOf(currentStep);

  // If completed, don't show the progress tracker
  if (currentStep === "COMPLETE") {
    return null;
  }

  const getStepStatus = (stepId: string): "completed" | "current" | "locked" => {
    const stepIndex = STEP_ORDER.indexOf(stepId);
    if (stepIndex < currentStepIndex) return "completed";
    if (stepIndex === currentStepIndex) return "current";
    return "locked";
  };

  const handleStepClick = (step: OnboardingStep, status: "completed" | "current" | "locked") => {
    // Can only navigate to completed or current steps
    if (status === "locked") return;
    navigate(step.href);
  };

  if (isCollapsed) {
    // Show compact version with just icons
    return (
      <div className="px-2 py-4 border-b border-gray-200">
        <div className="flex flex-col items-center gap-2">
          {ONBOARDING_STEPS.map((step, index) => {
            const status = getStepStatus(step.id);
            const Icon = step.icon;
            const isLast = index === ONBOARDING_STEPS.length - 1;

            return (
              <div key={step.id} className="flex flex-col items-center">
                <button
                  onClick={() => handleStepClick(step, status)}
                  disabled={status === "locked"}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                    status === "completed" && "bg-green-500 text-white",
                    status === "current" && "bg-blue-500 text-white ring-2 ring-blue-200",
                    status === "locked" && "bg-gray-200 text-gray-400 cursor-not-allowed"
                  )}
                  title={`${step.label} - ${step.description}`}
                >
                  {status === "completed" ? (
                    <Check className="h-4 w-4" />
                  ) : status === "locked" ? (
                    <Lock className="h-3 w-3" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </button>
                {!isLast && (
                  <div
                    className={cn(
                      "w-0.5 h-4 my-1",
                      getStepStatus(ONBOARDING_STEPS[index + 1].id) === "locked"
                        ? "bg-gray-200"
                        : "bg-green-500"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 border-b border-gray-200 bg-gradient-to-b from-blue-50/50 to-transparent">
      <div className="mb-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Your Progress
        </h3>
        <div className="mt-1 flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
              style={{
                width: `${(currentStepIndex / (STEP_ORDER.length - 1)) * 100}%`,
              }}
            />
          </div>
          <span className="text-xs font-medium text-gray-600">
            {currentStepIndex}/{STEP_ORDER.length - 1}
          </span>
        </div>
      </div>

      <div className="space-y-1">
        {ONBOARDING_STEPS.map((step, index) => {
          const status = getStepStatus(step.id);
          const Icon = step.icon;
          const isLast = index === ONBOARDING_STEPS.length - 1;

          return (
            <div key={step.id} className="relative">
              <button
                onClick={() => handleStepClick(step, status)}
                disabled={status === "locked"}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left",
                  status === "completed" && "hover:bg-green-50 cursor-pointer",
                  status === "current" && "bg-blue-50 border border-blue-200 shadow-sm",
                  status === "locked" && "opacity-60 cursor-not-allowed"
                )}
              >
                {/* Step indicator */}
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
                    status === "completed" && "bg-green-500 text-white",
                    status === "current" && "bg-blue-500 text-white ring-2 ring-blue-200",
                    status === "locked" && "bg-gray-200 text-gray-400"
                  )}
                >
                  {status === "completed" ? (
                    <Check className="h-4 w-4" />
                  ) : status === "locked" ? (
                    <Lock className="h-3 w-3" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>

                {/* Step content */}
                <div className="flex-1 min-w-0">
                  <div
                    className={cn(
                      "text-sm font-medium truncate",
                      status === "completed" && "text-green-700",
                      status === "current" && "text-blue-700",
                      status === "locked" && "text-gray-500"
                    )}
                  >
                    {step.label}
                  </div>
                  <div
                    className={cn(
                      "text-xs truncate",
                      status === "completed" && "text-green-600",
                      status === "current" && "text-blue-600",
                      status === "locked" && "text-gray-400"
                    )}
                  >
                    {step.description}
                  </div>
                </div>

                {/* Current indicator */}
                {status === "current" && (
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                )}
              </button>

              {/* Connector line */}
              {!isLast && (
                <div className="absolute left-[1.4rem] top-10 w-0.5 h-3">
                  <div
                    className={cn(
                      "w-full h-full rounded-full",
                      getStepStatus(ONBOARDING_STEPS[index + 1].id) === "locked"
                        ? "bg-gray-200"
                        : "bg-green-500"
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}




