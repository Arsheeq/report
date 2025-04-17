import { CloudProvider, ReportType, ReportFrequency, ReportFormat, ReportStatus, ResourceStatus } from '@shared/schema';

// Resource interface
export interface Resource {
  id: number;
  cloudAccountId: number;
  resourceId: string;
  name: string;
  type: string;
  region: string;
  status: ResourceStatus;
  metadata?: any;
}

// Report interface
export interface Report {
  id: number;
  userId: number;
  cloudAccountId: number;
  reportType: ReportType;
  resourceIds: string[];
  timeframe?: { year: number; month: number };
  frequency: ReportFrequency;
  format: ReportFormat;
  delivery: {
    email?: string;
  };
  status: ReportStatus;
  createdAt: string;
  completedAt?: string;
  downloadUrl?: string;
}

// Re-export types from schema for convenience
export type { CloudProvider, ReportType, ReportFrequency, ReportFormat, ReportStatus, ResourceStatus };
