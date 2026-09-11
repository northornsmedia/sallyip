import React, { useState, useEffect, useRef } from 'react';
import { X, Volume2, ShieldCheck, Play, Square } from 'lucide-react';
import { VOICE_STATES } from '../../voice/types.js';
import { VoiceSessionController } from '../../voice/VoiceSessionController.js';
import { VoiceOrb } from './VoiceOrb.jsx';
import { VoiceStatus } from './VoiceStatus.jsx';
import { LiveTranscript } from './LiveTranscript.jsx';
import '../voice-chat-widget.css';

export const VOICE_OPTIONS = [
  { id: 'en-US-AriaNeural', name: 'Aria (US)', desc: 'Articulate & Confident (Default)' },
  { id: 'en-US-JennyNeural', name: 'Jenny (US)', desc: 'Friendly & Conversational' },
  { id: 'en-US-AvaNeural', name: 'Ava (US)', desc: 'Modern & Expressive' },
  { id: 'en-US-EmmaNeural', name: 'Emma (US)', desc: 'Calm & Intellectual' },
  { id: 'en-GB-SoniaNeural', name: 'Sonia (UK)', desc: 'Crisp & Prestigious' },
  { id: 'en-GB-LibbyNeural', name: 'Libby (UK)', desc: 'Pleasant & Polished' },
  { id: 'en-US-GuyNeural', name: 'Guy (US)', desc: 'Natural Male' },
  { id: 'en-IN-NeerjaExpressiveNeural', name: 'Neerja (IN)', desc: 'Expressive Indian' },
];

export function VoiceOverlay({
  isOpen = false,
  onClose,
  matterId = null,
  conversationId = null,
}) {
  const [sessionState, setSessionState] = useState(VOICE_STATES.IDLE);
  const [duration, setDuration] = useState(0);
  const [partialTranscript, setPartialTranscript] = useState('');
  const [lastUserText, setLastUserText] = useState('');
  const [sallySpokenWords, setSallySpokenWords] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('sally_selected_voice') : null) || 'en-US-AriaNeural';
  });
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);

  const controllerRef = useRef(null);
  const timerRef = useRef(null);
  const previewAudioRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      if (controllerRef.current) {
        controllerRef.current.stop();
        controllerRef.current = null;
      }
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      setIsPreviewPlaying(false);
      setSessionState(VOICE_STATES.IDLE);
      setDuration(0);
      setPartialTranscript('');
      setLastUserText('');
      setSallySpokenWords([]);
      return;
    }

    const controller = new VoiceSessionController({
      matterId,
      conversationId,
    });

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

    controller.onWordWindowUpdate = (words) => {
      setSallySpokenWords([...words]);
    };

    controller.transcriptController.onMessagesUpdate = (msgs) => {
      setMessages([...msgs]);
      const lastUser = [...msgs].reverse().find((m) => m.role === 'user');
      if (lastUser?.text) {
        setLastUserText(lastUser.text);
      }
    };

    controllerRef.current = controller;

    // Start timer
    timerRef.current = setInterval(() => {
      setDuration((d) => d + 1);
    }, 1000);

    // Launch full duplex voice session
    controller.start().catch((err) => {
      console.warn('[VoiceOverlay] Auto-start error:', err);
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (controllerRef.current) {
        controllerRef.current.stop();
      }
    };
  }, [isOpen, matterId, conversationId]);

  if (!isOpen) return null;

  const handleToggleCall = () => {
    if (
      sessionState === VOICE_STATES.IDLE ||
      sessionState === VOICE_STATES.DISCONNECTED ||
      sessionState === VOICE_STATES.ERROR
    ) {
      controllerRef.current?.unlockAudio();
      controllerRef.current?.start().catch((err) => {
        console.warn('[VoiceOverlay] Manual start error:', err);
      });
    } else {
      controllerRef.current?.stop();
      onClose?.();
    }
  };

  const handleManualStop = () => {
    controllerRef.current?.handleManualStop();
  };

  const handleVoiceChange = (newVoice) => {
    setSelectedVoice(newVoice);
    try {
      localStorage.setItem('sally_selected_voice', newVoice);
    } catch {}
    controllerRef.current?.setVoice(newVoice);

    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
      setIsPreviewPlaying(false);
    }
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
    audio.play().catch((err) => {
      console.warn('[VoiceOverlay] Preview playback failed:', err);
      setIsPreviewPlaying(false);
    });
    audio.onended = () => {
      setIsPreviewPlaying(false);
      previewAudioRef.current = null;
    };
    audio.onerror = () => {
      setIsPreviewPlaying(false);
      previewAudioRef.current = null;
    };
  };

  return (
    <div className="voice-overlay-container">
      <div className="voice-card">
        {/* Header */}
        <div className="voice-card-header">
          <div className="voice-header-left">
            <span className="voice-header-title">Sally Full-Duplex Voice</span>
            <div className="voice-header-badge">
              <ShieldCheck size={12} color="#059669" />
              <span>Microsoft Edge Neural</span>
            </div>
          </div>
          <button
            type="button"
            className="voice-icon-btn"
            onClick={() => {
              if (previewAudioRef.current) {
                previewAudioRef.current.pause();
                previewAudioRef.current = null;
              }
              setIsPreviewPlaying(false);
              controllerRef.current?.stop();
              onClose?.();
            }}
            title="Close"
          >
            <X size={17} />
          </button>
        </div>

        {/* Voice Picker Dropdown & Instant Sample Preview */}
        <div className="voice-picker-strip">
          <div className="voice-picker-left">
            <Volume2 size={15} className="voice-picker-icon" />
            <select
              value={selectedVoice}
              onChange={(e) => handleVoiceChange(e.target.value)}
              className="voice-picker-select"
              title="Switch Sally's speaking voice"
            >
              {VOICE_OPTIONS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} — {v.desc}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleTogglePreview}
            className={`voice-preview-btn ${isPreviewPlaying ? 'playing' : ''}`}
            title="Listen to sample audio of selected voice"
          >
            {isPreviewPlaying ? (
              <>
                <Square size={11} fill="currentColor" />
                <span>Stop</span>
              </>
            ) : (
              <>
                <Play size={11} fill="currentColor" />
                <span>Sample</span>
              </>
            )}
          </button>
        </div>

        {/* Body */}
        <div className="voice-card-body">
          <VoiceOrb
            state={sessionState}
            onToggleCall={handleToggleCall}
            onManualStop={handleManualStop}
          />
          <VoiceStatus state={sessionState} duration={duration} />
          <LiveTranscript
            state={sessionState}
            partialTranscript={partialTranscript}
            sallyWordsWindow={sallySpokenWords}
            lastUserText={lastUserText}
            onManualStop={handleManualStop}
          />
        </div>
      </div>
    </div>
  );
}

export default VoiceOverlay;
