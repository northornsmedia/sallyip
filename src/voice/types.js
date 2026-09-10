/**
 * SallyIP Voice System - Types & Configuration
 * 
 * 12-state authoritative voice session state machine definitions,
 * default acoustic VAD tuning, and telemetry contracts.
 */

export const VOICE_STATES = {
  IDLE: 'IDLE',
  REQUESTING_MIC_PERMISSION: 'REQUESTING_MIC_PERMISSION',
  LISTENING: 'LISTENING',
  SPEECH_DETECTED: 'SPEECH_DETECTED',
  CAPTURING: 'CAPTURING',
  TRANSCRIBING: 'TRANSCRIBING',
  THINKING: 'THINKING',
  SPEAKING: 'SPEAKING',
  INTERRUPTING: 'INTERRUPTING',
  CANCELLING: 'CANCELLING',
  ERROR: 'ERROR',
  DISCONNECTED: 'DISCONNECTED',
};

export const VOICE_EVENTS = {
  START_CALL: 'START_CALL',
  MIC_GRANTED: 'MIC_GRANTED',
  MIC_DENIED: 'MIC_DENIED',
  USER_STARTED_SPEAKING: 'USER_STARTED_SPEAKING',
  USER_CONTINUED_SPEAKING: 'USER_CONTINUED_SPEAKING',
  USER_STOPPED_SPEAKING: 'USER_STOPPED_SPEAKING',
  TRANSCRIPT_PARTIAL: 'TRANSCRIPT_PARTIAL',
  TRANSCRIPT_FINAL: 'TRANSCRIPT_FINAL',
  LLM_START: 'LLM_START',
  LLM_TOKEN: 'LLM_TOKEN',
  TTS_START: 'TTS_START',
  TTS_AUDIO_READY: 'TTS_AUDIO_READY',
  PLAYBACK_STARTED: 'PLAYBACK_STARTED',
  PLAYBACK_FINISHED: 'PLAYBACK_FINISHED',
  USER_BARGE_IN: 'USER_BARGE_IN',
  MANUAL_STOP: 'MANUAL_STOP',
  CANCEL_COMPLETE: 'CANCEL_COMPLETE',
  ERROR: 'ERROR',
  DISCONNECT: 'DISCONNECT',
};

export const DEFAULT_VOICE_CONFIG = {
  // VAD Energy & Timing
  energyThresholdListening: 0.015,     // RMS threshold when idle listening
  energyThresholdSpeaking: 0.035,      // Higher RMS threshold during assistant playback (echo guard)
  minSpeechDurationMs: 180,            // Minimum speech duration to trigger SPEECH_DETECTED
  minInterruptionDurationMs: 160,      // Minimum speech duration to trigger barge-in while speaking
  silenceTimeoutMs: 750,               // Silence duration before concluding user turn
  maxTurnDurationMs: 25000,            // Absolute max turn capture before forced finalization

  // Audio constraints
  sampleRate: 24000,
  fftSize: 512,
  smoothingTimeConstant: 0.2,

  // Text segmentation for streaming TTS
  minSentenceLength: 18,               // Minimum character length before dispatching a sentence
  sentencePunctuation: ['.', '?', '!', '\n', ';'],
  clausePunctuation: [',', ' - '],

  // Models & Endpoints
  ttsModel: 'fish-audio/s2.1-pro-free:free',
  ttsEndpoint: '/api/voice/speak',
  transcribeEndpoint: '/api/voice/transcribe',
  cancelEndpoint: '/api/voice/cancel',
  sessionEndpoint: '/api/voice/session',
  chatStreamEndpoint: '/api/chat-stream',
};

export const createTelemetrySession = (sessionId = `vsess-${Date.now()}`) => ({
  sessionId,
  startTime: Date.now(),
  bargeInCount: 0,
  bargeInLatencies: [],
  turns: [],
  activeTurn: null,
});

export const createTurnTelemetry = (turnId = `turn-${Date.now()}`) => ({
  turnId,
  userSpeechStartedAt: 0,
  userSpeechDetectedAt: 0,
  userSpeechEndedAt: 0,
  micToSpeechDetectionMs: 0,
  speechEndToTranscriptMs: 0,
  transcriptToFirstLlmTokenMs: 0,
  llmToFirstTtsRequestMs: 0,
  ttsFirstByteMs: 0,
  ttsFirstAudioMs: 0,
  totalTimeToFirstVoiceMs: 0,
  bargeInLatencyMs: null,
  wasInterrupted: false,
});
