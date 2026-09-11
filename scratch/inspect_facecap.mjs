import fs from 'fs';

const buf = fs.readFileSync('./public/models/facecap.glb');
const jsonLen = buf.readUInt32LE(12);
const jsonStr = buf.toString('utf8', 20, 20 + jsonLen);
const gltf = JSON.parse(jsonStr);
console.log('Meshes count:', gltf.meshes?.length);
gltf.meshes.forEach((m, idx) => {
  console.log(`Mesh ${idx}: ${m.name}`);
  if (m.extras?.targetNames) {
    console.log('Target names:', m.extras.targetNames.slice(0, 15));
    console.log('Total target names:', m.extras.targetNames.length);
  }
});
