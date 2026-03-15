import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';

// Mock logger to avoid noise in test output
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

import TalkingHeadPlayer from '../TalkingHeadPlayer';
import { useAppStore } from '@/lib/store/useAppStore';

/**
 * TalkingHeadPlayer Unit Tests
 *
 * Covers:
 * - Shows ThinkingAnimator when playbackState === 'loading' (Req 7.1)
 * - Video audio track is muted (Req 8.4)
 * - Displays static fallback on video load failure (Req 8.5)
 */

function resetStore(overrides: Partial<Parameters<typeof useAppStore.setState>[0]> = {}) {
  useAppStore.setState({
    playbackState: 'idle',
    didVideoUrl: null,
    avatarMode: 'did',
    ...overrides,
  });
}

describe('TalkingHeadPlayer', () => {
  beforeEach(() => {
    resetStore();
    // Provide a minimal HTMLVideoElement.play stub (jsdom doesn't implement it)
    window.HTMLVideoElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLVideoElement.prototype.load = vi.fn();
  });

  // Requirement 7.1 / 8.1: show ThinkingAnimator while loading
  it('shows ThinkingAnimator when playbackState is loading', () => {
    resetStore({ playbackState: 'loading' });
    render(<TalkingHeadPlayer presenterId="prs_test" />);

    // ThinkingAnimator renders an aria-label="Thinking…" element
    expect(screen.getByRole('status', { name: /thinking/i })).toBeInTheDocument();
    // No video element should be rendered
    expect(screen.queryByRole('video')).not.toBeInTheDocument();
  });

  // Requirement 8.4: video must be muted
  it('renders a muted video element when not loading', () => {
    resetStore({ playbackState: 'idle', didVideoUrl: 'https://example.com/video.mp4' });
    render(<TalkingHeadPlayer presenterId="prs_test" />);

    const video = document.querySelector('video');
    expect(video).not.toBeNull();
    expect(video!.muted).toBe(true);
  });

  // Requirement 8.5: display fallback and set idle on video error
  it('displays grey fallback div and sets playbackState to idle on video error', async () => {
    resetStore({ playbackState: 'idle', didVideoUrl: 'https://example.com/video.mp4' });
    render(<TalkingHeadPlayer presenterId="prs_test" />);

    const video = document.querySelector('video')!;
    expect(video).not.toBeNull();

    await act(async () => {
      fireEvent.error(video);
    });

    // Video should be gone, fallback div should appear
    expect(document.querySelector('video')).toBeNull();
    expect(screen.getByLabelText('Avatar unavailable')).toBeInTheDocument();

    // playbackState should be set to 'idle'
    expect(useAppStore.getState().playbackState).toBe('idle');
  });

  // Requirement 8.3: on video end, set playbackState to idle
  it('sets playbackState to idle when video ends', async () => {
    resetStore({ playbackState: 'playing', didVideoUrl: 'https://example.com/video.mp4' });
    render(<TalkingHeadPlayer presenterId="prs_test" />);

    const video = document.querySelector('video')!;
    await act(async () => {
      fireEvent.ended(video);
    });

    expect(useAppStore.getState().playbackState).toBe('idle');
  });
});
