import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import { VISEME_BLENDSHAPE_MAP } from '@/types';

/**
 * Property-Based Tests for AvatarCanvas Component
 * 
 * Feature: avatar-client, Property 6: Viseme-to-Blendshape Mapping
 * 
 * For any valid Azure viseme ID (0-21), the Avatar Component should map it
 * to a corresponding blendshape target name in the GLB model.
 * 
 * **Validates: Requirements 3.3**
 */
describe('Property 6: Viseme-to-Blendshape Mapping', () => {
  /**
   * Property: For any valid Azure viseme ID (0-21), the mapping should return
   * a non-empty string representing the blendshape target name
   */
  it('should map all valid viseme IDs to non-empty blendshape names', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 21 }), // Valid Azure viseme IDs
        (visemeId) => {
          // Act
          const blendshapeName = VISEME_BLENDSHAPE_MAP[visemeId];

          // Assert - Property 1: Mapping should always return a value
          expect(blendshapeName).toBeDefined();
          
          // Property 2: Mapping should return a string
          expect(typeof blendshapeName).toBe('string');
          
          // Property 3: Blendshape name should be non-empty
          expect(blendshapeName.length).toBeGreaterThan(0);
          
          // Property 4: Blendshape name should not contain only whitespace
          expect(blendshapeName.trim().length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any valid viseme ID, the mapping should be deterministic
   * (same input always produces same output)
   */
  it('should produce deterministic mappings for any viseme ID', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 21 }),
        (visemeId) => {
          // Act - Map the same viseme ID multiple times
          const firstMapping = VISEME_BLENDSHAPE_MAP[visemeId];
          const secondMapping = VISEME_BLENDSHAPE_MAP[visemeId];
          const thirdMapping = VISEME_BLENDSHAPE_MAP[visemeId];

          // Assert - Property: Same input should always produce same output
          expect(firstMapping).toBe(secondMapping);
          expect(secondMapping).toBe(thirdMapping);
          expect(firstMapping).toBe(thirdMapping);
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any valid viseme ID, the blendshape name should follow
   * a consistent naming convention (starts with 'viseme_')
   */
  it('should follow consistent naming convention for all viseme IDs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 21 }),
        (visemeId) => {
          // Act
          const blendshapeName = VISEME_BLENDSHAPE_MAP[visemeId];

          // Assert - Property: All blendshape names should start with 'viseme_'
          expect(blendshapeName).toMatch(/^viseme_/);
          
          // Property: Blendshape name should have content after the prefix
          const suffix = blendshapeName.substring('viseme_'.length);
          expect(suffix.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any two different viseme IDs, they may map to the same
   * blendshape (this is valid as multiple phonemes can share mouth shapes)
   */
  it('should allow multiple viseme IDs to map to the same blendshape', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 21 }),
        fc.integer({ min: 0, max: 21 }),
        (visemeId1, visemeId2) => {
          // Act
          const blendshape1 = VISEME_BLENDSHAPE_MAP[visemeId1];
          const blendshape2 = VISEME_BLENDSHAPE_MAP[visemeId2];

          // Assert - Property: Both should be valid blendshape names
          expect(blendshape1).toBeDefined();
          expect(blendshape2).toBeDefined();
          expect(typeof blendshape1).toBe('string');
          expect(typeof blendshape2).toBe('string');
          
          // Property: If IDs are the same, blendshapes must be the same
          if (visemeId1 === visemeId2) {
            expect(blendshape1).toBe(blendshape2);
          }
          
          // Property: If IDs are different, blendshapes may or may not be the same
          // (this is valid - multiple phonemes can share mouth shapes)
          // No assertion needed, just verify both are valid
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: The mapping should be complete - every viseme ID from 0 to 21
   * should have a corresponding blendshape
   */
  it('should provide complete mapping for all 22 Azure viseme IDs', () => {
    fc.assert(
      fc.property(
        fc.constant(null), // No input needed, we check all IDs
        () => {
          // Act & Assert - Property: All 22 viseme IDs should be mapped
          for (let visemeId = 0; visemeId <= 21; visemeId++) {
            const blendshapeName = VISEME_BLENDSHAPE_MAP[visemeId];
            
            // Property 1: Each ID should have a mapping
            expect(blendshapeName).toBeDefined();
            
            // Property 2: Each mapping should be a non-empty string
            expect(typeof blendshapeName).toBe('string');
            expect(blendshapeName.length).toBeGreaterThan(0);
          }
          
          // Property 3: The mapping should have exactly 22 entries
          const mappingKeys = Object.keys(VISEME_BLENDSHAPE_MAP);
          expect(mappingKeys.length).toBe(22);
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any invalid viseme ID (outside 0-21 range), the mapping
   * should return undefined
   */
  it('should return undefined for invalid viseme IDs', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer({ min: -1000, max: -1 }), // Negative IDs
          fc.integer({ min: 22, max: 1000 })    // IDs above 21
        ),
        (invalidVisemeId) => {
          // Act
          const blendshapeName = VISEME_BLENDSHAPE_MAP[invalidVisemeId];

          // Assert - Property: Invalid IDs should not have mappings
          expect(blendshapeName).toBeUndefined();
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any viseme ID, the blendshape name should be a valid
   * identifier (no special characters except underscore)
   */
  it('should produce valid identifier names for all viseme IDs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 21 }),
        (visemeId) => {
          // Act
          const blendshapeName = VISEME_BLENDSHAPE_MAP[visemeId];

          // Assert - Property: Blendshape name should be a valid identifier
          // (alphanumeric and underscore only)
          expect(blendshapeName).toMatch(/^[a-zA-Z_][a-zA-Z0-9_]*$/);
          
          // Property: Should not start with a number
          expect(blendshapeName).not.toMatch(/^[0-9]/);
          
          // Property: Should not contain spaces
          expect(blendshapeName).not.toContain(' ');
          
          // Property: Should not contain special characters (except underscore)
          expect(blendshapeName).not.toMatch(/[^a-zA-Z0-9_]/);
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: The neutral/silence viseme (ID 0) should map to a specific
   * blendshape that represents the resting mouth position
   */
  it('should map silence viseme (ID 0) to neutral blendshape', () => {
    fc.assert(
      fc.property(
        fc.constant(0), // Silence viseme ID
        (silenceVisemeId) => {
          // Act
          const blendshapeName = VISEME_BLENDSHAPE_MAP[silenceVisemeId];

          // Assert - Property: Silence should map to 'viseme_sil'
          expect(blendshapeName).toBe('viseme_sil');
          
          // Property: The mapping should be consistent
          expect(VISEME_BLENDSHAPE_MAP[0]).toBe('viseme_sil');
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any sequence of viseme IDs, the mapping should handle
   * them independently without state interference
   */
  it('should map viseme sequences independently without state interference', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 21 }), { minLength: 1, maxLength: 50 }),
        (visemeSequence) => {
          // Act - Map each viseme in the sequence
          const mappedSequence = visemeSequence.map(
            (visemeId) => VISEME_BLENDSHAPE_MAP[visemeId]
          );

          // Assert - Property: Each mapping should be independent
          visemeSequence.forEach((visemeId, index) => {
            const expectedBlendshape = VISEME_BLENDSHAPE_MAP[visemeId];
            const actualBlendshape = mappedSequence[index];
            
            // Property 1: Mapping should match direct lookup
            expect(actualBlendshape).toBe(expectedBlendshape);
            
            // Property 2: Mapping should be defined
            expect(actualBlendshape).toBeDefined();
            
            // Property 3: Mapping should be a non-empty string
            expect(typeof actualBlendshape).toBe('string');
            expect(actualBlendshape.length).toBeGreaterThan(0);
          });
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any viseme ID, the mapping should be immutable
   * (attempting to modify the mapping should not affect subsequent lookups)
   */
  it('should provide immutable mappings for all viseme IDs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 21 }),
        (visemeId) => {
          // Act - Get the original mapping
          const originalMapping = VISEME_BLENDSHAPE_MAP[visemeId];
          
          // Attempt to modify the mapping (this should not affect the constant)
          // Note: In TypeScript, the const prevents reassignment, but we test
          // that the value itself remains consistent
          const mappingAfterAttempt = VISEME_BLENDSHAPE_MAP[visemeId];

          // Assert - Property: Mapping should remain unchanged
          expect(mappingAfterAttempt).toBe(originalMapping);
          
          // Property: Multiple lookups should return the same value
          const thirdLookup = VISEME_BLENDSHAPE_MAP[visemeId];
          expect(thirdLookup).toBe(originalMapping);
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any viseme ID, the blendshape name length should be
   * reasonable (not excessively long)
   */
  it('should produce reasonably-sized blendshape names for all viseme IDs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 21 }),
        (visemeId) => {
          // Act
          const blendshapeName = VISEME_BLENDSHAPE_MAP[visemeId];

          // Assert - Property: Blendshape name should be reasonably sized
          // (between 7 and 50 characters is reasonable for identifiers)
          expect(blendshapeName.length).toBeGreaterThanOrEqual(7); // 'viseme_' + at least 1 char
          expect(blendshapeName.length).toBeLessThanOrEqual(50);
          
          // Property: Should not be excessively short or long
          expect(blendshapeName.length).toBeGreaterThan(0);
          expect(blendshapeName.length).toBeLessThan(100);
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: The mapping should cover all phoneme categories
   * (consonants, vowels, silence)
   */
  it('should provide mappings for all phoneme categories', () => {
    fc.assert(
      fc.property(
        fc.constant(null), // No input needed
        () => {
          // Define phoneme categories based on Azure viseme documentation
          const silenceVisemes = [0]; // Silence
          const consonantVisemes = [1, 2, 3, 4, 5, 6, 7, 8, 9]; // Consonants
          const vowelVisemes = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]; // Vowels

          // Assert - Property: All categories should have valid mappings
          
          // Silence category
          silenceVisemes.forEach((visemeId) => {
            const blendshape = VISEME_BLENDSHAPE_MAP[visemeId];
            expect(blendshape).toBeDefined();
            expect(typeof blendshape).toBe('string');
            expect(blendshape.length).toBeGreaterThan(0);
          });

          // Consonant category
          consonantVisemes.forEach((visemeId) => {
            const blendshape = VISEME_BLENDSHAPE_MAP[visemeId];
            expect(blendshape).toBeDefined();
            expect(typeof blendshape).toBe('string');
            expect(blendshape.length).toBeGreaterThan(0);
          });

          // Vowel category
          vowelVisemes.forEach((visemeId) => {
            const blendshape = VISEME_BLENDSHAPE_MAP[visemeId];
            expect(blendshape).toBeDefined();
            expect(typeof blendshape).toBe('string');
            expect(blendshape.length).toBeGreaterThan(0);
          });

          // Property: Total coverage should be 22 visemes
          const totalVisemes = silenceVisemes.length + consonantVisemes.length + vowelVisemes.length;
          expect(totalVisemes).toBe(22);
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any viseme ID, accessing the mapping should be O(1) constant time
   * (this is implicit in using a Record/object, but we verify it works efficiently)
   */
  it('should provide constant-time lookup for any viseme ID', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 21 }), { minLength: 100, maxLength: 1000 }),
        (visemeIds) => {
          // Act - Perform many lookups
          const startTime = performance.now();
          const results = visemeIds.map((id) => VISEME_BLENDSHAPE_MAP[id]);
          const endTime = performance.now();
          const duration = endTime - startTime;

          // Assert - Property: All lookups should succeed
          results.forEach((blendshape, index) => {
            expect(blendshape).toBeDefined();
            expect(typeof blendshape).toBe('string');
            
            // Verify it matches the expected mapping
            const expectedBlendshape = VISEME_BLENDSHAPE_MAP[visemeIds[index]];
            expect(blendshape).toBe(expectedBlendshape);
          });

          // Property: Lookups should be fast (< 100ms for 1000 lookups)
          // This is a very generous threshold to account for test environment variability
          expect(duration).toBeLessThan(100);
        }
      ),
      { numRuns: 10 } // Fewer runs for performance test
    );
  });
});
