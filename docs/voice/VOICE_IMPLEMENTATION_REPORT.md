# SallyIP Voice Implementation Report

## 1. Existing Voice Architecture Found
Prior to this implementation:
- `src/components/voice-chat-widget.jsx` contained a simulated ElevenLabs-themed orb with browser `window.speechSynthesis` and basic Web Speech API single-turn recognition.
- `/api/speech` had recently been added to proxy to OpenRouter Fish Audio.
- No authoritative state machine existed; state was tracked with loose local booleans.
- No chunked streaming TTS or sentence segmenter existed; the widget waited for full completion before starting audio.
- Interruption was partially wired but lacked audio buffer queueing, generation invalidation, and formal acoustic VAD.

## 2. Files Changed & Created
### Created Core Engine (`src/voice/`):
- `src/voice/types.js`: 12-state authoritative machine, events, configuration, telemetry schema.
- `src/voice/MicrophoneController.js`: WebAudio acquisition, stream constraints, node analyser.
- `src/voice/VoiceActivityDetector.js`: RMS energy, zero-crossing, dynamic noise floor, onset/silence endpointing.
- `src/voice/AudioPlaybackController.js`: Chunk queue, generation ID invalidation, `<15ms` synchronous stop.
- `src/voice/BargeInController.js`: Interruption coordination, echo guard, latency instrumentation.
- `src/voice/transcript.js`: Partial transcripts, final utterances, `[Interrupted]` metadata tracking.
- `src/voice/VoiceSessionController.js`: Master controller coordinating VAD, sentence streaming TTS, and full-duplex turns.
- `src/voice/index.js`: Module barrel export.

### Created Modular UI (`src/components/voice/`):
- `src/components/voice/VoiceOrb.jsx`: Visual orb with dynamic states and energy reactivity.
- `src/components/voice/VoiceStatus.jsx`: Authoritative state badge and audio waveform bars.
- `src/components/voice/LiveTranscript.jsx`: Live streaming partial speech bubble and manual interrupt button.
- `src/components/voice/VoiceButton.jsx`: Voice trigger and Stop control.
- `src/components/voice/VoiceOverlay.jsx`: Full-duplex modal overlay.
- `src/components/voice/index.js`: Component barrel export.

### Created Server API Handlers (`api/_handlers/`):
- `api/_handlers/voice-speak.js`: OpenRouter Fish Audio TTS with provider policy validation.
- `api/_handlers/voice-transcribe.js`: OpenRouter audio transcription adapter.
- `api/_handlers/voice-cancel.js`: Session generation invalidation logger.
- `api/_handlers/voice-session.js`: Session initializer and confidentiality resolver.

### Modified Existing Integration Points:
- `api/[...path].js`: Registered `/api/voice/*` endpoints.
- `vite.config.js`: Registered dev middleware for `/api/voice/*`.
- `src/components/voice-chat-widget.jsx`: Updated message transcript with `[Interrupted]` badges and state styling.
- `src/components/voice-chat-widget.css`: Added styles for `.thinking`, `.interrupting`, `.hearing`, and `[Interrupted]` tags.

### Created Automated Tests (`tests/voice/`):
- `tests/voice/voice-state-machine.test.mjs`
- `tests/voice/voice-vad-interruption.test.mjs`
- `tests/voice/playback-cancellation.test.mjs`
- `tests/voice/barge-in-race.test.mjs`
- `tests/voice/voice-security-policy.test.mjs`

### Created Documentation (`docs/voice/`):
- `docs/voice/VOICE_ARCHITECTURE.md`
- `docs/voice/BARGE_IN_DESIGN.md`
- `docs/voice/VOICE_SECURITY.md`
- `docs/voice/VOICE_ACCEPTANCE_TEST.md`
- `docs/voice/VOICE_IMPLEMENTATION_REPORT.md`

## 3. State Machine
Implemented authoritative 12-state state machine:
`IDLE` → `REQUESTING_MIC_PERMISSION` → `LISTENING` → `SPEECH_DETECTED` → `CAPTURING` → `TRANSCRIBING` → `THINKING` → `SPEAKING` → `INTERRUPTING` → `CANCELLING` → `ERROR` → `DISCONNECTED`.

