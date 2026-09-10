import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AudioPlaybackController } from '../../src/voice/AudioPlaybackController.js';

test('AudioPlaybackController queues and manages chunked audio', async () => {
  const controller = new AudioPlaybackController();
  const genId = controller.startNewGeneration();
  assert.equal(genId, 1);

  controller.isPlaying = true;

  // Enqueue chunk 1
  const enqueued1 = await controller.enqueueChunk({
    generationId: genId,
    text: 'Sentence 1',
    chunkIndex: 0,
  });
  assert.equal(enqueued1, true);
  assert.equal(controller.queuedChunks.length, 1);

  // Enqueue chunk 2
  const enqueued2 = await controller.enqueueChunk({
    generationId: genId,
    text: 'Sentence 2',
    chunkIndex: 1,
  });
  assert.equal(enqueued2, true);
  assert.equal(controller.queuedChunks.length, 2);
  assert.equal(controller.queuedChunks[0].text, 'Sentence 1');
  assert.equal(controller.queuedChunks[1].text, 'Sentence 2');
});

test('AudioPlaybackController stopAndClear empties queue and invalidates generation ID', () => {
  const controller = new AudioPlaybackController();
  const genId = controller.startNewGeneration();

  controller.queuedChunks = [
    { generationId: genId, text: 'Sentence 1' },
    { generationId: genId, text: 'Sentence 2' },
  ];
  controller.isPlaying = true;

  const res = controller.stopAndClear('USER_BARGE_IN');

  assert.equal(controller.queuedChunks.length, 0, 'Queued chunks must be emptied immediately');
  assert.equal(controller.isPlaying, false, 'isPlaying must be set to false');
  assert.ok(controller.activeGenerationId > genId, 'Generation ID must be invalidated');
  assert.ok(res.stopLatencyMs < 20, 'Stop latency should be near-zero');
});

test('AudioPlaybackController rejects chunks from stale or cancelled generations', async () => {
  const controller = new AudioPlaybackController();
  const genA = controller.startNewGeneration(); // gen 1

  // Barge-in occurs -> Generation 1 is cancelled
  controller.stopAndClear('USER_BARGE_IN');

  // New Generation starts
  const genB = controller.startNewGeneration(); // gen 3
  assert.notEqual(genA, genB);

  // Late chunk from old Generation A arrives over the network
  const accepted = await controller.enqueueChunk({
    generationId: genA, // Stale!
    text: 'Late chunk from interrupted turn',
    chunkIndex: 2,
  });

  assert.equal(accepted, false, 'Late chunk from interrupted turn MUST be discarded');
  assert.equal(controller.queuedChunks.length, 0, 'No stale chunks should enter queue');
});
