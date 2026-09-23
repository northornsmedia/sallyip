import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
import { orchestrateSally } from '../src/lib/sally-orchestrator.js';

console.log('Testing full orchestrateSally call...');
const start = Date.now();
try {
  const result = await orchestrateSally(
    [{ role: 'user', content: 'What is prior art in patent law?' }],
    process.env,
    'http://localhost:5173'
  );
  console.log(`✅ Success in ${Date.now() - start}ms!`);
  console.log('Model used:', result.meta?.primary_engine);
  console.log('Answer preview:', result.answer?.slice(0, 200));
} catch (err) {
  console.error(`❌ Failed in ${Date.now() - start}ms:`, err.message);
}
