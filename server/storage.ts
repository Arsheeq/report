import { 
  users, type User, type InsertUser,
  cloudAccounts, type CloudAccount, type InsertCloudAccount,
  resources, type Resource, type InsertResource,
  reports, type Report, type InsertReport,
  type CloudProvider, type ReportType, type ResourceStatus
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

// Storage interface
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Cloud account methods
  getCloudAccount(id: number): Promise<CloudAccount | undefined>;
  getCloudAccountsByUserId(userId: number): Promise<CloudAccount[]>;
  createCloudAccount(account: InsertCloudAccount): Promise<CloudAccount>;
  
  // Resource methods
  getResource(id: number): Promise<Resource | undefined>;
  getResourcesByCloudAccountId(cloudAccountId: number): Promise<Resource[]>;
  createResource(resource: InsertResource): Promise<Resource>;
  getResourceByResourceId(resourceId: string): Promise<Resource | undefined>;
  
  // Report methods
  getReport(id: number): Promise<Report | undefined>;
  getReportsByUserId(userId: number): Promise<Report[]>;
  createReport(report: InsertReport): Promise<Report>;
  updateReportStatus(id: number, status: string, downloadUrl?: string): Promise<Report | undefined>;
}

// Database storage implementation using Drizzle
export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  
  // Cloud account methods
  async getCloudAccount(id: number): Promise<CloudAccount | undefined> {
    const [account] = await db.select().from(cloudAccounts).where(eq(cloudAccounts.id, id));
    return account;
  }
  
  async getCloudAccountsByUserId(userId: number): Promise<CloudAccount[]> {
    return await db.select().from(cloudAccounts).where(eq(cloudAccounts.userId, userId));
  }
  
  async createCloudAccount(insertAccount: InsertCloudAccount): Promise<CloudAccount> {
    const [account] = await db.insert(cloudAccounts).values(insertAccount).returning();
    return account;
  }
  
  // Resource methods
  async getResource(id: number): Promise<Resource | undefined> {
    const [resource] = await db.select().from(resources).where(eq(resources.id, id));
    return resource;
  }
  
  async getResourcesByCloudAccountId(cloudAccountId: number): Promise<Resource[]> {
    return await db.select().from(resources).where(eq(resources.cloudAccountId, cloudAccountId));
  }
  
  async createResource(insertResource: InsertResource): Promise<Resource> {
    const [resource] = await db.insert(resources).values(insertResource).returning();
    return resource;
  }
  
  async getResourceByResourceId(resourceId: string): Promise<Resource | undefined> {
    const [resource] = await db.select().from(resources).where(eq(resources.resourceId, resourceId));
    return resource;
  }
  
  // Report methods
  async getReport(id: number): Promise<Report | undefined> {
    const [report] = await db.select().from(reports).where(eq(reports.id, id));
    return report;
  }
  
  async getReportsByUserId(userId: number): Promise<Report[]> {
    return await db.select().from(reports).where(eq(reports.userId, userId));
  }
  
  async createReport(insertReport: InsertReport): Promise<Report> {
    const [report] = await db.insert(reports).values(insertReport).returning();
    return report;
  }
  
  async updateReportStatus(id: number, status: string, downloadUrl?: string): Promise<Report | undefined> {
    const updateData: Partial<Report> = {
      status,
    };
    
    if (status === 'completed') {
      updateData.completedAt = new Date();
    }
    
    if (downloadUrl) {
      updateData.downloadUrl = downloadUrl;
    }
    
    const [updatedReport] = await db
      .update(reports)
      .set(updateData)
      .where(eq(reports.id, id))
      .returning();
      
    return updatedReport;
  }
  
  // Setup demo data
  async setupDemoData() {
    // Check if we already have data
    const userCount = await db.select({ count: count() }).from(users);
    if (userCount[0].count > 0) {
      return; // Data already exists
    }
    
    // Create a demo user
    const [user] = await db.insert(users).values({
      username: 'demo',
      password: 'password'
    }).returning();
    
    // Create cloud accounts
    const [awsAccount] = await db.insert(cloudAccounts).values({
      userId: user.id,
      provider: 'aws',
      credentials: { accessKey: 'sample-key', secretKey: 'sample-secret' }
    }).returning();
    
    const [azureAccount] = await db.insert(cloudAccounts).values({
      userId: user.id,
      provider: 'azure',
      credentials: { tenantId: 'sample-tenant', clientId: 'sample-client', clientSecret: 'sample-secret' }
    }).returning();
    
    // Create sample AWS resources
    const awsResources = [
      {
        cloudAccountId: awsAccount.id,
        resourceId: 'i-0a1b2c3d4e5f6g7h8',
        name: 'web-server-prod',
        type: 'EC2 Instance',
        region: 'us-east-1',
        status: 'running',
        metadata: { instanceType: 't2.micro', launchTime: '2023-01-15T00:00:00Z' }
      },
      {
        cloudAccountId: awsAccount.id,
        resourceId: 'i-0z9y8x7w6v5u4t3s',
        name: 'data-processing',
        type: 'EC2 Instance',
        region: 'us-west-2',
        status: 'stopped',
        metadata: { instanceType: 'm5.large', launchTime: '2023-02-20T00:00:00Z' }
      },
      {
        cloudAccountId: awsAccount.id,
        resourceId: 'company-assets-bucket-2023',
        name: 'company-assets',
        type: 'S3 Bucket',
        region: 'us-east-1',
        status: 'active',
        metadata: { creationDate: '2023-03-10T00:00:00Z', sizeGB: 250 }
      },
      {
        cloudAccountId: awsAccount.id,
        resourceId: 'db-c7f8e9d0a1b2',
        name: 'customer-db',
        type: 'RDS Database',
        region: 'us-east-1',
        status: 'available',
        metadata: { engine: 'postgres', instanceClass: 'db.t3.medium' }
      },
      {
        cloudAccountId: awsAccount.id,
        resourceId: 'image-process-function',
        name: 'image-processing',
        type: 'Lambda Function',
        region: 'us-east-2',
        status: 'active',
        metadata: { runtime: 'nodejs16.x', memory: 1024 }
      }
    ];
    
    // Create sample Azure resources
    const azureResources = [
      {
        cloudAccountId: azureAccount.id,
        resourceId: 'vm-123456',
        name: 'api-server',
        type: 'Virtual Machine',
        region: 'eastus',
        status: 'running',
        metadata: { size: 'Standard_D2s_v3', osType: 'Linux' }
      },
      {
        cloudAccountId: azureAccount.id,
        resourceId: 'vm-789012',
        name: 'auth-server',
        type: 'Virtual Machine',
        region: 'westeurope',
        status: 'stopped',
        metadata: { size: 'Standard_D4s_v3', osType: 'Windows' }
      },
      {
        cloudAccountId: azureAccount.id,
        resourceId: 'cosmos-db-456789',
        name: 'product-database',
        type: 'Cosmos DB',
        region: 'eastus',
        status: 'available',
        metadata: { tier: 'Standard', replicaCount: 3 }
      },
      {
        cloudAccountId: azureAccount.id,
        resourceId: 'sa-012345',
        name: 'media-storage',
        type: 'Storage Account',
        region: 'westus',
        status: 'active',
        metadata: { replicationType: 'LRS', kind: 'StorageV2' }
      }
    ];
    
    // Insert all resources
    await db.insert(resources).values([...awsResources, ...azureResources]);
  }
}

// Missing count import, so let's add it
import { count } from "drizzle-orm";

export const storage = new DatabaseStorage();
