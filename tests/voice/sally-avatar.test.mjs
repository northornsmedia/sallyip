import test from 'node:test';
import assert from 'node:assert/strict';
import { SALLY_CANONICAL_GEOMETRY, SALLY_IDENTITY_VERSION, createSallyBlendingMask } from '../../src/voice/avatar/sallyIdentity.js';
import { AvatarSyncClock } from '../../src/voice/avatar/AvatarSyncClock.js';

test('Sally Identity - Canonical geometry and anchors', () => {
  assert.equal(SALLY_IDENTITY_VERSION, '2026.1.0');
  assert.equal(SALLY_CANONICAL_GEOMETRY.frameWidth, 512);
  assert.equal(SALLY_CANONICAL_GEOMETRY.frameHeight, 512);

  // Check facial anchors
  const { eyesCenter, noseTip, mouthCenter } = SALLY_CANONICAL_GEOMETRY;
  assert.equal(eyesCenter.x, 256);
  assert.equal(noseTip.x, 256);
  assert.equal(mouthCenter.x, 256);
  assert.ok(eyesCenter.y < noseTip.y && noseTip.y < mouthCenter.y);

  // Check patch bounding box definitions
  const { ultra, high, medium } = SALLY_CANONICAL_GEOMETRY.lowerFacePatch;
  assert.equal(ultra.width, 160);
  assert.equal(high.width, 128);
  assert.equal(medium.width, 96);
});

test('Sally Blending Mask - Elliptical feather mask generation', () => {
  const mask = createSallyBlendingMask(128, 128);
  assert.ok(mask);
  assert.equal(mask.width, 128);
  assert.equal(mask.height, 128);

  if (mask.type === 'array') {
    // Check center value is 1.0 (fully opaque)
    const centerIdx = 64 * 128 + 64;
    assert.equal(mask.data[centerIdx], 1.0);
    // Check corner value is 0.0 (fully transparent)
    assert.equal(mask.data[0], 0.0);
  }
});

test('AvatarSyncClock - Enqueue, drift calculation, and synchronized frame selection', () => {
  const clock = new AvatarSyncClock({ targetFps: 25 }); // 40 ms per frame
  clock.startClock(1000); // Start at 1000 ms

  // Enqueue frames 0, 1, 2 (corresponding to 0ms, 40ms, 80ms)
  clock.enqueueRenderedFrame({ frameIndex: 0, patchImageData: {}, inferenceLatencyMs: 22 });
  clock.enqueueRenderedFrame({ frameIndex: 1, patchImageData: {}, inferenceLatencyMs: 25 });
  clock.enqueueRenderedFrame({ frameIndex: 2, patchImageData: {}, inferenceLatencyMs: 24 });

  // Update audio clock to 42 ms (should select frame 1)
  clock.updateAudioTime(0.042);
  const sync1 = clock.getCurrentSyncFrame();
  assert.ok(sync1);
  assert.equal(sync1.frame.frameIndex, 1);
  assert.ok(Math.abs(sync1.avDeltaMs) <= 10, `Drift delta should be small, got ${sync1.avDeltaMs}`);

  // Frame 0 should have been pruned from queue
  assert.ok(clock.frameQueue.every((f) => f.frameIndex >= 1));

  // Diagnostic metrics
  const diag = clock.getDiagnostics();
  assert.ok(diag.averageInferenceMs >= 20 && diag.averageInferenceMs <= 30);
});

test('AvatarSyncClock - Stop and flush clears queue', () => {
  const clock = new AvatarSyncClock({ targetFps: 25 });
  clock.startClock(1000);
  clock.enqueueRenderedFrame({ frameIndex: 0, patchImageData: {} });
  clock.enqueueRenderedFrame({ frameIndex: 1, patchImageData: {} });

  assert.equal(clock.frameQueue.length, 2);
  clock.stopAndFlush();
  assert.equal(clock.frameQueue.length, 0);
  assert.equal(clock.isPlaying, false);
});
