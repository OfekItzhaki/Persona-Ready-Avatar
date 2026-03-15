/**
 * DIDService — server-side only.
 * Communicates with the D-ID REST API to create presenters and generate lip-synced video clips.
 * Never import this module in client components.
 */

import type { Result } from '@/types/index';
import type {
  DIDError,
  CreatePresenterResponse,
  CreateTalkResponse,
  TalkStatusResponse,
} from '@/types/avatar';

export interface IDIDService {
  createPresenter(
    photoBuffer: Buffer,
    mimeType: 'image/jpeg' | 'image/png'
  ): Promise<Result<string, DIDError>>;
  generateTalk(
    presenterId: string,
    audioBuffer: Buffer,
    audioMimeType: string
  ): Promise<Result<string, DIDError>>;
}

const POLL_INTERVAL_MS = 1000;
const TIMEOUT_MS = 30_000;

// Log missing API key once at startup
let _keyWarningLogged = false;

function getApiKey(): string | null {
  const key = process.env.DID_API_KEY ?? null;
  if (!key && !_keyWarningLogged) {
    console.error('[DIDService] Missing environment variable: DID_API_KEY');
    _keyWarningLogged = true;
  }
  return key;
}

function getBaseUrl(): string {
  return process.env.DID_API_BASE_URL ?? 'https://api.d-id.com';
}

function toDataUri(buffer: Buffer, mimeType: string): string {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

class DIDService implements IDIDService {
  async createPresenter(
    photoBuffer: Buffer,
    mimeType: 'image/jpeg' | 'image/png'
  ): Promise<Result<string, DIDError>> {
    const apiKey = getApiKey();
    if (!apiKey) {
      return { success: false, error: { type: 'CONFIG_ERROR', message: 'DID_API_KEY is not set' } };
    }

    const sourceUrl = toDataUri(photoBuffer, mimeType);

    let response: Response;
    try {
      response = await fetch(`${getBaseUrl()}/presenters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${apiKey}`,
        },
        body: JSON.stringify({ source_url: sourceUrl }),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: { type: 'NETWORK_ERROR', message } };
    }

    if (!response.ok) {
      const details = await response.text().catch(() => '');
      return {
        success: false,
        error: { type: 'API_ERROR', status: response.status, details },
      };
    }

    const body = (await response.json()) as CreatePresenterResponse;
    return { success: true, data: body.id };
  }

  async generateTalk(
    presenterId: string,
    audioBuffer: Buffer,
    audioMimeType: string
  ): Promise<Result<string, DIDError>> {
    const apiKey = getApiKey();
    if (!apiKey) {
      return { success: false, error: { type: 'CONFIG_ERROR', message: 'DID_API_KEY is not set' } };
    }

    const audioUrl = toDataUri(audioBuffer, audioMimeType);

    // POST /talks
    let talkResponse: Response;
    try {
      talkResponse = await fetch(`${getBaseUrl()}/talks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${apiKey}`,
        },
        body: JSON.stringify({
          source_url: presenterId,
          script: { type: 'audio', audio_url: audioUrl },
        }),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: { type: 'NETWORK_ERROR', message } };
    }

    if (!talkResponse.ok) {
      const details = await talkResponse.text().catch(() => '');
      return {
        success: false,
        error: { type: 'API_ERROR', status: talkResponse.status, details },
      };
    }

    const talkBody = (await talkResponse.json()) as CreateTalkResponse;
    const talkId = talkBody.id;

    // Poll /talks/{id} until done, error, or timeout
    const startTime = Date.now();

    while (true) {
      const elapsed = Date.now() - startTime;
      if (elapsed >= TIMEOUT_MS) {
        return { success: false, error: { type: 'TIMEOUT', durationMs: elapsed } };
      }

      await sleep(POLL_INTERVAL_MS);

      let statusResponse: Response;
      try {
        statusResponse = await fetch(`${getBaseUrl()}/talks/${talkId}`, {
          headers: { Authorization: `Basic ${apiKey}` },
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: { type: 'NETWORK_ERROR', message } };
      }

      if (!statusResponse.ok) {
        const details = await statusResponse.text().catch(() => '');
        return {
          success: false,
          error: { type: 'API_ERROR', status: statusResponse.status, details },
        };
      }

      const status = (await statusResponse.json()) as TalkStatusResponse;

      if (status.status === 'done') {
        const videoUrl = status.result_url ?? '';
        return { success: true, data: videoUrl };
      }

      if (status.status === 'error') {
        const details = status.error?.description ?? 'Unknown D-ID error';
        return {
          success: false,
          error: { type: 'API_ERROR', status: 0, details },
        };
      }

      // status is 'created' or 'started' — keep polling
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Singleton export — server-side only
export const didService: IDIDService = new DIDService();
