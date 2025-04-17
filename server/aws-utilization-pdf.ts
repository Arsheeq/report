/**
 * AWS Utilization PDF Report Generator
 * 
 * This file provides functionality to generate detailed utilization reports for AWS resources
 * including EC2 instances and RDS databases. It includes:
 * 
 * - Custom report formatting with cover page, headers and footers
 * - Utilization data charts for CPU, memory, and disk usage
 * - Resource information tables
 * - Utilization metrics with recommendations
 */

import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { ChartJSNodeCanvas } from 'canvas';
import { getEC2InstanceMetrics, getRDSInstanceMetrics } from './aws-services';
import { storage } from './storage';
import { Resource } from '@shared/schema';

// Configure chart.js canvas
const chartJSNodeCanvas = new ChartJSNodeCanvas({
  width: 800, 
  height: 300,
  backgroundColour: '#ffffff',
  plugins: {
    requireLegacy: ['chartjs-plugin-datalabels']
  }
});

// Helper functions to format data
function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getAverageValue(datapoints: any[]): number {
  if (!datapoints || datapoints.length === 0) return 0;
  
  const sum = datapoints.reduce((total, point) => total + (point.Average || 0), 0);
  return sum / datapoints.length;
}

function getUtilizationRecommendation(metricName: string, avgValue: number): string {
  if (metricName.toLowerCase().includes('cpu')) {
    if (avgValue > 85) return 'High CPU utilization. Consider scaling up or optimizing workload.';
    if (avgValue < 20) return 'Low CPU utilization. Consider downsizing to save costs.';
    return 'CPU utilization is within normal range.';
  }
  
  if (metricName.toLowerCase().includes('memory')) {
    if (avgValue > 85) return 'High memory utilization. Consider scaling up memory.';
    if (avgValue < 20) return 'Low memory utilization. Consider reducing memory allocation.';
    return 'Memory utilization is within normal range.';
  }
  
  if (metricName.toLowerCase().includes('disk')) {
    if (avgValue > 80) return 'High disk usage. Consider adding storage or cleaning up data.';
    if (avgValue < 20) return 'Low disk usage. Disk space well utilized.';
    return 'Disk usage is within normal range.';
  }
  
  return 'Utilization is within normal range.';
}

async function generateMetricChart(metricData: any, metricName: string, instanceName: string): Promise<Buffer | null> {
  try {
    if (!metricData || !metricData.Datapoints || metricData.Datapoints.length === 0) {
      return null;
    }
    
    // Sort data points by timestamp
    const datapoints = [...metricData.Datapoints].sort((a: any, b: any) => {
      return new Date(a.Timestamp).getTime() - new Date(b.Timestamp).getTime();
    });
    
    // Extract timestamps and values
    const timestamps = datapoints.map((point: any) => new Date(point.Timestamp));
    const values = datapoints.map((point: any) => point.Average);
    
    // Calculate min, max, avg
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
    
    // Format timestamps for display
    const labels = timestamps.map((ts: Date) => {
      return ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    });
    
    // Create chart configuration
    const chartConfig = {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: metricName,
          data: values,
          backgroundColor: 'rgba(255, 0, 102, 0.2)',
          borderColor: 'rgba(255, 0, 102, 1)',
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: `${instanceName}: ${metricName} Utilization`,
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          subtitle: {
            display: true,
            text: `Min: ${minValue.toFixed(2)}%, Max: ${maxValue.toFixed(2)}%, Avg: ${avgValue.toFixed(2)}%`,
            font: {
              size: 12
            }
          },
          legend: {
            position: 'top',
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Time'
            }
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Utilization (%)'
            }
          }
        }
      }
    };
    
    // Render the chart to a buffer
    return await chartJSNodeCanvas.renderToBuffer(chartConfig);
    
  } catch (error) {
    console.error('Error generating chart:', error);
    return null;
  }
}

