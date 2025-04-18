import boto3
import logging
from datetime import datetime, timedelta
import pytz

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def get_aws_client(service, region, aws_access_key, aws_secret_key):
    """Create and return an AWS service client."""
    return boto3.client(
        service,
        region_name=region,
        aws_access_key_id=aws_access_key,
        aws_secret_access_key=aws_secret_key
    )

def get_all_regions(aws_access_key, aws_secret_key):
    """Get a list of all available AWS regions."""
    try:
        ec2_client = get_aws_client('ec2', 'us-east-1', aws_access_key, aws_secret_key)
        regions = [region['RegionName'] for region in ec2_client.describe_regions()['Regions']]
        return regions
    except Exception as e:
        logger.error(f"Failed to get AWS regions: {str(e)}")
        return ['us-east-1', 'us-east-2', 'us-west-1', 'us-west-2', 'eu-west-1', 'eu-central-1', 'ap-south-1']

def list_ec2_instances(aws_access_key, aws_secret_key, region):
    """List EC2 instances in the specified region."""
    try:
        ec2_client = get_aws_client('ec2', region, aws_access_key, aws_secret_key)
        response = ec2_client.describe_instances()

        instances = []
        for reservation in response['Reservations']:
            for instance in reservation['Instances']:
                instance_name = 'Unnamed'
                if 'Tags' in instance:
                    for tag in instance['Tags']:
                        if tag['Key'] == 'Name':
                            instance_name = tag['Value']

                platform = instance.get('Platform', 'Linux')
                if platform is None:
                    platform = 'Linux'

                instance_data = {
                    'id': instance['InstanceId'],
                    'name': instance_name,
                    'type': instance['InstanceType'],
                    'state': instance['State']['Name'],
                    'platform': platform,
                    'region': region,
                    'service_type': 'EC2'
                }
                instances.append(instance_data)

        return instances
    except Exception as e:
        logger.error(f"Failed to list EC2 instances in {region}: {str(e)}")
        return []

def list_rds_instances(aws_access_key, aws_secret_key, region):
    """List RDS instances in the specified region."""
    try:
        rds_client = get_aws_client('rds', region, aws_access_key, aws_secret_key)
        response = rds_client.describe_db_instances()
        
        instances = []
        for instance in response['DBInstances']:
            instance_data = {
                'id': instance['DBInstanceIdentifier'],
                'name': instance['DBInstanceIdentifier'],
                'type': instance['DBInstanceClass'],
                'state': instance['DBInstanceStatus'],
                'engine': instance['Engine'],
                'region': region,
                'service_type': 'RDS'
            }
            instances.append(instance_data)
        
        return instances
    except Exception as e:
        logger.error(f"Failed to list RDS instances in {region}: {str(e)}")
        return []

def get_cloudwatch_metric_data(cloudwatch, metric_name, namespace, dimensions, period_days, statistic='Average'):
    """Get CloudWatch metric data for the specified period."""
    end_time = datetime.utcnow()
    start_time = end_time - timedelta(days=period_days)
    
    try:
        response = cloudwatch.get_metric_statistics(
            Namespace=namespace,
            MetricName=metric_name,
            Dimensions=dimensions,
            StartTime=start_time,
            EndTime=end_time,
            Period=300,  # 5-minute intervals
            Statistics=[statistic]
        )
        
        data_points = sorted(response['Datapoints'], key=lambda x: x['Timestamp'])
        timestamps = [dp['Timestamp'] for dp in data_points]
        values = [dp[statistic] for dp in data_points]
        average = sum(values) / len(values) if values else 0
        min_value = min(values) if values else 0
        max_value = max(values) if values else 0
        
        return {
            'timestamps': timestamps,
            'values': values,
            'average': average,
            'min': min_value,
            'max': max_value
        }
    except Exception as e:
        logger.error(f"Failed to get CloudWatch metric {metric_name}: {str(e)}")
        return {
            'timestamps': [],
            'values': [],
            'average': 0,
            'min': 0,
            'max': 0
        }

def get_ec2_metrics(aws_access_key, aws_secret_key, instance_id, region, period_days):
    """Get EC2 instance metrics from CloudWatch."""
    try:
        cloudwatch = get_aws_client('cloudwatch', region, aws_access_key, aws_secret_key)
        ec2_client = get_aws_client('ec2', region, aws_access_key, aws_secret_key)
        
        response = ec2_client.describe_instances(InstanceIds=[instance_id])
        instance = response['Reservations'][0]['Instances'][0]
        
        instance_name = instance_id
        if 'Tags' in instance:
            for tag in instance['Tags']:
                if tag['Key'] == 'Name':
                    instance_name = tag['Value']
        
        platform = instance.get('Platform', 'Linux')
        if platform is None:
            platform = 'Linux'
        
        dimensions = [{'Name': 'InstanceId', 'Value': instance_id}]
        
        cpu_data = get_cloudwatch_metric_data(
            cloudwatch, 
            'CPUUtilization', 
            'AWS/EC2',
            dimensions,
            period_days
        )
        
        memory_metric = 'Memory % Committed Bytes In Use' if platform.lower() == 'windows' else 'mem_used_percent'
        memory_data = get_cloudwatch_metric_data(
            cloudwatch,
            memory_metric,
            'CWAgent',
            dimensions,
            period_days
        )
        
        disk_dimensions = dimensions + [
            {'Name': 'instance' if platform.lower() == 'windows' else 'path', 
             'Value': 'C:' if platform.lower() == 'windows' else '/'}
        ]
        disk_metric = 'LogicalDisk % Free Space' if platform.lower() == 'windows' else 'disk_used_percent'
        disk_data = get_cloudwatch_metric_data(
            cloudwatch,
            disk_metric,
            'CWAgent',
            disk_dimensions,
            period_days
        )
        
        return {
            'id': instance_id,
            'name': instance_name,
            'type': instance['InstanceType'],
            'state': instance['State']['Name'],
            'platform': platform,
            'region': region,
            'service_type': 'EC2',
            'metrics': {
                'cpu': cpu_data,
                'memory': memory_data,
                'disk': disk_data
            }
        }
    except Exception as e:
        logger.error(f"Failed to get EC2 metrics for {instance_id}: {str(e)}")
        return {
            'id': instance_id,
            'name': instance_id,
            'type': 'Unknown',
            'state': 'Unknown',
            'platform': 'Unknown',
            'region': region,
            'service_type': 'EC2',
            'metrics': {
                'cpu': {'average': 0, 'min': 0, 'max': 0, 'timestamps': [], 'values': []},
                'memory': {'average': 0, 'min': 0, 'max': 0, 'timestamps': [], 'values': []},
                'disk': {'average': 0, 'min': 0, 'max': 0, 'timestamps': [], 'values': []}
            }
        }

