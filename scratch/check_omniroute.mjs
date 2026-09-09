const url = process.env.OMNIROUTE_BASE_URL;
const key = process.env.OMNIROUTE_API_KEY;
console.log('OMNIROUTE url:', url);
console.log('OMNIROUTE key exists:', Boolean(key));

if (url && key) {
  try {
    const res = await fetch(`${url.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.SALLYIP_DOTS_MODEL || 'meta-llama/llama-3.3-70b-instruct',
        messages: [{ role: 'user', content: 'Say hello' }]
      })
    });
    console.log('OMNIROUTE status:', res.status);
    console.log('OMNIROUTE body:', (await res.text()).slice(0, 300));
  } catch (e) {
    console.log('OMNIROUTE error:', e.message);
  }
}