export async function generateAwsUtilizationPDF({
  cloudAccountId,
  resourceIds,
  timeframe,
  format = 'pdf'
}: {
  cloudAccountId: number;
  resourceIds: string[];
  timeframe?: { year: number; month: number };
  format: string;
}): Promise<{ reportId: number; downloadUrl: string }> {
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
    
    // Set default timeframe if not provided
    const reportDate = timeframe 
      ? new Date(timeframe.year, timeframe.month - 1, 1)
      : new Date();
    
    // Generate report filename with timestamp
    const timestamp = new Date().getTime();
    const filename = `aws-utilization-report-${accountName.replace(/\s+/g, '-')}-${timestamp}.${format}`;
    const filePath = path.join(reportsDir, filename);
    
    // Create a new PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `AWS Utilization Report - ${accountName}`,
        Author: 'Nubinix Cloud Reporting Tool',
        Subject: 'Cloud Resource Utilization',
        Keywords: 'AWS, cloud, utilization, EC2, RDS, report',
        CreationDate: new Date()
      }
    });
    
    // Pipe output to file
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);
    
    // Get resource details for all selected resources
    const resourceDetails: Resource[] = [];
    for (const resourceId of resourceIds) {
      const resource = await storage.getResourceByResourceId(resourceId);
      if (resource) {
        resourceDetails.push(resource);
      }
    }
    
    // Separate EC2 and RDS resources
    const ec2Resources = resourceDetails.filter(r => r.type === 'ec2');
    const rdsResources = resourceDetails.filter(r => r.type === 'rds');
    
    // Generate the cover page
    generateCoverPage(doc, {
      accountName: accountName || 'AWS Account',
      accountId: credentials.accountId || 'N/A',
      reportDate: formatDate(reportDate),
      cloudProvider: 'AWS'
    });
    
    // Generate Table of Contents
    doc.addPage();
    generateTableOfContents(doc, {
      ec2Resources,
      rdsResources,
      includesSummary: true
    });
    
    // Generate Executive Summary
    doc.addPage();
    generateExecutiveSummary(doc, {
      ec2Resources,
      rdsResources,
      accountName,
      reportDate: formatDate(reportDate)
    });
    
    // Generate resources summary tables
    doc.addPage();
    await generateResourcesSummary(doc, {
      ec2Resources,
      rdsResources
    });
    
    // Process EC2 resources
    for (const resource of ec2Resources) {
      doc.addPage();
      await generateEC2ResourcePage(doc, {
        resource,
        credentials: {
          accessKeyId,
          secretAccessKey,
          region
        },
        reportDate
      });
    }
    
    // Process RDS resources
    for (const resource of rdsResources) {
      doc.addPage();
      await generateRDSResourcePage(doc, {
        resource,
        credentials: {
          accessKeyId,
          secretAccessKey,
          region
        },
        reportDate
      });
    }
    
    // Generate recommendations page
    doc.addPage();
    generateRecommendationsPage(doc, {
      ec2Resources,
      rdsResources
    });
    
    // Finalize the PDF
    doc.end();
    
    // Return when the stream is finished
    return new Promise((resolve, reject) => {
      stream.on('finish', () => {
        resolve({
          reportId: timestamp,
          downloadUrl: `/reports/${filename}`
        });
      });
      stream.on('error', reject);
    });
    
  } catch (error) {
    console.error('Error generating AWS utilization report:', error);
    throw error;
  }
}

function generateCoverPage(doc: PDFKit.PDFDocument, options: {
  accountName: string;
  accountId: string;
  reportDate: string;
  cloudProvider: string;
}): void {
  // Add border
  doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40)
     .stroke();
  
  // Center the title and subtitle
  doc.fontSize(28)
     .font('Helvetica-Bold')
     .text('CLOUD UTILIZATION REPORT', {
       align: 'center',
       valign: 'center'
     })
     .moveDown(2);
  
  // Add account info with a clean, modern table style
  doc.fontSize(12)
     .font('Helvetica')
     .moveDown(5);
  
  const tableTop = doc.y;
  const tableLeft = 100;
  const columnWidth = 150;
  const rowHeight = 30;
  
  // Draw invisible container for the table
  doc.rect(tableLeft, tableTop, columnWidth * 2, rowHeight * 5)
     .fill('#F8F9FA');
  
  // Add data rows with light gray backgrounds
  const rows = [
    ['Account:', options.accountName],
    ['Report:', 'Resource Utilization'],
    ['Cloud Provider:', options.cloudProvider],
    ['Account ID:', options.accountId],
    ['Date:', options.reportDate]
  ];
  
  rows.forEach((row, i) => {
    // Alternate row background colors
    if (i % 2 === 0) {
      doc.rect(tableLeft, tableTop + rowHeight * i, columnWidth * 2, rowHeight)
         .fill('#F0F0F0');
    }
    
    // Left column - labels (bold)
    doc.font('Helvetica-Bold')
       .fillColor('#333333')
       .text(row[0], 
             tableLeft + 10, 
             tableTop + rowHeight * i + 8,
             { width: columnWidth - 20 });
    
    // Right column - values
    doc.font('Helvetica')
       .text(row[1], 
             tableLeft + columnWidth, 
             tableTop + rowHeight * i + 8,
             { width: columnWidth - 20 });
  });
  
  // Add subtle footer with page number
  doc.fontSize(10)
     .text('Page 1', doc.page.width / 2 - 20, doc.page.height - 50, {
       align: 'center'
     });
}

