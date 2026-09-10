import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VOICE_STATES, VOICE_EVENTS, DEFAULT_VOICE_CONFIG } from '../../src/voice/types.js';
import { TranscriptController } from '../../src/voice/transcript.js';

test('VOICE_STATES contains all 12 required authoritative states', () => {
  const expectedStates = [
    'IDLE',
    'REQUESTING_MIC_PERMISSION',
    'LISTENING',
    'SPEECH_DETECTED',
    'CAPTURING',
    'TRANSCRIBING',
    'THINKING',
    'SPEAKING',
    'INTERRUPTING',
    'CANCELLING',
    'ERROR',
    'DISCONNECTED',
  ];

  for (const state of expectedStates) {
    assert.equal(VOICE_STATES[state], state, `Expected state ${state} to exist in VOICE_STATES`);
  }
  assert.equal(Object.keys(VOICE_STATES).length, 12, 'Must have exactly 12 authoritative states');
});

test('VOICE_EVENTS contract contains turn-taking and barge-in events', () => {
  assert.ok(VOICE_EVENTS.USER_BARGE_IN);
  assert.ok(VOICE_EVENTS.USER_STARTED_SPEAKING);
  assert.ok(VOICE_EVENTS.USER_STOPPED_SPEAKING);
  assert.ok(VOICE_EVENTS.MANUAL_STOP);
});

test('DEFAULT_VOICE_CONFIG has valid acoustic VAD thresholds and Fish Audio model', () => {
  assert.ok(DEFAULT_VOICE_CONFIG.energyThresholdListening > 0);
  assert.ok(DEFAULT_VOICE_CONFIG.energyThresholdSpeaking > DEFAULT_VOICE_CONFIG.energyThresholdListening, 'Speaking threshold must be higher than listening threshold to mitigate speaker acoustic feedback');
  assert.ok(DEFAULT_VOICE_CONFIG.minSpeechDurationMs >= 150);
  assert.ok(DEFAULT_VOICE_CONFIG.minInterruptionDurationMs >= 120);
  assert.ok(DEFAULT_VOICE_CONFIG.silenceTimeoutMs >= 500);
  assert.equal(DEFAULT_VOICE_CONFIG.ttsModel, 'fish-audio/s2.1-pro-free:free');
});

test('TranscriptController preserves interrupted assistant turn metadata and tags', () => {
  const transcript = new TranscriptController();

  // User speaks
  transcript.commitFinalUserUtterance('Explain patent obviousness under Section 103.');
  assert.equal(transcript.messages.length, 1);
  assert.equal(transcript.messages[0].role, 'user');

  // Assistant begins responding
  transcript.startAssistantTurn();
  transcript.appendAssistantDelta('Under Section 103, a patent claim is unpatentable if');
  transcript.appendAssistantSpokenSegment('Under Section 103, a patent claim is');

  // User interrupts
  const interrupted = transcript.markAssistantInterrupted('USER_BARGE_IN');
  assert.ok(interrupted);
  assert.equal(interrupted.interrupted, true);
  assert.equal(interrupted.interruptionReason, 'USER_BARGE_IN');
  assert.ok(interrupted.text.includes('—'), 'Interrupted text must include cutoff em-dash marker');

  // New user utterance
  transcript.commitFinalUserUtterance('No, focus on claim 4.');
  assert.equal(transcript.messages.length, 3);
  assert.equal(transcript.messages[1].interrupted, true);
  assert.equal(transcript.messages[2].text, 'No, focus on claim 4.');
});
