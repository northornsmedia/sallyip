import React, { useEffect, useRef, useState } from 'react';
import { VOICE_STATES } from '../../voice/types.js';

const STATE_COPY = {
  [VOICE_STATES.REQUESTING_MIC_PERMISSION]: 'Connecting',
  [VOICE_STATES.LISTENING]: 'Listening',
  [VOICE_STATES.SPEECH_DETECTED]: 'Listening',
  [VOICE_STATES.CAPTURING]: 'Listening',
  [VOICE_STATES.TRANSCRIBING]: 'Thinking',
  [VOICE_STATES.THINKING]: 'Thinking',
  [VOICE_STATES.SPEAKING]: 'Speaking',
  [VOICE_STATES.INTERRUPTING]: 'Listening',
  [VOICE_STATES.ERROR]: 'Needs attention',
};

export function SallyAvatarMark({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 64 64" role="img" aria-label="Sally digital avatar">
      <defs>
        <linearGradient id="sally-mark-bg" x1="10" y1="8" x2="54" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#4338ca" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="31" fill="url(#sally-mark-bg)" />
      <path d="M18 56c1-10 6-15 14-15s13 5 14 15" fill="#10162b" />
      <ellipse cx="32" cy="28" rx="13" ry="15" fill="#dca887" />
      <path d="M19 29c-1-13 5-20 14-20 10 0 16 8 13 22-2-6-5-12-13-13-5 4-9 6-14 6z" fill="#251c3f" />
      <path d="M24 29h6M35 29h5" stroke="#35263d" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M28 36c3 2 6 2 9 0" stroke="#8f3f55" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M27 42l5 8 5-8" fill="#f4f0ff" />
    </svg>
  );
}

