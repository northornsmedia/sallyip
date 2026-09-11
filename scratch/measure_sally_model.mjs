import fs from 'fs';

const buf = fs.readFileSync('./public/models/sally_avatar.glb');
const jsonLen = buf.readUInt32LE(12);
const jsonStr = buf.toString('utf8', 20, 20 + jsonLen);
const gltf = JSON.parse(jsonStr);

// Find nodes
console.log('Nodes:');
gltf.nodes?.forEach((node, idx) => {
  if (['Head', 'Neck', 'Spine', 'Hips', 'LeftEye', 'RightEye'].includes(node.name)) {
    console.log(` Node ${idx} (${node.name}): translation:`, node.translation, 'rotation:', node.rotation);
  }
});

// Find accessors min/max for positions
gltf.meshes?.forEach((mesh) => {
  mesh.primitives?.forEach((prim) => {
    const posAccessorIdx = prim.attributes?.POSITION;
    if (posAccessorIdx !== undefined) {
      const acc = gltf.accessors[posAccessorIdx];
      console.log(` Mesh: ${mesh.name}, POS min:`, acc.min, 'max:', acc.max);
    }
  });
});
