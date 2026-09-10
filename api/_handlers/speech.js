export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  const { input, text, model } = req.body || {};
  const speechText = String(input || text || '').trim();
  if (!speechText) {
    return res.status(400).json({ error: { message: 'input text is required' } });
  }

  const apiKey = process.env.OPENROUTER_SPEECH_API_KEY || process.env.OPENROUTER_API_KEY;
  const speechModel = model || process.env.SALLYIP_SPEECH_MODEL || 'fish-audio/s2.1-pro-free:free';

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

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json(err);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', String(buffer.length));
    return res.status(200).send(buffer);
  } catch (error) {
    return res.status(500).json({ error: { message: error.message } });
  }
}