def get_rds_metrics(aws_access_key, aws_secret_key, instance_id, region, period_days):
    """Get RDS instance metrics from CloudWatch."""
    try:
        cloudwatch = get_aws_client('cloudwatch', region, aws_access_key, aws_secret_key)
        rds_client = get_aws_client('rds', region, aws_access_key, aws_secret_key)
        
        response = rds_client.describe_db_instances(DBInstanceIdentifier=instance_id)
        instance = response['DBInstances'][0]
        
        dimensions = [{'Name': 'DBInstanceIdentifier', 'Value': instance_id}]
        
        cpu_data = get_cloudwatch_metric_data(
            cloudwatch, 
            'CPUUtilization', 
            'AWS/RDS',
            dimensions,
            period_days
        )
        
        memory_data = get_cloudwatch_metric_data(
            cloudwatch,
            'FreeableMemory',
            'AWS/RDS',
            dimensions,
            period_days
        )
        
        if memory_data['values']:
            instance_class = instance['DBInstanceClass']
            total_memory_gb = 0
            
            if 'micro' in instance_class: total_memory_gb = 1
            elif 'small' in instance_class: total_memory_gb = 2
            elif 'medium' in instance_class: total_memory_gb = 4
            elif 'large' in instance_class: total_memory_gb = 8
            elif 'xlarge' in instance_class: total_memory_gb = 16
            elif '2xlarge' in instance_class: total_memory_gb = 32
            elif '4xlarge' in instance_class: total_memory_gb = 64
            else: total_memory_gb = 8
            
            # Convert to GB
            for i, value in enumerate(memory_data['values']):
                memory_data['values'][i] = value / (1024 * 1024 * 1024)
            
            memory_data['average'] = memory_data['average'] / (1024 * 1024 * 1024)
            memory_data['min'] = memory_data['min'] / (1024 * 1024 * 1024)
            memory_data['max'] = memory_data['max'] / (1024 * 1024 * 1024)
            memory_data['total'] = total_memory_gb
        
        disk_data = get_cloudwatch_metric_data(
            cloudwatch,
            'FreeStorageSpace',
            'AWS/RDS',
            dimensions,
            period_days
        )
        
        if disk_data['values']:
            for i, value in enumerate(disk_data['values']):
                disk_data['values'][i] = value / (1024 * 1024 * 1024)
            
            disk_data['average'] = disk_data['average'] / (1024 * 1024 * 1024)
            disk_data['min'] = disk_data['min'] / (1024 * 1024 * 1024)
            disk_data['max'] = disk_data['max'] / (1024 * 1024 * 1024)
        
        return {
            'id': instance_id,
            'name': instance_id,
            'type': instance['DBInstanceClass'],
            'state': instance['DBInstanceStatus'],
            'engine': instance['Engine'],
            'region': region,
            'service_type': 'RDS',
            'metrics': {
                'cpu': cpu_data,
                'memory': memory_data,
                'disk': disk_data
            }
        }
    except Exception as e:
        logger.error(f"Failed to get RDS metrics for {instance_id}: {str(e)}")
        return {
            'id': instance_id,
            'name': instance_id,
            'type': 'Unknown',
            'state': 'Unknown',
            'engine': 'Unknown',
            'region': region,
            'service_type': 'RDS',
            'metrics': {
                'cpu': {'average': 0, 'min': 0, 'max': 0, 'timestamps': [], 'values': []},
                'memory': {'average': 0, 'min': 0, 'max': 0, 'timestamps': [], 'values': [], 'total': 0},
                'disk': {'average': 0, 'min': 0, 'max': 0, 'timestamps': [], 'values': []}
            }
        }

def get_instance_metrics(aws_access_key, aws_secret_key, resource_list, period_days):
    """Get metrics for the selected EC2 and RDS instances."""
    metrics_data = []
    
    for resource in resource_list:
        parts = resource.split('|')
        if len(parts) != 3:
            logger.error(f"Invalid resource format: {resource}")
            continue
        
        service_type, instance_id, region = parts
        
        if service_type == 'EC2':
            metrics = get_ec2_metrics(aws_access_key, aws_secret_key, instance_id, region, period_days)
            metrics_data.append(metrics)
        elif service_type == 'RDS':
            metrics = get_rds_metrics(aws_access_key, aws_secret_key, instance_id, region, period_days)
            metrics_data.append(metrics)
    
    return metrics_data