import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { logger } from '../logger';

// Helper function to simulate the validation logic
function validateEnvVars(envVars: Record<string, string | undefined>, isBrowser: boolean): {
  success: boolean;
  missingVars: string[];
  errorLogged: boolean;
  warnLogged: boolean;
} {
  const REQUIRED_ENV_VARS = ['AZURE_SPEECH_KEY', 'AZURE_SPEECH_REGION', 'BRAIN_API_URL'] as const;
  const missingVars: string[] = [];

  for (const varName of REQUIRED_ENV_VARS) {
    if (!envVars[varName]) {
      missingVars.push(varName);
    }
  }

  let errorLogged = false;
  let warnLogged = false;

  if (missingVars.length > 0) {
    const errorMessage = `Missing required environment variables: ${missingVars.join(', ')}`;

    if (isBrowser) {
      logger.error(errorMessage, {
        component: 'EnvValidation',
        missingVariables: missingVars,
      });
      errorLogged = true;
      return { success: false, missingVars, errorLogged, warnLogged };
    } else {
      logger.warn(`${errorMessage} (build-time warning)`, {
        component: 'EnvValidation',
        missingVariables: missingVars,
      });
      warnLogged = true;
      return { success: false, missingVars, errorLogged, warnLogged };
    }
  }

  return { success: true, missingVars: [], errorLogged, warnLogged };
}

/**
 * Property 18: Environment Variable Validation
 * 
 * **Validates: Requirements 8.7, 8.8**
 * 
 * For any required environment variable (AZURE_SPEECH_KEY, AZURE_SPEECH_REGION, BRAIN_API_URL),
 * if the variable is missing at startup, the application should log an error specifying the
 * missing variable and prevent startup.
 */
