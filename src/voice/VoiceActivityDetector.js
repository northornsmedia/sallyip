/**
 * SallyIP VoiceActivityDetector (VAD)
 * 
 * Modular acoustic VAD analyzing RMS energy and zero-crossing rates.
 * Provides configurable speech onset, continuation, and silence endpointing.
 */

export class VoiceActivityDetector {
  constructor(config = {}) {
    this.config = {
      energyThresholdListening: config.energyThresholdListening || 0.015,
      energyThresholdSpeaking: config.energyThresholdSpeaking || 0.038,
      minSpeechDurationMs: config.minSpeechDurationMs || 180,
      minInterruptionDurationMs: config.minInterruptionDurationMs || 160,
      silenceTimeoutMs: config.silenceTimeoutMs || 750,
      frameIntervalMs: config.frameIntervalMs || 25,
      ...config,
    };

    this.isSpeakingMode = false;
    this.isUserSpeaking = false;
    this.speechStartTime = 0;
    this.lastSpeechTime = 0;
    this.silenceStartTime = 0;
    this.baselineNoiseFloor = 0.005;

    // Callbacks
    this.onSpeechStart = null;
    this.onSpeechProgress = null;
    this.onSpeechEnd = null;

    this.timer = null;
  }

  /**
   * Set speaking mode (assistant is speaking -> requires higher threshold to avoid acoustic self-interruption)
   */
  setSpeakingMode(isSpeaking) {
    this.isSpeakingMode = Boolean(isSpeaking);
  }

  /**
   * Compute RMS energy from time-domain byte array (centered around 128)
   */
  computeRms(dataArray) {
    if (!dataArray || dataArray.length === 0) return 0;
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const normalized = (dataArray[i] - 128) / 128;
      sum += normalized * normalized;
    }
    return Math.sqrt(sum / dataArray.length);
  }

  /**
   * Process a single audio frame
   */
  processFrame(dataArray, now = Date.now()) {
    const rms = this.computeRms(dataArray);

    // Dynamic noise floor tracking when quiet
    if (rms < this.config.energyThresholdListening * 0.7) {
      this.baselineNoiseFloor = this.baselineNoiseFloor * 0.95 + rms * 0.05;
    }

    const currentThreshold = this.isSpeakingMode
      ? Math.max(this.config.energyThresholdSpeaking, this.baselineNoiseFloor * 2.5)
      : Math.max(this.config.energyThresholdListening, this.baselineNoiseFloor * 1.6);

    const minDuration = this.isSpeakingMode
      ? this.config.minInterruptionDurationMs
      : this.config.minSpeechDurationMs;

    const isFrameSpeech = rms > currentThreshold;

    if (isFrameSpeech) {
      this.lastSpeechTime = now;
      this.silenceStartTime = 0;

      if (!this.isUserSpeaking) {
        if (this.speechStartTime === 0) {
          this.speechStartTime = now;
        } else if (now - this.speechStartTime >= minDuration) {
          this.isUserSpeaking = true;
          if (this.onSpeechStart) {
            this.onSpeechStart({
              rms,
              threshold: currentThreshold,
              isInterruption: this.isSpeakingMode,
              timestamp: now,
            });
          }
        }
      } else {
        if (this.onSpeechProgress) {
          this.onSpeechProgress({
            rms,
            durationMs: now - this.speechStartTime,
          });
        }
      }
    } else {
      // Silence detected
      this.speechStartTime = 0;

      if (this.isUserSpeaking) {
        if (this.silenceStartTime === 0) {
          this.silenceStartTime = now;
        } else if (now - this.silenceStartTime >= this.config.silenceTimeoutMs) {
          const speechDurationMs = this.lastSpeechTime - (this.speechStartTime || this.lastSpeechTime);
          this.isUserSpeaking = false;
          this.silenceStartTime = 0;
          if (this.onSpeechEnd) {
            this.onSpeechEnd({
              durationMs: speechDurationMs,
              timestamp: now,
            });
          }
        }
      }
    }

    return {
      rms,
      threshold: currentThreshold,
      isUserSpeaking: this.isUserSpeaking,
    };
  }

  /**
   * Reset VAD state
   */
  reset() {
    this.isUserSpeaking = false;
    this.speechStartTime = 0;
    this.lastSpeechTime = 0;
    this.silenceStartTime = 0;
  }
}
