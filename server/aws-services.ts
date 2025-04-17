import {
  EC2Client,
  DescribeInstancesCommand,
  DescribeRegionsCommand
} from '@aws-sdk/client-ec2';
import {
  RDSClient,
  DescribeDBInstancesCommand,
} from '@aws-sdk/client-rds';
import { storage } from './storage';

export async function validateAndListAwsResources({ 
  accessKeyId, 
  secretAccessKey, 
  region = 'us-east-1',
  accountName 
}: {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  accountName: string;
}) {
  const credentials = { accessKeyId, secretAccessKey };

  try {
    // Get list of all AWS regions
    const ec2Client = new EC2Client({ region, credentials });
    const regionsResponse = await ec2Client.send(new DescribeRegionsCommand({}));
    const regions = regionsResponse.Regions?.map(r => r.RegionName!) || [];

    const resources = [];
    console.log("Scanning AWS regions for resources...");

    // Scan each region for EC2 instances
    for (const currentRegion of regions) {
      console.log(`Scanning region ${currentRegion}...`);
      try {
        const regionalEC2Client = new EC2Client({ 
          region: currentRegion, 
          credentials 
        });

        const ec2Response = await regionalEC2Client.send(new DescribeInstancesCommand({}));

        if (ec2Response.Reservations) {
          for (const reservation of ec2Response.Reservations) {
            if (reservation.Instances) {
              for (const instance of reservation.Instances) {
                // Skip terminated instances
                if (instance.State?.Name === 'terminated') continue;

                const nameTag = instance.Tags?.find(tag => tag.Key === 'Name');
                console.log(`Found EC2 instance: ${instance.InstanceId} (${instance.State?.Name})`);
                resources.push({
                  cloudAccountId: 1,
                  resourceId: instance.InstanceId || '',
                  name: nameTag?.Value || instance.InstanceId || 'Unnamed Instance',
                  type: 'ec2',
                  region: instance.Placement?.AvailabilityZone || currentRegion,
                  status: instance.State?.Name || 'unknown',
                  selected: false,
                  metadata: {
                    instanceType: instance.InstanceType,
                    platform: instance.Platform || 'linux',
                    privateIp: instance.PrivateIpAddress,
                    publicIp: instance.PublicIpAddress
                  }
                });
              }
            }
          }
        }

        // Get RDS instances in this region
        const rdsClient = new RDSClient({ region: currentRegion, credentials });
        const rdsResponse = await rdsClient.send(new DescribeDBInstancesCommand({}));

        if (rdsResponse.DBInstances) {
          for (const instance of rdsResponse.DBInstances) {
            console.log(`Found RDS instance: ${instance.DBInstanceIdentifier} (${instance.DBInstanceStatus})`);
            resources.push({
              cloudAccountId: 1,
              resourceId: instance.DBInstanceIdentifier || '',
              name: instance.DBInstanceIdentifier || 'Unnamed RDS Instance',
              type: 'rds',
              region: instance.AvailabilityZone || currentRegion,
              status: instance.DBInstanceStatus || 'unknown',
              selected: false,
              metadata: {
                instanceClass: instance.DBInstanceClass,
                engine: instance.Engine,
                engineVersion: instance.EngineVersion,
                storage: instance.AllocatedStorage
              }
            });
          }
        }
      } catch (error) {
        console.warn(`Error scanning region ${currentRegion}:`, error);
        continue;
      }
    }

    // Store cloud account info
    const cloudAccount = await storage.createCloudAccount({
      userId: 1,
      provider: 'aws',
      credentials: {
        accessKeyId,
        secretAccessKey,
        region,
        accountName
      }
    });

    // Update resources with cloud account ID
    const savedResources = [];
    for (const resource of resources) {
      resource.cloudAccountId = cloudAccount.id;
      const savedResource = await storage.createResource(resource);
      savedResources.push(savedResource);
    }

    return {
      valid: true,
      resources: savedResources
    };
  } catch (error) {
    console.error('AWS validation error:', error);
    return {
      valid: false,
      error: error.message || 'Failed to validate AWS credentials'
    };
  }
}

/**
 * Get EC2 instance utilization metrics
 */
import { CloudWatchClient, GetMetricStatisticsCommand } from '@aws-sdk/client-cloudwatch';

