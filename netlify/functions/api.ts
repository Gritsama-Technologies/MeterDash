import {
  parseMeterFrame,
  MalformedFrameError,
} from "../../artifacts/api-server/src/lib/parser";
import {
  recordFrame,
  getLatest,
  getHistory,
  getSummary,
} from "../../artifacts/api-server/src/lib/meterStore";

export const config = {
  path: "/api/*",
};

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });

export default async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, POST, OPTIONS",
        "access-control-allow-headers": "content-type",
      },
    });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api/, "") || "/";
  const method = req.method.toUpperCase();

  try {
    if (path === "/healthz" && method === "GET") {
      return json(200, { ok: true });
    }

    if (path === "/data" && method === "GET") {
      return json(200, getLatest());
    }

    if (path === "/data" && method === "POST") {
      const contentType = req.headers.get("content-type") ?? "";
      const text = await req.text();
      let raw: unknown;

      if (contentType.includes("application/json")) {
        try {
          const body = JSON.parse(text);
          if (
            body &&
            typeof body === "object" &&
            typeof (body as { raw?: unknown }).raw === "string"
          ) {
            raw = (body as { raw: string }).raw;
          }
        } catch {
          return json(400, { error: "Invalid JSON body" });
        }
      } else {
        raw = text;
      }

      if (typeof raw !== "string" || raw.length === 0) {
        return json(400, {
          error: "Missing 'raw' string in request body",
        });
      }

      try {
        const payload = parseMeterFrame(raw);
        recordFrame(payload);
        return json(200, payload);
      } catch (err) {
        if (err instanceof MalformedFrameError) {
          return json(400, { error: err.message });
        }
        throw err;
      }
    }

    if (path === "/history" && method === "GET") {
      return json(200, getHistory());
    }

    if (path === "/summary" && method === "GET") {
      return json(200, getSummary());
    }

    return json(404, { error: `Not found: ${method} ${url.pathname}` });
  } catch (err) {
    return json(500, {
      error: err instanceof Error ? err.message : "Internal error",
    });
  }
};
