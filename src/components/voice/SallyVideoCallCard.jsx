/**
 * SallyVideoCallCard.jsx
 *
 * Interactive Video Call Card on the Sally IP Chat Page.
 * Renders Sally's ultra-realistic photorealistic digital human face in pure client-side JavaScript.
 *
 * Capabilities:
 * - Real-time audio-driven lip-sync using WebAudio AnalyserNode and Edge Neural TTS
 * - Lifelike facial animation: natural blinking, eye gaze tracking, breathing, head tilt
 * - Live two-way conversation: speaks -> engine answers -> Sally speaks back with lip sync
 * - Dockable, floating, and minimizable into picture-in-picture mode
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Minimize2,
  Maximize2,
  Volume2,
  Sparkles,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import { VOICE_STATES } from '../../voice/types.js';
import { VoiceSessionController } from '../../voice/VoiceSessionController.js';
import { SallyDigitalHumanCanvas } from './SallyDigitalHumanCanvas.jsx';
import { VOICE_OPTIONS } from './VoiceOverlay.jsx';
import '../voice-chat-widget.css';

export function SallyVideoCallCard({
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
  const [isMuted, setIsMuted] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [analyserNode, setAnalyserNode] = useState(null);
  const [selectedVoice, setSelectedVoice] = useState(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('sally_selected_voice') : null) || 'en-US-AriaNeural';
  });

  const controllerRef = useRef(null);
  const timerRef = useRef(null);

  // Initialize and start video call session
  useEffect(() => {
    if (!isOpen) {
      if (controllerRef.current) {
        controllerRef.current.stop();
        controllerRef.current = null;
      }
      setSessionState(VOICE_STATES.IDLE);
      setDuration(0);
      setPartialTranscript('');
      setSallySpokenWords([]);
      setAnalyserNode(null);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const controller = new VoiceSessionController({
      matterId,
      conversationId,
      voice: selectedVoice,
    });

    controller.onStateChange(({ newState }) => {
      setSessionState(newState);
      if (newState === VOICE_STATES.LISTENING) {
        setSallySpokenWords([]);
        setPartialTranscript('');
      }
      if (newState === VOICE_STATES.IDLE || newState === VOICE_STATES.DISCONNECTED) {
        if (timerRef.current) clearInterval(timerRef.current);
      }
    });

    controller.transcriptController.onTranscriptUpdate = ({ partial, final }) => {
      setPartialTranscript(partial || '');
      if (final) {
        setLastUserText(final);
      }
    };

    controller.onWordWindowUpdate = (words) => {
      setSallySpokenWords([...words]);
    };

    controllerRef.current = controller;

    // Start audio & capture
    controller.unlockAudio();
    controller.start().catch((err) => {
      console.warn('[SallyVideoCallCard] Session start warning:', err);
    });

    // Obtain AnalyserNode for 60FPS digital human lip sync
    controller.getAnalyserNode().then((node) => {
      if (node) setAnalyserNode(node);
    });

    // Duration timer
    timerRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);

    return () => {
      if (controllerRef.current) {
        controllerRef.current.stop();
        controllerRef.current = null;
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, matterId, conversationId]);

  if (!isOpen) return null;

  const handleVoiceChange = (newVoice) => {
    setSelectedVoice(newVoice);
    try {
      localStorage.setItem('sally_selected_voice', newVoice);
    } catch {}
    controllerRef.current?.setVoice(newVoice);
  };

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
    if (!isMuted) {
      if (controllerRef.current?.speechRecognition) {
        try { controllerRef.current.speechRecognition.stop(); } catch {}
      }
    } else {
      controllerRef.current?.ensureSpeechRecognitionRunning();
    }
  };

  const handleEndCall = () => {
    controllerRef.current?.stop();
    onClose?.();
  };

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const activeVoiceObj = VOICE_OPTIONS.find((v) => v.id === selectedVoice) || VOICE_OPTIONS[0];

  // Minimized Picture-in-Picture Pill View
  if (isMinimized) {
    return (
      <div className="sally-pip-call-pill">
        <div className="sally-pip-avatar-ring">
          <img src="/images/sally_avatar_base.jpg" alt="Sally" className="sally-pip-img" />
          <span className={`sally-pip-dot ${sessionState === VOICE_STATES.SPEAKING ? 'speaking' : 'listening'}`} />
        </div>
        <div className="sally-pip-info">
          <span className="sally-pip-title">Sally Video Call</span>
          <span className="sally-pip-sub">
            {sessionState === VOICE_STATES.SPEAKING
              ? 'Speaking...'
              : sessionState === VOICE_STATES.THINKING
              ? 'Thinking...'
              : 'Listening...'}
          </span>
        </div>
        <button
          type="button"
          className="sally-pip-btn"
          onClick={() => setIsMinimized(false)}
          title="Expand Video Call"
        >
          <Maximize2 size={14} />
        </button>
        <button
          type="button"
          className="sally-pip-btn end"
          onClick={handleEndCall}
          title="End Call"
        >
          <PhoneOff size={14} />
        </button>
      </div>
    );
  }

  // Full Expanded Video Call Card
  return (
    <div className="sally-video-call-card">
      {/* Header */}
      <div className="sally-video-card-header">
        <div className="sally-video-header-left">
          <div className="sally-live-pulse-badge">
            <span className="sally-pulse-circle" />
            <span>VIDEO CALL</span>
          </div>
          <span className="sally-video-timer">{formatDuration(duration)}</span>
        </div>
        <div className="sally-video-header-right">
          <button
            type="button"
            className="sally-vcard-btn"
            onClick={() => setIsMinimized(true)}
            title="Minimize to Picture-in-Picture"
          >
            <Minimize2 size={15} />
          </button>
          <button
            type="button"
            className="sally-vcard-btn close"
            onClick={handleEndCall}
            title="End Video Call"
          >
            <PhoneOff size={15} />
          </button>
        </div>
      </div>

      {/* 60FPS Pure JavaScript Digital Human Video Surface */}
      <div className="sally-video-surface-container">
        <SallyDigitalHumanCanvas
          state={sessionState}
          analyserNode={analyserNode}
          isMuted={isMuted}
          activeVoiceName={activeVoiceObj.name}
          width={380}
          height={380}
        />

        {/* State Banner Overlay */}
        {sessionState === VOICE_STATES.THINKING && (
          <div className="sally-video-state-banner thinking">
            <Sparkles size={13} className="animate-spin text-indigo-400" />
            <span>Sally is reasoning with IP engine...</span>
          </div>
        )}
      </div>

      {/* Live Caption / Subtitle Strip */}
      <div className="sally-video-caption-strip">
        {sessionState === VOICE_STATES.SPEAKING && sallySpokenWords.length > 0 ? (
          <div className="sally-teleprompter-line">
            <span className="sally-teleprompter-badge">Sally:</span>
            {sallySpokenWords.map((word, idx) => (
              <span
                key={idx}
                className={`sally-caption-word ${idx === sallySpokenWords.length - 1 ? 'active' : ''}`}
              >
                {word}{' '}
              </span>
            ))}
          </div>
        ) : partialTranscript ? (
          <div className="sally-user-live-caption">
            <span className="sally-caption-mic-icon">🎙️</span>
            <span className="sally-caption-text">"{partialTranscript}"</span>
            <span className="sally-cursor" />
          </div>
        ) : (
          <div className="sally-caption-idle">
            <span>{isMuted ? 'Microphone muted' : 'Listening... Speak naturally with Sally'}</span>
          </div>
        )}
      </div>

      {/* Action Controls Bar */}
      <div className="sally-video-controls-bar">
        {/* Voice Selector Dropdown */}
        <div className="sally-voice-select-pill">
          <Volume2 size={13} className="text-indigo-500" />
          <select
            value={selectedVoice}
            onChange={(e) => handleVoiceChange(e.target.value)}
            className="sally-voice-dropdown"
            title="Switch Sally's Neural Voice"
          >
            {VOICE_OPTIONS.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>

        {/* Mic Mute Toggle */}
        <button
          type="button"
          onClick={handleToggleMute}
          className={`sally-ctrl-icon-btn ${isMuted ? 'muted' : ''}`}
          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
        </button>

        {/* End Call Button */}
        <button
          type="button"
          onClick={handleEndCall}
          className="sally-ctrl-icon-btn end-call"
          title="End Video Call"
        >
          <PhoneOff size={16} />
        </button>
      </div>
    </div>
  );
}

export default SallyVideoCallCard;
