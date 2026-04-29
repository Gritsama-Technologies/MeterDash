# PDR — MeterDash
**Version:** 1.0.0 | **Owner:** GritSama Technologies | **Last Updated:** 2026-04-29

## 1. Project Overview & Goals
MeterDash is a real-time dashboard for electrical meter telemetry. It ingests raw `frame$...,Z` string payloads via a single HTTP endpoint, parses the metrics, and renders them instantly on a unified dashboard showing voltage, current, power, harmonics, energy, and system health.

The project was refactored from a multi-repo (Vite SPA + Express API) architecture to a unified Next.js App Router application to provide a seamless "single frontend app" experience that also handles the backend API routes on the same domain and server process.

## 2. Architecture Decisions (ADRs)
**2026-04-29: Migration to Next.js App Router**
- **Context:** The user requested a "frontend app" that runs both the dashboard and the POST endpoint on the exact same domain, eliminating the need for a separate backend service or reverse proxy.
- **Decision:** Consolidate the architecture into a single Next.js project. Next.js API Routes handle the `POST /api/data` ingress and `GET /api/data` egress, while Next.js React Server/Client Components handle the UI.
- **Consequences:** We avoid CORS issues and remove the need to manage two processes. However, state is kept in-memory via `globalThis`, which limits this to a single-node deployment (e.g., local server or single VM via `next start`). If horizontal scaling or Vercel serverless deployment is ever needed, an external store (like Redis/KV) must be used.

## 3. Tech Stack & Exact Dependency Versions
- Next.js (v15+)
- React (v19)
- Tailwind CSS (v4)
- Lucide React (v0.x)
- TypeScript (v5)
- Package Manager: pnpm

## 4. Environment Variables & Config Schema
*(No custom environment variables currently required for local/VM execution)*

## 5. Module Map & Data Flow Diagrams
- `app/page.tsx`: Client-side React application that polls `/api/data` every 2 seconds.
- `app/api/data/route.ts`: In-memory data store handler. Accepts POST with raw string payloads, and GET for the latest JSON representation.
- `utils/parser.ts`: Core parsing logic that converts IoT `frame$...,Z` strings into strongly-typed `TelemetryData` objects.

## 6. AI Model Registry
*Not applicable.*

## 7. Hardware Integration Specs
- **Input Protocol:** Custom comma-separated string over HTTP POST.
- **Frame Format:** `frame$<METER_ID>,KEY1:VALUE,KEY2:VALUE,...,Z`
- **Validation:** Must begin with `frame$` and end with `,Z`.

## 8. Security Model & Trust Boundaries
- The application currently trusts all data posted to `/api/data`. In a production edge/public deployment, an API key authorization header should be implemented.
- No secrets are stored in the codebase.

## 9. Test Coverage Map
- Type checking enforced via `tsc`.
- Build verification via `next build`.

## 10. Known Limitations & Future Debt Log
- **In-Memory Store:** The telemetry data is stored in the Node.js memory. This will reset if the Next.js process restarts, and will not work if deployed across multiple serverless edge functions.
- **Polling:** The dashboard currently uses HTTP polling (`setInterval`). WebSockets or Server-Sent Events (SSE) would reduce overhead.

## 11. Change Log
- **2026-04-29:** Initialized Next.js project and consolidated legacy multi-workspace code into a unified App Router structure.
