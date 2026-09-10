/**
 * SallyIP Server Voice Handler - Speak (TTS)
 * 
 * Synthesizes text into audio using OpenRouter Fish Audio.
 * Enforces SallyIP Provider Confidentiality Policy (fail-closed for confidential matter data).
 */

import { assertChatAllowed, resolveExecutionMode } from '../../src/lib/provider-policy.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  try {
    const { text, input, model, matter_id, mode } = req.body || {};
    const speechText = String(text || input || '').trim();

    if (!speechText) {
      return res.status(400).json({ error: { message: 'Speech text is required' } });
    }

    const executionMode = resolveExecutionMode(process.env, { mode });

    // Enforce confidentiality policy:
    // If executionMode is CONFIDENTIAL_IP or HIGHLY_CONFIDENTIAL, free models are blocked!
    const speechModel = model || process.env.SALLYIP_SPEECH_MODEL || 'fish-audio/s2.1-pro-free:free';

    if (executionMode !== 'PUBLIC_RESEARCH') {
      const policyCheck = assertChatAllowed({
        engines: [{ slug: speechModel, name: 'Speech TTS', key: 'OPENROUTER_SPEECH_API_KEY' }],
        mode: executionMode,
        env: process.env,
      });

      if (!policyCheck.allowed || policyCheck.allowed.length === 0) {
        return res.status(403).json({
          error: {
            code: 'CONFIDENTIAL_PILOT_BLOCKED',
            message: `Voice TTS model '${speechModel}' is not approved for ${executionMode} matter content.`,
          },
        });
      }
    }

    const candidateKeys = [
      process.env.OPENROUTER_SPEECH_API_KEY,
      process.env.OPENROUTER_API_KEY,
      process.env.OPENROUTER_LFM_CHAT_API_KEY,
      process.env.OPENROUTER_GEMMA_API_KEY,
      process.env.OPENROUTER_EMBEDDING_API_KEY,
      process.env.OPENROUTER_OX_API_KEY,
      process.env.OPENROUTER_RERANK_API_KEY,
    ].filter(Boolean);

    if (!candidateKeys.length) {
      return res.status(500).json({ error: { message: 'OpenRouter Speech API key is not configured' } });
    }

    let lastError = null;
    let lastStatus = 500;

    for (const apiKey of candidateKeys) {
      const response = await fetch('https://openrouter.ai/api/v1/audio/speech', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': `https://${req.headers.host || 'sallyip.com'}`,
          'X-Title': 'SallyIP Voice Mode',
        },
        body: JSON.stringify({
          model: speechModel,
          input: speechText,
          response_format: 'mp3',
        }),
      });

      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Length', String(buffer.length));
        res.setHeader('Cache-Control', 'no-cache, no-store');
        return res.status(200).send(buffer);
      }

      lastStatus = response.status;
      lastError = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
      if (response.status === 429) {
        continue;
      }
      return res.status(lastStatus).json(lastError);
    }

    return res.status(lastStatus).json(lastError || { error: { message: 'Speech synthesis failed' } });
  } catch (error) {
    console.error('[voice-speak] Synthesis error:', error);
    return res.status(500).json({ error: { message: error.message || 'Speech synthesis failed' } });
  }
}
