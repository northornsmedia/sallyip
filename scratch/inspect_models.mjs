import fs from 'fs';

for (const file of ['./public/models/Michelle.glb', './public/models/kira.glb']) {
  console.log('=== FILE:', file);
  const buf = fs.readFileSync(file);
  const jsonLen = buf.readUInt32LE(12);
  const jsonStr = buf.toString('utf8', 20, 20 + jsonLen);
  const gltf = JSON.parse(jsonStr);
  console.log('Meshes count:', gltf.meshes?.length);
  gltf.meshes?.forEach((m, idx) => {
    console.log(` Mesh ${idx}: ${m.name}`);
    if (m.extras?.targetNames) {
      console.log('  Target names:', m.extras.targetNames.slice(0, 10));
    } else if (m.primitives?.[0]?.targets) {
      console.log('  Primitive targets:', m.primitives[0].targets.length);
    }
  });
  if (gltf.animations) {
    console.log('Animations:', gltf.animations.map(a => a.name));
  }
}
