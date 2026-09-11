/**
 * avatarInference.worker.js
 * 
 * Dedicated Web Worker running the real, trained 36.28M parameter Wav2Lip
 * talking-head neural network using ONNX Runtime Web + WebGPU.
 * 
 * PROCEDURAL FALLBACK IS COMPLETELY DISABLED FOR VERIFICATION.
 * If WebGPU fails or inference errors, the mouth remains completely static.
 */

import * as ort from 'onnxruntime-web/webgpu';

const MODEL_URL = '/models/sally/wav2lip.onnx';
const MODEL_CACHE_NAME = 'sally-neural-wav2lip-v1';

let session = null;
let activeProvider = 'uninitialized';
let modelStats = {
  name: 'Wav2Lip Generator ONNX',
  filename: 'wav2lip.onnx',
  sizeBytes: 145175471,
  sizeMb: '138.45 MB',
  totalParams: '36,282,707',
  inferenceCount: 0,
  lastInferenceMs: 0,
  proceduralFallbackDisabled: true,
};

/**
 * Fetch model with local device Cache API persistence
 */
async function fetchAndCacheModel(url, onProgress) {
  if (typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(MODEL_CACHE_NAME);
      const cachedResponse = await cache.match(url);
      if (cachedResponse) {
        onProgress?.(100, 'Loaded Wav2Lip from device cache (HIT)');
        return await cachedResponse.arrayBuffer();
      }

      onProgress?.(10, 'Downloading real Wav2Lip ONNX model (138 MB)...');
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} downloading ${url}`);
      }

      const contentLength = +(response.headers.get('Content-Length') || 145175471);
      const reader = response.body.getReader();
      let receivedBytes = 0;
      const chunks = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        receivedBytes += value.length;
        if (contentLength > 0) {
          const pct = Math.min(95, Math.round((receivedBytes / contentLength) * 90) + 5);
          onProgress?.(pct, `Downloading Wav2Lip weights: ${pct}%`);
        }
      }

      const totalBuffer = new Uint8Array(receivedBytes);
      let offset = 0;
      for (const chunk of chunks) {
        totalBuffer.set(chunk, offset);
        offset += chunk.length;
      }

      try {
        await cache.put(url, new Response(totalBuffer.buffer, {
          headers: { 'Content-Type': 'application/octet-stream' },
        }));
      } catch (cacheErr) {
        console.warn('[AvatarWorker] Cache API write error:', cacheErr);
      }

      onProgress?.(100, 'Model cached locally in browser IndexedDB/Cache');
      return totalBuffer.buffer;
    } catch (err) {
      console.warn('[AvatarWorker] Cache API fetch warning:', err);
    }
  }

  const res = await fetch(url);
  return await res.arrayBuffer();
}

/**
 * Initialize WebGPU session strictly without procedural fallback
 */
async function initSession(options = {}) {
  try {
    self.postMessage({
      type: 'STATUS',
      status: 'DOWNLOADING',
      progress: 5,
      message: 'Loading 36.28M parameter Wav2Lip model...',
    });

    const rawBuffer = await fetchAndCacheModel(MODEL_URL, (pct, msg) => {
      self.postMessage({ type: 'STATUS', status: 'DOWNLOADING', progress: pct, message: msg });
    });

    const modelUint8 = new Uint8Array(rawBuffer);

    self.postMessage({
      type: 'STATUS',
      status: 'CREATING_SESSION',
      progress: 95,
      message: 'Compiling WebGPU shaders on user GPU...',
    });

    // Configure WASM paths
    if (ort.env && ort.env.wasm) {
      ort.env.wasm.wasmPaths = '/ort-wasm/';
      ort.env.wasm.proxy = false;
      if (typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated) {
        ort.env.wasm.numThreads = Math.min(4, (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 2);
      }
    }

    let sessionCreated = false;
    let gpuError = null;

    // 1. Attempt WebGPU execution provider first
    if (options.useWebGPU !== false) {
      try {
        session = await ort.InferenceSession.create(modelUint8.slice(0), {
          executionProviders: ['webgpu'],
          graphOptimizationLevel: 'all',
        });
        activeProvider = 'WebGPU';
        sessionCreated = true;
        console.log('[AvatarWorker] WebGPU session created successfully for Wav2Lip ONNX (36.28M params)');
      } catch (gpuErr) {
        console.warn('[AvatarWorker] WebGPU init failed, falling back to WASM SIMD provider:', gpuErr?.message || gpuErr);
        gpuError = gpuErr;
      }
    }

    // 2. Fall back to WebAssembly (WASM SIMD) if WebGPU limits exceeded or failed
    if (!sessionCreated) {
      try {
        session = await ort.InferenceSession.create(modelUint8.slice(0), {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all',
        });
        activeProvider = 'WASM';
        sessionCreated = true;
        console.log('[AvatarWorker] WASM SIMD session created successfully for Wav2Lip ONNX (36.28M params)');
      } catch (wasmErr) {
        console.error('[AvatarWorker] WASM fallback also failed:', wasmErr?.message || wasmErr);
        throw new Error(`WebGPU: ${gpuError?.message || 'failed'} | WASM: ${wasmErr?.message || wasmErr}`);
      }
    }

    modelStats.provider = activeProvider;

    self.postMessage({
      type: 'INITIALIZED',
      provider: activeProvider,
      modelStats,
      resolution: 96, // Canonical Wav2Lip resolution
      proceduralFallback: 'DISABLED',
    });
  } catch (err) {
    console.error('[AvatarWorker] Neural session initialization failed:', err);
    activeProvider = 'FAILED';

    // Per user instructions: DO NOT secretly fall back to procedural animation
    self.postMessage({
      type: 'INIT_ERROR',
      provider: 'FAILED',
      error: err?.message || String(err),
      proceduralFallback: 'DISABLED',
    });
  }
}

/**
 * Run real neural inference on the user GPU
 */
async function runInference(payload) {
  const { frameIndex, audioMelTensor, referenceFaceRgba } = payload;
  const t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

  if (!session) {
    // If neural session is not available, output nothing (mouth stays static)
    return;
  }

  try {
    // 1. Audio input tensor: 'mel' of shape [1, 1, 80, 16] (Float32)
    const melTensor = new ort.Tensor('float32', audioMelTensor, [1, 1, 80, 16]);

    // 2. Video input tensor: 'vid' of shape [1, 6, 96, 96] (Float32)
    // Channels 0..2: RGB reference face normalized [0, 1]
    // Channels 3..5: Masked RGB reference face (lower half y >= 48 zeroed out)
    const vidData = new Float32Array(1 * 6 * 96 * 96);
    const planeSize = 96 * 96;

    for (let y = 0; y < 96; y++) {
      for (let x = 0; x < 96; x++) {
        const pixelIdx = y * 96 + x;
        const srcIdx = pixelIdx * 4;

        const r = (referenceFaceRgba ? referenceFaceRgba[srcIdx] : 220) / 255.0;
        const g = (referenceFaceRgba ? referenceFaceRgba[srcIdx + 1] : 180) / 255.0;
        const b = (referenceFaceRgba ? referenceFaceRgba[srcIdx + 2] : 160) / 255.0;

        // Channels 0..2: Unmasked
        vidData[pixelIdx] = r;
        vidData[planeSize + pixelIdx] = g;
        vidData[planeSize * 2 + pixelIdx] = b;

        // Channels 3..5: Lower-half masked (y >= 48 is zeroed)
        const isMasked = y >= 48;
        vidData[planeSize * 3 + pixelIdx] = isMasked ? 0.0 : r;
        vidData[planeSize * 4 + pixelIdx] = isMasked ? 0.0 : g;
        vidData[planeSize * 5 + pixelIdx] = isMasked ? 0.0 : b;
      }
    }

    const vidTensor = new ort.Tensor('float32', vidData, [1, 6, 96, 96]);

    // 3. Execute ONNX graph
    const results = await session.run({
      mel: melTensor,
      vid: vidTensor,
    });

    const outputTensor = results.gen || results[session.outputNames[0]];
    const outData = outputTensor.data; // Float32Array of length 3 * 96 * 96 in [0, 1]

    // 4. Convert output [1, 3, 96, 96] to RGBA Uint8ClampedArray for 96x96 canvas
    const patchRgba = new Uint8ClampedArray(96 * 96 * 4);
    for (let i = 0; i < planeSize; i++) {
      patchRgba[i * 4] = Math.min(255, Math.max(0, Math.round(outData[i] * 255.0)));
      patchRgba[i * 4 + 1] = Math.min(255, Math.max(0, Math.round(outData[planeSize + i] * 255.0)));
      patchRgba[i * 4 + 2] = Math.min(255, Math.max(0, Math.round(outData[planeSize * 2 + i] * 255.0)));
      patchRgba[i * 4 + 3] = 255;
    }

    // 5. Release tensors
    melTensor.dispose?.();
    vidTensor.dispose?.();
    outputTensor.dispose?.();

    const elapsed = ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - t0;
    modelStats.inferenceCount += 1;
    modelStats.lastInferenceMs = Math.round(elapsed * 10) / 10;

    // Send rendered neural frame back to main thread
    self.postMessage(
      {
        type: 'FRAME_RENDERED',
        frameIndex,
        width: 96,
        height: 96,
        patchBuffer: patchRgba.buffer,
        inferenceLatencyMs: modelStats.lastInferenceMs,
        provider: activeProvider,
        inferenceCount: modelStats.inferenceCount,
      },
      [patchRgba.buffer]
    );
  } catch (infErr) {
    console.warn('[AvatarWorker] Real neural inference error:', infErr.message);
    // Procedural fallback is DISABLED per instructions. Mouth will stay static.
  }
}

self.onmessage = async (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'INIT':
      await initSession(payload);
      break;
    case 'INFER_FRAME':
      await runInference(payload);
      break;
    case 'DISPOSE':
      if (session) {
        try {
          session.release?.();
        } catch {}
        session = null;
      }
      break;
    default:
      break;
  }
};
