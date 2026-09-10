/**
 * SallyIP ConversationalContext & Contextual Slot Resolver
 * 
 * Manages conversation persistence, contextual slot resolution for short
 * elliptical utterances ("america", "four", "103", "both"), and shared
 * memory between voice and text chat.
 */

export const SLOT_STATUS = {
  KNOWN: 'KNOWN',
  INFERRED: 'INFERRED',
  UNKNOWN: 'UNKNOWN',
};

export const CLARIFICATION_TYPES = {
  JURISDICTION: 'JURISDICTION',
  CLAIM: 'CLAIM',
  LEGAL_ISSUE: 'LEGAL_ISSUE',
  REFERENCES: 'REFERENCES',
  CONTINUATION: 'CONTINUATION',
};

// Canonical jurisdiction map
const JURISDICTION_PATTERNS = [
  { match: /\b(america|united states|u\.?s\.?a?|uspto|american)\b/i, code: 'US', label: 'United States (USPTO)' },
  { match: /\b(europe|european|epo|ep)\b/i, code: 'EP', label: 'European Patent Office (EPO)' },
  { match: /\b(united kingdom|uk|great britain|gb|ukipo)\b/i, code: 'GB', label: 'United Kingdom (UKIPO)' },
  { match: /\b(wipo|pct|international)\b/i, code: 'WO', label: 'WIPO (PCT)' },
  { match: /\b(germany|german|dpma|de)\b/i, code: 'DE', label: 'Germany (DPMA)' },
  { match: /\b(japan|japanese|jpo|jp)\b/i, code: 'JP', label: 'Japan (JPO)' },
];

// Number word map for claim resolution
const NUMBER_WORDS = {
  one: '1', first: '1', '1': '1',
  two: '2', second: '2', '2': '2',
  three: '3', third: '3', '3': '3',
  four: '4', fourth: '4', '4': '4',
  five: '5', fifth: '5', '5': '5',
  six: '6', sixth: '6', '6': '6',
  seven: '7', seventh: '7', '7': '7',
  eight: '8', eighth: '8', '8': '8',
  nine: '9', ninth: '9', '9': '9',
  ten: '10', tenth: '10', '10': '10',
};

export class ConversationalContext {
  constructor(initial = {}) {
    this.conversationId = initial.conversationId || `conv-${Date.now()}`;
    this.matterId = initial.matterId || null;
    this.userId = initial.userId || null;
    this.voiceSessionId = initial.voiceSessionId || `vsess-${Date.now()}`;

    // Slot state with status tracking: KNOWN | INFERRED | UNKNOWN
    this.slots = {
      activeJurisdiction: { value: initial.activeJurisdiction || null, status: initial.activeJurisdiction ? SLOT_STATUS.KNOWN : SLOT_STATUS.UNKNOWN },
      activeClaim: { value: initial.activeClaim || null, status: initial.activeClaim ? SLOT_STATUS.KNOWN : SLOT_STATUS.UNKNOWN },
      activePatent: { value: initial.activePatent || null, status: initial.activePatent ? SLOT_STATUS.KNOWN : SLOT_STATUS.UNKNOWN },
      activeTrademark: { value: initial.activeTrademark || null, status: initial.activeTrademark ? SLOT_STATUS.KNOWN : SLOT_STATUS.UNKNOWN },
      activeMatter: { value: initial.activeMatter || null, status: initial.activeMatter ? SLOT_STATUS.KNOWN : SLOT_STATUS.UNKNOWN },
      activeDocument: { value: initial.activeDocument || null, status: initial.activeDocument ? SLOT_STATUS.KNOWN : SLOT_STATUS.UNKNOWN },
      activeTask: { value: initial.activeTask || null, status: initial.activeTask ? SLOT_STATUS.KNOWN : SLOT_STATUS.UNKNOWN },
      activeLegalIssue: { value: initial.activeLegalIssue || null, status: initial.activeLegalIssue ? SLOT_STATUS.KNOWN : SLOT_STATUS.UNKNOWN },
      activeReferences: { value: initial.activeReferences || [], status: initial.activeReferences?.length ? SLOT_STATUS.KNOWN : SLOT_STATUS.UNKNOWN },
    };

    this.lastClarificationQuestion = null;
  }

