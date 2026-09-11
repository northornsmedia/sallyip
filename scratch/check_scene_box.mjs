import fs from 'fs';
globalThis.self = globalThis;
globalThis.window = globalThis;
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const buf = fs.readFileSync('./public/models/sally_avatar.glb');
const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

const loader = new GLTFLoader();
loader.parse(arrayBuffer, '', (gltf) => {
  const scene = gltf.scene;
  const box = new THREE.Box3().setFromObject(scene);
  console.log('Scene bounding box min:', box.min, 'max:', box.max);
  const size = new THREE.Vector3();
  box.getSize(size);
  console.log('Scene size:', size);
  const center = new THREE.Vector3();
  box.getCenter(center);
  console.log('Scene center:', center);

  let headBone = null;
  scene.traverse(c => {
    if (c.name === 'Head') headBone = c;
  });
  if (headBone) {
    const worldPos = new THREE.Vector3();
    headBone.getWorldPosition(worldPos);
    console.log('Head bone world pos:', worldPos);
  }
});
