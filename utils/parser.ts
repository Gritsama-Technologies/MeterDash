export interface TelemetryData {
  meterId: string;
  timestamp: Date;
  payload: Record<string, number | string>;
}

/**
 * Parses the raw IoT telemetry string into a typed object.
 * @param raw e.g. "frame$EM6400,V1n:239.8,...,STALE:0,Z"
 */
export function parseTelemetry(raw: string): TelemetryData {
  // Validation
  if (!raw.startsWith('frame$') || !raw.endsWith(',Z')) {
    throw new Error('Malformed payload: Must start with "frame$" and end with ",Z"');
  }

  // Extraction: Strip "frame$" (6 chars) and ",Z" (2 chars)
  const stripped = raw.slice(6, -2);
  const parts = stripped.split(',');
  
  // ID Parsing
  const meterId = parts[0];
  const payload: Record<string, number | string> = {};

  // Key-Value Mapping & Type Conversion
  for (let i = 1; i < parts.length; i++) {
    const [key, valStr] = parts[i].split(':');
    if (key && valStr !== undefined) {
      const numVal = Number(valStr);
      payload[key] = isNaN(numVal) ? valStr : numVal;
    }
  }

  return { 
    meterId, 
    timestamp: new Date(), 
    payload 
  };
}
