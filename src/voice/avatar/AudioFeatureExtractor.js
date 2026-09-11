/**
 * AudioFeatureExtractor.js
 * 
 * Browser-side real-time speech feature extraction for neural talking-head models.
 * Computes 80-channel log-Mel spectrograms from streaming raw PCM audio chunks.
 * 
 * Target Audio Pipeline:
 * - Target Sample Rate: 16,000 Hz (standard speech-to-face sample rate)
 * - FFT Size: 512 (32 ms window)
 * - Hop Length: 160 samples (10 ms hop -> 100 mel frames / sec)
 * - Mel Bins: 80 (55 Hz to 7,600 Hz)
 * - Output Window: 16 mel frames per video frame at 25 FPS (~160 ms temporal context)
 */

export class AudioFeatureExtractor {
  constructor(options = {}) {
    this.sampleRate = options.sampleRate || 16000;
    this.nFft = options.nFft || 512;
    this.hopLength = options.hopLength || 160;
    this.nMels = options.nMels || 80;
    this.fMin = options.fMin || 55.0;
    this.fMax = options.fMax || 7600.0;
    this.contextMelFrames = options.contextMelFrames || 16; // 16 frames = 160ms context window

    // Precompute Hann window and Mel filterbank matrix
    this.hannWindow = this.createHannWindow(this.nFft);
    this.melFilterbank = this.createMelFilterbank(this.nFft, this.nMels, this.sampleRate, this.fMin, this.fMax);

    // Continuous audio ring buffer
    this.pcmBuffer = new Float32Array(0);
    this.melSpectrogramHistory = []; // Array of Float32Array(80)
  }

