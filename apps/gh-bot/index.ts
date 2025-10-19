import "dotenv/config";
import { App } from "@octokit/app";
import { OAuthApp, createNodeMiddleware } from "@octokit/oauth-app";
import {
  Webhooks,
  createNodeMiddleware as createWebhookMiddleware,
} from "@octokit/webhooks";
import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { simpleGit } from "simple-git";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { Queue } from "bullmq";

const queue = new Queue("aether-pulse");

// GitHub App instance (for installation tokens)
const githubApp = new App({
  appId: process.env.GITHUB_APP_ID!,
  privateKey: process.env.GITHUB_APP_PRIVATE_KEY!.replace(/\\n/g, "\n"),
  webhooks: {
    secret: process.env.GITHUB_APP_WEBHOOK_SECRET!,
  },
});

// OAuth App setup (for user authentication)
const oauthApp = new OAuthApp({
  clientType: "github-app",
  clientId: process.env.GITHUB_APP_CLIENT_ID!,
  clientSecret: process.env.GITHUB_APP_CLIENT_SECRET!,
});

oauthApp.on("token", async ({ token, octokit }) => {
  console.log(`Token retrieved for ${token}`);
  const { data } = await octokit.request("GET /user");
  console.log(`Token retrieved for ${data.login}`);
});

// Webhook setup
const webhooks = new Webhooks({
  secret: process.env.GITHUB_APP_WEBHOOK_SECRET!,
});

// Helper function to clone repository
async function cloneRepository(
  installationId: number,
  repoFullName: string,
  branch: string
) {
  try {
    // Get installation access token
    const octokit = await githubApp.getInstallationOctokit(installationId);
    const { data: installationToken } = await octokit.request(
      "POST /app/installations/{installation_id}/access_tokens",
      {
        installation_id: installationId,
      }
    );

    // Parse repo owner and name
    const [owner, repo] = repoFullName.split("/");

    // Create clone directory
    const cloneDir = join(process.cwd(), "repos", `${owner}-${repo}-${branch}`);
    await mkdir(cloneDir, { recursive: true });

    // Clone with authentication
    const cloneUrl = `https://x-access-token:${installationToken.token}@github.com/${repoFullName}.git`;

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

// Webhook event handlers
webhooks.on("issues.opened", async ({ payload }) => {
  console.log(`Issue opened: ${payload.issue.title}`);
});

webhooks.on("pull_request.opened", async ({ payload }) => {
  console.log(`PR opened: ${payload.pull_request.title}`);
});

webhooks.on("push", async ({ payload }) => {
  console.log(`Push to ${payload.repository.full_name}`);
});

webhooks.on("installation.created", async ({ payload }) => {
  console.log(`Installation created: ${payload.installation.id}`);
});

webhooks.on("issue_comment.created", async ({ payload }) => {
  console.log(`Issue comment created: ${payload.comment.body}`);
});

webhooks.on("pull_request.opened", async ({ payload }) => {
  const repo = payload.repository.full_name;
  const ref = payload.pull_request.head.ref;
  const installationId = payload.installation!.id;
  const prNumber = payload.pull_request.number;
  const [owner, repoName] = repo.split("/");

  console.log(`PR opened in ${repo} on branch ${ref}`);

  try {
    // Get installation octokit for API calls
    const octokit = await githubApp.getInstallationOctokit(installationId);

    // Clone the repository at the PR's branch
    const cloneDir = await cloneRepository(installationId, repo, ref);
    console.log(`Repository cloned to: ${cloneDir}`);

    // Comment on the PR to confirm cloning
    await octokit.request(
      "POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
      {
        owner,
        repo: repoName,
        issue_number: prNumber,
        body: `✅ Repository successfully cloned and ready for analysis!\n\n📂 Branch: \`${ref}\`\n📍 Clone location: \`${cloneDir}\``,
      }
    );

    console.log(`✓ Posted comment on PR #${prNumber}`);

    // TODO: Add your code analysis/processing logic here
    // You can now work with the cloned repository
  } catch (error) {
    console.error(`Failed to clone repository:`, error);

    // Try to comment about the error
    try {
      const octokit = await githubApp.getInstallationOctokit(installationId);
      await octokit.request(
        "POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
        {
          owner,
          repo: repoName,
          issue_number: prNumber,
          body: `❌ Failed to clone repository for analysis.\n\n\`\`\`\n${error}\n\`\`\``,
        }
      );
    } catch (commentError) {
      console.error(`Failed to post error comment:`, commentError);
    }
  }
});

webhooks.on("pull_request.reopened", async ({ payload }) => {
  const repo = payload.repository.full_name;
  const ref = payload.pull_request.head.ref;
  const installationId = payload.installation!.id;
  const prNumber = payload.pull_request.number;
  const [owner, repoName] = repo.split("/");

  console.log(`PR reopened in ${repo} on branch ${ref}`);

  try {
    // Get installation octokit for API calls
    const octokit = await githubApp.getInstallationOctokit(installationId);

    // Clone the repository at the PR's branch
    const cloneDir = await cloneRepository(installationId, repo, ref);
    console.log(`Repository cloned to: ${cloneDir}`);

    // Comment on the PR to confirm cloning
    await octokit.request(
      "POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
      {
        owner,
        repo: repoName,
        issue_number: prNumber,
        body: `✅ Repository successfully cloned and ready for analysis!\n\n📂 Branch: \`${ref}\`\n📍 Clone location: \`${cloneDir}\``,
      }
    );

    console.log(`✓ Posted comment on PR #${prNumber}`);

    // TODO: Add your code analysis/processing logic here
  } catch (error) {
    console.error(`Failed to clone repository:`, error);

    // Try to comment about the error
    try {
      const octokit = await githubApp.getInstallationOctokit(installationId);
      await octokit.request(
        "POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
        {
          owner,
          repo: repoName,
          issue_number: prNumber,
          body: `❌ Failed to clone repository for analysis.\n\n\`\`\`\n${error}\n\`\`\``,
        }
      );
    } catch (commentError) {
      console.error(`Failed to post error comment:`, commentError);
    }
  }
});

// Add more webhook handlers as needed
webhooks.onAny(async ({ name, payload }) => {
  console.log(`Received webhook event: ${name}`);
});

// Create middleware handlers
const oauthMiddleware = createNodeMiddleware(oauthApp);
const webhookMiddleware = createWebhookMiddleware(webhooks, {
  path: "/api/github/webhook",
});

// Create HTTP server
const server = createServer(
  async (req: IncomingMessage, res: ServerResponse) => {
    // Try OAuth middleware first
    if (await oauthMiddleware(req, res)) {
      return;
    }

    // Try webhook middleware
    if (await webhookMiddleware(req, res)) {
      return;
    }

    // Not found
    res.statusCode = 404;
    res.end("Not found");
  }
);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`GitHub app listening on port ${PORT}`);
  console.log(
    `OAuth callback: http://localhost:${PORT}/api/github/oauth/callback`
  );
  console.log(`Webhook endpoint: http://localhost:${PORT}/api/github/webhook`);
});
// OAuth callbacks at /api/github/oauth/callback
// Webhooks at /api/github/webhook
