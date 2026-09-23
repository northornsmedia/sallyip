import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const apiKey = process.env.NVIDIA_API_KEY;
const baseUrl = process.env.SALLYIP_PRIMARY_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const model = process.env.SALLYIP_PRIMARY_MODEL || 'meta/muse-glimmer-30b';

console.log(`Sending chat completion to ${baseUrl}/chat/completions with model ${model}...`);
const start = Date.now();
try {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: 'You are Sally, an expert patent and IP assistant.' },
        { role: 'user', content: 'Hello Sally, what are the 3 core criteria for patentability under 35 U.S.C.?' }
      ],
      max_tokens: 300,
      temperature: 0.2
    })
  });

  const duration = Date.now() - start;
  console.log('Status:', res.status, res.statusText, `(${duration}ms)`);
  const data = await res.json();
  if (res.ok) {
    console.log('Success! Response:');
    console.log(data.choices?.[0]?.message?.content);
  } else {
    console.error('Error payload:', JSON.stringify(data, null, 2));
  }
} catch (e) {
  console.error('Exception:', e.message);
}
