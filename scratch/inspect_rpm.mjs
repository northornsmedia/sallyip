import fs from 'fs';

const buf = fs.readFileSync('./public/models/readyplayer.me.glb');
const jsonLen = buf.readUInt32LE(12);
const jsonStr = buf.toString('utf8', 20, 20 + jsonLen);
const gltf = JSON.parse(jsonStr);
console.log('Meshes count:', gltf.meshes?.length);
gltf.meshes.forEach((m, idx) => {
  console.log(`Mesh ${idx}: ${m.name}`);
  if (m.extras?.targetNames) {
    console.log('Target names sample:', m.extras.targetNames.slice(0, 20));
    console.log('Total target names:', m.extras.targetNames.length);
  } else if (m.primitives?.[0]?.targets) {
    console.log('Primitive targets count:', m.primitives[0].targets.length);
  }
});
if (gltf.nodes) {
  console.log('Node names sample:', gltf.nodes.map(n => n.name).slice(0, 20));
}
