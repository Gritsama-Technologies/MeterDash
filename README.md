# MeterDash

Real-time dashboard for electrical meter telemetry. Send raw `frame$...,Z`
strings to a single HTTP endpoint and the dashboard renders voltage, current,
power, harmonics, energy, and system health with live sparklines that refresh
every 2 seconds.

The whole thing — dashboard **and** API — runs on a single Netlify deploy.

```
https://<your-site>.netlify.app          ← dashboard (React SPA)
https://<your-site>.netlify.app/api/data ← POST raw frames here
```

---

## How it works

| Piece     | Tech                              | Where it runs            |
| --------- | --------------------------------- | ------------------------ |
| Dashboard | React + Vite + TanStack Query     | Netlify static hosting   |
| API       | Netlify Function (Node 20)        | Netlify Functions        |
| Storage   | In-memory inside the function     | The function's container |

The store keeps the latest frame plus a short rolling history. It lives in the
function's process memory, so it survives across requests while the function
stays warm and resets to empty when the container goes cold (typically after
~15 minutes of no traffic). Since the dashboard polls every 2 seconds and your
meter posts continuously, the function stays warm in normal use.

---

## Project layout

This is a pnpm workspace.

```
artifacts/
  meter-dash/             # React + Vite SPA (the dashboard)
  api-server/             # Local-dev Express server (NOT deployed)
                          # Shares parser + store code with the function
lib/
  api-spec/               # OpenAPI source of truth
  api-zod/                # Generated Zod schemas
  api-client-react/       # Generated TanStack Query hooks
netlify/
  functions/api.ts        # The single API function (/api/*)
netlify.toml              # Netlify build + routing config
```

---

## Deploying to Netlify

A `netlify.toml` is committed at the repo root and configures everything for
you. There are **no environment variables to set**.

### Option A — Netlify UI

1. Push this repo to GitHub.
2. In Netlify, click **Add new site → Import an existing project** and pick
   the repo. Netlify reads `netlify.toml`, so leave the build/publish/function
   fields untouched.
3. Click **Deploy site**.

That's it. The dashboard and API will both be live at your `*.netlify.app`
URL.

### Option B — Netlify CLI

```bash
npm i -g netlify-cli
netlify login
netlify init           # link to a new or existing site
netlify deploy --build --prod
```

### What `netlify.toml` does

- Installs pnpm via Corepack and runs `pnpm install --frozen-lockfile`.
- Generates Zod schemas + React Query hooks from the OpenAPI spec.
- Builds the SPA into `artifacts/meter-dash/dist/public`.
- Bundles `netlify/functions/api.ts` and routes `/api/*` to it.
- Adds a SPA fallback so any client-side route resolves to `index.html`.

---

## Posting frames from your meter

Point the meter at:

```
https://<your-site>.netlify.app/api/data
```

The endpoint accepts the raw frame either as plain text (recommended for
embedded meters) or wrapped in JSON:

```bash
# Plain text
curl -X POST https://<your-site>.netlify.app/api/data \
  -H "Content-Type: text/plain" \
  --data 'frame$EM6400,V1n:239.8,V2n:240.4,V3n:238.9,KW:7.82,PF:0.964,FREQ:49.98,RSSI:-71,MTR:1,GPRS:1,STALE:0,Z'

# JSON
curl -X POST https://<your-site>.netlify.app/api/data \
  -H "Content-Type: application/json" \
  -d '{"raw":"frame$EM6400,V1n:239.8,KW:7.82,STALE:0,Z"}'
```

The dashboard will pick up the new frame within 2 seconds.

---

## API reference

All routes are served from the same Netlify Function under `/api`.

| Method | Path           | Description                                          |
| ------ | -------------- | ---------------------------------------------------- |
| GET    | `/api/healthz` | Health probe — returns `{ "ok": true }`.             |
| POST   | `/api/data`    | Ingest one frame (`text/plain` or `{"raw": "..."}`). |
| GET    | `/api/data`    | Latest parsed payload (or `null`).                   |
| GET    | `/api/history` | Rolling history, newest first (up to 60 frames).     |
| GET    | `/api/summary` | Aggregated metrics (peak kW, avg PF, RSSI, etc.).    |

### Frame format

```
frame$<METER_ID>,KEY1:VALUE,KEY2:VALUE,...,Z
```

- Must start with `frame$` and end with `,Z`.
- The first comma-separated field after `frame$` is the meter id.
- Each subsequent field is `KEY:VALUE`. Numeric values are auto-converted.

A representative example:

```
frame$EM6400,V1n:239.8,V2n:240.4,V3n:238.9,V12:415.3,V23:416.1,V31:414.8,
I1:12.34,I2:11.98,I3:12.21,Vavg:239.7,Iavg:12.18,KW:7.82,KVA:8.11,KVAR:2.34,
PF:0.964,FREQ:49.98,THDV1:2.1,THDV2:2.3,THDV3:2.0,THDI1:4.2,THDI2:4.5,
THDI3:4.1,KWH_FWD:12345.67,KVAH_FWD:12988.11,KVARH_FWD:4567.22,
KWH_REV:12.34,KVAH_REV:15.67,KVARH_REV:3.45,INTR:5,In:0.42,IUNB:3.2,
VUNB:1.1,RSSI:-71,MTR:1,GPRS:1,STALE:0,Z
```

---

## Local development

Requirements: **Node 20+** and **pnpm 9+** (`corepack enable` works).

### Run everything against the real Netlify Function locally

This is the closest match to production:

```bash
pnpm install
pnpm --filter @workspace/api-spec run codegen
npm i -g netlify-cli
netlify dev
```

`netlify dev` serves the SPA, runs the function, and routes `/api/*` to it on
a single port (default `http://localhost:8888`).

### Or run the Express dev server (faster reloads)

The `artifacts/api-server` package is the same parser and store code wrapped in
Express, used during Replit/local development.

```bash
# Terminal 1 — backend on :8080
PORT=8080 pnpm --filter @workspace/api-server run dev

# Terminal 2 — frontend on :5173
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/meter-dash run dev
```

---

## Troubleshooting

- **Netlify build fails on `pnpm install`** — confirm `NODE_VERSION=20` and
  `PNPM_VERSION=9` are set in `netlify.toml` (they are by default).
- **`/api/...` returns 404** — make sure `netlify/functions/api.ts` was
  deployed. Check the **Functions** tab in the Netlify dashboard; you should
  see a function called `api`.
- **History feels short / metrics look reset** — the function container went
  cold. The rolling window starts fresh when a new container spins up. Send a
  few more frames and it'll fill back up. To keep things warm, point a cron
  pinger at `/api/healthz` every few minutes, or post telemetry continuously.
- **CORS error in the browser** — should not happen because the dashboard and
  API are on the same origin. If you call the API from another origin, the
  function already returns permissive CORS headers (`*`).
- **Frame rejected with 400** — verify the string starts with `frame$` and
  ends with `,Z`.
