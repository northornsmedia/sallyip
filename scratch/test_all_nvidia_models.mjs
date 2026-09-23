import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const apiKey = process.env.NVIDIA_API_KEY;
const baseUrl = 'https://integrate.api.nvidia.com/v1';

const candidates = [
  'meta/llama-3.2-11b-vision-instruct',
  'meta/llama-3.2-90b-vision-instruct',
  'deepseek-ai/deepseek-coder-6.7b-instruct',
  'deepseek-ai/deepseek-v4.1-flash',
  'nvidia/nemotron-4-340b-instruct',
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
  'nvidia/nemotron-3-super-120b-a12b',
  'nvidia/nemotron-3-ultra-550b-a55b',
  'nvidia/nemotron-3.5-lightning-30b-a3b',
  'meta/muse-glimmer-30b'
];

for (const model of candidates) {
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
        messages: [{ role: 'user', content: 'Say OK' }],
        max_tokens: 10
      }),
      signal: AbortSignal.timeout(5000)
    });
    const duration = Date.now() - start;
    if (res.ok) {
      const data = await res.json();
      console.log(`✅ [${res.status}] ${model} in ${duration}ms: ${data.choices?.[0]?.message?.content?.trim()}`);
    } else {
      console.log(`❌ [${res.status}] ${model}: ${(await res.text()).slice(0, 100)}`);
    }
  } catch (err) {
    console.log(`⏱️ [timeout] ${model}: ${err.message}`);
  }
}
