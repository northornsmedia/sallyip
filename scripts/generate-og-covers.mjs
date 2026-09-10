// Generates premium minimal OG covers (1200x630 PNG) into public/og/.
// Style: near-black, restrained indigo accent, editorial type. No stock/AI imagery.
// Run: npm run seo:og  (requires PIL: python -c "import PIL")
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const out = resolve(root, '..', 'public', 'og');
const covers = [
  ['home.png', 'SALLYIP — VERIFICATION-FIRST IP AI', 'IP intelligence,\nfrom creation to enforcement.'],
  ['patents.png', 'PATENT AI — SALLYIP', 'Patent research, drafting\n& prosecution — verified.'],
  ['trademarks.png', 'TRADEMARK AI — SALLYIP', 'Clearance\nwith receipts.'],
  ['benchmarks.png', 'SALLYIP BENCHMARKS', 'Measured,\nwith failures shown.'],
  ['research.png', 'SALLYIP RESEARCH', 'Ablation, entailment\n& retrieval studies.'],
  ['glossary.png', 'IP GLOSSARY — SALLYIP', 'Twenty definitions\nthat do work.'],
];
const py = `
import os, sys
from PIL import Image, ImageDraw, ImageFont
out = sys.argv[1]
os.makedirs(out, exist_ok=True)
jobs = [tuple(a.split('|', 2)) for a in sys.argv[2].split('||')]
BOLD = r'C:\\Windows\\Fonts\\arialbd.ttf'
REG = r'C:\\Windows\\Fonts\\arial.ttf'
for fname, eyebrow, title in jobs:
    img = Image.new('RGB', (1200, 630), (11, 11, 18))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, 1200, 630], outline=(38, 38, 54), width=2)
    d.rectangle([96, 470, 320, 478], fill=(99, 102, 241))
    d.text((96, 120), eyebrow, font=ImageFont.truetype(BOLD, 34), fill=(165, 180, 252))
    d.multiline_text((92, 200), title.replace('\\\\n', '\\n'), font=ImageFont.truetype(BOLD, 74), fill=(245, 245, 247), spacing=10)
    d.text((96, 530), 'SALLYIP.COM  —  NO EVIDENCE, NO ASSERTION', font=ImageFont.truetype(REG, 28), fill=(113, 113, 130))
    img.save(os.path.join(out, fname))
    print('cover:', fname)
`;
const arg = covers.map(([f, e, t]) => `${f}|${e}|${t.replace(/\n/g, '\\n')}`).join('||');
execFileSync('python', ['-c', py, out, arg], { stdio: 'inherit' });
console.log('og covers done');
