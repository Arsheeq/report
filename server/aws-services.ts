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

import { PythonShell } from 'python-shell';
import path from 'path';

export async function getResourceMetrics(cloudAccountId: number, resourceIds: string[], frequency: string = 'daily') {
  try {
    // Get cloud account credentials
    const cloudAccount = await storage.getCloudAccount(cloudAccountId);
    if (!cloudAccount) {
      throw new Error('Cloud account not found');
    }

    const credentials = cloudAccount.credentials as any;
    const periodDays = frequency === 'weekly' ? 7 : 1;

    // Call Python script to get metrics
    const options = {
      mode: 'json',
      pythonPath: 'python3',
      scriptPath: path.join(process.cwd(), 'server'),
      args: [
        JSON.stringify({
          aws_access_key: credentials.accessKeyId,
          aws_secret_key: credentials.secretAccessKey,
          resource_list: resourceIds.map(id => {
            const [type, resourceId, region] = id.split('|');
            return `${type}|${resourceId}|${region}`;
          }),
          period_days: periodDays
        })
      ]
    };

    const metricsData = await new Promise((resolve, reject) => {
      PythonShell.run('aws_utils.py', options, (err, results) => {
        if (err) reject(err);
        resolve(results?.[0]);
      });
    });

    return metricsData;
  } catch (error) {
    console.error('Error getting resource metrics:', error);
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
  // 1. Fetch utilization data for each resource using getResourceMetrics
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