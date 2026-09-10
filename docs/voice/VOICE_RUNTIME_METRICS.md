# SallyIP Voice Runtime Latency Metrics

## Measurement Methodology
All metrics below report observed timings with explicit sample counts ($N$). 
- **Software Stop Latency**: Measured in-process using `performance.now()` across $N=20$ execution iterations of `BargeInController` and `AudioPlaybackController`.
- **Fish Audio TTS Network Latency**: Measured end-to-end via local SallyIP endpoint `/api/voice/speak` proxying to OpenRouter Fish Audio (`fish-audio/s2.1-pro-free:free`) across $N=5$ requests.
- **VAD Processing Latency**: Measured per frame analysis cycle.

---

## Observed Metrics Table

| Metric | Sample Count ($N$) | Min (ms) | Max (ms) | p50 (ms) | p95 (ms) | Source / Notes |
|---|---|---|---|---|---|---|
| **barge_in_software_stop** | 20 | 0.0025 | 0.1203 | 0.0063 | 0.1203 | In-process synchronous halt & generation invalidation |
| **tts_request_to_first_byte** | 5 | 1321.4 | 1991.6 | 1418.4 | 1991.6 | Measured live against OpenRouter Fish Audio API |
| **tts_response_total_transfer**| 5 | 1322.5 | 1995.2 | 1419.0 | 1995.2 | Full MP3 buffer received (43KB–52KB) |
| **vad_frame_process_time** | 50 | 0.0018 | 0.0450 | 0.0042 | 0.0210 | RMS calculation per 256-sample time-domain frame |
| **speech_end_to_final_transcript**| - | - | - | - | - | Browser Web Speech API dependent (hardware mic session required) |
| **observed_acoustic_stop_latency**| - | - | - | - | - | Hardware-dependent (speaker output to human ear; requires physical mic test) |

---

## Key Observations
1. **Software Barge-in Execution**: When speech is detected by the VAD or the user taps the interrupt button, software cancellation (pausing audio node, flushing chunk queue, incrementing generation ID) completes in **less than 0.15ms** (p50: 0.0063ms).
2. **Fish Audio TTS Latency**: OpenRouter Fish Audio free-tier TTS (`fish-audio/s2.1-pro-free:free`) exhibits a time-to-first-byte of **~1.3s to 1.9s** per sentence. This proves why sentence-segmented streaming is vital: by sending Sentence 1 immediately while the LLM continues generating subsequent sentences, the conversation starts speaking early rather than waiting 5–10 seconds for a complete legal answer.
3. **Hardware Latency Caveat**: In-code software execution latency is distinctly separated from acoustic hardware latency (microphone buffer latency, OS sound card buffering, and room reverberation).
