# MeterDash

Real-time dashboard for electrical meter telemetry. Send raw `frame$...,Z`
strings to a single HTTP endpoint and the dashboard renders voltage, current,
power, harmonics, energy, and system health with live sparklines that refresh
every 2 seconds.

---

## Requirements

- **Node.js 20+**
- **pnpm 9+** (`corepack enable` is the easiest way)

---

## Install

```bash
pnpm install
pnpm --filter @workspace/api-spec run codegen
```

`codegen` generates the Zod schemas and TanStack Query hooks from the OpenAPI
spec. Re-run it any time you change `lib/api-spec/openapi.yaml`.

---

## Develop

Run the API and the dashboard in two terminals.

```bash
# Terminal 1 — API on :8080
PORT=8080 pnpm --filter @workspace/api-server run dev
```

```bash
# Terminal 2 — dashboard on :5173
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/meter-dash run dev
```

Open <http://localhost:5173> and either click the **Send test frame** panel or
post a frame from the shell:

```bash
curl -X POST http://localhost:8080/api/data \
  -H "Content-Type: text/plain" \
  --data 'frame$EM6400,V1n:239.8,KW:7.82,PF:0.964,FREQ:49.98,STALE:0,Z'
```

---

## Build

```bash
# Type-check the whole workspace
pnpm run typecheck

# Build everything (frontend + backend)
pnpm run build
```

Build a single package:

```bash
pnpm --filter @workspace/meter-dash run build   # SPA -> artifacts/meter-dash/dist/public
pnpm --filter @workspace/api-server run build   # API -> artifacts/api-server/dist/index.mjs
```

---

## Start (production)

After running `pnpm run build`:

```bash
# Start the API on :8080
PORT=8080 pnpm --filter @workspace/api-server run start
```

```bash
# Serve the built dashboard on :4173
PORT=4173 BASE_PATH=/ pnpm --filter @workspace/meter-dash run serve
```

The dashboard expects to reach the API at `/api/*` on the same origin. In
production, put both behind a reverse proxy (Nginx, Caddy, Cloudflare, etc.)
that forwards `/api/*` to the API and everything else to the dashboard.

---

## API endpoints

All routes live under `/api`. The full spec is in `lib/api-spec/openapi.yaml`.

| Method | Path           | Description                                          |
| ------ | -------------- | ---------------------------------------------------- |
| GET    | `/api/healthz` | Health probe.                                        |
| POST   | `/api/data`    | Ingest one frame (`text/plain` or `{"raw": "..."}`). |
| GET    | `/api/data`    | Latest parsed payload (or `null`).                   |
| GET    | `/api/history` | Rolling history, newest first (up to 60 frames).     |
| GET    | `/api/summary` | Aggregated metrics (peak kW, avg PF, RSSI, etc.).    |

### Frame format

```
frame$<METER_ID>,KEY1:VALUE,KEY2:VALUE,...,Z
```

Must start with `frame$` and end with `,Z`. The first comma-separated field
after `frame$` is the meter id. Each subsequent field is `KEY:VALUE`. Numeric
values are auto-converted.

---

## Project layout

```
artifacts/
  meter-dash/      # React + Vite dashboard
  api-server/      # Express 5 API server
lib/
  api-spec/        # OpenAPI source of truth
  api-zod/         # Generated Zod schemas
  api-client-react/  # Generated TanStack Query hooks
netlify/
  functions/api.ts # Optional: same API as a Netlify Function (single-host deploy)
netlify.toml       # Optional: deploy config for Netlify
```

---

## Common scripts

| Command                                                  | What it does                                  |
| -------------------------------------------------------- | --------------------------------------------- |
| `pnpm install`                                           | Install all workspace dependencies.           |
| `pnpm --filter @workspace/api-spec run codegen`          | Regenerate Zod schemas + React Query hooks.   |
| `pnpm run typecheck`                                     | Type-check every package.                     |
| `pnpm run build`                                         | Build every package.                          |
| `pnpm --filter @workspace/api-server run dev`            | Run the API in dev mode.                      |
| `pnpm --filter @workspace/meter-dash run dev`            | Run the dashboard in dev mode (Vite).         |
| `pnpm --filter @workspace/api-server run start`          | Run the built API.                            |
| `pnpm --filter @workspace/meter-dash run serve`          | Serve the built dashboard.                    |

---

## Optional: deploy to Netlify

The repo also ships with a Netlify config (`netlify.toml` +
`netlify/functions/api.ts`) that hosts the dashboard and the API on a single
Netlify site:

1. Push the repo to GitHub.
2. In Netlify: **Add new site → Import an existing project** → pick the repo.
3. Click **Deploy site**.

After deploy, the dashboard is at `https://<site>.netlify.app` and the API is
at `https://<site>.netlify.app/api/*`. No environment variables required.
