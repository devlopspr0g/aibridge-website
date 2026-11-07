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

const BULB_LIGHT_POS = [0, 0.5, 0];
const BULB_LIGHT_INTENSITY = 2;

/** Bulb glass radius before the (1 + y * 0.2) flare: bulbous top. */
function bulbRadius(y) {
  const k = (y - 0.4) / 0.8;
  return 0.7 * Math.sqrt(Math.max(0, 1 - k * k));
}

/**
 * Point on a light bulb (y up).
 * Bottom 30% of particles: screw — cylinder r 0.15, h 0.4, centred at y -0.8.
 * Top 70%: glass — y in [-0.3, 1.1], radius = 0.7 * sqrt(1 - ((y - 0.4) / 0.8)^2),
 * flared by (1 + y * 0.2). A small top cap and neck close the openings the
 * formula leaves at y = 1.1 and between glass and screw.
 */
function bulbPoint(i, out) {
  const angle = Math.random() * Math.PI * 2;
  if (i % 10 < 3) {
    const y = -0.8 + (Math.random() - 0.5) * 0.4;
    const r = 0.15;
    out[0] = Math.cos(angle) * r;
    out[1] = y;
    out[2] = Math.sin(angle) * r;
    return;
  }
  const roll = Math.random();
  if (roll < 0.08) {
    // top cap: shallow dome over the opening at y = 1.1
    const edge = bulbRadius(1.1) * (1 + 1.1 * 0.2);
    const rho = edge * Math.sqrt(Math.random());
    out[0] = Math.cos(angle) * rho;
    out[1] = 1.1 + 0.1 * (1 - (rho / edge) ** 2);
    out[2] = Math.sin(angle) * rho;
    return;
  }
  if (roll < 0.15) {
    // neck: taper from the glass (y -0.3) down to the screw top (y -0.6)
    const h = Math.random();
    const top = bulbRadius(-0.3) * (1 - 0.3 * 0.2);
    const r = 0.15 + (top - 0.15) * h;
    out[0] = Math.cos(angle) * r;
    out[1] = -0.6 + h * 0.3;
    out[2] = Math.sin(angle) * r;
    return;
  }
  // glass wall, sampled proportionally to radius so density stays even
  let y = 0, radius = 0;
  for (let k = 0; k < 20; k++) {
    y = -0.3 + Math.random() * 1.4;
    radius = bulbRadius(y);
    if (Math.random() * 0.7 < radius) break;
  }
  out[0] = Math.cos(angle) * radius * (1 + y * 0.2);
  out[1] = y;
  out[2] = Math.sin(angle) * radius * (1 + y * 0.2);
}