function generateTableOfContents(doc: PDFKit.PDFDocument, options: {
  ec2Resources: Resource[];
  rdsResources: Resource[];
  includesSummary: boolean;
}): void {
  // Page header
  doc.fontSize(20)
     .font('Helvetica-Bold')
     .text('Table of Contents', {
       align: 'center'
     })
     .moveDown(2);
  
  // Draw line under the header
  doc.moveTo(50, doc.y)
     .lineTo(doc.page.width - 50, doc.y)
     .stroke()
     .moveDown(1);
  
  doc.fontSize(12)
     .font('Helvetica-Bold');
  
  let pageNum = 3; // Executive summary starts on page 3
  
  // TOC entry for executive summary
  doc.text('Executive Summary', 50)
     .text(pageNum.toString(), 500)
     .moveDown(0.5);
  pageNum++;
  
  // TOC entry for resources summary
  doc.text('Resources Summary', 50)
     .text(pageNum.toString(), 500)
     .moveDown(0.5);
  pageNum++;
  
  // TOC entries for EC2 resources
  if (options.ec2Resources.length > 0) {
    doc.moveDown(0.5)
       .font('Helvetica-Bold')
       .text('EC2 Instances:', 50)
       .moveDown(0.5);
    
    options.ec2Resources.forEach(resource => {
      doc.font('Helvetica')
         .text(`   ${resource.name} (${resource.resourceId})`, 50)
         .text(pageNum.toString(), 500)
         .moveDown(0.5);
      pageNum++;
    });
  }
  
  // TOC entries for RDS resources
  if (options.rdsResources.length > 0) {
    doc.moveDown(0.5)
       .font('Helvetica-Bold')
       .text('RDS Instances:', 50)
       .moveDown(0.5);
    
    options.rdsResources.forEach(resource => {
      doc.font('Helvetica')
         .text(`   ${resource.name} (${resource.resourceId})`, 50)
         .text(pageNum.toString(), 500)
         .moveDown(0.5);
      pageNum++;
    });
  }
  
  // TOC entry for recommendations
  doc.moveDown(0.5)
     .font('Helvetica-Bold')
     .text('Recommendations', 50)
     .text(pageNum.toString(), 500)
     .moveDown(0.5);
  
  // Add subtle footer with page number
  doc.fontSize(10)
     .text('Page 2', doc.page.width / 2 - 20, doc.page.height - 50, {
       align: 'center'
     });
}

function generateExecutiveSummary(doc: PDFKit.PDFDocument, options: {
  ec2Resources: Resource[];
  rdsResources: Resource[];
  accountName: string;
  reportDate: string;
}): void {
  // Page header
  doc.fontSize(20)
     .font('Helvetica-Bold')
     .text('Executive Summary', {
       align: 'center'
     })
     .moveDown(2);
  
  // Draw line under the header
  doc.moveTo(50, doc.y)
     .lineTo(doc.page.width - 50, doc.y)
     .stroke()
     .moveDown(1);
  
  // Summary text
  doc.fontSize(12)
     .font('Helvetica')
     .text(`This report provides a comprehensive analysis of cloud resources utilization for ${options.accountName} as of ${options.reportDate}. It includes detailed metrics for ${options.ec2Resources.length} EC2 instances and ${options.rdsResources.length} RDS databases.`, {
       align: 'justify'
     })
     .moveDown(1);
  
  // Key findings
  doc.font('Helvetica-Bold')
     .text('Key Findings:')
     .moveDown(0.5);
  
  doc.font('Helvetica')
     .list([
       'Resource utilization patterns over the reporting period',
       'Performance analysis for each resource',
       'Identification of potential resource optimization opportunities',
       'Recommendations for cost optimization and performance improvement'
     ], {
       bulletRadius: 2,
       textIndent: 20
     })
     .moveDown(1);
  
  // Overview of methodology
  doc.font('Helvetica-Bold')
     .text('Methodology:')
     .moveDown(0.5);
  
  doc.font('Helvetica')
     .text('This report analyzes CPU utilization, memory usage, and disk performance metrics collected from AWS CloudWatch. The data provides insights into resource consumption patterns, helping identify opportunities for right-sizing and optimization.', {
       align: 'justify'
     })
     .moveDown(1);
  
  // Summary statistics
  doc.font('Helvetica-Bold')
     .text('Summary Statistics:')
     .moveDown(0.5);
  
  // Create a table for summary statistics
  const tableTop = doc.y;
  const tableLeft = 50;
  const resourceWidth = 250;
  const valueWidth = 250;
  const rowHeight = 25;
  
  // Header row
  doc.rect(tableLeft, tableTop, resourceWidth + valueWidth, rowHeight)
     .fill('#E0E0E0');
  
  doc.fillColor('#000000')
     .font('Helvetica-Bold')
     .text('Resource Type', tableLeft + 10, tableTop + 7, { width: resourceWidth - 10 })
     .text('Count', tableLeft + resourceWidth + 10, tableTop + 7, { width: valueWidth - 10 });
  
  // Data rows
  const rows = [
    ['EC2 Instances', options.ec2Resources.length.toString()],
    ['RDS Databases', options.rdsResources.length.toString()],
    ['Total Resources', (options.ec2Resources.length + options.rdsResources.length).toString()]
  ];
  
  rows.forEach((row, i) => {
    const rowY = tableTop + rowHeight * (i + 1);
    
    // Alternate row background
    if (i % 2 === 0) {
      doc.rect(tableLeft, rowY, resourceWidth + valueWidth, rowHeight)
         .fill('#F5F5F5');
    }
    
    doc.fillColor('#000000')
       .font('Helvetica')
       .text(row[0], tableLeft + 10, rowY + 7, { width: resourceWidth - 10 })
       .text(row[1], tableLeft + resourceWidth + 10, rowY + 7, { width: valueWidth - 10 });
  });
  
  // Add subtle footer with page number
  doc.fontSize(10)
     .text('Page 3', doc.page.width / 2 - 20, doc.page.height - 50, {
       align: 'center'
     });
}

