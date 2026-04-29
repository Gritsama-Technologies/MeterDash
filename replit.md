# Workspace

## Overview

MeterDash — a real-time dashboard for monitoring electrical meter telemetry (voltage, current, power, harmonics, energy, system health). Receives raw `frame$...,Z` telemetry strings via a POST endpoint, parses them, and displays live readings with 2-second polling.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Frontend**: React + Vite, TanStack Query, Tailwind v4, Recharts
- **Validation**: Zod (`zod/v4`), generated from OpenAPI via Orval
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

- `artifacts/meter-dash` — MeterDash dashboard (web, served at `/`)
- `artifacts/api-server` — Shared Express API server (served at `/api`)
- `artifacts/mockup-sandbox` — Canvas mockup sandbox (design only)

## API Endpoints

All endpoints defined in `lib/api-spec/openapi.yaml`:

- `GET /api/healthz` — health check
- `POST /api/data` — ingest a raw telemetry frame (text/plain or `{"raw": "..."}` JSON)
- `GET /api/data` — latest parsed payload (or null)
- `GET /api/history` — last 60 frames, newest first
- `GET /api/summary` — aggregated dashboard summary

The parser lives in `artifacts/api-server/src/lib/parser.ts`. The in-memory store is in `artifacts/api-server/src/lib/meterStore.ts`. Routes are in `artifacts/api-server/src/routes/meter.ts`.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
