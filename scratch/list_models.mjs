const key = process.env.GEMINI_API_KEY;
const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
const data = await res.json();
console.log('Available models:');
for (const m of (data.models || [])) {
  if (m.supportedGenerationMethods?.includes('generateContent')) {
    console.log('-', m.name, '| methods:', m.supportedGenerationMethods);
  }
}
