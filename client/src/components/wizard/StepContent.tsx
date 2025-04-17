import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { SelectCloudProvider } from "@/components/steps/SelectCloudProvider";
import { SelectReportType } from "@/components/steps/SelectReportType";
import { SelectResources } from "@/components/steps/SelectResources";
import { EnterCredentials } from "@/components/steps/EnterCredentials";
import { YearMonthSelection } from "@/components/steps/YearMonthSelection";
import { FrequencySelection } from "@/components/steps/FrequencySelection";
import { GenerateReport } from "@/components/steps/GenerateReport";
import { STEPS } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

export function StepContent() {
  const { 
    currentStep, 
    nextStep, 
    prevStep, 
    reportType, 
    selectedProvider,
    credentials,
    selectedResources,
    canProceed
  } = useStore();
  const { toast } = useToast();

  // Determine if we can go to next step
  const handleNext = () => {
    if (!canProceed()) {
      toast({
        title: "Required information missing",
        description: "Please complete all required fields before proceeding.",
        variant: "destructive",
      });
      return;
    }
    
    nextStep();
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <SelectCloudProvider />;
      case 2:
        return <SelectReportType />;
      case 3:
        // Conditional flow based on report type
        if (reportType === "billing") {
          return <YearMonthSelection />;
        } else if (!credentials) {
          return <EnterCredentials />;
        } else {
          return <SelectResources />;
        }
      case 4:
        // Conditional flow based on report type
        if (reportType === "billing") {
          if (!credentials) {
            return <EnterCredentials />;
          } else {
            return <FrequencySelection />;
          }
        } else {
          if (selectedResources.length === 0) {
            return <SelectResources />;
          } else {
            return <FrequencySelection />;
          }
        }
      case 5:
        return <GenerateReport />;
      default:
        return <SelectCloudProvider />;
    }
  };

  return (
    <div className="space-y-6">
      {renderStepContent()}

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-10">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 1}
        >
          Previous
        </Button>
        <Button
          onClick={handleNext}
          disabled={currentStep === STEPS.length}
        >
          {currentStep === STEPS.length - 1 ? "Generate" : "Next"}
        </Button>
      </div>
    </div>
  );
}
