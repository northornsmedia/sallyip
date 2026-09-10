import React from 'react';
import { Phone, PhoneOff, Mic, Square } from 'lucide-react';
import { VOICE_STATES } from '../../voice/types.js';

export function VoiceOrb({
  state = VOICE_STATES.IDLE,
  onToggleCall,
  onManualStop,
  rms = 0,
}) {
  const isSpeaking = state === VOICE_STATES.SPEAKING;
  const isListening = state === VOICE_STATES.LISTENING;
  const isSpeechDetected = state === VOICE_STATES.SPEECH_DETECTED || state === VOICE_STATES.CAPTURING;
  const isThinking = state === VOICE_STATES.THINKING;
  const isInterrupting = state === VOICE_STATES.INTERRUPTING;
  const isActive = state !== VOICE_STATES.IDLE && state !== VOICE_STATES.DISCONNECTED;

  // Compute dynamic scale based on mic energy (rms)
  const dynamicScale = isSpeechDetected ? Math.min(1.2, 1 + rms * 2) : 1;

  return (
    <div className="voice-orb-stage">
      {/* Outer Glow */}
      <div
        className={`voice-orb-glow ${isActive ? 'active' : ''} ${isSpeaking ? 'speaking' : ''} ${isInterrupting ? 'interrupting' : ''}`}
      />

      {/* Wave expansion rings when active */}
      {isActive && (
        <>
          <div className="voice-wave-ring" />
          <div className="voice-wave-ring delay-1" />
          <div className="voice-wave-ring delay-2" />
        </>
      )}

      {/* Main Orb Sphere */}
      <div
        className="voice-orb-container"
        style={{ transform: `scale(${dynamicScale})`, transition: 'transform 0.1s ease-out' }}
      >
        <div
          className={`voice-orb-gradient ${isSpeaking ? 'speaking' : ''} ${isThinking ? 'thinking' : ''} ${isInterrupting ? 'interrupting' : ''} ${isSpeechDetected ? 'hearing' : ''}`}
        />
        <div className="voice-orb-noise" />

        {/* Center Control Button */}
        {isSpeaking ? (
          <button
            type="button"
            className="voice-call-center-btn is-active interrupt-btn"
            onClick={onManualStop}
            title="Interrupt Sally (or just speak)"
            aria-label="Interrupt Sally"
          >
            <Square size={20} fill="#ffffff" />
          </button>
        ) : (
          <button
            type="button"
            className={`voice-call-center-btn ${isActive ? 'is-active' : ''}`}
            onClick={onToggleCall}
            title={isActive ? 'End Voice Session' : 'Start Conversational Voice Mode'}
            aria-label="Toggle Voice Session"
          >
            {isActive ? (
              <PhoneOff size={22} />
            ) : (
              <Phone size={22} fill="#111827" strokeWidth={0} />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default VoiceOrb;
