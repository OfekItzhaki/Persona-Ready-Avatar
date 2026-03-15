'use client';

// Feature: photorealistic-avatar
// Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6

import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import ThinkingAnimator from '@/components/ThinkingAnimator';
import { logger } from '@/lib/logger';

interface TalkingHeadPlayerProps {
  presenterId: string;
  className?: string;
}

/**
 * TalkingHeadPlayer
 *
 * Renders a muted <video> element that plays D-ID lip-synced clips.
 * Audio comes from the TTS AudioManager, not the video track.
 *
 * - Shows ThinkingAnimator while playbackState === 'loading'
 * - Begins loading/playing within 500 ms of receiving a new didVideoUrl (Req 8.1)
 * - Mutes the video's own audio track (Req 8.4)
 * - On video end: sets playbackState to 'idle' (Req 8.3)
 * - On video error: shows grey fallback div, logs error, sets playbackState to 'idle' (Req 8.5)
 * - Supports MP4/H.264 (Req 8.6)
 */
export default function TalkingHeadPlayer({
  presenterId: _presenterId,
  className,
}: TalkingHeadPlayerProps) {
  const didVideoUrl = useAppStore((s) => s.didVideoUrl);
  const playbackState = useAppStore((s) => s.playbackState);
  const setPlaybackState = useAppStore((s) => s.setPlaybackState);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasError, setHasError] = useState(false);

  // Reset error state when URL changes, then load/play (Req 8.1)
  useEffect(() => {
    if (!didVideoUrl) return;

    const video = videoRef.current;
    if (!video) return;

    // Reset error before loading new URL
    if (hasError) setHasError(false);

    video.src = didVideoUrl;
    video.load();
    video.play().catch((err) => {
      logger.error('TalkingHeadPlayer: video.play() failed', { error: String(err) });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [didVideoUrl]);

  const handleEnded = () => {
    // Req 8.3: display last frame (video stays at end naturally); set state to idle
    setPlaybackState('idle');
  };

  const handleError = () => {
    // Req 8.5: log error, show fallback, set state to idle
    logger.error('TalkingHeadPlayer: video failed to load', { url: didVideoUrl ?? undefined });
    setHasError(true);
    setPlaybackState('idle');
  };

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100%',
  };

  // Show ThinkingAnimator while D-ID clip is generating (Req 7.1 / 8.1)
  if (playbackState === 'loading') {
    return (
      <div style={containerStyle} className={className}>
        <ThinkingAnimator />
      </div>
    );
  }

  // Show grey fallback on video load error (Req 8.5)
  if (hasError) {
    return (
      <div
        className={className}
        style={{
          ...containerStyle,
          backgroundColor: '#888',
        }}
        aria-label="Avatar unavailable"
      />
    );
  }

  return (
    <div style={containerStyle} className={className}>
      <video
        ref={videoRef}
        muted
        playsInline
        onEnded={handleEnded}
        onError={handleError}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </div>
  );
}
