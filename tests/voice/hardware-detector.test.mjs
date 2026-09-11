import test from 'node:test';
import assert from 'node:assert/strict';
import { HardwareCapabilityDetector, HARDWARE_TIERS, TIER_CONFIGS } from '../../src/voice/avatar/HardwareCapabilityDetector.js';

test('HardwareCapabilityDetector - Tier classification rules', () => {
  const detector = new HardwareCapabilityDetector();

  // 1. WebGPU unavailable -> UNSUPPORTED_WEBGPU
  const tierNoGpu = detector.classifyTier({
    webgpuAvailable: false,
    gpuScore: 0,
    logicalCores: 8,
    deviceMemory: 16,
    hasWasmSimd: true,
  });
  assert.equal(tierNoGpu, HARDWARE_TIERS.UNSUPPORTED_WEBGPU);

  // 2. High-end GPU, 8+ cores, 8GB+ RAM -> ULTRA
  const tierUltra = detector.classifyTier({
    webgpuAvailable: true,
    gpuScore: 450,
    logicalCores: 16,
    deviceMemory: 32,
    hasWasmSimd: true,
  });
  assert.equal(tierUltra, HARDWARE_TIERS.ULTRA);

  // 3. Mainstream GPU, 6+ cores -> HIGH
  const tierHigh = detector.classifyTier({
    webgpuAvailable: true,
    gpuScore: 220,
    logicalCores: 6,
    deviceMemory: 8,
    hasWasmSimd: true,
  });
  assert.equal(tierHigh, HARDWARE_TIERS.HIGH);

  // 4. Low-power GPU -> MEDIUM or LOW
  const tierMedium = detector.classifyTier({
    webgpuAvailable: true,
    gpuScore: 100,
    logicalCores: 4,
    deviceMemory: 4,
    hasWasmSimd: true,
  });
  assert.equal(tierMedium, HARDWARE_TIERS.MEDIUM);

  const tierLow = detector.classifyTier({
    webgpuAvailable: true,
    gpuScore: 40,
    logicalCores: 2,
    deviceMemory: 4,
    hasWasmSimd: false,
  });
  assert.equal(tierLow, HARDWARE_TIERS.LOW);
});

test('HardwareCapabilityDetector - Tier configurations have valid resolutions and targets', () => {
  for (const [tier, config] of Object.entries(TIER_CONFIGS)) {
    assert.ok(config.resolution >= 96, `${tier} resolution should be >= 96`);
    assert.ok(config.targetFps >= 15, `${tier} targetFps should be >= 15`);
    assert.ok(typeof config.useWebGPU === 'boolean');
    assert.ok(config.description.length > 0);
  }
});

test('HardwareCapabilityDetector - Graceful fallback in non-browser environment', async () => {
  const detector = new HardwareCapabilityDetector();
  const caps = await detector.detect();

  assert.ok(caps);
  assert.equal(caps.webgpu.available, false);
  assert.equal(caps.tier, HARDWARE_TIERS.UNSUPPORTED_WEBGPU);
  assert.equal(caps.tierConfig.useWebGPU, false);
});
