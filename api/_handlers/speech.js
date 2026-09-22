import { synthesizeEdgeTTS } from '../../src/lib/edge-tts-service.js';
import { neon } from '@neondatabase/serverless';
import { getSessionUser } from '../../src/lib/auth.js';

const VOICE_RE = /^[a-z]{2}-[A-Z]{2}-[A-Za-z]+Neural$/;
const MAX_SPEECH_CHARS = 2000;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  if (!process.env.DATABASE_URL) {
    return res.status(503).json({ error: { message: 'Service unavailable: database not configured', code: 'NOT_CONFIGURED' } });
  }
  try {
    const sql = neon(process.env.DATABASE_URL);
    const user = await getSessionUser(sql, req.headers?.cookie || '').catch(() => null);
    if (!user || !user.id) {
      return res.status(401).json({ error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } });
    }
  } catch {
    return res.status(503).json({ error: { message: 'Service unavailable', code: 'NOT_CONFIGURED' } });
  }

  const { input, text, model, voice } = req.body || {};
  const speechText = String(input || text || '').trim();
  if (!speechText) {
    return res.status(400).json({ error: { message: 'input text is required' } });
  }
  if (speechText.length > MAX_SPEECH_CHARS) {
    return res.status(400).json({ error: { message: `input text exceeds ${MAX_SPEECH_CHARS} characters`, code: 'VALIDATION_ERROR' } });
  }
  if (voice && (typeof voice !== 'string' || voice.length > 60 || !VOICE_RE.test(voice))) {
    return res.status(400).json({ error: { message: 'Invalid voice identifier', code: 'VALIDATION_ERROR' } });
  }

  // 1. PRIMARY: Microsoft Edge Neural TTS (Free, high-fidelity neural voice)
  try {
    const edgeVoice = voice || process.env.EDGE_TTS_VOICE || 'en-US-AriaNeural';
    const buffer = await synthesizeEdgeTTS(speechText, { voice: edgeVoice });
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', String(buffer.length));
    res.setHeader('Cache-Control', 'no-cache, no-store');
    res.setHeader('X-TTS-Engine', 'microsoft-edge-neural');
    return res.status(200).send(buffer);
  } catch (edgeErr) {
    console.warn('[speech] Edge TTS primary synthesis failed, attempting fallback:', edgeErr.message);
  }

  // 2. FALLBACK: OpenRouter / Fish Audio
  const candidateKeys = [
    process.env.OPENROUTER_SPEECH_API_KEY,
    process.env.OPENROUTER_API_KEY,
    process.env.OPENROUTER_LFM_CHAT_API_KEY,
    process.env.OPENROUTER_GEMMA_API_KEY,
    process.env.OPENROUTER_EMBEDDING_API_KEY,
    process.env.OPENROUTER_OX_API_KEY,
    process.env.OPENROUTER_RERANK_API_KEY,
  ].filter(Boolean);
  const speechModel = model || process.env.SALLYIP_SPEECH_MODEL || 'fish-audio/s2.1-pro-free:free';

  if (!candidateKeys.length) {
    return res.status(500).json({ error: { message: 'Edge TTS and OpenRouter Speech are both unavailable' } });
  }

  let lastError = null;
  let lastStatus = 500;

  for (const apiKey of candidateKeys) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/audio/speech', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': `https://${req.headers.host || 'sallyip.com'}`,
          'X-Title': 'SallyIP Voice Agent',
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
        return res.status(200).send(buffer);
      }

      lastStatus = response.status;
      lastError = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
      // If rate limited, failover to next key
      if (response.status === 429) {
        continue;
      }
      return res.status(lastStatus).json(lastError);
    } catch (error) {
      lastError = { message: error.message };
    }
  }

  return res.status(lastStatus).json(lastError || { error: { message: 'Speech synthesis failed' } });
}
