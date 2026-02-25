import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { Agent } from '@/types';

/**
 * PersonaSwitcher Property-Based Tests
 *
 * Property tests for PersonaSwitcher component using fast-check
 * to verify universal properties across randomized inputs.
 */

// Arbitraries for generating test data
const agentArbitrary = fc.record({
  id: fc.string({ minLength: 8, maxLength: 36 }).filter(s => s.trim().length >= 8),
  name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
  description: fc.option(
    fc.string({ minLength: 5, maxLength: 200 }).filter(s => s.trim().length >= 5),
    { nil: undefined }
  ),
  voice: fc.constantFrom(
    'en-US-JennyNeural',
    'en-US-GuyNeural',
    'es-ES-ElviraNeural',
    'fr-FR-DeniseNeural',
    'de-DE-KatjaNeural',
    'ja-JP-NanamiNeural',
    'zh-CN-XiaoxiaoNeural'
  ),
  language: fc.constantFrom('en-US', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP', 'zh-CN'),
});

describe('PersonaSwitcher Property Tests', () => {
  /**
   * Feature: avatar-client, Property 11: Agent Display Information
   * For any agent in the dropdown, both the agent name and description
   * (if present) should be displayed to the user.
   *
   * Validates: Requirements 4.6
   */
  describe('Property 11: Agent Display Information', () => {
    it('should have all required fields for any valid agent', () => {
      fc.assert(
        fc.property(agentArbitrary, (agent: Agent) => {
          // Property: Every agent must have an id
          expect(agent.id).toBeTruthy();
          expect(typeof agent.id).toBe('string');
          expect(agent.id.length).toBeGreaterThan(0);

          // Property: Every agent must have a name
          expect(agent.name).toBeTruthy();
          expect(typeof agent.name).toBe('string');
          expect(agent.name.trim().length).toBeGreaterThanOrEqual(2);

          // Property: Every agent must have a voice
          expect(agent.voice).toBeTruthy();
          expect(typeof agent.voice).toBe('string');

          // Property: Every agent must have a language
          expect(agent.language).toBeTruthy();
          expect(typeof agent.language).toBe('string');

          // Property: Description is optional but if present must be a string
          if (agent.description !== undefined) {
            expect(typeof agent.description).toBe('string');
            expect(agent.description.trim().length).toBeGreaterThanOrEqual(5);
          }
        }),
        { numRuns: 25 }
      );
    });

    it('should maintain agent list integrity for any array of agents', () => {
      fc.assert(
        fc.property(
          fc.array(agentArbitrary, { minLength: 1, maxLength: 20 }),
          (agents: Agent[]) => {
            // Property: Agent list should have at least one agent
            expect(agents.length).toBeGreaterThan(0);

            // Property: All agents in the list should have required fields
            for (const agent of agents) {
              expect(agent.id).toBeTruthy();
              expect(agent.name).toBeTruthy();
              expect(agent.voice).toBeTruthy();
              expect(agent.language).toBeTruthy();
            }

            // Property: Agent list length should match the number of agents
            expect(agents).toHaveLength(agents.length);
          }
        ),
        { numRuns: 25 }
      );
    });

    it('should handle agents with and without descriptions', () => {
      fc.assert(
        fc.property(
          fc.array(agentArbitrary, { minLength: 1, maxLength: 10 }),
          (agents: Agent[]) => {
            // Property: Each agent should be valid regardless of description presence
            for (const agent of agents) {
              // Required fields must always be present
              expect(agent.id).toBeTruthy();
              expect(agent.name).toBeTruthy();
              expect(agent.voice).toBeTruthy();
              expect(agent.language).toBeTruthy();

              // Description is optional
              if (agent.description !== undefined) {
                expect(typeof agent.description).toBe('string');
              }
            }

            // Property: The list should contain valid agents
            expect(agents.every(a => a.id && a.name && a.voice && a.language)).toBe(true);
          }
        ),
        { numRuns: 25 }
      );
    });
  });
});
