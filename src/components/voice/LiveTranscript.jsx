import React from 'react';
import { Sparkles, Square } from 'lucide-react';
import { VOICE_STATES } from '../../voice/types.js';

export function LiveTranscript({
  partialTranscript = '',
  sallyWordsWindow = [],
  lastUserText = '',
  state = VOICE_STATES.IDLE,
  onManualStop,
}) {
  const isListeningOrCapturing =
    state === VOICE_STATES.LISTENING ||
    state === VOICE_STATES.CAPTURING ||
    state === VOICE_STATES.SPEECH_DETECTED;
  const isThinking = state === VOICE_STATES.THINKING;
  const isSpeaking = state === VOICE_STATES.SPEAKING;

  return (
    <div style={{ marginTop: '14px', width: '100%', maxWidth: '380px', margin: '14px auto 0 auto' }}>
      {/* 1. When listening / capturing: show live transcription typing out */}
      {isListeningOrCapturing && (
        <div className="voice-live-transcript-bubble">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span className="voice-live-mic-icon">🎙️</span>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {partialTranscript ? 'Live typing...' : 'Listening...'}
            </span>
          </div>
          <div style={{ fontSize: '14px', color: '#0f172a', fontStyle: 'normal', minHeight: '22px' }}>
            {partialTranscript ? (
              <span>
                "{partialTranscript}"
                <span className="beebotStreamingCursor" style={{ display: 'inline-block', width: '2px', height: '14px', background: '#6366f1', marginLeft: '3px', verticalAlign: 'middle' }} />
              </span>
            ) : (
              <span style={{ color: '#94a3b8', fontSize: '13px' }}>
                Speak clearly — your words type here live as you talk...
              </span>
            )}
          </div>
        </div>
      )}

      {/* 2. When thinking: Answering to your sentences... */}
      {isThinking && (
        <div className="beebotAnsweringBanner" style={{ margin: '0 auto', maxWidth: '340px' }}>
          <div className="flex items-center gap-2">
            <div className="beebotAnsweringOrb" />
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              Answering to your sentences...
            </span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-500 animate-pulse" />
            <span>Reasoning & voice reply</span>
          </div>
        </div>
      )}

      {/* 3. When speaking: 7-word rolling teleprompter */}
      {isSpeaking && (
        <div style={{ width: '100%' }}>
          {sallyWordsWindow.length > 0 && (
            <div className="beebotTeleprompterStrip" style={{ margin: '0 auto 8px auto', maxWidth: '360px' }}>
              <div className="beebotTeleprompterHeader flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="beebotSpeakingWave">
                    <span className="bar b1" />
                    <span className="bar b2" />
                    <span className="bar b3" />
                    <span className="bar b4" />
                  </div>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    Sally is speaking...
                  </span>
                </div>
              </div>
              <div className="beebotRollingWordsLine" style={{ justifyContent: 'center' }}>
                {sallyWordsWindow.map((word, idx) => {
                  const isLatest = idx === sallyWordsWindow.length - 1;
                  return (
                    <span
                      key={idx}
                      className={`beebotRollingWord ${isLatest ? 'active-word' : 'prior-word'}`}
                    >
                      {word}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Visible barge-in / interrupt button */}
          <div style={{ textAlign: 'center', marginTop: '6px' }}>
            <button
              type="button"
              className="voice-interrupt-pill-btn"
              onClick={onManualStop}
              title="Click or simply start talking to interrupt"
            >
              ✋ Tap or speak to interrupt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LiveTranscript;
