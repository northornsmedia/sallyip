# SallyIP Barge-In (Interruption) Design Specification

## 1. The Core Principle: User Audio Wins
In SallyIP Voice Mode, the user's voice always takes precedence. Sally never talks over the user.

When the assistant is in the `SPEAKING` state:
1. The microphone remains active.
2. The Voice Activity Detector (VAD) continuously samples incoming microphone frames.
3. If genuine user speech is detected:
   - Playback halts synchronously in the audio engine (local software cancellation path measured `<0.15ms`; physical acoustic stop latency depends on OS hardware buffers).
   - The audio chunk queue is cleared.
   - The active `generationId` is incremented, ensuring any residual chunks arriving from the network are rejected.
   - Active LLM and TTS network requests are aborted via `AbortController`.
   - The assistant's turn is recorded as `interrupted: true` with what was actually spoken.
   - Sally immediately captures the user's interruption and starts a new turn.

---

## 2. Invalidation & Race Condition Prevention
A fundamental failure in naive voice implementations is the "stale chunk race condition":
1. Generation A is speaking.
2. User interrupts.
3. Generation B starts.
4. Slow network packets from Generation A arrive late, polluting the audio buffer or transcript.

### Solution: Generation ID Fencing
Every assistant response is tagged with an integer `generationId`.
```javascript
// On Barge-In:
stopAndClear(reason = 'USER_BARGE_IN') {
  this.activeGenerationId += 1;
  this.queuedChunks = [];
  this.currentSource?.stop(0);
  this.currentAudioElement?.pause();
}

// On Chunk Arrival:
async enqueueChunk(chunk) {
  if (chunk.generationId !== this.activeGenerationId) {
    // STALE GENERATION: DISCARD IMMEDIATELY
    return false;
  }
  ...
}
```
Any late chunk where `chunk.generationId !== activeGenerationId` is dropped without execution.

---

## 3. Acoustic Echo Cancellation & Self-Interruption Guard
When Sally speaks through laptop speakers, sound leaks back into the microphone. Sally must not interrupt herself.

### Mitigation Strategy:
1. **Browser Hardware AEC**: `navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })`.
2. **Dual-Threshold VAD**:
   - `energyThresholdListening`: `0.015` RMS (high sensitivity when Sally is quiet).
   - `energyThresholdSpeaking`: `0.038` RMS (elevated threshold during assistant playback).
3. **Minimum Interruption Duration**: Transient acoustic spikes are rejected; sustained speech (`>=160ms`) is required to trigger barge-in.

---

## 4. Latency Telemetry
Every barge-in event records:
- `speechDetectedAt`: High-resolution timestamp when VAD crossed threshold.
- `audioStoppedAt`: Timestamp when audio node stopped.
- `bargeInLatencyMs`: Perceived stop delay (`audioStoppedAt - speechDetectedAt`). Target: `<25ms`.
