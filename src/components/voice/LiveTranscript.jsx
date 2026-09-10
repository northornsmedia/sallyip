import React from 'react';
import { VOICE_STATES } from '../../voice/types.js';

export function LiveTranscript({
  partialTranscript = '',
  state = VOICE_STATES.IDLE,
  onManualStop,
}) {
  const isListeningOrCapturing = state === VOICE_STATES.LISTENING || state === VOICE_STATES.CAPTURING || state === VOICE_STATES.SPEECH_DETECTED;
  const isSpeaking = state === VOICE_STATES.SPEAKING;

  return (
    <div style={{ marginTop: '10px' }}>
      {/* Real-time streaming partial transcription of user's voice */}
      {isListeningOrCapturing && partialTranscript && (
        <div className="voice-live-transcript-bubble">
          <span className="voice-live-mic-icon">🎙️</span>
          <em>"{partialTranscript}"</em>
        </div>
      )}

      {/* Visible barge-in button while assistant is speaking */}
      {isSpeaking && (
        <div style={{ textAlign: 'center', marginTop: '8px' }}>
          <button
            type="button"
            className="voice-interrupt-pill-btn"
            onClick={onManualStop}
            title="Click or simply start talking to interrupt"
          >
            ✋ Tap or speak to interrupt
          </button>
        </div>
      )}
    </div>
  );
}

export default LiveTranscript;
