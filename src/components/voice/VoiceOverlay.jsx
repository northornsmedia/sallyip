import React, { useState, useEffect, useRef } from 'react';
import { X, Volume2, ShieldCheck, Play, Square, AudioLines, ChevronDown, LockKeyhole, Radio } from 'lucide-react';
import { VOICE_STATES } from '../../voice/types.js';
import { VoiceSessionController } from '../../voice/VoiceSessionController.js';
import { VoiceOrb } from './VoiceOrb.jsx';
import { VoiceStatus } from './VoiceStatus.jsx';
import { LiveTranscript } from './LiveTranscript.jsx';
import '../voice-chat-widget.css';

export const VOICE_OPTIONS = [
  { id: 'en-US-AriaNeural', name: 'Aria (US)', desc: 'Articulate & Confident' },
  { id: 'en-US-JennyNeural', name: 'Jenny (US)', desc: 'Friendly & Conversational' },
  { id: 'en-US-AvaNeural', name: 'Ava (US)', desc: 'Modern & Expressive' },
  { id: 'en-US-EmmaNeural', name: 'Emma (US)', desc: 'Calm & Intellectual' },
  { id: 'en-GB-SoniaNeural', name: 'Sonia (UK)', desc: 'Crisp & Prestigious' },
  { id: 'en-GB-LibbyNeural', name: 'Libby (UK)', desc: 'Pleasant & Polished' },
  { id: 'en-US-GuyNeural', name: 'Guy (US)', desc: 'Natural Male' },
  { id: 'en-IN-NeerjaExpressiveNeural', name: 'Neerja (IN)', desc: 'Expressive Indian' },
];

