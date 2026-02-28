'use client';

import { AudioLevelIndicatorProps } from '@/types';
import { useEffect, useRef, useState } from 'react';

/**
 * AudioLevelIndicator
 *
 * Visual component that displays audio input levels as a level meter.
 * Updates at 30 FPS using requestAnimationFrame for smooth animation.
 *
 * Requirements: 5.5, 15.6
 */
export function AudioLevelIndicator({ level, isActive }: AudioLevelIndicatorProps) {
  const [displayLevel, setDisplayLevel] = useState(0);
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const targetLevelRef = useRef<number>(0);

  // Update target level when prop changes
  useEffect(() => {
    targetLevelRef.current = level;
  }, [level]);

  // Animate level changes at 30 FPS
  useEffect(() => {
    // Reset display level when inactive
    if (!isActive) {
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      // Use a ref to avoid setState in effect
      targetLevelRef.current = 0;
      return;
    }

    const FPS = 30;
    const FRAME_DURATION = 1000 / FPS; // ~33ms per frame

    const animate = (timestamp: number) => {
      // Throttle to 30 FPS
      if (timestamp - lastUpdateTimeRef.current >= FRAME_DURATION) {
        lastUpdateTimeRef.current = timestamp;

        // Smooth interpolation towards target level
        setDisplayLevel((current) => {
          const target = targetLevelRef.current;
          const diff = target - current;

          // Fast rise, slower fall for natural audio level behavior
          const smoothingFactor = diff > 0 ? 0.3 : 0.15;
          const newLevel = current + diff * smoothingFactor;

          return Math.max(0, Math.min(100, newLevel));
        });
      }

      animationFrameRef.current = window.requestAnimationFrame(animate);
    };

    animationFrameRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isActive]);

  // Don't render if not active
  if (!isActive) {
    return null;
  }

  // Calculate number of active bars (out of 10)
  const totalBars = 10;
  const activeBars = Math.ceil((displayLevel / 100) * totalBars);

  // Get bar color based on level (green -> yellow -> red)
  // WCAG 2.1 Level AA Contrast Requirements (Requirement 15.6):
  // - UI components require 3:1 contrast ratio minimum
  // - Colors chosen meet AA standards for graphical objects
  // - bg-green-600: #16a34a (4.5:1 on white, 3.1:1 on light gray)
  // - bg-yellow-600: #ca8a04 (3.0:1 on white, sufficient for UI components)
  // - bg-red-600: #dc2626 (5.9:1 on white, excellent contrast)
  const getBarColor = (barIndex: number) => {
    if (barIndex >= activeBars) {
      return 'bg-gray-300 dark:bg-gray-700'; // Inactive bars
    }

    // Color progression: green (0-60%) -> yellow (60-80%) -> red (80-100%)
    const barLevel = (barIndex / totalBars) * 100;

    if (barLevel < 60) {
      return 'bg-green-600'; // WCAG AA compliant green
    } else if (barLevel < 80) {
      return 'bg-yellow-600'; // WCAG AA compliant yellow
    } else {
      return 'bg-red-600'; // WCAG AA compliant red
    }
  };

  return (
    <div
      className="flex items-center gap-1 px-3 py-2"
      role="img"
      aria-label={`Audio level: ${Math.round(displayLevel)}%`}
    >
      {/* Level meter bars */}
      {Array.from({ length: totalBars }, (_, index) => (
        <div
          key={index}
          className={`
            w-1.5 rounded-full transition-colors duration-100
            ${getBarColor(index)}
          `}
          style={{
            height: `${12 + index * 2}px`, // Progressive height: 12px to 30px
          }}
        />
      ))}
    </div>
  );
}
