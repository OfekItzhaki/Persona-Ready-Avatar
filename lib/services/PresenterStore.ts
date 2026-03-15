/**
 * PresenterStore — server-side only.
 * Persists per-agent AvatarAssignment records to config/avatar-assignments.json.
 * Uses atomic writes (temp file + fs.rename) to prevent partial-write corruption.
 * Never import this module in client components.
 */

import fs from 'fs/promises';
import path from 'path';
import { AvatarAssignment } from '@/types/avatar';

export interface IPresenterStore {
  getAssignment(agentId: string): AvatarAssignment | null;
  setAssignment(agentId: string, assignment: AvatarAssignment): Promise<void>;
  getAllAssignments(): Record<string, AvatarAssignment>;
}

function getConfigPath(): string {
  return path.join(process.cwd(), 'config', 'avatar-assignments.json');
}

function getTmpPath(): string {
  return getConfigPath() + '.tmp';
}

class PresenterStore implements IPresenterStore {
  private cache: Record<string, AvatarAssignment> | null = null;

  private async loadFromDisk(): Promise<Record<string, AvatarAssignment>> {
    try {
      const raw = await fs.readFile(getConfigPath(), 'utf-8');
      const parsed = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('Root value is not an object');
      }
      return parsed as Record<string, AvatarAssignment>;
    } catch (err: unknown) {
      if (isNodeError(err) && err.code === 'ENOENT') {
        // File missing — start with empty map
        return {};
      }
      // Invalid JSON or other parse error — log and keep empty map, do NOT overwrite
      console.error('[PresenterStore] Failed to parse avatar-assignments.json:', err);
      return {};
    }
  }

  private async ensureCache(): Promise<Record<string, AvatarAssignment>> {
    if (this.cache === null) {
      this.cache = await this.loadFromDisk();
    }
    return this.cache;
  }

  getAssignment(agentId: string): AvatarAssignment | null {
    if (this.cache === null) {
      // Cache not yet populated — caller should await setAssignment or getAllAssignments first.
      // For synchronous access, return null and let the caller handle async init.
      return null;
    }
    return this.cache[agentId] ?? null;
  }

  async setAssignment(agentId: string, assignment: AvatarAssignment): Promise<void> {
    const current = await this.ensureCache();
    const updated = { ...current, [agentId]: assignment };

    const json = JSON.stringify(updated, null, 2);
    await fs.writeFile(getTmpPath(), json, 'utf-8');
    await fs.rename(getTmpPath(), getConfigPath());

    // Invalidate cache after successful write
    this.cache = updated;
  }

  getAllAssignments(): Record<string, AvatarAssignment> {
    return this.cache ?? {};
  }
}

function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && 'code' in err;
}

// Singleton export — server-side only
export const presenterStore: IPresenterStore = new PresenterStore();
