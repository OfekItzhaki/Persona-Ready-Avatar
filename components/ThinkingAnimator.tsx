'use client';

// Feature: photorealistic-avatar
// Requirements: 7.1, 7.2, 7.3, 7.4, 7.5

interface ThinkingAnimatorProps {
  /** When provided and the component is in fallback mode, display this image instead of the animation */
  fallbackImageUrl?: string;
  className?: string;
}

/**
 * ThinkingAnimator
 *
 * Displays a looping CSS-driven "thinking" animation (three pulsing dots)
 * while D-ID is generating a video clip. CSS animations run on the
 * compositor thread and never block audio playback or UI interaction.
 *
 * When `fallbackImageUrl` is provided the component is considered to be in
 * "fallback mode" and renders the static image instead of the animation.
 * By default (no fallbackImageUrl) the animation plays continuously.
 *
 * Minimum frame rate: CSS animations are driven by the browser's compositor
 * at the display refresh rate (≥ 60 FPS on modern hardware, well above the
 * 24 FPS minimum required by Requirement 7.5).
 */
export default function ThinkingAnimator({ fallbackImageUrl, className }: ThinkingAnimatorProps) {
  // Fallback mode: show static image instead of animation (Requirement 7.3)
  if (fallbackImageUrl) {
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
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fallbackImageUrl}
          alt="Avatar"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    );
  }

  // Animation mode: three pulsing dots (Requirements 7.1, 7.4, 7.5)
  return (
    <>
      {/* Keyframe styles injected once via a <style> tag — no external CSS file needed */}
      <style>{`
        @keyframes thinking-pulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40%            { transform: scale(1.0); opacity: 1.0; }
        }
        .thinking-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background-color: currentColor;
          animation: thinking-pulse 1.2s ease-in-out infinite;
        }
        .thinking-dot:nth-child(1) { animation-delay: 0s;    }
        .thinking-dot:nth-child(2) { animation-delay: 0.2s;  }
        .thinking-dot:nth-child(3) { animation-delay: 0.4s;  }
      `}</style>

      <div
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          width: '100%',
          height: '100%',
          color: '#888',
        }}
        aria-label="Thinking…"
        role="status"
      >
        <span className="thinking-dot" />
        <span className="thinking-dot" />
        <span className="thinking-dot" />
      </div>
    </>
  );
}