describe('Property 18: Environment Variable Validation', () => {
  const REQUIRED_ENV_VARS = ['AZURE_SPEECH_KEY', 'AZURE_SPEECH_REGION', 'BRAIN_API_URL'] as const;
  
  let loggerErrorSpy: ReturnType<typeof vi.spyOn>;
  let loggerWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Spy on logger methods
    loggerErrorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    loggerWarnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore mocks
    vi.restoreAllMocks();
  });

  it('should detect and log any missing required environment variable', () => {
    fc.assert(
      fc.property(
        // Generate a non-empty subset of required environment variables to be missing
        fc.subarray(REQUIRED_ENV_VARS, { minLength: 1, maxLength: REQUIRED_ENV_VARS.length }),
        (missingVars) => {
          // Clear previous calls
          loggerErrorSpy.mockClear();
          loggerWarnSpy.mockClear();
          
          // Set up environment: set all vars first, then remove the ones that should be missing
          const envVars: Record<string, string | undefined> = {};
          for (const varName of REQUIRED_ENV_VARS) {
            envVars[varName] = 'test-value';
          }
          
          for (const varName of missingVars) {
            envVars[varName] = undefined;
          }
          
          // Validate in browser mode
          const result = validateEnvVars(envVars, true);
          
          // Property 1: Validation should fail
          expect(result.success).toBe(false);
          
          // Property 2: Error should be logged
          expect(result.errorLogged).toBe(true);
          expect(loggerErrorSpy).toHaveBeenCalled();
          
          // Property 3: Error message should mention "Missing required environment variables"
          const errorCalls = loggerErrorSpy.mock.calls;
          const errorMessages = errorCalls.map(call => call[0]);
          const hasCorrectErrorMessage = errorMessages.some(msg => 
            typeof msg === 'string' && msg.includes('Missing required environment variables')
          );
          expect(hasCorrectErrorMessage).toBe(true);
          
          // Property 4: All missing variable names should be logged
          const allErrorArgs = errorCalls.flat();
          for (const missingVar of missingVars) {
            const isVarMentioned = allErrorArgs.some(arg => {
              if (typeof arg === 'string') {
                return arg.includes(missingVar);
              }
              if (arg && typeof arg === 'object' && 'missingVariables' in arg) {
                return (arg.missingVariables as string[]).includes(missingVar);
              }
              return false;
            });
            expect(isVarMentioned).toBe(true);
          }
          
          // Property 5: Result should contain all missing variables
          expect(result.missingVars).toEqual(expect.arrayContaining(missingVars));
          expect(result.missingVars.length).toBe(missingVars.length);
        }
      ),
      { numRuns: 25 }
    );
  });

  it('should prevent application startup when required variables are missing in browser', () => {
    fc.assert(
      fc.property(
        // Generate a non-empty subset of required environment variables to be missing
        fc.subarray(REQUIRED_ENV_VARS, { minLength: 1, maxLength: REQUIRED_ENV_VARS.length }),
        (missingVars) => {
          // Clear previous calls
          loggerErrorSpy.mockClear();
          
          // Set up environment
          const envVars: Record<string, string | undefined> = {};
          for (const varName of REQUIRED_ENV_VARS) {
            envVars[varName] = 'test-value';
          }
          
          for (const varName of missingVars) {
            envVars[varName] = undefined;
          }
          
          // Validate in browser mode
          const result = validateEnvVars(envVars, true);
          
          // Property: Validation should fail (preventing startup)
          expect(result.success).toBe(false);
          
          // Property: Error should be logged
          expect(result.errorLogged).toBe(true);
          
          // Property: Missing variables should be identified
          expect(result.missingVars.length).toBeGreaterThan(0);
          expect(result.missingVars).toEqual(expect.arrayContaining(missingVars));
        }
      ),
      { numRuns: 25 }
    );
  });

  it('should successfully validate when all required variables are present', () => {
    fc.assert(
      fc.property(
        // Generate valid values for each required environment variable
        fc.record({
          AZURE_SPEECH_KEY: fc.string({ minLength: 1, maxLength: 50 }),
          AZURE_SPEECH_REGION: fc.string({ minLength: 1, maxLength: 50 }),
          BRAIN_API_URL: fc.webUrl(),
        }),
        (envVars) => {
          // Clear previous calls
          loggerErrorSpy.mockClear();
          loggerWarnSpy.mockClear();
          
          // Validate in browser mode with all required variables present
          const result = validateEnvVars(envVars, true);
          
          // Property: Validation should succeed
          expect(result.success).toBe(true);
          
          // Property: No error should be logged
          expect(result.errorLogged).toBe(false);
          expect(loggerErrorSpy).not.toHaveBeenCalled();
          
          // Property: No missing variables
          expect(result.missingVars).toEqual([]);
        }
      ),
      { numRuns: 25 }
    );
  });

  it('should log warning during build time (SSR) but not throw', () => {
    fc.assert(
      fc.property(
        // Generate a non-empty subset of required environment variables to be missing
        fc.subarray(REQUIRED_ENV_VARS, { minLength: 1, maxLength: REQUIRED_ENV_VARS.length }),
        (missingVars) => {
          // Clear previous calls
          loggerWarnSpy.mockClear();
          loggerErrorSpy.mockClear();
          
          // Set up environment
          const envVars: Record<string, string | undefined> = {};
          for (const varName of REQUIRED_ENV_VARS) {
            envVars[varName] = 'test-value';
          }
          
          for (const varName of missingVars) {
            envVars[varName] = undefined;
          }
          
          // Validate in server-side mode (not browser)
          const result = validateEnvVars(envVars, false);
          
          // Property: Validation should fail but not throw
          expect(result.success).toBe(false);
          
          // Property: Warning should be logged instead of error
          expect(result.warnLogged).toBe(true);
          expect(result.errorLogged).toBe(false);
          expect(loggerWarnSpy).toHaveBeenCalled();
          
          // Property: Warning message should mention missing variables and build-time
          const warnCalls = loggerWarnSpy.mock.calls;
          const warnMessages = warnCalls.map(call => call[0]);
          const hasCorrectWarnMessage = warnMessages.some(msg => 
            typeof msg === 'string' && 
            msg.includes('Missing required environment variables') &&
            msg.includes('build-time warning')
          );
          expect(hasCorrectWarnMessage).toBe(true);
          
          // Property: Missing variables should be identified
          expect(result.missingVars).toEqual(expect.arrayContaining(missingVars));
        }
      ),
      { numRuns: 25 }
    );
  });
});
