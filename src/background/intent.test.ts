import { afterEach, describe, expect, it, vi } from 'vitest';
import { classifyIntent, fallbackIntent, parseIntentJson } from './intent';

describe('parseIntentJson', () => {
  it('parses a find intent with a target', () => {
    expect(parseIntentJson('{"intent":"find","target":"AirPods Pro"}')).toEqual({
      kind: 'find',
      target: 'AirPods Pro',
    });
  });

  it('parses a checkout intent', () => {
    expect(parseIntentJson('{"intent":"checkout","target":""}')).toEqual({ kind: 'checkout' });
  });

  it('strips markdown code fences', () => {
    expect(parseIntentJson('```json\n{"intent":"checkout"}\n```')).toEqual({ kind: 'checkout' });
  });

  it('returns unknown for other intents or missing target', () => {
    expect(parseIntentJson('{"intent":"other"}')).toEqual({ kind: 'unknown' });
    expect(parseIntentJson('{"intent":"find","target":""}')).toEqual({ kind: 'unknown' });
  });

  it('returns unknown for non-JSON output', () => {
    expect(parseIntentJson('sorry, I did not understand')).toEqual({ kind: 'unknown' });
  });
});

describe('fallbackIntent', () => {
  it('maps checkout phrasing to checkout', () => {
    expect(fallbackIntent('check out now')).toEqual({ kind: 'checkout' });
    expect(fallbackIntent('pay now')).toEqual({ kind: 'checkout' });
  });

  it('maps find phrasing to find with the remainder as target', () => {
    expect(fallbackIntent('find the coupon code')).toEqual({
      kind: 'find',
      target: 'the coupon code',
    });
    expect(fallbackIntent('search for AirPods')).toEqual({ kind: 'find', target: 'AirPods' });
  });

  it('returns unknown otherwise', () => {
    expect(fallbackIntent('what is this site')).toEqual({ kind: 'unknown' });
  });
});

describe('classifyIntent', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the local fallback when no API key is set', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    expect(await classifyIntent('checkout please', undefined)).toEqual({ kind: 'checkout' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('calls gemini-1.5-flash and parses the response', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          { content: { parts: [{ text: '{"intent":"find","target":"price"}' }] } },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchSpy);

    const intent = await classifyIntent('find the price', 'test-key');

    expect(intent).toEqual({ kind: 'find', target: 'price' });
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('gemini-1.5-flash');
    expect(url).toContain('key=test-key');
    expect(JSON.parse(init.body as string).contents[0].parts[0].text).toContain('find the price');
  });

  it('throws on a non-OK Gemini response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 429, text: async () => 'quota' })
    );
    await expect(classifyIntent('checkout', 'bad-key')).rejects.toThrow('429');
  });
});
