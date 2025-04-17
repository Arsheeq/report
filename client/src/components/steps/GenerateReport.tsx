import { useState } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
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
  const [downloadUrl, setDownloadUrl] = useState("");

  const handleGenerateReport = async () => {
    setIsGenerating(true);

    try {
      const reportData = {
        userId: 1,
        cloudAccountId: selectedProvider === "aws" ? 1 : 2,
        reportType,
        resourceIds: selectedResources.map(r => r.resourceId),
        timeframe,
        frequency: "once",
        format: "pdf",
        status: "pending",
      };

      const endpoint = reportType === "utilization" 
        ? "/api/generate-utilization-report" 
        : "/api/generate-billing-report";

      const response = await apiRequest("POST", endpoint, reportData);
      const result = await response.json();

      if (result.downloadUrl) {
        setDownloadUrl(result.downloadUrl);
        toast({
          title: "Report Generated",
          description: "Your report has been successfully generated.",
        });
      }
    } catch (error) {
      toast({
        title: "Generation Error",
        description: "There was a problem generating your report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!downloadUrl) return;
    window.open(downloadUrl, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-[#3DB3E3] via-[#6866C1] to-[#E865A0] bg-clip-text text-transparent inline-block">
          Generate Report
        </h2>
        <p className="text-muted-foreground mt-2">
          Your cloud report is ready to be generated
        </p>
      </div>

      <div className="text-center">
        {downloadUrl ? (
          <Button onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download Report
          </Button>
        ) : (
          <Button onClick={handleGenerateReport} disabled={isGenerating}>
            {isGenerating ? "Generating..." : "Generate Report"}
          </Button>
        )}
      </div>
    </div>
  );
}