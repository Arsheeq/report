import { useState } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Download, FileCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export function GenerateReport() {
  const { 
    selectedProvider,
    selectedResources, 
    reportType,
    reportFrequency,
    timeframe,
    credentials
  } = useStore();

  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportUrl, setReportUrl] = useState<string | null>(null);

  const handleGenerateReport = async () => {
    setIsGenerating(true);

    try {
      const reportData = {
        userId: 1,
        cloudAccountId: selectedProvider === "aws" ? 1 : 2,
        reportType,
        resourceIds: selectedResources.map(r => r.resourceId),
        timeframe,
        frequency: reportFrequency,
        format: "pdf",
        status: "pending",
      };

      const endpoint = reportType === "utilization" 
        ? "/api/generate-utilization-report" 
        : "/api/generate-billing-report";

      const response = await apiRequest("POST", endpoint, reportData);
      const result = await response.json();

      if (result.downloadUrl) {
        setReportUrl(result.downloadUrl);
        toast({
          title: "Report Generated",
          description: "Your report has been generated successfully. Click the download button to save it.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (reportUrl) {
      window.location.href = reportUrl;
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-[#3DB3E3] via-[#6866C1] to-[#E865A0] bg-clip-text text-transparent inline-block">
          Generate Report
        </h2>
        <p className="text-muted-foreground mt-2">
          Generate and download your cloud resource report
        </p>
      </div>

      <div className="flex flex-col items-center gap-4">
        <Button
          onClick={reportUrl ? handleDownload : handleGenerateReport}
          disabled={isGenerating}
          className="w-full max-w-md"
          variant={reportUrl ? "outline" : "default"}
        >
          {isGenerating ? (
            <>Generating Report...</>
          ) : reportUrl ? (
            <>
              <Download className="mr-2 h-4 w-4" />
              Download Report
            </>
          ) : (
            <>Generate Report</>
          )}
        </Button>
        {reportUrl && (
          <p className="text-center text-green-600 font-medium">
            Report generated successfully!
          </p>
        )}
      </div>
    </div>
  );
}