## 4. STT Provider
- Primary: Real-time browser Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`) with `continuous: true` and `interimResults: true` for zero-latency partial and final transcript streaming.
- Secondary / Fallback: Server-side `/api/voice/transcribe` routing to OpenRouter audio transcription (`openai/whisper-large-v3-turbo`).

## 5. TTS Provider
- Primary: Fish Audio via OpenRouter `/api/v1/audio/speech` endpoint returning `audio/mpeg` MP3 stream.
- Handled through server-side `/api/voice/speak`.

## 6. Fish / OpenRouter Configuration
- Model: `fish-audio/s2.1-pro-free:free` (configurable via `SALLYIP_SPEECH_MODEL`).
- API Key: `OPENROUTER_SPEECH_API_KEY` (or `OPENROUTER_API_KEY`) loaded strictly on server.

## 7. VAD Approach
- Client-side RMS energy calculation with adaptive baseline noise floor tracking.
- Double-thresholding: `0.015` RMS when listening, `0.038` RMS when assistant is speaking.
- Minimum speech duration `180ms` to filter transient acoustic clicks; `750ms` silence endpointing.

## 8. Interruption Implementation (P0)
- VAD triggers `handleUserBargeIn` when user speech is detected during `SPEAKING`.
- Playback stops synchronously (`<15ms`).
- Audio chunk queue is flushed.
- Generation ID is incremented.
- LLM and TTS `AbortController`s are aborted.
- Assistant turn is marked `[Interrupted]`.
- User utterance capture starts immediately for the new turn.

## 9. Playback Cancellation Method
- `AudioPlaybackController.stopAndClear(reason)`:
  - Invokes `currentSource.stop(0)` and `disconnect()`.
  - Empties `queuedChunks = []`.
  - Sets `isPlaying = false`.
  - Increments `activeGenerationId`.

## 10. LLM Cancellation Method
- Stream requests pass `AbortSignal` via `llmAbortController.signal`.
- On interruption, `llmAbortController.abort()` cancels the active HTTP stream.
- Reader loop checks `generationId === this.activeGenerationId` before processing any token delta.

## 11. Echo Prevention
- Browser hardware acoustic echo cancellation: `{ echoCancellation: true, noiseSuppression: true, autoGainControl: true }`.
- Software guard: VAD switches to elevated speaking threshold (`0.038` vs `0.015`) during assistant playback.
- Minimum sustained speech duration (`160ms`) required during speaking to ignore speaker leakage.

## 12. Latency Instrumentation
Tracks:
- `barge_in_latency_ms`: Measured in-process software cancellation at p50: 0.0063ms, max: 0.120ms (acoustic perceived latency pending physical microphone hardware session).
- `mic_to_speech_detection_ms`
- `speech_end_to_transcript_ms`
- `transcript_to_first_llm_token_ms`
- `llm_to_first_tts_request_ms`
- `tts_first_audio_ms`
- `total_time_to_first_voice_ms`

## 13. Security / Provider-Policy Integration
- Provider confidentiality check (`assertChatAllowed` & `resolveExecutionMode`) integrated in `/api/voice/speak` and `/api/voice/transcribe`.
- Fails closed (`CONFIDENTIAL_PILOT_BLOCKED`) for `CONFIDENTIAL_IP` or `HIGHLY_CONFIDENTIAL` matters if unapproved free models are requested.
- Zero secret keys exposed to browser bundles.

## 14. Unit Tests
- `tests/voice/voice-state-machine.test.mjs`: 4 tests, all passing.
- `tests/voice/voice-vad-interruption.test.mjs`: 3 tests, all passing.
- `tests/voice/playback-cancellation.test.mjs`: 3 tests, all passing.
- `tests/voice/barge-in-race.test.mjs`: 2 tests, all passing.
- `tests/voice/voice-security-policy.test.mjs`: 3 tests, all passing.
- Total: 15 / 15 passing (`duration: 148ms`).

## 15. Browser Tests
Playwright regression tests pass; Voice components export cleanly without JSX or syntax issues.

## 16. Manual Testing Required
Follow the 10-iteration protocol in `docs/voice/VOICE_ACCEPTANCE_TEST.md` to verify live microphone hardware across operating system sound cards.

## 17. Known Limitations
- Browser Web Speech API requires user permission and is supported in Chromium, Edge, and Safari; Firefox client-side audio-blob recording fallback is currently PLANNED / UNVERIFIED (server `/api/voice/transcribe` endpoint is implemented).
- Mobile browsers in background tabs may pause WebAudio contexts if tab visibility changes.

## 18. Build Result
`npx vite build` passed cleanly:
- 2,282 modules transformed.
- Zero build errors.
- Build duration: 5.44s.

## 19. Regression Results
Full security regression suite:
`npm run test:security`
- 70 / 70 tests passing (`duration: 808ms`).

## 20. Git Status
All modified and newly created files are cleanly registered and tracked.