  /**
   * Create Hann window for windowed FFT
   */
  createHannWindow(n) {
    const win = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      win[i] = 0.5 * (1.0 - Math.cos((2.0 * Math.PI * i) / (n - 1)));
    }
    return win;
  }

  /**
   * Convert frequency (Hz) to Mel scale
   */
  hzToMel(hz) {
    return 2595.0 * Math.log10(1.0 + hz / 700.0);
  }

  /**
   * Convert Mel scale to frequency (Hz)
   */
  melToHz(mel) {
    return 700.0 * (Math.pow(10.0, mel / 2595.0) - 1.0);
  }

  /**
   * Precompute 80-channel triangular Mel filterbank matrix: [nMels][nFft / 2 + 1]
   */
  createMelFilterbank(nFft, nMels, sampleRate, fMin, fMax) {
    const nFftBins = Math.floor(nFft / 2) + 1;
    const minMel = this.hzToMel(fMin);
    const maxMel = this.hzToMel(fMax);

    const melPoints = new Float32Array(nMels + 2);
    for (let i = 0; i < nMels + 2; i++) {
      melPoints[i] = minMel + (i / (nMels + 1)) * (maxMel - minMel);
    }

    const hzPoints = new Float32Array(nMels + 2);
    for (let i = 0; i < nMels + 2; i++) {
      hzPoints[i] = this.melToHz(melPoints[i]);
    }

    const binPoints = new Int32Array(nMels + 2);
    for (let i = 0; i < nMels + 2; i++) {
      binPoints[i] = Math.floor(((nFft + 1) * hzPoints[i]) / sampleRate);
    }

    const filterbank = [];
    for (let m = 0; m < nMels; m++) {
      const row = new Float32Array(nFftBins);
      const left = binPoints[m];
      const center = binPoints[m + 1];
      const right = binPoints[m + 2];

      for (let k = left; k < center && k < nFftBins; k++) {
        row[k] = (k - left) / (center - left);
      }
      for (let k = center; k < right && k < nFftBins; k++) {
        row[k] = (right - k) / (right - center);
      }
      filterbank.push(row);
    }

    return filterbank;
  }

  /**
   * Resample input PCM buffer (e.g. from 24kHz/48kHz) to 16kHz
   */
  resampleTo16k(inputPcm, inputSampleRate) {
    if (inputSampleRate === this.sampleRate) {
      return inputPcm;
    }

    const ratio = this.sampleRate / inputSampleRate;
    const outLength = Math.round(inputPcm.length * ratio);
    const output = new Float32Array(outLength);

    for (let i = 0; i < outLength; i++) {
      const srcIdx = i / ratio;
      const index = Math.floor(srcIdx);
      const frac = srcIdx - index;

      if (index + 1 < inputPcm.length) {
        output[i] = inputPcm[index] * (1 - frac) + inputPcm[index + 1] * frac;
      } else if (index < inputPcm.length) {
        output[i] = inputPcm[index];
      }
    }
    return output;
  }

  /**
   * Ingest a chunk of PCM audio data, resample if necessary, and extract Mel spectrogram frames
   */
  ingestAudio(pcmFloat32, inputSampleRate = 16000) {
    const resampled = this.resampleTo16k(pcmFloat32, inputSampleRate);

    // Append to continuous PCM buffer
    const merged = new Float32Array(this.pcmBuffer.length + resampled.length);
    merged.set(this.pcmBuffer, 0);
    merged.set(resampled, this.pcmBuffer.length);
    this.pcmBuffer = merged;

    // Process available complete frames
    const newMelFrames = [];
    while (this.pcmBuffer.length >= this.nFft) {
      const frameSlice = this.pcmBuffer.subarray(0, this.nFft);
      const melFrame = this.computeSingleFrameMel(frameSlice);
      this.melSpectrogramHistory.push(melFrame);
      newMelFrames.push(melFrame);

      // Advance by hopLength
      this.pcmBuffer = this.pcmBuffer.slice(this.hopLength);
    }

    return newMelFrames;
  }

  /**
   * Compute log-Mel spectrum for one window of 512 PCM samples
   */
  computeSingleFrameMel(frameSamples) {
    const nFftBins = Math.floor(this.nFft / 2) + 1;
    const real = new Float32Array(this.nFft);
    const imag = new Float32Array(this.nFft);

    // Apply Hann window
    for (let i = 0; i < this.nFft; i++) {
      real[i] = frameSamples[i] * this.hannWindow[i];
      imag[i] = 0.0;
    }

    // Radix-2 Cooley-Tukey FFT (since nFft = 512 is a power of 2)
    this.fft512(real, imag);

    // Power spectrum
    const power = new Float32Array(nFftBins);
    for (let k = 0; k < nFftBins; k++) {
      power[k] = (real[k] * real[k] + imag[k] * imag[k]) / this.nFft;
    }

    // Mel filterbank multiplication and log compression
    const logMel = new Float32Array(this.nMels);
    for (let m = 0; m < this.nMels; m++) {
      const filter = this.melFilterbank[m];
      let sum = 0.0;
      for (let k = 0; k < nFftBins; k++) {
        sum += filter[k] * power[k];
      }
      logMel[m] = Math.log(Math.max(1e-5, sum));
    }

    return logMel;
  }

  /**
   * Fast In-place Radix-2 FFT for N=512
   */
  fft512(real, imag) {
    const n = 512;
    let j = 0;
    for (let i = 0; i < n - 1; i++) {
      if (i < j) {
        let tr = real[i]; real[i] = real[j]; real[j] = tr;
        let ti = imag[i]; imag[i] = imag[j]; imag[j] = ti;
      }
      let k = n >> 1;
      while (k <= j) {
        j -= k;
        k >>= 1;
      }
      j += k;
    }

    for (let len = 2; len <= n; len <<= 1) {
      const half = len >> 1;
      const angle = (-2.0 * Math.PI) / len;
      const wStepR = Math.cos(angle);
      const wStepI = Math.sin(angle);

      for (let i = 0; i < n; i += len) {
        let wr = 1.0;
        let wi = 0.0;
        for (let k = 0; k < half; k++) {
          const uR = real[i + k];
          const uI = imag[i + k];
          const vR = real[i + k + half] * wr - imag[i + k + half] * wi;
          const vI = real[i + k + half] * wi + imag[i + k + half] * wr;

          real[i + k] = uR + vR;
          imag[i + k] = uI + vI;
          real[i + k + half] = uR - vR;
          imag[i + k + half] = uI - vI;

          const nextWr = wr * wStepR - wi * wStepI;
          wi = wr * wStepI + wi * wStepR;
          wr = nextWr;
        }
      }
    }
  }

  /**
   * Get an audio feature tensor slice of shape [1, 1, 80, 16] for neural inference at time `melIndex`
   */
  getMelTensorForFrame(targetMelIndex) {
    const halfCtx = Math.floor(this.contextMelFrames / 2);
    const startIdx = targetMelIndex - halfCtx;
    const tensorData = new Float32Array(1 * 1 * this.nMels * this.contextMelFrames);

    for (let t = 0; t < this.contextMelFrames; t++) {
      const currentIdx = startIdx + t;
      let frame = null;

      if (currentIdx >= 0 && currentIdx < this.melSpectrogramHistory.length) {
        frame = this.melSpectrogramHistory[currentIdx];
      }

      for (let m = 0; m < this.nMels; m++) {
        // Layout: [1, 1, 80, 16] -> channel * (80 * 16) + m * 16 + t
        const destIdx = m * this.contextMelFrames + t;
        tensorData[destIdx] = frame ? frame[m] : -11.5129; // log(1e-5) silent baseline
      }
    }

    return tensorData;
  }

  /**
   * Reset buffers on turn completion or barge-in interruption (<5ms)
   */
  reset() {
    this.pcmBuffer = new Float32Array(0);
    this.melSpectrogramHistory = [];
  }
}
