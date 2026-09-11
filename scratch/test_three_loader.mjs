import fs from 'fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

console.log('Three.js version:', THREE.REVISION);
console.log('GLTFLoader available:', typeof GLTFLoader === 'function');
