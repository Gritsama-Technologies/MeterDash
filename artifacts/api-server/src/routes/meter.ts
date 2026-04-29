import { Router, type IRouter } from "express";
import express from "express";
import {
  GetLatestMeterDataResponse,
  GetMeterHistoryResponse,
  GetMeterSummaryResponse,
  IngestMeterDataResponse,
} from "@workspace/api-zod";
import {
  parseMeterFrame,
  MalformedFrameError,
} from "../lib/parser";
import {
  recordFrame,
  getLatest,
  getHistory,
  getSummary,
} from "../lib/meterStore";

const router: IRouter = Router();

router.get("/data", (_req, res) => {
  const latest = getLatest();
  const data = GetLatestMeterDataResponse.parse(latest);
  res.json(data);
});

router.post(
  "/data",
  express.text({ type: "text/*", limit: "64kb" }),
  (req, res): void => {
    let raw: unknown;

    if (typeof req.body === "string") {
      raw = req.body;
    } else if (
      req.body &&
      typeof req.body === "object" &&
      "raw" in req.body &&
      typeof (req.body as { raw: unknown }).raw === "string"
    ) {
      raw = (req.body as { raw: string }).raw;
    } else {
      req.log.warn({ bodyType: typeof req.body }, "Invalid request body");
      res.status(400).json({ error: "Missing 'raw' string in request body" });
      return;
    }

    try {
      const payload = parseMeterFrame(raw);
      recordFrame(payload);
      const data = IngestMeterDataResponse.parse(payload);
      res.json(data);
    } catch (err) {
      if (err instanceof MalformedFrameError) {
        req.log.warn({ err: err.message }, "Malformed meter frame");
        res.status(400).json({ error: err.message });
        return;
      }
      throw err;
    }
  },
);

router.get("/history", (_req, res) => {
  const history = getHistory();
  const data = GetMeterHistoryResponse.parse(history);
  res.json(data);
});

router.get("/summary", (_req, res) => {
  const summary = getSummary();
  const data = GetMeterSummaryResponse.parse(summary);
  res.json(data);
});

export default router;
