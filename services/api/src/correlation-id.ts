import { randomUUID } from 'node:crypto';

export function resolveCorrelationId(header?: string | string[]): string {
  const value = Array.isArray(header) ? header[0] : header;
  if (value && value.length > 0) return value;
  return randomUUID();
}
