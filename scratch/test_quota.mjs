const API = 'https://generativelanguage.googleapis.com/v1beta/openai';
const key = process.env.GEMINI_API_KEY;

for (const m of ['gemini-flash-latest', 'gemini-3.5-flash', 'gemini-3-flash-preview', 'gemini-2.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-pro-latest']) {
  try {
    const res = await fetch(`${API}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: m,
        messages: [{ role: 'user', content: 'Say OK' }]
      })
    });
    console.log(m, 'status:', res.status);
    if (res.ok) {
      const data = await res.json();
      console.log('   => SUCCESS:', data.choices?.[0]?.message?.content);
    } else {
      const t = await res.text();
      console.log('   => FAIL:', t.slice(0, 100));
    }
  } catch (e) {
    console.log(m, 'error:', e.message);
  }
}