export function VoiceOverlay({ isOpen = false, onClose, matterId = null, conversationId = null }) {
  const [sessionState, setSessionState] = useState(VOICE_STATES.IDLE);
  const [duration, setDuration] = useState(0);
  const [partialTranscript, setPartialTranscript] = useState('');
  const [lastUserText, setLastUserText] = useState('');
  const [sallySpokenWords, setSallySpokenWords] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(() =>
    (typeof window !== 'undefined' ? localStorage.getItem('sally_selected_voice') : null) || 'en-US-AriaNeural');
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const controllerRef = useRef(null);
  const timerRef = useRef(null);
  const previewAudioRef = useRef(null);

  const closeOverlay = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    setIsPreviewPlaying(false);
    controllerRef.current?.stop();
    onClose?.();
  };

  useEffect(() => {
    if (!isOpen) {
      controllerRef.current?.stop();
      controllerRef.current = null;
      previewAudioRef.current?.pause();
      previewAudioRef.current = null;
      setIsPreviewPlaying(false);
      setSessionState(VOICE_STATES.IDLE);
      setDuration(0);
      setPartialTranscript('');
      setLastUserText('');
      setSallySpokenWords([]);
      return undefined;
    }

    const controller = new VoiceSessionController({ matterId, conversationId });
    controller.onStateChange(({ newState }) => {
      setSessionState(newState);
      if (newState === VOICE_STATES.IDLE || newState === VOICE_STATES.DISCONNECTED) {
        if (timerRef.current) clearInterval(timerRef.current);
      }
    });
    controller.transcriptController.onTranscriptUpdate = ({ partial, final }) => {
      if (partial) setPartialTranscript(partial);
      if (final) {
        setLastUserText(final);
        setPartialTranscript('');
      }
    };
    controller.onWordWindowUpdate = (words) => setSallySpokenWords([...words]);
    controller.transcriptController.onMessagesUpdate = (messages) => {
      const lastUser = [...messages].reverse().find((message) => message.role === 'user');
      if (lastUser?.text) setLastUserText(lastUser.text);
    };
    controllerRef.current = controller;
    timerRef.current = setInterval(() => setDuration((value) => value + 1), 1000);
    controller.start().catch((error) => console.warn('[VoiceOverlay] Auto-start error:', error));

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      controller.stop();
    };
  }, [isOpen, matterId, conversationId]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeOverlay();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleToggleCall = () => {
    if ([VOICE_STATES.IDLE, VOICE_STATES.DISCONNECTED, VOICE_STATES.ERROR].includes(sessionState)) {
      controllerRef.current?.unlockAudio();
      controllerRef.current?.start().catch((error) => console.warn('[VoiceOverlay] Manual start error:', error));
    } else {
      closeOverlay();
    }
  };

  const handleVoiceChange = (voice) => {
    setSelectedVoice(voice);
    try { localStorage.setItem('sally_selected_voice', voice); } catch {}
    controllerRef.current?.setVoice(voice);
    previewAudioRef.current?.pause();
    previewAudioRef.current = null;
    setIsPreviewPlaying(false);
  };

  const handleTogglePreview = () => {
    if (previewAudioRef.current && isPreviewPlaying) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
      setIsPreviewPlaying(false);
      return;
    }
    const audio = new Audio(`/audio/voices/${selectedVoice}.mp3`);
    previewAudioRef.current = audio;
    setIsPreviewPlaying(true);
    audio.play().catch((error) => {
      console.warn('[VoiceOverlay] Preview playback failed:', error);
      setIsPreviewPlaying(false);
    });
    audio.onended = audio.onerror = () => {
      setIsPreviewPlaying(false);
      previewAudioRef.current = null;
    };
  };

  const stateClass = String(sessionState).toLowerCase().replaceAll('_', '-');

  return (
    <div
      className="voice-overlay-container"
      role="dialog"
      aria-modal="true"
      aria-label="Sally voice conversation"
      onMouseDown={(event) => event.target === event.currentTarget && closeOverlay()}
    >
      <div className={`voice-card voice-state-${stateClass}`}>
        <div className="voice-card-aurora" aria-hidden="true" />
        <header className="voice-card-header">
          <div className="voice-header-left">
            <div className="voice-brand-mark" aria-hidden="true"><AudioLines size={18} /></div>
            <div>
              <div className="voice-header-kicker">SALLYIP VOICE</div>
              <div className="voice-header-title">A natural conversation with Sally</div>
            </div>
          </div>
          <div className="voice-header-actions">
            <div className="voice-live-chip"><Radio size={11} /><span>Live</span></div>
            <button type="button" className="voice-icon-btn" onClick={closeOverlay} title="Close voice conversation" aria-label="Close voice conversation">
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="voice-picker-strip">
          <div className="voice-picker-left">
            <div className="voice-picker-leading"><Volume2 size={16} /></div>
            <div className="voice-picker-copy">
              <span className="voice-picker-label">Sally's voice</span>
              <div className="voice-picker-select-wrap">
                <select value={selectedVoice} onChange={(event) => handleVoiceChange(event.target.value)} className="voice-picker-select" aria-label="Choose Sally's voice">
                  {VOICE_OPTIONS.map((voice) => <option key={voice.id} value={voice.id}>{voice.name} — {voice.desc}</option>)}
                </select>
                <ChevronDown size={14} aria-hidden="true" />
              </div>
            </div>
          </div>
          <button type="button" onClick={handleTogglePreview} className={`voice-preview-btn ${isPreviewPlaying ? 'playing' : ''}`} title="Listen to the selected voice">
            {isPreviewPlaying ? <><Square size={11} fill="currentColor" /><span>Stop</span></> : <><Play size={11} fill="currentColor" /><span>Preview</span></>}
          </button>
        </div>

        <main className="voice-card-body">
          <div className="voice-session-overline"><span className="voice-session-dot" />Full-duplex session</div>
          <VoiceOrb state={sessionState} onToggleCall={handleToggleCall} onManualStop={() => controllerRef.current?.handleManualStop()} />
          <VoiceStatus state={sessionState} duration={duration} />
          <LiveTranscript
            state={sessionState}
            partialTranscript={partialTranscript}
            sallyWordsWindow={sallySpokenWords}
            lastUserText={lastUserText}
            onManualStop={() => controllerRef.current?.handleManualStop()}
          />
        </main>

        <footer className="voice-card-trustbar">
          <div><ShieldCheck size={13} /><span>Neural audio</span></div>
          <span className="voice-trust-divider" />
          <div><LockKeyhole size={12} /><span>Private matter context</span></div>
        </footer>
      </div>
    </div>
  );
}

export default VoiceOverlay;
