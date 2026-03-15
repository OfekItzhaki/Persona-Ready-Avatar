'use client';

import { useEffect, useState } from 'react';
import { ChatInterface } from '@/components/ChatInterface';
import { NotificationToast } from '@/components/NotificationToast';
import { ErrorBoundary, ChatInterfaceErrorBoundary } from '@/components/ErrorBoundary';
import { useAppStore } from '@/lib/store/useAppStore';
import { useAgents } from '@/lib/hooks/useReactQuery';
import { PersonaSwitcher } from '@/components/PersonaSwitcher';
import { PersonaSwitcherErrorBoundary } from '@/components/ErrorBoundary';
import AvatarSystem from '@/components/AvatarSystem';
import { getAvatarConfig as getEnvAvatarConfig } from '@/lib/env';
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
  const [ttsEnabled, setTtsEnabled] = useState(false);

  const selectedAgentId = useAppStore((state) => state.selectedAgentId);
  const { data: agents } = useAgents();
  const selectedAgent = agents?.find((agent: Agent) => agent.id === selectedAgentId);
  const setCurrentViseme = useAppStore((state) => state.setCurrentViseme);
  const setPlaybackState = useAppStore((state) => state.setPlaybackState);
  const setSelectedAvatar = useAppStore((state) => state.setSelectedAvatar);

  // Stop TTS immediately when voice is toggled off
  useEffect(() => {
    if (!ttsEnabled && ttsService) {
      ttsService.stop();
    }
  }, [ttsEnabled, ttsService]);

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

      const envAvatarConfig = getEnvAvatarConfig();
      const store = useAppStore.getState();
      if (store.availableAvatars.length === 0 && envAvatarConfig.defaultAvatars.length > 0) {
        // avatars initialized from env in store
      }
      const savedAvatarId = preferencesService.loadAvatarPreference();
      if (savedAvatarId) {
        setSelectedAvatar(savedAvatarId);
      }

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
  }, [setCurrentViseme, setPlaybackState, setSelectedAvatar]);

  if (!isInitialized) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p className="loading-text">Initializing...</p>
        <style>{`
          .loading-screen {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: var(--bg-primary);
            gap: 16px;
          }
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 2px solid var(--border);
            border-top-color: var(--accent);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          .loading-text {
            color: var(--text-muted);
            font-size: 14px;
            letter-spacing: 0.05em;
          }
        `}</style>
      </div>
    );
  }

  return (
    <ErrorBoundary componentName="RootApp">
      <div className="app-shell">
        {/* Header */}
        <header className="app-header">
          <div className="header-inner">
            <div className="brand">
              <div className="brand-icon">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="8" r="4" />
                  <path d="M6 20v-2a6 6 0 0 1 12 0v2" />
                </svg>
              </div>
              <div>
                <h1 className="brand-name">Avatar Client</h1>
                <p className="brand-sub">AI Avatar Interface</p>
              </div>
            </div>
            <div className="header-right">
              <PersonaSwitcherErrorBoundary>
                <PersonaSwitcher />
              </PersonaSwitcherErrorBoundary>
              {/* Agent voice toggle */}
              <button
                onClick={() => setTtsEnabled(v => !v)}
                title={ttsEnabled ? 'Mute agent voice' : 'Enable agent voice'}
                aria-label={ttsEnabled ? 'Mute agent voice' : 'Enable agent voice'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  background: ttsEnabled ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.05)',
                  border: ttsEnabled ? '1px solid rgba(99,102,241,0.4)' : '1px solid var(--border)',
                  color: ttsEnabled ? 'var(--accent-hover)' : 'var(--text-muted)',
                }}
              >
                {ttsEnabled ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                    <line x1="23" y1="9" x2="17" y2="15"/>
                    <line x1="17" y1="9" x2="23" y2="15"/>
                  </svg>
                )}
                {ttsEnabled ? 'Voice On' : 'Voice Off'}
              </button>
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="app-main">
          <div className="app-grid">
            {/* Left — Avatar panel */}
            <aside className="avatar-panel">
              <div className="avatar-card">
                <div className="avatar-glow" />
                <AvatarSystem className="avatar-system" />
              </div>
              <div className="info-card">
                <p className="info-title">Quick Start</p>
                <ul className="info-list">
                  <li>Select an agent from the dropdown above</li>
                  <li>Toggle to Voice mode at the bottom</li>
                  <li>Hold the microphone button to speak</li>
                  <li>Or type your message in Text mode</li>
                </ul>
              </div>
            </aside>

            {/* Right — Chat */}
            <section className="chat-panel">
              <ChatInterfaceErrorBoundary>
                <ChatInterface
                  ttsService={ttsEnabled && ttsService ? ttsService : undefined}
                  selectedAgent={selectedAgent}
                  className="chat-interface"
                />
              </ChatInterfaceErrorBoundary>
            </section>
          </div>
        </main>

        <NotificationToast />
      </div>

      <style>{`
        .app-shell {
          min-height: 100vh;
          background: var(--bg-primary);
          display: flex;
          flex-direction: column;
          background-image:
            radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99,102,241,0.08) 0%, transparent 60%);
        }

        /* ── Header ── */
        .app-header {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(10, 10, 15, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border);
        }
        .header-inner {
          max-width: 1440px;
          margin: 0 auto;
          padding: 0 24px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .brand-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: var(--accent-glow);
          border: 1px solid var(--border-accent);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent-hover);
          flex-shrink: 0;
        }
        .brand-name {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
          letter-spacing: -0.01em;
        }
        .brand-sub {
          font-size: 11px;
          color: var(--text-muted);
          letter-spacing: 0.02em;
          margin-top: 1px;
        }
        .header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        /* ── Main layout ── */
        .app-main {
          flex: 1;
          padding: 24px;
          overflow: hidden;
        }
        .app-grid {
          max-width: 1440px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 20px;
          height: calc(100vh - 60px - 48px);
        }

        /* ── Avatar panel ── */
        .avatar-panel {
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-height: 0;
        }
        .avatar-card {
          position: relative;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 16px;
          overflow: hidden;
          flex: 1;
          min-height: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: border-color 0.2s;
        }
        .avatar-card:hover {
          border-color: var(--border-accent);
        }
        .avatar-glow {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse 60% 60% at 50% 100%, rgba(99,102,241,0.08) 0%, transparent 70%);
          pointer-events: none;
        }
        .avatar-system {
          width: 100%;
          height: 100%;
          position: relative;
          z-index: 1;
        }
        .info-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 18px 20px;
          flex-shrink: 0;
        }
        .info-title {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 12px;
        }
        .info-list {
          list-style: none;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .info-list li {
          font-size: 13px;
          color: var(--text-secondary);
          padding-left: 16px;
          position: relative;
          line-height: 1.5;
        }
        .info-list li::before {
          content: '';
          position: absolute;
          left: 0;
          top: 8px;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: var(--accent);
          opacity: 0.6;
        }

        /* ── Chat panel ── */
        .chat-panel {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 16px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }
        .chat-interface {
          flex: 1;
          min-height: 0;
        }

        /* ── Responsive ── */
        @media (max-width: 900px) {
          .app-grid {
            grid-template-columns: 1fr;
            height: auto;
          }
          .avatar-card {
            height: 280px;
            flex: none;
          }
          .chat-panel {
            height: 60vh;
          }
        }
      `}</style>
    </ErrorBoundary>
  );
}
