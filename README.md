# MeterDash

Real-time dashboard for electrical meter telemetry. The backend ingests raw
`frame$...,Z` strings from a meter, parses them, keeps the last 60 frames in
memory, and exposes them over a small JSON API. The frontend polls every 2
seconds and renders voltage, current, power, harmonics, energy, and system
health with live sparklines.

---

## Project layout

This is a **pnpm workspace** with two deployable artifacts:

```
artifacts/
  meter-dash/    # React + Vite SPA  ->  deploy to Netlify
  api-server/    # Express 5 server  ->  deploy to Render / Railway / Fly.io
lib/
  api-spec/      # OpenAPI source of truth
  api-zod/       # Generated Zod schemas
  api-client-react/  # Generated TanStack Query hooks
  db/            # Shared db utilities (unused by MeterDash today)
```

Frontend and backend talk to each other purely over HTTP — there is no shared
runtime. They can be deployed to two completely different hosts.

---

## Why two different hosts?

The API keeps the last 60 telemetry frames in **process memory**
(`artifacts/api-server/src/lib/meterStore.ts`). That makes Netlify Functions
(stateless, cold-start per invocation) a bad fit for the backend — every
request would land on a fresh process with an empty store.

So:

| Piece     | Type                  | Recommended host                  |
| --------- | --------------------- | --------------------------------- |
| Frontend  | Static SPA            | **Netlify**                       |
| Backend   | Long-running Node     | **Render** (or Railway / Fly.io)  |

If you later move the store to a database (Postgres, Redis, etc.), the backend
*could* be ported to serverless functions, but the current code assumes a
single long-lived process.

---

## Local development

Requirements: **Node 20+** and **pnpm 9+** (`corepack enable` works).

```bash
pnpm install
pnpm --filter @workspace/api-spec run codegen   # generate Zod + React hooks
pnpm run typecheck                              # sanity check
```

Run the two services in separate terminals:

```bash
# Terminal 1 — backend on :8080
PORT=8080 pnpm --filter @workspace/api-server run dev

# Terminal 2 — frontend on :5173
PORT=5173 BASE_PATH=/ VITE_API_BASE_URL=http://localhost:8080 \
  pnpm --filter @workspace/meter-dash run dev
```

Open http://localhost:5173 and send a test frame from the “Send test frame”
panel, or via curl:

```bash
curl -X POST http://localhost:8080/api/data \
  -H "Content-Type: text/plain" \
  --data 'frame$EM6400,V1n:239.8,V2n:240.4,V3n:238.9,V12:415.3,V23:416.1,V31:414.8,I1:12.34,I2:11.98,I3:12.21,Vavg:239.7,Iavg:12.18,KW:7.82,KVA:8.11,KVAR:2.34,PF:0.964,FREQ:49.98,THDV1:2.1,THDV2:2.3,THDV3:2.0,THDI1:4.2,THDI2:4.5,THDI3:4.1,KWH_FWD:12345.67,KVAH_FWD:12988.11,KVARH_FWD:4567.22,KWH_REV:12.34,KVAH_REV:15.67,KVARH_REV:3.45,INTR:5,In:0.42,IUNB:3.2,VUNB:1.1,RSSI:-71,MTR:1,GPRS:1,STALE:0,Z'
```

JSON form is also accepted: `-H "Content-Type: application/json" -d '{"raw":"frame$...,Z"}'`.

---

## API reference

All routes live under `/api` and are described in `lib/api-spec/openapi.yaml`.

| Method | Path           | Description                                             |
| ------ | -------------- | ------------------------------------------------------- |
| GET    | `/api/healthz` | Health probe.                                           |
| POST   | `/api/data`    | Ingest one raw frame (`text/plain` or `{"raw": "..."}`).|
| GET    | `/api/data`    | Latest parsed payload (or `null`).                      |
| GET    | `/api/history` | Last 60 frames, newest first.                           |
| GET    | `/api/summary` | Aggregated metrics (peak kW, avg PF, RSSI, etc.).       |

---

## Deploying the backend (Render — recommended)

Render gives you a free always-on Node web service, which fits the in-memory
store model perfectly.

1. Push this repo to GitHub.
2. In Render, click **New → Web Service** and connect the repo.
3. Fill in:
   - **Environment**: `Node`
   - **Region**: closest to your meters
   - **Branch**: `main`
   - **Root Directory**: leave blank (we build from the repo root)
   - **Build Command**:
     ```
     corepack enable && pnpm install --frozen-lockfile && pnpm --filter @workspace/api-spec run codegen && pnpm --filter @workspace/api-server run build
     ```
   - **Start Command**:
     ```
     pnpm --filter @workspace/api-server run start
     ```
