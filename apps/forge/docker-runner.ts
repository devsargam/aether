import { exec } from "node:child_process";
import { promisify } from "node:util";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

const execAsync = promisify(exec);

export type DockerRunResult = {
  success: boolean;
  containerId?: string;
  imageName?: string;
  buildLogs: string;
  port?: number;
  error?: string;
};

function generateNextJsDockerfile(): string {
  return `FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

EXPOSE 3000

# Start the application
CMD ["pnpm", "start"]
`;
}

export async function buildAndRunInDocker(
  repoPath: string,
  hostPort: number,
  appId: string,
  timeout: number = 600000
): Promise<DockerRunResult> {
  let imageName: string | undefined;
  let containerId: string | undefined;

  try {
    // Generate Dockerfile
    const dockerfile = generateNextJsDockerfile();
    const dockerfilePath = join(repoPath, "Dockerfile.aether");
    await writeFile(dockerfilePath, dockerfile);

    console.log(`Generated Dockerfile for Next.js project`);

    // Generate unique image and container names
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    imageName = `aether-app-${uniqueId}`;
    const containerName = `aether-container-${uniqueId}`;

    // Build Docker image
    console.log(`Building Docker image: ${imageName}...`);
    const buildCommand = `docker build -f ${dockerfilePath} -t ${imageName} ${repoPath}`;

    let buildLogs = "";
    try {
      const { stdout, stderr } = await execAsync(buildCommand, {
        timeout,
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer for build logs
      });
      buildLogs = stdout + stderr;
      console.log(`Docker build completed successfully`);
    } catch (error: any) {
      console.error(`Failed to build Docker image:`, error.message);
      buildLogs = (error.stdout || "") + (error.stderr || "");

      return {
        success: false,
        buildLogs,
        error: `Build failed: ${error.message}`,
      };
    }

    // Run the container (no base path needed with subdomain approach)
    console.log(`Starting container on port ${hostPort}...`);
    const runCommand = `docker run -d --name ${containerName} -p ${hostPort}:3000 ${imageName}`;

    try {
      const { stdout } = await execAsync(runCommand);
      containerId = stdout.trim();
      console.log(
        `Container started: ${containerId.substring(0, 12)} on port ${hostPort}`
      );

      // Wait a bit for the app to start
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Check if container is still running
      const { stdout: statusOutput } = await execAsync(
        `docker inspect -f '{{.State.Running}}' ${containerId}`
      );
      const isRunning = statusOutput.trim() === "true";

      if (!isRunning) {
        // Get logs to see what went wrong
        const { stdout: logs } = await execAsync(
          `docker logs ${containerId}`
        ).catch(() => ({ stdout: "Could not fetch logs" }));

        return {
          success: false,
          containerId,
          imageName,
          buildLogs: buildLogs + "\n\n=== Container Logs ===\n" + logs,
          error: "Container exited unexpectedly",
        };
      }

      return {
        success: true,
        containerId,
        imageName,
        buildLogs,
        port: hostPort,
      };
    } catch (error: any) {
      console.error(`Failed to start container:`, error.message);
      return {
        success: false,
        imageName,
        buildLogs,
        error: `Failed to start container: ${error.message}`,
      };
    }
  } catch (error: any) {
    console.error(`Error in Docker build and run:`, error);
    return {
      success: false,
      buildLogs: "",
      error: error.message,
    };
  }
}

export async function stopContainer(containerId: string): Promise<void> {
  try {
    console.log(`Stopping container ${containerId.substring(0, 12)}...`);
    await execAsync(`docker stop ${containerId}`);
    await execAsync(`docker rm ${containerId}`);
    console.log(`Container stopped and removed`);
  } catch (error: any) {
    console.error(`Error stopping container:`, error.message);
  }
}

export async function removeImage(imageName: string): Promise<void> {
  try {
    console.log(`Removing image ${imageName}...`);
    await execAsync(`docker rmi ${imageName}`);
    console.log(`Image removed`);
  } catch (error: any) {
    console.error(`Error removing image:`, error.message);
  }
}

export async function getContainerLogs(containerId: string): Promise<string> {
  try {
    const { stdout, stderr } = await execAsync(
      `docker logs ${containerId} --tail 100`
    );
    return stdout + stderr;
  } catch (error: any) {
    return (error.stdout || "") + (error.stderr || "");
  }
}
