import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VoiceActivityDetector } from '../../src/voice/VoiceActivityDetector.js';
import { BargeInController } from '../../src/voice/BargeInController.js';
import { AudioPlaybackController } from '../../src/voice/AudioPlaybackController.js';

test('VoiceActivityDetector computes RMS energy accurately', () => {
  const vad = new VoiceActivityDetector();

  // Complete silence: 128 is center byte
  const silence = new Uint8Array(256).fill(128);
  const silenceRms = vad.computeRms(silence);
  assert.equal(silenceRms, 0);

  // Louder frame: alternating peaks
  const loud = new Uint8Array(256);
  for (let i = 0; i < loud.length; i++) {
    loud[i] = i % 2 === 0 ? 128 + 64 : 128 - 64;
  }
  const loudRms = vad.computeRms(loud);
  assert.ok(loudRms > 0.4, `Loud RMS should be > 0.4, got ${loudRms}`);
});

test('VoiceActivityDetector triggers onSpeechStart and onSpeechEnd with hysteresis', () => {
  const vad = new VoiceActivityDetector({
    minSpeechDurationMs: 50,
    silenceTimeoutMs: 100,
    energyThresholdListening: 0.02,
  });

  let speechStarted = false;
  let speechEnded = false;

  vad.onSpeechStart = () => { speechStarted = true; };
  vad.onSpeechEnd = () => { speechEnded = true; };

  const speechFrame = new Uint8Array(256).fill(160); // energy ~0.25
  const silenceFrame = new Uint8Array(256).fill(128);

  const t0 = 1000;
  // Frame 1 at t=0
  vad.processFrame(speechFrame, t0);
  assert.equal(speechStarted, false, 'Should not trigger immediately before minSpeechDurationMs');

  // Frame 2 at t=60ms (passed minSpeechDurationMs)
  vad.processFrame(speechFrame, t0 + 60);
  assert.equal(speechStarted, true, 'Should trigger speech start once minSpeechDurationMs passes');

  // Silence Frame at t=100ms
  vad.processFrame(silenceFrame, t0 + 100);
  assert.equal(speechEnded, false, 'Should not end speech immediately on first silent frame');

  // Silence Frame at t=250ms (passed silenceTimeoutMs)
  vad.processFrame(silenceFrame, t0 + 250);
  assert.equal(speechEnded, true, 'Should trigger speech end once silence timeout expires');
});

test('BargeInController halts playback instantly (<15ms) and records latency', () => {
  const playback = new AudioPlaybackController();
  const bargeIn = new BargeInController(playback);

  playback.isPlaying = true;
  playback.activeGenerationId = 5;

  let interruptionEvent = null;
  bargeIn.onInterruption = (e) => { interruptionEvent = e; };

  const t0 = Date.now();
  const result = bargeIn.handleSpeechDetected({
    isSpeakingMode: true,
    rms: 0.08,
    timestamp: t0,
  });

  assert.ok(result);
  assert.equal(result.interrupted, true);
  assert.equal(result.reason, 'USER_BARGE_IN');
  assert.equal(playback.isPlaying, false, 'Audio playback must be halted');
  assert.ok(playback.activeGenerationId > 5, 'Generation ID must be incremented to discard late chunks');
  assert.ok(result.bargeInLatencyMs < 25, `Barge-in latency must be instantaneous (<25ms), got ${result.bargeInLatencyMs}ms`);
  assert.ok(interruptionEvent);
});
