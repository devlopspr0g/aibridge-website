import * as THREE from "https://esm.sh/three@0.160.0";
const canvas = document.getElementById('brain-canvas');
if(canvas){
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, canvas.clientWidth/canvas.clientHeight, 0.1, 1000);
camera.position.z = 4;
const renderer = new THREE.WebGLRenderer({canvas, alpha:true, antialias:true});
renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
const geom = new THREE.BufferGeometry();
const pos = new Float32Array(1800*3);
const colors = new Float32Array(1800*3);
const palette = [[128,82,255],[255,184,41],[21,132,110],[255,80,200],[80,180,255]].map(c=>c.map(v=>v/255));
for(let i=0;i<1800;i++){
  const theta = Math.random()*Math.PI*2;
  const phi = Math.acos(2*Math.random()-1);
  const r = 1.2 + Math.random()*0.8;
  pos[i*3]=r*Math.sin(phi)*Math.cos(theta);
  pos[i*3+1]=r*Math.sin(phi)*Math.sin(theta)*0.7;
  pos[i*3+2]=r*Math.cos(phi);
  const col = palette[Math.floor(Math.random()*palette.length)];
  colors[i*3]=col[0]; colors[i*3+1]=col[1]; colors[i*3+2]=col[2];
}
geom.setAttribute('position', new THREE.BufferAttribute(pos,3));
geom.setAttribute('color', new THREE.BufferAttribute(colors,3));
const mat = new THREE.PointsMaterial({size:0.025, vertexColors:true, transparent:true});
scene.add(new THREE.Points(geom, mat));
let mx=0,my=0;
window.addEventListener('mousemove', e=>{ mx=(e.clientX/window.innerWidth-0.5)*0.5; my=(e.clientY/window.innerHeight-0.5)*0.5; });
(function animate(){
  requestAnimationFrame(animate);
  scene.children[0].rotation.y+=0.002+mx*0.01;
  scene.children[0].rotation.x+=0.0005+my*0.01;
  renderer.render(scene,camera);
})();
}
