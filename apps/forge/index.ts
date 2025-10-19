import "dotenv/config";
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { JOB_NAMES, QUEUE_NAME } from "@aether/common";
import { cloneRepository } from "./utils";
import { detectProjectType } from "./project-detector";
import {
  buildAndRunInDocker,
  stopContainer,
  removeImage,
} from "./docker-runner";
import { allocatePort, releasePort } from "./port-manager";
import { startProxyServer, registerApp, unregisterApp } from "./proxy-server";

const connection = new IORedis({
  host: process.env.REDIS_HOST!,
  port: Number(process.env.REDIS_PORT!),
  maxRetriesPerRequest: null,
});

// Start the reverse proxy server
startProxyServer();

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    console.log(`Processing job ${job.id}: ${job.name}`);

    if (job.name === JOB_NAMES.CLONE_REPOSITORY) {
      const { token, repo, branch, prNumber, owner, repoName, commentId } =
        job.data;
      let allocatedPort: number | undefined;
      let containerId: string | undefined;
      let imageName: string | undefined;

      try {
        // Step 1: Clone the repository
        console.log(`\nStep 1: Cloning repository...`);
        const cloneDir = await cloneRepository(token, repo, branch);
        console.log(`Repository cloned to: ${cloneDir}`);

        // Step 2: Detect if it's a Next.js project with pnpm
        console.log(`\nStep 2: Checking project type...`);
        const projectType = await detectProjectType(cloneDir);

        if (!projectType.isNextJs) {
          return {
            success: false,
            cloneDir,
            repo,
            branch,
            prNumber,
            owner,
            repoName,
            installationId: job.data.installationId,
            commentId,
            error: "Not a Next.js project",
          };
        }

        if (!projectType.hasPnpm) {
          return {
            success: false,
            cloneDir,
            repo,
            branch,
            prNumber,
            owner,
            repoName,
            installationId: job.data.installationId,
            commentId,
            error: "Project does not use pnpm (no pnpm-lock.yaml found)",
          };
        }

        console.log(`Next.js project with pnpm detected`);

        // Step 3: Allocate a port
        console.log(`\nStep 3: Allocating port...`);
        allocatedPort = await allocatePort();

        // Step 4: Build and run in Docker
        console.log(
          `\nStep 4: Building and running 'pnpm run build' in Docker...`
        );
        const appId = `${owner}-${repoName}-pr${prNumber}`;
        const dockerResult = await buildAndRunInDocker(
          cloneDir,
          allocatedPort,
          appId,
          600000
        );

        containerId = dockerResult.containerId;
        imageName = dockerResult.imageName;

        if (!dockerResult.success) {
          console.error(`Build/Run failed`);
          if (allocatedPort) {
            releasePort(allocatedPort);
          }
          return {
            success: false,
            cloneDir,
            repo,
            branch,
            prNumber,
            owner,
            repoName,
            installationId: job.data.installationId,
            commentId,
            error: dockerResult.error,
            buildLogs: dockerResult.buildLogs,
          };
        }

        console.log(`Build and run completed successfully`);

        // Step 5: Register with reverse proxy
        console.log(`\nStep 5: Registering with reverse proxy...`);
        const proxyUrl = registerApp(appId, allocatedPort);

        // Track running container for cleanup
        runningContainers.set(containerId!, {
          containerId: containerId!,
          imageName: imageName!,
          port: allocatedPort,
          appId,
        });

        // Return success data
        return {
          success: true,
          cloneDir,
          repo,
          branch,
          prNumber,
          owner,
          repoName,
          installationId: job.data.installationId,
          commentId,
          buildLogs: dockerResult.buildLogs,
          containerId,
          imageName,
          port: allocatedPort,
          proxyUrl,
          appId,
        };
      } catch (error) {
        console.error(`Failed to process repository:`, error);

        // Cleanup on error
        if (allocatedPort) {
          releasePort(allocatedPort);
        }
        if (containerId) {
          await stopContainer(containerId).catch(console.error);
        }
        if (imageName) {
          await removeImage(imageName).catch(console.error);
        }

        throw error;
      }
    }
  },
  { connection }
);

worker.on("completed", async (job) => {
  console.log(`\nJob ${job.id} (${job.name}) has completed!`);

  const result = job.returnvalue;
  if (result?.proxyUrl) {
    console.log(`\nApplication is now accessible at:`);
    console.log(`   ${result.proxyUrl}`);
  }
});

worker.on("failed", async (job, err) => {
  console.error(
    `\nJob ${job?.id} (${job?.name}) has failed with ${err.message}`
  );

  // Cleanup on failure
  const data = job?.data;
  if (data?.appId) {
    unregisterApp(data.appId);
  }
});

worker.on("error", (err) => {
  console.error("Worker error:", err);
});

// Track running containers for cleanup
const runningContainers = new Map<
  string,
  { containerId: string; imageName: string; port: number; appId: string }
>();

// Graceful shutdown handler
async function cleanup() {
  console.log("\n\nShutting down gracefully...");

  if (runningContainers.size > 0) {
    console.log(`Cleaning up ${runningContainers.size} running containers...`);

    for (const [, info] of runningContainers) {
      console.log(`  • Stopping ${info.appId}...`);
      await stopContainer(info.containerId).catch(console.error);
      await removeImage(info.imageName).catch(console.error);
      releasePort(info.port);
      unregisterApp(info.appId);
    }
  }

  await worker.close();
  await connection.quit();
  console.log("Cleanup complete. Goodbye!\n");
  process.exit(0);
}

process.on("SIGTERM", cleanup);
process.on("SIGINT", cleanup);

console.log("\nForge worker started and listening for jobs...");
console.log(
  `Connected to Redis at ${process.env.REDIS_HOST || "localhost"}:${
    process.env.REDIS_PORT || 6379
  }`
);
console.log(`Docker enabled - will build and run Next.js projects with pnpm`);
console.log(`\nWaiting for jobs...\n`);
