import fs from 'fs';
import zlib from 'zlib';

function decodePng(buffer) {
  let pos = 8;
  let idat = [];
  let width, height;
  while (pos < buffer.length) {
    const len = buffer.readUInt32BE(pos);
    const type = buffer.toString('ascii', pos + 4, pos + 8);
    if (type === 'IHDR') {
      width = buffer.readUInt32BE(pos + 8);
      height = buffer.readUInt32BE(pos + 12);
    } else if (type === 'IDAT') {
      idat.push(buffer.slice(pos + 8, pos + 8 + len));
    }
    pos += 12 + len;
  }
  const decomp = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * 4 + 1;
  const pixels = Buffer.alloc(width * height * 4);

  const prevRow = Buffer.alloc(width * 4);
  const curRow = Buffer.alloc(width * 4);

  for (let y = 0; y < height; y++) {
    const filter = decomp[y * stride];
    const rowStart = y * stride + 1;

    for (let x = 0; x < width * 4; x++) {
      const raw = decomp[rowStart + x];
      const a = x >= 4 ? curRow[x - 4] : 0;
      const b = prevRow[x];
      const c = x >= 4 ? prevRow[x - 4] : 0;

      let val = 0;
      if (filter === 0) val = raw;
      else if (filter === 1) val = (raw + a) & 0xff;
      else if (filter === 2) val = (raw + b) & 0xff;
      else if (filter === 3) val = (raw + Math.floor((a + b) / 2)) & 0xff;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        let pr = a;
        if (pb <= pa && pb <= pc) pr = b;
        else if (pc <= pa && pc <= pb) pr = c;
        val = (raw + pr) & 0xff;
      }
      curRow[x] = val;
    }
    curRow.copy(pixels, y * width * 4);
    curRow.copy(prevRow);
  }
  return { width, height, pixels };
}

const rawImg = fs.readFileSync('C:/Users/User/.gemini/antigravity-ide/brain/2f8ff06a-fab3-4513-84bc-87db90dd501a/.user_uploaded/media_1788962913931.png');
const { width, height, pixels } = decodePng(rawImg);

// Find exact bounds of the brand icon (leftmost block)
let minX = 999, maxX = 0, minY = 999, maxY = 0;
for (let y = 0; y < height; y++) {
  for (let x = 0; x < 90; x++) {
    const idx = (y * width + x) * 4;
    const r = pixels[idx], g = pixels[idx+1], b = pixels[idx+2];
    if (b > 150 && (b > r + 30) && (b > g + 30)) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}

console.log('Brand icon box:', { minX, maxX, minY, maxY, w: maxX - minX + 1, h: maxY - minY + 1 });

// Sample corner and center colors
const iconW = maxX - minX + 1;
const iconH = maxY - minY + 1;

// Print ASCII representation of the icon glyph
console.log('ASCII Map of Icon:');
for (let y = minY; y <= maxY; y++) {
  let line = '';
  for (let x = minX; x <= maxX; x++) {
    const idx = (y * width + x) * 4;
    const r = pixels[idx], g = pixels[idx+1], b = pixels[idx+2];
    // If pixel is white/bright
    if (r > 200 && g > 200 && b > 200) {
      line += '#';
    } else if (r > 150 && g > 150 && b > 180) {
      line += '+';
    } else if (b > 140) {
      line += ' ';
    } else {
      line += '.';
    }
  }
  console.log(line);
}
