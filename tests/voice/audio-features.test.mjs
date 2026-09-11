import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioFeatureExtractor } from '../../src/voice/avatar/AudioFeatureExtractor.js';

test('AudioFeatureExtractor - Frequency to Mel conversions', () => {
  const extractor = new AudioFeatureExtractor();

  // 1000 Hz should be ~1000 Mel
  const mel1k = extractor.hzToMel(1000);
  assert.ok(mel1k >= 950 && mel1k <= 1050, `1000 Hz in Mel should be ~1000, got ${mel1k}`);

  // Invertibility check
  const hzReconstructed = extractor.melToHz(mel1k);
  assert.ok(Math.abs(hzReconstructed - 1000) < 0.1, `Inversion should match original Hz: ${hzReconstructed}`);
});

test('AudioFeatureExtractor - Precomputed Mel filterbank dimensions', () => {
  const extractor = new AudioFeatureExtractor({ nFft: 512, nMels: 80 });

  assert.equal(extractor.melFilterbank.length, 80);
  // Each filter has nFft / 2 + 1 = 257 bins
  assert.equal(extractor.melFilterbank[0].length, 257);
});

test('AudioFeatureExtractor - Resampling from 48kHz to 16kHz', () => {
  const extractor = new AudioFeatureExtractor({ sampleRate: 16000 });
  const input48k = new Float32Array(48000); // 1 second of audio at 48kHz
  for (let i = 0; i < input48k.length; i++) {
    input48k[i] = Math.sin((2 * Math.PI * 440 * i) / 48000);
  }

  const resampled16k = extractor.resampleTo16k(input48k, 48000);
  assert.equal(resampled16k.length, 16000, 'Resampled length should be exactly 16000 samples');
});

test('AudioFeatureExtractor - Mel spectrogram extraction from synthetic speech sine', () => {
  const extractor = new AudioFeatureExtractor({ sampleRate: 16000, nFft: 512, hopLength: 160, nMels: 80 });

  // 3200 samples = 200 ms of audio (enough for multiple 160-sample hops)
  const pcm = new Float32Array(3200);
  for (let i = 0; i < pcm.length; i++) {
    pcm[i] = 0.5 * Math.sin((2 * Math.PI * 300 * i) / 16000); // 300 Hz tone
  }

  const melFrames = extractor.ingestAudio(pcm, 16000);
  assert.ok(melFrames.length > 0, `Should extract Mel frames, got ${melFrames.length}`);
  assert.equal(melFrames[0].length, 80, 'Each Mel frame should contain 80 bins');

  // Verify tensor shape slice
  const tensorData = extractor.getMelTensorForFrame(2);
  assert.equal(tensorData.length, 1 * 1 * 80 * 16, 'Tensor data should match [1, 1, 80, 16]');
});

test('AudioFeatureExtractor - Reset clears continuous buffers', () => {
  const extractor = new AudioFeatureExtractor();
  const pcm = new Float32Array(1000);
  extractor.ingestAudio(pcm, 16000);

  assert.ok(extractor.pcmBuffer.length > 0 || extractor.melSpectrogramHistory.length > 0);
  extractor.reset();

  assert.equal(extractor.pcmBuffer.length, 0);
  assert.equal(extractor.melSpectrogramHistory.length, 0);
});
