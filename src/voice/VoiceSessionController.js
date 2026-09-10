/**
 * SallyIP VoiceSessionController
 * 
 * Master authoritative 12-state state machine orchestrating full-duplex
 * conversational voice mode with acoustic VAD, instant barge-in interruption,
 * sentence-segmented streaming TTS via Fish Audio, and context retention.
 */

import { VOICE_STATES, DEFAULT_VOICE_CONFIG, createTelemetrySession, createTurnTelemetry } from './types.js';
import { MicrophoneController } from './MicrophoneController.js';
import { VoiceActivityDetector } from './VoiceActivityDetector.js';
import { AudioPlaybackController } from './AudioPlaybackController.js';
import { BargeInController } from './BargeInController.js';
import { TranscriptController } from './transcript.js';
import { ConversationalContext } from './ConversationalContext.js';

export class VoiceSessionController {
  constructor(config = {}) {
    this.config = { ...DEFAULT_VOICE_CONFIG, ...config };

    this.state = VOICE_STATES.IDLE;
    this.stateListeners = new Set();

    // Sub-controllers
    this.micController = new MicrophoneController(this.config);
    this.vad = new VoiceActivityDetector(this.config);
    this.playbackController = new AudioPlaybackController(this.config);
    this.bargeInController = new BargeInController(this.playbackController, this.config);
    this.transcriptController = new TranscriptController();

    // Telemetry & Session
    this.telemetry = createTelemetrySession();
    this.currentTurn = null;

    // Active network abort controllers
    this.llmAbortController = null;
    this.ttsAbortController = null;

    // Continuous Speech Recognition reference
    this.speechRecognition = null;
    this.isSpeechRecognitionActive = false;

    // Matter and conversation context
    this.matterId = config.matterId || null;
    this.conversationId = config.conversationId || `conv-voice-${Date.now()}`;
    this.context = new ConversationalContext({
      conversationId: this.conversationId,
      matterId: this.matterId,
    });

    // Sentence buffering for streaming TTS
    this.activeGenerationId = 0;
    this.pendingSentenceBuffer = '';
    this.dispatchedChunkCount = 0;

    // Animation frame / timer for VAD audio polling
    this.vadInterval = null;

    this.setupSubControllers();
  }

