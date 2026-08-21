export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: { message: 'Method not allowed' } })
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json', 'HTTP-Referer': `https://${req.headers.host}`, 'X-Title': 'SallyIP Labs' },
      body: JSON.stringify({ model: 'openrouter/free', messages: [{ role: 'system', content: 'You are SallyIP 4.1 Pro, a precise, helpful AI research assistant for intellectual property. Be clear and practical. State that you are not a lawyer when legal advice is requested.' }, ...(req.body.messages || [])] })
    })
    const data = await response.json()
    return res.status(response.status).json(data)
  } catch (error) { return res.status(500).json({ error: { message: error.message } }) }
}
