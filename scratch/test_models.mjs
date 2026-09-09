const API = 'https://generativelanguage.googleapis.com/v1beta/openai';
const key = process.env.GEMINI_API_KEY;

for (const model of ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-pro']) {
  try {
    const res = await fetch(`${API}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Say OK' }]
      })
    });
    console.log(model, '-> Status:', res.status);
    if (res.ok) {
      const data = await res.json();
      console.log('   Response:', data.choices?.[0]?.message?.content);
    } else {
      const txt = await res.text();
      console.log('   Err:', txt.slice(0, 150));
    }
  } catch (e) {
    console.log(model, '-> Error:', e.message);
  }
}
