import { describe, expect, it } from 'vitest';
import { resolveCorrelationId } from '../../src/correlation-id.js';

describe('NFR-007 a log line contains a correlation ID', () => {
  it('keeps a valid header value', () => {
    expect(resolveCorrelationId('phase-0-check')).toBe('phase-0-check');
  });

  it('generates a UUID when the header is absent', () => {
    const id = resolveCorrelationId(undefined);
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('generates a UUID when the header is empty', () => {
    const id = resolveCorrelationId('');
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('uses the first value when the header is an array', () => {
    expect(resolveCorrelationId(['first', 'second'])).toBe('first');
  });
});
