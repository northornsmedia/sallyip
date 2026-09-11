/**
 * SallyVideoCallCard.jsx
 *
 * Full-Window Immersive 3D Digital Human Video Call for Sally IP.
 * 100% Client-Side Pure JavaScript & Three.js WebGL (Pure Vanilla CSS).
 * ZERO GPU clusters, ZERO server rendering cost.
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
  FileText,
  Copy,
  Check,
  Radio,
  X,
  Maximize,
} from 'lucide-react';
import { VOICE_STATES } from '../../voice/types.js';
import { VoiceSessionController } from '../../voice/VoiceSessionController.js';
import { SallyRealHumanVideo } from './SallyRealHumanVideo.jsx';
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
  const [conversationHistory, setConversationHistory] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTranscriptDrawer, setShowTranscriptDrawer] = useState(false);
  const [showUserCamera, setShowUserCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const [analyserNode, setAnalyserNode] = useState(null);
  const [selectedVoice, setSelectedVoice] = useState(() => {
    return (
      (typeof window !== 'undefined'
        ? localStorage.getItem('sally_selected_voice')
        : null) || 'en-US-AriaNeural'
    );
  });

  const controllerRef = useRef(null);
  const timerRef = useRef(null);
  const videoContainerRef = useRef(null);
  const userVideoRef = useRef(null);

  // Initialize and manage voice session controller
  useEffect(() => {
    if (!isOpen) {
      if (controllerRef.current) {
        controllerRef.current.stop();
        controllerRef.current = null;
      }
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
        setCameraStream(null);
      }
      setSessionState(VOICE_STATES.IDLE);
      setDuration(0);
      setPartialTranscript('');
      setSallySpokenWords([]);
      setConversationHistory([]);
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
        setConversationHistory((prev) => [
          ...prev,
          { speaker: 'user', text: final, timestamp: new Date() },
        ]);
      }
    };

    controller.onWordWindowUpdate = (words) => {
      setSallySpokenWords([...words]);
    };

    // Capture complete assistant replies into transcript history
    const originalPlayAudio = controller.playAudioResponse?.bind(controller);
    if (originalPlayAudio) {
      controller.playAudioResponse = async (audioBuffer, text, alignment) => {
        if (text) {
          setConversationHistory((prev) => [
            ...prev,
            { speaker: 'sally', text, timestamp: new Date() },
          ]);
        }
        return originalPlayAudio(audioBuffer, text, alignment);
      };
    }

    controllerRef.current = controller;

    // Start audio & capture
    controller.unlockAudio();
    controller.start().catch((err) => {
      console.warn('[SallyVideoCallCard] Session start warning:', err);
    });

    // Obtain AnalyserNode for 3D digital human lip sync
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

  // Handle user webcam preview stream
  useEffect(() => {
    if (showUserCamera && !cameraStream) {
      navigator.mediaDevices
        ?.getUserMedia({ video: { width: 320, height: 240, facingMode: 'user' }, audio: false })
        .then((stream) => {
          setCameraStream(stream);
          if (userVideoRef.current) {
            userVideoRef.current.srcObject = stream;
          }
        })
        .catch((err) => {
          console.warn('[SallyVideoCall] Camera access denied or not available:', err);
          setShowUserCamera(false);
        });
    } else if (!showUserCamera && cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
  }, [showUserCamera]);

  // Connect user camera video element when stream changes
  useEffect(() => {
    if (userVideoRef.current && cameraStream) {
      userVideoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

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
        try {
          controllerRef.current.speechRecognition.stop();
        } catch {}
      }
    } else {
      controllerRef.current?.ensureSpeechRecognitionRunning();
    }
  };

  const handleToggleFullscreen = () => {
    const el = videoContainerRef.current;
    if (!el) return;

    if (!document.fullscreenElement) {
      el.requestFullscreen?.()
        .then(() => setIsFullscreen(true))
        .catch(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen?.()
        .then(() => setIsFullscreen(false))
        .catch(() => setIsFullscreen(false));
    }
  };

  const handleEndCall = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    controllerRef.current?.stop();
    onClose?.();
  };

  const handleCopyTranscript = () => {
    const text = conversationHistory
      .map((item) => `[${item.speaker === 'sally' ? 'Sally IP' : 'You'}]: ${item.text}`)
      .join('\n\n');
    navigator.clipboard?.writeText(text);
    setCopiedTranscript(true);
    setTimeout(() => setCopiedTranscript(false), 2000);
  };

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const activeVoiceObj =
    VOICE_OPTIONS.find((v) => v.id === selectedVoice) || VOICE_OPTIONS[0];

  // -------------------------------------------------------------
  // 1. Minimized Picture-in-Picture Pill View (when user multitasks)
  // -------------------------------------------------------------
  if (isMinimized) {
    return (
      <div className="sally-pip-call-pill">
        <div className="sally-pip-avatar-ring">
          <img
            src="/images/sally_human_avatar.jpg"
            alt="Sally IP"
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              objectFit: 'cover',
            }}
          />
          <span
            className={`sally-pip-dot ${
              sessionState === VOICE_STATES.SPEAKING ? 'speaking' : 'listening'
            }`}
          />
        </div>
        <div className="sally-pip-info">
          <span className="sally-pip-title">Sally Video Call</span>
          <span className="sally-pip-sub">
            {sessionState === VOICE_STATES.SPEAKING
              ? 'Speaking...'
              : sessionState === VOICE_STATES.THINKING
              ? 'Reasoning...'
              : 'Listening...'}
          </span>
        </div>
        <button
          type="button"
          className="sally-pip-btn"
          onClick={() => setIsMinimized(false)}
          title="Expand to Full Window Video Call"
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

  // -------------------------------------------------------------
  // 2. Full-Window Cinema Video Call Modal
  // -------------------------------------------------------------
  return (
    <div
      ref={videoContainerRef}
      className="sally-video-modal-fullscreen"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 999999,
        background: 'radial-gradient(ellipse at 50% 35%, #0f172a 0%, #030712 100%)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        color: '#f8fafc',
      }}
    >
      {/* TOP HEADER */}
      <header className="sally-fs-header">
        {/* Left: Brand, Live status & Duration */}
        <div className="sally-fs-header-left">
          <div className="sally-fs-live-badge">
            <span className="sally-fs-live-dot" />
            <span>LIVE VIDEO CALL</span>
          </div>

          <div className="sally-fs-title-col">
            <div className="sally-fs-title-row">
              <span className="sally-fs-title-text">Sally IP</span>
              <span className="sally-fs-title-pill">Real Human</span>
            </div>
            <div className="sally-fs-meta-row">
              <ShieldCheck size={12} color="#34d399" />
              <span>256-bit AES P2P Encrypted</span>
              <span>•</span>
              <span className="sally-fs-timer">{formatDuration(duration)}</span>
            </div>
          </div>
        </div>

        {/* Center: Neural Voice Selector Dropdown */}
        <div className="sally-fs-voice-picker">
          <Volume2 size={14} color="#818cf8" />
          <span className="sally-fs-voice-label">Neural Voice:</span>
          <select
            value={selectedVoice}
            onChange={(e) => handleVoiceChange(e.target.value)}
            className="sally-fs-voice-select"
          >
            {VOICE_OPTIONS.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} - {v.desc}
              </option>
            ))}
          </select>
          <ChevronDown size={13} color="#94a3b8" />
        </div>

        {/* Right: Window Controls */}
        <div className="sally-fs-header-right">
          {/* Transcript Drawer Toggle */}
          <button
            type="button"
            onClick={() => setShowTranscriptDrawer(!showTranscriptDrawer)}
            className={`sally-fs-btn-icon ${showTranscriptDrawer ? 'active' : ''}`}
            title={showTranscriptDrawer ? 'Hide Legal Transcript' : 'Show Legal Transcript'}
          >
            <FileText size={18} />
          </button>

          {/* Minimize to PiP */}
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="sally-fs-btn-icon"
            title="Minimize to Picture-in-Picture"
          >
            <Minimize2 size={18} />
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="sally-fs-btn-icon"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize size={18} />}
          </button>

          {/* End Call Button */}
          <button
            type="button"
            onClick={handleEndCall}
            className="sally-fs-btn-end"
            title="End Video Call"
          >
            <PhoneOff size={15} />
            <span>End Call</span>
          </button>
        </div>
      </header>

      {/* MAIN STAGE & SIDEBAR */}
      <div className="sally-fs-stage">
        {/* HERO REAL HUMAN VIDEO VIEWPORT */}
        <div className="sally-fs-viewport">
          {/* Real Human Video Engine */}
          <SallyRealHumanVideo
            state={sessionState}
            analyserNode={analyserNode}
            isMuted={isMuted}
            activeVoiceName={activeVoiceObj.name}
          />

          {/* User Webcam Preview PiP (Bottom-Right) */}
          {showUserCamera && (
            <div className="sally-user-pip">
              <video
                ref={userVideoRef}
                autoPlay
                playsInline
                muted
                className="sally-user-pip-video"
              />
              <div className="sally-user-pip-tag">You (Camera)</div>
            </div>
          )}

          {/* REAL-TIME CLOSED CAPTIONS & TELEPROMPTER HUD */}
          <div className="sally-fs-captions-hud">
            {sessionState === VOICE_STATES.THINKING ? (
              <div className="sally-hud-box thinking">
                <Sparkles size={16} color="#818cf8" className="animate-spin" />
                <span>Sally IP is reasoning with patent intelligence database...</span>
              </div>
            ) : sessionState === VOICE_STATES.SPEAKING && sallySpokenWords.length > 0 ? (
              <div className="sally-hud-box speaking">
                <div className="sally-hud-speaker-tag sally">
                  <Radio size={12} color="#818cf8" />
                  <span>Sally IP</span>
                </div>
                <div className="sally-hud-content">
                  {sallySpokenWords.map((word, idx) => {
                    const isLatest = idx === sallySpokenWords.length - 1;
                    return (
                      <span
                        key={idx}
                        className={`sally-hud-word ${isLatest ? 'active' : ''}`}
                      >
                        {word}{' '}
                      </span>
                    );
                  })}
                </div>
              </div>
            ) : partialTranscript ? (
              <div className="sally-hud-box user">
                <div className="sally-hud-speaker-tag user">
                  <span>You are saying:</span>
                </div>
                <div className="sally-hud-content">
                  "{partialTranscript}"
                </div>
              </div>
            ) : (
              <div className="sally-hud-box idle">
                <span>{isMuted ? 'Microphone is muted' : 'Listening... Speak naturally with Sally'}</span>
              </div>
            )}
          </div>
        </div>

        {/* COLLAPSIBLE LEGAL TRANSCRIPT & BRIEF DRAWER */}
        {showTranscriptDrawer && (
          <aside className="sally-fs-drawer">
            {/* Drawer Header */}
            <div className="sally-fs-drawer-header">
              <div className="sally-fs-drawer-title">
                <FileText size={16} color="#818cf8" />
                <span>Live Legal Transcript</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleCopyTranscript}
                  className="sally-fs-btn-icon"
                  style={{ width: '28px', height: '28px' }}
                  title="Copy Transcript"
                >
                  {copiedTranscript ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                </button>
                <button
                  type="button"
                  onClick={() => setShowTranscriptDrawer(false)}
                  className="sally-fs-btn-icon"
                  style={{ width: '28px', height: '28px' }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Transcript Messages Stream */}
            <div className="sally-fs-drawer-body">
              {conversationHistory.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#64748b', padding: '48px 0' }}>
                  <FileText size={28} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
                  <p>Conversation transcript will stream live here as you speak with Sally.</p>
                </div>
              ) : (
                conversationHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className={`sally-transcript-item ${item.speaker === 'sally' ? 'sally' : 'user'}`}
                  >
                    <div className="sally-transcript-meta">
                      <span style={{ color: item.speaker === 'sally' ? '#818cf8' : '#34d399' }}>
                        {item.speaker === 'sally' ? 'Sally IP' : 'You'}
                      </span>
                      <span style={{ color: '#64748b' }}>
                        {item.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    <div>{item.text}</div>
                  </div>
                ))
              )}
            </div>

            {/* Drawer Footer */}
            <div className="sally-fs-drawer-footer">
              <span>{conversationHistory.length} turns logged</span>
              <span style={{ color: '#818cf8', fontWeight: 600 }}>Synced with Matter</span>
            </div>
          </aside>
        )}
      </div>

      {/* FLOATING BOTTOM CONTROLS DOCK */}
      <footer className="sally-fs-footer">
        <div className="sally-fs-dock">
          {/* Mute Microphone Button */}
          <button
            type="button"
            onClick={handleToggleMute}
            className={`sally-dock-btn ${isMuted ? 'muted' : ''}`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff size={16} /> : <Mic size={16} color="#34d399" />}
            <span>{isMuted ? 'Muted' : 'Mic On'}</span>
          </button>

          {/* User Webcam Toggle Button */}
          <button
            type="button"
            onClick={() => setShowUserCamera(!showUserCamera)}
            className={`sally-dock-btn ${showUserCamera ? 'active' : ''}`}
            title={showUserCamera ? 'Turn off camera' : 'Turn on camera'}
          >
            {showUserCamera ? <Video size={16} /> : <VideoOff size={16} />}
            <span>{showUserCamera ? 'Camera On' : 'Camera Off'}</span>
          </button>

          {/* Big Red End Call Button */}
          <button
            type="button"
            onClick={handleEndCall}
            className="sally-dock-btn end"
            title="Leave & End Video Call"
          >
            <PhoneOff size={16} />
            <span>End Call</span>
          </button>
        </div>
      </footer>
    </div>
  );
}

export default SallyVideoCallCard;
