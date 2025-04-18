
import { 
  CloudWatchClient, 
  GetMetricStatisticsCommand,
  Statistic
} from "@aws-sdk/client-cloudwatch";
import { 
  EC2Client, 
  DescribeInstancesCommand,
  DescribeRegionsCommand 
} from "@aws-sdk/client-ec2";
import { 
  RDSClient, 
  DescribeDBInstancesCommand 
} from "@aws-sdk/client-rds";

export async function get_instance_metrics(
  accessKeyId: string,
  secretAccessKey: string,
  resource_list: string[],
  period_days: number
) {
  const metrics_data = [];
  
  for (const resource of resource_list) {
    const [service_type, instance_id, region] = resource.split('|');
    
    if (service_type === 'EC2') {
      metrics_data.push(await get_ec2_metrics(accessKeyId, secretAccessKey, instance_id, region, period_days));
    } else if (service_type === 'RDS') {
      metrics_data.push(await get_rds_metrics(accessKeyId, secretAccessKey, instance_id, region, period_days));
    }
  }
  
  return metrics_data;
}

async function get_ec2_metrics(accessKeyId: string, secretAccessKey: string, instance_id: string, region: string, period_days: number) {
  const credentials = { accessKeyId, secretAccessKey };
  const cloudwatch = new CloudWatchClient({ region, credentials });
  const ec2 = new EC2Client({ region, credentials });

  try {
    // Get instance details
    const instanceResponse = await ec2.send(new DescribeInstancesCommand({
      InstanceIds: [instance_id]
    }));
    
    const instance = instanceResponse.Reservations[0].Instances[0];
    const platform = instance.Platform || 'Linux';
    
    // Get metrics
    const end_time = new Date();
    const start_time = new Date(end_time.getTime() - period_days * 24 * 60 * 60 * 1000);

    const metrics = {
      cpu: await get_metric_data(cloudwatch, {
        MetricName: 'CPUUtilization',
        Namespace: 'AWS/EC2',
        Dimensions: [{ Name: 'InstanceId', Value: instance_id }],
        StartTime: start_time,
        EndTime: end_time,
        Period: 300,
        Statistics: ['Average']
      }),
      memory: await get_metric_data(cloudwatch, {
        MetricName: platform.toLowerCase() === 'windows' ? 
          'Memory % Committed Bytes In Use' : 
          'mem_used_percent',
        Namespace: 'CWAgent',
        Dimensions: [{ Name: 'InstanceId', Value: instance_id }],
        StartTime: start_time,
        EndTime: end_time,
        Period: 300,
        Statistics: ['Average']
      }),
      disk: await get_metric_data(cloudwatch, {
        MetricName: platform.toLowerCase() === 'windows' ?
          'LogicalDisk % Free Space' :
          'disk_used_percent',
        Namespace: 'CWAgent',
        Dimensions: [
          { Name: 'InstanceId', Value: instance_id },
          { Name: platform.toLowerCase() === 'windows' ? 'instance' : 'path', Value: platform.toLowerCase() === 'windows' ? 'C:' : '/' }
        ],
        StartTime: start_time,
        EndTime: end_time,
        Period: 300,
        Statistics: ['Average']
      })
    };

    return {
      id: instance_id,
      name: instance.Tags?.find(t => t.Key === 'Name')?.Value || instance_id,
      type: instance.InstanceType,
      state: instance.State.Name,
      platform,
      region,
      service_type: 'EC2',
      metrics
    };
  } catch (error) {
    console.error(`Failed to get EC2 metrics for ${instance_id}:`, error);
    return {
      id: instance_id,
      name: instance_id,
      type: 'Unknown',
      state: 'Unknown',
      platform: 'Unknown',
      region,
      service_type: 'EC2',
      metrics: {
        cpu: { average: 0, min: 0, max: 0, timestamps: [], values: [] },
        memory: { average: 0, min: 0, max: 0, timestamps: [], values: [] },
        disk: { average: 0, min: 0, max: 0, timestamps: [], values: [] }
      }
    };
  }
}

async function get_rds_metrics(accessKeyId: string, secretAccessKey: string, instance_id: string, region: string, period_days: number) {
  const credentials = { accessKeyId, secretAccessKey };
  const cloudwatch = new CloudWatchClient({ region, credentials });
  const rds = new RDSClient({ region, credentials });

  try {
    // Get instance details
    const instanceResponse = await rds.send(new DescribeDBInstancesCommand({
      DBInstanceIdentifier: instance_id
    }));
    
    const instance = instanceResponse.DBInstances[0];

    // Get metrics
    const end_time = new Date();
    const start_time = new Date(end_time.getTime() - period_days * 24 * 60 * 60 * 1000);

    const metrics = {
      cpu: await get_metric_data(cloudwatch, {
        MetricName: 'CPUUtilization',
        Namespace: 'AWS/RDS',
        Dimensions: [{ Name: 'DBInstanceIdentifier', Value: instance_id }],
        StartTime: start_time,
        EndTime: end_time,
        Period: 300,
        Statistics: ['Average']
      }),
      memory: await get_metric_data(cloudwatch, {
        MetricName: 'FreeableMemory',
        Namespace: 'AWS/RDS',
        Dimensions: [{ Name: 'DBInstanceIdentifier', Value: instance_id }],
        StartTime: start_time,
        EndTime: end_time,
        Period: 300,
        Statistics: ['Average']
      }),
      disk: await get_metric_data(cloudwatch, {
        MetricName: 'FreeStorageSpace',
        Namespace: 'AWS/RDS',
        Dimensions: [{ Name: 'DBInstanceIdentifier', Value: instance_id }],
        StartTime: start_time,
        EndTime: end_time,
        Period: 300,
        Statistics: ['Average']
      })
    };

    return {
      id: instance_id,
      name: instance_id,
      type: instance.DBInstanceClass,
      state: instance.DBInstanceStatus,
      engine: instance.Engine,
      region,
      service_type: 'RDS',
      metrics
    };
  } catch (error) {
    console.error(`Failed to get RDS metrics for ${instance_id}:`, error);
    return {
      id: instance_id,
      name: instance_id,
      type: 'Unknown',
      state: 'Unknown',
      engine: 'Unknown',
      region,
      service_type: 'RDS',
      metrics: {
        cpu: { average: 0, min: 0, max: 0, timestamps: [], values: [] },
        memory: { average: 0, min: 0, max: 0, timestamps: [], values: [], total: 0 },
        disk: { average: 0, min: 0, max: 0, timestamps: [], values: [] }
      }
    };
  }
}

async function get_metric_data(cloudwatch: CloudWatchClient, params: any) {
  try {
    const response = await cloudwatch.send(new GetMetricStatisticsCommand(params));
    
    const datapoints = response.Datapoints.sort((a, b) => 
      a.Timestamp.getTime() - b.Timestamp.getTime()
    );

    const timestamps = datapoints.map(dp => dp.Timestamp);
    const values = datapoints.map(dp => dp.Average);
    
    return {
      timestamps,
      values,
      average: values.length ? values.reduce((a, b) => a + b) / values.length : 0,
      min: values.length ? Math.min(...values) : 0,
      max: values.length ? Math.max(...values) : 0
    };
  } catch (error) {
    console.error('Failed to get metric data:', error);
    return {
      timestamps: [],
      values: [],
      average: 0,
      min: 0,
      max: 0
    };
  }
}
