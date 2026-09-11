import React from 'react';
import { Sparkles, Hand } from 'lucide-react';
import { VOICE_STATES } from '../../voice/types.js';

export function LiveTranscript({ partialTranscript = '', sallyWordsWindow = [], lastUserText = '', state = VOICE_STATES.IDLE, onManualStop }) {
  const isListening = [VOICE_STATES.LISTENING, VOICE_STATES.CAPTURING, VOICE_STATES.SPEECH_DETECTED].includes(state);
  const isThinking = state === VOICE_STATES.THINKING || state === VOICE_STATES.TRANSCRIBING;
  const isSpeaking = state === VOICE_STATES.SPEAKING;

  return (
    <div className="voice-transcript-area" aria-live="polite">
      {isListening && (
        <div className="voice-live-transcript-bubble">
          <div className="voice-transcript-label-row">
            <span className="voice-live-mic-icon" aria-hidden="true" />
            <span className="voice-transcript-label">{partialTranscript ? 'Live transcript' : 'Listening for your voice'}</span>
          </div>
          <div className="voice-transcript-copy">
            {partialTranscript ? (
              <span>“{partialTranscript}”<span className="beebotStreamingCursor voice-transcript-cursor" /></span>
            ) : (
              <span className="voice-transcript-placeholder">Speak naturally — your words will appear here in real time.</span>
            )}
          </div>
        </div>
      )}

      {isThinking && (
        <div className="beebotAnsweringBanner">
          <div className="voice-thinking-copy"><div className="beebotAnsweringOrb" aria-hidden="true" /><span>Sally is thinking</span></div>
          {lastUserText && <div className="voice-thinking-prompt">“{lastUserText}”</div>}
          <div className="voice-thinking-meta"><Sparkles size={12} /><span>Preparing a grounded voice reply</span></div>
        </div>
      )}

      {isSpeaking && (
        <div className="voice-speaking-panel">
          <div className="beebotTeleprompterStrip">
            <div className="beebotTeleprompterHeader">
              <div className="beebotSpeakingWave" aria-hidden="true">
                <span className="bar b1" /><span className="bar b2" /><span className="bar b3" /><span className="bar b4" />
              </div>
              <span>Sally is speaking</span>
            </div>
            <div className="beebotRollingWordsLine">
              {sallyWordsWindow.length ? sallyWordsWindow.map((word, index) => (
                <span key={`${word}-${index}`} className={`beebotRollingWord ${index === sallyWordsWindow.length - 1 ? 'active-word' : 'prior-word'}`}>{word}</span>
              )) : <span className="voice-transcript-placeholder">Voice response is starting…</span>}
            </div>
          </div>
          <div className="voice-interrupt-row">
            <button type="button" className="voice-interrupt-pill-btn" onClick={onManualStop} title="Click or start talking to interrupt">
              <Hand size={13} /><span>Tap or speak to interrupt</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LiveTranscript;
