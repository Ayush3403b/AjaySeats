type Level = 'info' | 'warn' | 'error';

/** Keys matching this pattern are never written to logs (PII and secrets). */
const REDACT_KEYS = /pass|token|cookie|secret|authorization|phone|mobile|email|name|message|body|ip/i;

/** Structured JSON log line. Only pass operational metadata, never request bodies or PII. */
export function log(level: Level, msg: string, fields: Record<string, unknown> = {}): void {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    safe[key] = REDACT_KEYS.test(key) ? '[redacted]' : value;
  }
  const line = JSON.stringify({ time: new Date().toISOString(), level, msg, ...safe });
  if (level === 'error') console.error(line);
  else console.log(line);
}
