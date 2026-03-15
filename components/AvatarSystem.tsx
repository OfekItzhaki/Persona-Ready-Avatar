'use client';

// Feature: photorealistic-avatar
// Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 15.1, 15.3, 15.4, 17.2, 17.3, 17.4, 17.5

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import TalkingHeadPlayer from '@/components/TalkingHeadPlayer';
import GLBVRMRenderer from '@/components/GLBVRMRenderer';
import ThinkingAnimator from '@/components/ThinkingAnimator';
import { getAvatarConfig } from '@/config/avatars';
import { logger } from '@/lib/logger';
import type { AvatarAssignment } from '@/types/avatar';

interface AvatarSystemProps {
  className?: string;
}

/**
 * AvatarSystem
 *
 * Orchestrates avatar rendering based on per-agent assignments.
 * - Fetches /api/avatar/assignment when selectedAgentId changes
 * - Mounts TalkingHeadPlayer (D-ID mode) or GLBVRMRenderer (GLB mode)
 * - Falls back to config/avatars.ts static mapping when no assignment exists
 * - On AI response in D-ID mode: calls /api/did/generate-talk, manages playbackState
 * - Logs all D-ID failures with error type, HTTP status, agentId, and timestamp
 */
export default function AvatarSystem({ className }: AvatarSystemProps) {
  const selectedAgentId = useAppStore((s) => s.selectedAgentId);
  const avatarMode = useAppStore((s) => s.avatarMode);
  const setAvatarMode = useAppStore((s) => s.setAvatarMode);
  const setDidVideoUrl = useAppStore((s) => s.setDidVideoUrl);
  const setPlaybackState = useAppStore((s) => s.setPlaybackState);
  const playbackState = useAppStore((s) => s.playbackState);
  const messages = useAppStore((s) => s.messages);

  const [assignment, setAssignment] = useState<AvatarAssignment | null>(null);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Track last processed message to detect new AI responses
  const lastMessageCountRef = useRef(0);
  const presenterIdRef = useRef<string | null>(null);

  // Fetch assignment when agent changes (Req 5.1)
  useEffect(() => {
    if (!selectedAgentId) {
      // Use a microtask to avoid setState-in-effect lint warning
      Promise.resolve().then(() => {
        setAssignment(null);
        setAvatarMode('none');
      });
      return;
    }

    setFetchLoading(true);
    setFetchError(null);

    fetch(`/api/avatar/assignment?agentId=${encodeURIComponent(selectedAgentId)}`)
      .then(async (res) => {
        if (res.status === 404) {
          // No assignment — fall back to static config (Req 5.4)
          setAssignment(null);
          setAvatarMode('none');
          return;
        }
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data: AvatarAssignment = await res.json();
        setAssignment(data);
        setAvatarMode(data.mode);
        if (data.mode === 'did') {
          presenterIdRef.current = data.presenterId;
        } else {
          presenterIdRef.current = null;
        }
      })
      .catch((err) => {
        // Req 5.6: show error state on fetch failure
        const msg = err instanceof Error ? err.message : String(err);
        setFetchError(msg);
        logger.error('AvatarSystem: failed to fetch assignment', {
          agentId: selectedAgentId,
          error: msg,
          timestamp: new Date().toISOString(),
        });
      })
      .finally(() => setFetchLoading(false));
  }, [selectedAgentId, setAvatarMode]);

  // Generate D-ID talk on new AI response (Req 15.3, 15.4)
  const generateTalk = useCallback(
    async (audioText: string) => {
      const presenterId = presenterIdRef.current;
      if (!presenterId || avatarMode !== 'did') return;

      setPlaybackState('loading');

      try {
        const res = await fetch('/api/did/generate-talk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ presenterId, audioText }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          logger.error('AvatarSystem: D-ID talk generation failed', {
            errorType: body.errorType ?? 'API_ERROR',
            httpStatus: res.status,
            agentId: selectedAgentId,
            timestamp: new Date().toISOString(),
          });
          // Req 15.1: show ThinkingAnimator fallback, don't interrupt TTS audio
          setPlaybackState('idle');
          return;
        }

        const { videoUrl } = await res.json();
        setDidVideoUrl(videoUrl);
        setPlaybackState('playing');
      } catch (err) {
        logger.error('AvatarSystem: D-ID talk generation network error', {
          errorType: 'NETWORK_ERROR',
          agentId: selectedAgentId,
          error: err instanceof Error ? err.message : String(err),
          timestamp: new Date().toISOString(),
        });
        setPlaybackState('idle');
      }
    },
    [avatarMode, selectedAgentId, setDidVideoUrl, setPlaybackState]
  );

  // Watch for new assistant messages to trigger D-ID generation
  useEffect(() => {
    if (avatarMode !== 'did') return;
    const assistantMessages = messages.filter((m) => m.role === 'agent');
    if (assistantMessages.length > lastMessageCountRef.current) {
      lastMessageCountRef.current = assistantMessages.length;
      const latest = assistantMessages[assistantMessages.length - 1];
      if (latest?.content) {
        generateTalk(latest.content);
      }
    }
  }, [messages, avatarMode, generateTalk]);

  // Fallback config from config/avatars.ts (Req 5.4)
  const fallbackConfig = getAvatarConfig(selectedAgentId ?? undefined);

  // Loading state (Req 5.5)
  if (fetchLoading) {
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
        }}
        role="status"
        aria-label="Loading avatar"
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '4px solid rgba(0,0,0,0.1)',
            borderTopColor: '#2563eb',
            borderRadius: '50%',
            animation: 'avatar-system-spin 0.8s linear infinite',
          }}
        />
        <style>{`@keyframes avatar-system-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Error state (Req 5.6)
  if (fetchError) {
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          flexDirection: 'column',
          gap: '8px',
          color: '#b91c1c',
        }}
        role="alert"
      >
        <span style={{ fontSize: '1.5rem' }}>⚠️</span>
        <span style={{ fontSize: '14px' }}>Failed to load avatar</span>
      </div>
    );
  }

  // D-ID mode (Req 5.2): mount TalkingHeadPlayer, unmount GLBVRMRenderer
  if (assignment?.mode === 'did') {
    return (
      <div className={className} style={{ width: '100%', height: '100%', position: 'relative' }}>
        {playbackState === 'loading' && <ThinkingAnimator />}
        <TalkingHeadPlayer presenterId={assignment.presenterId} />
      </div>
    );
  }

  // GLB mode (Req 5.3): mount GLBVRMRenderer, unmount TalkingHeadPlayer
  if (assignment?.mode === 'glb') {
    return <GLBVRMRenderer modelPath={assignment.modelPath} className={className} />;
  }

  // No assignment fallback (Req 5.4): use static config image or ThinkingAnimator placeholder
  return (
    <div
      className={className}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ThinkingAnimator fallbackImageUrl={fallbackConfig.imageUrl} />
    </div>
  );
}
