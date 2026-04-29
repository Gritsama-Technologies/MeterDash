export type MeterValue = number | string;

export interface ParsedMeterPayload {
  meterId: string;
  timestamp: string;
  data: Record<string, MeterValue>;
}

const FRAME_PREFIX = "frame$";
const FRAME_SUFFIX = ",Z";

export class MalformedFrameError extends Error {
  constructor(message = "Malformed string") {
    super(message);
    this.name = "MalformedFrameError";
  }
}

export function parseMeterFrame(raw: unknown): ParsedMeterPayload {
  if (typeof raw !== "string") {
    throw new MalformedFrameError("Malformed string: expected string input");
  }

  const trimmed = raw.trim();

  if (!trimmed.startsWith(FRAME_PREFIX) || !trimmed.endsWith(FRAME_SUFFIX)) {
    throw new MalformedFrameError(
      "Malformed string: must start with 'frame$' and end with ',Z'",
    );
  }

  const body = trimmed.slice(FRAME_PREFIX.length, -FRAME_SUFFIX.length);
  const parts = body.split(",").filter((p) => p.length > 0);

  if (parts.length === 0) {
    throw new MalformedFrameError("Malformed string: empty frame body");
  }

  const [meterId, ...rest] = parts;

  if (!meterId) {
    throw new MalformedFrameError("Malformed string: missing meter id");
  }

  const data: Record<string, MeterValue> = {};
  for (const part of rest) {
    const sepIdx = part.indexOf(":");
    if (sepIdx === -1) {
      continue;
    }
    const key = part.slice(0, sepIdx).trim();
    const rawValue = part.slice(sepIdx + 1).trim();
    if (!key) continue;

    const num = Number(rawValue);
    data[key] = Number.isNaN(num) || rawValue === "" ? rawValue : num;
  }

  return {
    meterId,
    timestamp: new Date().toISOString(),
    data,
  };
}