  /**
   * Register listener for state transitions
   */
  onStateChange(listener) {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  /**
   * Internal transition method
   */
  transitionTo(newState, payload = {}) {
    const oldState = this.state;
    if (oldState === newState) return;

    this.state = newState;

    // Adapt VAD sensitivity based on state
    if (this.vad) {
      this.vad.setSpeakingMode(newState === VOICE_STATES.SPEAKING);
    }

    for (const listener of this.stateListeners) {
      try {
        listener({ oldState, newState, payload, timestamp: Date.now() });
      } catch (err) {
        console.error('[VoiceSessionController] State listener error:', err);
      }
    }
  }

  /**
   * Wire sub-controller event callbacks
   */
  setupSubControllers() {
    // VAD Speech Start
    this.vad.onSpeechStart = (event) => {
      if (this.state === VOICE_STATES.SPEAKING || this.state === VOICE_STATES.THINKING) {
        // Critical Barge-In Interruption!
        this.handleUserBargeIn(event);
      } else if (this.state === VOICE_STATES.LISTENING) {
        this.transitionTo(VOICE_STATES.SPEECH_DETECTED, event);
        setTimeout(() => {
          if (this.state === VOICE_STATES.SPEECH_DETECTED) {
            this.transitionTo(VOICE_STATES.CAPTURING);
          }
        }, 50);
      }
    };

    // VAD Speech End (Turn endpointing)
    this.vad.onSpeechEnd = (event) => {
      if (this.state === VOICE_STATES.CAPTURING || this.state === VOICE_STATES.SPEECH_DETECTED) {
        this.finalizeUserUtterance();
      }
    };

    // Playback finished
    this.playbackController.onPlaybackFinished = ({ generationId }) => {
      if (generationId === this.activeGenerationId && this.state === VOICE_STATES.SPEAKING) {
        this.transcriptController.finalizeAssistantTurn();
        this.transitionTo(VOICE_STATES.LISTENING);
      }
    };

    // Interruption event
    this.bargeInController.onInterruption = (event) => {
      this.telemetry.bargeInCount += 1;
      if (event.bargeInLatencyMs !== null) {
        this.telemetry.bargeInLatencies.push(event.bargeInLatencyMs);
      }
      if (this.currentTurn) {
        this.currentTurn.bargeInLatencyMs = event.bargeInLatencyMs;
        this.currentTurn.wasInterrupted = true;
      }
    };
  }

  /**
   * Start a voice session
   */
  async start() {
    try {
      this.transitionTo(VOICE_STATES.REQUESTING_MIC_PERMISSION);
      await this.micController.requestMicrophone();

      this.startVadPolling();
      this.initContinuousSpeechRecognition();

      this.transitionTo(VOICE_STATES.LISTENING);
    } catch (error) {
      console.error('[VoiceSessionController] Failed to start:', error);
      this.transitionTo(VOICE_STATES.ERROR, { error: error.message });
      throw error;
    }
  }

  /**
   * VAD polling loop extracting time-domain data from microphone
   */
  startVadPolling() {
    if (this.vadInterval) clearInterval(this.vadInterval);
    this.vadInterval = setInterval(() => {
      if (this.state === VOICE_STATES.IDLE || this.state === VOICE_STATES.DISCONNECTED) return;
      const data = this.micController.getTimeDomainData();
      if (data) {
        this.vad.processFrame(data);
      }
    }, 25);
  }

  /**
   * Initialize continuous streaming speech recognition (Web Speech API)
   */
  initContinuousSpeechRecognition() {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        const heardText = (interim || final).trim();

        // If user speaks while assistant is speaking, trigger barge-in immediately
        if (heardText.length > 1 && (this.state === VOICE_STATES.SPEAKING || this.state === VOICE_STATES.THINKING)) {
          this.handleUserBargeIn({ text: heardText });
        }

        if (interim) {
          this.transcriptController.setPartial(interim);
        }

        if (final) {
          this.transcriptController.setPartial('');
          this.submitUserQuery(final.trim());
        }
      };

      recognition.onerror = (err) => {
        if (err.error !== 'no-speech') {
          console.warn('[VoiceSessionController] SpeechRecognition error:', err.error);
        }
      };

      recognition.onend = () => {
        // Automatically restart speech recognition while session is active
        if (this.state !== VOICE_STATES.IDLE && this.state !== VOICE_STATES.DISCONNECTED) {
          setTimeout(() => {
            try {
              if (this.state !== VOICE_STATES.IDLE && this.state !== VOICE_STATES.DISCONNECTED) {
                recognition.start();
              }
            } catch {}
          }, 200);
        }
      };

      this.speechRecognition = recognition;
      recognition.start();
      this.isSpeechRecognitionActive = true;
    } catch (e) {
      console.warn('[VoiceSessionController] SpeechRecognition init failed:', e);
    }
  }

  /**
   * CRITICAL BARGE-IN INTERRUPTION HANDLER (P0)
   */
  handleUserBargeIn(event = {}) {
    const interruptStarted = Date.now();
    this.transitionTo(VOICE_STATES.INTERRUPTING, { ...event, timestamp: interruptStarted });

    // 1. Stop audio playback instantly (<15ms) and clear queued chunks
    this.bargeInController.handleSpeechDetected({
      isSpeakingMode: true,
      rms: event.rms || 0.05,
      timestamp: interruptStarted,
    });

    // 2. Invalidate active generation ID so late tokens and audio chunks are discarded
    this.activeGenerationId += 1;
    this.pendingSentenceBuffer = '';

    // 3. Abort active network requests
    if (this.llmAbortController) {
      try {
        this.llmAbortController.abort();
      } catch {}
      this.llmAbortController = null;
    }

    if (this.ttsAbortController) {
      try {
        this.ttsAbortController.abort();
      } catch {}
      this.ttsAbortController = null;
    }

    // 4. Mark assistant turn as INTERRUPTED in transcript
    this.transcriptController.markAssistantInterrupted('USER_BARGE_IN');

    // 5. Transition immediately to capture the user's interruption
    this.transitionTo(VOICE_STATES.CAPTURING, { isInterruption: true });
  }

  /**
   * Manual Stop button handler
   */
  handleManualStop() {
    this.bargeInController.handleManualStop();
    this.activeGenerationId += 1;
    this.pendingSentenceBuffer = '';

    if (this.llmAbortController) {
      try { this.llmAbortController.abort(); } catch {}
      this.llmAbortController = null;
    }
    if (this.ttsAbortController) {
      try { this.ttsAbortController.abort(); } catch {}
      this.ttsAbortController = null;
    }

    this.transcriptController.markAssistantInterrupted('MANUAL_STOP');
    this.transitionTo(VOICE_STATES.LISTENING);
  }

  /**
   * Finalize user utterance when silence endpoint is reached
   */
  finalizeUserUtterance() {
    const text = this.transcriptController.partialTranscript || this.transcriptController.finalTranscript;
    if (text && text.trim()) {
      this.submitUserQuery(text.trim());
    } else {
      this.transitionTo(VOICE_STATES.LISTENING);
    }
  }

  /**
   * Submit user utterance to LLM streaming pipeline
   */
  async submitUserQuery(userText) {
    if (!userText || !userText.trim()) return;

    this.currentTurn = createTurnTelemetry();
    this.currentTurn.userSpeechEndedAt = Date.now();
    this.telemetry.turns.push(this.currentTurn);

    this.transcriptController.commitFinalUserUtterance(userText);
    this.transitionTo(VOICE_STATES.THINKING);

    const generationId = this.playbackController.startNewGeneration();
    this.activeGenerationId = generationId;
    this.pendingSentenceBuffer = '';
    this.dispatchedChunkCount = 0;

    this.llmAbortController = new AbortController();

    try {
      this.transcriptController.startAssistantTurn();

      // Find previous assistant message to detect clarification context
      const prevAssistantMsg = [...this.transcriptController.messages]
        .slice(0, -2) // exclude current user utterance and newly opened assistant turn
        .reverse()
        .find(m => m.role === 'assistant')?.text || '';

      const resolution = this.context.resolveUtterance(userText, prevAssistantMsg);

      // Build messages for orchestrator with contextualized text on latest turn
      const requestMessages = this.transcriptController.messages.slice(0, -1).map(m => ({
        role: m.role,
        content: m.text,
      }));

      // Replace latest user message with contextualized text
      if (requestMessages.length > 0 && requestMessages[requestMessages.length - 1].role === 'user') {
        requestMessages[requestMessages.length - 1].content = resolution.contextualizedText;
      }

      // Dispatch request to streaming chat endpoint
      const response = await fetch(this.config.chatStreamEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: this.llmAbortController.signal,
        body: JSON.stringify({
          mode: this.matterId ? 'CONFIDENTIAL_IP' : 'PUBLIC_RESEARCH',
          messages: requestMessages,
          matter_id: this.matterId,
          conversation_id: this.conversationId,
        }),
      });

      if (!response.ok) {
        throw new Error(`LLM stream returned HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        // Verify generation is still valid (not interrupted)
        if (generationId !== this.activeGenerationId) {
          reader.cancel();
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const jsonStr = trimmed.slice(5).trim();
          if (!jsonStr) continue;

          try {
            const data = JSON.parse(jsonStr);
            if (data.type === 'delta' && data.delta) {
              if (this.currentTurn.transcriptToFirstLlmTokenMs === 0) {
                this.currentTurn.transcriptToFirstLlmTokenMs = Date.now() - this.currentTurn.userSpeechEndedAt;
              }
              this.handleIncomingTokenDelta(data.delta, generationId);
            }
          } catch {}
        }
      }

      // Flush remaining buffered text
      if (generationId === this.activeGenerationId && this.pendingSentenceBuffer.trim()) {
        this.dispatchSentenceToTts(this.pendingSentenceBuffer.trim(), generationId);
        this.pendingSentenceBuffer = '';
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        // Normal interruption abort, not an application error
        return;
      }
      console.error('[VoiceSessionController] Turn execution error:', error);
      this.transitionTo(VOICE_STATES.ERROR, { error: error.message });
    }
  }

  /**
   * Sentence segmenter: partitions streamed tokens by grammatical boundaries
   * and immediately dispatches completed sentences to Fish Audio TTS.
   */
  handleIncomingTokenDelta(delta, generationId) {
    if (generationId !== this.activeGenerationId) return;

    this.transcriptController.appendAssistantDelta(delta);
    this.pendingSentenceBuffer += delta;

    const buffer = this.pendingSentenceBuffer;
    let matchIdx = -1;

    for (const punct of this.config.sentencePunctuation) {
      const idx = buffer.indexOf(punct);
      if (idx !== -1 && idx >= this.config.minSentenceLength) {
        if (matchIdx === -1 || idx < matchIdx) {
          matchIdx = idx + punct.length;
        }
      }
    }

    if (matchIdx !== -1) {
      const sentence = buffer.slice(0, matchIdx).trim();
      this.pendingSentenceBuffer = buffer.slice(matchIdx);
      if (sentence) {
        this.dispatchSentenceToTts(sentence, generationId);
      }
    }
  }

  /**
   * Dispatch sentence to Fish Audio TTS and enqueue returned audio for playback
   */
  async dispatchSentenceToTts(sentenceText, generationId) {
    if (generationId !== this.activeGenerationId) return;

    const chunkIndex = this.dispatchedChunkCount++;
    const ttsStartTime = Date.now();

    if (this.currentTurn && this.currentTurn.llmToFirstTtsRequestMs === 0) {
      this.currentTurn.llmToFirstTtsRequestMs = ttsStartTime - this.currentTurn.userSpeechEndedAt;
    }

    this.ttsAbortController = new AbortController();

    try {
      const response = await fetch(this.config.ttsEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: this.ttsAbortController.signal,
        body: JSON.stringify({
          text: sentenceText,
          model: this.config.ttsModel,
        }),
      });

      if (!response.ok) {
        throw new Error(`TTS synthesis returned HTTP ${response.status}`);
      }

      const audioBlob = await response.blob();

      // Check generation ID validity once more before enqueuing
      if (generationId !== this.activeGenerationId) {
        // Interrupted while synthesizing: drop this audio chunk!
        return;
      }

      if (this.currentTurn && this.currentTurn.ttsFirstAudioMs === 0) {
        this.currentTurn.ttsFirstAudioMs = Date.now() - ttsStartTime;
        this.currentTurn.totalTimeToFirstVoiceMs = Date.now() - this.currentTurn.userSpeechEndedAt;
      }

      // Record what Sally is speaking aloud
      this.transcriptController.appendAssistantSpokenSegment(sentenceText);

      // Transition to SPEAKING as soon as audio starts
      if (this.state === VOICE_STATES.THINKING) {
        this.transitionTo(VOICE_STATES.SPEAKING);
      }

      await this.playbackController.enqueueChunk({
        generationId,
        audioBlob,
        text: sentenceText,
        chunkIndex,
      });
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.warn('[VoiceSessionController] TTS dispatch error:', err.message);
    }
  }

  /**
   * Stop session and release all audio resources
   */
  stop() {
    this.transitionTo(VOICE_STATES.IDLE);

    if (this.vadInterval) {
      clearInterval(this.vadInterval);
      this.vadInterval = null;
    }

    if (this.speechRecognition) {
      try {
        this.speechRecognition.stop();
      } catch {}
      this.speechRecognition = null;
    }

    this.playbackController.stopAndClear('SESSION_STOP');
    this.micController.stop();
    this.vad.reset();
  }
}
