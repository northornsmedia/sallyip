import React from 'react';
import { Phone, PhoneOff, Square } from 'lucide-react';
import { VOICE_STATES } from '../../voice/types.js';

export function VoiceOrb({ state = VOICE_STATES.IDLE, onToggleCall, onManualStop, rms = 0 }) {
  const isSpeaking = state === VOICE_STATES.SPEAKING;
  const isThinking = state === VOICE_STATES.THINKING;
  const isInterrupting = state === VOICE_STATES.INTERRUPTING;
  const isSpeechDetected = state === VOICE_STATES.SPEECH_DETECTED || state === VOICE_STATES.CAPTURING;
  const isActive = state !== VOICE_STATES.IDLE && state !== VOICE_STATES.DISCONNECTED;
  const dynamicScale = isSpeechDetected ? Math.min(1.16, 1 + rms * 1.7) : 1;

  return (
    <div className="voice-orb-stage">
      <div className="voice-orb-orbit orbit-one" aria-hidden="true"><span /></div>
      <div className="voice-orb-orbit orbit-two" aria-hidden="true"><span /></div>
      <div className={`voice-orb-glow ${isActive ? 'active' : ''} ${isSpeaking ? 'speaking' : ''} ${isInterrupting ? 'interrupting' : ''}`} />
      {isActive && <><div className="voice-wave-ring" /><div className="voice-wave-ring delay-1" /><div className="voice-wave-ring delay-2" /></>}
      <div className="voice-orb-container" style={{ '--voice-energy-scale': dynamicScale }}>
        <div className={`voice-orb-gradient ${isSpeaking ? 'speaking' : ''} ${isThinking ? 'thinking' : ''} ${isInterrupting ? 'interrupting' : ''} ${isSpeechDetected ? 'hearing' : ''}`} />
        <div className="voice-orb-noise" />
        <div className="voice-orb-glass" aria-hidden="true" />
        <button
          type="button"
          className={`voice-call-center-btn ${isActive ? 'is-active' : ''} ${isSpeaking ? 'interrupt-btn' : ''}`}
          onClick={isSpeaking ? onManualStop : onToggleCall}
          title={isSpeaking ? 'Interrupt Sally' : isActive ? 'End voice session' : 'Start voice conversation'}
          aria-label={isSpeaking ? 'Interrupt Sally' : isActive ? 'End voice session' : 'Start voice conversation'}
        >
          {isSpeaking ? <Square size={18} fill="currentColor" /> : isActive ? <PhoneOff size={21} /> : <Phone size={21} fill="currentColor" strokeWidth={0} />}
        </button>
      </div>
    </div>
  );
}

export default VoiceOrb;
