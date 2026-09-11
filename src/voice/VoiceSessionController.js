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

    // Echo cancellation & acoustic self-interruption prevention
    this.isAssistantSpeaking = false;
    this.echoCooldownUntil = 0;

    // Real-time speech recognition accumulation & auto-silence timer
    this.accumulatedFinalText = '';
    this.silenceTimer = null;
    this.onWordWindowUpdate = null;
    this.mediaRecorderFallback = null;
    this.recordedAudioChunks = [];

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
    // VAD Speech Start - ignore speaker audio when assistant is speaking or in echo cooldown
    this.vad.onSpeechStart = (event) => {
      if (this.isAssistantSpeaking || Date.now() < this.echoCooldownUntil) {
        return;
      }
      if (this.state === VOICE_STATES.LISTENING) {
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
      if (this.isAssistantSpeaking || Date.now() < this.echoCooldownUntil) return;
      if (this.state === VOICE_STATES.CAPTURING || this.state === VOICE_STATES.SPEECH_DETECTED) {
        this.finalizeUserUtterance();
      }
    };

    // Playback started
    this.playbackController.onPlaybackStarted = () => {
      this.isAssistantSpeaking = true;
      if (this.state !== VOICE_STATES.SPEAKING) {
        this.transitionTo(VOICE_STATES.SPEAKING);
      }
    };

    // Playback finished
    this.playbackController.onPlaybackFinished = ({ generationId }) => {
      if (generationId === this.activeGenerationId) {
        this.isAssistantSpeaking = false;
        this.echoCooldownUntil = Date.now() + 450;
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

    // Forward teleprompter words to caller
    this.playbackController.onWordWindowUpdate = (wordsWindow) => {
      if (this.onWordWindowUpdate) {
        this.onWordWindowUpdate(wordsWindow);
      }
    };
  }

  /**
   * Unlock WebAudio context synchronously during user gesture (required on iOS/Android)
   */
  unlockAudio() {
    if (this.playbackController) {
      this.playbackController.getAudioContext().catch(() => {});
    }
  }

  /**
   * Start a voice session
   */
  async start() {
    this.unlockAudio();
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
   * Initialize continuous streaming speech recognition (Web Speech API) with automatic silence endpointing
   */
  initContinuousSpeechRecognition() {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.initMediaRecorderFallback();
      return;
    }

    try {
      if (this.speechRecognition) {
        try { this.speechRecognition.stop(); } catch {}
        this.speechRecognition = null;
      }

      const recognition = new SpeechRecognition();
      const isMobile = typeof navigator !== 'undefined' &&
        (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);

      recognition.continuous = !isMobile;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        this.isSpeechRecognitionActive = true;
      };

      recognition.onresult = (event) => {
        // Drop any audio picked up from the speaker while Sally is speaking or in echo cooldown
        if (this.isAssistantSpeaking || Date.now() < this.echoCooldownUntil || this.state === VOICE_STATES.SPEAKING) {
          return;
        }

        let interim = '';
        let newlyFinalized = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const piece = event.results[i][0]?.transcript || '';
          if (event.results[i].isFinal) {
            newlyFinalized += piece + ' ';
          } else {
            interim += piece;
          }
        }

        if (newlyFinalized) {
          this.accumulatedFinalText += newlyFinalized;
        }

        const totalSpoken = (this.accumulatedFinalText + interim).trim();
        if (totalSpoken) {
          if (this.state === VOICE_STATES.LISTENING) {
            this.transitionTo(VOICE_STATES.CAPTURING);
          }
          this.transcriptController.setPartial(totalSpoken);
        }

        // Auto-silence timer: when user pauses for 1350ms, auto-commit and send to Sally
        if (this.silenceTimer) clearTimeout(this.silenceTimer);
        this.silenceTimer = setTimeout(() => {
          const toSend = (this.accumulatedFinalText + interim).trim() || this.transcriptController.partialTranscript.trim();
          if (toSend && toSend.length > 1 && !this.isAssistantSpeaking && this.state !== VOICE_STATES.THINKING) {
            this.accumulatedFinalText = '';
            this.transcriptController.setPartial('');
            this.submitUserQuery(toSend);
          }
        }, 1350);
      };

      recognition.onerror = (err) => {
        if (err.error !== 'no-speech') {
          console.warn('[VoiceSessionController] SpeechRecognition error:', err.error);
        }
        if (err.error === 'not-allowed' || err.error === 'service-not-allowed' || err.error === 'network') {
          try { recognition.stop(); } catch {}
          this.speechRecognition = null;
          this.isSpeechRecognitionActive = false;
          this.initMediaRecorderFallback();
        }
      };

      recognition.onend = () => {
        this.isSpeechRecognitionActive = false;
        const pending = (this.accumulatedFinalText || this.transcriptController.partialTranscript || '').trim();
        if (pending && pending.length > 1 && !this.isAssistantSpeaking && this.state !== VOICE_STATES.THINKING) {
          this.accumulatedFinalText = '';
          this.transcriptController.setPartial('');
          this.submitUserQuery(pending);
          return;
        }

        // Automatically restart speech recognition while session is active
        if (this.state !== VOICE_STATES.IDLE && this.state !== VOICE_STATES.DISCONNECTED && !this.isAssistantSpeaking) {
          setTimeout(() => {
            try {
              if (this.state !== VOICE_STATES.IDLE && this.state !== VOICE_STATES.DISCONNECTED && !this.isAssistantSpeaking) {
                recognition.start();
              }
            } catch {}
          }, 150);
        }
      };

      this.speechRecognition = recognition;
      recognition.start();
      this.isSpeechRecognitionActive = true;
    } catch (e) {
      console.warn('[VoiceSessionController] SpeechRecognition init failed, activating MediaRecorder fallback:', e);
      this.initMediaRecorderFallback();
    }
  }

  /**
   * MediaRecorder fallback for mobile/browsers where Web Speech API is blocked
   */
  initMediaRecorderFallback() {
    if (this.mediaRecorderFallback || !this.micController.stream) return;
    try {
      const mimeType = typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const recorder = new MediaRecorder(this.micController.stream, { mimeType });
      this.recordedAudioChunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedAudioChunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        if (this.recordedAudioChunks.length > 0 && !this.isAssistantSpeaking && this.state !== VOICE_STATES.THINKING) {
          this.transcriptController.setPartial('Transcribing speech with AI...');
          const blob = new Blob(this.recordedAudioChunks, { type: recorder.mimeType || 'audio/webm' });
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64Audio = reader.result;
            try {
              const res = await fetch('/api/transcribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audio: base64Audio, mimeType: recorder.mimeType }),
              });
              if (res.ok) {
                const data = await res.json();
                const text = (data.text || '').trim();
                if (text && !this.isAssistantSpeaking) {
                  this.transcriptController.setPartial(text);
                  setTimeout(() => {
                    this.submitUserQuery(text);
                  }, 300);
                  return;
                }
              }
            } catch {}
            this.transcriptController.setPartial('');
          };
          reader.readAsDataURL(blob);
        }
      };

      this.mediaRecorderFallback = recorder;
      recorder.start(1000);
    } catch (err) {
      console.warn('[VoiceSessionController] MediaRecorder fallback init failed:', err);
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
    this.isAssistantSpeaking = false;
    this.echoCooldownUntil = 0;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch {}
    }
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
    const text = (this.accumulatedFinalText || this.transcriptController.partialTranscript || this.transcriptController.finalTranscript || '').trim();
    if (text && !this.isAssistantSpeaking) {
      this.accumulatedFinalText = '';
      this.transcriptController.setPartial('');
      this.submitUserQuery(text);
    } else {
      this.transitionTo(VOICE_STATES.LISTENING);
    }
  }

  /**
   * Submit user utterance to LLM streaming pipeline
   */
  async submitUserQuery(userText) {
    if (!userText || !userText.trim()) return;

    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    this.accumulatedFinalText = '';

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

      // Replace latest user message with contextualized text (tuned for conversational voice output)
      if (requestMessages.length > 0 && requestMessages[requestMessages.length - 1].role === 'user') {
        requestMessages[requestMessages.length - 1].content = resolution.contextualizedText + " (Please answer concisely in 2 clear sentences for conversational voice response)";
      }

      // Dispatch request to chat endpoint (supports both /api/chat-stream and /api/chat)
      const response = await fetch(this.config.chatStreamEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: this.llmAbortController.signal,
        body: JSON.stringify({
          mode: 'PUBLIC_RESEARCH',
          messages: requestMessages,
          matter_id: this.matterId,
          conversation_id: this.conversationId,
        }),
      });

      if (!response.ok) {
        throw new Error(`LLM stream returned HTTP ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json') && !contentType.includes('event-stream')) {
        const data = await response.json().catch(() => ({}));
        const fullAnswer = data.choices?.[0]?.message?.content || data.answer || '';
        if (fullAnswer && generationId === this.activeGenerationId) {
          if (this.currentTurn && this.currentTurn.transcriptToFirstLlmTokenMs === 0) {
            this.currentTurn.transcriptToFirstLlmTokenMs = Date.now() - this.currentTurn.userSpeechEndedAt;
          }
          this.transcriptController.appendAssistantDelta(fullAnswer);
          await this.dispatchSentenceToTts(fullAnswer, generationId, 0);
        }
      } else {
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
            const jsonStr = trimmed.replace(/^data:\s*/, '').trim();
            if (!jsonStr || jsonStr === '[DONE]') continue;

            try {
              const data = JSON.parse(jsonStr);
              const delta = data.type === 'delta' ? data.delta : (data.choices?.[0]?.delta?.content || '');
              if (delta) {
                if (this.currentTurn && this.currentTurn.transcriptToFirstLlmTokenMs === 0) {
                  this.currentTurn.transcriptToFirstLlmTokenMs = Date.now() - this.currentTurn.userSpeechEndedAt;
                }
                this.handleIncomingTokenDelta(delta, generationId);
              }
            } catch {}
          }
        }

        // Flush remaining buffered text
        if (generationId === this.activeGenerationId && this.pendingSentenceBuffer.trim()) {
          await this.dispatchSentenceToTts(this.pendingSentenceBuffer.trim(), generationId, this.dispatchedChunkCount++);
          this.pendingSentenceBuffer = '';
        }
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
    let audioBlob = null;

    try {
      const response = await fetch(this.config.ttsEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: this.ttsAbortController.signal,
        body: JSON.stringify({
          text: sentenceText,
          input: sentenceText,
          model: this.config.ttsModel,
          mode: 'PUBLIC_RESEARCH',
        }),
      });

      if (response.ok) {
        audioBlob = await response.blob();
      } else {
        console.warn(`[VoiceSessionController] Fish Audio returned HTTP ${response.status}`);
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.warn('[VoiceSessionController] Fish Audio TTS dispatch error:', err.message);
    }

    // Check generation ID validity once more before enqueuing
    if (generationId !== this.activeGenerationId) {
      return;
    }

    if (audioBlob && audioBlob.size > 200) {
      if (this.currentTurn && this.currentTurn.ttsFirstAudioMs === 0) {
        this.currentTurn.ttsFirstAudioMs = Date.now() - ttsStartTime;
        this.currentTurn.totalTimeToFirstVoiceMs = Date.now() - this.currentTurn.userSpeechEndedAt;
      }

      // Record what Sally is speaking aloud
      this.transcriptController.appendAssistantSpokenSegment(sentenceText);

      this.isAssistantSpeaking = true;
      if (this.state === VOICE_STATES.THINKING) {
        this.transitionTo(VOICE_STATES.SPEAKING);
      }

      await this.playbackController.enqueueChunk({
        generationId,
        audioBlob,
        text: sentenceText,
        chunkIndex,
      });
    } else {
      // Local SpeechSynthesis fallback so Sally is NEVER silent!
      this.speakWithBrowserSynthesis(sentenceText, generationId);
    }
  }

  /**
   * Browser SpeechSynthesis fallback ensuring assistant always speaks even if cloud TTS fails
   */
  speakWithBrowserSynthesis(text, generationId) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.transitionTo(VOICE_STATES.LISTENING);
      return;
    }
    if (generationId !== this.activeGenerationId) return;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 1.05;

      const words = (text || '').split(/\s+/).filter(Boolean);
      let wordCounter = 0;
      if (this.playbackController.onWordWindowUpdate && words.length > 0) {
        this.playbackController.onWordWindowUpdate(words.slice(0, 1));
      }
      utterance.onboundary = (e) => {
        if (e.name === 'word') {
          wordCounter = Math.min(words.length - 1, wordCounter + 1);
          const startIdx = Math.max(0, wordCounter - 6);
          if (this.playbackController.onWordWindowUpdate) {
            this.playbackController.onWordWindowUpdate(words.slice(startIdx, wordCounter + 1));
          }
        }
      };

      this.isAssistantSpeaking = true;
      this.transitionTo(VOICE_STATES.SPEAKING);
      this.transcriptController.appendAssistantSpokenSegment(text);

      utterance.onend = () => {
        if (this.playbackController.onWordWindowUpdate) {
          this.playbackController.onWordWindowUpdate([]);
        }
        if (generationId === this.activeGenerationId) {
          this.isAssistantSpeaking = false;
          this.echoCooldownUntil = Date.now() + 450;
          this.transcriptController.finalizeAssistantTurn();
          this.transitionTo(VOICE_STATES.LISTENING);
        }
      };

      utterance.onerror = () => {
        if (this.playbackController.onWordWindowUpdate) {
          this.playbackController.onWordWindowUpdate([]);
        }
        if (generationId === this.activeGenerationId) {
          this.isAssistantSpeaking = false;
          this.echoCooldownUntil = Date.now() + 200;
          this.transitionTo(VOICE_STATES.LISTENING);
        }
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      this.isAssistantSpeaking = false;
      this.transitionTo(VOICE_STATES.LISTENING);
    }
  }

  /**
   * Stop session and release all audio resources
   */
  stop() {
    this.transitionTo(VOICE_STATES.IDLE);
    this.isAssistantSpeaking = false;
    this.echoCooldownUntil = 0;

    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    this.accumulatedFinalText = '';

    if (this.onWordWindowUpdate) {
      this.onWordWindowUpdate([]);
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch {}
    }

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

    if (this.mediaRecorderFallback && this.mediaRecorderFallback.state !== 'inactive') {
      try {
        this.mediaRecorderFallback.stop();
      } catch {}
      this.mediaRecorderFallback = null;
    }

    this.playbackController.stopAndClear('SESSION_STOP');
    this.micController.stop();
    this.vad.reset();
  }
}
