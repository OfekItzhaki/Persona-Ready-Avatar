/**
 * Property-based tests for model upload overwrite idempotence
 * Property 12: Model upload overwrite is idempotent
 * Validates: Requirements 3.7
 *
 * Tests the core behavior of the upload-model route:
 * writing a model file to public/models/ and updating PresenterStore.
 * Tested directly (without importing next/server) to avoid Next.js runtime deps.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Feature: photorealistic-avatar, Property 12: Model upload overwrite is idempotent
// Validates: Requirements 3.7

function glbBuffer(extra: Uint8Array = new Uint8Array(0)): Buffer {
  return Buffer.concat([Buffer.from([0x67, 0x6c, 0x54, 0x46]), Buffer.from(extra)]);
}

/**
 * Simulates the core write logic of the upload-model route:
 * 1. Ensure public/models/ exists
 * 2. Write file (overwrite if exists)
 * 3. Write model path to PresenterStore
 */
async function simulateUpload(
  baseDir: string,
  agentId: string,
  sanitizedName: string,
  content: Buffer
): Promise<{ modelPath: string }> {
  const modelsDir = path.join(baseDir, 'public', 'models');
  await fs.mkdir(modelsDir, { recursive: true });
  await fs.writeFile(path.join(modelsDir, sanitizedName), content);

  const modelPath = `/models/${sanitizedName}`;

  vi.spyOn(process, 'cwd').mockReturnValue(baseDir);
  vi.resetModules();
  const { presenterStore } = await import('@/lib/services/PresenterStore');
  await presenterStore.setAssignment(agentId, {
    mode: 'glb',
    modelPath,
    agentId,
    createdAt: new Date().toISOString(),
  });

  return { modelPath };
}

describe('Property 12: Model upload overwrite is idempotent', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('uploading the same filename twice leaves exactly one file whose content equals the second upload', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_-]{0,15}$/).map((s) => `${s}.glb`),
        fc.uint8Array({ minLength: 1, maxLength: 32 }),
        fc.uint8Array({ minLength: 1, maxLength: 32 }),
        async (filename, extra1, extra2) => {
          const iterDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pbt-overwrite-'));
          await fs.mkdir(path.join(iterDir, 'config'), { recursive: true });

          try {
            const content1 = glbBuffer(extra1);
            const content2 = glbBuffer(extra2);

            // First upload
            await simulateUpload(iterDir, 'agent-test', filename, content1);

            // Second upload — same filename, different content
            await simulateUpload(iterDir, 'agent-test', filename, content2);

            // Exactly one file in Model_Store
            const modelsDir = path.join(iterDir, 'public', 'models');
            const files = await fs.readdir(modelsDir);
            expect(files).toHaveLength(1);

            // Content equals the second upload
            const stored = await fs.readFile(path.join(modelsDir, files[0]));
            expect(stored).toEqual(content2);
          } finally {
            vi.restoreAllMocks();
            vi.resetModules();
            await fs.rm(iterDir, { recursive: true, force: true });
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('uploading the same file twice returns the same modelPath both times', async () => {
    const iterDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pbt-modelpath-'));
    await fs.mkdir(path.join(iterDir, 'config'), { recursive: true });

    try {
      const content = glbBuffer(new Uint8Array([1, 2, 3]));
      const filename = 'idempotent.glb';

      const result1 = await simulateUpload(iterDir, 'agent-idem', filename, content);
      const result2 = await simulateUpload(iterDir, 'agent-idem', filename, content);

      expect(result1.modelPath).toBe(result2.modelPath);
      expect(result1.modelPath).toBe('/models/idempotent.glb');
    } finally {
      vi.restoreAllMocks();
      vi.resetModules();
      await fs.rm(iterDir, { recursive: true, force: true });
    }
  });
});
