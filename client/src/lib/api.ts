import { apiRequest } from "./queryClient";
import { CloudProvider, Resource, Report } from "@/types";

// API functions for cloud provider operations
export async function validateAwsCredentials(credentials: {
  accessKeyId: string;
  secretAccessKey: string;
}): Promise<{ valid: boolean; message?: string }> {
  const response = await apiRequest(
    "POST",
    "/api/validate-aws-credentials",
    credentials
  );
  return response.json();
}

export async function validateAzureCredentials(credentials: {
  tenantId: string;
  clientId: string;
  clientSecret: string;
}): Promise<{ valid: boolean; message?: string }> {
  const response = await apiRequest(
    "POST",
    "/api/validate-azure-credentials",
    credentials
  );
  return response.json();
}

export async function getResources(
  provider: CloudProvider,
  cloudAccountId?: number
): Promise<Resource[]> {
  const url = `/api/${provider}/resources`;
  const response = await apiRequest("GET", url);
  return response.json();
}

// API functions for report operations
export async function generateUtilizationReport(reportData: {
  cloudAccountId: number;
  resourceIds: string[];
  frequency: string;
  format: string;
  delivery: any;
}): Promise<Report> {
  const response = await apiRequest(
    "POST",
    "/api/generate-utilization-report",
    reportData
  );
  return response.json();
}

export async function generateBillingReport(reportData: {
  cloudAccountId: number;
  timeframe: { year: number; month: number };
  frequency: string;
  format: string;
  delivery: any;
}): Promise<Report> {
  const response = await apiRequest(
    "POST",
    "/api/generate-billing-report",
    reportData
  );
  return response.json();
}

export async function getReportStatus(reportId: number): Promise<Report> {
  const response = await apiRequest("GET", `/api/reports/${reportId}`);
  return response.json();
}
