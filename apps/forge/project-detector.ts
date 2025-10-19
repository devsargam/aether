import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export type ProjectType = {
  isNextJs: boolean;
  hasPnpm: boolean;
};

export async function detectProjectType(
  repoPath: string
): Promise<ProjectType> {
  try {
    const files = await readdir(repoPath);

    // Check for Next.js and pnpm
    const hasPackageJson = files.includes("package.json");
    const hasPnpmLock = files.includes("pnpm-lock.yaml");

    if (!hasPackageJson) {
      return { isNextJs: false, hasPnpm: false };
    }

    const packageJson = JSON.parse(
      await readFile(join(repoPath, "package.json"), "utf-8")
    );

    const isNextJs =
      !!packageJson.dependencies?.next || !!packageJson.devDependencies?.next;

    return {
      isNextJs,
      hasPnpm: hasPnpmLock,
    };
  } catch (error) {
    console.error("Error detecting project type:", error);
    return { isNextJs: false, hasPnpm: false };
  }
}
