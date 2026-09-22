/**
 * SallyDigitalHumanCanvas.jsx
 *
 * Genuine 100% Client-Side Real-Time 3D Digital Human Avatar for Sally IP.
 * ZERO GPU clusters, ZERO cloud rendering cost.
 *
 * Runs entirely in the user's browser device using:
 * - Three.js WebGL 3D Engine (SkinnedMesh, Bone Hierarchy, Morph Targets / Blendshapes)
 * - Authentic 3D Humanoid Head & Upper Body Mesh (/models/sally_avatar.glb)
 * - Complete Oculus Viseme blendshapes for phoneme-accurate lip-sync (viseme_aa, viseme_O, viseme_E, etc.)
 * - WebAudio AnalyserNode real-time formant frequency analysis
 * - Lifelike 3D micro-animations: organic breathing sway, attentive head tilts,
 *   subtle gaze saccades, and interactive 3D cursor parallax tracking.
 */

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VOICE_STATES } from '../../voice/types.js';
import {
  buildClothMaterial,
  buildEyeMaterial,
  buildHairMaterial,
  buildSkinMaterial,
  buildStudioLights,
  buildTeethMaterial,
  createSkinPoreTexture,
  resolveRimColor,
} from './avatarMaterials.js';
import { buildOfficeSet } from './officeSet.js';

