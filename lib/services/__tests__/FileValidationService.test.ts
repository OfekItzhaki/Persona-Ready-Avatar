/**
 * Tests for FileValidationService
 * Covers property-based tests (6.1, 6.2, 6.3) and unit tests for edge cases.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { fileValidationService } from '@/lib/services/FileValidationService';

// ── Helpers ──────────────────────────────────────────────────────────────────

function jpegBuffer(extra = 0): Buffer {
  const buf = Buffer.alloc(4 + extra);
  buf[0] = 0xff;
  buf[1] = 0xd8;
  buf[2] = 0xff;
  buf[3] = 0xe0;
  return buf;
}

function pngBuffer(extra = 0): Buffer {
  const buf = Buffer.alloc(8 + extra);
  buf[0] = 0x89;
  buf[1] = 0x50;
  buf[2] = 0x4e;
  buf[3] = 0x47;
  buf[4] = 0x0d;
  buf[5] = 0x0a;
  buf[6] = 0x1a;
  buf[7] = 0x0a;
  return buf;
}

function glbBuffer(extra = 0): Buffer {
  const buf = Buffer.alloc(4 + extra);
  buf[0] = 0x67;
  buf[1] = 0x6c;
  buf[2] = 0x54;
  buf[3] = 0x46;
  return buf;
}

function vrmJsonBuffer(extensions: unknown[] = ['VRM']): Buffer {
  return Buffer.from(JSON.stringify({ extensionsUsed: extensions }), 'utf-8');
}

// ── Unit tests ────────────────────────────────────────────────────────────────

describe('FileValidationService', () => {
  describe('validatePhoto — unit tests', () => {
    it('accepts JPEG magic bytes', () => {
      expect(fileValidationService.validatePhoto(jpegBuffer(), 'image/jpeg').valid).toBe(true);
    });

    it('accepts PNG magic bytes', () => {
      expect(fileValidationService.validatePhoto(pngBuffer(), 'image/png').valid).toBe(true);
    });

    it('rejects a buffer with no recognizable magic bytes', () => {
      const buf = Buffer.from([0x00, 0x01, 0x02, 0x03]);
      expect(fileValidationService.validatePhoto(buf, 'image/jpeg').valid).toBe(false);
    });

    it('ignores Content-Type header — rejects JPEG content-type with PNG bytes', () => {
      // Content-Type says JPEG but bytes are PNG — should still be valid (PNG)
      const result = fileValidationService.validatePhoto(pngBuffer(), 'image/jpeg');
      expect(result.valid).toBe(true);
      expect(result.detectedType).toBe('image/png');
    });

    it('ignores Content-Type header — rejects wrong content-type with non-image bytes', () => {
      const buf = Buffer.from('hello world');
      const result = fileValidationService.validatePhoto(buf, 'image/jpeg');
      expect(result.valid).toBe(false);
    });

    it('rejects empty buffer', () => {
      expect(fileValidationService.validatePhoto(Buffer.alloc(0), 'image/jpeg').valid).toBe(false);
    });

    it('rejects buffer shorter than magic bytes', () => {
      expect(
        fileValidationService.validatePhoto(Buffer.from([0xff, 0xd8]), 'image/jpeg').valid
      ).toBe(false);
    });

    it('returns detectedType for JPEG', () => {
      expect(fileValidationService.validatePhoto(jpegBuffer(), '').detectedType).toBe('image/jpeg');
    });

    it('returns detectedType for PNG', () => {
      expect(fileValidationService.validatePhoto(pngBuffer(), '').detectedType).toBe('image/png');
    });

    it('returns error message on rejection', () => {
      const result = fileValidationService.validatePhoto(Buffer.from([0x00]), '');
      expect(result.error).toBeTruthy();
    });
  });

  describe('validateModel — unit tests', () => {
    it('accepts GLB magic bytes', () => {
      expect(fileValidationService.validateModel(glbBuffer(), 'model.glb').valid).toBe(true);
    });

    it('accepts valid VRM JSON with extensionsUsed containing "VRM"', () => {
      expect(fileValidationService.validateModel(vrmJsonBuffer(), 'model.vrm').valid).toBe(true);
    });

    it('rejects VRM JSON without "VRM" in extensionsUsed', () => {
      const buf = vrmJsonBuffer(['OTHER']);
      expect(fileValidationService.validateModel(buf, 'model.vrm').valid).toBe(false);
    });

    it('rejects VRM JSON with empty extensionsUsed', () => {
      const buf = vrmJsonBuffer([]);
      expect(fileValidationService.validateModel(buf, 'model.vrm').valid).toBe(false);
    });

    it('rejects plain JSON without extensionsUsed', () => {
      const buf = Buffer.from(JSON.stringify({ foo: 'bar' }), 'utf-8');
      expect(fileValidationService.validateModel(buf, 'model.vrm').valid).toBe(false);
    });

    it('rejects invalid JSON', () => {
      const buf = Buffer.from('not json at all', 'utf-8');
      expect(fileValidationService.validateModel(buf, 'model.glb').valid).toBe(false);
    });

    it('rejects empty buffer', () => {
      expect(fileValidationService.validateModel(Buffer.alloc(0), 'model.glb').valid).toBe(false);
    });

    it('returns detectedType for GLB', () => {
      expect(fileValidationService.validateModel(glbBuffer(), 'model.glb').detectedType).toBe(
        'model/gltf-binary'
      );
    });

    it('returns detectedType for VRM', () => {
      expect(fileValidationService.validateModel(vrmJsonBuffer(), 'model.vrm').detectedType).toBe(
        'model/vrm'
      );
    });
  });

  describe('sanitizeFilename — unit tests', () => {
    it('leaves a clean filename unchanged', () => {
      expect(fileValidationService.sanitizeFilename('avatar.glb')).toBe('avatar.glb');
    });

    it('strips Unix path separators', () => {
      const result = fileValidationService.sanitizeFilename('/etc/passwd');
      expect(result).not.toContain('/');
    });

    it('strips Windows path separators', () => {
      const result = fileValidationService.sanitizeFilename('C:\\Windows\\system32\\file.glb');
      expect(result).not.toContain('\\');
    });

    it('strips path traversal sequences', () => {
      const result = fileValidationService.sanitizeFilename('../../etc/passwd');
      expect(result).not.toContain('..');
      expect(result).not.toContain('/');
    });

    it('replaces spaces with underscores', () => {
      expect(fileValidationService.sanitizeFilename('my avatar.glb')).toBe('my_avatar.glb');
    });

    it('replaces special characters with underscores', () => {
      const result = fileValidationService.sanitizeFilename('file@name!.glb');
      expect(result).toMatch(/^[a-zA-Z0-9._-]+$/);
    });

    it('handles empty string by returning safe default', () => {
      const result = fileValidationService.sanitizeFilename('');
      expect(result.length).toBeGreaterThan(0);
    });

    it('preserves hyphens and underscores', () => {
      expect(fileValidationService.sanitizeFilename('my-avatar_v2.glb')).toBe('my-avatar_v2.glb');
    });
  });

  // ── Property-based tests ──────────────────────────────────────────────────

  describe('Property 2: Photo upload accepts valid types and rejects invalid types', () => {
    // Feature: photorealistic-avatar, Property 2: photo upload accepts valid types and rejects invalid types
    // Validates: Requirements 2.2, 2.3, 16.1

    it('accepts any buffer starting with JPEG magic bytes', () => {
      fc.assert(
        fc.property(fc.uint8Array({ minLength: 0, maxLength: 100 }), (extra: Uint8Array) => {
          const buf = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.from(extra)]);
          return (
            fileValidationService.validatePhoto(buf, 'application/octet-stream').valid === true
          );
        }),
        { numRuns: 100 }
      );
    });

    it('accepts any buffer starting with PNG magic bytes', () => {
      fc.assert(
        fc.property(fc.uint8Array({ minLength: 0, maxLength: 100 }), (extra: Uint8Array) => {
          const buf = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.from(extra)]);
          return (
            fileValidationService.validatePhoto(buf, 'application/octet-stream').valid === true
          );
        }),
        { numRuns: 100 }
      );
    });

    it('rejects any buffer whose first bytes are not JPEG or PNG magic, regardless of Content-Type', () => {
      fc.assert(
        fc.property(
          fc.uint8Array({ minLength: 4, maxLength: 200 }),
          fc.constantFrom('image/jpeg', 'image/png', 'application/octet-stream', 'text/plain'),
          (bytes: Uint8Array, contentType: string) => {
            // Ensure the buffer does NOT start with JPEG or PNG magic
            const buf = Buffer.from(bytes);
            const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
            const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
            fc.pre(!isJpeg && !isPng);
            return fileValidationService.validatePhoto(buf, contentType).valid === false;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 3: Model upload accepts valid types and rejects invalid types', () => {
    // Feature: photorealistic-avatar, Property 3: model upload accepts valid types and rejects invalid types
    // Validates: Requirements 3.2, 3.3, 16.2

    it('accepts any buffer starting with GLB magic bytes', () => {
      fc.assert(
        fc.property(fc.uint8Array({ minLength: 0, maxLength: 100 }), (extra: Uint8Array) => {
          const buf = Buffer.concat([Buffer.from([0x67, 0x6c, 0x54, 0x46]), Buffer.from(extra)]);
          return fileValidationService.validateModel(buf, 'model.glb').valid === true;
        }),
        { numRuns: 100 }
      );
    });

    it('accepts valid VRM JSON buffers with extensionsUsed containing "VRM"', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string(), { minLength: 0, maxLength: 5 }),
          (otherExtensions: string[]) => {
            const extensions = [...otherExtensions, 'VRM'];
            const buf = Buffer.from(JSON.stringify({ extensionsUsed: extensions }), 'utf-8');
            return fileValidationService.validateModel(buf, 'model.vrm').valid === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('rejects buffers that are neither GLB nor valid VRM JSON', () => {
      fc.assert(
        fc.property(fc.uint8Array({ minLength: 4, maxLength: 200 }), (bytes: Uint8Array) => {
          const buf = Buffer.from(bytes);
          // Exclude GLB magic
          const isGlb = buf[0] === 0x67 && buf[1] === 0x6c && buf[2] === 0x54 && buf[3] === 0x46;
          fc.pre(!isGlb);
          // Exclude valid VRM JSON (hard to accidentally generate)
          try {
            const text = buf.toString('utf-8');
            const json = JSON.parse(text);
            const isVrm =
              Array.isArray(json?.extensionsUsed) && json.extensionsUsed.includes('VRM');
            fc.pre(!isVrm);
          } catch {
            // Not JSON — fine, proceed
          }
          return fileValidationService.validateModel(buf, 'model.bin').valid === false;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 8: Filename sanitization removes path traversal and invalid characters', () => {
    // Feature: photorealistic-avatar, Property 8: filename sanitization removes path traversal and invalid characters
    // Validates: Requirements 16.3, 16.4

    it('sanitized filename never contains path separators or ".."', () => {
      fc.assert(
        fc.property(fc.string(), (filename: string) => {
          const sanitized = fileValidationService.sanitizeFilename(filename);
          return !sanitized.includes('/') && !sanitized.includes('\\') && !sanitized.includes('..');
        }),
        { numRuns: 100 }
      );
    });

    it('sanitized filename contains only allowed characters [a-zA-Z0-9._-]', () => {
      fc.assert(
        fc.property(fc.string(), (filename: string) => {
          const sanitized = fileValidationService.sanitizeFilename(filename);
          return /^[a-zA-Z0-9._-]+$/.test(sanitized);
        }),
        { numRuns: 100 }
      );
    });

    it('sanitized filename is never empty', () => {
      fc.assert(
        fc.property(fc.string(), (filename: string) => {
          const sanitized = fileValidationService.sanitizeFilename(filename);
          return sanitized.length > 0;
        }),
        { numRuns: 100 }
      );
    });
  });
});
