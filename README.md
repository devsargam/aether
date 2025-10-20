# Aether

A deployment platform for Next.js projects with GitHub integration. Import repositories, deploy automatically, and manage deployments through a web dashboard.

## The Names

**Aether** is the pure upper air in Greek mythology—the substance the gods breathed. The three services follow this theme:

- **Nexus** - The central connection point where everything comes together
- **Herald** - The messenger that carries events between GitHub and the system
- **Forge** - The workshop where code gets built into deployments

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│    Nexus    │─────▶│    Herald    │─────▶│    Forge    │
│  (Next.js)  │      │ (GitHub App) │      │  (Builder)  │
└─────────────┘      └──────────────┘      └─────────────┘
      │                      │                      │
      ▼                      ▼                      ▼
  PostgreSQL            BullMQ/Redis            Docker
```

## Services

### Nexus (`apps/nexus`)

The central hub where users connect and manage their deployments. Handles GitHub OAuth, displays project dashboard, and manages import/deployment APIs.

**Stack:** Next.js 15, Better Auth, Drizzle ORM, Tailwind CSS

### Herald (`apps/herald`)

The messenger between GitHub and Aether. Manages deployment queue and webhook events. Updates database with build status and posts deployment URLs as PR comments.

**Stack:** Node.js, @octokit/app, BullMQ, Drizzle ORM

### Forge (`apps/forge`)

Worker service that processes deployment jobs. Clones repos, builds in Docker containers, and runs reverse proxy for traffic routing.

**Stack:** Node.js, Docker, BullMQ worker, HTTP reverse proxy

## How It Works

**User Imports:**

1. User authenticates via Nexus and imports a GitHub repository
2. Job queued → Forge clones, builds, and deploys
3. Nexus dashboard shows deployment status and URL

**PR Deployments:**

1. PR opened → GitHub webhook triggers Herald
2. Job queued → Forge builds and deploys
3. Herald posts deployment URL as PR comment

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
