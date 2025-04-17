/**
 * PDF Generator for AWS Utilization Reports
 * 
 * This is a simplified version for the demo. In a production app,
 * you would use a full PDF library with more formatting capabilities.
 */

import fs from 'fs';
import path from 'path';
import { getEC2InstanceMetrics, getRDSInstanceMetrics } from './aws-services';
import { storage } from './storage';

/**
 * Generate a utilization report for AWS resources
 */
export async function generateAwsUtilizationReport({
  cloudAccountId,
  resourceIds,
  timeframe,
  format
}: {
  cloudAccountId: number;
  resourceIds: string[];
  timeframe?: { year: number; month: number };
  format: string;
}) {
  try {
    // Get cloud account credentials
    const cloudAccount = await storage.getCloudAccount(cloudAccountId);
    if (!cloudAccount) {
      throw new Error('Cloud account not found');
    }
    
    // Extract AWS credentials from saved account
    const credentials = cloudAccount.credentials as any;
    const { accessKeyId, secretAccessKey, region, accountName } = credentials;
    
    // Prepare report directory
    const reportsDir = path.join(process.cwd(), 'public', 'reports');
    fs.mkdirSync(reportsDir, { recursive: true });
    
    // Generate a unique filename
    const timestamp = new Date().getTime();
    const filename = `aws-utilization-report-${cloudAccountId}-${timestamp}.${format}`;
    const filePath = path.join(reportsDir, filename);
    
    // Get resource details for all selected resources
    const resourceDetails = [];
    for (const resourceId of resourceIds) {
      const resource = await storage.getResourceByResourceId(resourceId);
      if (resource) {
        resourceDetails.push(resource);
      }
    }
    
    // Separate EC2 and RDS resources
    const ec2Resources = resourceDetails.filter(r => r.type === 'ec2');
    const rdsResources = resourceDetails.filter(r => r.type === 'rds');
    
    // For this demo, we're creating a simple text-based report instead of a PDF
    // In a real app, you would use a PDF library to create a formatted report
    const reportContent = [
      '==================================================',
      `             CLOUD UTILIZATION REPORT              `,
      '==================================================',
      '',
      `Account:        ${accountName || 'AWS Account'}`,
      `Report:         Resource Utilization`,
      `Cloud Provider: AWS`,
      `Account ID:     ${credentials.accountId || 'N/A'}`,
      `Date:           ${new Date().toLocaleDateString()}`,
      '',
      '==================================================',
      `               RESOURCES SUMMARY                   `,
      '==================================================',
      '',
      'EC2 Instances:',
      '-------------',
    ];
    
    // Add EC2 instances to report
    ec2Resources.forEach(resource => {
      reportContent.push(
        `Instance ID: ${resource.resourceId}`,
        `Name:        ${resource.name}`,
        `Type:        ${resource.metadata?.instanceType || 'N/A'}`,
        `Status:      ${resource.status}`,
        `Region:      ${resource.region}`,
        ''
      );
    });
    
    // Add RDS instances to report
    reportContent.push(
      'RDS Instances:',
      '-------------'
    );
    
    rdsResources.forEach(resource => {
      reportContent.push(
        `Instance ID: ${resource.resourceId}`,
        `Name:        ${resource.name}`,
        `Engine:      ${resource.metadata?.engine || 'N/A'}`,
        `Class:       ${resource.metadata?.instanceClass || 'N/A'}`,
        `Status:      ${resource.status}`,
        `Region:      ${resource.region}`,
        ''
      );
    });
    
    // Add metrics data (in a real app, you would fetch and include actual metrics)
    reportContent.push(
      '==================================================',
      `               UTILIZATION METRICS                 `,
      '==================================================',
      '',
      'Note: In a real implementation, this report would include:',
      '- CPU, Memory, and Disk utilization graphs for EC2 instances',
      '- CPU, Storage, and Connections graphs for RDS instances',
      '- Minimum, Maximum, and Average utilization statistics',
      '- Recommendations based on utilization patterns',
      '',
      '==================================================',
      '               RECOMMENDATIONS                     ',
      '==================================================',
      '',
      'Based on utilization patterns, consider:',
      '- Right-sizing instances with consistently low utilization',
      '- Implementing auto-scaling for instances with variable loads',
      '- Optimizing storage allocation for underutilized databases',
      '',
      '==================================================',
      `Report generated on ${new Date().toISOString()}`,
      '=================================================='
    );
    
    // Write the report to a file
    fs.writeFileSync(filePath, reportContent.join('\n'));
    
    // Return the download URL and report ID
    const downloadUrl = `/reports/${filename}`;
    return {
      reportId: timestamp,
      downloadUrl
    };
  } catch (error) {
    console.error('Error generating AWS utilization report:', error);
    throw error;
  }
}

/**
 * Generate a billing report for AWS resources
 */
