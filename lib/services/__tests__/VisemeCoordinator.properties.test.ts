import { describe, it, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { VisemeCoordinator } from '../VisemeCoordinator';
import { VISEME_BLENDSHAPE_MAP } from '@/types';
import type { VisemeEvent } from '@/types';
import * as THREE from 'three';

/**
 * Property-Based Tests for VisemeCoordinator (photorealistic-avatar spec)
 *
 * Validates: Requirements 10.3, 10.5
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal THREE.Mesh stub with a morphTargetDictionary and influences array */
function makeMesh(blendshapeNames: string[]): THREE.Mesh {
  const dict: Record<string, number> = {};
  blendshapeNames.forEach((name, i) => {
    dict[name] = i;
  });
  const influences = new Array(blendshapeNames.length).fill(0) as number[];

  return {
    morphTargetDictionary: dict,
    morphTargetInfluences: influences,
  } as unknown as THREE.Mesh;
}

/** All unique blendshape names used by VISEME_BLENDSHAPE_MAP */
const ALL_BLENDSHAPES = Array.from(new Set(Object.values(VISEME_BLENDSHAPE_MAP)));

/** fast-check arbitrary for a single VisemeEvent */
const visemeEventArb = fc.record({
  visemeId: fc.integer({ min: 0, max: 21 }),
  audioOffset: fc.integer({ min: 0, max: 5000 }),
  duration: fc.integer({ min: 50, max: 300 }),
});

/** fast-check arbitrary for a non-empty array of VisemeEvents */
const visemeArrayArb = fc.array(visemeEventArb, { minLength: 1, maxLength: 20 });

// ---------------------------------------------------------------------------
// Shared mock setup
// ---------------------------------------------------------------------------

let mockAudioContext: { currentTime: number };
let animationFrameCallbacks: FrameRequestCallback[];
let currentFrameId: number;

function setupMocks() {
  animationFrameCallbacks = [];
  currentFrameId = 0;

  global.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
    const id = ++currentFrameId;
    animationFrameCallbacks.push(cb);
    return id;
  });

  global.cancelAnimationFrame = vi.fn();

  mockAudioContext = { currentTime: 0 };
}

const mockAudioBuffer = {
  duration: 10.0,
  length: 441000,
  numberOfChannels: 1,
  sampleRate: 44100,
} as AudioBuffer;

// ---------------------------------------------------------------------------
// Property 10: VisemeCoordinator resets to neutral on stop
// ---------------------------------------------------------------------------

