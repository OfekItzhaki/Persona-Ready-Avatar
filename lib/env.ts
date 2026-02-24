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

    // Only throw error in browser (runtime), not during build
    if (typeof window !== 'undefined') {
      logger.error(errorMessage, {
        component: 'EnvValidation',
        missingVariables: missingVars,
      });
      throw new Error(errorMessage);
    } else {
      // During build/SSR, just log a warning
      logger.warn(`${errorMessage} (build-time warning)`, {
        component: 'EnvValidation',
        missingVariables: missingVars,
      });
    }
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

// Validate environment variables at module load time (application startup)
// This ensures validation happens before any components render
// Only validate in browser (client-side) to avoid build-time errors
// Skip validation in test environment
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'test') {
  // Client-side: validate immediately
  envConfig = validateEnv();
}
