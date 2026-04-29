import { NextRequest, NextResponse } from 'next/server';
import { parseTelemetry, TelemetryData } from '@/utils/parser';

// In a real-world scenario on Vercel, use Vercel KV or a Database here.
// For a standalone frontend app without a separate backend, we use a global memory store
// which works when running `next start` on a local machine/VM.
const globalStore = globalThis as unknown as { latestTelemetry: TelemetryData | null };
if (!globalStore.latestTelemetry) {
  globalStore.latestTelemetry = null;
}

export async function POST(request: NextRequest) {
  try {
    let rawString = await request.text();
    
    // Support JSON payloads e.g. {"raw": "frame$..."}
    try {
      const json = JSON.parse(rawString);
      if (json && typeof json.raw === 'string') {
        rawString = json.raw;
      }
    } catch (e) {
      // Not JSON, treat as plain text
    }

    const parsed = parseTelemetry(rawString);
    
    // Save to memory store
    globalStore.latestTelemetry = parsed;
    
    return NextResponse.json({ success: true, timestamp: parsed.timestamp }, { status: 200 });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json(globalStore.latestTelemetry || null);
}
