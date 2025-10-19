import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

// Port range for running applications
const PORT_RANGE_START = 5000;
const PORT_RANGE_END = 5100;

const allocatedPorts = new Set<number>();

async function isPortAvailable(port: number): Promise<boolean> {
  try {
    // Check if port is in use using lsof
    await execAsync(`lsof -i :${port}`);
    return false; // Port is in use
  } catch {
    return true; // Port is available
  }
}

export async function allocatePort(): Promise<number> {
  for (let port = PORT_RANGE_START; port <= PORT_RANGE_END; port++) {
    if (!allocatedPorts.has(port) && (await isPortAvailable(port))) {
      allocatedPorts.add(port);
      console.log(`Allocated port ${port}`);
      return port;
    }
  }

  throw new Error(
    `No available ports in range ${PORT_RANGE_START}-${PORT_RANGE_END}`
  );
}

export function releasePort(port: number): void {
  allocatedPorts.delete(port);
  console.log(`Released port ${port}`);
}

export function getAllocatedPorts(): Array<number> {
  return Array.from(allocatedPorts);
}
