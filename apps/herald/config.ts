import "dotenv/config";
import { App } from "@octokit/app";
import { OAuthApp } from "@octokit/oauth-app";
import { Webhooks } from "@octokit/webhooks";
import IORedis from "ioredis";

export const connection = new IORedis({
  host: process.env.REDIS_HOST!,
  port: Number(process.env.REDIS_PORT!),
  maxRetriesPerRequest: null,
  password: process.env.REDIS_PASSWORD!,
});

export const githubApp = new App({
  appId: process.env.GITHUB_APP_ID!,
  privateKey: process.env.GITHUB_APP_PRIVATE_KEY!.replace(/\\n/g, "\n"),
  webhooks: {
    secret: process.env.GITHUB_APP_WEBHOOK_SECRET!,
  },
});

export const oauthApp = new OAuthApp({
  clientType: "github-app",
  clientId: process.env.GITHUB_APP_CLIENT_ID!,
  clientSecret: process.env.GITHUB_APP_CLIENT_SECRET!,
});

export const webhooks = new Webhooks({
  secret: process.env.GITHUB_APP_WEBHOOK_SECRET!,
});

export const PORT = process.env.PORT || 4000;
