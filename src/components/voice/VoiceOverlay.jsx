import React, { useState, useEffect, useRef } from 'react';
import { X, Volume2, ShieldCheck } from 'lucide-react';
import { VOICE_STATES } from '../../voice/types.js';
import { VoiceSessionController } from '../../voice/VoiceSessionController.js';
import { VoiceOrb } from './VoiceOrb.jsx';
import { VoiceStatus } from './VoiceStatus.jsx';
import { LiveTranscript } from './LiveTranscript.jsx';
import '../voice-chat-widget.css';

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

  const controllerRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      if (controllerRef.current) {
        controllerRef.current.stop();
        controllerRef.current = null;
      }
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

  return (
    <div className="voice-overlay-container">
      <div className="voice-card">
        {/* Header */}
        <div className="voice-card-header">
          <div className="voice-header-left">
            <span className="voice-header-title">Sally Full-Duplex Voice</span>
            <div className="voice-header-badge">
              <ShieldCheck size={12} color="#059669" />
              <span>Fish Audio S2.1</span>
            </div>
          </div>
          <button
            type="button"
            className="voice-icon-btn"
            onClick={() => {
              controllerRef.current?.stop();
              onClose?.();
            }}
            title="Close"
          >
            <X size={17} />
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
