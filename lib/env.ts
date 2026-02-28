import { logger } from './logger';
import { AvatarOption, AzureSpeechConfig } from '@/types';

interface EnvConfig {
  azureSpeechKey: string;
  azureSpeechRegion: string;
  brainApiUrl: string;
  avatarModelUrl: string;
  logLevel: string;
}

interface AvatarEnvConfig {
  defaultAvatars: AvatarOption[];
  fallbackType: 'cube' | 'sphere';
  fallbackColor: string;
  loadTimeout: number;
  maxRetries: number;
}

function validateEnv(): EnvConfig {
  const requiredEnvVars = ['AZURE_SPEECH_KEY', 'AZURE_SPEECH_REGION'] as const;

  const missingVars: string[] = [];

  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }

  // Check for Brain API URL (client-side accessible)
  if (!process.env.NEXT_PUBLIC_BRAIN_API_URL) {
    missingVars.push('NEXT_PUBLIC_BRAIN_API_URL');
  }

  if (missingVars.length > 0) {
    const errorMessage = `Missing required environment variables: ${missingVars.join(', ')}`;

    // Log warning but don't crash the app
    logger.warn(errorMessage, {
      component: 'EnvValidation',
      missingVariables: missingVars,
      note: 'Application will continue with limited functionality. TTS and AI features will not work until credentials are provided.',
    });
  } else {
    logger.info('Environment variables validated successfully', {
      component: 'EnvValidation',
    });
  }

  return {
    azureSpeechKey: process.env.AZURE_SPEECH_KEY || '',
    azureSpeechRegion: process.env.AZURE_SPEECH_REGION || '',
    brainApiUrl: process.env.NEXT_PUBLIC_BRAIN_API_URL || '',
    avatarModelUrl: process.env.NEXT_PUBLIC_AVATAR_MODEL_URL || '/models/avatar.glb',
    logLevel: process.env.NEXT_PUBLIC_LOG_LEVEL || 'info',
  };
}

let envConfig: EnvConfig | null = null;

export function getEnvConfig(): EnvConfig {
  if (!envConfig) {
    envConfig = validateEnv();
  }
  return envConfig;
}

export function isEnvConfigured(): boolean {
  const config = getEnvConfig();
  return !!(config.azureSpeechKey && config.azureSpeechRegion && config.brainApiUrl);
}

export function getMissingEnvVars(): string[] {
  const config = getEnvConfig();
  const missing: string[] = [];

  if (!config.azureSpeechKey) missing.push('AZURE_SPEECH_KEY');
  if (!config.azureSpeechRegion) missing.push('AZURE_SPEECH_REGION');
  if (!config.brainApiUrl) missing.push('NEXT_PUBLIC_BRAIN_API_URL');

  return missing;
}

// Validate environment variables at module load time (application startup)
// This ensures validation happens before any components render
// Only validate in browser (client-side) to avoid build-time errors
// Skip validation in test environment
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'test') {
  // Client-side: validate immediately
  envConfig = validateEnv();
}

/**
 * Get avatar configuration from environment variables
 *
 * Reads avatar-related environment variables and provides defaults
 * when variables are missing. Supports both development and production
 * configurations.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */
export function getAvatarConfig(): AvatarEnvConfig {
  const avatars: AvatarOption[] = [];

  // Parse default avatar URLs
  const avatar1Url = process.env.NEXT_PUBLIC_AVATAR_DEFAULT_1;
  const avatar2Url = process.env.NEXT_PUBLIC_AVATAR_DEFAULT_2;
  const avatar3Url = process.env.NEXT_PUBLIC_AVATAR_DEFAULT_3;

  if (avatar1Url) {
    avatars.push({
      id: 'default-1',
      name: 'Avatar 1',
      url: avatar1Url,
      description: 'Professional avatar option 1',
    });
  }

  if (avatar2Url) {
    avatars.push({
      id: 'default-2',
      name: 'Avatar 2',
      url: avatar2Url,
      description: 'Professional avatar option 2',
    });
  }

  if (avatar3Url) {
    avatars.push({
      id: 'default-3',
      name: 'Avatar 3',
      url: avatar3Url,
      description: 'Professional avatar option 3',
    });
  }

  // Fallback to default if no environment variables set
  if (avatars.length === 0) {
    logger.warn('No avatar environment variables found, using default', {
      component: 'EnvConfig',
      operation: 'getAvatarConfig',
    });

    avatars.push({
      id: 'default-1',
      name: 'Default Avatar',
      url: process.env.NEXT_PUBLIC_AVATAR_MODEL_URL || '/models/avatar.glb',
      description: 'Default avatar',
    });
  }

  // Parse fallback configuration
  const fallbackType =
    (process.env.NEXT_PUBLIC_AVATAR_FALLBACK_TYPE as 'cube' | 'sphere') || 'cube';
  const fallbackColor = process.env.NEXT_PUBLIC_AVATAR_FALLBACK_COLOR || '#4A90E2';

  // Parse loading configuration
  const loadTimeout = parseInt(process.env.NEXT_PUBLIC_AVATAR_LOAD_TIMEOUT || '10000', 10);
  const maxRetries = parseInt(process.env.NEXT_PUBLIC_AVATAR_MAX_RETRIES || '3', 10);

  return {
    defaultAvatars: avatars,
    fallbackType,
    fallbackColor,
    loadTimeout,
    maxRetries,
  };
}

/**
 * Get Azure Speech Service configuration from environment variables
 *
 * Reads Azure Speech credentials and validates they are present.
 * Returns configuration object for use with Azure Speech SDK.
 *
 * Requirements: 2.1
 */
export function getAzureSpeechConfig(): AzureSpeechConfig {
  const config = getEnvConfig();

  if (!config.azureSpeechKey || !config.azureSpeechRegion) {
    logger.error('Azure Speech Service credentials not configured', {
      component: 'EnvConfig',
      operation: 'getAzureSpeechConfig',
      hasKey: !!config.azureSpeechKey,
      hasRegion: !!config.azureSpeechRegion,
    });

    throw new Error(
      'Azure Speech Service credentials are required for voice input. Please configure AZURE_SPEECH_KEY and AZURE_SPEECH_REGION environment variables.'
    );
  }

  return {
    subscriptionKey: config.azureSpeechKey,
    region: config.azureSpeechRegion,
    language: 'en-US', // Default language, will be updated based on TTS voice
  };
}
