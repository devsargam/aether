import "dotenv/config";
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { simpleGit } from "simple-git";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const connection = new IORedis({
  host: process.env.REDIS_HOST!,
  port: Number(process.env.REDIS_PORT!),
  maxRetriesPerRequest: null,
});

// Helper function to clone repository
async function cloneRepository(
  token: string,
  repoFullName: string,
  branch: string
) {
  try {
    // Parse repo owner and name
    const [owner, repo] = repoFullName.split("/");

    // Create clone directory
    const cloneDir = join(process.cwd(), "repos", `${owner}-${repo}-${branch}`);
    await mkdir(cloneDir, { recursive: true });

    // Clone with authentication using token from queue
    const cloneUrl = `https://x-access-token:${token}@github.com/${repoFullName}.git`;

    console.log(
      `Cloning ${repoFullName} (branch: ${branch}) to ${cloneDir}...`
    );

    const git = simpleGit();
    await git.clone(cloneUrl, cloneDir, [
      "--branch",
      branch,
      "--single-branch",
    ]);

    console.log(`✓ Successfully cloned ${repoFullName} to ${cloneDir}`);

    return cloneDir;
  } catch (error) {
    console.error(`Error cloning repository:`, error);
    throw error;
  }
}

// Create worker to process clone jobs
const worker = new Worker(
  "aether-pulse",
  async (job) => {
    console.log(`Processing job ${job.id}: ${job.name}`);

    if (job.name === "clone-repository") {
      const { token, repo, branch, prNumber, owner, repoName } = job.data;

      try {
        // Clone the repository at the PR's branch
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
