/**
 * HardwareCapabilityDetector.js
 * 
 * Comprehensive client-side hardware capability detection for browser-based
 * neural avatar rendering. Probes WebGPU availability, shader micro-benchmark,
 * CPU cores, device memory, WASM SIMD, OffscreenCanvas, and WebCodecs.
 * 
 * Classification Tiers:
 * - ULTRA: Modern desktop discrete GPU (WebGPU), 8+ cores, high compute throughput -> 160x160 patch, 30 FPS
 * - HIGH: Mainstream GPU (WebGPU), 4+ cores -> 128x128 patch, 25-30 FPS
 * - MEDIUM: Integrated GPU or lower-tier WebGPU -> 96x96 patch, 20-25 FPS
 * - LOW: Minimal WebGPU or high-spec WASM SIMD -> 96x96 patch, 15-20 FPS
 * - UNSUPPORTED_WEBGPU: No WebGPU -> WASM fallback or real-human video loop
 */

export const HARDWARE_TIERS = {
  ULTRA: 'ULTRA',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  UNSUPPORTED_WEBGPU: 'UNSUPPORTED_WEBGPU',
};

export const TIER_CONFIGS = {
  [HARDWARE_TIERS.ULTRA]: {
    resolution: 160,
    targetFps: 30,
    modelVariant: 'fp16',
    batchSize: 1,
    useWebGPU: true,
    description: 'High-end discrete GPU (WebGPU) - Full neural fidelity at 30 FPS',
  },
  [HARDWARE_TIERS.HIGH]: {
    resolution: 128,
    targetFps: 30,
    modelVariant: 'fp16',
    batchSize: 1,
    useWebGPU: true,
    description: 'Mainstream GPU (WebGPU) - 128x128 neural patch at 25-30 FPS',
  },
  [HARDWARE_TIERS.MEDIUM]: {
    resolution: 96,
    targetFps: 24,
    modelVariant: 'int8',
    batchSize: 1,
    useWebGPU: true,
    description: 'Integrated GPU (WebGPU) - 96x96 neural patch at 24 FPS',
  },
  [HARDWARE_TIERS.LOW]: {
    resolution: 96,
    targetFps: 18,
    modelVariant: 'int8',
    batchSize: 1,
    useWebGPU: true,
    description: 'Low-power GPU (WebGPU) - 96x96 neural patch at 18 FPS',
  },
  [HARDWARE_TIERS.UNSUPPORTED_WEBGPU]: {
    resolution: 96,
    targetFps: 15,
    modelVariant: 'int8_wasm',
    batchSize: 1,
    useWebGPU: false,
    description: 'No WebGPU - Graceful degradation to WASM or real-human video loop',
  },
};

export class HardwareCapabilityDetector {
  constructor() {
    this.capabilities = null;
    this.tier = null;
  }

  /**
   * Run full hardware detection suite
   */
  async detect() {
    if (this.capabilities) return this.capabilities;

    const isBrowser = typeof window !== 'undefined';
    const nav = isBrowser ? window.navigator : {};

    // 1. Basic platform & browser attributes
    const userAgent = nav.userAgent || '';
    const platform = nav.platform || '';
    const logicalCores = nav.hardwareConcurrency || 4;
    const deviceMemory = nav.deviceMemory || (logicalCores >= 8 ? 8 : 4);

    // 2. Browser feature tests
    const hasOffscreenCanvas = isBrowser && typeof window.OffscreenCanvas !== 'undefined';
    const hasSharedArrayBuffer = isBrowser && typeof window.SharedArrayBuffer !== 'undefined';
    const hasWebCodecs = isBrowser && typeof window.VideoEncoder !== 'undefined';
    const hasWebAudio = isBrowser && (typeof window.AudioContext !== 'undefined' || typeof window.webkitAudioContext !== 'undefined');

    // 3. WebAssembly SIMD detection
    const hasWasmSimd = await this.testWasmSimd();

    // 4. WebGPU detection and micro-benchmark
    const webgpuStatus = await this.detectWebGpu();

    // 5. Tier classification
    const tier = this.classifyTier({
      webgpuAvailable: webgpuStatus.available,
      gpuScore: webgpuStatus.benchmarkScore,
      logicalCores,
      deviceMemory,
      hasWasmSimd,
    });

    this.capabilities = {
      browser: this.detectBrowser(userAgent),
      platform,
      logicalCores,
      deviceMemoryGB: deviceMemory,
      hasOffscreenCanvas,
      hasSharedArrayBuffer,
      hasWebCodecs,
      hasWebAudio,
      hasWasmSimd,
      webgpu: webgpuStatus,
      tier,
      tierConfig: TIER_CONFIGS[tier],
      detectedAt: new Date().toISOString(),
    };

    this.tier = tier;
    return this.capabilities;
  }

