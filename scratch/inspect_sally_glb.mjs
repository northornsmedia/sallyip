import fs from 'fs';

const buf = fs.readFileSync('./public/models/sally_avatar.glb');
const jsonLen = buf.readUInt32LE(12);
const jsonStr = buf.toString('utf8', 20, 20 + jsonLen);
const gltf = JSON.parse(jsonStr);
console.log('Meshes count:', gltf.meshes?.length);
gltf.meshes.forEach((m, idx) => {
  console.log(`Mesh ${idx}: ${m.name}`);
  if (m.extras?.targetNames) {
    console.log('  Target names count:', m.extras.targetNames.length);
    console.log('  Target names sample:', m.extras.targetNames.slice(0, 15));
  }
});
console.log('Nodes sample:', gltf.nodes?.map(n => n.name).slice(0, 15));
