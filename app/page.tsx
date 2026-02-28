'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { ChatInterface } from '@/components/ChatInterface';
import { PersonaSwitcher } from '@/components/PersonaSwitcher';
import { TranscriptDisplay } from '@/components/TranscriptDisplay';
import { NotificationToast } from '@/components/NotificationToast';
import { SkipLinks } from '@/components/SkipLinks';
import {
  ErrorBoundary,
  AvatarCanvasErrorBoundary,
  ChatInterfaceErrorBoundary,
  PersonaSwitcherErrorBoundary,
} from '@/components/ErrorBoundary';
import { useAppStore } from '@/lib/store/useAppStore';
import { useAgents } from '@/lib/hooks/useReactQuery';
import { TTSService } from '@/lib/services/TTSService';
import { AzureSpeechRepository } from '@/lib/repositories/AzureSpeechRepository';
import { AudioManager } from '@/lib/services/AudioManager';
import { VisemeCoordinator } from '@/lib/services/VisemeCoordinator';
import { LanguageVoiceMapper } from '@/lib/services/LanguageVoiceMapper';
import { preloadAvatarModel } from '@/components/AvatarCanvas';
import { initializeFocusIndicators } from '@/lib/utils/focusIndicators';
import { logger } from '@/lib/logger';
import type { Agent } from '@/types';

// Dynamically import AvatarCanvas to avoid SSR issues with Three.js
const AvatarCanvas = dynamic(() => import('@/components/AvatarCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading 3D renderer...</p>
      </div>
    </div>
  ),
});

/**
 * Home Page Component
 * 
 * Main application layout with responsive design.
 * Integrates all components and services with dependency injection.
 * 
 * Features:
 * - Responsive layout (desktop ≥1024px, mobile <1024px) (Requirement 12.1-12.3)
 * - Service initialization with dependency injection (Requirement 20)
 * - GLB model preloading (Requirement 11.5)
 * - Error boundaries for component isolation (Requirement 10.6)
 * - WCAG AA color contrast compliance (Requirement 13.5)
 * 
 * Requirements: 12.1-12.5, 13.5, 4.3, 5.6, 11.5
 */
export default function Home() {
  const [ttsService, setTtsService] = useState<TTSService | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const selectedAgentId = useAppStore((state) => state.selectedAgentId);
  const { data: agents } = useAgents();
  const selectedAgent = agents?.find((agent: Agent) => agent.id === selectedAgentId) || null;

  // Model URL - replace with actual model path
  const modelUrl = '/models/avatar.glb';

  const setCurrentViseme = useAppStore((state) => state.setCurrentViseme);
  const setPlaybackState = useAppStore((state) => state.setPlaybackState);

  /**
   * Initialize focus indicators for keyboard navigation (Requirement 35.2)
   */
  useEffect(() => {
    initializeFocusIndicators();
  }, []);

  /**
   * Initialize services with dependency injection
   * Requirements: 4.3, 5.6, 11.5
   */
  useEffect(() => {
    logger.info('Initializing application services', {
      component: 'Home',
    });

    try {
      // Initialize repositories
      const azureSpeechRepository = new AzureSpeechRepository();
      
      // Initialize services
      const audioManager = new AudioManager();
      const visemeCoordinator = new VisemeCoordinator();
      const languageVoiceMapper = new LanguageVoiceMapper();
      
      // Connect VisemeCoordinator to Zustand store (Requirement 20)
      // Subscribe to viseme changes and update store
      const unsubscribeViseme = visemeCoordinator.subscribeToVisemeChanges((viseme) => {
        setCurrentViseme(viseme);
      });

      // Connect AudioManager to Zustand store
      // Subscribe to playback state changes and update store
      const unsubscribePlayback = audioManager.subscribeToPlaybackState((state) => {
        setPlaybackState(state);
      });
      
      // Initialize TTS Service with dependency injection
      const tts = new TTSService(
        azureSpeechRepository,
        audioManager,
        visemeCoordinator,
        languageVoiceMapper
      );

      setTtsService(tts);

      // Preload GLB model for better performance (Requirement 11.5)
      preloadAvatarModel(modelUrl);

      setIsInitialized(true);

      logger.info('Application services initialized successfully', {
        component: 'Home',
      });

      // Cleanup on unmount
      return () => {
        logger.info('Cleaning up application services', {
          component: 'Home',
        });
        
        // Unsubscribe from events
        unsubscribeViseme();
        unsubscribePlayback();
        
        // Dispose services
        tts.dispose();
        audioManager.dispose();
        visemeCoordinator.dispose();
      };
    } catch (error) {
      logger.error('Failed to initialize application services', {
        component: 'Home',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [modelUrl, setCurrentViseme, setPlaybackState]);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Initializing Avatar Client...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary componentName="RootApp">
      {/* Skip Links for keyboard navigation (Requirement 35.8) */}
      <SkipLinks />
      
      <main id="main-content" className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Avatar Client</h1>
                <p className="text-sm text-gray-600 mt-1">
                  3D animated avatar interface for conversational AI
                </p>
              </div>
              
              {/* Agent Selector - Desktop */}
              <div id="agent-selector" className="hidden lg:block">
                <PersonaSwitcherErrorBoundary>
                  <PersonaSwitcher />
                </PersonaSwitcherErrorBoundary>
              </div>
            </div>

            {/* Agent Selector - Mobile */}
            <div className="lg:hidden mt-4">
              <PersonaSwitcherErrorBoundary>
                <PersonaSwitcher />
              </PersonaSwitcherErrorBoundary>
            </div>
          </div>
        </header>

        {/* Main Content - Responsive Layout */}
        {/* Desktop (≥1024px): 3-column grid layout */}
        {/* Mobile (<1024px): Vertical stack */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* 3D Avatar Viewport */}
            <div className="lg:col-span-7">
              <div id="avatar-canvas" className="bg-white rounded-lg shadow-lg overflow-hidden h-[400px] lg:h-[600px]">
                <AvatarCanvasErrorBoundary>
                  <AvatarCanvas modelUrl={modelUrl} className="w-full h-full" />
                </AvatarCanvasErrorBoundary>
              </div>

              {/* Transcript Display - Below Avatar on Mobile, Hidden on Desktop */}
              <div className="lg:hidden mt-6">
                <div className="bg-white rounded-lg shadow-lg p-4 h-[200px]">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">Transcript</h2>
                  <ErrorBoundary componentName="TranscriptDisplay">
                    <TranscriptDisplay />
                  </ErrorBoundary>
                </div>
              </div>
            </div>

            {/* Right Column - Chat and Transcript */}
            <div className="lg:col-span-5 space-y-6">
              {/* Transcript Display - Desktop Only */}
              <div className="hidden lg:block bg-white rounded-lg shadow-lg p-4 h-[250px]">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Transcript</h2>
                <ErrorBoundary componentName="TranscriptDisplay">
                  <TranscriptDisplay />
                </ErrorBoundary>
              </div>

              {/* Chat Interface */}
              <div id="chat-interface" className="bg-white rounded-lg shadow-lg h-[500px] lg:h-[330px]">
                <ChatInterfaceErrorBoundary>
                  <ChatInterface
                    ttsService={ttsService || undefined}
                    selectedAgent={selectedAgent}
                  />
                </ChatInterfaceErrorBoundary>
              </div>
            </div>
          </div>

          {/* Help Text */}
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Use mouse to rotate, zoom, and pan the 3D avatar</p>
            <p className="mt-1">Select an agent and start chatting to see the avatar speak</p>
          </div>
        </div>

        {/* Notification Toast */}
        <NotificationToast />
      </main>
    </ErrorBoundary>
  );
}
