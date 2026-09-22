/**
 * officeSet.js
 *
 * Procedural partner-office set for Sally's video call: floor, back wall,
 * glass board with "SALLY IP", credential plaque, executive chair, ceiling
 * light panels and a warm key spot. All cheap primitives + CanvasTextures —
 * no external assets, disposed with the scene.
 */
import * as THREE from 'three';

function makeBoardTexture() {
  const cvs = document.createElement('canvas');
  cvs.width = 1024;
  cvs.height = 576;
  const c = cvs.getContext('2d');
  const grad = c.createLinearGradient(0, 0, 1024, 576);
  grad.addColorStop(0, '#141a38');
  grad.addColorStop(1, '#0b0e20');
  c.fillStyle = grad;
  c.fillRect(0, 0, 1024, 576);
  // faint grid
  c.strokeStyle = 'rgba(139,146,255,.08)';
  c.lineWidth = 1;
  for (let x = 64; x < 1024; x += 64) {
    c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 576); c.stroke();
  }
  for (let y = 64; y < 576; y += 64) {
    c.beginPath(); c.moveTo(0, y); c.lineTo(1024, y); c.stroke();
  }
  // title
  c.fillStyle = '#f2f3f8';
  c.font = '800 150px Inter, Arial, sans-serif';
  c.textBaseline = 'middle';
  c.fillText('SALLY IP', 72, 250);
  // accent bar
  c.fillStyle = '#6366f1';
  c.fillRect(76, 348, 300, 10);
  // subtitle
  c.fillStyle = '#a5b4fc';
  c.font = '600 44px Inter, Arial, sans-serif';
  c.fillText('AI COUNSEL — VERIFIED INTELLIGENCE', 74, 430);
  // corner ticks
  c.strokeStyle = 'rgba(165,166,255,.6)';
  c.lineWidth = 6;
  const tick = (x, y, dx, dy) => {
    c.beginPath(); c.moveTo(x + dx * 40, y); c.lineTo(x, y); c.lineTo(x, y + dy * 40); c.stroke();
  };
  tick(28, 28, 1, 1); tick(996, 28, -1, 1); tick(28, 548, 1, -1); tick(996, 548, -1, -1);
  const tex = new THREE.CanvasTexture(cvs);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function makePlaqueTexture() {
  const cvs = document.createElement('canvas');
  cvs.width = 512;
  cvs.height = 640;
  const c = cvs.getContext('2d');
  c.fillStyle = '#10142a';
  c.fillRect(0, 0, 512, 640);
  c.strokeStyle = '#8b92ff';
  c.lineWidth = 4;
  c.strokeRect(24, 24, 464, 592);
  c.fillStyle = '#f2f3f8';
  c.font = '800 120px Georgia, serif';
  c.textAlign = 'center';
  c.fillText('IP', 256, 220);
  c.fillStyle = '#a5b4fc';
  c.font = '600 34px Inter, Arial, sans-serif';
  c.fillText('PATENTS', 256, 330);
  c.fillText('TRADEMARKS', 256, 380);
  c.fillText('IP LITIGATION', 256, 430);
  c.fillStyle = '#5d6372';
  c.font = '500 28px Inter, Arial, sans-serif';
  c.fillText('EST. 2026', 256, 540);
  const tex = new THREE.CanvasTexture(cvs);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function buildOfficeSet(scene) {
  const disposables = [];
  const track = (obj) => {
    obj.traverse((o) => {
      if (o.geometry) disposables.push(o.geometry);
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => disposables.push(m));
    });
    return obj;
  };

  // Floor: dark executive carpet
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(7, 48),
    new THREE.MeshStandardMaterial({ color: 0x14161f, roughness: 0.95, metalness: 0.0 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  scene.add(track(floor));

  // Back wall
  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(9, 4),
    new THREE.MeshStandardMaterial({ color: 0x1a2033, roughness: 0.9, metalness: 0.0 })
  );
  wall.position.set(0, 2.0, -1.7);
  scene.add(track(wall));

  // Glass board with SALLY IP
  const boardTex = makeBoardTexture();
  disposables.push(boardTex);
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 0.84),
    new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.35, metalness: 0.1, emissive: 0xffffff, emissiveMap: boardTex, emissiveIntensity: 0.35 })
  );
  board.position.set(-1.08, 1.52, -1.62);
  scene.add(track(board));
  const boardFrame = new THREE.Mesh(
    new THREE.BoxGeometry(1.56, 0.9, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x8a8fa3, roughness: 0.35, metalness: 0.8 })
  );
  boardFrame.position.set(-1.08, 1.52, -1.65);
  scene.add(track(boardFrame));

  // Credential plaque (right side)
  const plaqueTex = makePlaqueTexture();
  disposables.push(plaqueTex);
  const plaque = new THREE.Mesh(
    new THREE.PlaneGeometry(0.46, 0.58),
    new THREE.MeshStandardMaterial({ map: plaqueTex, roughness: 0.5, metalness: 0.05 })
  );
  plaque.position.set(1.3, 1.66, -1.62);
  scene.add(track(plaque));

  // Executive chair she sits on
  const leather = new THREE.MeshStandardMaterial({ color: 0x171a26, roughness: 0.7, metalness: 0.05 });
  const chair = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.09, 0.52), leather);
  seat.position.set(0, 0.415, -0.03);
  chair.add(seat);
  const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.72, 0.09), leather);
  backrest.position.set(0, 0.86, -0.32);
  backrest.rotation.x = -0.1;
  chair.add(backrest);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.38, 12), new THREE.MeshStandardMaterial({ color: 0x3a3f52, roughness: 0.4, metalness: 0.8 }));
  post.position.set(0, 0.2, -0.03);
  chair.add(post);
  for (let i = 0; i < 5; i++) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.05), post.material);
    const a = (i / 5) * Math.PI * 2;
    leg.position.set(Math.cos(a) * 0.15, 0.03, -0.03 + Math.sin(a) * 0.15);
    leg.rotation.y = -a;
    chair.add(leg);
  }
  [-0.32, 0.32].forEach((x) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.4), leather);
    arm.position.set(x, 0.62, 0.0);
    chair.add(arm);
    const armPost = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.04), post.material);
    armPost.position.set(x, 0.51, -0.05);
    chair.add(armPost);
  });
  scene.add(track(chair));

  // Anchor desk: walnut top + modesty panel, hides everything below chest
  const walnut = new THREE.MeshStandardMaterial({ color: 0x2a2118, roughness: 0.55, metalness: 0.05 });
  const deskTop = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.05, 0.75), walnut);
  deskTop.position.set(0, 0.78, 0.42);
  scene.add(track(deskTop));
  const deskFront = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.72, 0.05), new THREE.MeshStandardMaterial({ color: 0x1d1712, roughness: 0.7, metalness: 0.0 }));
  deskFront.position.set(0, 0.4, 0.75);
  scene.add(track(deskFront));
  // Coffee mug with SALLY accent
  const mug = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.04, 0.1, 20),
    new THREE.MeshStandardMaterial({ color: 0xf2f3f5, roughness: 0.4, metalness: 0.0 })
  );
  mug.position.set(0.55, 0.86, 0.32);
  scene.add(track(mug));
  const mugBand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.046, 0.046, 0.03, 20),
    new THREE.MeshStandardMaterial({ color: 0x6366f1, roughness: 0.5, metalness: 0.0 })
  );
  mugBand.position.set(0.55, 0.86, 0.32);
  scene.add(track(mugBand));
  // Case-file papers
  const papers = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.025, 0.4),
    new THREE.MeshStandardMaterial({ color: 0xe8e6df, roughness: 0.9, metalness: 0.0 })
  );
  papers.position.set(-0.55, 0.82, 0.35);
  papers.rotation.y = 0.18;
  scene.add(track(papers));

  // Ceiling light panels (emissive look, no light calc cost)
  const panelMat = new THREE.MeshBasicMaterial({ color: 0xf4f1e4 });
  [[-0.9, 0.6], [0.9, 0.6]].forEach(([x, z]) => {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45), panelMat);
    panel.position.set(x, 3.1, z);
    panel.rotation.x = Math.PI / 2;
    scene.add(track(panel));
  });

  // Warm key spot from front-top for face modeling
  const spot = new THREE.SpotLight(0xfff0dd, 18, 12, 0.55, 0.7, 1.6);
  spot.position.set(0.8, 3.0, 1.9);
  spot.target.position.set(0, 1.05, 0);
  scene.add(spot);
  scene.add(spot.target);

  scene.fog = new THREE.Fog(0x0b0e1a, 4.5, 10);

  return { dispose: () => disposables.forEach((d) => d && d.dispose && d.dispose()) };
}
