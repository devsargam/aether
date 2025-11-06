import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
});

export const db = drizzle(pool);

// Helper function to update project status
export async function updateProjectStatus(
  projectId: string,
  status:
    | "pending"
    | "cloning"
    | "detecting"
    | "allocating"
    | "building"
    | "deploying"
    | "deployed"
    | "failed",
) {
  await db.execute(
    sql`UPDATE project SET status = ${status}, updated_at = NOW() WHERE id = ${projectId}`,
  );
}

// Helper function to update deployment status
export async function updateDeploymentStatus(
  deploymentId: string,
  status:
    | "pending"
    | "cloning"
    | "detecting"
    | "allocating"
    | "building"
    | "deploying"
    | "success"
    | "failed",
  data?: {
    url?: string;
    error?: string;
    buildLogs?: string;
  },
) {
  if (data?.url) {
    await db.execute(
      sql`UPDATE deployment SET status = ${status}, url = ${data.url}, completed_at = NOW() WHERE id = ${deploymentId}`,
    );
  } else if (data?.error) {
    await db.execute(
      sql`UPDATE deployment SET status = ${status}, error = ${data.error}, build_logs = ${data.buildLogs || null}, completed_at = NOW() WHERE id = ${deploymentId}`,
    );
  } else {
    await db.execute(
      sql`UPDATE deployment SET status = ${status} WHERE id = ${deploymentId}`,
    );
  }
}
