import React from 'react';
import { Mic, MicOff } from 'lucide-react';
import { VOICE_STATES } from '../../voice/types.js';

export function VoiceButton({
  state = VOICE_STATES.IDLE,
  onClick,
  className = '',
  size = 20,
}) {
  const isActive = state !== VOICE_STATES.IDLE && state !== VOICE_STATES.DISCONNECTED;

  return (
    <button
      type="button"
      className={`voice-trigger-btn ${isActive ? 'is-active' : ''} ${className}`}
      onClick={onClick}
      title={isActive ? 'End voice call' : 'Start conversational voice mode'}
      aria-label="Toggle Conversational Voice Mode"
    >
      {isActive ? <MicOff size={size} /> : <Mic size={size} />}
    </button>
  );
}

export default VoiceButton;
