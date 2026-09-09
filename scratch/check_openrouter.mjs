const key = process.env.OPENROUTER_API_KEY;

const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://sallyip.com',
    'X-Title': 'SallyIP Benchmark'
  },
  body: JSON.stringify({
    model: 'google/gemini-2.5-flash',
    messages: [{ role: 'user', content: 'Say hello' }]
  })
});

console.log('OpenRouter status:', res.status);
const text = await res.text();
console.log('OpenRouter body:', text.slice(0, 300));
