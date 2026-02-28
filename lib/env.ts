import { logger } from './logger';

interface EnvConfig {
  azureSpeechKey: string;
  azureSpeechRegion: string;
  brainApiUrl: string;
  avatarModelUrl: string;
  logLevel: string;
}

function validateEnv(): EnvConfig {
  const requiredEnvVars = ['AZURE_SPEECH_KEY', 'AZURE_SPEECH_REGION', 'BRAIN_API_URL'] as const;

  const missingVars: string[] = [];

  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
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
    brainApiUrl: process.env.BRAIN_API_URL || '',
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
  if (!config.brainApiUrl) missing.push('BRAIN_API_URL');
  
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
