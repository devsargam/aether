# Aether

A deployment platform for Next.js projects with GitHub integration. Import repositories, deploy automatically, and manage deployments through a web dashboard.

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│    Web      │─────▶│   gh-bot     │─────▶│    Forge    │
│  (Next.js)  │      │ (GitHub App) │      │  (Builder)  │
└─────────────┘      └──────────────┘      └─────────────┘
      │                      │                      │
      ▼                      ▼                      ▼
  PostgreSQL            BullMQ/Redis            Docker
```

## Services

### Web (`apps/web`)

Next.js frontend for authentication and project management. Handles GitHub OAuth, displays project dashboard, and manages import/deployment APIs.

**Stack:** Next.js 15, Better Auth, Drizzle ORM, Tailwind CSS

### gh-bot (`apps/gh-bot`)

GitHub App that manages deployment queue and webhook events. Updates database with build status and posts deployment URLs as PR comments.

**Stack:** Node.js, @octokit/app, BullMQ, Drizzle ORM

### Forge (`apps/forge`)

Worker service that processes deployment jobs. Clones repos, builds in Docker containers, and runs reverse proxy for traffic routing.

**Stack:** Node.js, Docker, BullMQ worker, HTTP reverse proxy

## How It Works

**User Imports:**

1. User authenticates and imports a GitHub repository
2. Job queued → Forge clones, builds, and deploys
3. Dashboard shows deployment status and URL

**PR Deployments:**

1. PR opened → GitHub webhook triggers gh-bot
2. Job queued → Forge builds and deploys
3. Deployment URL posted as PR comment

## Tech Stack

- **Frontend:** Next.js 15, React 19, Tailwind CSS
- **Backend:** Node.js, TypeScript
- **Database:** PostgreSQL + Drizzle ORM
- **Queue:** BullMQ + Redis
- **Build:** Docker
- **Auth:** Better Auth + GitHub OAuth
- **Monorepo:** Turborepo + pnpm

## Development

```bash
pnpm install
pnpm dev
```

Requires: Node.js 18+, pnpm, Docker, PostgreSQL, Redis, GitHub App credentials
