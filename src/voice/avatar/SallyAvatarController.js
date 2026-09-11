/**
 * SallyAvatarController.js
 * 
 * Master orchestrator for client-side neural avatar rendering.
 * Coordinates:
 * - Hardware Capability Detector (WebGPU / Tiers)
 * - Inference Web Worker (ONNX Runtime Web + WebGPU)
 * - Audio Feature Extractor (80-band Mel-spectrogram)
 * - Audio-Visual Master Sync Clock
 * - Regional Lower-Face Neural Compositor
 * - Telemetry & Hidden Diagnostic Panel
 */

import { hardwareDetector, HARDWARE_TIERS } from './HardwareCapabilityDetector.js';
import { AudioFeatureExtractor } from './AudioFeatureExtractor.js';
import { AvatarSyncClock } from './AvatarSyncClock.js';
import { SallyNeuralCompositor } from './SallyNeuralCompositor.js';
import { VOICE_STATES } from '../types.js';

export class SallyAvatarController {
  constructor(options = {}) {
    this.options = options;
    this.canvas = null;
    this.videoElement = null;

    this.hardware = null;
    this.tier = HARDWARE_TIERS.UNSUPPORTED_WEBGPU;
    this.activeProvider = 'detecting';
    this.modelStats = null;

    this.worker = null;
    this.audioExtractor = new AudioFeatureExtractor();
    this.syncClock = new AvatarSyncClock({ targetFps: 25 });
    this.compositor = null;

    this.state = VOICE_STATES.IDLE;
    this.isInitialized = false;
    this.preparationProgress = 0;
    this.preparationMessage = 'Detecting hardware capabilities...';

    this.animFrameId = null;
    this.frameIndexCounter = 0;
    this.lastAudioChunkTime = 0;
    this.inferenceCount = 0;
    this.lastInferenceMs = 0;

    // Callbacks
    this.onDiagnosticsUpdate = null;
    this.onPreparationUpdate = null;
  }