  /**
   * Inspect previous assistant message to detect clarification questions
   */
  detectClarification(assistantText = '') {
    if (!assistantText || typeof assistantText !== 'string') {
      this.lastClarificationQuestion = null;
      return null;
    }

    const lower = assistantText.toLowerCase();

    // Jurisdiction clarification: "Which jurisdiction?", "What specific patent jurisdiction..."
    if (
      lower.includes('jurisdiction') ||
      lower.includes('patent office') ||
      lower.includes('uspto') ||
      lower.includes('which country') ||
      lower.includes('what specific patent jurisdiction')
    ) {
      this.lastClarificationQuestion = {
        type: CLARIFICATION_TYPES.JURISDICTION,
        question: assistantText,
        detectedAt: Date.now(),
      };
      return this.lastClarificationQuestion;
    }

    // Claim clarification: "Which claim?", "claim element would you like to explore"
    if (
      lower.includes('which claim') ||
      lower.includes('claim element') ||
      lower.includes('claim 1') ||
      lower.includes('claim number')
    ) {
      this.lastClarificationQuestion = {
        type: CLARIFICATION_TYPES.CLAIM,
        question: assistantText,
        detectedAt: Date.now(),
      };
      return this.lastClarificationQuestion;
    }

    // Legal issue: "Novelty or obviousness?", "102 or 103"
    if (
      lower.includes('novelty or obviousness') ||
      lower.includes('102 or 103') ||
      lower.includes('obviousness or novelty') ||
      lower.includes('inventive step or novelty')
    ) {
      this.lastClarificationQuestion = {
        type: CLARIFICATION_TYPES.LEGAL_ISSUE,
        question: assistantText,
        detectedAt: Date.now(),
      };
      return this.lastClarificationQuestion;
    }

    // References: "Reference A or B?", "Which references"
    if (
      lower.includes('reference a or b') ||
      lower.includes('which reference') ||
      lower.includes('compare reference')
    ) {
      this.lastClarificationQuestion = {
        type: CLARIFICATION_TYPES.REFERENCES,
        question: assistantText,
        detectedAt: Date.now(),
      };
      return this.lastClarificationQuestion;
    }

    // Continuation: "Would you like me to continue?"
    if (
      lower.includes('like me to continue') ||
      lower.includes('shall i proceed') ||
      lower.includes('want to continue')
    ) {
      this.lastClarificationQuestion = {
        type: CLARIFICATION_TYPES.CONTINUATION,
        question: assistantText,
        detectedAt: Date.now(),
      };
      return this.lastClarificationQuestion;
    }

    return null;
  }

