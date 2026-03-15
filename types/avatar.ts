// Re-export Result<T, E> from shared types — do NOT duplicate
export type { Result } from './index';

// Avatar assignment discriminated union
export type AvatarAssignment =
  | { mode: 'did'; presenterId: string; agentId: string; createdAt: string }
  | { mode: 'glb'; modelPath: string; agentId: string; createdAt: string };

// D-ID specific error union
export type DIDError =
  | { type: 'NETWORK_ERROR'; message: string }
  | { type: 'API_ERROR'; status: number; details: string }
  | { type: 'TIMEOUT'; durationMs: number }
  | { type: 'CONFIG_ERROR'; message: string };

// File/input validation result
export interface ValidationResult {
  valid: boolean;
  error?: string;
  detectedType?: string;
}

// D-ID API request/response shapes

export interface CreatePresenterRequest {
  source_url: string;
}

export interface CreatePresenterResponse {
  id: string;
}

export interface CreateTalkRequest {
  source_url: string;
  script: { type: 'audio'; audio_url: string };
}

export interface CreateTalkResponse {
  id: string;
}

export interface TalkStatusResponse {
  id: string;
  status: 'created' | 'started' | 'done' | 'error';
  result_url?: string;
  error?: { kind: string; description: string };
}
