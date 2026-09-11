import React from 'react';
import { VOICE_STATES } from '../../voice/types.js';

export function VoiceStatus({ state, duration = 0 }) {
  if (state === VOICE_STATES.IDLE || state === VOICE_STATES.DISCONNECTED) {
    return (
      <p className="voice-subtitle">
        Real-time full-duplex conversational voice powered by Microsoft Edge Neural TTS
      </p>
    );
  }

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getStateLabel = () => {
    switch (state) {
      case VOICE_STATES.REQUESTING_MIC_PERMISSION:
        return 'Requesting microphone...';
      case VOICE_STATES.LISTENING:
        return 'Listening to your mic...';
      case VOICE_STATES.SPEECH_DETECTED:
      case VOICE_STATES.CAPTURING:
        return 'Hearing speech...';
      case VOICE_STATES.TRANSCRIBING:
        return 'Processing audio...';
      case VOICE_STATES.THINKING:
        return 'Sally thinking...';
      case VOICE_STATES.SPEAKING:
        return 'Sally AI speaking...';
      case VOICE_STATES.INTERRUPTING:
        return 'Interrupting...';
      case VOICE_STATES.CANCELLING:
        return 'Cancelling...';
      case VOICE_STATES.ERROR:
        return 'Voice connection error';
      default:
        return 'Active';
    }
  };

  const getBadgeClass = () => {
    if (state === VOICE_STATES.SPEAKING) return 'speaking';
    if (state === VOICE_STATES.INTERRUPTING) return 'interrupting';
    if (state === VOICE_STATES.THINKING) return 'thinking';
    if (state === VOICE_STATES.ERROR) return 'error';
    return 'listening';
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '16px' }}>
      <div className={`voice-status-badge ${getBadgeClass()}`}>
        <span className={`voice-status-dot ${getBadgeClass()}`} />
        <span>
          {getStateLabel()} · {formatTime(duration)}
        </span>
      </div>

      <div className={`voice-live-audio-bars ${state === VOICE_STATES.LISTENING || state === VOICE_STATES.CAPTURING ? 'listening-bars' : ''}`}>
        <span className="voice-live-bar" />
        <span className="voice-live-bar" />
        <span className="voice-live-bar" />
        <span className="voice-live-bar" />
        <span className="voice-live-bar" />
      </div>
    </div>
  );
}

export default VoiceStatus;