export async function getEC2InstanceMetrics({
  instanceId,
  accessKeyId,
  secretAccessKey,
  region = 'us-east-1',
  period = 3600, // 1 hour
  days = 1,
  frequency = 'daily'
}: {
  instanceId: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  period?: number;
  days?: number;
  frequency?: 'daily' | 'weekly';
}) {
  const credentials = { accessKeyId, secretAccessKey };
  const cloudwatch = new CloudWatchClient({ region, credentials });

  const endTime = new Date();
  const startTime = new Date();
  if (frequency === 'weekly') {
    startTime.setDate(startTime.getDate() - 7);
  } else {
    startTime.setDate(startTime.getDate() - 1);
  }

  try {
    // Get CPU utilization
    const cpuParams = {
      MetricName: 'CPUUtilization',
      Namespace: 'AWS/EC2',
      Period: period,
      Statistics: ['Average' as Statistic],
      Dimensions: [{ Name: 'InstanceId', Value: instanceId }],
      StartTime: startTime,
      EndTime: endTime
    };

    const cpuData = await cloudwatch.send(new GetMetricStatisticsCommand(cpuParams));

    // Get memory utilization for Linux (requires CloudWatch agent)
    const memParams = {
      MetricName: 'mem_used_percent',
      Namespace: 'CWAgent',
      Period: period,
      Statistics: ['Average'],
      Dimensions: [{ Name: 'InstanceId', Value: instanceId }],
      StartTime: startTime,
      EndTime: endTime
    };

    // This may fail if CloudWatch agent is not configured
    let memData = null;
    try {
      memData = await cloudwatch.send(new GetMetricStatisticsCommand(memParams));
    } catch (err) {
      console.warn('Memory metrics not available:', err.message);
    }

    // Get disk utilization for Linux (requires CloudWatch agent)
    const diskParams = {
      MetricName: 'disk_used_percent',
      Namespace: 'CWAgent',
      Period: period,
      Statistics: ['Average'],
      Dimensions: [
        { Name: 'InstanceId', Value: instanceId },
        { Name: 'path', Value: '/' } // Root path
      ],
      StartTime: startTime,
      EndTime: endTime
    };

    // This may fail if CloudWatch agent is not configured
    let diskData = null;
    try {
      diskData = await cloudwatch.send(new GetMetricStatisticsCommand(diskParams));
    } catch (err) {
      console.warn('Disk metrics not available:', err.message);
    }

    return {
      cpu: cpuData,
      memory: memData,
      disk: diskData
    };
  } catch (error) {
    console.error('Error getting EC2 metrics:', error);
    throw error;
  }
}

/**
 * Get RDS instance utilization metrics
 */
export async function getRDSInstanceMetrics({
  instanceId,
  accessKeyId,
  secretAccessKey,
  region = 'us-east-1',
  period = 3600, // 1 hour
  days = 1,
  frequency = 'daily'
}: {
  instanceId: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  period?: number;
  days?: number;
  frequency?: 'daily' | 'weekly';
}) {
  const credentials = { accessKeyId, secretAccessKey };
  const cloudwatch = new CloudWatchClient({ region, credentials });

  const endTime = new Date();
  const startTime = new Date();
  if (frequency === 'weekly') {
    startTime.setDate(startTime.getDate() - 7);
  } else {
    startTime.setDate(startTime.getDate() - 1);
  }

  try {
    // Get CPU utilization
    const cpuParams = {
      MetricName: 'CPUUtilization',
      Namespace: 'AWS/RDS',
      Period: period,
      Statistics: ['Average'],
      Dimensions: [{ Name: 'DBInstanceIdentifier', Value: instanceId }],
      StartTime: startTime,
      EndTime: endTime
    };

    const cpuData = await cloudwatch.send(new GetMetricStatisticsCommand(cpuParams));

    // Get database connections
    const connectionsParams = {
      MetricName: 'DatabaseConnections',
      Namespace: 'AWS/RDS',
      Period: period,
      Statistics: ['Average'],
      Dimensions: [{ Name: 'DBInstanceIdentifier', Value: instanceId }],
      StartTime: startTime,
      EndTime: endTime
    };

    const connectionsData = await cloudwatch.send(new GetMetricStatisticsCommand(connectionsParams));

    // Get free storage space
    const storageParams = {
      MetricName: 'FreeStorageSpace',
      Namespace: 'AWS/RDS',
      Period: period,
      Statistics: ['Average'],
      Dimensions: [{ Name: 'DBInstanceIdentifier', Value: instanceId }],
      StartTime: startTime,
      EndTime: endTime
    };

    const storageData = await cloudwatch.send(new GetMetricStatisticsCommand(storageParams));

    return {
      cpu: cpuData,
      connections: connectionsData,
      storage: storageData
    };
  } catch (error) {
    console.error('Error getting RDS metrics:', error);
    throw error;
  }
}

/**
 * Generate a PDF utilization report
 * This is just a stub - in a real app, you would use a PDF library
 * to generate a comprehensive report like the sample provided
 */
export async function generateUtilizationPDF({
  cloudAccountId,
  resources,
  credentials
}: {
  cloudAccountId: number;
  resources: string[];
  credentials: any;
}) {
  // In a real app, you would:
  // 1. Fetch utilization data for each resource
  // 2. Generate graphs for CPU, memory, disk usage
  // 3. Create a PDF with reportlab (or in Node.js use PDFKit)

  // For demo purposes, we'll just generate a static URL
  const timestamp = new Date().getTime();
  const filename = `aws-utilization-report-${cloudAccountId}-${timestamp}.pdf`;
  const downloadUrl = `/reports/${filename}`;

  return {
    reportId: timestamp,
    downloadUrl: downloadUrl
  };
}

import {
  CloudWatchClient,
  GetMetricStatisticsCommand,
  Statistic
} from '@aws-sdk/client-cloudwatch';