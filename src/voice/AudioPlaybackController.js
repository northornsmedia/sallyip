/**
 * SallyIP AudioPlaybackController
 * 
 * Chunked audio queue manager with immediate interruption stopping (<15ms),
 * generation ID invalidation to reject stale chunks, and WebAudio buffer playback.
 */

export class AudioPlaybackController {
  constructor(config = {}) {
    this.config = config;
    this.audioContext = null;
    this.activeGenerationId = 0;
    this.queuedChunks = [];
    this.isPlaying = false;
    this.currentSource = null;
    this.currentAudioElement = null;

    // Callbacks
    this.onPlaybackStarted = null;
    this.onPlaybackFinished = null;
    this.onChunkStarted = null;
    this.onChunkEnded = null;
  }

  /**
   * Ensure WebAudio context exists and is running
   */
  async getAudioContext() {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.audioContext = new AudioCtx();
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    return this.audioContext;
  }

  /**
   * Start a new assistant generation, returning the assigned generation ID
   */
  startNewGeneration() {
    this.stopAndClear('NEW_GENERATION');
    return this.activeGenerationId;
  }

  /**
   * Enqueue an audio chunk for the current generation.
   * If the chunk belongs to an outdated generation ID, it is immediately discarded.
   */
  async enqueueChunk({ generationId, audioBlob, audioBuffer, text, chunkIndex }) {
    if (generationId !== this.activeGenerationId) {
      // Stale generation from interrupted turn: discard immediately!
      return false;
    }

    const chunk = {
      generationId,
      audioBlob,
      audioBuffer,
      text,
      chunkIndex,
      receivedAt: Date.now(),
    };

    this.queuedChunks.push(chunk);

    if (!this.isPlaying) {
      this.playNextChunk();
    }

    return true;
  }

  /**
   * Play the next queued audio chunk
   */
  async playNextChunk() {
    if (this.queuedChunks.length === 0) {
      if (this.isPlaying) {
        this.isPlaying = false;
        if (this.onPlaybackFinished) {
          this.onPlaybackFinished({ generationId: this.activeGenerationId });
        }
      }
      return;
    }

    const chunk = this.queuedChunks.shift();

    // Verify generation validity before playback
    if (chunk.generationId !== this.activeGenerationId) {
      this.playNextChunk();
      return;
    }

    this.isPlaying = true;
    if (this.onPlaybackStarted && this.queuedChunks.length === 0) {
      this.onPlaybackStarted({ generationId: chunk.generationId, text: chunk.text });
    }
    if (this.onChunkStarted) {
      this.onChunkStarted(chunk);
    }

    try {
      if (chunk.audioBuffer) {
        await this.playAudioBuffer(chunk);
      } else if (chunk.audioBlob) {
        await this.playAudioBlob(chunk);
      }
    } catch (err) {
      console.warn('[AudioPlaybackController] Chunk playback failed:', err.message);
    }

    // When chunk completes or errors, advance to next
    if (this.onChunkEnded) {
      this.onChunkEnded(chunk);
    }

    if (chunk.generationId === this.activeGenerationId) {
      this.playNextChunk();
    }
  }

  /**
   * Play chunk via WebAudio AudioBufferSourceNode
   */
  async playAudioBuffer(chunk) {
    const ctx = await this.getAudioContext();
    if (!ctx) return;

    return new Promise((resolve) => {
      const source = ctx.createBufferSource();
      source.buffer = chunk.audioBuffer;
      source.connect(ctx.destination);
      this.currentSource = source;

      source.onended = () => {
        if (this.currentSource === source) {
          this.currentSource = null;
        }
        resolve();
      };

      source.start(0);
    });
  }

  /**
   * Play chunk via HTMLAudioElement (works directly with MP3 blobs)
   */
  async playAudioBlob(chunk) {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(chunk.audioBlob);
      const audio = new Audio(url);
      this.currentAudioElement = audio;

      const cleanup = () => {
        URL.revokeObjectURL(url);
        if (this.currentAudioElement === audio) {
          this.currentAudioElement = null;
        }
        resolve();
      };

      audio.onended = cleanup;
      audio.onerror = cleanup;

      audio.play().catch((err) => {
        console.warn('[AudioPlaybackController] Audio.play() blocked/interrupted:', err.message);
        cleanup();
      });
    });
  }

  /**
   * CRITICAL BARGE-IN: Stop all playback immediately (<15ms),
   * flush the audio queue, and invalidate active generation ID.
   */
  stopAndClear(reason = 'USER_BARGE_IN') {
    const stopStarted = performance.now ? performance.now() : Date.now();

    // 1. Invalidate generation ID so any pending network chunks are rejected
    this.activeGenerationId += 1;

    // 2. Clear queued audio chunks
    this.queuedChunks = [];

    // 3. Immediately halt WebAudio source node
    if (this.currentSource) {
      try {
        this.currentSource.stop(0);
        this.currentSource.disconnect();
      } catch {}
      this.currentSource = null;
    }

    // 4. Immediately halt HTMLAudioElement
    if (this.currentAudioElement) {
      try {
        this.currentAudioElement.pause();
        this.currentAudioElement.currentTime = 0;
        this.currentAudioElement.src = '';
      } catch {}
      this.currentAudioElement = null;
    }

    this.isPlaying = false;

    const stopElapsed = (performance.now ? performance.now() : Date.now()) - stopStarted;
    return {
      reason,
      stopLatencyMs: stopElapsed,
      newGenerationId: this.activeGenerationId,
    };
  }
}
