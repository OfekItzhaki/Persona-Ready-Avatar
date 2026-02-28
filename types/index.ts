/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-explicit-any */
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
  // Voice input preferences (Requirements 7.4, 12.4, 12.5)
  voiceInputMode: InputMode;
  defaultRecognitionMode: RecognitionMode;
  showInterimResults: boolean;
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
  synthesize(
    text: string,
    config: SpeechConfig,
    isSSML?: boolean
  ): Promise<Result<SynthesisResult, SpeechError>>;
}

export interface IVoiceInputService {
  // Initialization
  initialize(config: AzureSpeechConfig): Promise<void>;

  // Recognition control
  startRecognition(mode: RecognitionMode): Promise<void>;
  stopRecognition(): Promise<void>;

  // Configuration
  updateLanguage(language: string): void;

  // Event subscriptions
  subscribeToResults(callback: (result: RecognitionResult) => void): () => void;
  subscribeToErrors(callback: (error: RecognitionError) => void): () => void;

  // State queries
  isRecognizing(): boolean;
  getMode(): RecognitionMode;
}

export interface IMicrophoneManager {
  // Permission management
  requestPermission(): Promise<PermissionResult>;
  checkPermission(): Promise<PermissionState>;

  // Audio capture
  startCapture(): Promise<MediaStream>;
  stopCapture(): void;

  // Status queries
  isAvailable(): boolean;
  isCapturing(): boolean;

  // Audio level monitoring
  getAudioLevel(): number;
  subscribeToAudioLevels(callback: (level: number) => void): () => void;
}

export interface ISpeechRecognizer {
  // Configuration
  configure(config: AzureSpeechConfig): void;

  // Recognition control
  startContinuousRecognition(audioStream: MediaStream): Promise<void>;
  stopContinuousRecognition(): Promise<void>;

  // Event handlers
  onRecognizing(callback: (result: InterimResult) => void): void;
  onRecognized(callback: (result: FinalResult) => void): void;
  onError(callback: (error: RecognitionError) => void): void;
  onSessionStarted(callback: () => void): void;
  onSessionStopped(callback: () => void): void;

  // State queries
  isRecognizing(): boolean;
}

export interface IInputModeController {
  // Mode management
  setMode(mode: InputMode): void;
  getMode(): InputMode;

  // Persistence
  savePreference(): void;
  loadPreference(): InputMode;

  // Event subscriptions
  subscribeToModeChanges(callback: (mode: InputMode) => void): () => void;
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
  1: 'viseme_PP', // p, b, m
  2: 'viseme_FF', // f, v
  3: 'viseme_TH', // th
  4: 'viseme_DD', // t, d
  5: 'viseme_kk', // k, g
  6: 'viseme_CH', // ch, j, sh
  7: 'viseme_SS', // s, z
  8: 'viseme_nn', // n, l
  9: 'viseme_RR', // r
  10: 'viseme_aa', // a (father)
  11: 'viseme_E', // e (bed)
  12: 'viseme_I', // i (feet)
  13: 'viseme_O', // o (boat)
  14: 'viseme_U', // u (book)
  15: 'viseme_aa', // a (cat)
  16: 'viseme_E', // e (pet)
  17: 'viseme_I', // i (sit)
  18: 'viseme_O', // o (dog)
  19: 'viseme_U', // u (put)
  20: 'viseme_aa', // a (about)
  21: 'viseme_E', // e (taken)
};

// Avatar System Types

export interface AvatarConfig {
  id: string;
  name: string;
  url: string;
  thumbnailUrl?: string;
  description?: string;
  source: 'ready-player-me' | 'local' | 'fallback';
  metadata?: {
    author?: string;
    license?: string;
    version?: string;
  };
}

export interface AvatarOption {
  id: string;
  name: string;
  url: string;
  thumbnailUrl?: string;
  description?: string;
}

export interface AvatarPreferences {
  selectedAvatarId: string;
  lastUpdated: Date;
  loadHistory: Array<{
    avatarId: string;
    timestamp: Date;
    success: boolean;
    loadTimeMs?: number;
  }>;
}

export type AvatarLoadError =
  | { type: 'NETWORK_ERROR'; message: string; retryable: true }
  | { type: 'TIMEOUT'; duration: number; retryable: true }
  | { type: 'INVALID_FORMAT'; details: string; retryable: false }
  | { type: 'NOT_FOUND'; url: string; retryable: false }
  | { type: 'WEBGL_ERROR'; message: string; retryable: false };

