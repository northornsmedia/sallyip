# SallyIP Voice Browser Support Matrix

## Evaluation Statuses
- **VERIFIED**: Confirmed through interactive live runtime validation.
- **AUTOMATED_ONLY**: Covered by automated unit, mocked, and integration test suites.
- **IMPLEMENTED_UNVERIFIED**: Implementation present in codebase, but awaits physical device testing.
- **UNSUPPORTED**: Platform/engine lacks required APIs.

---

## Feature Matrix by Browser Engine

| Capability | Chrome (Blink) | Edge (Blink) | Safari (WebKit) | Firefox (Gecko) |
|---|---|---|---|---|
| **Microphone Access (`getUserMedia`)** | AUTOMATED_ONLY | AUTOMATED_ONLY | AUTOMATED_ONLY | AUTOMATED_ONLY |
| **WebAudio Processing (`AudioContext`)** | AUTOMATED_ONLY | AUTOMATED_ONLY | AUTOMATED_ONLY | AUTOMATED_ONLY |
| **Client Streaming STT (`SpeechRecognition`)** | AUTOMATED_ONLY | AUTOMATED_ONLY | IMPLEMENTED_UNVERIFIED | UNSUPPORTED |
| **Server STT Fallback (`/api/voice/transcribe`)**| AUTOMATED_ONLY | AUTOMATED_ONLY | AUTOMATED_ONLY | IMPLEMENTED_UNVERIFIED |
| **Acoustic VAD (`VoiceActivityDetector`)** | AUTOMATED_ONLY | AUTOMATED_ONLY | AUTOMATED_ONLY | AUTOMATED_ONLY |
| **Fish Audio TTS (`/api/voice/speak`)** | AUTOMATED_ONLY | AUTOMATED_ONLY | AUTOMATED_ONLY | AUTOMATED_ONLY |
| **Instant Barge-In (`BargeInController`)** | AUTOMATED_ONLY | AUTOMATED_ONLY | AUTOMATED_ONLY | AUTOMATED_ONLY |
| **Hardware Echo Cancellation (`echoCancellation`)**| IMPLEMENTED_UNVERIFIED | IMPLEMENTED_UNVERIFIED | IMPLEMENTED_UNVERIFIED | IMPLEMENTED_UNVERIFIED |
| **Manual Stop / Interrupt Button** | AUTOMATED_ONLY | AUTOMATED_ONLY | AUTOMATED_ONLY | AUTOMATED_ONLY |
| **Tested Version** | Chrome 128+ | Edge 128+ | Safari 17.5+ (spec) | Firefox 130+ (spec) |
| **Overall Status** | AUTOMATED_ONLY | AUTOMATED_ONLY | IMPLEMENTED_UNVERIFIED | IMPLEMENTED_UNVERIFIED |

---

## Engine Notes

### 1. Chrome & Edge (Blink)
- Full standard support for Web Speech API (`webkitSpeechRecognition`) with `continuous: true` and `interimResults: true`.
- Hardware echo cancellation flags supported natively via WebRTC audio track constraints.
- Automated tests pass completely; live hardware mic testing required for acoustic rating.

### 2. Safari (WebKit)
- Supports `webkitSpeechRecognition` starting from Safari 14.1 on macOS and iOS, but requires user activation gestures to initialize `AudioContext`.
- WebAudio suspend/resume behavior handled in `MicrophoneController.js` and `AudioPlaybackController.js`.

### 3. Firefox (Gecko)
- **SpeechRecognition**: Firefox lacks native `SpeechRecognition` support by default (`media.webspeech.recognition.enable` is disabled in default release profiles).
- **Fallback**: Server-side audio-blob transcription via `/api/voice/transcribe` is implemented as an endpoint, but client-side MediaRecorder capture integration remains `IMPLEMENTED_UNVERIFIED`.
