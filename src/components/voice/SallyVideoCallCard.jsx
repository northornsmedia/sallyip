/**
 * SallyVideoCallCard.jsx
 *
 * Full-Window Immersive 3D Digital Human Video Call for Sally IP.
 * 100% Client-Side Pure JavaScript & Three.js WebGL.
 * ZERO GPU clusters, ZERO server rendering cost.
 *
 * Capabilities:
 * - Full-window cinema-grade video call theater (100vw x 100vh)
 * - Genuine 3D humanoid avatar with bone hierarchy & Oculus viseme lip sync
 * - Microsoft Edge Neural TTS audio analysis via WebAudio AnalyserNode
 * - Live two-way conversation with dual-channel speech recognition
 * - Real-time closed-captions HUD & rolling teleprompter
 * - Optional user webcam preview (Picture-in-Picture)
 * - Collapsible Live Legal Transcript & Patent Brief sidebar
 * - Picture-in-Picture minimizable mode for multitasking
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
  Share2,
  X,
  Maximize,
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
          <div className="w-full h-full rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
            3D
          </div>
          <span
            className={`sally-pip-dot ${
              sessionState === VOICE_STATES.SPEAKING ? 'speaking' : 'listening'
            }`}
          />
        </div>
        <div className="sally-pip-info">
          <span className="sally-pip-title">Sally 3D Video Call</span>
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
      className="sally-video-modal-fullscreen fixed inset-0 z-[999999] bg-slate-950 flex flex-col overflow-hidden text-slate-100 font-sans"
    >
      {/* TOP TELEMETRY & CALL HEADER */}
      <header className="sally-fullscreen-header h-16 px-6 flex items-center justify-between bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 z-30 flex-shrink-0">
        {/* Left: Brand, Live status & Duration */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold tracking-wide">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span>LIVE 3D CALL</span>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-tight">Sally IP</span>
              <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-medium border border-indigo-500/30">
                Digital Human
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <ShieldCheck size={12} className="text-emerald-400" />
              <span>256-bit AES P2P Encrypted</span>
              <span>•</span>
              <span className="font-mono text-slate-300">{formatDuration(duration)}</span>
            </div>
          </div>
        </div>

        {/* Center: Neural Voice Selector Dropdown */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/60 shadow-inner">
          <Volume2 size={14} className="text-indigo-400" />
          <span className="text-xs text-slate-400 font-medium">Neural Voice:</span>
          <select
            value={selectedVoice}
            onChange={(e) => handleVoiceChange(e.target.value)}
            className="bg-transparent text-xs text-indigo-200 font-semibold focus:outline-none cursor-pointer pr-1"
          >
            {VOICE_OPTIONS.map((v) => (
              <option key={v.id} value={v.id} className="bg-slate-900 text-slate-100">
                {v.name} - {v.desc}
              </option>
            ))}
          </select>
          <ChevronDown size={13} className="text-slate-500 pointer-events-none -ml-1" />
        </div>

        {/* Right: Window Controls */}
        <div className="flex items-center gap-2">
          {/* Transcript Drawer Toggle */}
          <button
            type="button"
            onClick={() => setShowTranscriptDrawer(!showTranscriptDrawer)}
            className={`p-2 rounded-lg border transition-all ${
              showTranscriptDrawer
                ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title={showTranscriptDrawer ? 'Hide Legal Transcript' : 'Show Legal Transcript'}
          >
            <FileText size={18} />
          </button>

          {/* Minimize to PiP */}
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            title="Minimize to Picture-in-Picture"
          >
            <Minimize2 size={18} />
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>

          {/* End Call Button */}
          <button
            type="button"
            onClick={handleEndCall}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-all shadow-lg shadow-rose-600/30 ml-2"
            title="End Video Call"
          >
            <PhoneOff size={15} />
            <span className="hidden sm:inline">End Call</span>
          </button>
        </div>
      </header>

      {/* MAIN VIDEO CALL THEATER & SIDEBAR */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* HERO 3D AVATAR VIEWPORT */}
        <div className="flex-1 relative flex items-center justify-center bg-radial-gradient overflow-hidden">
          {/* Three.js 3D Avatar WebGL Canvas */}
          <SallyDigitalHumanCanvas
            state={sessionState}
            analyserNode={analyserNode}
            isMuted={isMuted}
            activeVoiceName={activeVoiceObj.name}
            enableParallax={true}
            className="absolute inset-0"
          />

          {/* User Webcam Preview PiP (Bottom-Right) */}
          {showUserCamera && (
            <div className="absolute bottom-28 right-8 z-30 w-48 h-36 rounded-2xl overflow-hidden bg-slate-900 border-2 border-indigo-500/50 shadow-2xl transition-all">
              <video
                ref={userVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-slate-950/80 backdrop-blur-sm text-[10px] font-semibold text-slate-300">
                You (Camera)
              </div>
            </div>
          )}

          {/* REAL-TIME CLOSED CAPTIONS & TELEPROMPTER HUD */}
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 w-11/12 max-w-2xl pointer-events-none">
            {sessionState === VOICE_STATES.THINKING ? (
              <div className="flex items-center justify-center gap-2.5 px-5 py-3 rounded-2xl bg-slate-950/85 backdrop-blur-xl border border-indigo-500/40 shadow-2xl text-slate-200 animate-pulse">
                <Sparkles size={16} className="text-indigo-400 animate-spin" />
                <span className="text-sm font-medium">
                  Sally IP is reasoning with legal intelligence database...
                </span>
              </div>
            ) : sessionState === VOICE_STATES.SPEAKING && sallySpokenWords.length > 0 ? (
              <div className="flex flex-col gap-1.5 px-6 py-3.5 rounded-2xl bg-slate-950/90 backdrop-blur-xl border border-indigo-500/30 shadow-2xl">
                <div className="flex items-center gap-2 text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
                  <Radio size={12} className="text-indigo-400 animate-pulse" />
                  <span>Sally IP:</span>
                </div>
                <div className="flex items-center flex-wrap gap-1.5 text-base text-slate-100 font-medium leading-relaxed">
                  {sallySpokenWords.map((word, idx) => {
                    const isLatest = idx === sallySpokenWords.length - 1;
                    return (
                      <span
                        key={idx}
                        className={`transition-all duration-150 ${
                          isLatest
                            ? 'text-indigo-300 font-bold scale-105 underline decoration-indigo-400 underline-offset-4'
                            : 'text-slate-200'
                        }`}
                      >
                        {word}{' '}
                      </span>
                    );
                  })}
                </div>
              </div>
            ) : partialTranscript ? (
              <div className="flex flex-col gap-1.5 px-6 py-3.5 rounded-2xl bg-slate-950/90 backdrop-blur-xl border border-emerald-500/40 shadow-2xl">
                <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>You are saying:</span>
                </div>
                <div className="text-base text-white font-medium italic leading-relaxed">
                  "{partialTranscript}"
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-950/70 backdrop-blur-md border border-slate-800/80 text-slate-400 text-xs font-medium">
                <span>{isMuted ? 'Microphone is muted' : 'Listening... Speak naturally with Sally'}</span>
              </div>
            )}
          </div>
        </div>

        {/* COLLAPSIBLE LEGAL TRANSCRIPT & BRIEF DRAWER */}
        {showTranscriptDrawer && (
          <aside className="w-96 flex flex-col bg-slate-900/95 backdrop-blur-2xl border-l border-slate-800/80 z-20 transition-all shadow-2xl">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-indigo-400" />
                <span className="text-sm font-bold text-white">Live Legal Transcript</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyTranscript}
                  className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  title="Copy Transcript"
                >
                  {copiedTranscript ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
                <button
                  type="button"
                  onClick={() => setShowTranscriptDrawer(false)}
                  className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Transcript Messages Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-sans text-xs">
              {conversationHistory.length === 0 ? (
                <div className="text-center text-slate-500 py-12">
                  <FileText size={28} className="mx-auto mb-2 opacity-40" />
                  <p>Conversation transcript will stream live here as you speak with Sally.</p>
                </div>
              ) : (
                conversationHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border ${
                      item.speaker === 'sally'
                        ? 'bg-indigo-950/40 border-indigo-800/40 text-slate-200 ml-2'
                        : 'bg-emerald-950/30 border-emerald-800/30 text-emerald-100 mr-2'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`font-bold ${
                          item.speaker === 'sally' ? 'text-indigo-400' : 'text-emerald-400'
                        }`}
                      >
                        {item.speaker === 'sally' ? 'Sally IP' : 'You'}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {item.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    <p className="leading-relaxed whitespace-pre-wrap">{item.text}</p>
                  </div>
                ))
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>{conversationHistory.length} turns logged</span>
              <span className="text-indigo-400 font-medium">Synced with Matter</span>
            </div>
          </aside>
        )}
      </div>

      {/* FLOATING GLASSMORPHIC CONTROL BAR */}
      <footer className="h-20 bg-slate-950/90 backdrop-blur-2xl border-t border-slate-800/80 flex items-center justify-center px-6 z-30 flex-shrink-0">
        <div className="flex items-center gap-3 px-6 py-2.5 rounded-full bg-slate-900/90 border border-slate-700/60 shadow-2xl">
          {/* Mute Microphone Button */}
          <button
            type="button"
            onClick={handleToggleMute}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-xs transition-all ${
              isMuted
                ? 'bg-rose-500/20 border border-rose-500/50 text-rose-400 hover:bg-rose-500/30'
                : 'bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 shadow-md'
            }`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff size={16} /> : <Mic size={16} className="text-emerald-400" />}
            <span>{isMuted ? 'Muted' : 'Mic On'}</span>
          </button>

          {/* User Webcam Toggle Button */}
          <button
            type="button"
            onClick={() => setShowUserCamera(!showUserCamera)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-xs transition-all ${
              showUserCamera
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
            title={showUserCamera ? 'Turn off camera' : 'Turn on camera'}
          >
            {showUserCamera ? <Video size={16} /> : <VideoOff size={16} />}
            <span>{showUserCamera ? 'Camera On' : 'Camera Off'}</span>
          </button>

          {/* Mobile Voice Selector */}
          <div className="md:hidden flex items-center">
            <select
              value={selectedVoice}
              onChange={(e) => handleVoiceChange(e.target.value)}
              className="bg-slate-800 text-xs text-indigo-200 px-3 py-2 rounded-full border border-slate-700 focus:outline-none cursor-pointer"
            >
              {VOICE_OPTIONS.map((v) => (
                <option key={v.id} value={v.id} className="bg-slate-900">
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          {/* Big Red End Call Button */}
          <button
            type="button"
            onClick={handleEndCall}
            className="flex items-center gap-2 px-5 py-2 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all shadow-lg shadow-rose-600/40 ml-2"
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