  async initialize(canvasElement, videoElement) {
    this.canvas = canvasElement;
    this.videoElement = videoElement;

    // 1. Detect hardware
    this.hardware = await hardwareDetector.detect();
    this.tier = this.hardware.tier;
    this.activeProvider = this.hardware.webgpu.available ? 'WebGPU' : 'UNSUPPORTED';

    this.updatePreparation(15, `Hardware: ${this.tier} (${this.activeProvider})`);

    // 2. Setup compositor with canonical 96x96 geometry
    if (this.canvas) {
      this.compositor = new SallyNeuralCompositor(this.canvas, { tier: this.tier });
    }

    // 3. Spawn inference worker running real Wav2Lip ONNX model
    try {
      this.worker = new Worker(
        new URL('./avatarInference.worker.js', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = (e) => this.handleWorkerMessage(e.data);
      this.worker.onerror = (err) => {
        console.error('[SallyAvatarController] Web Worker error:', err);
        this.activeProvider = 'ERROR';
      };

      this.worker.postMessage({
        type: 'INIT',
        payload: {
          useWebGPU: this.hardware.webgpu.available,
          resolution: 96,
        },
      });
    } catch (workerErr) {
      console.error('[SallyAvatarController] Worker instantiation failed:', workerErr);
      this.activeProvider = 'ERROR';
    }

    // 4. Start render loop
    this.startRenderLoop();
    this.isInitialized = true;

    if (this.videoElement && this.compositor) {
      this.compositor.extractReferencePatch(this.videoElement);
    }

    return this.hardware;
  }

  setBaseElement(element) {
    this.videoElement = element;
    if (this.compositor && element) {
      this.compositor.extractReferencePatch(element);
    }
  }

  updatePreparation(pct, msg) {
    this.preparationProgress = pct;
    this.preparationMessage = msg;
    if (this.onPreparationUpdate) {
      this.onPreparationUpdate({ progress: pct, message: msg });
    }
  }

  handleWorkerMessage(data) {
    const { type } = data;

    if (type === 'INITIALIZED') {
      this.activeProvider = data.provider;
      this.modelStats = data.modelStats;
      this.updatePreparation(100, `Neural Engine: ${data.provider.toUpperCase()} (Wav2Lip 36.28M)`);
    } else if (type === 'STATUS') {
      this.updatePreparation(data.progress, data.message);
    } else if (type === 'INIT_ERROR') {
      this.activeProvider = 'FAILED';
      this.initError = data.error;
      this.updatePreparation(100, `Model Init Error: ${data.error}`);
      if (this.onDiagnosticsUpdate) {
        this.onDiagnosticsUpdate({
          provider: 'FAILED',
          error: data.error,
        });
      }
    } else if (type === 'FRAME_RENDERED') {
      const { frameIndex, width, height, patchBuffer, inferenceLatencyMs, inferenceCount } = data;
      const patchRgba = new Uint8ClampedArray(patchBuffer);
      const imageData = new ImageData(patchRgba, width, height);

      this.inferenceCount = inferenceCount || (this.inferenceCount + 1);
      this.lastInferenceMs = inferenceLatencyMs;

      this.syncClock.enqueueRenderedFrame({
        frameIndex,
        patchImageData: imageData,
        inferenceLatencyMs,
      });
    }
  }

  setState(newState) {
    this.state = newState;
    if (this.compositor) {
      this.compositor.setState(newState);
    }

    if (newState === VOICE_STATES.SPEAKING) {
      this.syncClock.startClock();
    } else {
      this.syncClock.stopAndFlush();
      this.audioExtractor.reset();
    }
  }

  toggleSplitComparison() {
    if (this.compositor) {
      this.compositor.showSplitComparison = !this.compositor.showSplitComparison;
      if (this.compositor.showSplitComparison) {
        this.compositor.showRawNeuralOnly = false;
      }
      return this.compositor.showSplitComparison;
    }
    return false;
  }

  toggleRawNeuralOnly() {
    if (this.compositor) {
      this.compositor.showRawNeuralOnly = !this.compositor.showRawNeuralOnly;
      if (this.compositor.showRawNeuralOnly) {
        this.compositor.showSplitComparison = false;
      }
      return this.compositor.showRawNeuralOnly;
    }
    return false;
  }

  ingestAudioData(audioBuffer) {
    if (!audioBuffer || this.state !== VOICE_STATES.SPEAKING) return;

    let pcmData = null;
    let sampleRate = 16000;

    if (audioBuffer instanceof AudioBuffer) {
      pcmData = audioBuffer.getChannelData(0);
      sampleRate = audioBuffer.sampleRate;
    } else if (audioBuffer instanceof Float32Array) {
      pcmData = audioBuffer;
    }

    if (!pcmData) return;

    // Extract Mel frames
    const newMelFrames = this.audioExtractor.ingestAudio(pcmData, sampleRate);
    if (!newMelFrames || newMelFrames.length === 0) return;

    // Trigger inference for newly available video frames (~4 mel steps = 1 video frame at 25 FPS)
    const totalMelFrames = this.audioExtractor.melSpectrogramHistory.length;
    while ((this.frameIndexCounter + 1) * 4 <= totalMelFrames) {
      const frameIdx = this.frameIndexCounter++;
      const centerMelIdx = frameIdx * 4 + 2;
      const audioMelTensor = this.audioExtractor.getMelTensorForFrame(centerMelIdx);

      // Extract 96x96 reference patch from current stage/video element
      let refPatch = this.compositor?.cachedReferencePatchRgba;
      if (!refPatch) {
        refPatch = this.compositor?.extractReferencePatch(this.videoElement);
      }

      if (this.worker) {
        this.worker.postMessage({
          type: 'INFER_FRAME',
          payload: {
            frameIndex: frameIdx,
            audioMelTensor,
            referenceFaceRgba: refPatch,
            width: 96,
            height: 96,
          },
        });
      }
    }
  }

  startRenderLoop() {
    const render = () => {
      if (this.compositor) {
        if (this.state === VOICE_STATES.SPEAKING) {
          this.syncClock.updateAudioTime();
        }

        let neuralPatch = null;
        let frameMeta = {};
        const diag = this.syncClock.getDiagnostics();

        if (this.state === VOICE_STATES.SPEAKING) {
          const syncResult = this.syncClock.getCurrentSyncFrame();
          if (syncResult && syncResult.frame) {
            neuralPatch = syncResult.frame.patchImageData;
            frameMeta = {
              inferenceMs: syncResult.frame.inferenceLatencyMs,
              frameIndex: syncResult.frame.frameIndex,
              fps: diag.fps,
              avDeltaMs: diag.avDeltaMs,
              provider: this.activeProvider,
            };
          }
        } else {
          frameMeta = {
            fps: diag.fps,
            avDeltaMs: diag.avDeltaMs,
            provider: this.activeProvider,
          };
        }

        this.compositor.renderFrame(this.videoElement, neuralPatch, frameMeta);

        if (this.onDiagnosticsUpdate) {
          this.onDiagnosticsUpdate({
            provider: this.activeProvider,
            error: this.initError || null,
            tier: this.tier,
            resolution: '96x96',
            fps: diag.fps,
            inferenceMs: this.lastInferenceMs || diag.averageInferenceMs,
            inferenceCount: this.inferenceCount,
            avDeltaMs: diag.avDeltaMs,
            droppedFrames: diag.droppedFrames,
            queuedFrames: diag.queuedFrames,
            proceduralFallback: 'DISABLED',
            modelName: 'Wav2Lip ONNX (36.28M)',
            modelSize: '138.45 MB',
          });
        }
      }

      this.animFrameId = requestAnimationFrame(render);
    };

    this.animFrameId = requestAnimationFrame(render);
  }

  handleBargeIn() {
    this.syncClock.stopAndFlush();
    this.audioExtractor.reset();
    this.frameIndexCounter = 0;
  }

  destroy() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.worker) {
      this.worker.postMessage({ type: 'DISPOSE' });
      this.worker.terminate();
      this.worker = null;
    }

    if (this.compositor) {
      this.compositor.destroy();
      this.compositor = null;
    }

    this.syncClock.stopAndFlush();
    this.audioExtractor.reset();
    this.isInitialized = false;
  }
}
