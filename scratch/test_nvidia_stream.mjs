import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const apiKey = process.env.NVIDIA_API_KEY;
const baseUrl = process.env.SALLYIP_PRIMARY_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const model = process.env.SALLYIP_PRIMARY_MODEL || 'meta/muse-glimmer-30b';

console.log(`Testing STREAMING chat completion to ${baseUrl}/chat/completions with model ${model}...`);
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
      model: model,
      messages: [
        { role: 'system', content: 'You are Sally, an expert patent and IP assistant.' },
        { role: 'user', content: 'Draft a one-paragraph claim for an AI-powered solar tracker.' }
      ],
      stream: true,
      max_tokens: 200,
      temperature: 0.2
    })
  });

  console.log('Stream HTTP status:', res.status, res.statusText, `TTFB: ${Date.now() - start}ms`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let firstChunkTime = null;
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!firstChunkTime) {
      firstChunkTime = Date.now() - start;
      console.log(`First token arrival (time to first token): ${firstChunkTime}ms`);
    }
    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('data:') && !trimmed.includes('[DONE]')) {
        try {
          const json = JSON.parse(trimmed.replace(/^data:\s*/, ''));
          const delta = json.choices?.[0]?.delta?.content || '';
          fullText += delta;
        } catch {}
      }
    }
  }
  console.log(`Total stream duration: ${Date.now() - start}ms`);
  console.log('Streamed text preview:', fullText.slice(0, 150) + '...');
} catch (e) {
  console.error('Exception in streaming:', e.message);
}
