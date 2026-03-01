import React from 'react';

export interface LoadingSkeletonProps {
  /**
   * Width of the skeleton (CSS value or 'full')
   */
  width?: string | 'full';
  
  /**
   * Height of the skeleton (CSS value)
   */
  height?: string;
  
  /**
   * Number of skeleton elements to render
   */
  count?: number;
  
  /**
   * Animation type
   */
  animation?: 'pulse' | 'wave' | 'shimmer';
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * Accessible label for screen readers
   */
  ariaLabel?: string;
  
  /**
   * Variant for specific use cases
   */
  variant?: 'default' | 'avatar' | 'text' | 'circle';
}

export function LoadingSkeleton({
  width = 'full',
  height = '1rem',
  count = 1,
  animation = 'shimmer',
  className = '',
  ariaLabel = 'Loading content',
  variant = 'default',
}: LoadingSkeletonProps) {
  // Check for prefers-reduced-motion
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false;

  const getAnimationClass = () => {
    if (prefersReducedMotion) {
      return ''; // No animation if user prefers reduced motion
    }
    
    switch (animation) {
      case 'pulse':
        return 'animate-pulse';
      case 'wave':
        return 'animate-wave';
      case 'shimmer':
        return 'animate-shimmer';
      default:
        return 'animate-shimmer';
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'avatar':
        return 'rounded-lg';
      case 'text':
        return 'rounded';
      case 'circle':
        return 'rounded-full';
      default:
        return 'rounded-md';
    }
  };

  const widthClass = width === 'full' ? 'w-full' : '';
  const widthStyle = width !== 'full' ? { width } : {};

  const skeletons = Array.from({ length: count }, (_, index) => (
    <div
      key={index}
      className={`
        relative overflow-hidden
        bg-gradient-to-br from-gray-200 to-gray-300
        dark:from-gray-700 dark:to-gray-800
        ${getVariantClasses()}
        ${widthClass}
        ${getAnimationClass()}
        ${className}
      `}
      style={{
        ...widthStyle,
        height,
      }}
      aria-busy="true"
      aria-label={ariaLabel}
      role="status"
    >
      {/* Shimmer overlay effect */}
      {!prefersReducedMotion && animation === 'shimmer' && (
        <div className="
          absolute inset-0
          bg-gradient-to-r from-transparent via-white/20 to-transparent
          dark:via-white/10
          animate-shimmer-slide
        " />
      )}
    </div>
  ));

  return count > 1 ? (
    <div className="space-y-3">
      {skeletons}
    </div>
  ) : (
    <>{skeletons}</>
  );
}

/**
 * Avatar-specific loading skeleton with preset dimensions
 */
export function AvatarLoadingSkeleton({
  className = '',
}: {
  className?: string;
}) {
  return (
    <LoadingSkeleton
      variant="avatar"
      width="full"
      height="600px"
      animation="shimmer"
      ariaLabel="Loading avatar"
      className={className}
    />
  );
}
