import * as THREE from 'three';

const canvas = document.getElementById('brain-canvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(65, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
camera.position.set(0, 0, 3.2);

const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setSize(canvas.clientWidth, 400);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// ---- Dala Brain Particles ----
const count = 6000;
const geo = new THREE.BufferGeometry();
const pos = new Float32Array(count * 3);
const colors = new Float32Array(count * 3);
const origPos = new Float32Array(count * 3);

const palette = [
  new THREE.Color(0xffb829), // saffron gold - Dala
  new THREE.Color(0x8052ff), // electric iris
  new THREE.Color(0xffffff), // white
  new THREE.Color(0x8a5cff), // light violet
  new THREE.Color(0x00ffd1), // cyan
  new THREE.Color(0xffd23f), // yellow
];

for (let i = 0; i < count; i++) {
  const i3 = i * 3;
  // Brain shape math - ellipsoid with two lobes
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.random() * Math.PI;
  const r = 1.1 + Math.sin(theta * 4) * 0.15 + Math.cos(phi * 3) * 0.1 + (Math.random()-0.5)*0.2;

  let x = r * Math.sin(phi) * Math.cos(theta) * 0.95;
  let y = r * Math.sin(phi) * Math.sin(theta) * 0.75;
  let z = r * Math.cos(phi) * 0.65;

  // Create hemisphere split
  if (Math.abs(x) < 0.12) x += x > 0 ? 0.18 : -0.18;

  pos[i3] = x;
  pos[i3+1] = y;
  pos[i3+2] = z;
  origPos[i3] = x;
  origPos[i3+1] = y;
  origPos[i3+2] = z;

  const col = palette[Math.floor(Math.random() * palette.length)];
  colors[i3] = col.r;
  colors[i3+1] = col.g;
  colors[i3+2] = col.b;
}

geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

const mat = new THREE.PointsMaterial({
  size: 0.018,
  vertexColors: true,
  transparent: true,
  opacity: 0.9,
  sizeAttenuation: true
});

const brain = new THREE.Points(geo, mat);
scene.add(brain);

// Floating triangles background
const triCount = 80;
for(let i=0;i<triCount;i++){
  const triGeo = new THREE.BufferGeometry();
  const triPos = new Float32Array([0,0,0, 0.08,0,0, 0,0.08,0]);
  triGeo.setAttribute('position', new THREE.BufferAttribute(triPos,3));
  const triMat = new THREE.MeshBasicMaterial({color: palette[i%palette.length], wireframe: true, transparent:true, opacity:0.15});
  const tri = new THREE.Mesh(triGeo, triMat);
  tri.position.set((Math.random()-0.5)*8, (Math.random()-0.5)*5, (Math.random()-0.5)*3);
  tri.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, 0);
  scene.add(tri);
}

let scrollY = 0;
window.addEventListener('scroll', () => {
  scrollY = window.scrollY / window.innerHeight;
});

function animate() {
  requestAnimationFrame(animate);
  const positions = geo.attributes.position.array;
  
  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const disperse = Math.min(scrollY * 2.5, 1.5);
    
    // Disperse on scroll like Dala video
    positions[i3] = origPos[i3] + (Math.random()-0.5) * disperse * 3;
    positions[i3+1] = origPos[i3+1] + (Math.random()-0.5) * disperse * 3;
    positions[i3+2] = origPos[i3+2] + (Math.random()-0.5) * disperse * 3;
  }
  geo.attributes.position.needsUpdate = true;

  brain.rotation.y += 0.0015;
  brain.rotation.x = Math.sin(Date.now()*0.0002)*0.15;
  brain.position.y = Math.sin(Date.now()*0.0004)*0.15;
  
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', ()=>{
  camera.aspect = canvas.clientWidth / canvas.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
});
