/**
 * FileValidationService — server-side only.
 * Validates uploaded photo and model files by inspecting magic bytes.
 * Sanitizes filenames to prevent path traversal and injection.
 * Never import this module in client components.
 */

import { ValidationResult } from '@/types/avatar';

export interface IFileValidationService {
  validatePhoto(buffer: Buffer, contentType: string): ValidationResult;
  validateModel(buffer: Buffer, filename: string): ValidationResult;
  sanitizeFilename(filename: string): string;
}

// Magic byte sequences
const JPEG_MAGIC = [0xff, 0xd8, 0xff];
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];
const GLB_MAGIC = [0x67, 0x6c, 0x54, 0x46]; // "glTF"

function startsWith(buffer: Buffer, magic: number[]): boolean {
  if (buffer.length < magic.length) return false;
  return magic.every((byte, i) => buffer[i] === byte);
}

class FileValidationService implements IFileValidationService {
  /**
   * Validates a photo buffer by inspecting magic bytes.
   * The contentType header is intentionally ignored (requirement 16.1).
   */
  validatePhoto(buffer: Buffer, _contentType: string): ValidationResult {
    if (startsWith(buffer, JPEG_MAGIC)) {
      return { valid: true, detectedType: 'image/jpeg' };
    }
    if (startsWith(buffer, PNG_MAGIC)) {
      return { valid: true, detectedType: 'image/png' };
    }
    return {
      valid: false,
      error: 'File must be a JPEG or PNG image (invalid magic bytes)',
    };
  }

  /**
   * Validates a model buffer.
   * Accepts GLB (magic bytes 67 6C 54 46) or VRM (JSON with extensionsUsed containing "VRM").
   */
  validateModel(buffer: Buffer, _filename: string): ValidationResult {
    // Check GLB magic bytes first
    if (startsWith(buffer, GLB_MAGIC)) {
      return { valid: true, detectedType: 'model/gltf-binary' };
    }

    // Try parsing as VRM JSON
    try {
      const text = buffer.toString('utf-8');
      const json = JSON.parse(text);
      if (
        Array.isArray(json?.extensionsUsed) &&
        (json.extensionsUsed as unknown[]).includes('VRM')
      ) {
        return { valid: true, detectedType: 'model/vrm' };
      }
    } catch {
      // Not valid JSON — fall through to rejection
    }

    return {
      valid: false,
      error: 'File must be a valid GLB (glTF binary) or VRM model',
    };
  }

  /**
   * Sanitizes a filename:
   * - Strips path separators and ".." sequences
   * - Replaces any character not in [a-zA-Z0-9._-] with "_"
   */
  sanitizeFilename(filename: string): string {
    // Remove directory components (path separators and ..)
    // Split on both / and \ and take the last non-empty segment
    const parts = filename.split(/[/\\]+/);
    let base = parts[parts.length - 1] ?? '';

    // Remove any remaining ".." sequences
    base = base.replace(/\.\./g, '_');

    // Replace any character not in the allowed set with "_"
    base = base.replace(/[^a-zA-Z0-9._-]/g, '_');

    // If the result is empty, return a safe default
    return base || '_';
  }
}

// Singleton export — server-side only
export const fileValidationService: IFileValidationService = new FileValidationService();
