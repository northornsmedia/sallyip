import React from 'react';
import { VOICE_STATES } from '../../voice/types.js';

const formatTime = (seconds) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

const STATE_COPY = {
  [VOICE_STATES.REQUESTING_MIC_PERMISSION]: ['Connecting microphone', 'permission'],
  [VOICE_STATES.LISTENING]: ['Listening', 'listening'],
  [VOICE_STATES.SPEECH_DETECTED]: ['I hear you', 'listening'],
  [VOICE_STATES.CAPTURING]: ['Capturing your thought', 'listening'],
  [VOICE_STATES.TRANSCRIBING]: ['Understanding', 'thinking'],
  [VOICE_STATES.THINKING]: ['Sally is thinking', 'thinking'],
  [VOICE_STATES.SPEAKING]: ['Sally is speaking', 'speaking'],
  [VOICE_STATES.INTERRUPTING]: ['Pausing reply', 'interrupting'],
  [VOICE_STATES.CANCELLING]: ['Ending session', 'interrupting'],
  [VOICE_STATES.ERROR]: ['Connection needs attention', 'error'],
};

export function VoiceStatus({ state, duration = 0 }) {
  if (state === VOICE_STATES.IDLE || state === VOICE_STATES.DISCONNECTED) {
    return (
      <div className="voice-status-idle" aria-live="polite">
        <strong>Ready when you are</strong>
        <span>Tap the orb and speak naturally. Sally listens, responds, and can be interrupted at any time.</span>
      </div>
    );
  }
  const [label, style] = STATE_COPY[state] || ['Session active', 'listening'];
  return (
    <div className="voice-status-wrap" aria-live="polite">
      <div className={`voice-status-badge ${style}`}>
        <span className={`voice-status-dot ${style}`} />
        <span>{label}</span>
        <span className="voice-status-time">{formatTime(duration)}</span>
      </div>
      <div className={`voice-live-audio-bars ${style === 'listening' ? 'listening-bars' : ''}`} aria-hidden="true">
        {Array.from({ length: 7 }, (_, index) => <span className="voice-live-bar" key={index} />)}
      </div>
    </div>
  );
}

export default VoiceStatus;
