/**
 * Tests for PresenterStore
 * Covers property-based tests (3.1, 3.2) and unit tests (3.3)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// We need to test PresenterStore with a real temp directory
// to avoid touching the actual config file.

import type { AvatarAssignment } from '@/types/avatar';

// ---- Arbitraries ----

const didAssignmentArb = fc.record({
  mode: fc.constant('did' as const),
  presenterId: fc
    .string({ minLength: 1, maxLength: 64 })
    .filter((s: string) => s.trim().length > 0),
  agentId: fc.string({ minLength: 1, maxLength: 64 }).filter((s: string) => s.trim().length > 0),
  createdAt: fc.date().map((d: Date) => d.toISOString()),
});

const glbAssignmentArb = fc.record({
  mode: fc.constant('glb' as const),
  modelPath: fc.string({ minLength: 1, maxLength: 128 }).filter((s: string) => s.trim().length > 0),
  agentId: fc.string({ minLength: 1, maxLength: 64 }).filter((s: string) => s.trim().length > 0),
  createdAt: fc.date().map((d: Date) => d.toISOString()),
});

const avatarAssignmentArb: fc.Arbitrary<AvatarAssignment> = fc.oneof(
  didAssignmentArb,
  glbAssignmentArb
);

// ---- Helper: create an isolated PresenterStore pointing at a temp file ----

async function makeStore(configPath: string) {
  // configPath is like /tmp/xxx/config/avatar-assignments.json
  // process.cwd() should be the project root, i.e. /tmp/xxx
  const projectRoot = path.dirname(path.dirname(configPath));
  const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(projectRoot);

  // Re-import the module fresh each time by clearing the module cache
  vi.resetModules();
  const { presenterStore } = await import('@/lib/services/PresenterStore');

  return { store: presenterStore, cwdSpy };
}

// ---- Tests ----

describe('PresenterStore', () => {
  let tmpDir: string;
  let configPath: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'presenter-store-test-'));
    // The store expects config/avatar-assignments.json relative to cwd
    await fs.mkdir(path.join(tmpDir, 'config'), { recursive: true });
    configPath = path.join(tmpDir, 'config', 'avatar-assignments.json');
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.resetModules();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  // ---- 3.3 Unit tests ----

  describe('Unit tests — edge cases', () => {
    it('initializes empty map when config file is missing (requirement 4.5)', async () => {
      const { store, cwdSpy } = await makeStore(configPath);
      const all = store.getAllAssignments();
      expect(all).toEqual({});
      cwdSpy.mockRestore();
    });

    it('initializes empty map and does NOT overwrite corrupted file (requirement 4.6)', async () => {
      // Write invalid JSON to the config file
      await fs.writeFile(configPath, '{ this is not valid json }', 'utf-8');
      const originalContent = await fs.readFile(configPath, 'utf-8');

      const { store, cwdSpy } = await makeStore(configPath);

      // getAllAssignments should return empty map
      const all = store.getAllAssignments();
      expect(all).toEqual({});

      // The corrupted file must NOT have been overwritten
      const contentAfter = await fs.readFile(configPath, 'utf-8');
      expect(contentAfter).toBe(originalContent);
      cwdSpy.mockRestore();
    });

    it('getAssignment returns null for unknown agentId', async () => {
      const { store, cwdSpy } = await makeStore(configPath);
      expect(store.getAssignment('nonexistent-agent')).toBeNull();
      cwdSpy.mockRestore();
    });

    it('setAssignment persists and getAssignment retrieves the value', async () => {
      const { store, cwdSpy } = await makeStore(configPath);

      const assignment: AvatarAssignment = {
        mode: 'did',
        presenterId: 'prs_abc123',
        agentId: 'agent-1',
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      await store.setAssignment('agent-1', assignment);
      expect(store.getAssignment('agent-1')).toEqual(assignment);
      cwdSpy.mockRestore();
    });

    it('setAssignment writes atomically (tmp file then rename)', async () => {
      const { store, cwdSpy } = await makeStore(configPath);

      const assignment: AvatarAssignment = {
        mode: 'glb',
        modelPath: '/models/agent.glb',
        agentId: 'agent-2',
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      await store.setAssignment('agent-2', assignment);

      // The .tmp file should not exist after a successful write
      const tmpPath = configPath + '.tmp';
      await expect(fs.access(tmpPath)).rejects.toThrow();

      // The main config file should exist and be valid JSON
      const raw = await fs.readFile(configPath, 'utf-8');
      const parsed = JSON.parse(raw);
      expect(parsed['agent-2']).toEqual(assignment);
      cwdSpy.mockRestore();
    });

    it('getAllAssignments returns all stored assignments', async () => {
      const { store, cwdSpy } = await makeStore(configPath);

      const a1: AvatarAssignment = {
        mode: 'did',
        presenterId: 'p1',
        agentId: 'a1',
        createdAt: '2024-01-01T00:00:00.000Z',
      };
      const a2: AvatarAssignment = {
        mode: 'glb',
        modelPath: '/m.glb',
        agentId: 'a2',
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      await store.setAssignment('a1', a1);
      await store.setAssignment('a2', a2);

      const all = store.getAllAssignments();
      expect(all['a1']).toEqual(a1);
      expect(all['a2']).toEqual(a2);
      cwdSpy.mockRestore();
    });

    it('unrecognized mode value in JSON is loaded as-is (raw parse, no validation)', async () => {
      // The store itself does not validate mode values — it stores raw JSON.
      // Validation of mode values is the responsibility of callers.
      // This test documents that behavior.
      const badData = JSON.stringify({
        'agent-x': { mode: 'unknown', agentId: 'agent-x', createdAt: '2024-01-01T00:00:00.000Z' },
      });
      await fs.writeFile(configPath, badData, 'utf-8');

      const { store, cwdSpy } = await makeStore(configPath);
      // Trigger cache population by calling setAssignment (which calls ensureCache)
      // We use a dummy read by calling getAssignment after triggering ensureCache via getAllAssignments
      // Since getAllAssignments is sync and cache is null, we need to trigger ensureCache first.
      // Call setAssignment with a dummy value to trigger ensureCache, then check the loaded data.
      // Actually, we need to read the existing data — use a workaround: call setAssignment
      // with a value that won't conflict, which triggers ensureCache and merges with existing data.
      const dummy: AvatarAssignment = {
        mode: 'did',
        presenterId: 'p',
        agentId: '__dummy__',
        createdAt: '2024-01-01T00:00:00.000Z',
      };
      await store.setAssignment('__dummy__', dummy);

      const all = store.getAllAssignments();
      expect((all['agent-x'] as { mode: string }).mode).toBe('unknown');
      cwdSpy.mockRestore();
    });
  });

  // ---- 3.1 Property test: PresenterStore round-trip (file persistence) ----

  describe('Property 4: Presenter assignment round-trip (file persistence)', () => {
    // Feature: photorealistic-avatar, Property 4: presenter assignment round-trip
    // Validates: Requirements 2.8, 4.3, 4.7
    it('written assignment equals assignment read back from disk', async () => {
      await fc.assert(
        fc.asyncProperty(avatarAssignmentArb, async (assignment) => {
          // Fresh temp dir per iteration
          const iterDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pbt-store-'));
          await fs.mkdir(path.join(iterDir, 'config'), { recursive: true });
          const iterConfig = path.join(iterDir, 'config', 'avatar-assignments.json');

          const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(iterDir);
          vi.resetModules();
          const { presenterStore: store } = await import('@/lib/services/PresenterStore');

          try {
            await store.setAssignment(assignment.agentId, assignment);

            // Read from disk and parse
            const raw = await fs.readFile(iterConfig, 'utf-8');
            const parsed = JSON.parse(raw) as Record<string, AvatarAssignment>;

            expect(parsed[assignment.agentId]).toEqual(assignment);
          } finally {
            cwdSpy.mockRestore();
            vi.resetModules();
            await fs.rm(iterDir, { recursive: true, force: true });
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  // ---- 3.2 Property test: AvatarAssignment serialization round-trip ----

  describe('Property 5: AvatarAssignment serialization round-trip', () => {
    // Feature: photorealistic-avatar, Property 5: AvatarAssignment serialization round-trip
    // Validates: Requirements 14.1, 14.2, 14.3, 14.4
    it('serialize → deserialize produces deeply equal record', () => {
      fc.assert(
        fc.property(avatarAssignmentArb, (assignment: AvatarAssignment) => {
          const serialized = JSON.stringify(assignment);
          const deserialized = JSON.parse(serialized) as AvatarAssignment;
          expect(deserialized).toEqual(assignment);
        }),
        { numRuns: 100 }
      );
    });

    it('deserialize → re-serialize produces semantically equivalent JSON', () => {
      fc.assert(
        fc.property(avatarAssignmentArb, (assignment: AvatarAssignment) => {
          const json1 = JSON.stringify(assignment);
          const deserialized = JSON.parse(json1) as AvatarAssignment;
          const json2 = JSON.stringify(deserialized);

          // Semantic equivalence: both parse to the same object
          expect(JSON.parse(json2)).toEqual(JSON.parse(json1));
        }),
        { numRuns: 100 }
      );
    });
  });
});