export function SallyAnimatedAvatar({
  state = VOICE_STATES.IDLE,
  analyserNode = null,
  activeVoiceName = 'Aria',
  className = '',
}) {
  const [mouthOpen, setMouthOpen] = useState(0.08);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const frameRef = useRef(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const move = (event) => {
      const x = Math.max(-1, Math.min(1, (event.clientX / window.innerWidth) * 2 - 1));
      const y = Math.max(-1, Math.min(1, (event.clientY / window.innerHeight) * 2 - 1));
      setLook({ x: x * 2.3, y: y * 1.5 });
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, []);

  useEffect(() => {
    const samples = analyserNode ? new Uint8Array(analyserNode.frequencyBinCount) : null;
    let smooth = 0;
    const update = (time) => {
      let target = 0.06;
      if (stateRef.current === VOICE_STATES.SPEAKING) {
        if (analyserNode && samples) {
          analyserNode.getByteFrequencyData(samples);
          let total = 0;
          const upper = Math.min(samples.length, 72);
          for (let i = 2; i < upper; i += 1) total += samples[i];
          target = Math.min(1, Math.max(0.12, total / Math.max(1, (upper - 2) * 105)));
        } else {
          target = 0.28 + Math.abs(Math.sin(time * 0.012)) * 0.48;
        }
      }
      smooth += (target - smooth) * 0.34;
      setMouthOpen(smooth);
      frameRef.current = requestAnimationFrame(update);
    };
    frameRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameRef.current);
  }, [analyserNode]);

  const status = STATE_COPY[state] || 'Ready';
  const isSpeaking = state === VOICE_STATES.SPEAKING;
  const isThinking = state === VOICE_STATES.THINKING || state === VOICE_STATES.TRANSCRIBING;
  const mouthHeight = 3 + mouthOpen * 14;

  return (
    <div className={`sally-avatar-stage ${className}`} data-state={state.toLowerCase()}>
      <div className="sally-avatar-ambient" aria-hidden="true">
        <i /><i /><i />
      </div>
      <div className={`sally-avatar-presence ${isSpeaking ? 'is-speaking' : ''} ${isThinking ? 'is-thinking' : ''}`}>
        <div className="sally-avatar-halo" aria-hidden="true" />
        <svg className="sally-avatar-figure" viewBox="0 0 720 720" role="img" aria-label={`Sally digital avatar, ${status.toLowerCase()}`}>
          <defs>
            <linearGradient id="sally-jacket" x1="235" y1="515" x2="510" y2="708" gradientUnits="userSpaceOnUse">
              <stop stopColor="#242b48" />
              <stop offset="1" stopColor="#101526" />
            </linearGradient>
            <linearGradient id="sally-shirt" x1="358" y1="516" x2="358" y2="695" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ffffff" />
              <stop offset="1" stopColor="#dcdcf4" />
            </linearGradient>
            <linearGradient id="sally-hair" x1="260" y1="190" x2="478" y2="500" gradientUnits="userSpaceOnUse">
              <stop stopColor="#302448" />
              <stop offset="0.55" stopColor="#19162b" />
              <stop offset="1" stopColor="#0f1020" />
            </linearGradient>
            <radialGradient id="sally-skin" cx="0" cy="0" r="1" gradientTransform="translate(326 290) rotate(57) scale(230 190)" gradientUnits="userSpaceOnUse">
              <stop stopColor="#f2c7aa" />
              <stop offset="0.65" stopColor="#dca483" />
              <stop offset="1" stopColor="#bd7f68" />
            </radialGradient>
            <filter id="sally-shadow" x="130" y="110" width="470" height="620" filterUnits="userSpaceOnUse">
              <feDropShadow dx="0" dy="26" stdDeviation="28" floodColor="#050711" floodOpacity=".56" />
            </filter>
          </defs>

          <g filter="url(#sally-shadow)" className="sally-avatar-body">
            <path d="M139 720c9-119 77-190 168-204l51 38 53-38c92 14 160 85 170 204H139z" fill="url(#sally-jacket)" />
            <path d="M307 513l51 41 53-41 47 207H260l47-207z" fill="url(#sally-shirt)" />
            <path d="M307 513l51 41-49 62-54-76 52-27zM411 513l-53 41 50 62 55-76-52-27z" fill="#303957" />
            <path d="M327 456h64v86c-18 20-44 20-64 0v-86z" fill="#cb8f72" />

            <g className="sally-avatar-head" style={{ transform: `translate(${look.x * 0.35}px, ${look.y * 0.25}px)` }}>
              <path d="M238 316c-6-116 42-182 124-182 91 0 139 76 116 200l-27 149-91 45-96-51-26-161z" fill="url(#sally-hair)" />
              <path d="M267 304c0-90 38-142 95-142 62 0 100 54 98 142l-8 84c-7 66-43 112-91 112-51 0-87-47-94-112l-8-84h8z" fill="url(#sally-skin)" />
              <path d="M260 310c1-101 36-153 105-153 56 0 91 39 100 107-20-20-39-39-52-66-34 45-85 73-153 81v31z" fill="url(#sally-hair)" />
              <path d="M267 290c-19 14-25 43-18 73 5 21 15 31 29 27l-11-100zM452 290c19 14 25 43 18 73-5 21-15 31-29 27l11-100z" fill="#cf9276" />

              <g className="sally-avatar-eyes">
                <path d="M293 327c14-12 35-12 50 0-16 13-35 13-50 0z" fill="#fff8f1" />
                <path d="M378 327c14-12 35-12 50 0-16 13-35 13-50 0z" fill="#fff8f1" />
                <g style={{ transform: `translate(${look.x}px, ${look.y}px)` }}>
                  <circle cx="319" cy="328" r="8.5" fill="#49656a" /><circle cx="404" cy="328" r="8.5" fill="#49656a" />
                  <circle cx="319" cy="328" r="4.4" fill="#10151f" /><circle cx="404" cy="328" r="4.4" fill="#10151f" />
                  <circle cx="316" cy="325" r="1.7" fill="#fff" /><circle cx="401" cy="325" r="1.7" fill="#fff" />
                </g>
              </g>
              <path d="M290 305c17-10 38-10 55 0M376 305c16-10 37-10 54 0" stroke="#6e493f" strokeWidth="8" strokeLinecap="round" fill="none" />
              <path d="M353 326c-1 29-7 55-13 66 10 9 24 10 36 3" stroke="#b87965" strokeWidth="5" fill="none" strokeLinecap="round" />
              <g className="sally-avatar-mouth" transform={`translate(0 ${mouthOpen * 2})`}>
                <rect x="329" y={423 - mouthHeight / 2} width="65" height={mouthHeight} rx={mouthHeight / 2} fill="#682d48" />
                {mouthOpen > 0.22 && <path d="M334 423c8-6 47-6 55 0-11 5-43 5-55 0z" fill="#f7e6df" opacity=".92" />}
                <path d="M329 421c17-9 47-9 65 0M331 426c17 11 44 11 61 0" stroke="#a54e68" strokeWidth="3.5" fill="none" strokeLinecap="round" />
              </g>
              <path d="M293 453c11 28 36 47 68 47 31 0 56-19 68-47" stroke="#c58b76" strokeWidth="3" fill="none" opacity=".5" />
              <path d="M456 246c20 63 13 171-15 231 49-27 61-177 15-231zM266 248c-18 64-12 170 12 230-46-27-58-172-12-230z" fill="url(#sally-hair)" />
            </g>
          </g>
        </svg>

        <div className="sally-avatar-status" aria-live="polite">
          <span className="sally-avatar-status-dot" />
          <span>{status}</span>
          {isSpeaking && <span className="sally-avatar-wave" aria-hidden="true"><i /><i /><i /><i /></span>}
        </div>
      </div>

      <div className="sally-avatar-identity">
        <span className="sally-avatar-ai-dot" />
        <span>Digital avatar</span>
        <span aria-hidden="true">·</span>
        <strong>{activeVoiceName}</strong>
      </div>
    </div>
  );
}

export default SallyAnimatedAvatar;
