
import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FileBarChart, Download, Mail, Calendar, CreditCard } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";

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
  const [emailReport, setEmailReport] = useState(true);
  const [emailAddress, setEmailAddress] = useState("");
  const [scheduleRecurring, setScheduleRecurring] = useState(reportFrequency !== "once");
  const [frequency, setFrequency] = useState(reportFrequency);
  const [format, setFormat] = useState<"pdf" | "csv" | "json">("pdf");
  const [progress, setProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [reportFileName, setReportFileName] = useState("");

  useEffect(() => {
    setEmailAddress("admin@example.com");
  }, []);

  // Format month name from the timeframe
  const getMonthName = () => {
    if (!timeframe) return '';
    return new Date(timeframe.year, timeframe.month - 1).toLocaleString('default', { month: 'long' });
  };
  
  // Format credentials info for display
  const getCredentialsInfo = () => {
    if (!credentials) return 'Not provided';
    
    if (selectedProvider === 'aws') {
      return `Account: ${credentials.accountName || 'AWS Account'}`;
    } else {
      return `Account: ${credentials.accountName || 'Azure Account'}`;
    }
  };

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    setProgress(10);
    
    try {
      // Prepare report data
      const reportData = {
        userId: 1, // Default user ID for demo
        cloudAccountId: selectedProvider === "aws" ? 1 : 2, // 1 for AWS, 2 for Azure (in demo)
        reportType,
        resourceIds: selectedResources.map(r => r.resourceId),
        timeframe,
        frequency: scheduleRecurring ? frequency : "once",
        format,
        delivery: {
          email: emailReport ? emailAddress : null,
        },
        status: "pending",
      };

      // Determine which API endpoint to use based on report type
      const endpoint = reportType === "utilization" 
        ? "/api/generate-utilization-report" 
        : "/api/generate-billing-report";
      
      setProgress(30);
      
      // Make the API request
      const response = await apiRequest("POST", endpoint, reportData);
      const result = await response.json();
      
      setProgress(60);
      
      // Poll for report completion
      const reportId = result.id;
      let attempts = 0;
      const maxAttempts = 10;
      
      const pollInterval = setInterval(async () => {
        attempts++;
        
        try {
          const statusResponse = await fetch(`/api/reports/${reportId}`, {
            credentials: "include",
          });
          
          if (statusResponse.ok) {
            const reportStatus = await statusResponse.json();
            
            if (reportStatus.status === "completed") {
              clearInterval(pollInterval);
              setProgress(100);
              setCompleted(true);
              setDownloadUrl(reportStatus.downloadUrl || "");
              
              // Extract the filename from the URL for display
              const urlParts = (reportStatus.downloadUrl || "").split('/');
              const fileName = urlParts[urlParts.length - 1];
              setReportFileName(fileName);
              
              toast({
                title: "Report Generated",
                description: "Your report has been successfully generated.",
              });
            } else if (reportStatus.status === "failed") {
              clearInterval(pollInterval);
              setIsGenerating(false);
              
              toast({
                title: "Report Generation Failed",
                description: "There was an error generating your report. Please try again.",
                variant: "destructive",
              });
            } else {
              // Still processing
              setProgress(60 + Math.min((attempts / maxAttempts) * 40, 39));
            }
          }
        } catch (error) {
          console.error("Error polling report status:", error);
        }
        
        // Stop polling after max attempts
        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          setIsGenerating(false);
          
          toast({
            title: "Report Taking Longer Than Expected",
            description: "Your report is still being generated. You'll be notified when it's ready.",
          });
        }
      }, 1000);
      
    } catch (error) {
      setIsGenerating(false);
      console.error("Error generating report:", error);
      
      toast({
        title: "Generation Error",
        description: "There was a problem generating your report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    if (!downloadUrl) return;
    
    // Create a temporary a tag to trigger the download
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

      <div className="max-w-3xl mx-auto">
        {/* Report Summary */}
        <Card className="bg-muted/50 mb-6">
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Report Summary</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cloud Provider:</span>
                  <span className="font-medium">
                    {selectedProvider === "aws" ? "AWS" : "Azure"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Report Type:</span>
                  <span className="font-medium">
                    {reportType === "utilization"
                      ? "Utilization Report"
                      : "Billing Report"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Resources:</span>
                  <span className="font-medium">
                    {selectedResources.length} selected
                  </span>
                </div>
                {timeframe && reportType === "billing" && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time Period:</span>
                    <span className="font-medium">
                      {getMonthName()} {timeframe.year}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Format:</span>
                  <span className="font-medium">{format.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Frequency:</span>
                  <span className="font-medium">
                    {scheduleRecurring
                      ? frequency.charAt(0).toUpperCase() + frequency.slice(1)
                      : "One-time"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery:</span>
                  <span className="font-medium">
                    {emailReport ? "Email" : "Download only"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Credentials:</span>
                  <span className="font-medium">
                    {getCredentialsInfo()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Billing Info Card (only for billing reports) */}
        {reportType === "billing" && (
          <Card className="mb-6 border-blue-100 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">Billing Information</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    This report will generate a detailed billing analysis for:
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      <Calendar className="h-3 w-3 mr-1" />
                      {getMonthName()} {timeframe?.year}
                    </Badge>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {selectedProvider === "aws" ? "AWS Account" : "Azure Account"}: {credentials?.accountName}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Report Format Options */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Report Format</h3>

            <RadioGroup
              value={format}
              onValueChange={(value) => setFormat(value as any)}
              className="grid grid-cols-1 sm:grid-cols-3 gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="pdf" />
                <Label htmlFor="pdf" className="text-sm font-medium">
                  PDF Document
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="text-sm font-medium">
                  CSV Spreadsheet
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="json" id="json" />
                <Label htmlFor="json" className="text-sm font-medium">
                  JSON Data
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Delivery Options */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Delivery Options</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="email"
                    checked={emailReport}
                    onCheckedChange={(checked) => setEmailReport(!!checked)}
                  />
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email Report
                  </Label>
                </div>

                {emailReport && (
                  <div className="space-y-2">
                    <Label htmlFor="email-address" className="text-sm font-medium">
                      Email Address
                    </Label>
                    <Input
                      type="email"
                      id="email-address"
                      value={emailAddress}
                      onChange={(e) => setEmailAddress(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="schedule"
                    checked={scheduleRecurring}
                    onCheckedChange={(checked) => setScheduleRecurring(!!checked)}
                  />
                  <Label htmlFor="schedule" className="text-sm font-medium">
                    Schedule Recurring Report
                  </Label>
                </div>

                {scheduleRecurring && (
                  <div className="space-y-2">
                    <Label htmlFor="frequency" className="text-sm font-medium">
                      Frequency
                    </Label>
                    <Select
                      value={frequency}
                      onValueChange={(value) => setFrequency(value as any)}
                    >
                      <SelectTrigger id="frequency">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Generate or Download Button */}
        {isGenerating ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Generating report...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          </div>
        ) : completed ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-2">
              <div className="text-green-500 bg-green-100 p-3 rounded-full">
                <FileBarChart className="h-6 w-6" />
              </div>
              <p className="font-medium">Your report is ready!</p>
              {reportFileName && (
                <Badge className="bg-gray-100 text-gray-800 font-mono">
                  {reportFileName}
                </Badge>
              )}
            </div>
            <div className="flex justify-center gap-2 mt-4">
              <Button onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download Report
              </Button>
              {emailReport && (
                <Button variant="outline">
                  <Mail className="mr-2 h-4 w-4" />
                  Send to Email
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center">
            <Button onClick={handleGenerateReport}>
              <FileBarChart className="mr-2 h-4 w-4" />
              Generate Report
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
