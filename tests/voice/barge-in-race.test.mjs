import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AudioPlaybackController } from '../../src/voice/AudioPlaybackController.js';
import { BargeInController } from '../../src/voice/BargeInController.js';
import { TranscriptController } from '../../src/voice/transcript.js';

test('Critical Barge-In: Assistant speaking -> User speaks -> Audio stops, turn marked interrupted, new turn proceeds', async () => {
  const playback = new AudioPlaybackController();
  const bargeIn = new BargeInController(playback);
  const transcript = new TranscriptController();

  // User Turn 1
  transcript.commitFinalUserUtterance('Tell me why this claim might be obvious.');

  // Assistant Turn 1 begins speaking
  const gen1 = playback.startNewGeneration();
  transcript.startAssistantTurn('asst-1');
  transcript.appendAssistantDelta('Looking at the combination of references A and B, claim 1 may lack novelty—');
  transcript.appendAssistantSpokenSegment('Looking at the combination of references');

  await playback.enqueueChunk({
    generationId: gen1,
    text: 'Looking at the combination of references',
    chunkIndex: 0,
  });

  playback.isPlaying = true;
  assert.equal(playback.isPlaying, true);

  // User INTERRUPTS at second 2: "Wait, only compare references A and B."
  const interruption = bargeIn.handleSpeechDetected({
    isSpeakingMode: true,
    rms: 0.09,
    timestamp: Date.now(),
  });

  assert.ok(interruption);
  assert.equal(playback.isPlaying, false, 'Playback must stop immediately');
  assert.equal(playback.queuedChunks.length, 0, 'Playback queue must be cleared');

  // Mark assistant turn interrupted
  const interruptedTurn = transcript.markAssistantInterrupted('USER_BARGE_IN');
  assert.equal(interruptedTurn.interrupted, true);
  assert.equal(interruptedTurn.text, 'Looking at the combination of references—');

  // User Turn 2 (Interruption Utterance)
  transcript.commitFinalUserUtterance('Wait, only compare references A and B.');

  // Verify conversation history integrity
  const msgs = transcript.getMessages();
  assert.equal(msgs.length, 3);
  assert.equal(msgs[0].text, 'Tell me why this claim might be obvious.');
  assert.equal(msgs[1].interrupted, true);
  assert.equal(msgs[2].text, 'Wait, only compare references A and B.');
});

test('Race Condition Test: Interrupted Generation A late tokens and audio chunks are completely rejected', async () => {
  const playback = new AudioPlaybackController();
  const transcript = new TranscriptController();

  // Generation A starts
  const genA = playback.startNewGeneration();
  const asstA = transcript.startAssistantTurn('asst-A');
  transcript.appendAssistantDelta('Starting response A');

  // User barge-in occurs: stop and clear
  playback.stopAndClear('USER_BARGE_IN');
  transcript.markAssistantInterrupted('USER_BARGE_IN');

  // Generation B starts for new question
  const genB = playback.startNewGeneration();
  const asstB = transcript.startAssistantTurn('asst-B');
  transcript.appendAssistantDelta('Starting response B');

  // Now Generation A's network request finally resolves late with residual audio chunks!
  const lateChunkResult = await playback.enqueueChunk({
    generationId: genA, // Old generation
    text: 'Late chunk from old Generation A that should NOT play',
    chunkIndex: 1,
  });

  assert.equal(lateChunkResult, false, 'Stale chunk from generation A must be rejected');
  assert.equal(playback.queuedChunks.length, 0, 'Stale chunk must not be in the queue');

  // Generation B chunk arrives while player is active
  playback.isPlaying = true;
  const validChunkResult = await playback.enqueueChunk({
    generationId: genB, // Active generation
    text: 'Valid chunk for Generation B',
    chunkIndex: 0,
  });

  assert.equal(validChunkResult, true, 'Active chunk from generation B must be accepted');
  assert.equal(playback.queuedChunks.length, 1);
  assert.equal(playback.queuedChunks[0].text, 'Valid chunk for Generation B');
});
