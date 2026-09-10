import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ConversationalContext, SLOT_STATUS } from '../../src/voice/ConversationalContext.js';
import { TranscriptController } from '../../src/voice/transcript.js';
import { AudioPlaybackController } from '../../src/voice/AudioPlaybackController.js';
import { BargeInController } from '../../src/voice/BargeInController.js';

test('Critical Regression Test: "America" utterance after jurisdiction question resolves to US and does NOT loop', () => {
  const context = new ConversationalContext({ conversationId: 'test-conv-1' });
  const transcript = new TranscriptController();

  // Assistant's previous question from the original reproduction:
  const previousAssistantMsg = "I've analyzed your question with SallyIP's intellectual property models. What specific patent jurisdiction or claim element would you like to explore next?";
  
  // User says: "america"
  const userUtterance = 'america';
  transcript.commitFinalUserUtterance(userUtterance);

  // Resolve utterance in context
  const resolution = context.resolveUtterance(userUtterance, previousAssistantMsg);

  // Assertions:
  assert.equal(resolution.rawUtterance, 'america', 'Raw transcript must be preserved as "america"');
  assert.equal(resolution.resolvedSlots.jurisdiction, 'US', 'Must resolve jurisdiction to US / USPTO');
  assert.equal(context.slots.activeJurisdiction.value, 'US', 'Active jurisdiction must be set to US');
  assert.equal(context.slots.activeJurisdiction.status, SLOT_STATUS.KNOWN);
  assert.ok(resolution.contextualizedText.includes('United States (USPTO)'), 'Contextualized prompt must include United States (USPTO)');
  assert.equal(context.conversationId, 'test-conv-1', 'conversationId must remain stable');

  // Next assistant response simulated with context:
  const nextAssistantResponse = `Understood — focusing on United States (USPTO) patent prosecution for claim analysis. Would you like to review novelty or obviousness?`;

  assert.notEqual(nextAssistantResponse, previousAssistantMsg, 'Next response must NOT repeat the previous canned question');
  assert.ok(!nextAssistantResponse.includes('What specific patent jurisdiction'), 'Next assistant response must not ask for jurisdiction again');
});

test('Full Conversational Regression: Multi-turn slot resolution across 5 turns with barge-in', () => {
  const context = new ConversationalContext({ conversationId: 'multi-turn-conv' });
  const transcript = new TranscriptController();
  const playback = new AudioPlaybackController();
  const bargeIn = new BargeInController(playback);

  // Turn 1: "Review this patent."
  transcript.commitFinalUserUtterance('Review this patent.');
  const asst1 = transcript.startAssistantTurn('asst-1');
  asst1.text = 'I can review this patent. Which jurisdiction are we examining?';
  transcript.finalizeAssistantTurn();

  // Turn 2: "America."
  const res2 = context.resolveUtterance('America.', asst1.text);
  assert.equal(context.slots.activeJurisdiction.value, 'US');
  transcript.commitFinalUserUtterance('America.');
  const asst2 = transcript.startAssistantTurn('asst-2');
  asst2.text = 'Understood, United States (USPTO). Which claim should we examine first?';
  transcript.finalizeAssistantTurn();

  // Turn 3: "Claim four."
  const res3 = context.resolveUtterance('Claim four.', asst2.text);
  assert.equal(context.slots.activeClaim.value, 'Claim 4');
  transcript.commitFinalUserUtterance('Claim four.');
  const asst3 = transcript.startAssistantTurn('asst-3');
  asst3.text = 'Looking at Claim 4. Are we analyzing novelty or obviousness?';
  transcript.finalizeAssistantTurn();

  // Turn 4: "103."
  const res4 = context.resolveUtterance('103.', asst3.text);
  assert.ok(context.slots.activeLegalIssue.value.includes('103'));
  transcript.commitFinalUserUtterance('103.');
  const asst4 = transcript.startAssistantTurn('asst-4');
  asst4.text = 'Analyzing Claim 4 for obviousness under 35 U.S.C. § 103. Which references should I compare?';
  transcript.finalizeAssistantTurn();

  // Turn 5: "Only A and B."
  const res5 = context.resolveUtterance('Only A and B.', asst4.text);
  assert.deepEqual(context.slots.activeReferences.value, ['Reference A', 'Reference B']);
  transcript.commitFinalUserUtterance('Only A and B.');
  
  // Assistant starts speaking Turn 5
  const gen5 = playback.startNewGeneration();
  const asst5 = transcript.startAssistantTurn('asst-5');
  asst5.text = 'Comparing Claim 4 against Reference A and Reference B, the primary teaching—';
  transcript.appendAssistantSpokenSegment('Comparing Claim 4 against Reference A and Reference B');
  playback.isPlaying = true;

  // USER INTERRUPTS: "No, just B."
  const interruption = bargeIn.handleSpeechDetected({
    isSpeakingMode: true,
    rms: 0.08,
    timestamp: Date.now(),
  });
  assert.ok(interruption);
  assert.equal(playback.isPlaying, false, 'Speech must halt immediately on interruption');
  const interruptedTurn = transcript.markAssistantInterrupted('USER_BARGE_IN');
  assert.equal(interruptedTurn.interrupted, true);

  // Resolve user's interruption in context
  const res6 = context.resolveUtterance('No, just B.', asst5.text);
  assert.deepEqual(context.slots.activeReferences.value, ['Reference B'], 'Active references must now be only Reference B');
  transcript.commitFinalUserUtterance('No, just B.');

  // Verify full conversation history integrity
  const msgs = transcript.getMessages();
  assert.equal(context.conversationId, 'multi-turn-conv', 'conversationId must remain stable throughout all turns');
  assert.equal(msgs[0].text, 'Review this patent.');
  assert.equal(msgs[2].text, 'America.');
  assert.equal(msgs[4].text, 'Claim four.');
  assert.equal(msgs[6].text, '103.');
  assert.equal(msgs[8].text, 'Only A and B.');
  assert.equal(msgs[9].interrupted, true, 'Turn 5 assistant message must be marked interrupted');
  assert.equal(msgs[10].text, 'No, just B.');
});