describe('Property 10: VisemeCoordinator resets to neutral on stop', () => {
  // Feature: photorealistic-avatar, Property 10: VisemeCoordinator resets to neutral on stop

  beforeEach(() => {
    setupMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('all morph target influences are 0 after stop(), for any VisemeEvent sequence', () => {
    // Feature: photorealistic-avatar, Property 10: VisemeCoordinator resets to neutral on stop
    fc.assert(
      fc.property(visemeArrayArb, (visemes: VisemeEvent[]) => {
        const coordinator = new VisemeCoordinator(mockAudioContext as AudioContext);
        const mesh = makeMesh(ALL_BLENDSHAPES);
        coordinator.setModel(mesh);

        // Start playback and advance to a mid-point so some blendshapes get set
        coordinator.start(mockAudioBuffer, visemes);

        // Advance time to the middle of the viseme sequence and trigger a frame
        const maxOffset = Math.max(...visemes.map((v: VisemeEvent) => v.audioOffset));
        mockAudioContext.currentTime = maxOffset / 2 / 1000;
        if (animationFrameCallbacks.length > 0) {
          animationFrameCallbacks[animationFrameCallbacks.length - 1](0);
        }

        // Stop — this should zero out all influences
        coordinator.stop();

        // Assert: every influence must be 0
        const allZero = (mesh.morphTargetInfluences as number[]).every((v) => v === 0);

        coordinator.dispose();
        return allZero;
      }),
      { numRuns: 100 }
    );
  });

  it('subscribeToVisemeChanges callback still fires after setModel is called', () => {
    // Feature: photorealistic-avatar, Property 10: VisemeCoordinator resets to neutral on stop
    fc.assert(
      fc.property(visemeArrayArb, (visemes: VisemeEvent[]) => {
        const coordinator = new VisemeCoordinator(mockAudioContext as AudioContext);
        const mesh = makeMesh(ALL_BLENDSHAPES);
        coordinator.setModel(mesh);

        const received: number[] = [];
        coordinator.subscribeToVisemeChanges((v) => received.push(v.visemeId));

        coordinator.start(mockAudioBuffer, visemes);
        mockAudioContext.currentTime = 0;
        if (animationFrameCallbacks.length > 0) {
          animationFrameCallbacks[animationFrameCallbacks.length - 1](0);
        }

        coordinator.stop();

        // At minimum the stop() reset to neutral (visemeId 0) should have been emitted
        const hasNeutral = received.includes(0);

        coordinator.dispose();
        return hasNeutral;
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 11: VisemeCoordinator confluence — scheduling order does not affect outcome
// ---------------------------------------------------------------------------

describe('Property 11: VisemeCoordinator confluence — scheduling order does not affect outcome', () => {
  // Feature: photorealistic-avatar, Property 11: VisemeCoordinator confluence — scheduling order does not affect outcome

  beforeEach(() => {
    setupMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Collect the sequence of blendshape influence snapshots produced by a coordinator
   * for a given viseme array, by stepping through each unique audioOffset.
   */
  function collectBlendshapeSequence(visemes: VisemeEvent[], mesh: THREE.Mesh): number[][] {
    const coordinator = new VisemeCoordinator(mockAudioContext as AudioContext);
    coordinator.setModel(mesh);
    coordinator.start(mockAudioBuffer, visemes);

    const snapshots: number[][] = [];

    // Step through each unique audioOffset in sorted order
    const sortedOffsets = Array.from(new Set(visemes.map((v) => v.audioOffset))).sort(
      (a, b) => a - b
    );

    for (const offset of sortedOffsets) {
      mockAudioContext.currentTime = offset / 1000;
      if (animationFrameCallbacks.length > 0) {
        animationFrameCallbacks[animationFrameCallbacks.length - 1](0);
      }
      // Snapshot the current influences
      snapshots.push([...(mesh.morphTargetInfluences as number[])]);
    }

    coordinator.stop();
    coordinator.dispose();
    return snapshots;
  }

  it('same blendshape sequence regardless of input order', () => {
    // Feature: photorealistic-avatar, Property 11: VisemeCoordinator confluence — scheduling order does not affect outcome
    fc.assert(
      fc.property(visemeArrayArb, (visemes: VisemeEvent[]) => {
        // Ensure all offsets are unique to make ordering unambiguous
        const uniqueOffsets = new Set<number>();
        const deduped = visemes.filter((v: VisemeEvent) => {
          if (uniqueOffsets.has(v.audioOffset)) return false;
          uniqueOffsets.add(v.audioOffset);
          return true;
        });

        if (deduped.length < 2) return true; // Not enough events to test ordering

        // Shuffle: reverse the array as a deterministic permutation
        const shuffled = [...deduped].reverse();

        // Run both orderings with fresh meshes
        const mesh1 = makeMesh(ALL_BLENDSHAPES);
        const mesh2 = makeMesh(ALL_BLENDSHAPES);

        // Reset animation frame state between runs
        animationFrameCallbacks = [];
        currentFrameId = 0;
        mockAudioContext.currentTime = 0;

        const seq1 = collectBlendshapeSequence(deduped, mesh1);

        animationFrameCallbacks = [];
        currentFrameId = 0;
        mockAudioContext.currentTime = 0;

        const seq2 = collectBlendshapeSequence(shuffled, mesh2);

        // Both sequences should be identical (coordinator sorts internally)
        return JSON.stringify(seq1) === JSON.stringify(seq2);
      }),
      { numRuns: 100 }
    );
  });
});
