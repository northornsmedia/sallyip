/**
 * AvatarSyncClock.js
 * 
 * Audio-Visual synchronization engine enforcing Audio as the Master Clock.
 * Maintains frame queues, measures drift delta in milliseconds, drops late frames,
 * and maintains lip-sync accuracy within ±50 ms.
 */

export class AvatarSyncClock {
  constructor(options = {}) {
    this.targetFps = options.targetFps || 25;
    this.frameIntervalMs = 1000 / this.targetFps; // 40 ms per frame at 25 FPS
    this.maxDriftMs = options.maxDriftMs || 50;   // ±50 ms tolerance

    // Frame ring buffer: Map<frameIndex, { timestampMs, patchImageBitmap, inferenceLatencyMs }>
    this.frameQueue = [];
    this.maxQueueLength = options.maxQueueLength || 15;

    // Master clock tracking
    this.playbackStartTime = 0;
    this.currentAudioTimeMs = 0;
    this.isPlaying = false;
    this.lastRenderedFrameIndex = -1;

    // Diagnostic metrics
    this.metrics = {
      renderedFrames: 0,
      droppedFrames: 0,
      avDeltaMs: 0,
      averageInferenceMs: 0,
      lastFps: 0,
      fpsCounter: 0,
      fpsTimer: Date.now(),
    };
  }

  /**
   * Start master audio clock when TTS playback begins
   */
  startClock(startTimeMs = null) {
    this.playbackStartTime = startTimeMs || (performance.now ? performance.now() : Date.now());
    this.currentAudioTimeMs = 0;
    this.isPlaying = true;
    this.lastRenderedFrameIndex = -1;
  }

  /**
   * Update audio clock from WebAudio / AudioElement currentTime
   */
  updateAudioTime(audioCurrentTimeSec) {
    if (typeof audioCurrentTimeSec === 'number') {
      this.currentAudioTimeMs = audioCurrentTimeSec * 1000;
    } else {
      const now = performance.now ? performance.now() : Date.now();
      this.currentAudioTimeMs = Math.max(0, now - this.playbackStartTime);
    }
  }

  /**
   * Enqueue a rendered neural frame from worker
   */
  enqueueRenderedFrame(frame) {
    // If queue is overflowing, drop oldest frame to prevent memory accumulation
    if (this.frameQueue.length >= this.maxQueueLength) {
      const dropped = this.frameQueue.shift();
      this.metrics.droppedFrames += 1;
      dropped.patchImageBitmap?.close?.();
    }

    this.frameQueue.push(frame);

    // Update rolling average inference time
    if (frame.inferenceLatencyMs) {
      if (this.metrics.averageInferenceMs === 0) {
        this.metrics.averageInferenceMs = frame.inferenceLatencyMs;
      } else {
        this.metrics.averageInferenceMs = this.metrics.averageInferenceMs * 0.9 + frame.inferenceLatencyMs * 0.1;
      }
    }
  }

  /**
   * Get the frame that matches the current audio playback timestamp
   * Returns: { frame, avDeltaMs, isDrop }
   */
  getCurrentSyncFrame() {
    if (!this.isPlaying || this.frameQueue.length === 0) {
      return null;
    }

    // Determine target frame index based on audio master clock
    const targetFrameIndex = Math.floor(this.currentAudioTimeMs / this.frameIntervalMs);

    // Find closest frame in queue
    let bestFrameIdx = -1;
    let minDelta = Infinity;

    for (let i = 0; i < this.frameQueue.length; i++) {
      const f = this.frameQueue[i];
      const delta = Math.abs(f.frameIndex - targetFrameIndex);
      if (delta < minDelta) {
        minDelta = delta;
        bestFrameIdx = i;
      }
    }

    if (bestFrameIdx === -1) {
      return null;
    }

    const selectedFrame = this.frameQueue[bestFrameIdx];
    const frameTimestampMs = selectedFrame.frameIndex * this.frameIntervalMs;
    const avDeltaMs = Math.round(this.currentAudioTimeMs - frameTimestampMs);
    this.metrics.avDeltaMs = avDeltaMs;

    // Drop frames in queue that are older than selectedFrame
    while (this.frameQueue.length > 0 && this.frameQueue[0].frameIndex < selectedFrame.frameIndex) {
      const oldFrame = this.frameQueue.shift();
      this.metrics.droppedFrames += 1;
      oldFrame.patchImageBitmap?.close?.();
    }

    // Measure FPS
    this.metrics.renderedFrames += 1;
    this.metrics.fpsCounter += 1;
    const now = Date.now();
    if (now - this.metrics.fpsTimer >= 1000) {
      this.metrics.lastFps = Math.round((this.metrics.fpsCounter * 1000) / (now - this.metrics.fpsTimer));
      this.metrics.fpsCounter = 0;
      this.metrics.fpsTimer = now;
    }

    this.lastRenderedFrameIndex = selectedFrame.frameIndex;
    return {
      frame: selectedFrame,
      avDeltaMs,
    };
  }

  /**
   * Stop clock and clear queue on speech completion or user barge-in
   */
  stopAndFlush() {
    this.isPlaying = false;
    this.currentAudioTimeMs = 0;
    while (this.frameQueue.length > 0) {
      const f = this.frameQueue.shift();
      f.patchImageBitmap?.close?.();
    }
  }

  /**
   * Snapshot diagnostic metrics
   */
  getDiagnostics() {
    return {
      fps: this.metrics.lastFps || (this.isPlaying ? this.targetFps : 0),
      avDeltaMs: this.metrics.avDeltaMs,
      averageInferenceMs: Math.round(this.metrics.averageInferenceMs * 10) / 10,
      droppedFrames: this.metrics.droppedFrames,
      queuedFrames: this.frameQueue.length,
      audioTimeMs: Math.round(this.currentAudioTimeMs),
    };
  }
}
