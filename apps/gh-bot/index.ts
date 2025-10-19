import "dotenv/config";
import { OAuthApp, createNodeMiddleware } from "@octokit/oauth-app";
import {
  Webhooks,
  createNodeMiddleware as createWebhookMiddleware,
} from "@octokit/webhooks";
import { createServer, IncomingMessage, ServerResponse } from "node:http";

// OAuth App setup
const app = new OAuthApp({
  clientType: "github-app",
  clientId: process.env.GITHUB_APP_CLIENT_ID!,
  clientSecret: process.env.GITHUB_APP_CLIENT_SECRET!,
});

app.on("token", async ({ token, octokit }) => {
  console.log(`Token retrieved for ${token}`);
  const { data } = await octokit.request("GET /user");
  console.log(`Token retrieved for ${data.login}`);
});

// Webhook setup
const webhooks = new Webhooks({
  secret: process.env.GITHUB_APP_WEBHOOK_SECRET!,
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
  const cloneUrl = payload.repository.clone_url;

  console.log(`Repo: ${repo}`);
  console.log(`Ref: ${ref}`);
  console.log(`Clone URL: ${cloneUrl}`);
});

webhooks.on("pull_request.reopened", async ({ payload }) => {
  const repo = payload.repository.full_name;
  const ref = payload.pull_request.head.ref;
  const cloneUrl = payload.repository.clone_url;

  console.log(`Repo: ${repo}`);
  console.log(`Ref: ${ref}`);
  console.log(`Clone URL: ${cloneUrl}`);
});

// Add more webhook handlers as needed
webhooks.onAny(async ({ name, payload }) => {
  console.log(`Received webhook event: ${name}`);
});

// Create middleware handlers
const oauthMiddleware = createNodeMiddleware(app);
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