export async function generateAwsBillingReport({
  cloudAccountId,
  resourceIds,
  timeframe,
  format
}: {
  cloudAccountId: number;
  resourceIds: string[];
  timeframe?: { year: number; month: number };
  format: string;
}) {
  try {
    // Get cloud account credentials
    const cloudAccount = await storage.getCloudAccount(cloudAccountId);
    if (!cloudAccount) {
      throw new Error('Cloud account not found');
    }
    
    // Extract AWS credentials from saved account
    const credentials = cloudAccount.credentials as any;
    const { accessKeyId, secretAccessKey, region, accountName } = credentials;
    
    // Prepare report directory
    const reportsDir = path.join(process.cwd(), 'public', 'reports');
    fs.mkdirSync(reportsDir, { recursive: true });
    
    // Generate a unique filename with month/year if available
    const timestamp = new Date().getTime();
    const monthYear = timeframe 
      ? `-${timeframe.year}-${timeframe.month}` 
      : '';
      
    const filename = `aws-billing-report${monthYear}-${cloudAccountId}-${timestamp}.${format}`;
    const filePath = path.join(reportsDir, filename);
    
    // Get resource details for all selected resources
    const resourceDetails = [];
    for (const resourceId of resourceIds) {
      const resource = await storage.getResourceByResourceId(resourceId);
      if (resource) {
        resourceDetails.push(resource);
      }
    }
    
    // Get month name if timeframe is specified
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June', 
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const monthName = timeframe 
      ? monthNames[timeframe.month - 1] 
      : monthNames[new Date().getMonth()];
      
    const year = timeframe 
      ? timeframe.year 
      : new Date().getFullYear();
    
    // Create a simple text-based billing report
    const reportContent = [
      '==================================================',
      `                AWS BILLING REPORT                 `,
      '==================================================',
      '',
      `Account:        ${accountName || 'AWS Account'}`,
      `Report:         Billing Report`,
      `Cloud Provider: AWS`,
      `Account ID:     ${credentials.accountId || 'N/A'}`,
      `Period:         ${monthName} ${year}`,
      `Date Generated: ${new Date().toLocaleDateString()}`,
      '',
      '==================================================',
      `               RESOURCES SUMMARY                   `,
      '==================================================',
      '',
    ];
    
    // Add resources to the report
    reportContent.push('Resources included in report:');
    resourceDetails.forEach(resource => {
      reportContent.push(
        `- ${resource.name} (${resource.resourceId}): ${resource.type.toUpperCase()}`
      );
    });
    
    reportContent.push(
      '',
      '==================================================',
      `               BILLING DETAILS                     `,
      '==================================================',
      '',
      `Period: ${monthName} 1-${new Date(year, timeframe?.month || new Date().getMonth(), 0).getDate()}, ${year}`,
      '',
      'Resource Costs:',
      '-------------',
    );
    
    // In a real app, you would fetch actual cost data from AWS Cost Explorer API
    // For this demo, we're providing sample costs
    let totalCost = 0;
    
    resourceDetails.forEach(resource => {
      // Generate a realistic-looking cost based on resource type
      let estimatedCost = 0;
      
      if (resource.type === 'ec2') {
        // EC2 costs vary by instance type
        const instanceType = resource.metadata?.instanceType || '';
        if (instanceType.includes('t3')) estimatedCost = 45.23;
        else if (instanceType.includes('m5')) estimatedCost = 126.87;
        else if (instanceType.includes('r5')) estimatedCost = 189.45;
        else estimatedCost = 78.34;
      } else if (resource.type === 'rds') {
        // RDS costs are typically higher
        const instanceClass = resource.metadata?.instanceClass || '';
        if (instanceClass.includes('t3')) estimatedCost = 105.76;
        else if (instanceClass.includes('r6i')) estimatedCost = 298.45;
        else if (instanceClass.includes('r5')) estimatedCost = 267.23;
        else estimatedCost = 152.98;
      }
      
      totalCost += estimatedCost;
      
      reportContent.push(
        `${resource.name} (${resource.resourceId})`,
        `Type:  ${resource.type.toUpperCase()} - ${resource.metadata?.instanceType || resource.metadata?.instanceClass || 'N/A'}`,
        `Cost:  $${estimatedCost.toFixed(2)}`,
        ''
      );
    });
    
    // Add total cost
    reportContent.push(
      '==================================================',
      `TOTAL COST: $${totalCost.toFixed(2)}`,
      '==================================================',
      '',
      'Note: In a real implementation, this report would include:',
      '- Actual cost data from AWS Cost Explorer API',
      '- Detailed breakdown by service and usage type',
      '- Cost allocation by tags',
      '- Cost comparison with previous periods',
      '- Cost optimization recommendations',
      '',
      '==================================================',
      `Report generated on ${new Date().toISOString()}`,
      '=================================================='
    );
    
    // Write the report to a file
    fs.writeFileSync(filePath, reportContent.join('\n'));
    
    // Return the download URL and report ID
    const downloadUrl = `/reports/${filename}`;
    return {
      reportId: timestamp,
      downloadUrl
    };
  } catch (error) {
    console.error('Error generating AWS billing report:', error);
    throw error;
  }
}