4. Add an environment variable:
   - `NODE_VERSION` = `20`
   - `PORT` is provided automatically by Render — do **not** set it yourself.
5. Click **Create Web Service**. After the first deploy, copy the public URL
   (e.g. `https://meter-dash-api.onrender.com`). You will paste this into
   Netlify in the next section.

Test it:

```bash
curl https://meter-dash-api.onrender.com/api/healthz
```

### Alternative: Railway

1. New project → Deploy from GitHub repo.
2. Set the same Build Command and Start Command as above.
3. Set `NODE_VERSION=20`. `PORT` is injected by Railway.

### Alternative: Fly.io

Use a small `Dockerfile` (Node 20, run `pnpm install`, run the build command,
then `node artifacts/api-server/dist/index.mjs`). Fly handles port binding via
the `internal_port` setting in `fly.toml`.

### CORS

The API already enables permissive CORS (`cors()` middleware in
`artifacts/api-server/src/app.ts`), so the Netlify frontend can call it from a
different origin out of the box.

---

## Deploying the frontend (Netlify)

A `netlify.toml` is committed at the repo root and configures everything for
you. You only need to set one environment variable.

### Option A — Netlify UI

1. Push this repo to GitHub.
2. In Netlify, click **Add new site → Import an existing project** and pick the
   repo. Netlify will read `netlify.toml`, so you can leave the build/publish
   fields untouched.
3. Open **Site settings → Environment variables** and add:

   | Key                  | Value                                          |
   | -------------------- | ---------------------------------------------- |
   | `VITE_API_BASE_URL`  | The full backend URL from Render, e.g. `https://meter-dash-api.onrender.com` |

4. Click **Deploy site**. Netlify will run the build command from
   `netlify.toml`, output static files to `artifacts/meter-dash/dist/public`,
   and publish them.

### Option B — Netlify CLI

```bash
npm i -g netlify-cli
netlify login
netlify init           # link to a new or existing site
netlify env:set VITE_API_BASE_URL https://meter-dash-api.onrender.com
netlify deploy --build --prod
```

### What `netlify.toml` does

```
publish = "artifacts/meter-dash/dist/public"
command = corepack enable && pnpm install --frozen-lockfile
          && pnpm --filter @workspace/api-spec run codegen
          && BASE_PATH=/ PORT=4173 pnpm --filter @workspace/meter-dash run build
```

- `BASE_PATH=/` tells Vite the app is served from the domain root.
- `PORT` is required by `vite.config.ts` even at build time, so we pass a
  dummy value.
- The SPA fallback redirect (`/* → /index.html 200`) is included so any
  client-side route resolves to `index.html`.

---

## Environment variables summary

### Backend (Render / Railway / Fly.io)

| Variable | Required | Notes                                                |
| -------- | -------- | ---------------------------------------------------- |
| `PORT`   | yes      | Provided automatically by every major host.          |

### Frontend (Netlify)

| Variable               | Required | Notes                                                  |
| ---------------------- | -------- | ------------------------------------------------------ |
| `VITE_API_BASE_URL`    | yes      | Absolute URL of the deployed backend, no trailing `/`. |

If you forget `VITE_API_BASE_URL`, the frontend will issue requests to its own
origin (`/api/...`) and they will 404 because Netlify is only serving static
files.

---

## Pointing a real meter at production

Configure the meter to `POST` raw `frame$...,Z` strings to:

```
https://<your-backend-host>/api/data
```

Either as `Content-Type: text/plain` with the raw string as the body, or as
`Content-Type: application/json` with `{"raw": "frame$...,Z"}`. The dashboard
will pick up new frames within 2 seconds.

---

## Troubleshooting

- **Netlify build fails on `pnpm install`**: confirm `NODE_VERSION=20` and
  `PNPM_VERSION=9` are set in `netlify.toml` (they are by default).
- **Frontend loads but every API call 404s**: `VITE_API_BASE_URL` is missing
  or wrong. It must be the full public URL of the backend.
- **CORS error in the browser console**: the backend service is unreachable or
  returning a non-2xx; the request is being preflighted but the response
  doesn't include CORS headers because it's an error page from the host
  (not from the Express app). Check the backend logs.
- **Render free tier sleeps after 15 min of inactivity**: the first request
  after a sleep may take ~30s to wake the dyno. Upgrade the plan or add a
  cron pinger if you can't tolerate cold starts.
