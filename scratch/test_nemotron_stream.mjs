import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const apiKey = process.env.NVIDIA_API_KEY;
const baseUrl = 'https://integrate.api.nvidia.com/v1';
const model = 'nvidia/nemotron-3-ultra-550b-a55b';

console.log(`Testing STREAMING on ${model}...`);
const start = Date.now();
try {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are Sally, an enterprise AI IP & patent attorney assistant.' },
        { role: 'user', content: 'Draft a short patent claim for a smart wearable vital monitor.' }
      ],
      stream: true,
      max_tokens: 120
    })
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let firstTokenTime = null;
  let text = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!firstTokenTime) {
      firstTokenTime = Date.now() - start;
    }
    text += decoder.decode(value, { stream: true });
  }
  console.log(`✅ ${model} streamed successfully! TTFT: ${firstTokenTime}ms, total: ${Date.now() - start}ms`);
} catch (e) {
  console.error('Error:', e.message);
}
