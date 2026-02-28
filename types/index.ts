// Domain Models

export interface Agent {
  id: string;
  name: string;
  description?: string;
  voice: string;
  language: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
  edited?: boolean;
  editedAt?: Date;
  reaction?: 'thumbs_up' | 'thumbs_down';
  queueStatus?: 'pending' | 'sending' | 'sent' | 'failed';
}

export interface VisemeData {
  visemeId: number;
  timestamp: number;
  duration: number;
}

export interface VisemeEvent {
  visemeId: number;
  audioOffset: number;
  duration: number;
}

export interface BlendshapeMapping {
  visemeId: number;
  blendshapeName: string;
  targetValue: number;
}

export interface NotificationAction {
  label: string;
  onClick: () => void;
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: Date;
  duration?: number;
  action?: NotificationAction;
  dismissible?: boolean;
}

// API Models

export interface SendMessageRequest {
  agentId: string;
  message: string;
}

export interface ChatResponse {
  message: string;
  agentId: string;
  timestamp: string;
}

export interface AgentsResponse {
  agents: Agent[];
}

// Speech Models

export interface SpeechConfig {
  voice: string;
  language: string;
  outputFormat: AudioFormat;
  rate?: number; // 0.5-2.0, default 1.0
  pitch?: number; // -50 to +50, default 0
}

export interface SynthesisResult {
  audioBuffer: AudioBuffer;
  visemes: VisemeEvent[];
}

export type AudioFormat =
  | 'audio-16khz-32kbitrate-mono-mp3'
  | 'audio-24khz-48kbitrate-mono-mp3'
  | 'raw-16khz-16bit-mono-pcm';

// Error Models

export type Result<T, E> = { success: true; data: T } | { success: false; error: E };

export type ApiError =
  | { type: 'NETWORK_ERROR'; message: string }
  | { type: 'TIMEOUT'; duration: number }
  | { type: 'SERVER_ERROR'; status: number; details: string }
  | { type: 'VALIDATION_ERROR'; fields: string[] };

export type TTSError =
  | { type: 'NETWORK_ERROR'; message: string }
  | { type: 'INVALID_VOICE'; voice: string }
  | { type: 'SYNTHESIS_FAILED'; details: string };

export type SpeechError =
  | { type: 'INVALID_KEY'; message: string }
  | { type: 'INVALID_REGION'; region: string }
  | { type: 'SYNTHESIS_FAILED'; reason: string }
  | { type: 'NETWORK_ERROR'; message: string };

export interface ValidationError {
  type: 'VALIDATION_ERROR';
  fields: Array<{
    field: string;
    message: string;
  }>;
}

export type DomainError = ApiError | TTSError | SpeechError | ValidationError;

// State Types

export type PlaybackState = 'idle' | 'playing' | 'paused' | 'stopped';

// Enhanced State Types for Requirements 3-9, 22-23, 32-34

export interface AudioPreferences {
  volume: number; // 0-100
  isMuted: boolean;
  playbackSpeed: number; // 0.5-2.0
  speechRate: number; // 0.5-2.0
  speechPitch: number; // -50 to +50
  audioQuality: 'low' | 'medium' | 'high';
}

export interface AvatarCustomization {
  skinTone: string; // hex color
  eyeColor: string; // hex color
  hairColor: string; // hex color
  currentExpression: 'neutral' | 'happy' | 'sad' | 'surprised' | 'angry' | null;
}

export interface UIPreferences {
  theme: 'light' | 'dark' | 'system';
  graphicsQuality: 'low' | 'medium' | 'high' | 'ultra';
  performanceMonitorVisible: boolean;
  performanceMonitorExpanded: boolean;
  highContrastMode: boolean;
  settingsPanelActiveSection?: 'audio' | 'graphics' | 'appearance' | 'accessibility' | 'privacy';
  screenReaderOptimizations: boolean;
  enhancedFocusIndicators: boolean;
}

