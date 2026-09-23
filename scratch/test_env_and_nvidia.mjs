import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

console.log('Available keys matching NVIDIA, OPENROUTER, GEMINI, SALLYIP:');
for (const key of Object.keys(process.env)) {
  if (/NVIDIA|OPENROUTER|GEMINI|SALLYIP|KEY/i.test(key)) {
    const val = process.env[key] || '';
    const prefix = val.slice(0, 7);
    const len = val.length;
    console.log(`  ${key}: length=${len}, prefix=${prefix}...`);
  }
}
