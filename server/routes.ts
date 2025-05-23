import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertReportSchema } from "@shared/schema";
import fs from 'fs';
import path from 'path';
import { validateAndListAwsResources } from './aws-services';

export async function registerRoutes(app: Express): Promise<Server> {
  // prefix all routes with /api
  const apiPrefix = '/api';

  // Create reports directory if it doesn't exist
  const reportsDir = path.join(process.cwd(), 'public', 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });

  // Serve static files from public directory
  app.use(express.static('public'));

  // Validate AWS credentials and list resources
  app.post(`${apiPrefix}/validate-aws-credentials`, async (req, res) => {
    try {
      const credentialsSchema = z.object({
        accessKeyId: z.string(),
        secretAccessKey: z.string(),
        region: z.string().default('us-east-1'),
        accountName: z.string().default('AWS Account')
      });

      const credentials = credentialsSchema.parse(req.body);

      // Use the AWS SDK to validate credentials and list resources
      const result = await validateAndListAwsResources(credentials);

      if (result.valid) {
        return res.status(200).json(result);
      } else {
        return res.status(400).json({ 
          valid: false, 
          message: result.error || "Invalid AWS credentials" 
        });
      }
    } catch (error: any) {
      console.error("Error validating AWS credentials:", error);
      return res.status(400).json({ 
        valid: false, 
        message: error.message || "Invalid request format" 
      });
    }
  });

  // Validate Azure credentials
  app.post(`${apiPrefix}/validate-azure-credentials`, async (req, res) => {
    try {
      const credentialsSchema = z.object({
        tenantId: z.string(),
        clientId: z.string(),
        clientSecret: z.string(),
      });

      const credentials = credentialsSchema.parse(req.body);

      // In a real app, we would validate with Azure SDK
      // For this demo, just validate credentials aren't empty
      const isValid = credentials.tenantId.length > 0 && 
                     credentials.clientId.length > 0 && 
                     credentials.clientSecret.length > 0;

      if (isValid) {
        return res.status(200).json({ valid: true });
      } else {
        return res.status(400).json({ valid: false, message: "Invalid Azure credentials" });
      }
    } catch (error) {
      return res.status(400).json({ valid: false, message: "Invalid request format" });
    }
  });

  // Get AWS resources
  app.get(`${apiPrefix}/aws/resources`, async (req, res) => {
    try {
      // Get cloud account ID for AWS
      const cloudAccountId = req.query.cloudAccountId ? 
        parseInt(req.query.cloudAccountId as string) : 1; // Default to first account for demo

      const account = await storage.getCloudAccount(cloudAccountId);
      if (!account || account.provider !== 'aws') {
        return res.status(404).json({ message: "AWS account not found" });
      }

      // Get resources for this account
      const resources = await storage.getResourcesByCloudAccountId(cloudAccountId);
      return res.status(200).json(resources);
    } catch (error) {
      return res.status(500).json({ message: "Failed to fetch AWS resources" });
    }
  });

  // Get Azure resources
  app.get(`${apiPrefix}/azure/resources`, async (req, res) => {
    try {
      // Get cloud account ID for Azure
      const cloudAccountId = req.query.cloudAccountId ? 
        parseInt(req.query.cloudAccountId as string) : 2; // Default to second account for demo

      const account = await storage.getCloudAccount(cloudAccountId);
      if (!account || account.provider !== 'azure') {
        return res.status(404).json({ message: "Azure account not found" });
      }

      // Get resources for this account
      const resources = await storage.getResourcesByCloudAccountId(cloudAccountId);
      return res.status(200).json(resources);
    } catch (error) {
      return res.status(500).json({ message: "Failed to fetch Azure resources" });
    }
  });

  // Generate utilization report
  app.post(`${apiPrefix}/generate-utilization-report`, async (req, res) => {
    try {
      const reportData = insertReportSchema.parse({
        ...req.body,
        userId: 1,
        status: 'pending'
      });

      const { cloudAccountId, resourceIds } = reportData;

      // Get the cloud account
      const cloudAccount = await storage.getCloudAccount(cloudAccountId);
      if (!cloudAccount) {
        return res.status(404).json({ message: "Cloud account not found" });
      }

      // Call Python service
      if (!cloudAccount?.credentials) {
        throw new Error('Cloud account credentials not found');
      }

      const response = await fetch('http://0.0.0.0:5001/generate-utilization-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cloudAccountId,
          resourceIds: await Promise.all(resourceIds.map(async id => {
            const resource = await storage.getResourceByResourceId(id);
            if (!resource) {
              throw new Error(`Resource not found: ${id}`);
            }
            const serviceType = id.startsWith('i-') ? 'EC2' : 'RDS';
            return `${serviceType}|${id}|${resource.region}`;
          })),
          accountName: cloudAccount.credentials.accountName || 'AWS Account',
          aws_access_key: cloudAccount.credentials.accessKeyId,
          aws_secret_key: cloudAccount.credentials.secretAccessKey,
          frequency: reportData.frequency || 'daily',
          period: reportData.frequency === 'weekly' ? 7 : 1
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to generate report: ${response.statusText}`);
      }

      const result = await response.json();

      // Create report in storage
      const report = await storage.createReport(reportData);

      // Update report status with download URL
      if (report.id) {
        await storage.updateReportStatus(report.id, 'completed', result.downloadUrl);
      }

      return res.status(200).json({
        reportId: report.id,
        downloadUrl: result.downloadUrl
      });
    } catch (error) {
      console.error("Error generating utilization report:", error);
      return res.status(400).json({ message: "Failed to generate report" });
    }
  });

  // Generate billing report
  app.post(`${apiPrefix}/generate-billing-report`, async (req, res) => {
    try {
      const reportData = insertReportSchema.parse({
        ...req.body,
        userId: 1, // Default user ID for demo
        status: 'pending'
      });

      // Get the credentials and account info for actual API calls
      const cloudAccount = await storage.getCloudAccount(reportData.cloudAccountId);
      if (!cloudAccount) {
        return res.status(404).json({ message: "Cloud account not found" });
      }

      // Create report in storage
      const report = await storage.createReport(reportData);

      // Simulate report generation with actual provider and time data
      setTimeout(async () => {
        // In a real app, this would use the AWS/Azure SDK with the credentials
        // to fetch the actual billing data for the specified time period

        const provider = cloudAccount.provider;
        const defaultTimeframe = { year: new Date().getFullYear(), month: new Date().getMonth() + 1 };

        let timeframeData: { year: number, month: number };

        // Handle different types of timeframe data safely
        if (reportData.timeframe && typeof reportData.timeframe === 'object') {
          const tf = reportData.timeframe as any;
          timeframeData = {
            year: typeof tf.year === 'number' ? tf.year : defaultTimeframe.year,
            month: typeof tf.month === 'number' ? tf.month : defaultTimeframe.month
          };
        } else {
          timeframeData = defaultTimeframe;
        }

        const monthName = new Date(timeframeData.year, timeframeData.month - 1).toLocaleString('default', { month: 'long' });

        // Create a more descriptive filename that includes provider, year, and month
        const downloadUrl = `/reports/${provider}-billing-${timeframeData.year}-${monthName}-${report.id}.pdf`;

        // Ensure we have a valid report ID
        if (report.id) {
          await storage.updateReportStatus(report.id, 'completed', downloadUrl);
        }
      }, 3000);

      return res.status(201).json(report);
    } catch (error) {
      console.error("Error generating billing report:", error);
      return res.status(400).json({ message: "Invalid report data" });
    }
  });

  // Get report status
  app.get(`${apiPrefix}/reports/:id`, async (req, res) => {
    try {
      const reportId = parseInt(req.params.id);
      const report = await storage.getReport(reportId);

      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }

      return res.status(200).json(report);
    } catch (error) {
      return res.status(500).json({ message: "Failed to fetch report" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}