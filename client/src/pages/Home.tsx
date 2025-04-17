import { useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StepIndicator } from "@/components/wizard/StepIndicator";
import { StepContent } from "@/components/wizard/StepContent";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const { currentStep, resetWizard } = useStore();
  const { toast } = useToast();

  // Reset wizard state when component mounts
  useEffect(() => {
    resetWizard();
  }, [resetWizard]);

  return (
    <AppLayout>
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <div className="mb-10">
          <StepIndicator />
        </div>

        <div className="bg-card rounded-lg border shadow-sm p-6">
          <StepContent />
        </div>
      </main>
    </AppLayout>
  );
}
