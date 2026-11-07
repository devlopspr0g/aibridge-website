// Particle brain hero — plain three.js ES module (three@0.160.0).
// Used by the app and shipped verbatim in the standalone export.
import * as THREE from "three";

const COUNT = 9000;
const GOLD = "#ffb829";
const VIOLET = "#8052ff";
const WHITE = "#ffffff";
const PALETTE = [GOLD, VIOLET, WHITE];

const POINT_SIZE = 0.022;
const LERP = 0.03; // per-particle smoothing toward target
const ROT_SPEED = 0.001; // y rotation per frame
const FLOAT_AMP = 0.12; // sin(time) * 0.12 breathing
const HEMI_GAP = 0.2; // gap between hemispheres
const FOLD = 0.12; // sin(theta * 5) * 0.12
const NOISE_RANGE = 4; // noise positions in [-4, 4]
const TRI_COUNT = 80;
const TRI_OPACITY = 0.15;

function triangleTexture() {
  const s = 64;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d");
  g.fillStyle = "#fff";
  g.beginPath();
  g.moveTo(s / 2, 4);
  g.lineTo(s - 4, s - 8);
  g.lineTo(4, s - 8);
  g.closePath();
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Point on the brain: two half-ellipsoids with a gap, folded surface, small stem. */
function brainPoint(i, out) {
  // ~4% of particles form the brain stem below the hemispheres.
  if (Math.random() < 0.035) {
    const a = Math.random() * Math.PI * 2;
    const h = Math.random();
    const r = 0.16 * (1 - h * 0.35) * Math.sqrt(Math.random());
    out[0] = Math.cos(a) * r;
    out[1] = -0.45 - h * 0.75;
    out[2] = -0.3 - h * 0.2 + Math.sin(a) * r;
    return;
  }
  const side = i % 2 === 0 ? 1 : -1;
  const u = Math.random() * 2 - 1;
  const a = Math.random() * Math.PI * 2;
  const k = Math.sqrt(1 - u * u);
  const dx = Math.abs(k * Math.cos(a));
  const dy = u;
  const dz = k * Math.sin(a);
  const theta = a; // azimuth around the vertical axis
  const phi = Math.acos(u); // polar angle
  const fold = 1 + Math.sin(theta * 5) * FOLD * Math.sin(phi) + Math.sin(phi * 9 + theta * 3) * 0.035;
  const shell = 1 - Math.pow(Math.random(), 3) * 0.28; // mostly on the surface
  const f = fold * shell;
  out[0] = side * (HEMI_GAP / 2 + dx * 0.95 * f);
  let y = dy * 1.22 * f;
  if (y < 0) y *= 0.8; // flatter underside
  out[1] = y + 0.15;
  out[2] = dz * 1.5 * f;
}

function smoothstep(t) {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/**
 * Start the brain hero on a canvas.
 * @param {HTMLCanvasElement} canvas
 * @param {{ scrollTarget?: HTMLElement | null }} [opts]
 * @returns {() => void} dispose
 */
export function initBrain(canvas, opts = {}) {
  const scrollTarget = opts.scrollTarget || null;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(23, 1, 0.1, 100);
  camera.position.set(0, 0, 5.5);

  // ---------- particles ----------
  const brain = new Float32Array(COUNT * 3);
  const noise = new Float32Array(COUNT * 3);
  const pos = new Float32Array(COUNT * 3);
  const colors = new Float32Array(COUNT * 3);
  const stagger = new Float32Array(COUNT);
  const tmp = [0, 0, 0];

  for (let i = 0; i < COUNT; i++) {
    brainPoint(i, tmp);
    brain[i * 3] = pos[i * 3] = tmp[0];
    brain[i * 3 + 1] = pos[i * 3 + 1] = tmp[1];
    brain[i * 3 + 2] = pos[i * 3 + 2] = tmp[2];
    noise[i * 3] = (Math.random() * 2 - 1) * NOISE_RANGE;
    noise[i * 3 + 1] = (Math.random() * 2 - 1) * NOISE_RANGE;
    noise[i * 3 + 2] = (Math.random() * 2 - 1) * NOISE_RANGE;
    // bottom of the brain lets go first, like the reference
    stagger[i] = ((tmp[1] + 1.6) / 3) * 0.5 + Math.random() * 0.5;
  }

  // Exact 40 / 30 / 30 split, clustered into soft regions across the surface.
  const order = Array.from({ length: COUNT }, (_, i) => i);
  const field = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    const x = brain[i * 3], y = brain[i * 3 + 1], z = brain[i * 3 + 2];
    field[i] =
      -y * 0.55 +
      Math.sin(z * 3.1 + x * 2.2) * 0.6 +
      Math.cos(y * 3.7 - z * 2.1) * 0.5 +
      Math.sin(x * 4.3 + y * 2.9 + z * 1.3) * 0.35 +
      (Math.random() - 0.5) * 1.6;
  }
  order.sort((a, b) => field[b] - field[a]);
  const c = new THREE.Color();
  for (let r = 0; r < COUNT; r++) {
    const i = order[r];
    const hex = r < COUNT * 0.4 ? GOLD : r < COUNT * 0.7 ? VIOLET : WHITE;
    c.set(hex);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  const geo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(pos, 3);
  posAttr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute("position", posAttr);
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const tex = triangleTexture();
  const mat = new THREE.PointsMaterial({
    size: POINT_SIZE,
    map: tex,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  // Make `size` a true world-space size (three's default ignores the camera fov),
  // so 0.022 reads as small triangles instead of 1px dots.
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      "gl_PointSize *= ( scale / - mvPosition.z );",
      "gl_PointSize *= ( projectionMatrix[1][1] * scale / - mvPosition.z );",
    );
  };
  const points = new THREE.Points(geo, mat);

  const group = new THREE.Group();
  group.add(points);
  group.rotation.set(0.08, Math.PI / 2, 0);
  scene.add(group);

  // ---------- floating wireframe triangles ----------
  const tris = [];
  const triGeo = new THREE.BufferGeometry();
  const tv = [];
  for (let k = 0; k < 3; k++) {
    const ang = (k / 3) * Math.PI * 2 + Math.PI / 2;
    tv.push(Math.cos(ang), Math.sin(ang), 0);
  }
  triGeo.setAttribute("position", new THREE.Float32BufferAttribute(tv, 3));
  const triMats = PALETTE.map(
    (col) =>
      new THREE.LineBasicMaterial({
        color: col,
        transparent: true,
        opacity: TRI_OPACITY,
        depthWrite: false,
      }),
  );
  for (let i = 0; i < TRI_COUNT; i++) {
    const m = new THREE.LineLoop(triGeo, triMats[i % 3]);
    const s = 0.025 + Math.random() * 0.09;
    m.scale.setScalar(s);
    m.position.set((Math.random() * 2 - 1) * 4.5, (Math.random() * 2 - 1) * 2.2, -3 + Math.random() * 4);
    m.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    m.userData = {
      v: new THREE.Vector3((Math.random() - 0.5) * 0.0012, 0.0005 + Math.random() * 0.001, 0),
      r: new THREE.Vector3((Math.random() - 0.5) * 0.01, (Math.random() - 0.5) * 0.01, (Math.random() - 0.5) * 0.01),
    };
    scene.add(m);
    tris.push(m);
  }

  // ---------- input ----------
  let mouseMix = 0; // 1 at top of screen, 0 at bottom
  let scrollMix = 0;
  const onPointer = (clientY) => {
    mouseMix = smoothstep(1 - clientY / window.innerHeight);
  };
  const onMouse = (e) => onPointer(e.clientY);
  const onTouch = (e) => e.touches[0] && onPointer(e.touches[0].clientY);
  const onScroll = () => {
    if (scrollTarget) {
      const r = scrollTarget.getBoundingClientRect();
      const span = Math.max(1, r.height - window.innerHeight);
      scrollMix = smoothstep(-r.top / span);
    } else {
      scrollMix = smoothstep(window.scrollY / Math.max(1, canvas.clientHeight));
    }
  };
  window.addEventListener("mousemove", onMouse, { passive: true });
  window.addEventListener("touchmove", onTouch, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ---------- layout ----------
  let baseX = 0, baseY = -0.06;
  const resize = () => {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const visH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const visW = visH * camera.aspect;
    if (w >= 768) {
      baseX = visW * 0.2;
      baseY = -0.06;
      group.scale.setScalar(Math.min(0.68, (visW * 0.5) / 3.6));
      mat.size = POINT_SIZE;
    } else {
      baseX = 0;
      baseY = -0.22;
      const sc = Math.min(0.68, (visW * 0.95) / 3.6);
      group.scale.setScalar(sc);
      mat.size = POINT_SIZE * Math.max(0.6, sc / 0.68); // keep density readable on phones
    }
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  // ---------- loop ----------
  const clock = new THREE.Clock();
  let raf = 0;
  let first = true;
  const tick = () => {
    raf = requestAnimationFrame(tick);
    const t = clock.getElapsedTime();
    const mix = Math.max(mouseMix, scrollMix);

    for (let i = 0; i < COUNT; i++) {
      const m = smoothstep((mix - stagger[i] * 0.4) / 0.6);
      const j = i * 3;
      const tx = brain[j] + (noise[j] - brain[j]) * m;
      const ty = brain[j + 1] + (noise[j + 1] - brain[j + 1]) * m;
      const tz = brain[j + 2] + (noise[j + 2] - brain[j + 2]) * m;
      pos[j] += (tx - pos[j]) * LERP;
      pos[j + 1] += (ty - pos[j + 1]) * LERP;
      pos[j + 2] += (tz - pos[j + 2]) * LERP;
    }
    posAttr.needsUpdate = true;

    group.rotation.y += ROT_SPEED;
    group.position.set(baseX, baseY + Math.sin(t) * FLOAT_AMP, 0);

    for (const m of tris) {
      m.position.add(m.userData.v);
      m.rotation.x += m.userData.r.x;
      m.rotation.y += m.userData.r.y;
      m.rotation.z += m.userData.r.z;
      if (m.position.y > 2.3) m.position.y = -2.3;
      if (m.position.x > 4.6) m.position.x = -4.6;
      if (m.position.x < -4.6) m.position.x = 4.6;
    }

    renderer.render(scene, camera);
    if (first) {
      first = false;
      canvas.setAttribute("data-scene-ready", "true");
    }
  };
  tick();

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    window.removeEventListener("mousemove", onMouse);
    window.removeEventListener("touchmove", onTouch);
    window.removeEventListener("scroll", onScroll);
    geo.dispose();
    mat.dispose();
    tex.dispose();
    triGeo.dispose();
    triMats.forEach((m) => m.dispose());
    renderer.dispose();
  };
}
