import "dotenv/config";
import { App } from "@octokit/app";
import { OAuthApp, createNodeMiddleware } from "@octokit/oauth-app";
import {
  Webhooks,
  createNodeMiddleware as createWebhookMiddleware,
} from "@octokit/webhooks";
import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { Queue, QueueEvents } from "bullmq";
import IORedis from "ioredis";
import { QUEUE_NAME } from "@aether/common";

const connection = new IORedis({
  host: process.env.REDIS_HOST!,
  port: Number(process.env.REDIS_PORT!),
  maxRetriesPerRequest: null,
});

const queue = new Queue(QUEUE_NAME, { connection });
const queueEvents = new QueueEvents(QUEUE_NAME, { connection });

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

// Queue event listeners for job completion
queueEvents.on("completed", async ({ jobId, returnvalue }) => {
  console.log(`✓ Job ${jobId} completed with result:`, returnvalue);

  try {
    const result = returnvalue as any;

    if (result.success && result.cloneDir) {
      const { owner, repoName, prNumber, branch } = result;
      const octokit = await githubApp.getInstallationOctokit(
        result.installationId
      );

      await octokit.request(
        "POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
        {
          owner,
          repo: repoName,
          issue_number: prNumber,
          body: `✅ Repository successfully cloned and ready for analysis!\n\n📂 Branch: \`${branch}\`\n📍 Clone location: \`${result.cloneDir}\`\n🔨 Processing completed by forge service`,
        }
      );

      console.log(`✓ Posted success comment on PR #${prNumber}`);
    }
  } catch (error) {
    console.error("Error handling job completion:", error);
  }
});

queueEvents.on("failed", async ({ jobId, failedReason }) => {
  console.error(`✗ Job ${jobId} failed: ${failedReason}`);

  // Note: We can't easily get job data from failed event without fetching the job
  // Error comments are best handled in the webhook handler
});

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
    // Get installation octokit and token
    const octokit = await githubApp.getInstallationOctokit(installationId);
    const { data: installationToken } = await octokit.request(
      "POST /app/installations/{installation_id}/access_tokens",
      {
        installation_id: installationId,
      }
    );

    // Add clone job to queue for forge service to process
    const job = await queue.add("clone-repository", {
      token: installationToken.token,
      repo,
      branch: ref,
      prNumber,
      owner,
      repoName,
      installationId, // Pass for later use in completion handler
    });

    console.log(
      `✓ Added clone job to queue for PR #${prNumber} (Job ID: ${job.id})`
    );

    // Comment on the PR to confirm job queued
    await octokit.request(
      "POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
      {
        owner,
        repo: repoName,
        issue_number: prNumber,
        body: `🔄 Repository clone job queued for processing!\n\n📂 Branch: \`${ref}\`\n⏳ Please wait while we prepare your repository for analysis...`,
      }
    );

    console.log(`✓ Posted comment on PR #${prNumber}`);
  } catch (error) {
    console.error(`Failed to queue clone job:`, error);

    // Try to comment about the error
    try {
      const octokit = await githubApp.getInstallationOctokit(installationId);
      await octokit.request(
        "POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
        {
          owner,
          repo: repoName,
          issue_number: prNumber,
          body: `❌ Failed to queue repository clone job.\n\n\`\`\`\n${error}\n\`\`\``,
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
    // Get installation octokit and token
    const octokit = await githubApp.getInstallationOctokit(installationId);
    const { data: installationToken } = await octokit.request(
      "POST /app/installations/{installation_id}/access_tokens",
      {
        installation_id: installationId,
      }
    );

    // Add clone job to queue for forge service to process
    const job = await queue.add("clone-repository", {
      token: installationToken.token,
      repo,
      branch: ref,
      prNumber,
      owner,
      repoName,
      installationId, // Pass for later use in completion handler
    });

    console.log(
      `✓ Added clone job to queue for PR #${prNumber} (Job ID: ${job.id})`
    );

    // Comment on the PR to confirm job queued
    await octokit.request(
      "POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
      {
        owner,
        repo: repoName,
        issue_number: prNumber,
        body: `🔄 Repository clone job queued for processing!\n\n📂 Branch: \`${ref}\`\n⏳ Please wait while we prepare your repository for analysis...`,
      }
    );

    console.log(`✓ Posted comment on PR #${prNumber}`);
  } catch (error) {
    console.error(`Failed to queue clone job:`, error);

    // Try to comment about the error
    try {
      const octokit = await githubApp.getInstallationOctokit(installationId);
      await octokit.request(
        "POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
        {
          owner,
          repo: repoName,
          issue_number: prNumber,
          body: `❌ Failed to queue repository clone job.\n\n\`\`\`\n${error}\n\`\`\``,
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
