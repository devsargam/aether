import { simpleGit } from "simple-git";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

export async function cloneRepository(
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
