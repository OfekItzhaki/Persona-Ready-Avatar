/**
 * Unit tests for DIDService
 * Covers requirements: 2.5, 2.7, 6.4, 6.5, 6.6, 13.4
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePhotoBuffer(): Buffer {
  // Minimal JPEG-like buffer (magic bytes)
  return Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x01]);
}

function makeAudioBuffer(): Buffer {
  return Buffer.from('fake-audio-data');
}

// Build a mock fetch that returns a sequence of responses
function buildFetch(responses: Array<{ ok: boolean; status?: number; body: unknown }>) {
  let callIndex = 0;
  return vi.fn(async () => {
    const resp = responses[callIndex] ?? responses[responses.length - 1];
    callIndex++;
    return {
      ok: resp.ok,
      status: resp.status ?? (resp.ok ? 200 : 500),
      json: async () => resp.body,
      text: async () => JSON.stringify(resp.body),
    };
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DIDService', () => {
  beforeEach(() => {
    // Reset module registry so each test gets a fresh singleton
    vi.resetModules();
    // Set a default API key
    process.env.DID_API_KEY = 'test-api-key';
    process.env.DID_API_BASE_URL = 'https://api.d-id.com';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    delete process.env.DID_API_KEY;
    delete process.env.DID_API_BASE_URL;
  });

  // ── Requirement 13.4: CONFIG_ERROR when DID_API_KEY missing ──────────────

  describe('CONFIG_ERROR when DID_API_KEY is missing', () => {
    it('createPresenter returns CONFIG_ERROR when DID_API_KEY is not set', async () => {
      delete process.env.DID_API_KEY;
      vi.resetModules();
      const { didService } = await import('@/lib/services/DIDService');

      const result = await didService.createPresenter(makePhotoBuffer(), 'image/jpeg');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('CONFIG_ERROR');
      }
    });

    it('generateTalk returns CONFIG_ERROR when DID_API_KEY is not set', async () => {
      delete process.env.DID_API_KEY;
      vi.resetModules();
      const { didService } = await import('@/lib/services/DIDService');

      const result = await didService.generateTalk('prs_abc', makeAudioBuffer(), 'audio/mpeg');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('CONFIG_ERROR');
      }
    });
  });

  // ── Requirement 2.5: Successful presenter creation ────────────────────────

  describe('createPresenter — successful creation', () => {
    it('returns presenter ID on successful D-ID response', async () => {
      const mockFetch = buildFetch([{ ok: true, body: { id: 'prs_abc' } }]);
      vi.stubGlobal('fetch', mockFetch);

      vi.resetModules();
      const { didService } = await import('@/lib/services/DIDService');

      const result = await didService.createPresenter(makePhotoBuffer(), 'image/jpeg');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('prs_abc');
      }
    });

    it('sends photo as data URI in request body', async () => {
      const mockFetch = buildFetch([{ ok: true, body: { id: 'prs_xyz' } }]);
      vi.stubGlobal('fetch', mockFetch);

      vi.resetModules();
      const { didService } = await import('@/lib/services/DIDService');

      const photo = makePhotoBuffer();
      await didService.createPresenter(photo, 'image/jpeg');

      expect(mockFetch).toHaveBeenCalledOnce();
      const [, options] = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
      const body = JSON.parse(options.body as string) as { source_url: string };
      expect(body.source_url).toMatch(/^data:image\/jpeg;base64,/);
    });

    it('POSTs to /presenters endpoint', async () => {
      const mockFetch = buildFetch([{ ok: true, body: { id: 'prs_xyz' } }]);
      vi.stubGlobal('fetch', mockFetch);

      vi.resetModules();
      const { didService } = await import('@/lib/services/DIDService');

      await didService.createPresenter(makePhotoBuffer(), 'image/png');

      const [url] = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
      expect(url).toContain('/presenters');
    });
  });

  // ── Requirement 2.7: D-ID API error does not write to store ──────────────

  describe('createPresenter — API error', () => {
    it('returns API_ERROR when D-ID returns non-OK status', async () => {
      const mockFetch = buildFetch([
        { ok: false, status: 422, body: { message: 'Invalid image' } },
      ]);
      vi.stubGlobal('fetch', mockFetch);

      vi.resetModules();
      const { didService } = await import('@/lib/services/DIDService');

      const result = await didService.createPresenter(makePhotoBuffer(), 'image/jpeg');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('API_ERROR');
        if (result.error.type === 'API_ERROR') {
          expect(result.error.status).toBe(422);
        }
      }
    });

    it('returns NETWORK_ERROR when fetch throws', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));

      vi.resetModules();
      const { didService } = await import('@/lib/services/DIDService');

      const result = await didService.createPresenter(makePhotoBuffer(), 'image/jpeg');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('NETWORK_ERROR');
      }
    });
  });

  // ── Requirement 6.4: Poll returns video URL on "done" status ─────────────

  describe('generateTalk — poll returns video URL on "done"', () => {
    it('returns video URL when talk status becomes "done"', async () => {
      const mockFetch = buildFetch([
        // POST /talks
        { ok: true, body: { id: 'tlk_123' } },
        // GET /talks/tlk_123 — first poll: started
        { ok: true, body: { id: 'tlk_123', status: 'started' } },
        // GET /talks/tlk_123 — second poll: done
        {
          ok: true,
          body: { id: 'tlk_123', status: 'done', result_url: 'https://cdn.d-id.com/video.mp4' },
        },
      ]);
      vi.stubGlobal('fetch', mockFetch);

      // Speed up polling by mocking setTimeout
      vi.useFakeTimers();

      vi.resetModules();
      const { didService } = await import('@/lib/services/DIDService');

      const resultPromise = didService.generateTalk('prs_abc', makeAudioBuffer(), 'audio/mpeg');

      // Advance timers to trigger each poll interval
      await vi.runAllTimersAsync();

      const result = await resultPromise;

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('https://cdn.d-id.com/video.mp4');
      }

      vi.useRealTimers();
    });
  });

  // ── Requirement 6.5: Poll returns error on "error" status ────────────────

  describe('generateTalk — poll returns error on "error" status', () => {
    it('returns API_ERROR when talk status is "error"', async () => {
      const mockFetch = buildFetch([
        // POST /talks
        { ok: true, body: { id: 'tlk_456' } },
        // GET /talks/tlk_456 — poll: error
        {
          ok: true,
          body: {
            id: 'tlk_456',
            status: 'error',
            error: { kind: 'BadRequest', description: 'Invalid audio format' },
          },
        },
      ]);
      vi.stubGlobal('fetch', mockFetch);

      vi.useFakeTimers();

      vi.resetModules();
      const { didService } = await import('@/lib/services/DIDService');

      const resultPromise = didService.generateTalk('prs_abc', makeAudioBuffer(), 'audio/mpeg');
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('API_ERROR');
      }

      vi.useRealTimers();
    });
  });

  // ── Requirement 6.6: Timeout after 30 s ──────────────────────────────────

  describe('generateTalk — timeout after 30 s', () => {
    it('returns TIMEOUT error when poll does not complete within 30 seconds', async () => {
      // POST /talks succeeds; all subsequent polls return "started" indefinitely
      const mockFetch = vi.fn(async (url: string) => {
        if ((url as string).endsWith('/talks')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ id: 'tlk_789' }),
            text: async () => '',
          };
        }
        // Status poll — always "started"
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: 'tlk_789', status: 'started' }),
          text: async () => '',
        };
      });
      vi.stubGlobal('fetch', mockFetch);

      vi.useFakeTimers();

      vi.resetModules();
      const { didService } = await import('@/lib/services/DIDService');

      const resultPromise = didService.generateTalk('prs_abc', makeAudioBuffer(), 'audio/mpeg');

      // Advance time past the 30-second timeout
      await vi.advanceTimersByTimeAsync(31_000);

      const result = await resultPromise;

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('TIMEOUT');
        if (result.error.type === 'TIMEOUT') {
          expect(result.error.durationMs).toBeGreaterThanOrEqual(30_000);
        }
      }

      vi.useRealTimers();
    });
  });
});