export interface OfflineQueueItem {
  id: string;
  agentId: string;
  message: string;
  timestamp: Date;
  status: 'pending' | 'sending' | 'sent' | 'failed';
  retryCount: number;
}

export interface PerformanceMetrics {
  fps: number;
  averageFps: number;
  frameTime: number;
  memoryUsage: number | null;
  drawCalls: number;
  triangles: number;
  brainApiLatency: number[];
  ttsLatency: number[];
}

// Service Interfaces

export interface ITTSService {
  synthesizeSpeech(
    text: string,
    voice: string,
    language: string
  ): Promise<Result<AudioBuffer, TTSError>>;

  subscribeToVisemes(callback: (viseme: VisemeEvent) => void): () => void;

  stop(): void;
}

export interface IVisemeCoordinator {
  start(audioBuffer: AudioBuffer, visemes: VisemeEvent[]): void;
  stop(): void;
  getCurrentViseme(): VisemeData | null;
  subscribeToVisemeChanges(callback: (viseme: VisemeData) => void): () => void;
}

export interface IAudioManager {
  play(buffer: AudioBuffer): Promise<void>;
  pause(): void;
  resume(): void;
  stop(): void;
  skip(): void;
  getCurrentTime(): number;
  getDuration(): number;
  setVolume(volume: number): void;
  getVolume(): number;
  mute(): void;
  unmute(): void;
  isMuted(): boolean;
  setPlaybackSpeed(speed: number): void;
  getPlaybackSpeed(): number;
  enqueue(buffer: AudioBuffer): void;
  clearQueue(): void;
  getQueueLength(): number;
  getAudioLevelData(): Uint8Array | null;
  subscribeToPlaybackState(callback: (state: PlaybackState) => void): () => void;
}

export interface IBrainApiRepository {
  sendMessage(agentId: string, message: string): Promise<Result<ChatResponse, ApiError>>;
  getAgents(): Promise<Result<Agent[], ApiError>>;
}

export interface IAzureSpeechRepository {
  synthesize(text: string, config: SpeechConfig, isSSML?: boolean): Promise<Result<SynthesisResult, SpeechError>>;
}

export interface INotificationService {
  info(message: string, duration?: number): string;
  success(message: string, duration?: number): string;
  warning(message: string, duration?: number): string;
  error(message: string, duration?: number): string;
  dismiss(id: string): void;
  dismissAll(): void;
  destroy(): void;
}

// Constants

/**
 * Viseme-to-Blendshape Mapping
 * 
 * Azure Speech SDK provides 22 viseme IDs (0-21). These are mapped to blendshape targets
 * in the GLB model for lip synchronization.
 * 
 * Note: The GLB model must contain blendshape targets matching these names. If the model
 * uses different naming conventions, this mapping must be adjusted accordingly.
 */
export const VISEME_BLENDSHAPE_MAP: Record<number, string> = {
  0: 'viseme_sil', // Silence
  1: 'viseme_PP',  // p, b, m
  2: 'viseme_FF',  // f, v
  3: 'viseme_TH',  // th
  4: 'viseme_DD',  // t, d
  5: 'viseme_kk',  // k, g
  6: 'viseme_CH',  // ch, j, sh
  7: 'viseme_SS',  // s, z
  8: 'viseme_nn',  // n, l
  9: 'viseme_RR',  // r
  10: 'viseme_aa', // a (father)
  11: 'viseme_E',  // e (bed)
  12: 'viseme_I',  // i (feet)
  13: 'viseme_O',  // o (boat)
  14: 'viseme_U',  // u (book)
  15: 'viseme_aa', // a (cat)
  16: 'viseme_E',  // e (pet)
  17: 'viseme_I',  // i (sit)
  18: 'viseme_O',  // o (dog)
  19: 'viseme_U',  // u (put)
  20: 'viseme_aa', // a (about)
  21: 'viseme_E',  // e (taken)
};