async function generateResourcesSummary(doc: PDFKit.PDFDocument, options: {
  ec2Resources: Resource[];
  rdsResources: Resource[];
}): Promise<void> {
  // Page header
  doc.fontSize(20)
     .font('Helvetica-Bold')
     .text('Resources Summary', {
       align: 'center'
     })
     .moveDown(2);
  
  // Draw line under the header
  doc.moveTo(50, doc.y)
     .lineTo(doc.page.width - 50, doc.y)
     .stroke()
     .moveDown(1);
  
  // EC2 Resources Section
  if (options.ec2Resources.length > 0) {
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('EC2 Instances:')
       .moveDown(1);
    
    // Create EC2 resources table
    const tableTop = doc.y;
    const tableLeft = 50;
    const colWidths = [150, 120, 120, 100];
    const totalWidth = colWidths.reduce((a, b) => a + b, 0);
    const rowHeight = 30;
    
    // Header row
    doc.rect(tableLeft, tableTop, totalWidth, rowHeight)
       .fill('#E0E0E0');
    
    const headers = ['Instance ID', 'Name', 'Type', 'Status'];
    headers.forEach((header, i) => {
      let leftPos = tableLeft;
      for (let j = 0; j < i; j++) {
        leftPos += colWidths[j];
      }
      
      doc.fillColor('#000000')
         .font('Helvetica-Bold')
         .text(header, leftPos + 5, tableTop + 10, { width: colWidths[i] - 10 });
    });
    
    // Data rows
    options.ec2Resources.forEach((resource, i) => {
      const rowY = tableTop + rowHeight * (i + 1);
      
      // Alternate row background
      if (i % 2 === 0) {
        doc.rect(tableLeft, rowY, totalWidth, rowHeight)
           .fill('#F5F5F5');
      }
      
      const rowData = [
        resource.resourceId,
        resource.name,
        resource.metadata?.instanceType || 'N/A',
        resource.status
      ];
      
      rowData.forEach((cell, j) => {
        let leftPos = tableLeft;
        for (let k = 0; k < j; k++) {
          leftPos += colWidths[k];
        }
        
        doc.fillColor('#000000')
           .font('Helvetica')
           .text(cell.toString(), leftPos + 5, rowY + 10, { width: colWidths[j] - 10 });
      });
    });
    
    doc.moveDown(2);
  }
  
  // RDS Resources Section
  if (options.rdsResources.length > 0) {
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('RDS Instances:')
       .moveDown(1);
    
    // Create RDS resources table
    const tableTop = doc.y;
    const tableLeft = 50;
    const colWidths = [150, 120, 120, 100];
    const totalWidth = colWidths.reduce((a, b) => a + b, 0);
    const rowHeight = 30;
    
    // Header row
    doc.rect(tableLeft, tableTop, totalWidth, rowHeight)
       .fill('#E0E0E0');
    
    const headers = ['Instance ID', 'Name', 'Engine', 'Status'];
    headers.forEach((header, i) => {
      let leftPos = tableLeft;
      for (let j = 0; j < i; j++) {
        leftPos += colWidths[j];
      }
      
      doc.fillColor('#000000')
         .font('Helvetica-Bold')
         .text(header, leftPos + 5, tableTop + 10, { width: colWidths[i] - 10 });
    });
    
    // Data rows
    options.rdsResources.forEach((resource, i) => {
      const rowY = tableTop + rowHeight * (i + 1);
      
      // Alternate row background
      if (i % 2 === 0) {
        doc.rect(tableLeft, rowY, totalWidth, rowHeight)
           .fill('#F5F5F5');
      }
      
      const rowData = [
        resource.resourceId,
        resource.name,
        resource.metadata?.engine || 'N/A',
        resource.status
      ];
      
      rowData.forEach((cell, j) => {
        let leftPos = tableLeft;
        for (let k = 0; k < j; k++) {
          leftPos += colWidths[k];
        }
        
        doc.fillColor('#000000')
           .font('Helvetica')
           .text(cell.toString(), leftPos + 5, rowY + 10, { width: colWidths[j] - 10 });
      });
    });
  }
  
  // Add subtle footer with page number
  doc.fontSize(10)
     .text('Page 4', doc.page.width / 2 - 20, doc.page.height - 50, {
       align: 'center'
     });
}

