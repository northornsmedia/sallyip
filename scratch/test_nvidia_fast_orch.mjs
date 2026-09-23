import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
import { orchestrateSally } from '../src/lib/sally-orchestrator.js';

const testEnv = {
  ...process.env,
  SALLYIP_PRIMARY_MODEL: 'meta/llama-3.2-11b-vision-instruct',
  SALLYIP_PRIMARY_NAME: 'NVIDIA NIM (Llama 3.2)',
  SALLYIP_PRIMARY_KEY: 'NVIDIA_API_KEY',
  SALLYIP_PRIMARY_BASE_URL: 'https://integrate.api.nvidia.com/v1',
  SALLYIP_DISABLE_FALLBACK: '0',
  SALLYIP_STRICT_PRIMARY: '0'
};

console.log('Testing orchestrateSally with NVIDIA NIM Llama 3.2 11B...');
const start = Date.now();
try {
  const result = await orchestrateSally(
    [{ role: 'user', content: 'What are the 3 core criteria for patentability?' }],
    testEnv,
    'http://localhost:5173'
  );
  console.log(`✅ SUCCESS in ${Date.now() - start}ms!`);
  console.log('Primary engine:', result.meta?.primary_engine);
  console.log('Answer:\n', result.answer?.slice(0, 300));
} catch (e) {
  console.error('❌ Failed:', e.message);
}
