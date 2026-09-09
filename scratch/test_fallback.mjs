const API = 'https://generativelanguage.googleapis.com/v1beta/openai';
const key = process.env.GEMINI_API_KEY;

const MODELS = ['gemini-flash-lite-latest', 'gemini-flash-latest'];

async function askWithFallback(prompt) {
  for (const model of MODELS) {
    try {
      const res = await fetch(`${API}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      if (res.status === 429) {
        console.log(`[${model}] 429 quota exhausted, falling back to next model...`);
        continue;
      }
      if (res.ok) {
        const data = await res.json();
        return { model, answer: data.choices?.[0]?.message?.content };
      }
    } catch (e) {
      console.log(`[${model}] error:`, e.message);
    }
  }
  return { error: 'all models exhausted' };
}

const res = await askWithFallback('What is 2+2? Answer with just the number.');
console.log('Result:', res);
