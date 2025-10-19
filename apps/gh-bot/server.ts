import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { createNodeMiddleware } from "@octokit/oauth-app";
import { createNodeMiddleware as createWebhookMiddleware } from "@octokit/webhooks";
import { oauthApp, webhooks, PORT } from "./config";

const oauthMiddleware = createNodeMiddleware(oauthApp);
const webhookMiddleware = createWebhookMiddleware(webhooks, {
  path: "/api/github/webhook",
});

export const server = createServer(
  async (req: IncomingMessage, res: ServerResponse) => {
    if (await oauthMiddleware(req, res)) {
      return;
    }

    if (await webhookMiddleware(req, res)) {
      return;
    }

    res.statusCode = 404;
    res.end("Not found");
  }
);

export function startServer() {
  server.listen(PORT, () => {
    console.log(`GitHub app listening on port ${PORT}`);
    console.log(
      `OAuth callback: http://localhost:${PORT}/api/github/oauth/callback`
    );
    console.log(
      `Webhook endpoint: http://localhost:${PORT}/api/github/webhook`
    );
  });
}