  /**
   * Resolve user utterance against current context and active clarification
   */
  resolveUtterance(rawUtterance, previousAssistantText = '') {
    const text = String(rawUtterance || '').trim();
    if (!text) return { contextualizedText: text, resolvedSlots: {} };

    // Update clarification context from previous assistant turn
    if (previousAssistantText) {
      this.detectClarification(previousAssistantText);
    }

    const lower = text.toLowerCase();
    const resolvedSlots = {};

    // 1. Jurisdiction resolution (explicit or via JURISDICTION clarification)
    for (const { match, code, label } of JURISDICTION_PATTERNS) {
      if (match.test(lower)) {
        this.slots.activeJurisdiction = { value: code, label, status: SLOT_STATUS.KNOWN };
        resolvedSlots.jurisdiction = code;
        if (this.lastClarificationQuestion?.type === CLARIFICATION_TYPES.JURISDICTION) {
          this.lastClarificationQuestion = null;
        }
        break;
      }
    }

    // 2. Claim resolution ("four", "claim four", "claim 4", "4")
    const claimMatch = lower.match(/\b(?:claim\s*)?(one|two|three|four|five|six|seven|eight|nine|ten|[1-9]|10)\b/i);
    if (claimMatch) {
      const rawNum = claimMatch[1].toLowerCase();
      const num = NUMBER_WORDS[rawNum] || rawNum;
      // Only treat bare numbers as claims if last clarification asked for a claim or user said "claim"
      if (lower.includes('claim') || this.lastClarificationQuestion?.type === CLARIFICATION_TYPES.CLAIM) {
        const claimLabel = `Claim ${num}`;
        this.slots.activeClaim = { value: claimLabel, status: SLOT_STATUS.KNOWN };
        resolvedSlots.claim = claimLabel;
        if (this.lastClarificationQuestion?.type === CLARIFICATION_TYPES.CLAIM) {
          this.lastClarificationQuestion = null;
        }
      }
    }

    // 3. Legal Issue resolution ("103", "obviousness", "inventive step", "102", "novelty")
    if (/\b(103|obviousness|inventive step)\b/i.test(lower)) {
      const issue = this.slots.activeJurisdiction?.value === 'EP' ? 'inventive step (Art 56 EPC)' : 'obviousness (35 U.S.C. § 103)';
      this.slots.activeLegalIssue = { value: issue, status: SLOT_STATUS.KNOWN };
      resolvedSlots.legalIssue = issue;
      if (this.lastClarificationQuestion?.type === CLARIFICATION_TYPES.LEGAL_ISSUE) {
        this.lastClarificationQuestion = null;
      }
    } else if (/\b(102|novelty)\b/i.test(lower)) {
      const issue = this.slots.activeJurisdiction?.value === 'EP' ? 'novelty (Art 54 EPC)' : 'novelty (35 U.S.C. § 102)';
      this.slots.activeLegalIssue = { value: issue, status: SLOT_STATUS.KNOWN };
      resolvedSlots.legalIssue = issue;
      if (this.lastClarificationQuestion?.type === CLARIFICATION_TYPES.LEGAL_ISSUE) {
        this.lastClarificationQuestion = null;
      }
    }

    // 4. References resolution ("both", "only a and b", "just b", "only b")
    if (/\b(both|a and b|references? a and b)\b/i.test(lower)) {
      this.slots.activeReferences = { value: ['Reference A', 'Reference B'], status: SLOT_STATUS.KNOWN };
      resolvedSlots.references = ['Reference A', 'Reference B'];
      if (this.lastClarificationQuestion?.type === CLARIFICATION_TYPES.REFERENCES) {
        this.lastClarificationQuestion = null;
      }
    } else if (/\b(only b|just b|reference b)\b/i.test(lower)) {
      this.slots.activeReferences = { value: ['Reference B'], status: SLOT_STATUS.KNOWN };
      resolvedSlots.references = ['Reference B'];
      if (this.lastClarificationQuestion?.type === CLARIFICATION_TYPES.REFERENCES) {
        this.lastClarificationQuestion = null;
      }
    } else if (/\b(only a|just a|reference a)\b/i.test(lower)) {
      this.slots.activeReferences = { value: ['Reference A'], status: SLOT_STATUS.KNOWN };
      resolvedSlots.references = ['Reference A'];
      if (this.lastClarificationQuestion?.type === CLARIFICATION_TYPES.REFERENCES) {
        this.lastClarificationQuestion = null;
      }
    }

    // 5. Continuation resolution ("yes", "continue", "proceed", "go ahead")
    if (/\b(yes|continue|proceed|go ahead|sure)\b/i.test(lower) && this.lastClarificationQuestion?.type === CLARIFICATION_TYPES.CONTINUATION) {
      resolvedSlots.continuation = true;
      this.lastClarificationQuestion = null;
    }

    // Formulate contextualized instruction for orchestrator
    let contextualizedText = text;
    const contextPrefixes = [];

    if (resolvedSlots.jurisdiction) {
      contextPrefixes.push(`Active Jurisdiction: ${this.slots.activeJurisdiction.label || resolvedSlots.jurisdiction}`);
    }
    if (resolvedSlots.claim) {
      contextPrefixes.push(`Active Claim: ${resolvedSlots.claim}`);
    }
    if (resolvedSlots.legalIssue) {
      contextPrefixes.push(`Active Legal Issue: ${resolvedSlots.legalIssue}`);
    }
    if (resolvedSlots.references) {
      contextPrefixes.push(`Active References: ${resolvedSlots.references.join(', ')}`);
    }

    if (contextPrefixes.length > 0 && text.split(/\s+/).length <= 4) {
      // Short / elliptical utterance: enrich for reasoning orchestrator
      contextualizedText = `[Contextual Clarification: ${contextPrefixes.join('; ')}] ${text}`;
    }

    return {
      rawUtterance: text,
      contextualizedText,
      resolvedSlots,
      activeContext: this.getSnapshot(),
    };
  }

  /**
   * Return snapshot of active slots
   */
  getSnapshot() {
    return {
      conversationId: this.conversationId,
      matterId: this.matterId,
      userId: this.userId,
      voiceSessionId: this.voiceSessionId,
      slots: { ...this.slots },
      lastClarificationQuestion: this.lastClarificationQuestion,
    };
  }
}
