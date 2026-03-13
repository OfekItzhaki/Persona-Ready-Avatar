/**
 * Avatar Image Configuration
 * 
 * Map agent IDs to their avatar images.
 * You can use:
 * - Local images in /public folder (e.g., '/avatars/agent1.png')
 * - External URLs (e.g., 'https://example.com/avatar.jpg')
 * - AI-generated images from services like:
 *   - https://thispersondoesnotexist.com/
 *   - https://generated.photos/
 *   - Midjourney, DALL-E, Stable Diffusion
 */

export interface AvatarConfig {
  [agentId: string]: {
    imageUrl?: string;
    name?: string;
  };
}

export const avatarConfig: AvatarConfig = {
  // Example configurations:
  
  // Agent 1 - Using local image
  // 'agent-1': {
  //   imageUrl: '/avatars/agent1.png',
  //   name: 'Sarah'
  // },
  
  // Agent 2 - Using external URL
  // 'agent-2': {
  //   imageUrl: 'https://example.com/avatar2.jpg',
  //   name: 'Alex'
  // },
  
  // Default - no image, will show letter avatar
  default: {
    imageUrl: undefined,
    name: 'AI Assistant'
  }
};

/**
 * Get avatar configuration for an agent
 */
export function getAvatarConfig(agentId?: string) {
  if (!agentId) return avatarConfig.default;
  return avatarConfig[agentId] || avatarConfig.default;
}
