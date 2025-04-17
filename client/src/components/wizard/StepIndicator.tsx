import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { getSteps } from "@/lib/store";
import { CheckIcon } from "lucide-react";

export function StepIndicator() {
  const { currentStep, reportType } = useStore();
  const steps = getSteps(reportType);

  return (
    <div className="w-full flex">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isCompleted = stepNumber < currentStep;

        return (
          <div
            key={step.id}
            className={cn(
              "step-item flex items-center flex-1 relative",
              isActive && "active",
              isCompleted && "completed"
            )}
          >
            <div
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full border bg-background text-foreground font-semibold z-10",
                isActive &&
                  "bg-gradient-to-r from-[#3DB3E3] via-[#6866C1] to-[#E865A0] text-white border-none",
                isCompleted &&
                  "bg-green-500 text-white border-none"
              )}
            >
              {isCompleted ? <CheckIcon className="h-5 w-5" /> : stepNumber}
            </div>
            <div
              className={cn(
                "w-full h-1 bg-muted absolute top-5 left-0 -z-10",
                isCompleted && "bg-green-500"
              )}
            ></div>
            <span className="absolute mt-12 text-sm font-medium">
              {step.title}
            </span>
          </div>
        );
      })}
    </div>
  );
}
