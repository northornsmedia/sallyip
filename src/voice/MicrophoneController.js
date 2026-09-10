/**
 * SallyIP MicrophoneController
 * 
 * Manages audio stream acquisition, WebAudio graph binding,
 * permission states, and device change handling.
 */

export class MicrophoneController {
  constructor(config = {}) {
    this.config = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: config.sampleRate || 24000,
      fftSize: config.fftSize || 512,
      smoothingTimeConstant: config.smoothingTimeConstant || 0.2,
      ...config,
    };

    this.stream = null;
    this.audioContext = null;
    this.sourceNode = null;
    this.analyserNode = null;
    this.isMuted = false;
    this.isListening = false;
    this.onDeviceDisconnect = null;
  }

  /**
   * Request microphone stream and attach to WebAudio analyser
   */
  async requestMicrophone() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      const err = new Error('Microphone API (getUserMedia) not supported in this environment');
      err.code = 'MIC_UNAVAILABLE';
      throw err;
    }

    try {
      const constraints = {
        audio: {
          echoCancellation: this.config.echoCancellation,
          noiseSuppression: this.config.noiseSuppression,
          autoGainControl: this.config.autoGainControl,
        },
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Initialize Web Audio Context
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        if (!this.audioContext || this.audioContext.state === 'closed') {
          this.audioContext = new AudioCtx({ sampleRate: this.config.sampleRate });
        }
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }

        this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
        this.analyserNode = this.audioContext.createAnalyser();
        this.analyserNode.fftSize = this.config.fftSize;
        this.analyserNode.smoothingTimeConstant = this.config.smoothingTimeConstant;
        this.sourceNode.connect(this.analyserNode);
      }

      // Listen for track ending or device disconnects
      const audioTrack = this.stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.onended = () => {
          if (this.onDeviceDisconnect) {
            this.onDeviceDisconnect();
          }
        };
      }

      this.isListening = true;
      return this.stream;
    } catch (error) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        const err = new Error('Microphone permission denied by user');
        err.code = 'MIC_DENIED';
        throw err;
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        const err = new Error('No microphone device found on system');
        err.code = 'MIC_NOT_FOUND';
        throw err;
      }
      throw error;
    }
  }

  /**
   * Retrieve current time-domain audio data for VAD analysis
   */
  getTimeDomainData() {
    if (!this.analyserNode) return null;
    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteTimeDomainData(dataArray);
    return dataArray;
  }

  /**
   * Toggle mute state of microphone tracks
   */
  setMuted(muted) {
    this.isMuted = Boolean(muted);
    if (this.stream) {
      this.stream.getAudioTracks().forEach(track => {
        track.enabled = !this.isMuted;
      });
    }
    return this.isMuted;
  }

  /**
   * Disconnect and release all media stream and WebAudio resources
   */
  stop() {
    this.isListening = false;
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {}
      this.sourceNode = null;
    }
    if (this.analyserNode) {
      try {
        this.analyserNode.disconnect();
      } catch {}
      this.analyserNode = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch {}
      });
      this.stream = null;
    }
  }
}
