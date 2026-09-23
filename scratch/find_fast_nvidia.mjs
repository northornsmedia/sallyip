import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const apiKey = process.env.NVIDIA_API_KEY;
const baseUrl = 'https://integrate.api.nvidia.com/v1';

const candidates = [
  'nvidia/llama-3.1-nemotron-70b-instruct',
  'meta/llama-3.2-11b-vision-instruct',
  'nvidia/nemotron-4-340b-instruct',
  'meta/muse-glimmer-30b'
];

for (const model of candidates) {
  console.log(`\nTesting ${model}...`);
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
        messages: [{ role: 'user', content: 'Say hello in 5 words' }],
        max_tokens: 20
      }),
      signal: AbortSignal.timeout(6000)
    });
    const duration = Date.now() - start;
    if (res.ok) {
      const data = await res.json();
      console.log(`✅ ${model} responded in ${duration}ms:`, data.choices?.[0]?.message?.content?.trim());
      break; // Found our fast model!
    } else {
      console.log(`❌ ${model} status ${res.status}:`, await res.text());
    }
  } catch (err) {
    console.log(`❌ ${model} timed out or failed: ${err.message} (${Date.now() - start}ms)`);
  }
}
