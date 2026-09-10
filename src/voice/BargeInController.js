/**
 * SallyIP BargeInController
 * 
 * Orchestrates instantaneous user interruption (barge-in),
 * acoustic echo guards, and latency telemetry measurement.
 */

export class BargeInController {
  constructor(playbackController, config = {}) {
    this.playbackController = playbackController;
    this.config = {
      minInterruptionDurationMs: config.minInterruptionDurationMs || 160,
      echoSuppressionWindowMs: config.echoSuppressionWindowMs || 250,
      ...config,
    };

    this.onInterruption = null;
    this.lastPlaybackStartTime = 0;
  }

  /**
   * Notify that assistant playback has started
   */
  notifyPlaybackStarted(timestamp = Date.now()) {
    this.lastPlaybackStartTime = timestamp;
  }

  /**
   * Handle speech start event from VAD
   */
  handleSpeechDetected({ isSpeakingMode, rms, timestamp = Date.now() }) {
    // If assistant was not speaking, this is normal turn initiation, not barge-in
    if (!isSpeakingMode && !this.playbackController.isPlaying) {
      return null;
    }

    const speechDetectedTime = timestamp;

    // Execute instantaneous audio halt
    const stopResult = this.playbackController.stopAndClear('USER_BARGE_IN');
    const audioStoppedTime = Date.now();

    const bargeInLatencyMs = Math.max(0, audioStoppedTime - speechDetectedTime);

    const interruptionPayload = {
      interrupted: true,
      reason: 'USER_BARGE_IN',
      speechDetectedAt: speechDetectedTime,
      audioStoppedAt: audioStoppedTime,
      bargeInLatencyMs,
      rms,
      stopResult,
    };

    if (this.onInterruption) {
      this.onInterruption(interruptionPayload);
    }

    return interruptionPayload;
  }

  /**
   * Handle manual user stop button click
   */
  handleManualStop(timestamp = Date.now()) {
    const stopResult = this.playbackController.stopAndClear('MANUAL_STOP');
    const interruptionPayload = {
      interrupted: true,
      reason: 'MANUAL_STOP',
      audioStoppedAt: timestamp,
      bargeInLatencyMs: stopResult.stopLatencyMs,
      stopResult,
    };

    if (this.onInterruption) {
      this.onInterruption(interruptionPayload);
    }

    return interruptionPayload;
  }
}
