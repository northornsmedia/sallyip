export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  const { input, text, model } = req.body || {};
  const speechText = String(input || text || '').trim();
  if (!speechText) {
    return res.status(400).json({ error: { message: 'input text is required' } });
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
  const speechModel = model || process.env.SALLYIP_SPEECH_MODEL || 'fish-audio/s2.1-pro-free:free';

  if (!candidateKeys.length) {
    return res.status(500).json({ error: { message: 'OpenRouter Speech API key is not configured' } });
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
