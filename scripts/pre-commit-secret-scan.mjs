#!/usr/bin/env node
// Pre-commit secret scan hook — blocks commits with secrets.
// Usage: add to .git/hooks/pre-commit or use with husky.
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const RULES = [
  { id: 'openrouter-key', re: /sk-or-v1-[A-Za-z0-9]{8,}/ },
  { id: 'google-api-key', re: /AIza[0-9A-Za-z_-]{10,}/ },
  { id: 'postgres-url', re: /postgres(?:ql)?:\/\/[^/\s:]+:[^@\s]+@[^/\s]+/ },
  { id: 'aws-key', re: /AKIA[0-9A-Z]{16}/ },
  { id: 'private-key', re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { id: 'bearer-token', re: /[Bb]earer\s+[A-Za-z0-9\-._~+/=]{20,}/ },
];

const PLACEHOLDER = /(replace_with|example|placeholder|dummy|test|xxxx|your[_-]?key|changeme)/i;

function getStagedFiles() {
  try {
    const out = execSync('git diff --cached --name-only', { encoding: 'utf8' });
    return out.split('\n').map(s => s.trim()).filter(Boolean)
      .filter(f => !f.startsWith('node_modules/') && !f.startsWith('dist/') && !f.startsWith('.git/'));
  } catch { return []; }
}

let hits = 0;
for (const file of getStagedFiles()) {
  // Local secret stores must never be staged
  if (file === '.env.local' || (file.startsWith('.ai-keys') && file.endsWith('.local.json'))) {
    console.error(`FAIL [staged-secret-file] ${file} must not be committed`);
    hits++;
    continue;
  }
  if (file === '.env.example' || file.endsWith('.example.json')) continue;
  let content;
  try { content = fs.readFileSync(file, 'utf8'); } catch { continue; }
  if (content.length > 500000) continue;
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    for (const rule of RULES) {
      if (rule.re.test(line) && !PLACEHOLDER.test(line)) {
        console.error(`FAIL [${rule.id}] ${file}:${i + 1}`);
        hits++;
      }
    }
  });
}
if (hits) { console.error(`pre-commit secret-scan: ${hits} finding(s). Remove secrets; use Vercel env.`); process.exit(1); }
console.log('pre-commit secret-scan: clean');