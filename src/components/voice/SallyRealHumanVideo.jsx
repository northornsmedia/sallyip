/**
 * SallyRealHumanVideo.jsx
 *
 * Real Human Video Stream Engine for Sally IP.
 * ZERO 3D cartoon avatars, ZERO polygon meshes, ZERO GPU cluster cost.
 *
 * Capabilities:
 * - High-definition video footage of a real human female legal attorney (Sally)
 * - Seamless dual-stream video cross-fading:
 *     - Listening / Idle Stream: Real woman looking at camera, blinking, breathing, listening attentively
 *     - Speaking Stream: Real woman speaking directly to the user with natural human cadence
 * - Audio-reactive video cadence synchronized with Microsoft Edge Neural TTS playback
 * - Pure client-side execution in Vanilla CSS and HTML5 Video
 */

import React, { useRef, useEffect, useState } from 'react';
import { Sparkles, Radio } from 'lucide-react';
import { VOICE_STATES } from '../../voice/types.js';

export function SallyRealHumanVideo({
  state = VOICE_STATES.IDLE,
  analyserNode = null,
  isMuted = false,
  activeVoiceName = 'Aria (Neural)',
  className = '',
  poster = '/images/sally_human_avatar.jpg',
  onVideoError = null,
}) {
  const listeningVideoRef = useRef(null);
  const speakingVideoRef = useRef(null);
  const containerRef = useRef(null);
  const [activeStream, setActiveStream] = useState('listening'); // 'listening' | 'speaking'
  const [audioLevel, setAudioLevel] = useState(0);
  const [visible, setVisible] = useState(true);
  const animFrameRef = useRef(null);
  const lastLevelRef = useRef(0);
  const lastUpdateRef = useRef(0);
  const speakingPreloadedRef = useRef(false);

  const reportError = () => { try { onVideoError && onVideoError(); } catch {} };

  // Pause both streams when tab hidden or viewport offscreen (perf + battery)
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        try { listeningVideoRef.current?.pause(); speakingVideoRef.current?.pause(); } catch {}
      } else if (visible) {
        try { (activeStream === 'speaking' ? speakingVideoRef.current : listeningVideoRef.current)?.play()?.catch(() => {}); } catch {}
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [visible, activeStream]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => {
        setVisible(e.isIntersecting);
        if (!e.isIntersecting) {
          try { listeningVideoRef.current?.pause(); speakingVideoRef.current?.pause(); } catch {}
        }
      });
    }, { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Synchronize video streams based on conversational state
  useEffect(() => {
    const isSpeaking = state === VOICE_STATES.SPEAKING;
    setActiveStream(isSpeaking ? 'speaking' : 'listening');

    const lVid = listeningVideoRef.current;
    const sVid = speakingVideoRef.current;
    if (document.hidden || !visible) return;

    if (isSpeaking) {
      if (sVid) {
        // Preload speaking clip on first use instead of at mount (saves ~1.8MB initial)
        if (!speakingPreloadedRef.current) {
          speakingPreloadedRef.current = true;
          try { sVid.preload = 'auto'; sVid.load(); } catch {}
        }
        try { sVid.currentTime = 0; } catch {}
        sVid.play().catch(() => {});
      }
    } else {
      if (lVid && lVid.paused) {
        lVid.play().catch(() => {});
      }
      if (sVid) {
        sVid.pause();
      }
    }
  }, [state, visible]);

  // Ensure listening video autoplays in loop
  useEffect(() => {
    const lVid = listeningVideoRef.current;
    if (lVid && visible && !document.hidden) {
      lVid.play().catch(() => {});
    }
  }, [visible]);

  // WebAudio Analyser loop for audio reactive rim glow (throttled to ~10fps to avoid re-render storm)
  useEffect(() => {
    if (!analyserNode) return;
    const freqData = new Uint8Array(32);

    const checkAudio = (t) => {
      if (state === VOICE_STATES.SPEAKING && visible && !document.hidden) {
        try {
          analyserNode.getByteFrequencyData(freqData);
          let sum = 0;
          for (let i = 0; i < 32; i++) sum += freqData[i];
          const avg = sum / (32 * 255);
          if (Math.abs(avg - lastLevelRef.current) > 0.05 && t - lastUpdateRef.current > 100) {
            lastLevelRef.current = avg;
            lastUpdateRef.current = t;
            setAudioLevel(avg);
          }
        } catch {
          if (lastLevelRef.current !== 0) { lastLevelRef.current = 0; setAudioLevel(0); }
        }
      } else if (lastLevelRef.current !== 0) {
        lastLevelRef.current = 0;
        setAudioLevel(0);
      }
      animFrameRef.current = requestAnimationFrame(checkAudio);
    };

    animFrameRef.current = requestAnimationFrame(checkAudio);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [analyserNode, state, visible]);

  return (
    <div
      ref={containerRef}
      className={`sally-real-video-container ${className}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: '#070b14',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Listening / Idle Real Human Video Stream */}
      <video
        ref={listeningVideoRef}
        src="/videos/sally_real_listening.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        poster={poster}
        aria-label="Sally listening"
        onError={reportError}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: activeStream === 'listening' ? 1 : 0,
          transition: 'opacity 0.35s ease-in-out',
          zIndex: 1,
        }}
      />

      {/* Speaking Real Human Video Stream (deferred load until first speak) */}
      <video
        ref={speakingVideoRef}
        src="/videos/sally_real_speaking.mp4"
        loop
        muted
        playsInline
        preload="none"
        poster={poster}
        aria-label="Sally speaking"
        onError={reportError}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: activeStream === 'speaking' ? 1 : 0,
          transition: 'opacity 0.35s ease-in-out',
          zIndex: 2,
        }}
      />

      {/* Subtle Cinematic Studio Vignette & Glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          boxShadow:
            state === VOICE_STATES.SPEAKING
              ? `inset 0 0 ${60 + audioLevel * 100}px rgba(99, 102, 241, 0.35)`
              : state === VOICE_STATES.LISTENING
              ? 'inset 0 0 50px rgba(16, 185, 129, 0.25)'
              : 'inset 0 0 80px rgba(0, 0, 0, 0.6)',
          transition: 'box-shadow 0.3s ease',
          zIndex: 5,
        }}
      />

      {/* Live State Aura Badge (Top-Left) */}
      <div
        className="sally-canvas-badge-left"
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          zIndex: 20,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          borderRadius: '9999px',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          fontSize: '12px',
          color: '#e2e8f0',
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor:
              state === VOICE_STATES.SPEAKING
                ? '#6366f1'
                : state === VOICE_STATES.LISTENING
                ? '#10b981'
                : state === VOICE_STATES.THINKING
                ? '#f59e0b'
                : '#94a3b8',
            display: 'inline-block',
            boxShadow:
              state === VOICE_STATES.SPEAKING
                ? '0 0 8px #6366f1'
                : state === VOICE_STATES.LISTENING
                ? '0 0 8px #10b981'
                : 'none',
          }}
        />
        <span style={{ fontWeight: 700, color: '#ffffff' }}>Sally IP</span>
        <span style={{ color: '#64748b' }}>•</span>
        <span style={{ color: '#a5b4fc', textTransform: 'capitalize', fontWeight: 600 }}>
          {state === VOICE_STATES.SPEAKING
            ? 'Speaking'
            : state === VOICE_STATES.LISTENING
            ? 'Listening'
            : state === VOICE_STATES.THINKING
            ? 'Reasoning'
            : 'Live Video'}
        </span>
      </div>

      {/* Live Voice Indicator Pill (Top-Right) */}
      <div
        className="sally-canvas-badge-right"
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          zIndex: 20,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 14px',
          borderRadius: '9999px',
          background: 'rgba(30, 27, 75, 0.75)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(99, 102, 241, 0.4)',
          fontSize: '11px',
          color: '#c7d2fe',
        }}
      >
        <span>Real Human Video</span>
        <span style={{ color: '#64748b' }}>•</span>
        <span style={{ color: '#ffffff', fontWeight: 700 }}>{activeVoiceName}</span>
      </div>
    </div>
  );
}

export default SallyRealHumanVideo;