export interface AvatarLoadResult {
  success: boolean;
  model?: any; // GLTF type from @react-three/drei
  error?: AvatarLoadError;
  fromCache: boolean;
}

export interface AvatarMetadata {
  meshCount: number;
  triangleCount: number;
  blendshapeCount: number;
  availableBlendshapes: string[];
  missingVisemeBlendshapes: string[];
  fileSize: number;
}

export type AvatarValidationError =
  | { type: 'INVALID_GLB'; message: string }
  | { type: 'NO_MESH'; message: string }
  | { type: 'CORRUPTED_FILE'; message: string };

export type AvatarValidationWarning =
  | { type: 'MISSING_BLENDSHAPES'; blendshapes: string[] }
  | { type: 'HIGH_POLY_COUNT'; triangles: number }
  | { type: 'LARGE_FILE_SIZE'; sizeBytes: number };

export interface AvatarValidationResult {
  valid: boolean;
  errors: AvatarValidationError[];
  warnings: AvatarValidationWarning[];
  metadata: AvatarMetadata;
}

export interface WebGLContextState {
  contextLost: boolean;
  restoreAttempts: number;
  maxRestoreAttempts: number;
  lastContextLossTime: Date | null;
}

export type AvatarLoadingState = 'idle' | 'loading' | 'loaded' | 'error' | 'fallback';

// Voice Input Types (Requirements: 2.1, 2.4, 6.1, 6.2, 6.3, 6.4)

export type RecognitionMode = 'push-to-talk' | 'continuous';

export interface AzureSpeechConfig {
  subscriptionKey: string;
  region: string;
  language: string;
}

export interface RecognitionResult {
  type: 'interim' | 'final';
  text: string;
  confidence?: number;
  timestamp: number;
}

export type RecognitionError =
  | { type: 'NETWORK_ERROR'; message: string; recoverable: boolean }
  | { type: 'PERMISSION_DENIED'; message: string; recoverable: boolean }
  | { type: 'MICROPHONE_UNAVAILABLE'; message: string; recoverable: boolean }
  | { type: 'SYNTHESIS_FAILED'; message: string; recoverable: boolean }
  | { type: 'AUTHENTICATION_ERROR'; message: string; recoverable: boolean }
  | { type: 'TIMEOUT'; duration: number; recoverable: boolean };

export type PermissionState = 'granted' | 'denied' | 'prompt';

export interface PermissionResult {
  granted: boolean;
  error?: string;
}

export interface InterimResult {
  text: string;
  offset: number;
}

export interface FinalResult {
  text: string;
  confidence: number;
  offset: number;
  duration: number;
}

export type InputMode = 'voice' | 'text';

export interface RecognitionSession {
  id: string;
  mode: RecognitionMode;
  startTime: number;
  endTime?: number;
  status: SessionStatus;
  interimResults: InterimResult[];
  finalResults: FinalResult[];
  errors: RecognitionError[];
}

export type SessionStatus = 'starting' | 'active' | 'stopping' | 'stopped' | 'error';

export interface AudioConfig {
  sampleRate: number; // 16000 Hz for Azure Speech Service
  channelCount: number; // 1 (mono)
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
}

export interface VoiceInputPreferences {
  inputMode: InputMode;
  defaultRecognitionMode: RecognitionMode;
  showInterimResults: boolean;
  autoSendOnFinal: boolean;
}

// Voice Input UI Component Props

export type VoiceInputState = 'idle' | 'recording' | 'processing' | 'error';

export interface VoiceInputButtonProps {
  mode: RecognitionMode;
  isRecognizing: boolean;
  state?: VoiceInputState; // Visual state for enhanced feedback (Requirement 15.1-15.6)
  onPress: () => void;
  onRelease: () => void;
  disabled: boolean;
}

export interface InterimResultDisplayProps {
  text: string;
  visible: boolean;
  isProcessing?: boolean; // Show processing indicator (Requirement 15.3)
}

export interface AudioLevelIndicatorProps {
  level: number; // 0-100
  isActive: boolean;
}

export interface InputModeToggleProps {
  currentMode: InputMode;
  onModeChange: (mode: InputMode) => void;
  disabled: boolean;
}
