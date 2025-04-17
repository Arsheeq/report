import { pgTable, text, serial, integer, boolean, timestamp, varchar, json } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const cloudAccounts = pgTable("cloud_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  provider: text("provider").notNull(), // AWS or Azure
  credentials: json("credentials").notNull(), // encrypted credentials
  createdAt: timestamp("created_at").defaultNow(),
});

export const resources = pgTable("resources", {
  id: serial("id").primaryKey(),
  cloudAccountId: integer("cloud_account_id").references(() => cloudAccounts.id),
  resourceId: text("resource_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  region: text("region").notNull(),
  status: text("status"),
  metadata: json("metadata"),
});

export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  cloudAccountId: integer("cloud_account_id").references(() => cloudAccounts.id),
  reportType: text("report_type").notNull(), // 'utilization' or 'billing'
  resourceIds: text("resource_ids").array(),
  timeframe: json("timeframe"),
  frequency: text("frequency"),
  format: text("format").notNull(),
  delivery: json("delivery"),
  status: text("status").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  downloadUrl: text("download_url"),
});

// Define relations after all tables are defined
export const userRelations = relations(users, ({ many }) => ({
  cloudAccounts: many(cloudAccounts),
  reports: many(reports)
}));

export const cloudAccountRelations = relations(cloudAccounts, ({ one, many }) => ({
  user: one(users, {
    fields: [cloudAccounts.userId],
    references: [users.id],
  }),
  resources: many(resources),
  reports: many(reports)
}));

export const resourceRelations = relations(resources, ({ one }) => ({
  cloudAccount: one(cloudAccounts, {
    fields: [resources.cloudAccountId],
    references: [cloudAccounts.id],
  })
}));

export const reportRelations = relations(reports, ({ one }) => ({
  user: one(users, {
    fields: [reports.userId],
    references: [users.id],
  }),
  cloudAccount: one(cloudAccounts, {
    fields: [reports.cloudAccountId],
    references: [cloudAccounts.id],
  })
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertCloudAccountSchema = createInsertSchema(cloudAccounts).pick({
  userId: true,
  provider: true,
  credentials: true,
});

export const insertResourceSchema = createInsertSchema(resources).pick({
  cloudAccountId: true,
  resourceId: true,
  name: true,
  type: true,
  region: true,
  status: true,
  metadata: true,
});

export const insertReportSchema = createInsertSchema(reports).pick({
  userId: true,
  cloudAccountId: true,
  reportType: true,
  resourceIds: true,
  timeframe: true,
  frequency: true,
  format: true,
  delivery: true,
  status: true,
});

// Select types
export type User = typeof users.$inferSelect;
export type CloudAccount = typeof cloudAccounts.$inferSelect;
export type Resource = typeof resources.$inferSelect;
export type Report = typeof reports.$inferSelect;

// Insert types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertCloudAccount = z.infer<typeof insertCloudAccountSchema>;
export type InsertResource = z.infer<typeof insertResourceSchema>;
export type InsertReport = z.infer<typeof insertReportSchema>;

// App-specific types
export type CloudProvider = 'aws' | 'azure';
export type ReportType = 'utilization' | 'billing';
export type ReportFrequency = 'once' | 'daily' | 'weekly' | 'monthly' | 'quarterly';
export type ReportFormat = 'pdf' | 'csv' | 'json';
export type ReportStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type ResourceStatus = 'running' | 'stopped' | 'terminated' | 'available' | 'unavailable' | 'active';
