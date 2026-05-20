# Ticketing System

A production-oriented help desk application built with Next.js, Prisma, NextAuth, Tailwind, and shadcn-style components.

## Features

- Credentials authentication with JWT sessions and bcrypt password hashes.
- Role-based access for employees, agents, department managers, and administrators.
- Ticket creation, assignment, filtering, comments, internal notes, approvals, SLA tracking, notifications, dashboards, audit logs, departments, categories, users, and a knowledge base.
- Responsive customer, agent, and administrator UI.
- Health check at `/api/health` and OpenAPI summary at `/api/openapi`.
- Docker and GitHub Actions CI configuration.

## Local Setup

1. Install dependencies: `npm ci`
2. Create `.env` from `.env.example` and set `NEXTAUTH_SECRET`.
3. Generate Prisma client: `npx prisma generate`
4. Apply schema: `npm run db:push`
5. Seed demo data: `npm run db:seed`
6. Start development: `npm run dev`

## Verification

Run the full local verification suite:

```bash
npm run verify
npm run build
```

## Deployment

Build and run with Docker:

```bash
docker compose up --build
```

For production, use a managed database, set a strong `NEXTAUTH_SECRET`, terminate HTTPS at the platform/load balancer, and run Prisma migrations before starting the app.

## Backup Strategy

For SQLite deployments, snapshot the mounted `prisma/db` volume before releases and daily during operation. For PostgreSQL/MySQL production deployments, use managed automated backups plus pre-migration snapshots.
