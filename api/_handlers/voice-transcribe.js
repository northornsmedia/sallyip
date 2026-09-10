/**
 * SallyIP Server Voice Handler - Transcribe (STT)
 * 
 * Transcribes audio inputs via OpenRouter audio transcription endpoint.
 * Enforces SallyIP Provider Confidentiality Policy.
 */

import { resolveExecutionMode } from '../../src/lib/provider-policy.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  try {
    const { audio_base64, language = 'en', mode } = req.body || {};

    if (!audio_base64) {
      return res.status(400).json({ error: { message: 'audio_base64 is required for transcription' } });
    }

    const executionMode = resolveExecutionMode(process.env, { mode });

    if (executionMode !== 'PUBLIC_RESEARCH') {
      return res.status(403).json({
        error: {
          code: 'CONFIDENTIAL_PILOT_BLOCKED',
          message: `Direct cloud audio transcription is not approved for ${executionMode} matter content without an executed zero-retention DPA.`,
        },
      });
    }

    const apiKey = process.env.OPENROUTER_SPEECH_API_KEY || process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: { message: 'OpenRouter Speech API key is not configured' } });
    }

    // Forward to OpenRouter audio transcription
    const audioBuffer = Buffer.from(audio_base64, 'base64');
    const form = new FormData();
    const blob = new Blob([audioBuffer], { type: 'audio/webm' });
    form.append('file', blob, 'audio.webm');
    form.append('model', process.env.SALLYIP_STT_MODEL || 'openai/whisper-large-v3-turbo');
    form.append('language', language);

    const response = await fetch('https://openrouter.ai/api/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': `https://${req.headers.host || 'sallyip.com'}`,
        'X-Title': 'SallyIP Voice Mode',
      },
      body: form,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json(err);
    }

    const result = await response.json();
    return res.status(200).json({
      text: result.text || '',
      language: result.language || language,
    });
  } catch (error) {
    console.error('[voice-transcribe] Transcription error:', error);
    return res.status(500).json({ error: { message: error.message || 'Audio transcription failed' } });
  }
}
