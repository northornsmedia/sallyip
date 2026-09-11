import fs from 'fs';

for (const name of ['d0.mp4', 'd6.mp4', 's13.mp4']) {
  const p = `./public/videos/${name}`;
  if (fs.existsSync(p)) {
    const stat = fs.statSync(p);
    console.log(`${name}: ${stat.size} bytes`);
  }
}
