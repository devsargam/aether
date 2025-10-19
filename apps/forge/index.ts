import "dotenv/config";
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { JOB_NAMES, QUEUE_NAME } from "@aether/common";
import { cloneRepository } from "./utils";

const connection = new IORedis({
  host: process.env.REDIS_HOST!,
  port: Number(process.env.REDIS_PORT!),
});

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    console.log(`Processing job ${job.id}: ${job.name}`);

    if (job.name === JOB_NAMES.CLONE_REPOSITORY) {
      const { token, repo, branch, prNumber, owner, repoName } = job.data;

      try {
        const cloneDir = await cloneRepository(token, repo, branch);
        console.log(`Repository cloned to: ${cloneDir}`);

        // TODO: Add your code analysis/processing logic here
        // You can now work with the cloned repository

        // Return data for gh-bot to post success comment
        return {
          success: true,
          cloneDir,
          repo,
          branch,
          prNumber,
          owner,
          repoName,
          installationId: job.data.installationId,
        };
      } catch (error) {
        console.error(`Failed to clone repository:`, error);
        throw error;
      }
    }
  },
  { connection }
);

worker.on("completed", (job) => {
  console.log(`✓ Job ${job.id} (${job.name}) has completed!`);
});

worker.on("failed", (job, err) => {
  console.error(
    `✗ Job ${job?.id} (${job?.name}) has failed with ${err.message}`
  );
});

worker.on("error", (err) => {
  console.error("Worker error:", err);
});

console.log("🔨 Forge worker started and listening for jobs...");
console.log(
  `📡 Connected to Redis at ${process.env.REDIS_HOST || "localhost"}:${
    process.env.REDIS_PORT || 6379
  }`
);
