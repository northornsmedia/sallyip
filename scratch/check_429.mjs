const API = 'https://generativelanguage.googleapis.com/v1beta/openai';
const key = process.env.GEMINI_API_KEY;

const res = await fetch(`${API}/chat/completions`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'gemini-flash-lite-latest',
    messages: [{ role: 'user', content: 'hello' }]
  })
});

console.log('Status:', res.status);
const text = await res.text();
console.log('Body:', text);
