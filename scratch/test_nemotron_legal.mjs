import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const apiKey = process.env.NVIDIA_API_KEY;
const baseUrl = 'https://integrate.api.nvidia.com/v1';
const model = 'nvidia/nemotron-3-ultra-550b-a55b';

console.log(`Testing legal prompt on ${model}...`);
const start = Date.now();
try {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are Sally, an enterprise AI IP & patent attorney assistant.' },
        { role: 'user', content: 'Explain 35 U.S.C. 102 vs 103 in patent examination briefly.' }
      ],
      max_tokens: 250,
      temperature: 0.2
    })
  });
  console.log('Status:', res.status, `in ${Date.now() - start}ms`);
  const data = await res.json();
  console.log('Response:\n', data.choices?.[0]?.message?.content);
} catch (e) {
  console.error('Error:', e.message);
}
