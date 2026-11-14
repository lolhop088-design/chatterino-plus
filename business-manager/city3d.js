'use strict';
/* 3D-місто (Three.js r149, без модулів — працює з file:// у WebView).
   Оптимізовано для телефонів: статика склеєна в кілька мешів (одна текстура + кольори вершин),
   люди й машини — InstancedMesh, тіні лише в режимі «висока якість», обробка втрати WebGL-контексту. */
const City3D = (() => {
  const QKEY = 'biz3d_quality';
  const mobileUA = typeof navigator !== 'undefined' && /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  let quality = (() => { try { return localStorage.getItem(QKEY) || (mobileUA ? 'low' : 'high'); } catch (e) { return mobileUA ? 'low' : 'high'; } })();

  let renderer = null, scene, camera, raycaster, MAT, MAT_INST, winTex, winEmis;
  let container = null, onPick = null, onFail = null, raf = 0, lastT = 0, lastSync = 0, built = false, failed = false, lostCount = 0;
  const cam = { tx: 0, tz: 4, dist: 215, theta: Math.PI * 0.32, phi: 0.92 };
  const camGoal = { ...cam };
  const lotObjs = new Map();
  let sprites = [], pickables = [], selRing, hemi, sun, sky, dayF = 1;
  let peds = null, pedData = [], cars = null, carData = [], dummy;
  const disposables = [];

  const GAP = 64, ROADS = [-96, -32, 32, 96], WATER_Z = 104;
  const GRID = { park: [-1, -1], campus: [0, -1], hills: [1, -1], res: [-1, 0], center: [0, 0], biz: [1, 0], port: [-1, 1], river: [0, 1], industrial: [1, 1] };
  const bpos = (k) => [GRID[k][0] * GAP, GRID[k][1] * GAP];
  const TYPE_COLOR = { coffee: '#8b5a2b', fastfood: '#d64a3a', grocery: '#3d9a4a', flowers: '#e07aa8', fashion: '#7a5ac8', electronics: '#2f7fd6', restaurant: '#b8862b', dealership: '#30343c' };
  const LOT_DIM = { S: [6, 6], M: [8.5, 7.5], L: [10, 10], XL: [11.5, 13.5] };
  const LOT_H = { S: 6, M: 9, L: 13, XL: 10 };

  function supported() {
    if (failed || typeof THREE === 'undefined') return false;
    try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); } catch (e) { return false; }
  }
  function seeded(seed) { return () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const pickR = (R, a) => a[Math.floor(R() * a.length)];

  // ---------- текстура вікон: фон (UV 0.06) — суцільний колір, у центрі — вікно ----------
  function makeTextures() {
    const mk = (bg, win) => {
      const c = document.createElement('canvas'); c.width = c.height = 32;
      const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, 32, 32);
      g.fillStyle = win; g.fillRect(8, 7, 16, 15);
      const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; return t;
    };
    winTex = mk('#ffffff', '#46566c');
    winEmis = mk('#000000', '#ffd27a');
    MAT = new THREE.MeshLambertMaterial({ vertexColors: true, map: winTex, emissive: new THREE.Color('#ffffff'), emissiveMap: winEmis, emissiveIntensity: 0 });
    MAT_INST = new THREE.MeshLambertMaterial({ vertexColors: true });
    disposables.push(winTex, winEmis, MAT, MAT_INST);
  }

  // ---------- збирач геометрії ----------
  class GB {
    constructor() { this.p = []; this.n = []; this.u = []; this.c = []; this.i = []; }
    add(geo, color, win) {
      const pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv;
      const base = this.p.length / 3, col = new THREE.Color(color);
      for (let k = 0; k < pos.count; k++) {
        this.p.push(pos.getX(k), pos.getY(k), pos.getZ(k));
        this.n.push(nor.getX(k), nor.getY(k), nor.getZ(k));
        let uu = 0.06, vv = 0.06;
        if (win) {
          const f = Math.floor(k / 4);
          const su = f < 2 ? win.d / 3 : f < 4 ? 0 : win.w / 3, sv = f < 2 || f > 3 ? win.h / 3 : 0;
          if (su && sv) { uu = uv.getX(k) * su; vv = uv.getY(k) * sv; }
        }
        this.u.push(uu, vv); this.c.push(col.r, col.g, col.b);
      }
      if (geo.index) for (let k = 0; k < geo.index.count; k++) this.i.push(base + geo.index.getX(k));
      else for (let k = 0; k < pos.count; k++) this.i.push(base + k);
      geo.dispose();
      return this;
    }
    box(w, h, d, x, y, z, color, win, rotY) { const g = new THREE.BoxGeometry(w, h, d); if (rotY) g.rotateY(rotY); g.translate(x, y + h / 2, z); return this.add(g, color, win ? { w, h, d } : null); }
    cyl(rt, rb, h, x, y, z, color, seg = 10) { const g = new THREE.CylinderGeometry(rt, rb, h, seg); g.translate(x, y + h / 2, z); return this.add(g, color); }
    cone(r, h, x, y, z, color, seg = 7, rotY) { const g = new THREE.ConeGeometry(r, h, seg); if (rotY) g.rotateY(rotY); g.translate(x, y + h / 2, z); return this.add(g, color); }
    ring(r1, r2, x, y, z, color) { const g = new THREE.RingGeometry(r1, r2, 28); g.rotateX(-Math.PI / 2); g.translate(x, y, z); return this.add(g, color); }
    tree(x, z, s, col) { this.cyl(0.25 * s, 0.3 * s, 1.8 * s, x, 0.3, z, '#6b4a2f', 5); return this.cone(1.4 * s, 3.4 * s, x, 0.3 + 1.6 * s, z, col || '#3f8a4a', 6); }
    mesh(shadows) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
      g.setIndex(this.i);
      g.computeBoundingSphere();
      const m = new THREE.Mesh(g, MAT);
      if (shadows && quality === 'high') { m.castShadow = true; m.receiveShadow = true; }
      return m;
    }
  }

  // ---------- підписи ----------
  const labelCache = {};
  function label(text, { bg = 'rgba(20,24,32,.82)', fg = '#fff', border = null, scale = 1, font = 30, near = false } = {}) {
    const k = [text, bg, fg, border, font].join('|');
    if (!labelCache[k]) {
      const c = document.createElement('canvas'), g = c.getContext('2d');
      const f = `600 ${font}px system-ui, "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      g.font = f; const w = Math.ceil(g.measureText(text).width) + font * 1.1, h = Math.ceil(font * 1.6);
      c.width = w; c.height = h; g.font = f; g.textAlign = 'center'; g.textBaseline = 'middle';
      const r = h / 2;
      g.fillStyle = bg; g.beginPath(); g.moveTo(r, 0); g.lineTo(w - r, 0); g.arc(w - r, r, r, -Math.PI / 2, Math.PI / 2); g.lineTo(r, h); g.arc(r, r, r, Math.PI / 2, Math.PI * 1.5); g.fill();
      if (border) { g.strokeStyle = border; g.lineWidth = 4; g.stroke(); }
      g.fillStyle = fg; g.fillText(text, w / 2, h / 2 + 1);
      const t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
      labelCache[k] = { tex: t, mat: new THREE.SpriteMaterial({ map: t, depthWrite: false, transparent: true }), aspect: w / h };
      disposables.push(t, labelCache[k].mat);
    }
    const L = labelCache[k];
    const s = new THREE.Sprite(L.mat);
    s.scale.set(2.6 * L.aspect * scale, 2.6 * scale, 1);
    s.renderOrder = 10;
    s.userData.base = s.scale.clone(); s.userData.near = near;
    sprites.push(s);
    return s;
  }

  // ---------- ініціалізація ----------
  function init() {
    const hi = quality === 'high';
    renderer = new THREE.WebGLRenderer({ antialias: hi, powerPreference: hi ? 'high-performance' : 'low-power', failIfMajorPerformanceCaveat: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, hi ? 2 : 1.25));
    renderer.shadowMap.enabled = hi;
    if (hi) renderer.shadowMap.type = THREE.PCFShadowMap;
    const el = renderer.domElement;
    el.style.touchAction = 'none';
    el.addEventListener('webglcontextlost', onLost, false);
    scene = new THREE.Scene();
    sky = new THREE.Color('#9fc9ef');
    scene.background = sky.clone();
    scene.fog = new THREE.Fog(sky.clone(), 260, 520);
    camera = new THREE.PerspectiveCamera(45, 1, 1, 900);
    raycaster = new THREE.Raycaster();
    dummy = new THREE.Object3D();
    hemi = new THREE.HemisphereLight('#ffffff', '#55606e', 0.65); scene.add(hemi);
    sun = new THREE.DirectionalLight('#fff4e0', 0.75);
    if (hi) {
      sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
      Object.assign(sun.shadow.camera, { left: -150, right: 150, top: 150, bottom: -150, near: 10, far: 500 });
      sun.shadow.bias = -0.001;
    }
    scene.add(sun, sun.target);
    makeTextures();
    buildStatic();
    buildMovers();
    const rg = new THREE.RingGeometry(0.86, 1, 40);
    selRing = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false }));
    disposables.push(rg, selRing.material);
    selRing.rotation.x = -Math.PI / 2; selRing.position.y = 0.45; selRing.visible = false; scene.add(selRing);
    bindControls(el);
    built = true;
  }

  function buildStatic() {
    const R = seeded(4242);
    const plane = (w, d, color, x, y, z) => { const g = new THREE.PlaneGeometry(w, d); const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color })); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = quality === 'high'; disposables.push(g, m.material); scene.add(m); return m; };
    plane(700, 700, '#3b4048', 0, 0, 0);
    const water = plane(700, 300, '#2f78a8', 0, 0.08, WATER_Z + 150);
    water.material.transparent = true; water.material.opacity = 0.93;
    const gb = new GB();
    gb.box(700, 0.6, 3, 0, 0, WATER_Z - 1.5, '#b9b3a6');
    // розмітка
    for (const r of ROADS) for (let s = -100; s < 100; s += 7) {
      gb.box(0.35, 0.02, 3, r, 0.01, s, '#d9d6c8');
      if (r < WATER_Z - 6) gb.box(3, 0.02, 0.35, s, 0.01, r, '#d9d6c8');
    }
    // квартали
    for (const [k, [gx, gz]] of Object.entries(GRID)) {
      const x = gx * GAP, z = gz * GAP;
      const D = DMAP[k];
      gb.box(54, 0.3, 54, x, 0, z, '#a9aaa6');
      const inner = k === 'park' ? '#5d9a52' : D ? new THREE.Color(D.color).lerp(new THREE.Color(D.zone === 'industry' ? '#9d988f' : '#e9ece4'), 0.7).getStyle() : '#c9c6bd';
      gb.box(51, 0.06, 51, x, 0.3, z, inner);
      if (D) {
        gb.box(52, 0.08, 0.8, x, 0.3, z - 25.6, D.color); gb.box(52, 0.08, 0.8, x, 0.3, z + 25.6, D.color);
        gb.box(0.8, 0.08, 52, x - 25.6, 0.3, z, D.color); gb.box(0.8, 0.08, 52, x + 25.6, 0.3, z, D.color);
        const l = label(D.name, { bg: D.color, font: 34, scale: 1.5 }); l.position.set(x, 24, z - 24); scene.add(l);
        if (D.zone === 'retail') for (const tx of [-24, 24]) for (const tz of [-8, 8]) gb.tree(x + tx, z + tz, 0.75);
      }
      if (k === 'park') {
        for (let i = 0; i < 40; i++) gb.tree(x + (R() - 0.5) * 46, z + (R() - 0.5) * 46, 0.8 + R() * 0.8, pickR(R, ['#3f8a4a', '#4c9a50', '#357a3e']));
        gb.cyl(7, 7, 0.1, x + 4, 0.32, z + 3, '#3d86b8', 24);
        const l = label('Центральний парк', { bg: '#3f8a4a', font: 30, scale: 1.2 }); l.position.set(x, 16, z - 24); scene.add(l);
      }
    }
    // порт: крани і контейнери на причалі
    const [px] = bpos('port');
    for (let i = 0; i < 3; i++) {
      const cx = px - 20 + i * 20;
      gb.box(1, 16, 1, cx - 2, 0, WATER_Z - 1, '#e0a42a'); gb.box(1, 16, 1, cx + 2, 0, WATER_Z - 1, '#e0a42a');
      gb.box(1.2, 1.2, 22, cx, 16, WATER_Z + 6, '#e0a42a');
    }
    for (let i = 0; i < 26; i++) gb.box(5, 2.4, 2.3, -150 + (i % 13) * 6, Math.floor(i / 13) * 2.4, WATER_Z - 6, pickR(R, ['#c0392b', '#2f7fd6', '#27ae60', '#e67e22', '#8e44ad']));
    // горизонт
    for (let i = 0; i < 90; i++) {
      const ang = R() * Math.PI * 2, rad = 128 + R() * 70;
      const x = Math.cos(ang) * rad, z = Math.sin(ang) * rad;
      if (z > WATER_Z - 12) continue;
      const w = 8 + R() * 8, h = 10 + R() * 55;
      gb.box(w, h, w, x, 0, z, pickR(R, ['#8f98a3', '#a7a196', '#7d8894', '#b9b2a6', '#9aa3ad']), true);
    }
    scene.add(gb.mesh(true));
  }

  function buildMovers() {
    const R = seeded(77);
    const nPed = quality === 'high' ? 220 : 110, nCar = quality === 'high' ? 46 : 26;
    const pg = new GB().cyl(0.32, 0.38, 1.3, 0, 0.3, 0, '#ffffff', 6).add(new THREE.SphereGeometry(0.28, 6, 4).translate(0, 1.95, 0), '#f0d0b0');
    const pgeo = pg.mesh().geometry;
    peds = new THREE.InstancedMesh(pgeo, MAT_INST, nPed);
    const colors = ['#e05d5d', '#4f8fe0', '#f0c04a', '#5bbf7a', '#b07ad6', '#ffffff', '#ef8a3c', '#3a3a3a'];
    const blocks = Object.keys(GRID).filter((k) => !DMAP[k] || DMAP[k].zone === 'retail');
    const col = new THREE.Color();
    for (let i = 0; i < nPed; i++) {
      const k = pickR(R, blocks), [x, z] = bpos(k);
      pedData.push({ x, z, t: R() * 4, sp: (0.02 + R() * 0.02) * (R() < 0.5 ? 1 : -1), off: 27.5 + R() * 1.5, ph: R() * 6 });
      peds.setColorAt(i, col.set(pickR(R, colors)));
    }
    peds.frustumCulled = false;
    scene.add(peds);
    const cg = new GB().box(2, 1, 4, 0, 0.25, 0, '#ffffff').box(1.7, 0.8, 2, 0, 1.25, -0.2, '#555b66');
    cars = new THREE.InstancedMesh(cg.mesh().geometry, MAT_INST, nCar);
    const ccol = ['#d64a3a', '#2f7fd6', '#f2f2f2', '#2b2b2b', '#e8b33a', '#3d9a4a', '#8a8f99'];
    for (let i = 0; i < nCar; i++) {
      const axis = R() < 0.5 ? 'x' : 'z', dir = R() < 0.5 ? 1 : -1;
      const roads = axis === 'x' ? ROADS.filter((r) => r < WATER_Z - 6) : ROADS;
      carData.push({ axis, line: pickR(R, roads), lane: dir * 1.8 * (axis === 'x' ? 1 : -1), dir, pos: (R() - 0.5) * 220, sp: 10 + R() * 8 });
      cars.setColorAt(i, col.set(pickR(R, ccol)));
    }
    if (quality === 'high') cars.castShadow = true;
    cars.frustumCulled = false;
    scene.add(cars);
    disposables.push(pgeo, cars.geometry);
    // човни
    const bg = new GB();
    for (let i = 0; i < 3; i++) { bg.box(7, 1.2, 2.6, -150 + i * 110, 0, WATER_Z + 14 + i * 12, '#f4f4f4'); bg.box(2.6, 1.3, 2, -150.8 + i * 110, 1.2, WATER_Z + 14 + i * 12, '#2f7fd6'); }
    const boats = bg.mesh(); boats.userData.boats = true; scene.add(boats); boatsMesh = boats;
  }
  let boatsMesh = null;

  // ---------- ділянки ----------
  function lotPos(lot) {
    const i = lot.idx != null ? lot.idx : state.lots.filter((l) => l.district === lot.district).indexOf(lot);
    const col = i % 4, row = Math.floor(i / 4);
    const [cx, cz] = bpos(lot.district);
    return { x: cx - 18 + col * 12, z: cz - 16 + row * 16, face: row === 2 ? 1 : -1 };
  }
  function lotKey(l) {
    if (l.ownerKind === 'biz') { const b = bizById(l.owner); return b ? `b:${b.type}:${b.upg.interior}:${b.name}` : 'x'; }
    if (l.ownerKind === 'fac') { const f = facById(l.owner); return f ? `f:${f.kind}:${f.level}:${f.name}:${f.broken ? 1 : 0}` : 'x'; }
    if (l.ownerKind === 'prop') { const p = propById(l.owner); return p ? `p:${p.kind}:${p.building ? 1 : 0}` : 'x'; }
    if (l.npc) return `n:${l.npc.co}:${l.npc.type || l.npc.fac}:${isSub(coById(l.npc.co)) ? 1 : 0}`;
    return `free:${Math.round(Math.log(lotRent(l)) * 8)}`;
  }
  function addShape(gb, shape, w, d, lvl, face, own, color) {
    const H = 6 + lvl * 2;
    switch (shape) {
      case 'farm':
        for (let i = 0; i < 4; i++) gb.box(w, 0.15, d / 4 - 0.3, 0, 0, -d / 2 + d / 8 + i * d / 4, i % 2 ? '#c9b458' : '#6fa54a');
        gb.box(3.5, 3, 3, -w / 2 + 2.5, 0, -d / 2 + 2.2, '#b5442b'); gb.cone(2.6, 1.6, -w / 2 + 2.5, 3, -d / 2 + 2.2, '#5a2a1d', 4, Math.PI / 4);
        gb.cyl(1.1, 1.1, 6, w / 2 - 2, 0, -d / 2 + 2, '#c8ccd2'); gb.cone(1.2, 1.2, w / 2 - 2, 6, -d / 2 + 2, '#9aa0a8');
        return 7;
      case 'mine':
        gb.box(w * 0.8, 0.4, d * 0.6, 0, 0, d * 0.1, '#3a3530');
        for (const sx of [-1.2, 1.2]) for (const sz of [-1.2, 1.2]) gb.box(0.4, 9 + lvl, 0.4, sx - w / 4, 0, sz - d / 4, '#6b6f78');
        gb.box(3.4, 1.4, 3.4, -w / 4, 9 + lvl, -d / 4, '#a33d2d');
        gb.cone(3, 3, w / 4, 0, d / 4, '#7a5a40', 8);
        return 12 + lvl;
      case 'oil':
        gb.cone(2.2, 14 + lvl * 2, -w / 4, 0, 0, '#9aa0a8', 4);
        gb.box(4, 1.6, 1.4, w / 5, 0, -d / 4, '#e0a42a');
        gb.cyl(1.6, 1.6, 3.5, w / 4, 0, d / 4, '#d8d8d8'); gb.cyl(1.6, 1.6, 3.5, w / 4 - 3.6, 0, d / 4, '#d8d8d8');
        return 15 + lvl * 2;
      case 'steel':
        gb.box(w * 0.85, H + 2, d * 0.55, 0, 0, d * 0.15, '#7d7266', true);
        for (let i = 0; i < 3; i++) gb.cyl(0.6, 0.8, 16 + lvl * 2, -w / 3 + i * w / 3, 0, -d / 3, '#5a5550');
        gb.cyl(2, 2.4, 9, w / 3, 0, -d / 4 + 1, '#8a4b2d');
        return 17 + lvl * 2;
      case 'clean':
        gb.box(w * 0.9, H, d * 0.8, 0, 0, 0, '#eef1f5', true); gb.box(w * 0.92, 1, d * 0.82, 0, H * 0.6, 0, '#2f7fd6');
        return H + 1;
      case 'carplant':
        gb.box(w * 0.92, H, d * 0.55, 0, 0, -d * 0.18, '#c4c8ce', true);
        for (let i = 0; i < 8; i++) gb.box(1.3, 0.8, 2.4, -w / 2 + 1.6 + (i % 4) * 2.4, 0, d * 0.22 + Math.floor(i / 4) * 3, ['#d64a3a', '#2f7fd6', '#f2f2f2', '#2b2b2b'][i % 4]);
        return H + 1;
      case 'power':
        gb.cyl(2.6, 4, 12 + lvl * 2, -w / 4, 0, -d / 5, '#c9c6bd', 14); gb.cyl(2.6, 4, 12 + lvl * 2, w / 4, 0, -d / 5, '#c9c6bd', 14);
        gb.box(w * 0.7, 4, d * 0.3, 0, 0, d * 0.3, '#8d99a6', true);
        return 13 + lvl * 2;
      case 'warehouse':
        gb.box(w * 0.9, 6, d * 0.6, 0, 0, -d * 0.15, '#9d8f7a');
        for (let i = 0; i < 6; i++) gb.box(4.4, 2, 2, -w / 2 + 2.6 + (i % 2) * 4.8, Math.floor(i / 2) * 2, d * 0.32, ['#c0392b', '#2f7fd6', '#27ae60', '#e67e22'][i % 4]);
        return 8;
      case 'office': {
        const h = 16 + lvl * 6;
        gb.box(w * 0.75, h, d * 0.7, 0, 0, 0, '#5d8fb8', true); gb.box(w * 0.78, 0.6, d * 0.73, 0, h, 0, '#3b414c');
        return h + 1;
      }
      default: // factory
        gb.box(w * 0.9, H, d * 0.65, 0, 0, d * 0.1, color || '#a9a39a', true);
        gb.cyl(0.7, 0.9, H + 9, -w / 3, 0, -d / 3, '#6b6f78'); gb.cyl(0.7, 0.9, H + 7, -w / 3 + 2.6, 0, -d / 3, '#6b6f78');
        return H + 9;
    }
  }
  function buildLot(l) {
    const p = lotPos(l), [w, d] = LOT_DIM[l.size];
    const key = lotKey(l);
    const g = new THREE.Group();
    g.position.set(p.x, 0.36, p.z);
    const gb = new GB();
    let top = 4, lbl = null;
    if (key.startsWith('free')) {
      gb.box(w, 0.15, d, 0, 0, 0, '#8e9094');
      gb.box(0.2, 2.2, 0.2, 0, 0, p.face * (d / 2 - 0.6), '#555555');
      gb.box(2.4, 1.2, 0.15, 0, 1.8, p.face * (d / 2 - 0.6), '#2e9a5a');
      lbl = label(`＋ ${l.size} · $${lotRent(l)}/д`, { bg: 'rgba(46,154,90,.92)', font: 26, scale: 0.75, near: true }); top = 3;
    } else if (key.startsWith('b:') || (l.npc && l.npc.type)) {
      const own = key.startsWith('b:');
      const type = own ? bizById(l.owner).type : l.npc.type;
      const T = TYPES[type];
      const h = LOT_H[l.size] + (own ? (bizById(l.owner).upg.interior - 1) * 2 : 0);
      gb.box(w, h, d, 0, 0, 0, own ? DMAP[l.district].color : '#bdb5a8', true);
      gb.box(w + 0.2, 0.5, d + 0.2, 0, h, 0, own ? '#3b414c' : '#6a6f78');
      gb.box(w * 0.92, 0.35, 1.6, 0, 2.8, p.face * (d / 2 + 0.8), TYPE_COLOR[type] || '#777777');
      gb.box(1.6, 2.4, 0.1, 0, 0, p.face * (d / 2 + 0.03), '#2a2f38');
      if (type === 'dealership') for (let i = 0; i < 3; i++) gb.box(1.3, 0.8, 2.4, -w / 2 + 1.5 + i * 2.4, 0, p.face * (d / 2 + 2.6), ['#d64a3a', '#f2f2f2', '#2f7fd6'][i]);
      if (own) { gb.ring(Math.max(w, d) * 0.75, Math.max(w, d) * 0.82, 0, 0.05, 0, '#4cc27c'); const b = bizById(l.owner); lbl = label(`${T.icon} ${b.name.length > 18 ? b.name.slice(0, 17) + '…' : b.name}`, { bg: 'rgba(30,110,64,.92)', border: '#bff0cf', font: 28, scale: 0.9 }); }
      else { const co = coById(l.npc.co); const sub = isSub(co); lbl = label(`${T.icon} ${co ? co.name : ''}${sub ? ' · ваша' : ''}`, { bg: sub ? 'rgba(30,110,64,.92)' : 'rgba(150,56,48,.85)', font: 24, scale: sub ? 0.75 : 0.65, near: !sub }); }
      top = h + 2.6;
    } else if (key.startsWith('f:') || (l.npc && l.npc.fac)) {
      const own = key.startsWith('f:');
      const kind = own ? facById(l.owner).kind : l.npc.fac;
      const F = FACILITIES[kind];
      const lvl = own ? facById(l.owner).level : 2;
      gb.box(w, 0.1, d, 0, 0, 0, '#8b8a85');
      const h = addShape(gb, F.shape, w, d, lvl, p.face, own, own ? null : '#a49d93');
      if (own) { gb.ring(Math.max(w, d) * 0.72, Math.max(w, d) * 0.78, 0, 0.12, 0, '#4cc27c'); const f = facById(l.owner); lbl = label(`${F.icon} ${f.name.length > 20 ? f.name.slice(0, 19) + '…' : f.name}`, { bg: f.broken ? 'rgba(180,50,40,.92)' : 'rgba(30,110,64,.92)', border: '#bff0cf', font: 26, scale: 0.85 }); }
      else { const co = coById(l.npc.co); const sub = isSub(co); lbl = label(`${F.icon} ${co ? co.name : ''}${sub ? ' · ваша' : ''}`, { bg: sub ? 'rgba(30,110,64,.92)' : 'rgba(90,90,100,.85)', font: 24, scale: sub ? 0.75 : 0.65, near: !sub }); }
      top = h + 2.5;
    } else if (key.startsWith('p:')) {
      const pr = propById(l.owner);
      if (pr.building) {
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) gb.box(0.4, 14, 0.4, sx * (w / 2 - 1), 0, sz * (d / 2 - 1), '#7d8894');
        for (let i = 1; i < 4; i++) gb.box(w - 1.5, 0.4, d - 1.5, 0, i * 4, 0, '#b0b4ba');
        gb.box(0.8, 24, 0.8, w / 2 - 0.5, 0, -d / 2 + 0.5, '#e0a42a'); gb.box(16, 0.8, 0.8, w / 2 - 6, 23, -d / 2 + 0.5, '#e0a42a');
        lbl = label(`🏗️ ${pr.building} дн.`, { bg: 'rgba(224,164,42,.92)', font: 26, scale: 0.8 }); top = 26;
      } else {
        const K = PROP_KINDS[pr.kind];
        if (pr.kind === 'mall') { gb.box(w, 8, d, 0, 0, 0, '#d9cfc0', true); gb.box(w * 0.6, 1.4, 0.3, 0, 8, p.face * (d / 2), '#d64a3a'); top = 10; }
        else if (pr.kind === 'complex') { gb.box(w * 0.4, 22, d * 0.4, -w / 4, 0, -d / 4, '#e9e2d0', true); gb.box(w * 0.4, 16, d * 0.4, w / 4, 0, d / 4, '#e9e2d0', true); top = 24; }
        else { gb.box(w * 0.8, 34, d * 0.8, 0, 0, 0, '#6fa0c8', true); top = 36; }
        gb.ring(Math.max(w, d) * 0.72, Math.max(w, d) * 0.78, 0, 0.12, 0, '#5b9be0');
        lbl = label(`${K.icon} ${K.name}`, { bg: 'rgba(47,111,180,.92)', border: '#cfe3ff', font: 26, scale: 0.85 });
      }
    }
    g.add(gb.mesh(true));
    if (lbl) { lbl.position.set(0, top + 1, 0); g.add(lbl); g.userData.label = lbl; g.userData.labelY = top + 1; }
    const pk = new THREE.Mesh(PICK_GEO || (PICK_GEO = new THREE.BoxGeometry(11.5, 16, 15)));
    pk.visible = false; pk.position.y = 8; pk.userData.lotId = l.id; g.add(pk);
    return { g, key, pk };
  }
  let PICK_GEO = null;
  function disposeLot(o) {
    scene.remove(o.g);
    o.g.traverse((ch) => { if (ch.isMesh && ch.geometry !== PICK_GEO && ch.material === MAT) ch.geometry.dispose(); });
    if (o.g.userData.label) sprites = sprites.filter((s) => s !== o.g.userData.label);
  }
  function sync() {
    const seen = new Set();
    const vc = viewCity();
    for (const l of state.lots) {
      if (lotCityId(l) !== vc) continue; // показуємо лише обране місто
      seen.add(l.id);
      const key = lotKey(l), cur = lotObjs.get(l.id);
      if (cur && cur.key === key) continue;
      if (cur) disposeLot(cur);
      const o = buildLot(l); scene.add(o.g); lotObjs.set(l.id, o);
    }
    for (const [id, o] of lotObjs) if (!seen.has(id)) { disposeLot(o); lotObjs.delete(id); }
    pickables = [...lotObjs.values()].map((o) => o.pk);
  }

  // ---------- керування ----------
  function bindControls(el) {
    const pts = new Map();
    let start = null, moved = 0, lastPinch = null;
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('pointerdown', (e) => {
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY, btn: e.button, shift: e.shiftKey });
      if (pts.size === 1) { start = { t: performance.now() }; moved = 0; }
      lastPinch = null;
    });
    el.addEventListener('pointermove', (e) => {
      const p = pts.get(e.pointerId); if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
      if (pts.size === 1) {
        if (p.btn === 2 || p.shift) { camGoal.theta += dx * 0.008; camGoal.phi = Math.max(0.35, Math.min(1.3, camGoal.phi - dy * 0.005)); }
        else pan(dx, dy);
      } else if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y), ang = Math.atan2(b.y - a.y, b.x - a.x), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        if (lastPinch) {
          camGoal.dist = clampD(camGoal.dist * (lastPinch.dist / dist));
          let da = ang - lastPinch.ang; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI;
          camGoal.theta -= da; pan(mx - lastPinch.mx, my - lastPinch.my);
        }
        lastPinch = { dist, ang, mx, my };
      }
    });
    const up = (e) => {
      const was = pts.size;
      pts.delete(e.pointerId); lastPinch = null;
      if (was === 1 && start && moved < 10 && performance.now() - start.t < 500) doPick(e);
      if (!pts.size) start = null;
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', (e) => { pts.delete(e.pointerId); lastPinch = null; });
    el.addEventListener('wheel', (e) => { e.preventDefault(); camGoal.dist = clampD(camGoal.dist * (1 + e.deltaY * 0.0012)); }, { passive: false });
  }
  const clampD = (v) => Math.max(40, Math.min(330, v));
  function pan(dx, dy) {
    const k = camGoal.dist * 0.0021, s = Math.sin(camGoal.theta), c = Math.cos(camGoal.theta);
    camGoal.tx = Math.max(-115, Math.min(115, camGoal.tx - s * dx * k - c * dy * k));
    camGoal.tz = Math.max(-115, Math.min(105, camGoal.tz + c * dx * k - s * dy * k));
  }
  function doPick(e) {
    const r = renderer.domElement.getBoundingClientRect();
    const v = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(v, camera);
    const hit = raycaster.intersectObjects(pickables, false)[0];
    if (onPick) onPick(hit ? hit.object.userData.lotId : null);
  }

  // ---------- кадр ----------
  function frame(t) {
    raf = 0;
    if (!built || !container || !container.isConnected || !state) return;
    try {
      const dt = Math.min(0.05, (t - lastT) / 1000 || 0); lastT = t;
      if (t - lastSync > 500) { sync(); lastSync = t; }
      for (const k of ['tx', 'tz', 'dist', 'theta', 'phi']) cam[k] += (camGoal[k] - cam[k]) * Math.min(1, dt * 10);
      camera.position.set(cam.tx + cam.dist * Math.sin(cam.phi) * Math.cos(cam.theta), cam.dist * Math.cos(cam.phi), cam.tz + cam.dist * Math.sin(cam.phi) * Math.sin(cam.theta));
      camera.lookAt(cam.tx, 0, cam.tz);
      // день і ніч
      const h = state.hour;
      const goal = h >= 8 && h < 18 ? 1 : h >= 6 && h < 8 ? (h - 5) / 3 : h >= 18 && h < 21 ? (21 - h) / 3.5 : 0.04;
      dayF += (goal - dayF) * Math.min(1, dt * 1.5);
      sky.set('#142038').lerp(new THREE.Color(h >= 17 && h < 21 ? '#f2a46b' : '#9fc9ef'), dayF);
      scene.background.copy(sky); scene.fog.color.copy(sky);
      hemi.intensity = 0.42 + 0.25 * dayF;
      sun.intensity = 0.06 + 0.7 * dayF;
      const sa = ((h - 6) / 12) * Math.PI;
      sun.position.set(Math.cos(sa) * 160 + cam.tx, 60 + Math.sin(Math.max(0.15, sa)) * 150, -80 + cam.tz);
      sun.target.position.set(cam.tx, 0, cam.tz);
      MAT.emissiveIntensity = (1 - dayF) * 0.95;
      // підписи
      const ls = Math.max(0.42, Math.min(1.35, cam.dist / 130));
      for (const sp of sprites) { sp.scale.set(sp.userData.base.x * ls, sp.userData.base.y * ls, 1); if (sp.userData.near) sp.visible = cam.dist < 120; }
      // виділення
      const sel = state.ui.lot && lotObjs.get(state.ui.lot);
      if (sel) {
        const l = lotById(state.ui.lot);
        selRing.visible = true; selRing.position.x = sel.g.position.x; selRing.position.z = sel.g.position.z;
        const s = Math.max(...LOT_DIM[l.size]) * 0.95 * (1 + Math.sin(t / 200) * 0.06); selRing.scale.set(s, s, 1);
      } else selRing.visible = false;
      for (const o of lotObjs.values()) if (o.g.userData.label) o.g.userData.label.position.y = o.g.userData.labelY + Math.sin(t / 500 + o.g.position.x) * 0.3;
      // рух
      const act = 0.15 + 0.85 * Math.min(1, CURVES.grocery[h] || 0);
      const nP = Math.round(pedData.length * act);
      for (let i = 0; i < nP; i++) {
        const p = pedData[i];
        p.t = (p.t + p.sp * dt * 10 + 4) % 4;
        const side = Math.floor(p.t), f = p.t - side, o = p.off, a = -o + 2 * o * f;
        const [x, z] = side === 0 ? [a, -o] : side === 1 ? [o, a] : side === 2 ? [-a, o] : [-o, -a];
        dummy.position.set(p.x + x, Math.abs(Math.sin(t / 140 + p.ph)) * 0.12, p.z + z); dummy.rotation.set(0, 0, 0); dummy.updateMatrix();
        peds.setMatrixAt(i, dummy.matrix);
      }
      peds.count = nP; peds.instanceMatrix.needsUpdate = true;
      const nC = Math.round(carData.length * (0.25 + 0.75 * act));
      for (let i = 0; i < nC; i++) {
        const c = carData[i];
        c.pos += c.dir * c.sp * dt;
        if (c.pos > 105) c.pos = -105; if (c.pos < -105) c.pos = 105;
        if (c.axis === 'x') { dummy.position.set(c.pos, 0, c.line + c.lane); dummy.rotation.set(0, c.dir > 0 ? Math.PI / 2 : -Math.PI / 2, 0); }
        else { dummy.position.set(c.line + c.lane, 0, c.pos); dummy.rotation.set(0, c.dir > 0 ? 0 : Math.PI, 0); }
        dummy.updateMatrix(); cars.setMatrixAt(i, dummy.matrix);
      }
      cars.count = nC; cars.instanceMatrix.needsUpdate = true;
      if (boatsMesh) { boatsMesh.position.x += 3 * dt; if (boatsMesh.position.x > 200) boatsMesh.position.x = -120; }
      renderer.render(scene, camera);
    } catch (e) {
      console.error(e);
      fail(e.message || String(e));
      return;
    }
    raf = requestAnimationFrame(frame);
  }
  function resize() {
    if (!container || !renderer) return;
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%';
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  let ro = null;

  // ---------- життєвий цикл ----------
  function teardown() {
    if (raf) cancelAnimationFrame(raf); raf = 0;
    if (!built && !renderer) return;
    try {
      for (const o of lotObjs.values()) disposeLot(o);
      lotObjs.clear();
      if (scene) scene.traverse((ch) => { if (ch.isMesh && ch.geometry) ch.geometry.dispose(); });
      for (const d of disposables) if (d && d.dispose) d.dispose();
      for (const k of Object.keys(labelCache)) delete labelCache[k];
      if (PICK_GEO) { PICK_GEO.dispose(); PICK_GEO = null; }
      if (renderer) { renderer.domElement.removeEventListener('webglcontextlost', onLost); renderer.domElement.remove(); renderer.dispose(); }
    } catch (e) { console.error(e); }
    disposables.length = 0; sprites = []; pickables = []; pedData = []; carData = [];
    renderer = null; scene = null; built = false; boatsMesh = null;
  }
  function onLost(e) {
    e.preventDefault();
    lostCount++;
    const el = container;
    teardown();
    if (lostCount >= 3) return fail('графічний контекст втрачено кілька разів');
    if (quality === 'high') quality = 'low';
    setTimeout(() => { if (el && el.isConnected) mount(el, onPick, onFail); }, 600);
  }
  function fail(msg) {
    failed = true;
    teardown();
    if (onFail) onFail(msg);
  }
  function mount(el, pickFn, failFn) {
    onPick = pickFn; onFail = failFn || onFail; container = el;
    try {
      if (!built) init();
      el.appendChild(renderer.domElement);
      resize();
      if (!ro && typeof ResizeObserver !== 'undefined') ro = new ResizeObserver(resize);
      if (ro) { ro.disconnect(); ro.observe(el); }
      if (!raf) { lastT = performance.now(); raf = requestAnimationFrame(frame); }
    } catch (e) {
      console.error(e);
      fail(e.message || String(e));
    }
  }

  return {
    ok: () => supported(),
    mount,
    quality: () => quality,
    setQuality(q) { quality = q; try { localStorage.setItem(QKEY, q); } catch (e) { /* ignore */ } failed = false; lostCount = 0; teardown(); },
    control(v) {
      if (v === 'in') camGoal.dist = clampD(camGoal.dist * 0.75);
      if (v === 'out') camGoal.dist = clampD(camGoal.dist * 1.3);
      if (v === 'left') camGoal.theta -= Math.PI / 4;
      if (v === 'right') camGoal.theta += Math.PI / 4;
      if (v === 'tilt') camGoal.phi = camGoal.phi > 0.8 ? 0.5 : 1.05;
      if (v === 'reset') Object.assign(camGoal, { tx: 0, tz: 4, dist: 215, theta: Math.PI * 0.32, phi: 0.92 });
    },
    focus(lotId) { const l = lotById(lotId); if (!l) return; const p = lotPos(l); camGoal.tx = p.x; camGoal.tz = p.z + 4; camGoal.dist = Math.min(camGoal.dist, 75); },
    reset() { failed = false; lostCount = 0; teardown(); },
  };
})();
