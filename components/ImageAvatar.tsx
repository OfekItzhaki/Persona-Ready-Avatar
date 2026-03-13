'use client';

import { useState } from 'react';
import Image from 'next/image';

interface ImageAvatarProps {
  imageUrl?: string;
  agentName?: string;
  isSpeaking?: boolean;
  className?: string;
}

export function ImageAvatar({ 
  imageUrl, 
  agentName = 'AI Assistant',
  isSpeaking = false,
  className = '' 
}: ImageAvatarProps) {
  const [imageError, setImageError] = useState(false);

  // Default avatar if no image provided or error
  const defaultAvatar = (
    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
      <div className="text-white text-6xl font-bold">
        {agentName.charAt(0).toUpperCase()}
      </div>
    </div>
  );

  return (
    <div className={`relative ${className}`}>
      {/* Avatar Container */}
      <div 
        className={`
          w-full h-full rounded-full overflow-hidden border-4 
          ${isSpeaking ? 'border-green-500 animate-pulse' : 'border-gray-300'}
          transition-all duration-300
        `}
      >
        {imageUrl && !imageError ? (
          <Image
            src={imageUrl}
            alt={`${agentName} avatar`}
            fill
            className="object-cover"
            onError={() => setImageError(true)}
            priority
          />
        ) : (
          defaultAvatar
        )}
      </div>

      {/* Speaking Indicator */}
      {isSpeaking && (
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
          <div className="flex gap-1 bg-green-500 px-3 py-1 rounded-full">
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      )}

      {/* Agent Name */}
      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
        <p className="text-sm font-medium text-gray-700">{agentName}</p>
      </div>
    </div>
  );
}
