import * as THREE from 'three';

const canvas = document.getElementById('brain-canvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(65, canvas.clientWidth / 600, 0.1, 1000);
camera.position.set(0, 0, 3.0);

const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setSize(canvas.clientWidth, 600);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// ---- Brain + Noise ----
const count = 9000;
const geo = new THREE.BufferGeometry();
const pos = new Float32Array(count * 3);
const colors = new Float32Array(count * 3);
const brainPos = new Float32Array(count * 3);
const noisePos = new Float32Array(count * 3);

const palette = [
  new THREE.Color(0xffb829),
  new THREE.Color(0x8052ff),
  new THREE.Color(0xffffff),
  new THREE.Color(0xffd23f),
  new THREE.Color(0x8a5cff),
];

for (let i = 0; i < count; i++) {
  const i3 = i * 3;
  // BRAIN SHAPE - Dala accurate (elongated)
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.random() * Math.PI;
  const r = 1.05 + Math.sin(theta * 5) * 0.12 + (Math.random()-0.5)*0.15;

  let x = r * Math.sin(phi) * Math.cos(theta) * 1.0;
  let y = r * Math.sin(phi) * Math.sin(theta) * 0.65;
  let z = r * Math.cos(phi) * 0.55;
  if (Math.abs(x) < 0.13) x += x > 0 ? 0.2 : -0.2;

  brainPos[i3] = x;
  brainPos[i3+1] = y;
  brainPos[i3+2] = z;

  // NOISE CLOUD - scattered everywhere
  noisePos[i3] = (Math.random()-0.5) * 8;
  noisePos[i3+1] = (Math.random()-0.5) * 6;
  noisePos[i3+2] = (Math.random()-0.5) * 4;

  pos[i3] = x;
  pos[i3+1] = y;
  pos[i3+2] = z;

  const col = palette[Math.floor(Math.random()*palette.length)];
  colors[i3]=col.r; colors[i3+1]=col.g; colors[i3+2]=col.b;
}

geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

const mat = new THREE.PointsMaterial({
  size: 0.022,
  vertexColors: true,
  transparent: true,
  opacity: 0.95,
  sizeAttenuation: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});

const brain = new THREE.Points(geo, mat);
scene.add(brain);

// Mouse control like Dala video
let targetMix = 0; // 0 = brain, 1 = noise
let currentMix = 0;

window.addEventListener('mousemove', (e) => {
  const y = e.clientY / window.innerHeight;
  // Cursor UP (y < 0.4) = noise mode, DOWN = brain mode
  targetMix = 1 - y; // top = 1, bottom = 0
  targetMix = Math.pow(targetMix, 1.5) * 1.2; // make top more sensitive
});

window.addEventListener('touchmove', (e) => {
  const y = e.touches[0].clientY / window.innerHeight;
  targetMix = 1 - y;
});

function animate() {
  requestAnimationFrame(animate);
  currentMix += (targetMix - currentMix) * 0.03; // smooth lerp
  currentMix = Math.max(0, Math.min(1, currentMix));

  const positions = geo.attributes.position.array;
  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    positions[i3] = brainPos[i3] * (1-currentMix) + noisePos[i3] * currentMix;
    positions[i3+1] = brainPos[i3+1] * (1-currentMix) + noisePos[i3+1] * currentMix;
    positions[i3+2] = brainPos[i3+2] * (1-currentMix) + noisePos[i3+2] * currentMix;
  }
  geo.attributes.position.needsUpdate = true;

  brain.rotation.y += 0.001 + currentMix * 0.002;
  brain.rotation.x = Math.sin(Date.now()*0.0002)*0.15;
  if (currentMix < 0.2) {
    brain.position.y = Math.sin(Date.now()*0.0004)*0.12;
  }

  renderer.render(scene, camera);
}
animate();