async function generateEC2ResourcePage(doc: PDFKit.PDFDocument, options: {
  resource: Resource;
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
  };
  reportDate: Date;
}): Promise<void> {
  const { resource, credentials, reportDate } = options;
  
  // Page header with resource name
  doc.fontSize(18)
     .font('Helvetica-Bold')
     .text(`EC2 Instance: ${resource.name}`, {
       align: 'center'
     })
     .moveDown(1);
  
  // Draw line under the header
  doc.moveTo(50, doc.y)
     .lineTo(doc.page.width - 50, doc.y)
     .stroke()
     .moveDown(1);
  
  // Resource information section
  doc.fontSize(14)
     .font('Helvetica-Bold')
     .text('Instance Information')
     .moveDown(0.5);
  
  // Create info table
  const tableTop = doc.y;
  const tableLeft = 50;
  const labelWidth = 150;
  const valueWidth = 350;
  const rowHeight = 25;
  
  const infoData = [
    ['Instance ID', resource.resourceId],
    ['Type', resource.metadata?.instanceType || 'N/A'],
    ['Region', resource.region],
    ['Status', resource.status],
    ['Platform', resource.metadata?.platform || 'N/A'],
    ['Private IP', resource.metadata?.privateIp || 'N/A'],
    ['Public IP', resource.metadata?.publicIp || 'N/A']
  ];
  
  infoData.forEach((row, i) => {
    const rowY = tableTop + rowHeight * i;
    
    // Alternate row background
    if (i % 2 === 0) {
      doc.rect(tableLeft, rowY, labelWidth + valueWidth, rowHeight)
         .fill('#F5F5F5');
    }
    
    doc.fillColor('#000000')
       .font('Helvetica-Bold')
       .text(row[0], tableLeft + 5, rowY + 7, { width: labelWidth - 10 })
       .font('Helvetica')
       .text(row[1].toString(), tableLeft + labelWidth + 5, rowY + 7, { width: valueWidth - 10 });
  });
  
  doc.moveDown(2);
  
  // Get metrics data using AWS SDK
  try {
    // Get end date (today or report date)
    const endDate = reportDate || new Date();
    
    // Get start date (1 day before end date)
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 1);
    
    // Get EC2 metrics
    const metricsData = await getEC2InstanceMetrics({
      instanceId: resource.resourceId,
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      region: credentials.region,
      period: 3600, // 1 hour intervals
      days: 1
    });
    
    // CPU Utilization Section
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('CPU Utilization')
       .moveDown(0.5);
    
    if (metricsData && metricsData.cpu && metricsData.cpu.Datapoints && metricsData.cpu.Datapoints.length > 0) {
      // Calculate average CPU utilization
      const cpuDatapoints = metricsData.cpu.Datapoints;
      const avgCpuUtilization = getAverageValue(cpuDatapoints);
      
      // Add utilization table
      const cpuTableTop = doc.y;
      
      doc.rect(tableLeft, cpuTableTop, labelWidth + valueWidth, rowHeight)
         .fill('#F5F5F5');
      
      doc.fillColor('#000000')
         .font('Helvetica-Bold')
         .text('Average Utilization', tableLeft + 5, cpuTableTop + 7, { width: labelWidth - 10 })
         .font('Helvetica')
         .text(`${avgCpuUtilization.toFixed(2)}%`, tableLeft + labelWidth + 5, cpuTableTop + 7, { width: valueWidth - 10 });
      
      // Add recommendation
      const cpuRecommendation = getUtilizationRecommendation('cpu', avgCpuUtilization);
      
      doc.moveDown(0.5)
         .font('Helvetica-Oblique')
         .fillColor('#555555')
         .text(`Recommendation: ${cpuRecommendation}`)
         .moveDown(0.5);
      
      // Generate and add CPU chart
      const cpuChartBuffer = await generateMetricChart(metricsData.cpu, 'CPU', resource.name);
      if (cpuChartBuffer) {
        doc.image(cpuChartBuffer, {
          fit: [500, 200],
          align: 'center'
        });
      }
    } else {
      doc.font('Helvetica')
         .text('No CPU utilization data available.')
         .moveDown(1);
    }
    
    // Memory Utilization Section (if available)
    if (metricsData && metricsData.memory && metricsData.memory.Datapoints && metricsData.memory.Datapoints.length > 0) {
      doc.moveDown(1)
         .fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#000000')
         .text('Memory Utilization')
         .moveDown(0.5);
      
      // Calculate average Memory utilization
      const memoryDatapoints = metricsData.memory.Datapoints;
      const avgMemoryUtilization = getAverageValue(memoryDatapoints);
      
      // Add utilization table
      const memoryTableTop = doc.y;
      
      doc.rect(tableLeft, memoryTableTop, labelWidth + valueWidth, rowHeight)
         .fill('#F5F5F5');
      
      doc.fillColor('#000000')
         .font('Helvetica-Bold')
         .text('Average Utilization', tableLeft + 5, memoryTableTop + 7, { width: labelWidth - 10 })
         .font('Helvetica')
         .text(`${avgMemoryUtilization.toFixed(2)}%`, tableLeft + labelWidth + 5, memoryTableTop + 7, { width: valueWidth - 10 });
      
      // Add recommendation
      const memoryRecommendation = getUtilizationRecommendation('memory', avgMemoryUtilization);
      
      doc.moveDown(0.5)
         .font('Helvetica-Oblique')
         .fillColor('#555555')
         .text(`Recommendation: ${memoryRecommendation}`)
         .moveDown(0.5);
      
      // Generate and add Memory chart
      const memoryChartBuffer = await generateMetricChart(metricsData.memory, 'Memory', resource.name);
      if (memoryChartBuffer) {
        doc.image(memoryChartBuffer, {
          fit: [500, 200],
          align: 'center'
        });
      }
    }
    
    // Disk Utilization Section (if available)
    if (metricsData && metricsData.disk && metricsData.disk.Datapoints && metricsData.disk.Datapoints.length > 0) {
      doc.moveDown(1)
         .fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#000000')
         .text('Disk Utilization')
         .moveDown(0.5);
      
      // Calculate average Disk utilization
      const diskDatapoints = metricsData.disk.Datapoints;
      const avgDiskUtilization = getAverageValue(diskDatapoints);
      
      // Add utilization table
      const diskTableTop = doc.y;
      
      doc.rect(tableLeft, diskTableTop, labelWidth + valueWidth, rowHeight)
         .fill('#F5F5F5');
      
      doc.fillColor('#000000')
         .font('Helvetica-Bold')
         .text('Average Utilization', tableLeft + 5, diskTableTop + 7, { width: labelWidth - 10 })
         .font('Helvetica')
         .text(`${avgDiskUtilization.toFixed(2)}%`, tableLeft + labelWidth + 5, diskTableTop + 7, { width: valueWidth - 10 });
      
      // Add recommendation
      const diskRecommendation = getUtilizationRecommendation('disk', avgDiskUtilization);
      
      doc.moveDown(0.5)
         .font('Helvetica-Oblique')
         .fillColor('#555555')
         .text(`Recommendation: ${diskRecommendation}`)
         .moveDown(0.5);
      
      // Generate and add Disk chart
      const diskChartBuffer = await generateMetricChart(metricsData.disk, 'Disk', resource.name);
      if (diskChartBuffer) {
        doc.image(diskChartBuffer, {
          fit: [500, 200],
          align: 'center'
        });
      }
    }
    
  } catch (error) {
    console.error(`Error generating metrics for EC2 instance ${resource.resourceId}:`, error);
    
    doc.fontSize(12)
       .font('Helvetica')
       .fillColor('#FF0000')
       .text('Error retrieving metrics data from AWS CloudWatch. Please check your AWS credentials and permissions.')
       .moveDown(1);
  }
  
  // Add subtle footer with page number
  const pageNum = doc.bufferedPageRange().count; // Get current page number
  doc.fontSize(10)
     .fillColor('#000000')
     .text(`Page ${pageNum + 1}`, doc.page.width / 2 - 20, doc.page.height - 50, {
       align: 'center'
     });
}