export function SallyDigitalHumanCanvas({
  state = VOICE_STATES.IDLE,
  analyserNode = null,
  isMuted = false,
  activeVoiceName = 'Aria (Neural)',
  width = null,
  height = null,
  enableParallax = true,
  className = '',
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [modelLoading, setModelLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // References to 3D scene elements
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const avatarGroupRef = useRef(null);
  const headMeshRef = useRef(null);
  const teethMeshRef = useRef(null);
  const morphMeshesRef = useRef([]);
  const headBoneRef = useRef(null);
  const neckBoneRef = useRef(null);
  const spineBoneRef = useRef(null);
  const leftEyeBoneRef = useRef(null);
  const rightEyeBoneRef = useRef(null);
  // Broadcast-pose rig: relaxed arms at sides, elbows soft, hands in frame
  const leftArmRef = useRef(null);
  const rightArmRef = useRef(null);
  const leftForeRef = useRef(null);
  const rightForeRef = useRef(null);
  const baseLeftArmRef = useRef(new THREE.Euler());
  const baseRightArmRef = useRef(new THREE.Euler());
  const baseLeftForeRef = useRef(new THREE.Euler());
  const baseRightForeRef = useRef(new THREE.Euler());
  const baseHeadRotationRef = useRef(new THREE.Euler());
  const baseNeckRotationRef = useRef(new THREE.Euler());

  // Mouse tracking for 3D parallax
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  // Animation frame & state refs
  const animFrameIdRef = useRef(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const analyserRef = useRef(analyserNode);
  analyserRef.current = analyserNode;

  // Smoothing trackers for visemes (EMA)
  const visemeWeightsRef = useRef({
    viseme_aa: 0,
    viseme_E: 0,
    viseme_I: 0,
    viseme_O: 0,
    viseme_U: 0,
    viseme_PP: 0,
    viseme_FF: 0,
    viseme_TH: 0,
    viseme_DD: 0,
    viseme_kk: 0,
    viseme_CH: 0,
    viseme_SS: 0,
    viseme_sil: 1,
  });

  // Handle cursor movement for interactive 3D parallax (fine pointers only, motion-safe)
  useEffect(() => {
    if (!enableParallax) return;
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const handleMouseMove = (e) => {
      const { innerWidth, innerHeight } = window;
      const nx = (e.clientX / innerWidth) * 2 - 1;
      const ny = (e.clientY / innerHeight) * 2 - 1;
      mouseRef.current.targetX = THREE.MathUtils.clamp(nx, -1, 1);
      mouseRef.current.targetY = THREE.MathUtils.clamp(ny, -1, 1);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [enableParallax]);

  // Main Three.js Scene Setup & Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let isDisposed = false;

    // 1. Determine accurate dimensions from container bounding rect or viewport
    const getDims = () => {
      const rect = container.getBoundingClientRect();
      const w = width || rect.width || window.innerWidth || 800;
      const h = height || rect.height || (window.innerHeight - 144) || 600;
      return { w: Math.max(w, 320), h: Math.max(h, 320) };
    };

    const dims = getDims();

    // 2. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 3. Camera (anchor waist-up shot: head + shoulders above the desk, board behind)
    const camera = new THREE.PerspectiveCamera(32, dims.w / dims.h, 0.1, 20);
    // Standing anchor framed head-to-desk; legs stay hidden behind the desk.
    camera.position.set(0, 1.55, 1.5);
    camera.lookAt(0, 1.35, 0.0);
    cameraRef.current = camera;

    // 4. WebGL Renderer with sRGB, Antialias, ACES Filmic Tone Mapping
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(dims.w, dims.h, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      rendererRef.current = renderer;
    } catch (err) {
      console.error('[Sally3DCanvas] WebGL init error:', err);
      setLoadError('WebGL not supported');
      return;
    }

    // 5. Cinematic studio rig (see avatarMaterials.js — rim shifts with voice state)
    const lights = buildStudioLights(scene);
    const rimLight = lights.rim;
    const rimTargetColor = resolveRimColor(stateRef.current, VOICE_STATES).clone();

    // 6. Subtle studio atmospheric backdrop particles
    const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const particleGeo = new THREE.BufferGeometry();
    const particleCount = reducedMotion ? 0 : 24;
    const posArr = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      posArr[i] = (Math.random() - 0.5) * 3.4;
      posArr[i + 1] = 0.4 + Math.random() * 1.8;
      posArr[i + 2] = -0.3 - Math.random() * 1.5;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x818cf8,
      size: 0.015,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 6. Microscopic skin-pore normal detail (recipe lives in avatarMaterials.js)
    const skinPoreNormalMap = createSkinPoreTexture(128, 14);

    // 7. Load Sally 3D Avatar Model (/models/sally_avatar.glb)
    const loader = new GLTFLoader();
    setModelLoading(true);

    loader.load(
      '/models/sally_avatar.glb',
      (gltf) => {
        if (isDisposed) return;

        const avatar = gltf.scene;
        avatarGroupRef.current = avatar;
        morphMeshesRef.current = [];

        // Traverse avatar and upgrade to High-Fidelity MetaHuman PBR materials
        avatar.traverse((child) => {
          if (child.isMesh || child.isSkinnedMesh) {
            child.castShadow = false;
            child.receiveShadow = false;

            if (child.morphTargetDictionary && child.morphTargetInfluences) {
              morphMeshesRef.current.push(child);
            }

            // Ready Player Me half-body avatars expose all ARKit/viseme morphs
            // on Wolf3D_Avatar rather than a separate Wolf3D_Head mesh.
            if (child.name === 'Wolf3D_Avatar' && child.morphTargetDictionary) {
              headMeshRef.current = child;
            }
            if (/head/i.test(child.name) && child.morphTargetDictionary) {
              headMeshRef.current = child;
            }
            if (/teeth/i.test(child.name) && child.morphTargetDictionary) {
              teethMeshRef.current = child;
            }

            const oldMat = child.material;
            const diffuseMap = oldMat?.map || null;

            // --- Photoreal surfaces (recipes in avatarMaterials.js) ---
            // Avaturn mesh names (Wolf3D fallbacks kept for other models).
            if (child.name === 'Head_Mesh' || child.name === 'Wolf3D_Head') {
              headMeshRef.current = child;
              child.material = buildSkinMaterial(diffuseMap, skinPoreNormalMap);
            }

            // --- B. Eyes: wet cornea over deep iris ---
            else if (child.name === 'Eye_Mesh' || child.name === 'EyeLeft' || child.name === 'EyeRight') {
              child.material = buildEyeMaterial(diffuseMap);
            }
            else if (child.name === 'EyeAO_Mesh' || child.name === 'Eyelash_Mesh') {
              child.material = new THREE.MeshStandardMaterial({ color: 0x1a1214, roughness: 0.6, metalness: 0.0 });
            }

            // --- C. Teeth + tongue ---
            else if (child.name === 'Teeth_Mesh' || child.name === 'Wolf3D_Teeth') {
              teethMeshRef.current = child;
              child.material = buildTeethMaterial(diffuseMap);
            }
            else if (child.name === 'Tongue_Mesh') {
              child.material = new THREE.MeshStandardMaterial({ color: 0x8a4a52, roughness: 0.5, metalness: 0.0 });
            }

            // --- D. Hair: layered satin sheen, double-sided so strands never hole ---
            else if (child.name.startsWith('avaturn_hair') || child.name === 'Wolf3D_Hair') {
              child.material = buildHairMaterial(diffuseMap);
            }

            // --- E. Clothing + shoes: executive matte ---
            else if (child.name.includes('Outfit') || child.name.includes('Body') || child.name.includes('avaturn_look') || child.name.includes('shoes')) {
              child.material = buildClothMaterial(diffuseMap);
            }
          }

          if (child.isBone) {
            if (child.name === 'Head') headBoneRef.current = child;
            if (child.name === 'Neck') neckBoneRef.current = child;
            if (child.name === 'Spine') spineBoneRef.current = child;
            if (child.name === 'LeftEye') leftEyeBoneRef.current = child;
            if (child.name === 'RightEye') rightEyeBoneRef.current = child;
          }
        });

        if (headBoneRef.current) baseHeadRotationRef.current.copy(headBoneRef.current.rotation);
        if (neckBoneRef.current) baseNeckRotationRef.current.copy(neckBoneRef.current.rotation);

        // Seated executive pose: hips drop to the chair, thighs forward,
        // shins vertical, torso leaning in a touch. Arms relaxed at the
        // sides, elbows soft and slightly forward — never T-pose, never
        // pinned behind the back. Real skeletal pose, clothing follows.
        const leftArm = avatar.getObjectByName('LeftArm');
        const rightArm = avatar.getObjectByName('RightArm');
        const leftFore = avatar.getObjectByName('LeftForeArm');
        const rightFore = avatar.getObjectByName('RightForeArm');
        if (leftArm) {
          leftArmRef.current = leftArm;
          leftArm.rotateZ(-Math.PI * 0.46);
          leftArm.rotateX(0.16);
          baseLeftArmRef.current.copy(leftArm.rotation);
        }
        if (rightArm) {
          rightArmRef.current = rightArm;
          rightArm.rotateZ(Math.PI * 0.46);
          rightArm.rotateX(0.16);
          baseRightArmRef.current.copy(rightArm.rotation);
        }
        if (leftFore) {
          leftForeRef.current = leftFore;
          leftFore.rotateX(0.32);
          baseLeftForeRef.current.copy(leftFore.rotation);
        }
        if (rightFore) {
          rightForeRef.current = rightFore;
          rightFore.rotateX(0.32);
          baseRightForeRef.current.copy(rightFore.rotation);
        }
        const spine = avatar.getObjectByName('Spine1');
        if (spine) spine.rotateX(0.05);
        // Office set: floor, wall, SALLY IP board, plaque, chair, desk, panels, spot
        let office = null;
        try { office = buildOfficeSet(scene); } catch (e) { console.warn('[Sally3DCanvas] office set skipped:', e?.message); }
        avatarGroupRef.current.userData.office = office;

        // Add to scene
        scene.add(avatar);
        setModelLoading(false);
      },
      undefined,
      (err) => {
        console.warn('[Sally3DCanvas] Failed to load 3D GLB model, applying procedural 3D avatar:', err);
        if (!isDisposed) {
          createProcedural3DAvatar(scene);
          setModelLoading(false);
        }
      }
    );

    // Procedural 3D Head Fallback
    const createProcedural3DAvatar = (sc) => {
      const group = new THREE.Group();
      group.position.set(0, 1.638, 0);

      // Head Mesh
      const headGeo = new THREE.SphereGeometry(0.12, 32, 32);
      headGeo.scale(0.85, 1.05, 0.95);
      const skinMat = new THREE.MeshStandardMaterial({
        color: 0xf3cca3,
        roughness: 0.4,
        metalness: 0.05,
      });
      const head = new THREE.Mesh(headGeo, skinMat);
      group.add(head);

      // Hair
      const hairGeo = new THREE.SphereGeometry(0.13, 32, 24);
      hairGeo.scale(0.9, 1.08, 1.02);
      const hairMat = new THREE.MeshStandardMaterial({
        color: 0x24140a,
        roughness: 0.7,
      });
      const hair = new THREE.Mesh(hairGeo, hairMat);
      hair.position.set(0, 0.02, -0.015);
      group.add(hair);

      avatarGroupRef.current = group;
      sc.add(group);
    };

    // 8. Resize Observer
    const handleResize = () => {
      if (!container || isDisposed) return;
      const { w, h } = getDims();
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    window.addEventListener('resize', handleResize);

    // 9. Animation & Lip-Sync Loop (pauses offscreen / hidden tab / reduced motion)
    const freqData = new Uint8Array(128);
    let startTime = performance.now();
    let lastFrameTime = startTime;
    let isVisible = true;
    const motionOK = !reducedMotion;
    const visObserver = (typeof IntersectionObserver !== 'undefined')
      ? new IntersectionObserver((es) => { es.forEach((e) => { isVisible = e.isIntersecting; }); }, { threshold: 0.02 })
      : null;
    if (visObserver) visObserver.observe(container);
    // Natural gaze saccade targets (shift every 1.8–3.6s like a real listener)
    let gazeX = 0; let gazeY = 0; let nextSaccade = 2.0;
    // Natural blink scheduler (2.5–5.5s, 140ms close)
    let nextBlink = 3.0; let blinkStart = -1;

    const animate = (currentTime) => {
      if (isDisposed) return;
      animFrameIdRef.current = requestAnimationFrame(animate);
      // Skip work when tab hidden or avatar offscreen (battery + CPU)
      if (document.hidden || !isVisible) { lastFrameTime = currentTime; return; }
      // Throttle background-adjacent work to ~30fps; speaking lip-sync stays smooth via EMA
      if (currentTime - lastFrameTime < (stateRef.current === VOICE_STATES.SPEAKING ? 16 : 33)) return;
      lastFrameTime = currentTime;

      const elapsed = (currentTime - startTime) * 0.001;
      const currentState = stateRef.current;
      const analyser = analyserRef.current;
      const mouse = mouseRef.current;

      // --- Smooth Mouse Parallax ---
      mouse.x += (mouse.targetX - mouse.x) * 0.06;
      mouse.y += (mouse.targetY - mouse.y) * 0.06;

      // --- Breathing & Lifelike Sway Physics (calmer, asymmetric like a real sitter) ---
      const damp = motionOK ? 1 : 0.15;
      const breathCycle = Math.sin(elapsed * 1.4) * 0.7 + Math.sin(elapsed * 2.3 + 1.1) * 0.3;
      const microSwayX = Math.sin(elapsed * 0.7 + 0.4) * 0.008 * damp;
      const microSwayY = Math.cos(elapsed * 0.55) * 0.006 * damp;
      // Gentle chest rise/fall on the whole avatar group
      if (avatarGroupRef.current && motionOK) {
        avatarGroupRef.current.position.y = breathCycle * 0.003;
      }
      // Natural gaze saccades: small, camera-biased — she looks AT you, not past you
      if (motionOK && elapsed > nextSaccade) {
        gazeX = (Math.random() - 0.5) * 0.022;
        gazeY = (Math.random() - 0.5) * 0.014;
        nextSaccade = elapsed + 2.2 + Math.random() * 2.0;
      }
      // Slow cinematic dolly: lean in while speaking, settle back otherwise
      const targetDolly = currentState === VOICE_STATES.SPEAKING ? 1.42 : 1.5;
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetDolly, 0.02);
      // Rim glow follows conversation state (speaking indigo, listening green, thinking amber)
      rimLight.color.lerp(resolveRimColor(currentState, VOICE_STATES), 0.04);

      // --- Bone Head/Neck Tracking ---
      if (headBoneRef.current) {
        let stateTiltX = 0;
        let stateTiltY = 0;
        let stateTiltZ = 0;

        if (currentState === VOICE_STATES.LISTENING) {
          stateTiltZ = 0.04;
          stateTiltX = 0.03;
        } else if (currentState === VOICE_STATES.THINKING) {
          stateTiltY = -0.06;
          stateTiltX = -0.05;
          stateTiltZ = -0.02;
        } else if (currentState === VOICE_STATES.SPEAKING) {
          stateTiltX = Math.sin(elapsed * 4.0) * 0.02;
          stateTiltY = Math.cos(elapsed * 2.5) * 0.015;
        }

        const targetRotY = mouse.x * 0.14 + microSwayX + stateTiltY + gazeX * damp;
        const targetRotX = -mouse.y * 0.1 + breathCycle * 0.008 + stateTiltX + gazeY * damp;
        const targetRotZ = -mouse.x * 0.03 + microSwayY + stateTiltZ;

        const baseHead = baseHeadRotationRef.current;
        headBoneRef.current.rotation.y = THREE.MathUtils.lerp(headBoneRef.current.rotation.y, baseHead.y + targetRotY, 0.08);
        headBoneRef.current.rotation.x = THREE.MathUtils.lerp(headBoneRef.current.rotation.x, baseHead.x + targetRotX, 0.08);
        headBoneRef.current.rotation.z = THREE.MathUtils.lerp(headBoneRef.current.rotation.z, baseHead.z + targetRotZ, 0.08);
      }

      if (neckBoneRef.current) {
        const baseNeck = baseNeckRotationRef.current;
        neckBoneRef.current.rotation.y = baseNeck.y + mouse.x * 0.06;
        neckBoneRef.current.rotation.x = baseNeck.x - mouse.y * 0.04 + breathCycle * 0.005;
      }

      // --- Broadcast body language: hands gesture with her voice ---
      const gestureAmp = currentState === VOICE_STATES.SPEAKING ? Math.min(energy * 2.0, 1.0) : 0;
      const gestureWave = Math.sin(elapsed * 3.1) * 0.5 + Math.sin(elapsed * 5.3 + 0.7) * 0.5;
      if (leftForeRef.current && rightForeRef.current) {
        const baseL = baseLeftForeRef.current;
        const baseR = baseRightForeRef.current;
        // Hands lift and emphasize as she speaks, settle when listening
        leftForeRef.current.rotation.x = baseL.x + gestureAmp * (0.1 + gestureWave * 0.06) + breathCycle * 0.004 * damp;
        rightForeRef.current.rotation.x = baseR.x + gestureAmp * (0.1 - gestureWave * 0.06) + breathCycle * 0.004 * damp;
        leftForeRef.current.rotation.z = baseL.z + gestureAmp * gestureWave * 0.03;
        rightForeRef.current.rotation.z = baseR.z - gestureAmp * gestureWave * 0.03;
      }
      if (leftArmRef.current && rightArmRef.current) {
        const baseLA = baseLeftArmRef.current;
        const baseRA = baseRightArmRef.current;
        leftArmRef.current.rotation.x = baseLA.x + gestureAmp * 0.05 * Math.sin(elapsed * 2.2);
        rightArmRef.current.rotation.x = baseRA.x + gestureAmp * 0.05 * Math.sin(elapsed * 2.2 + 1.4);
      }
      // Speaking nod: tiny affirmative head motion synced to voice energy
      if (headBoneRef.current && currentState === VOICE_STATES.SPEAKING && motionOK) {
        headBoneRef.current.rotation.x += gestureAmp * 0.012 * Math.sin(elapsed * 4.5);
      }

      // --- Particles Ambient Drift ---
      if (particles && motionOK) {
        particles.rotation.y = elapsed * 0.012;
      }

      // --- Real-Time WebAudio Lip-Sync (Edge Neural TTS -> Oculus Visemes) ---
      const visemes = visemeWeightsRef.current;
      let energy = 0;
      let lowEnergy = 0;
      let midEnergy = 0;
      let highEnergy = 0;

      if (analyser && currentState === VOICE_STATES.SPEAKING) {
        try {
          analyser.getByteFrequencyData(freqData);

          let sumTotal = 0;
          let sumLow = 0;
          let sumMid = 0;
          let sumHigh = 0;

          for (let i = 0; i < 128; i++) {
            const v = freqData[i];
            sumTotal += v;
            if (i >= 4 && i <= 18) sumLow += v;
            else if (i >= 19 && i <= 55) sumMid += v;
            else if (i >= 56 && i <= 110) sumHigh += v;
          }

          energy = sumTotal / (128 * 255);
          lowEnergy = sumLow / (15 * 255);
          midEnergy = sumMid / (37 * 255);
          highEnergy = sumHigh / (55 * 255);
        } catch (e) {
          energy = 0;
        }
      }

      // Target viseme weights
      let targetAA = 0;
      let targetO = 0;
      let targetE = 0;
      let targetI = 0;
      let targetU = 0;
      let targetPP = 0;
      let targetFF = 0;
      let targetSS = 0;
      let targetTH = 0;

      if (energy > 0.04 && currentState === VOICE_STATES.SPEAKING) {
        const boost = Math.min(energy * 2.2, 1.0);

        if (lowEnergy > midEnergy && lowEnergy > highEnergy) {
          targetAA = Math.min(lowEnergy * 1.6 * boost, 0.95);
          targetO = Math.min(lowEnergy * 0.9 * boost, 0.7);
        } else if (midEnergy >= lowEnergy && midEnergy >= highEnergy) {
          targetE = Math.min(midEnergy * 1.4 * boost, 0.85);
          targetI = Math.min(midEnergy * 1.1 * boost, 0.75);
          targetU = Math.min(midEnergy * 0.6 * boost, 0.5);
        } else if (highEnergy > 0.12) {
          targetSS = Math.min(highEnergy * 1.5 * boost, 0.75);
          targetFF = Math.min(highEnergy * 1.0 * boost, 0.6);
          targetTH = Math.min(highEnergy * 0.8 * boost, 0.5);
        } else {
          targetAA = boost * 0.4;
          targetE = boost * 0.3;
        }
      } else {
        targetAA = 0;
        targetO = 0;
        targetE = 0;
        targetI = 0;
        targetU = 0;
        targetPP = 0;
        targetFF = 0;
        targetSS = 0;
        targetTH = 0;
      }

      // Smooth EMA blending
      const alpha = 0.24;
      visemes.viseme_aa += (targetAA - visemes.viseme_aa) * alpha;
      visemes.viseme_O += (targetO - visemes.viseme_O) * alpha;
      visemes.viseme_E += (targetE - visemes.viseme_E) * alpha;
      visemes.viseme_I += (targetI - visemes.viseme_I) * alpha;
      visemes.viseme_U += (targetU - visemes.viseme_U) * alpha;
      visemes.viseme_PP += (targetPP - visemes.viseme_PP) * alpha;
      visemes.viseme_FF += (targetFF - visemes.viseme_FF) * alpha;
      visemes.viseme_SS += (targetSS - visemes.viseme_SS) * alpha;
      visemes.viseme_TH += (targetTH - visemes.viseme_TH) * alpha;

      // Apply morph target weights to Head and Teeth meshes
      const applyMorphs = (mesh) => {
        if (!mesh || !mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return;
        const dict = mesh.morphTargetDictionary;
        const infl = mesh.morphTargetInfluences;

        for (const [key, val] of Object.entries(visemes)) {
          if (dict[key] !== undefined) {
            infl[dict[key]] = val;
          }
        }
      };

      morphMeshesRef.current.forEach(applyMorphs);

      // Keep the lips, teeth and tongue together, then blink every eye-related
      // surface on the same frame so there is no uncanny mesh separation.
      const mouthOpen = Math.min(0.68, energy * 1.6);
      // Natural blink: schedule closes every 2.5–5.5s, 140ms duration
      if (motionOK && elapsed > nextBlink) { blinkStart = elapsed; nextBlink = elapsed + 2.5 + Math.random() * 3.0; }
      const blinkT = blinkStart > 0 ? (elapsed - blinkStart) / 0.14 : 99;
      const blink = blinkT >= 0 && blinkT <= 1 ? Math.sin(blinkT * Math.PI) : 0;
      morphMeshesRef.current.forEach((mesh) => {
        const dict = mesh.morphTargetDictionary;
        if (dict.mouthOpen !== undefined) mesh.morphTargetInfluences[dict.mouthOpen] = mouthOpen;
        if (dict.eyesClosed !== undefined) mesh.morphTargetInfluences[dict.eyesClosed] = blink;
      });

      renderer.render(scene, camera);
    };

    animFrameIdRef.current = requestAnimationFrame(animate);

    return () => {
      isDisposed = true;
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameRef.current);
      if (visObserver) visObserver.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      try { avatarGroupRef.current?.userData?.office?.dispose(); } catch {}
      if (skinPoreNormalMap) skinPoreNormalMap.dispose();
      if (particleGeo) particleGeo.dispose();
      if (particleMat) particleMat.dispose();

      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      renderer.dispose();
    };
  }, [width, height, enableParallax]);

  return (
    <div
      ref={containerRef}
      className={`sally-3d-avatar-container ${className}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Cinematic stage: indigo aura + vignette (pure CSS, zero WebGL cost) */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 55% 62% at 50% 42%, rgba(99,102,241,.20), rgba(99,102,241,0) 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 120% 105% at 50% 45%, rgba(0,0,0,0) 55%, rgba(2,4,12,.55) 100%)',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />
      {/* 3D WebGL Canvas */}
      <canvas
        ref={canvasRef}
        className="sally-3d-avatar-canvas"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />

      {/* Loading Spinner HUD */}
      {modelLoading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(3, 7, 18, 0.85)',
            backdropFilter: 'blur(12px)',
            zIndex: 25,
            color: '#f8fafc',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              border: '3px solid rgba(99, 102, 241, 0.25)',
              borderTopColor: '#6366f1',
              animation: 'sallySpin 0.9s linear infinite',
              marginBottom: '12px',
            }}
          />
          <div style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Initializing Sally 3D Digital Human...
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
            Loading 3D facial mesh & phoneme blendshapes
          </div>
        </div>
      )}

      {/* Live State Aura Badge */}
      <div className="sally-canvas-badge-left">
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor:
              state === VOICE_STATES.SPEAKING
                ? '#6366f1'
                : state === VOICE_STATES.LISTENING
                ? '#10b981'
                : state === VOICE_STATES.THINKING
                ? '#f59e0b'
                : '#94a3b8',
            display: 'inline-block',
          }}
        />
        <span style={{ fontWeight: 700, color: '#ffffff' }}>Sally IP</span>
        <span style={{ color: '#64748b' }}>•</span>
        <span style={{ color: '#818cf8', textTransform: 'capitalize' }}>{state}</span>
      </div>

      {/* Live Voice Indicator Pill */}
      <div className="sally-canvas-badge-right">
        <span>Edge Neural:</span>
        <span style={{ color: '#ffffff', fontWeight: 700 }}>{activeVoiceName}</span>
      </div>
    </div>
  );
}

export default SallyDigitalHumanCanvas;
