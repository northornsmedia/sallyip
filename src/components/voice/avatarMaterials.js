/**
 * avatarMaterials.js
 *
 * All photoreal PBR material recipes for Sally's Three.js avatar, in one
 * sensible place. The canvas component handles scene + animation;
 * this module answers only "what does each surface look like?".
 */
import * as THREE from 'three';

export function createSkinPoreTexture(size = 128, repeat = 14) {
  try {
    const cvs = document.createElement('canvas');
    cvs.width = size;
    cvs.height = size;
    const c = cvs.getContext('2d');
    const imgData = c.createImageData(size, size);
    const d = imgData.data;
    for (let i = 0; i < size * size; i++) {
      const noiseX = (Math.random() - 0.5) * 22;
      const noiseY = (Math.random() - 0.5) * 22;
      const idx = i * 4;
      d[idx] = 128 + noiseX;
      d[idx + 1] = 128 + noiseY;
      d[idx + 2] = 255;
      d[idx + 3] = 255;
    }
    c.putImageData(imgData, 0, 0);
    const tex = new THREE.CanvasTexture(cvs);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat, repeat);
    return tex;
  } catch {
    return null;
  }
}

/** Soft photographic skin: matte, warm, zero plastic shine. */
export function buildSkinMaterial(diffuseMap, poreNormalMap) {
  return new THREE.MeshPhysicalMaterial({
    map: diffuseMap || null,
    // Warm the albedo slightly so studio whites don't bleach her out.
    color: new THREE.Color(0xf6ddd0),
    roughness: 0.62,
    metalness: 0.0,
    clearcoat: 0.06,
    clearcoatRoughness: 0.6,
    sheen: 0.3,
    sheenRoughness: 0.65,
    sheenColor: new THREE.Color(0xffd9c7),
    normalMap: poreNormalMap || null,
    normalScale: new THREE.Vector2(0.14, 0.14),
    ior: 1.4,
  });
}

/**
 * Layered salon hair: satin sheen instead of plastic specular,
 * DoubleSide so thin strand cards never punch see-through holes.
 */
export function buildHairMaterial(diffuseMap) {
  return new THREE.MeshPhysicalMaterial({
    map: diffuseMap || null,
    // Neutral-warm tint: keeps her brunette instead of pushing copper.
    color: new THREE.Color(0xcfa894),
    roughness: 0.46,
    metalness: 0.0,
    clearcoat: 0.12,
    clearcoatRoughness: 0.55,
    sheen: 0.55,
    sheenRoughness: 0.5,
    sheenColor: new THREE.Color(0xc98a5e),
    side: THREE.DoubleSide,
  });
}

/** Wet cornea over a deep iris: tiny roughness, strong clearcoat. */
export function buildEyeMaterial(diffuseMap) {
  return new THREE.MeshPhysicalMaterial({
    map: diffuseMap || null,
    roughness: 0.03,
    metalness: 0.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    ior: 1.46,
  });
}

export function buildTeethMaterial(diffuseMap) {
  return new THREE.MeshStandardMaterial({
    map: diffuseMap || null,
    color: new THREE.Color(0xfdf6ee),
    roughness: 0.25,
    metalness: 0.0,
  });
}

export function buildClothMaterial(diffuseMap) {
  return new THREE.MeshStandardMaterial({
    map: diffuseMap || null,
    roughness: 0.9,
    metalness: 0.0,
  });
}

/**
 * Cinematic 3-point rig + sky bounce. Returns handles so the animation
 * loop can shift the rim color with conversation state (cool factor).
 */
export function buildStudioLights(scene) {
  const key = new THREE.DirectionalLight(0xfff1e2, 2.0);
  key.position.set(0.7, 2.5, 1.5);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xdbeafe, 1.1);
  fill.position.set(-0.8, 2.2, 1.2);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xa5b4fc, 1.5);
  rim.position.set(0, 2.4, -1.2);
  scene.add(rim);

  const chest = new THREE.DirectionalLight(0xfef3c7, 0.4);
  chest.position.set(0, 0.9, 1.0);
  scene.add(chest);

  const hemi = new THREE.HemisphereLight(0xe8eefc, 0x2a2118, 0.5);
  scene.add(hemi);

  const ambient = new THREE.AmbientLight(0xffffff, 0.85);
  scene.add(ambient);

  return { key, fill, rim, chest, hemi, ambient };
}

/** Rim glow color per conversation state — the "she's alive" cue. */
export const RIM_STATE_COLORS = {
  speaking: new THREE.Color(0x818cf8),
  listening: new THREE.Color(0x34d399),
  thinking: new THREE.Color(0xf59e0b),
  idle: new THREE.Color(0xa5b4fc),
};

export function resolveRimColor(state, VOICE_STATES) {
  if (state === VOICE_STATES.SPEAKING) return RIM_STATE_COLORS.speaking;
  if (state === VOICE_STATES.LISTENING) return RIM_STATE_COLORS.listening;
  if (state === VOICE_STATES.THINKING) return RIM_STATE_COLORS.thinking;
  return RIM_STATE_COLORS.idle;
}