  /**
   * Test for WebAssembly SIMD support
   */
  async testWasmSimd() {
    try {
      if (typeof WebAssembly === 'undefined' || typeof WebAssembly.validate !== 'function') {
        return false;
      }
      // Minimal WASM module with SIMD v128 instruction
      const simdModuleBytes = new Uint8Array([
        0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
        0x01, 0x05, 0x01, 0x60, 0x00, 0x01, 0x7b,
        0x03, 0x02, 0x01, 0x00,
        0x0a, 0x0a, 0x01, 0x08, 0x00, 0xfd, 0x0c, 0x00, 0x00, 0x00, 0x00, 0x0b
      ]);
      return WebAssembly.validate(simdModuleBytes);
    } catch {
      return false;
    }
  }

  /**
   * Inspect navigator.gpu and perform a quick micro-benchmark
   */
  async detectWebGpu() {
    if (typeof window === 'undefined' || !navigator.gpu) {
      return {
        available: false,
        reason: 'navigator.gpu is not supported in this browser or disabled.',
        adapterInfo: null,
        benchmarkScore: 0,
      };
    }

    try {
      const adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance',
      });

      if (!adapter) {
        return {
          available: false,
          reason: 'No suitable GPU adapter found.',
          adapterInfo: null,
          benchmarkScore: 0,
        };
      }

      // Query adapter info if available
      let adapterInfo = {};
      try {
        if (adapter.requestAdapterInfo) {
          adapterInfo = await adapter.requestAdapterInfo();
        } else if (adapter.info) {
          adapterInfo = adapter.info;
        }
      } catch {}

      // Test device creation
      const device = await adapter.requestDevice();
      let benchmarkScore = 100; // Baseline WebGPU score

      // Micro-benchmark: run a tiny matrix multiplication / compute shader
      try {
        benchmarkScore = await this.runWebGpuMicroBenchmark(device);
      } catch (benchErr) {
        console.warn('[HardwareCapabilityDetector] WebGPU micro-benchmark skipped:', benchErr);
        benchmarkScore = 100;
      } finally {
        try {
          device.destroy?.();
        } catch {}
      }

      return {
        available: true,
        reason: 'WebGPU adapter and device initialized successfully.',
        adapterInfo: {
          vendor: adapterInfo.vendor || 'Unknown',
          architecture: adapterInfo.architecture || 'Generic',
          device: adapterInfo.device || 'GPU',
          description: adapterInfo.description || '',
        },
        maxBufferSize: adapter.limits?.maxBufferSize || 0,
        maxComputeWorkgroupSizeX: adapter.limits?.maxComputeWorkgroupSizeX || 0,
        benchmarkScore,
      };
    } catch (err) {
      return {
        available: false,
        reason: `WebGPU initialization failed: ${err.message}`,
        adapterInfo: null,
        benchmarkScore: 0,
      };
    }
  }

  /**
   * Run a lightweight WebGPU compute shader benchmark to measure execution latency
   */
  async runWebGpuMicroBenchmark(device) {
    if (!device || !device.createShaderModule) return 100;

    const shaderCode = `
      @group(0) @binding(0) var<storage, read_write> data: array<f32>;

      @compute @workgroup_size(64)
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let i = global_id.x;
        if (i < 1024u) {
          var val: f32 = data[i];
          for (var j: u32 = 0u; j < 300u; j = j + 1u) {
            val = sin(val) * 1.0001 + cos(val) * 0.0001;
          }
          data[i] = val;
        }
      }
    `;

    const module = device.createShaderModule({ code: shaderCode });
    const pipeline = device.createComputePipeline({
      layout: 'auto',
      compute: { module, entryPoint: 'main' },
    });

    const bufferSize = 1024 * 4;
    const buffer = device.createBuffer({
      size: bufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });

    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer } }],
    });

    const t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.dispatchWorkgroups(16); // 16 * 64 = 1024 threads
    passEncoder.end();

    device.queue.submit([commandEncoder.finish()]);
    await device.queue.onSubmittedWorkDone();
    const elapsed = ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - t0;

    buffer.destroy();

    // Score inversely proportional to compute time (higher is faster)
    const score = Math.round(10000 / Math.max(1, elapsed));
    return score;
  }

  /**
   * Classify device into tier based on metrics
   */
  classifyTier({ webgpuAvailable, gpuScore, logicalCores, deviceMemory, hasWasmSimd }) {
    if (!webgpuAvailable) {
      return HARDWARE_TIERS.UNSUPPORTED_WEBGPU;
    }

    if (gpuScore >= 350 && logicalCores >= 8 && deviceMemory >= 8) {
      return HARDWARE_TIERS.ULTRA;
    }

    if (gpuScore >= 160 && logicalCores >= 6) {
      return HARDWARE_TIERS.HIGH;
    }

    if (gpuScore >= 70 && logicalCores >= 4) {
      return HARDWARE_TIERS.MEDIUM;
    }

    return HARDWARE_TIERS.LOW;
  }

  /**
   * Simple user-agent parser for diagnostic reporting
   */
  detectBrowser(ua) {
    if (/chrome|chromium|crios/i.test(ua) && !/edg/i.test(ua)) return 'Chrome';
    if (/edg/i.test(ua)) return 'Edge';
    if (/firefox|fxios/i.test(ua)) return 'Firefox';
    if (/safari/i.test(ua) && !/chrome|chromium|crios/i.test(ua)) return 'Safari';
    return 'Unknown';
  }
}

export const hardwareDetector = new HardwareCapabilityDetector();
