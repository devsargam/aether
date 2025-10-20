import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export const project = pgTable("project", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  repositoryFullName: text("repository_full_name").notNull(), // e.g. "owner/repo"
  defaultBranch: text("default_branch").notNull().default("main"),
  status: text("status").notNull().default("pending"), // pending, building, deployed, failed
  deploymentUrl: text("deployment_url"),
  lastDeployedAt: timestamp("last_deployed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const deployment = pgTable("deployment", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => project.id, { onDelete: "cascade" }),
  branch: text("branch").notNull(),
  commitSha: text("commit_sha"),
  status: text("status").notNull().default("pending"), // pending, building, success, failed
  url: text("url"),
  buildLogs: text("build_logs"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});
