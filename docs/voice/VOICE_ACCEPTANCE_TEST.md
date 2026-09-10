# SallyIP Voice Mode Acceptance Test Runbook

## Objective
Verify real-time full-duplex conversational voice mode, streaming sentence-segmented TTS, and instantaneous user barge-in (interruption).

---

## Acceptance Criteria
- [x] Continuous full-duplex session active in code (no push-to-talk needed).
- [x] VAD endpointing recognizes speech start and silence end-of-turn.
- [x] LLM streaming output is segmented by sentence and sent to Fish Audio early.
- [x] Speaking Sally local playback halts synchronously in automated tests (`<15ms`).
- [x] Old audio chunks do not resume after interruption (verified in race condition unit test).
- [x] Interrupted assistant response is recorded as `[Interrupted]`.
- [ ] Live microphone acoustic barge-in verified on real hardware (requires physical microphone & speakers).

---

## 10-Iteration Barge-In Test Runbook (Live Hardware Protocol)

Execute the following test 10 times in a live browser session with microphone and speakers:

### Step 1: Initialize
Open SallyIP (`http://localhost:5173`), click the floating Voice Widget in the bottom-right corner, and click the center phone button to start.

### Step 2: Speak Prompt
Say clearly into microphone:
> *"Explain what a trademark opposition is and how it differs from cancellation."*

### Step 3: Interrupt Midway
While Sally is actively speaking midway through the first sentence, speak firmly:
> *"Stop. Just give me the deadline issue."*

### Hardware Execution Evaluation Table:
> **Note on Test Rig**: Automated unit and race-condition tests verify software cancellation in <15ms. Live hardware testing requires real physical microphone and acoustic speaker input and must be recorded individually per session.

| Iteration | AUTOMATED_RESULT | MANUAL_RESULT | OBSERVED_LATENCY_MS | ECHO_TRIGGER | NOTES |
|---|---|---|---|---|---|
| 1 | PASS (unit) | NOT_RUN | MANUAL_HARDWARE_TEST_REQUIRED | NOT_MEASURED | Pending live hardware mic session |
| 2 | PASS (unit) | NOT_RUN | MANUAL_HARDWARE_TEST_REQUIRED | NOT_MEASURED | Pending live hardware mic session |
| 3 | PASS (unit) | NOT_RUN | MANUAL_HARDWARE_TEST_REQUIRED | NOT_MEASURED | Pending live hardware mic session |
| 4 | PASS (unit) | NOT_RUN | MANUAL_HARDWARE_TEST_REQUIRED | NOT_MEASURED | Pending live hardware mic session |
| 5 | PASS (unit) | NOT_RUN | MANUAL_HARDWARE_TEST_REQUIRED | NOT_MEASURED | Pending live hardware mic session |
| 6 | PASS (unit) | NOT_RUN | MANUAL_HARDWARE_TEST_REQUIRED | NOT_MEASURED | Pending live hardware mic session |
| 7 | PASS (unit) | NOT_RUN | MANUAL_HARDWARE_TEST_REQUIRED | NOT_MEASURED | Pending live hardware mic session |
| 8 | PASS (unit) | NOT_RUN | MANUAL_HARDWARE_TEST_REQUIRED | NOT_MEASURED | Pending live hardware mic session |
| 9 | PASS (unit) | NOT_RUN | MANUAL_HARDWARE_TEST_REQUIRED | NOT_MEASURED | Pending live hardware mic session |
| 10 | PASS (unit) | NOT_RUN | MANUAL_HARDWARE_TEST_REQUIRED | NOT_MEASURED | Pending live hardware mic session |
