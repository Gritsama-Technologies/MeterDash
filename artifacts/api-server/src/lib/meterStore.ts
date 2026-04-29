import type { ParsedMeterPayload, MeterValue } from "./parser";

const HISTORY_LIMIT = 60;

interface MeterStoreState {
  latest: ParsedMeterPayload | null;
  history: ParsedMeterPayload[];
  framesReceived: number;
}

const state: MeterStoreState = {
  latest: null,
  history: [],
  framesReceived: 0,
};

export function recordFrame(payload: ParsedMeterPayload): void {
  state.latest = payload;
  state.history.unshift(payload);
  if (state.history.length > HISTORY_LIMIT) {
    state.history.length = HISTORY_LIMIT;
  }
  state.framesReceived += 1;
}

export function getLatest(): ParsedMeterPayload | null {
  return state.latest;
}

export function getHistory(): ParsedMeterPayload[] {
  return state.history.slice();
}

export interface MeterSummary {
  meterId: string | null;
  framesReceived: number;
  windowSize: number;
  lastTimestamp: string | null;
  staleCount: number;
  healthyCount: number;
  avgKw: number | null;
  peakKw: number | null;
  minKw: number | null;
  avgPf: number | null;
  avgFreq: number | null;
  avgRssi: number | null;
  kwhFwd: number | null;
  kwhRev: number | null;
}

function pickNumber(value: MeterValue | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function getSummary(): MeterSummary {
  const window = state.history;
  const kwValues: number[] = [];
  const pfValues: number[] = [];
  const freqValues: number[] = [];
  const rssiValues: number[] = [];
  let staleCount = 0;
  let healthyCount = 0;

  for (const frame of window) {
    const kw = pickNumber(frame.data["KW"]);
    if (kw !== null) kwValues.push(kw);
    const pf = pickNumber(frame.data["PF"]);
    if (pf !== null) pfValues.push(pf);
    const freq = pickNumber(frame.data["FREQ"]);
    if (freq !== null) freqValues.push(freq);
    const rssi = pickNumber(frame.data["RSSI"]);
    if (rssi !== null) rssiValues.push(rssi);

    const stale = pickNumber(frame.data["STALE"]);
    if (stale !== null && stale !== 0) {
      staleCount += 1;
    } else {
      healthyCount += 1;
    }
  }

  return {
    meterId: state.latest?.meterId ?? null,
    framesReceived: state.framesReceived,
    windowSize: window.length,
    lastTimestamp: state.latest?.timestamp ?? null,
    staleCount,
    healthyCount,
    avgKw: avg(kwValues),
    peakKw: kwValues.length ? Math.max(...kwValues) : null,
    minKw: kwValues.length ? Math.min(...kwValues) : null,
    avgPf: avg(pfValues),
    avgFreq: avg(freqValues),
    avgRssi: avg(rssiValues),
    kwhFwd: state.latest ? pickNumber(state.latest.data["KWH_FWD"]) : null,
    kwhRev: state.latest ? pickNumber(state.latest.data["KWH_REV"]) : null,
  };
}
