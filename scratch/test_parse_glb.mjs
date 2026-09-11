import fs from 'fs';
globalThis.self = globalThis;
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const buf = fs.readFileSync('./public/models/sally_avatar.glb');
const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

const loader = new GLTFLoader();
console.log('Loader instantiated successfully');