async function generateRDSResourcePage(doc: PDFKit.PDFDocument, options: {
  resource: Resource;
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
  };
  reportDate: Date;
}): Promise<void> {
  const { resource, credentials, reportDate } = options;
  
  // Page header with resource name
  doc.fontSize(18)
     .font('Helvetica-Bold')
     .text(`RDS Instance: ${resource.name}`, {
       align: 'center'
     })
     .moveDown(1);
  
  // Draw line under the header
  doc.moveTo(50, doc.y)
     .lineTo(doc.page.width - 50, doc.y)
     .stroke()
     .moveDown(1);
  
  // Resource information section
  doc.fontSize(14)
     .font('Helvetica-Bold')
     .text('Database Information')
     .moveDown(0.5);
  
  // Create info table
  const tableTop = doc.y;
  const tableLeft = 50;
  const labelWidth = 150;
  const valueWidth = 350;
  const rowHeight = 25;
  
  const infoData = [
    ['Instance ID', resource.resourceId],
    ['Instance Class', resource.metadata?.instanceClass || 'N/A'],
    ['Engine', resource.metadata?.engine || 'N/A'],
    ['Engine Version', resource.metadata?.engineVersion || 'N/A'],
    ['Region', resource.region],
    ['Status', resource.status],
    ['Storage (GB)', resource.metadata?.storage || 'N/A']
  ];
  
  infoData.forEach((row, i) => {
    const rowY = tableTop + rowHeight * i;
    
    // Alternate row background
    if (i % 2 === 0) {
      doc.rect(tableLeft, rowY, labelWidth + valueWidth, rowHeight)
         .fill('#F5F5F5');
    }
    
    doc.fillColor('#000000')
       .font('Helvetica-Bold')
       .text(row[0], tableLeft + 5, rowY + 7, { width: labelWidth - 10 })
       .font('Helvetica')
       .text(row[1].toString(), tableLeft + labelWidth + 5, rowY + 7, { width: valueWidth - 10 });
  });
  
  doc.moveDown(2);
  
  // Get metrics data using AWS SDK
  try {
    // Get end date (today or report date)
    const endDate = reportDate || new Date();
    
    // Get start date (1 day before end date)
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 1);
    
    // Get RDS metrics
    const metricsData = await getRDSInstanceMetrics({
      instanceId: resource.resourceId,
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      region: credentials.region,
      period: 3600, // 1 hour intervals
      days: 1
    });
    
    // CPU Utilization Section
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('CPU Utilization')
       .moveDown(0.5);
    
    if (metricsData && metricsData.cpu && metricsData.cpu.Datapoints && metricsData.cpu.Datapoints.length > 0) {
      // Calculate average CPU utilization
      const cpuDatapoints = metricsData.cpu.Datapoints;
      const avgCpuUtilization = getAverageValue(cpuDatapoints);
      
      // Add utilization table
      const cpuTableTop = doc.y;
      
      doc.rect(tableLeft, cpuTableTop, labelWidth + valueWidth, rowHeight)
         .fill('#F5F5F5');
      
      doc.fillColor('#000000')
         .font('Helvetica-Bold')
         .text('Average Utilization', tableLeft + 5, cpuTableTop + 7, { width: labelWidth - 10 })
         .font('Helvetica')
         .text(`${avgCpuUtilization.toFixed(2)}%`, tableLeft + labelWidth + 5, cpuTableTop + 7, { width: valueWidth - 10 });
      
      // Add recommendation
      const cpuRecommendation = getUtilizationRecommendation('cpu', avgCpuUtilization);
      
      doc.moveDown(0.5)
         .font('Helvetica-Oblique')
         .fillColor('#555555')
         .text(`Recommendation: ${cpuRecommendation}`)
         .moveDown(0.5);
      
      // Generate and add CPU chart
      const cpuChartBuffer = await generateMetricChart(metricsData.cpu, 'CPU', resource.name);
      if (cpuChartBuffer) {
        doc.image(cpuChartBuffer, {
          fit: [500, 200],
          align: 'center'
        });
      }
    } else {
      doc.font('Helvetica')
         .text('No CPU utilization data available.')
         .moveDown(1);
    }
    
    // Database Connections Section
    if (metricsData && metricsData.connections && metricsData.connections.Datapoints && metricsData.connections.Datapoints.length > 0) {
      doc.moveDown(1)
         .fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#000000')
         .text('Database Connections')
         .moveDown(0.5);
      
      // Calculate average connections
      const connectionsDatapoints = metricsData.connections.Datapoints;
      const avgConnections = getAverageValue(connectionsDatapoints);
      
      // Add connections table
      const connectionsTableTop = doc.y;
      
      doc.rect(tableLeft, connectionsTableTop, labelWidth + valueWidth, rowHeight)
         .fill('#F5F5F5');
      
      doc.fillColor('#000000')
         .font('Helvetica-Bold')
         .text('Average Connections', tableLeft + 5, connectionsTableTop + 7, { width: labelWidth - 10 })
         .font('Helvetica')
         .text(avgConnections.toFixed(2), tableLeft + labelWidth + 5, connectionsTableTop + 7, { width: valueWidth - 10 });
      
      doc.moveDown(0.5);
      
      // Generate and add Connections chart
      const connectionsChartBuffer = await generateMetricChart(metricsData.connections, 'Connections', resource.name);
      if (connectionsChartBuffer) {
        doc.image(connectionsChartBuffer, {
          fit: [500, 200],
          align: 'center'
        });
      }
    }
    
    // Storage Space Section
    if (metricsData && metricsData.storage && metricsData.storage.Datapoints && metricsData.storage.Datapoints.length > 0) {
      doc.moveDown(1)
         .fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#000000')
         .text('Storage Space')
         .moveDown(0.5);
      
      // Calculate average free storage
      const storageDatapoints = metricsData.storage.Datapoints;
      const avgFreeStorage = getAverageValue(storageDatapoints);
      
      // Add storage table
      const storageTableTop = doc.y;
      
      doc.rect(tableLeft, storageTableTop, labelWidth + valueWidth, rowHeight)
         .fill('#F5F5F5');
      
      doc.fillColor('#000000')
         .font('Helvetica-Bold')
         .text('Average Free Storage', tableLeft + 5, storageTableTop + 7, { width: labelWidth - 10 })
         .font('Helvetica')
         .text(formatBytes(avgFreeStorage), tableLeft + labelWidth + 5, storageTableTop + 7, { width: valueWidth - 10 });
      
      // Get total allocated storage (if available in metadata)
      let totalStorage = 0;
      if (resource.metadata && resource.metadata.storage) {
        try {
          totalStorage = parseInt(resource.metadata.storage as string) * 1024 * 1024 * 1024; // Convert GB to bytes
        } catch (e) {
          console.warn('Could not parse storage allocation:', e);
        }
      }
      
      // Add recommendation based on free space
      let storageRecommendation = 'Storage utilization is within normal range.';
      
      if (totalStorage > 0) {
        const usedPercentage = ((totalStorage - avgFreeStorage) / totalStorage) * 100;
        
        if (usedPercentage > 85) {
          storageRecommendation = 'Storage usage is high. Consider increasing allocated storage.';
        } else if (usedPercentage < 20) {
          storageRecommendation = 'Storage usage is low. Consider reducing allocated storage to save costs.';
        }
      }
      
      doc.moveDown(0.5)
         .font('Helvetica-Oblique')
         .fillColor('#555555')
         .text(`Recommendation: ${storageRecommendation}`)
         .moveDown(0.5);
      
      // Generate and add Storage chart
      const storageChartBuffer = await generateMetricChart(metricsData.storage, 'Free Storage', resource.name);
      if (storageChartBuffer) {
        doc.image(storageChartBuffer, {
          fit: [500, 200],
          align: 'center'
        });
      }
    }
    
  } catch (error) {
    console.error(`Error generating metrics for RDS instance ${resource.resourceId}:`, error);
    
    doc.fontSize(12)
       .font('Helvetica')
       .fillColor('#FF0000')
       .text('Error retrieving metrics data from AWS CloudWatch. Please check your AWS credentials and permissions.')
       .moveDown(1);
  }
  
  // Add subtle footer with page number
  const pageNum = doc.bufferedPageRange().count; // Get current page number
  doc.fontSize(10)
     .fillColor('#000000')
     .text(`Page ${pageNum + 1}`, doc.page.width / 2 - 20, doc.page.height - 50, {
       align: 'center'
     });
}

