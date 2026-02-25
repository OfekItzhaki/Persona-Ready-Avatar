import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll } from 'vitest';

// Set up environment variables for tests BEFORE any imports
process.env.NEXT_PUBLIC_BRAIN_API_URL = 'http://localhost:3001';
process.env.AZURE_SPEECH_KEY = 'test-key';
process.env.AZURE_SPEECH_REGION = 'test-region';
process.env.BRAIN_API_URL = 'http://localhost:3001';

// Set up environment variables for tests
beforeAll(() => {
  process.env.NEXT_PUBLIC_BRAIN_API_URL = 'http://localhost:3001';
  process.env.AZURE_SPEECH_KEY = 'test-key';
  process.env.AZURE_SPEECH_REGION = 'test-region';
  process.env.BRAIN_API_URL = 'http://localhost:3001';
});

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock AudioContext
global.AudioContext = class AudioContext {
  createBufferSource() {
    return {
      connect: () => {},
      start: () => {},
      stop: () => {},
      buffer: null,
    };
  }
  createGain() {
    return {
      connect: () => {},
      gain: { value: 1 },
    };
  }
  get destination() {
    return {};
  }
  get currentTime() {
    return 0;
  }
  get state() {
    return 'running';
  }
  resume() {
    return Promise.resolve();
  }
  suspend() {
    return Promise.resolve();
  }
  close() {
    return Promise.resolve();
  }
} as unknown as typeof AudioContext;
