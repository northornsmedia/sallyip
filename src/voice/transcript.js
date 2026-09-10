/**
 * SallyIP TranscriptController
 * 
 * Manages partial transcripts, finalized user utterances, and
 * interrupted assistant responses with structured metadata.
 */

export class TranscriptController {
  constructor() {
    this.partialTranscript = '';
    this.finalTranscript = '';
    this.messages = [];
    this.currentAssistantTurn = null;

    // Callbacks
    this.onTranscriptUpdate = null;
    this.onMessagesUpdate = null;
  }

  /**
   * Set real-time partial streaming transcript from STT
   */
  setPartial(text) {
    this.partialTranscript = text;
    if (this.onTranscriptUpdate) {
      this.onTranscriptUpdate({
        partial: this.partialTranscript,
        final: this.finalTranscript,
      });
    }
  }

  /**
   * Commit final user utterance and push to message log
   */
  commitFinalUserUtterance(text) {
    const trimmed = (text || this.partialTranscript).trim();
    if (!trimmed) return null;

    this.finalTranscript = trimmed;
    this.partialTranscript = '';

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
      timestamp: Date.now(),
    };

    this.messages.push(userMessage);

    if (this.onTranscriptUpdate) {
      this.onTranscriptUpdate({
        partial: '',
        final: this.finalTranscript,
      });
    }

    if (this.onMessagesUpdate) {
      this.onMessagesUpdate([...this.messages]);
    }

    return userMessage;
  }

  /**
   * Initialize a new assistant response turn
   */
  startAssistantTurn(turnId = `asst-${Date.now()}`) {
    this.currentAssistantTurn = {
      id: turnId,
      role: 'assistant',
      text: '',
      spokenText: '',
      interrupted: false,
      interruptedAt: null,
      interruptionReason: null,
      timestamp: Date.now(),
    };
    this.messages.push(this.currentAssistantTurn);
    if (this.onMessagesUpdate) {
      this.onMessagesUpdate([...this.messages]);
    }
    return this.currentAssistantTurn;
  }

  /**
   * Append incoming token delta to the current assistant turn
   */
  appendAssistantDelta(delta) {
    if (!this.currentAssistantTurn) return;
    this.currentAssistantTurn.text += delta;
    if (this.onMessagesUpdate) {
      this.onMessagesUpdate([...this.messages]);
    }
  }

  /**
   * Append spoken text segment (what Sally actually spoke aloud through TTS)
   */
  appendAssistantSpokenSegment(text) {
    if (!this.currentAssistantTurn) return;
    this.currentAssistantTurn.spokenText += (this.currentAssistantTurn.spokenText ? ' ' : '') + text;
    if (this.onMessagesUpdate) {
      this.onMessagesUpdate([...this.messages]);
    }
  }

  /**
   * Mark assistant turn as INTERRUPTED when barge-in occurs
   */
  markAssistantInterrupted(reason = 'USER_BARGE_IN') {
    if (!this.currentAssistantTurn) return null;

    this.currentAssistantTurn.interrupted = true;
    this.currentAssistantTurn.interruptedAt = Date.now();
    this.currentAssistantTurn.interruptionReason = reason;

    // Display what was actually spoken rather than full generated text
    if (this.currentAssistantTurn.spokenText) {
      this.currentAssistantTurn.text = this.currentAssistantTurn.spokenText + '—';
    }

    if (this.onMessagesUpdate) {
      this.onMessagesUpdate([...this.messages]);
    }

    const recorded = { ...this.currentAssistantTurn };
    this.currentAssistantTurn = null;
    return recorded;
  }

  /**
   * Complete assistant turn normally without interruption
   */
  finalizeAssistantTurn() {
    this.currentAssistantTurn = null;
  }

  /**
   * Get all messages
   */
  getMessages() {
    return [...this.messages];
  }

  /**
   * Clear all transcripts
   */
  clear() {
    this.partialTranscript = '';
    this.finalTranscript = '';
    this.messages = [];
    this.currentAssistantTurn = null;
    if (this.onTranscriptUpdate) {
      this.onTranscriptUpdate({ partial: '', final: '' });
    }
    if (this.onMessagesUpdate) {
      this.onMessagesUpdate([]);
    }
  }
}