function generateRecommendationsPage(doc: PDFKit.PDFDocument, options: {
  ec2Resources: Resource[];
  rdsResources: Resource[];
}): void {
  // Page header
  doc.fontSize(20)
     .font('Helvetica-Bold')
     .text('Recommendations', {
       align: 'center'
     })
     .moveDown(2);
  
  // Draw line under the header
  doc.moveTo(50, doc.y)
     .lineTo(doc.page.width - 50, doc.y)
     .stroke()
     .moveDown(1);
  
  // Introduction
  doc.fontSize(12)
     .font('Helvetica')
     .text('Based on the analysis of your cloud resources, we recommend the following actions to optimize performance and reduce costs:', {
       align: 'justify'
     })
     .moveDown(1);
  
  // General recommendations
  doc.fontSize(14)
     .font('Helvetica-Bold')
     .text('General Recommendations')
     .moveDown(0.5);
  
  const generalRecommendations = [
    'Implement automated scaling policies based on utilization patterns',
    'Use reserved instances for stable workloads to reduce costs',
    'Consider using Savings Plans for flexible resource commitments',
    'Implement regular resource tagging to improve cost allocation',
    'Configure CloudWatch alarms for high utilization resources'
  ];
  
  doc.fontSize(12)
     .font('Helvetica')
     .list(generalRecommendations, {
       bulletRadius: 2,
       textIndent: 20
     })
     .moveDown(1);
  
  // EC2 recommendations
  if (options.ec2Resources.length > 0) {
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('EC2 Recommendations')
       .moveDown(0.5);
    
    const ec2Recommendations = [
      'Right-size instances that consistently show low CPU utilization',
      'Use Graviton instances for better price-performance ratio',
      'Apply appropriate instance types based on workload characteristics',
      'Schedule non-production instances to stop during off-hours',
      'Use Auto Scaling for workloads with variable demand'
    ];
    
    doc.fontSize(12)
       .font('Helvetica')
       .list(ec2Recommendations, {
         bulletRadius: 2,
         textIndent: 20
       })
       .moveDown(1);
  }
  
  // RDS recommendations
  if (options.rdsResources.length > 0) {
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('RDS Recommendations')
       .moveDown(0.5);
    
    const rdsRecommendations = [
      'Use RDS read replicas to offload reporting and read-heavy workloads',
      'Consider Aurora for better performance and cost-effectiveness',
      'Implement Multi-AZ deployments for critical databases',
      'Optimize instance types based on CPU and memory utilization patterns',
      'Monitor and adjust storage allocation based on growth patterns'
    ];
    
    doc.fontSize(12)
       .font('Helvetica')
       .list(rdsRecommendations, {
         bulletRadius: 2,
         textIndent: 20
       })
       .moveDown(1);
  }
  
  // Cost optimization section
  doc.fontSize(14)
     .font('Helvetica-Bold')
     .text('Cost Optimization Opportunities')
     .moveDown(0.5);
  
  doc.fontSize(12)
     .font('Helvetica')
     .text('Implementing these recommendations could lead to significant cost savings while maintaining or improving application performance. Our analysis suggests potential savings of 15-30% through proper resource optimization.', {
       align: 'justify'
     })
     .moveDown(0.5)
     .text('The most significant cost optimization opportunities include:', {
       align: 'justify'
     })
     .moveDown(0.5);
  
  const costOpportunities = [
    'Eliminating unused or underutilized resources',
    'Selecting appropriate instance types for each workload',
    'Using reserved instances for stable, long-running workloads',
    'Implementing lifecycle policies to clean up unused storage',
    'Leveraging spot instances for non-critical, interruptible workloads'
  ];
  
  doc.list(costOpportunities, {
    bulletRadius: 2,
    textIndent: 20
  });
  
  // Add subtle footer with page number
  const pageNum = doc.bufferedPageRange().count; // Get current page number
  doc.fontSize(10)
     .text(`Page ${pageNum + 1}`, doc.page.width / 2 - 20, doc.page.height - 50, {
       align: 'center'
     });
}