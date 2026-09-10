# SallyIP Voice Security & Provider Confidentiality Policy

## 1. Zero Key Leakage
- **Server-Side Only**: `OPENROUTER_SPEECH_API_KEY` and `OPENROUTER_API_KEY` are strictly maintained in server-side environment variables (`.env`, `.env.local`).
- **No Client Exposure**: No keys are prefixed with `VITE_` or exposed in client JavaScript bundles.
- Verified by automated secret scanner test `tests/voice/voice-security-policy.test.mjs`.

---

## 2. Fail-Closed Confidentiality Architecture
Voice mode is an input/output modality for SallyIP—it does not circumvent confidentiality policies.

Under `src/lib/provider-policy.js`:
- **Execution Modes**: `PUBLIC_RESEARCH`, `CONFIDENTIAL_IP`, `HIGHLY_CONFIDENTIAL`.
- **Confidential Content Classes**: `unpublished_invention`, `patent_draft`, `invention_disclosure`, `confidential_document`, `nda_material`, `litigation_evidence`, `contract`, `trade_secret`.
- **Fail-Closed Rule**: If a request is submitted in `CONFIDENTIAL_IP` or `HIGHLY_CONFIDENTIAL` mode, free/contributor tier models train on prompts and are **strictly blocked**.
- If no paid, DPA-backed zero-retention provider is approved, `/api/voice/speak` and `/api/voice/transcribe` return HTTP 403 with code `CONFIDENTIAL_PILOT_BLOCKED`.

---

## 3. Redaction & Safe Logging
Server-side handlers for voice (`/api/voice/cancel`, `/api/voice/speak`, `/api/voice/transcribe`):
- Never log raw microphone audio buffers.
- Never log full confidential voice transcripts.
- Only log safe metrics: session ID, duration, latency metrics (`barge_in_latency_ms`), generation ID, and error codes.

---

## 4. Free Model Routing Reality Notice (Fish Audio)
- The currently configured voice model `fish-audio/s2.1-pro-free:free` is a **free-tier / community route** on OpenRouter.
- Under SallyIP Phase 1 Hardening (`src/lib/provider-policy.js`):
  - Free and contributor-tier models are **NOT approved for confidential matter data**.
  - Requests submitted in `CONFIDENTIAL_IP` or `HIGHLY_CONFIDENTIAL` modes will receive `403 CONFIDENTIAL_PILOT_BLOCKED`.
  - **No Claim of Confidential Voice Availability**: SallyIP does not claim or market confidential voice capabilities until an enterprise provider with an executed zero-retention Data Processing Addendum (DPA) is registered and verified.
