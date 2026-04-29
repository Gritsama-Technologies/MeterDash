import express, { type Express } from "express";
import cors from "cors";
import { pinoHttp } from "pino-http";
import type { IncomingMessage, ServerResponse } from "node:http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
            req(req: IncomingMessage & { id?: string | number }) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: ServerResponse) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
  const dashboardUrl = process.env["METER_DASHBOARD_URL"];

  if (dashboardUrl) {
    res.redirect(307, dashboardUrl);
    return;
  }

  res.status(200).json({
    service: "api-server",
    health: "/api/healthz",
    message: "Set METER_DASHBOARD_URL to redirect root to your dashboard.",
  });
});

app.use("/api", router);
app.use(router);

export default app;
