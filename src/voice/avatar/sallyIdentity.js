/**
 * sallyIdentity.js
 * 
 * Sally IP Identity Definition & Precomputed Assets.
 * 
 * Strict architectural separation:
 * 1. GEOMETRIC METADATA: Bounding boxes, canvas dimensions, facial landmark anchors.
 * 2. NEURAL IDENTITY CONFIG: Wav2Lip-specific 6-channel reference tensor specifications [1, 6, 96, 96].
 */

export const SALLY_IDENTITY_VERSION = '2026.1.0';

// -------------------------------------------------------------
// 1. GEOMETRIC METADATA (Widescreen 16:9 Executive Stage)
// -------------------------------------------------------------
export const SALLY_16_9_STAGE_CONFIG = {
  frameWidth: 1376,
  frameHeight: 768,
  aspectRatio: '16:9',
  imagePath: '/images/sally_video_call_stage_16_9.jpg',

  // Center of Sally's mouth in 1376x768 video call composition
  mouthCenter: { x: 698, y: 335 },
  
  // 112x112 box centered on mouth (698 - 56 = 642, 335 - 56 = 279)
  cropBox: {
    x: 642,
    y: 279,
    width: 112,
    height: 112,
  },

  // Landmarks in 1376x768
  eyes: {
    leftPupil: { x: 662, y: 246 },
    rightPupil: { x: 736, y: 246 },
    eyeWidth: 28,
    eyeHeight: 16,
  },

  // Framing metrics
  framing: {
    sallyVerticalOccupancy: 0.55, // ~55% of vertical frame height
    headTopY: 96,
    chinY: 384,
    shouldersY: 460,
    cameraAngle: 'eye-level',
    background: 'corporate law library with bookshelf and skyline window',
  },
};

export const SALLY_GEOMETRIC_METADATA = {
  frameWidth: 1376,
  frameHeight: 768,
  aspectRatio: '16:9',
  stage: SALLY_16_9_STAGE_CONFIG,

  // Facial anchor points
  anchors: {
    eyesCenter: { x: 698, y: 246 },
    noseTip: { x: 698, y: 288 },
    mouthCenter: { x: 698, y: 335 },
  },

  // Landmarks for reference alignment
  landmarks: {
    upperLipTop: { x: 698, y: 320 },
    lowerLipBottom: { x: 698, y: 352 },
    mouthLeft: { x: 666, y: 335 },
    mouthRight: { x: 730, y: 335 },
    chinBottom: { x: 698, y: 384 },
  },
};

// -------------------------------------------------------------
// 2. NEURAL IDENTITY SPECIFICATION (Wav2Lip)
// -------------------------------------------------------------
export const SALLY_NEURAL_IDENTITY_CONFIG = {
  modelArchitecture: 'Wav2Lip Generator ONNX',
  modelPath: '/models/sally/wav2lip.onnx',
  patchResolution: 96, // Canonical 96x96 input/output
  
  // Crop window in 1376x768 stage mapped to 96x96
  cropBox: SALLY_16_9_STAGE_CONFIG.cropBox,

  // Expected tensor layout
  tensors: {
    melInput: {
      name: 'mel',
      shape: [1, 1, 80, 16],
      dtype: 'float32',
      description: '80-channel log-Mel spectrogram across 16 temporal steps (~160ms)',
    },
    vidInput: {
      name: 'vid',
      shape: [1, 6, 96, 96],
      dtype: 'float32',
      description: '6-channel tensor: [0..2] reference face RGB, [3..5] lower-half masked face RGB (y >= 48 zeroed)',
    },
    genOutput: {
      name: 'gen',
      shape: [1, 3, 96, 96],
      dtype: 'float32',
      range: [0.0, 1.0],
      description: 'Synthesized RGB lower-face patch',
    },
  },
};

// Backward-compatible alias for existing unit tests
export const SALLY_CANONICAL_GEOMETRY = {
  frameWidth: 512,
  frameHeight: 512,
  aspectRatio: '1:1',
  eyesCenter: { x: 256, y: 210 },
  noseTip: { x: 256, y: 275 },
  mouthCenter: { x: 256, y: 352 },
  lowerFacePatch: {
    ultra: { x: 176, y: 272, width: 160, height: 160 },
    high: { x: 192, y: 288, width: 128, height: 128 },
    medium: { x: 208, y: 304, width: 96, height: 96 },
  },
};

/**
 * Generate elliptical feather blending mask for 96x96 patch
 */
export function createSallyBlendingMask(width = 96, height = 96) {
  let canvas;
  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(width, height);
  } else if (typeof document !== 'undefined') {
    canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
  } else {
    // Array fallback
    const mask = new Float32Array(width * height);
    const cx = width / 2;
    const cy = height / 2;
    const rx = width * 0.46;
    const ry = height * 0.44;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= 0.60) {
          mask[y * width + x] = 1.0;
        } else if (dist >= 1.0) {
          mask[y * width + x] = 0.0;
        } else {
          const t = (dist - 0.60) / 0.40;
          mask[y * width + x] = 0.5 * (1.0 + Math.cos(t * Math.PI));
        }
      }
    }
    return { type: 'array', data: mask, width, height };
  }

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);

  const cx = width / 2;
  const cy = height / 2;
  const gradient = ctx.createRadialGradient(cx, cy, width * 0.25, cx, cy, width * 0.48);
  gradient.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  gradient.addColorStop(0.65, 'rgba(255, 255, 255, 0.95)');
  gradient.addColorStop(0.85, 'rgba(255, 255, 255, 0.45)');
  gradient.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(cx, cy, width * 0.46, height * 0.44, 0, 0, 2 * Math.PI);
  ctx.fill();

  return { type: 'canvas', canvas, width, height };
}

export const SALLY_VIDEO_ASSETS = {
  listening: '/videos/sally_real_listening.mp4',
  speaking: '/videos/sally_real_speaking.mp4',
  avatarImage: '/images/sally_human_avatar.jpg',
};