function smoothstep(t) {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/**
 * Scroll progress (0..1) -> how scattered the particles are and which shape they
 * gather into. 0 = brain, 0.5 = noise cloud, 1 = bulb.
 * @param {number} p
 * @returns {{ scatter: number, form: number }}
 */
export function scrollPhase(p) {
  const scatter = p < 0.5 ? smoothstep(p / 0.5) : smoothstep((1 - p) / 0.5);
  const form = smoothstep((p - 0.47) / 0.06); // swap target while fully scattered
  return { scatter, form };
}

/**
 * Which side of the screen the shape sits on as the page scrolls (wide screens):
 * 1 = right, -1 = left, 0 = centre. Matches the page's text sections.
 * @param {number} p scroll progress 0..1
 */
export function sideCurve(p) {
  const keys = [
    [0, 1],
    [0.2, -1],
    [0.4, 0],
    [0.8, 0],
    [1, 1],
  ];
  for (let k = 1; k < keys.length; k++) {
    const [p1, v1] = keys[k];
    const [p0, v0] = keys[k - 1];
    if (p <= p1) return v0 + (v1 - v0) * smoothstep((p - p0) / (p1 - p0));
  }
  return 1;
}

/**
 * Start the brain hero on a canvas.
 * Page scroll 0% = brain, 50% = noise cloud, 100% = light bulb.
 * Mouse Y still scatters whatever shape is showing (top = noise).
 * @param {HTMLCanvasElement} canvas
 * @returns {() => void} dispose
 */
export function initBrain(canvas) {
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
  const bulb = new Float32Array(COUNT * 3);
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
    const kind = r < COUNT * 0.4 ? 0 : r < COUNT * 0.7 ? 1 : 2; // gold, violet, white
    c.set(kind === 0 ? GOLD : kind === 1 ? VIOLET : WHITE);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  for (let i = 0; i < COUNT; i++) {
    bulbPoint(i, tmp);
    bulb[i * 3] = tmp[0];
    bulb[i * 3 + 1] = tmp[1];
    bulb[i * 3 + 2] = tmp[2];
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

  // soft warm glow that switches on once the bulb has formed
  const glowCanvas = document.createElement("canvas");
  glowCanvas.width = glowCanvas.height = 128;
  const gg = glowCanvas.getContext("2d");
  const grad = gg.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,184,41,1)");
  grad.addColorStop(0.35, "rgba(255,184,41,0.35)");
  grad.addColorStop(1, "rgba(255,184,41,0)");
  gg.fillStyle = grad;
  gg.fillRect(0, 0, 128, 128);
  const glowTex = new THREE.CanvasTexture(glowCanvas);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  const glowMat = new THREE.SpriteMaterial({
    map: glowTex,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const glow = new THREE.Sprite(glowMat);
  glow.scale.setScalar(2.4);
  glow.position.set(...BULB_LIGHT_POS);

  // point light inside the bulb (0 until the bulb forms)
  const bulbLight = new THREE.PointLight(GOLD, 0, 4, 2);
  bulbLight.position.set(...BULB_LIGHT_POS);

  const group = new THREE.Group();
  group.add(glow);
  group.add(bulbLight);
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
  let scrollP = 0; // 0..1 page scroll progress
  const onPointer = (clientY) => {
    mouseMix = smoothstep(1 - clientY / window.innerHeight);
  };
  const onMouse = (e) => onPointer(e.clientY);
  const onTouch = (e) => e.touches[0] && onPointer(e.touches[0].clientY);
  const onScroll = () => {
    const span = document.documentElement.scrollHeight - window.innerHeight;
    scrollP = span > 0 ? Math.min(1, Math.max(0, window.scrollY / span)) : 0;
  };
  window.addEventListener("mousemove", onMouse, { passive: true });
  window.addEventListener("touchmove", onTouch, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ---------- layout ----------
  let sideX = 0, baseY = -0.06, wide = true;
  let curX = 0, curY = 0;
  const resize = () => {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const visH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const visW = visH * camera.aspect;
    if (w >= 768) {
      wide = true;
      sideX = visW * 0.2;
      baseY = -0.06;
      group.scale.setScalar(Math.min(0.68, (visW * 0.5) / 3.6));
      mat.size = POINT_SIZE;
    } else {
      wide = false;
      sideX = 0;
      baseY = -0.25;
      const sc = Math.min(0.68, (visW * 0.95) / 3.6);
      group.scale.setScalar(sc);
      mat.size = POINT_SIZE * Math.max(0.6, sc / 0.68); // keep density readable on phones
    }
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();
  curX = wide ? sideX * sideCurve(scrollP) : 0;
  curY = baseY;

  // ---------- loop ----------
  const clock = new THREE.Clock();
  let raf = 0;
  let first = true;
  const tick = () => {
    raf = requestAnimationFrame(tick);
    const t = clock.getElapsedTime();
    // Scroll: 0% brain -> 50% noise -> 100% bulb (smoothstep each half)
    const { scatter: scrollScatter, form } = scrollPhase(scrollP);
    const mix = Math.max(mouseMix, scrollScatter);
    const lit = (1 - mix) * form; // 1 once the bulb has formed
    const pulse = 0.9 + Math.sin(t * 2) * 0.1;
    glowMat.opacity += (lit * 0.45 * pulse - glowMat.opacity) * 0.05;
    bulbLight.intensity += (lit * BULB_LIGHT_INTENSITY * pulse - bulbLight.intensity) * 0.05;

    for (let i = 0; i < COUNT; i++) {
      const m = smoothstep((mix - stagger[i] * 0.4) / 0.6);
      const j = i * 3;
      const sx = brain[j] + (bulb[j] - brain[j]) * form;
      const sy = brain[j + 1] + (bulb[j + 1] - brain[j + 1]) * form;
      const sz = brain[j + 2] + (bulb[j + 2] - brain[j + 2]) * form;
      const tx = sx + (noise[j] - sx) * m;
      const ty = sy + (noise[j + 1] - sy) * m;
      const tz = sz + (noise[j + 2] - sz) * m;
      pos[j] += (tx - pos[j]) * LERP;
      pos[j + 1] += (ty - pos[j + 1]) * LERP;
      pos[j + 2] += (tz - pos[j + 2]) * LERP;
    }
    posAttr.needsUpdate = true;

    group.rotation.y += ROT_SPEED;
    // follow the page: slide between sides; on phones drop below the first headline only
    const tx = wide ? sideX * sideCurve(scrollP) : 0;
    const ty = wide ? baseY : baseY * (1 - smoothstep(scrollP / 0.12));
    curX += (tx - curX) * 0.04;
    curY += (ty - curY) * 0.04;
    group.position.set(curX, curY + Math.sin(t) * FLOAT_AMP, 0);

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
    glowTex.dispose();
    glowMat.dispose();
    triGeo.dispose();
    triMats.forEach((m) => m.dispose());
    renderer.dispose();
  };
}
