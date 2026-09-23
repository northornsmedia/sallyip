import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const apiKey = process.env.NVIDIA_API_KEY;
const baseUrl = process.env.SALLYIP_PRIMARY_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const model = process.env.SALLYIP_PRIMARY_MODEL;

console.log('Testing NVIDIA endpoint...');
console.log('Base URL:', baseUrl);
console.log('Model:', model);

try {
  // First check models endpoint
  const modelsRes = await fetch(`${baseUrl}/models`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json'
    }
  });
  console.log('GET /models status:', modelsRes.status, modelsRes.statusText);
  if (modelsRes.ok) {
    const data = await modelsRes.json();
    console.log('Available models count:', data.data?.length || 0);
    const modelIds = (data.data || []).map(m => m.id);
    console.log('Sample models:', modelIds.slice(0, 15));
    const exactMatch = modelIds.includes(model);
    console.log(`Does exact model '${model}' exist?`, exactMatch);
    if (!exactMatch) {
      const nemotronOrLlama = modelIds.filter(id => /nemotron|llama|meta/i.test(id));
      console.log('Matching nemotron/llama models:', nemotronOrLlama);
    }
  } else {
    const errText = await modelsRes.text();
    console.log('GET /models error body:', errText);
  }
} catch (err) {
  console.error('Fetch failed:', err.message);
}
