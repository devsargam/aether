# Aether

A deployment platform for nextjs similar to vercel

## The Names

**Aether** means pure air in Greek Mythology. There are three main services in Aether:

- **Nexus** - A web app which is central point for all interactions
- **Herald** - The messenger between github and internal queue system
- **Forge** - Worker that takes builds the project and handle deployments

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

## Tech Stack

- **Frontend:** Next.js 15, React 19, Tailwind CSS
- **Backend:** Node.js, TypeScript
- **Database:** PostgreSQL + Drizzle ORM
- **Queue:** BullMQ + Redis
- **Build:** Docker
- **Auth:** Better Auth + GitHub OAuth
- **Monorepo:** Turborepo + pnpm

Requires: Node.js 18+, pnpm, Docker, PostgreSQL, Redis, GitHub App credentials
