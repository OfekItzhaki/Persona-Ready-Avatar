'use client';

import { useEffect, useState } from 'react';
import { ChatInterface } from '@/components/ChatInterface';
import { NotificationToast } from '@/components/NotificationToast';
import { ErrorBoundary, ChatInterfaceErrorBoundary } from '@/components/ErrorBoundary';
import { useAppStore } from '@/lib/store/useAppStore';
import { useAgents } from '@/lib/hooks/useReactQuery';
import { PersonaSwitcher } from '@/components/PersonaSwitcher';
import { PersonaSwitcherErrorBoundary } from '@/components/ErrorBoundary';
import { ImageAvatar } from '@/components/ImageAvatar';
import { getAvatarConfig } from '@/config/avatars';
import { TTSService } from '@/lib/services/TTSService';
import { AzureSpeechRepository } from '@/lib/repositories/AzureSpeechRepository';
import { AudioManager } from '@/lib/services/AudioManager';
import { LocalStorageRepository } from '@/lib/repositories/LocalStorageRepository';
import { PreferencesService } from '@/lib/services/PreferencesService';
import { VisemeCoordinator } from '@/lib/services/VisemeCoordinator';
import { LanguageVoiceMapper } from '@/lib/services/LanguageVoiceMapper';
import { initializeFocusIndicators } from '@/lib/utils/focusIndicators';
import { logger } from '@/lib/logger';
import type { Agent } from '@/types';

export default function Home() {
  const [ttsService, setTtsService] = useState<TTSService | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const selectedAgentId = useAppStore((state) => state.selectedAgentId);
  const { data: agents } = useAgents();
  const selectedAgent = agents?.find((agent: Agent) => agent.id === selectedAgentId);
  const playbackState = useAppStore((state) => state.playbackState);
  const setCurrentViseme = useAppStore((state) => state.setCurrentViseme);
  const setPlaybackState = useAppStore((state) => state.setPlaybackState);

  // Get avatar config for selected agent
  const avatarConfig = getAvatarConfig(selectedAgentId || undefined);
  const isSpeaking = playbackState === 'playing';

  useEffect(() => {
    initializeFocusIndicators();
  }, []);

  useEffect(() => {
    logger.info('Initializing application services', { component: 'Home' });

    try {
      const azureSpeechRepository = new AzureSpeechRepository();
      const audioManager = new AudioManager();
      const visemeCoordinator = new VisemeCoordinator();
      const languageVoiceMapper = new LanguageVoiceMapper();
      const localStorageRepo = new LocalStorageRepository();
      const preferencesService = PreferencesService.initialize(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useAppStore.getState() as any,
        localStorageRepo
      );

      const unsubscribeViseme = visemeCoordinator.subscribeToVisemeChanges((viseme) => {
        setCurrentViseme(viseme);
      });

      const unsubscribePlayback = audioManager.subscribeToPlaybackState((state) => {
        setPlaybackState(state);
      });

      const tts = new TTSService(
        azureSpeechRepository,
        audioManager,
        visemeCoordinator,
        languageVoiceMapper,
        preferencesService
      );

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTtsService(tts);

      setIsInitialized(true);
      logger.info('Application services initialized successfully', { component: 'Home' });

      return () => {
        logger.info('Cleaning up application services', { component: 'Home' });
        unsubscribeViseme();
        unsubscribePlayback();
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
  }, [setCurrentViseme, setPlaybackState]);

  if (!isInitialized) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#f9fafb',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              border: '4px solid #e5e7eb',
              borderTopColor: '#2563eb',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px',
            }}
          ></div>
          <p style={{ color: '#6b7280', fontSize: '18px' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary componentName="RootApp">
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#f9fafb',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <header
          style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px' }}
        >
          <div
            style={{
              maxWidth: '1280px',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: 0 }}>
                Avatar Client
              </h1>
              <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                AI Avatar Chat Interface
              </p>
            </div>
            <div>
              <PersonaSwitcherErrorBoundary>
                <PersonaSwitcher />
              </PersonaSwitcherErrorBoundary>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main style={{ flex: 1, padding: '24px' }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto', height: '100%' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '350px 1fr',
                gap: '24px',
                height: '100%',
              }}
            >
              {/* Left Column - Avatar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Avatar Display */}
                <div
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.1)',
                    padding: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '350px',
                  }}
                >
                  <div style={{ width: '250px', height: '250px', position: 'relative' }}>
                    <ImageAvatar
                      imageUrl={avatarConfig.imageUrl}
                      agentName={selectedAgent?.name || avatarConfig.name || 'AI Assistant'}
                      isSpeaking={isSpeaking}
                    />
                  </div>
                </div>

                {/* Instructions */}
                <div
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.1)',
                    padding: '20px',
                  }}
                >
                  <h3
                    style={{
                      fontSize: '15px',
                      fontWeight: '600',
                      color: '#111827',
                      marginBottom: '12px',
                    }}
                  >
                    Quick Start
                  </h3>
                  <ul
                    style={{
                      fontSize: '14px',
                      color: '#6b7280',
                      margin: 0,
                      paddingLeft: '20px',
                      lineHeight: '1.8',
                    }}
                  >
                    <li>Select an agent from the dropdown above</li>
                    <li>Toggle to Voice mode at the bottom</li>
                    <li>Hold the microphone button to speak</li>
                    <li>Or type your message in Text mode</li>
                  </ul>
                </div>
              </div>

              {/* Right Column - Chat Interface */}
              <div
                style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.1)',
                  height: '800px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <ChatInterfaceErrorBoundary>
                  <ChatInterface
                    ttsService={ttsService || undefined}
                    selectedAgent={selectedAgent}
                    className="flex-1"
                  />
                </ChatInterfaceErrorBoundary>
              </div>
            </div>
          </div>
        </main>

        <NotificationToast />
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </ErrorBoundary>
  );
}
