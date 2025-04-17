import { z } from "zod";

// AWS Credentials Validator
export const awsCredentialsSchema = z.object({
  accessKeyId: z
    .string()
    .min(16, { message: "Access Key ID must be at least 16 characters long" })
    .max(128, { message: "Access Key ID is too long" }),
  secretAccessKey: z
    .string()
    .min(16, { message: "Secret Access Key must be at least 16 characters long" })
    .max(128, { message: "Secret Access Key is too long" }),
});

// Azure Credentials Validator
export const azureCredentialsSchema = z.object({
  tenantId: z
    .string()
    .min(8, { message: "Tenant ID is required" })
    .max(128, { message: "Tenant ID is too long" }),
  clientId: z
    .string()
    .min(8, { message: "Client ID is required" })
    .max(128, { message: "Client ID is too long" }),
  clientSecret: z
    .string()
    .min(8, { message: "Client Secret is required" })
    .max(256, { message: "Client Secret is too long" }),
});

// Timeframe Validator
export const timeframeSchema = z.object({
  year: z
    .number()
    .int()
    .min(2020, { message: "Year must be 2020 or later" })
    .max(new Date().getFullYear(), { message: "Year cannot be in the future" }),
  month: z
    .number()
    .int()
    .min(1, { message: "Month must be between 1 and 12" })
    .max(12, { message: "Month must be between 1 and 12" }),
});

// Email Validator
export const emailSchema = z
  .string()
  .email({ message: "Please enter a valid email address" });

// Report Generation Validator
export const reportGenerationSchema = z.object({
  cloudAccountId: z.number().int().positive(),
  reportType: z.enum(["utilization", "billing"]),
  resourceIds: z.array(z.string()).optional(),
  timeframe: timeframeSchema.optional(),
  frequency: z.enum(["once", "daily", "weekly", "monthly", "quarterly"]),
  format: z.enum(["pdf", "csv", "json"]),
  delivery: z.object({
    email: z.string().email().optional().nullable(),
  }),
});
