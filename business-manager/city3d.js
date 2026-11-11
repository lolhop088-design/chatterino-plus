'use strict';
/* 3D-місто для «Бізнес Імперії» (Three.js r149, без модулів — працює з file:// у WebView).
   Глобальні state, DISTRICTS, DMAP, TYPES, SIZES, lotRent, bizById, CURVES беруться з game.js. */
const City3D = (() => {
  let renderer = null, scene, camera, raycaster, failed = false;
  let container = null, onPick = null, raf = 0, lastT = 0, lastSync = 0, built = false;
  const cam = { tx: 0, tz: 6, dist: 125, theta: Math.PI * 0.32, phi: 0.92 };
  const camGoal = { ...cam };
  const lotObjs = new Map();
  const wallMats = [];
  let sprites = [];
  let pickables = [], selRing, hemi, sun, sky, cars = [], peds = [], boats = [], dayF = 1;

  const GAP = 46, HALF = 18, ROADS = [-69, -23, 23, 69];
  const DPOS = { center: [0, 0], campus: [0, -GAP], river: [0, GAP], res: [-GAP, 0], biz: [GAP, 0] };
  const TYPE_COLOR = { coffee: '#8b5a2b', fastfood: '#d64a3a', grocery: '#3d9a4a', flowers: '#e07aa8', fashion: '#7a5ac8', electronics: '#2f7fd6' };
  const LOT_DIM = { S: [5.2, 5.2], M: [7.2, 6.5], L: [7.8, 9] };
  const LOT_H = { S: 6, M: 9, L: 13 };

  // ---------- допоміжні ----------
  function seeded(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function supported() {
    if (failed || typeof THREE === 'undefined') return false;
    try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); } catch (e) { return false; }
  }
  const mats = {};
  function mat(color, opts = {}) {
    const k = color + JSON.stringify(opts);
    if (!mats[k]) mats[k] = new THREE.MeshLambertMaterial({ color, ...opts });
    return mats[k];
  }

  let winTex, winEmis;
  function windowTextures() {
    const mk = (bg, win) => {
      const c = document.createElement('canvas'); c.width = c.height = 32;
      const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, 32, 32);
      g.fillStyle = win; g.fillRect(8, 7, 16, 15);
      const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
    };
    winTex = mk('#ffffff', '#3a4a60');
    winEmis = mk('#000000', '#ffd27a');
  }
  const wallCache = {};
  function wallMat(color) {
    if (!wallCache[color]) {
      const m = new THREE.MeshLambertMaterial({ color, map: winTex, emissive: new THREE.Color('#ffffff'), emissiveMap: winEmis, emissiveIntensity: 0 });
      wallCache[color] = m; wallMats.push(m);
    }
    return wallCache[color];
  }
  function building(w, h, d, color, roofColor) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const uv = geo.attributes.uv;
    // грані: +x, -x, +y, -y, +z, -z — по 4 вершини; масштабуємо UV під сітку вікон 3×3 м
    for (let f = 0; f < 6; f++) {
      const su = f < 2 ? d / 3 : f < 4 ? 0 : w / 3, sv = f < 2 || f > 3 ? h / 3 : 0;
      for (let i = 0; i < 4; i++) { const j = f * 4 + i; uv.setXY(j, uv.getX(j) * su, uv.getY(j) * sv); }
    }
    const wm = wallMat(color), rm = mat(roofColor || '#5d6470');
    const m = new THREE.Mesh(geo, [wm, wm, rm, rm, wm, wm]);
    m.position.y = h / 2; m.castShadow = true; m.receiveShadow = true;
    return m;
  }
  const labelCache = {};
  function label(text, { bg = 'rgba(20,24,32,.82)', fg = '#fff', border = null, scale = 1, font = 30 } = {}) {
    const k = [text, bg, fg, border, font].join('|');
    if (!labelCache[k]) {
      const c = document.createElement('canvas'), g = c.getContext('2d');
      const f = `600 ${font}px system-ui, "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      g.font = f; const w = Math.ceil(g.measureText(text).width) + font * 1.1, h = Math.ceil(font * 1.6);
      c.width = w; c.height = h;
      g.font = f; g.textAlign = 'center'; g.textBaseline = 'middle';
      const r = h / 2;
      g.fillStyle = bg; g.beginPath(); g.moveTo(r, 0); g.lineTo(w - r, 0); g.arc(w - r, r, r, -Math.PI / 2, Math.PI / 2); g.lineTo(r, h); g.arc(r, r, r, Math.PI / 2, Math.PI * 1.5); g.fill();
      if (border) { g.strokeStyle = border; g.lineWidth = 4; g.stroke(); }
      g.fillStyle = fg; g.fillText(text, w / 2, h / 2 + 1);
      const t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter;
      labelCache[k] = { tex: t, aspect: w / h };
    }
    const L = labelCache[k];
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: L.tex, depthWrite: false, transparent: true }));
    s.scale.set(2.6 * L.aspect * scale, 2.6 * scale, 1);
    s.renderOrder = 10;
    s.userData.base = s.scale.clone();
    sprites.push(s);
    return s;
  }
  function tree(x, z, s = 1) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(GEO.trunk, mat('#6b4a2f')); trunk.position.y = 0.9 * s; trunk.scale.setScalar(s);
    const top = new THREE.Mesh(GEO.crown, mat('#3f8a4a')); top.position.y = 2.6 * s; top.scale.setScalar(s); top.castShadow = true;
    g.add(trunk, top); g.position.set(x, 0.3, z); return g;
  }
  let GEO;

  // ---------- побудова сцени ----------
  function init() {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.touchAction = 'none';
    scene = new THREE.Scene();
    sky = new THREE.Color('#9fc9ef');
    scene.background = sky.clone();
    scene.fog = new THREE.Fog(sky.clone(), 170, 330);
    camera = new THREE.PerspectiveCamera(45, 1, 1, 600);
    raycaster = new THREE.Raycaster();
    hemi = new THREE.HemisphereLight('#ffffff', '#55606e', 0.75); scene.add(hemi);
    sun = new THREE.DirectionalLight('#fff4e0', 0.9);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -110, right: 110, top: 110, bottom: -110, near: 10, far: 400 });
    sun.shadow.bias = -0.0008;
    scene.add(sun, sun.target);
    GEO = {
      trunk: new THREE.CylinderGeometry(0.25, 0.3, 1.8, 6),
      crown: new THREE.ConeGeometry(1.4, 3.4, 7),
      carBody: new THREE.BoxGeometry(2, 1, 4),
      carTop: new THREE.BoxGeometry(1.7, 0.8, 2),
      pedBody: new THREE.CylinderGeometry(0.32, 0.38, 1.3, 6),
      pedHead: new THREE.SphereGeometry(0.28, 8, 6),
    };
    windowTextures();
    buildStatic();
    selRing = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 40), new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false }));
    selRing.rotation.x = -Math.PI / 2; selRing.position.y = 0.42; selRing.visible = false; scene.add(selRing);
    bindControls(renderer.domElement);
    built = true;
  }

  function buildStatic() {
    const R = seeded(12345);
    // земля / асфальт
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), mat('#3b4048'));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    // вода на півдні
    const water = new THREE.Mesh(new THREE.PlaneGeometry(420, 140), new THREE.MeshLambertMaterial({ color: '#2f78a8', transparent: true, opacity: 0.92 }));
    water.rotation.x = -Math.PI / 2; water.position.set(0, 0.08, 76 + 70); scene.add(water);
    const quay = new THREE.Mesh(new THREE.BoxGeometry(420, 0.6, 3), mat('#b9b3a6')); quay.position.set(0, 0.3, 75); scene.add(quay);
    // розмітка доріг
    const lineMat = new THREE.MeshBasicMaterial({ color: '#d9d6c8' });
    for (const r of ROADS) {
      for (let s = -72; s < 72; s += 6) {
        const a = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 2.6), lineMat); a.rotation.x = -Math.PI / 2; a.position.set(r, 0.03, s); scene.add(a);
        if (r < 70) { const b = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.35), lineMat); b.rotation.x = -Math.PI / 2; b.position.set(s, 0.03, r); scene.add(b); }
      }
    }
    // квартали
    const blocks = [[-1, -1, 'park'], [1, -1, 'filler'], [-1, 1, 'filler'], [1, 1, 'filler']];
    for (const d of DISTRICTS) {
      const [x, z] = DPOS[d.id];
      addBlockBase(x, z, new THREE.Color(d.color).lerp(new THREE.Color('#e9ece4'), 0.72));
      const edge = new THREE.Mesh(new THREE.BoxGeometry(36.4, 0.34, 36.4), mat(d.color)); edge.position.set(x, 0.17, z); scene.add(edge);
      const l = label(d.name, { bg: d.color, font: 34, scale: 1.25 }); l.position.set(x, 21, z - HALF + 2); scene.add(l);
      for (const [tx, tz] of [[-16, 0], [16, 0], [0, -0.2]]) if (R() < 0.9 && tx) scene.add(tree(x + tx, z + tz, 0.8));
    }
    for (const [bx, bz, kind] of blocks) {
      const x = bx * GAP, z = bz * GAP;
      if (kind === 'park') {
        addBlockBase(x, z, new THREE.Color('#5d9a52'));
        for (let i = 0; i < 26; i++) scene.add(tree(x + (R() - 0.5) * 30, z + (R() - 0.5) * 30, 0.8 + R() * 0.7));
        const pond = new THREE.Mesh(new THREE.CircleGeometry(5, 24), mat('#3d86b8')); pond.rotation.x = -Math.PI / 2; pond.position.set(x + 3, 0.45, z + 2); scene.add(pond);
      } else {
        addBlockBase(x, z, new THREE.Color('#c9c6bd'));
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
          if (R() < 0.15) continue;
          const w = 7 + R() * 3, d = 7 + R() * 3, h = 6 + R() * (bx > 0 && bz < 0 ? 34 : 16);
          const m = building(w, h, d, pick(R, ['#9aa3ad', '#c7c0b5', '#8d99a6', '#d8d2c4', '#b4a99a']), '#4e5560');
          m.position.x = x - 11 + i * 11; m.position.z = z - 11 + j * 11; m.position.y += 0.3; scene.add(m);
        }
      }
    }
    // горизонт: фонові будівлі
    for (let i = 0; i < 70; i++) {
      const ang = R() * Math.PI * 2, rad = 88 + R() * 45;
      const x = Math.cos(ang) * rad, z = Math.sin(ang) * rad;
      if (z > 70) continue;
      const w = 7 + R() * 6, h = 8 + R() * 40;
      const m = building(w, h, w, pick(R, ['#8f98a3', '#a7a196', '#7d8894', '#b9b2a6']), '#4e5560');
      m.position.x = x; m.position.z = z; scene.add(m);
    }
    // машини
    const carColors = ['#d64a3a', '#2f7fd6', '#f2f2f2', '#2b2b2b', '#e8b33a', '#3d9a4a', '#8a8f99'];
    for (let i = 0; i < 34; i++) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(GEO.carBody, mat(pick(R, carColors))); body.position.y = 0.75; body.castShadow = true;
      const top = new THREE.Mesh(GEO.carTop, mat('#2a3340')); top.position.y = 1.55;
      g.add(body, top);
      const axis = R() < 0.5 ? 'x' : 'z';
      const roads = axis === 'x' ? ROADS.filter((r) => r < 70) : ROADS;
      const dir = R() < 0.5 ? 1 : -1;
      const car = { g, axis, line: pick(R, roads), lane: dir * 1.8 * (axis === 'x' ? 1 : -1), dir, pos: (R() - 0.5) * 150, speed: 9 + R() * 7, idx: i };
      if (axis === 'x') g.rotation.y = Math.PI / 2;
      cars.push(car); scene.add(g);
    }
    // пішоходи
    const pedColors = ['#e05d5d', '#4f8fe0', '#f0c04a', '#5bbf7a', '#b07ad6', '#ffffff', '#ef8a3c', '#3a3a3a'];
    const pblocks = [...DISTRICTS.map((d) => ({ x: DPOS[d.id][0], z: DPOS[d.id][1], w: d.traffic })), { x: -GAP, z: -GAP, w: 40 }, { x: GAP, z: -GAP, w: 30 }, { x: -GAP, z: GAP, w: 25 }, { x: GAP, z: GAP, w: 25 }];
    const tw = pblocks.reduce((s, b) => s + b.w, 0);
    for (let i = 0; i < 160; i++) {
      let r = R() * tw, b = pblocks[0];
      for (const pb of pblocks) { r -= pb.w; if (r <= 0) { b = pb; break; } }
      const g = new THREE.Group();
      const body = new THREE.Mesh(GEO.pedBody, mat(pick(R, pedColors))); body.position.y = 0.95;
      const head = new THREE.Mesh(GEO.pedHead, mat('#e8c4a0')); head.position.y = 1.85;
      g.add(body, head);
      peds.push({ g, b, t: R() * 4, speed: (0.025 + R() * 0.02) * (R() < 0.5 ? 1 : -1), off: 19.3 + R() * 1.2, idx: i, phase: R() * 6 });
      scene.add(g);
    }
    // човни
    for (let i = 0; i < 3; i++) {
      const g = new THREE.Group();
      const hull = new THREE.Mesh(new THREE.BoxGeometry(7, 1.2, 2.6), mat('#f4f4f4')); hull.position.y = 0.6;
      const cab = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.3, 2), mat('#2f7fd6')); cab.position.set(-0.8, 1.8, 0);
      g.add(hull, cab); g.position.set(-150 + i * 100, 0, 88 + i * 9); scene.add(g);
      boats.push({ g, speed: 3 + i * 1.5 });
    }
  }
  function pick(R, arr) { return arr[Math.floor(R() * arr.length)]; }
  function addBlockBase(x, z, color) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(38, 0.3, 38), mat('#a9aaa6')); side.position.set(x, 0.15, z); side.receiveShadow = true; scene.add(side);
    const inner = new THREE.Mesh(new THREE.PlaneGeometry(35, 35), new THREE.MeshLambertMaterial({ color })); inner.rotation.x = -Math.PI / 2; inner.position.set(x, 0.36, z); inner.receiveShadow = true; scene.add(inner);
  }

  // ---------- ділянки ----------
  function lotPos(lot) {
    const list = state.lots.filter((l) => l.district === lot.district);
    const i = list.indexOf(lot), col = i % 4, row = Math.floor(i / 4);
    const [cx, cz] = DPOS[lot.district];
    return { x: cx - 12.75 + col * 8.5, z: cz + (row ? 8 : -8), face: row ? 1 : -1 };
  }
  function lotKey(l) {
    if (l.owner) { const b = bizById(l.owner); return b ? `own:${b.type}:${b.upg.interior}:${b.name}` : 'free'; }
    if (l.npc) return `npc:${l.npc.type}`;
    return `free:${lotRent(l)}`;
  }
  function buildLot(l) {
    const g = new THREE.Group();
    const p = lotPos(l), [w, d] = LOT_DIM[l.size];
    g.position.set(p.x, 0.36, p.z);
    const key = lotKey(l);
    if (key.startsWith('free')) {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d), mat('#8e9094')); slab.position.y = 0.1; slab.receiveShadow = true; g.add(slab);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.2, 0.2), mat('#555')); post.position.set(0, 1.1, p.face * (d / 2 - 0.6)); g.add(post);
      const board = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 0.15), mat('#2e9a5a')); board.position.set(0, 2.4, p.face * (d / 2 - 0.6)); g.add(board);
      const lb = label(`＋ ${l.size} · $${lotRent(l)}/д`, { bg: 'rgba(46,154,90,.9)', font: 26, scale: 0.75 }); lb.position.set(0, 4.4, 0); g.add(lb);
    } else {
      const own = key.startsWith('own');
      const type = own ? bizById(l.owner).type : l.npc.type;
      const T = TYPES[type];
      const h = LOT_H[l.size] + (own ? (bizById(l.owner).upg.interior - 1) * 2 : 0);
      const col = own ? DMAP[l.district].color : '#bdb5a8';
      const m = building(w, h, d, col, own ? '#3b414c' : '#6a6f78'); g.add(m);
      const aw = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, 0.35, 1.6), mat(TYPE_COLOR[type])); aw.position.set(0, 3, p.face * (d / 2 + 0.8)); aw.castShadow = true; g.add(aw);
      const door = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.4, 0.1), mat('#2a2f38')); door.position.set(0, 1.2, p.face * (d / 2 + 0.03)); g.add(door);
      if (own) {
        const ring = new THREE.Mesh(new THREE.RingGeometry(Math.max(w, d) * 0.75, Math.max(w, d) * 0.85, 32), new THREE.MeshBasicMaterial({ color: '#4cc27c', transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
        ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; g.add(ring); g.userData.ring = ring;
        const b = bizById(l.owner);
        const lb = label(`${T.icon} ${b.name.length > 18 ? b.name.slice(0, 17) + '…' : b.name}`, { bg: 'rgba(30,110,64,.92)', border: '#bff0cf', font: 28, scale: 0.9 });
        lb.position.set(0, h + 3.2, 0); g.add(lb); g.userData.label = lb; g.userData.labelY = h + 3.2;
      } else {
        const lb = label(`${T.icon}`, { bg: 'rgba(160,60,52,.85)', font: 30, scale: 0.8 }); lb.position.set(0, h + 2.4, 0); g.add(lb);
      }
    }
    const pk = new THREE.Mesh(new THREE.BoxGeometry(8.4, 14, 13), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    pk.position.y = 7; pk.userData.lotId = l.id; g.add(pk);
    return { g, key, pk };
  }
  function sync() {
    const seen = new Set();
    for (const l of state.lots) {
      seen.add(l.id);
      const key = lotKey(l), cur = lotObjs.get(l.id);
      if (cur && cur.key === key) continue;
      if (cur) scene.remove(cur.g);
      const o = buildLot(l); scene.add(o.g); lotObjs.set(l.id, o);
    }
    for (const [id, o] of lotObjs) if (!seen.has(id)) { scene.remove(o.g); lotObjs.delete(id); }
    pickables = [...lotObjs.values()].map((o) => o.pk);
    sprites = sprites.filter((sp) => { let p = sp.parent; while (p && p !== scene) p = p.parent; return p === scene; });
  }

  // ---------- керування камерою ----------
  function bindControls(el) {
    const pts = new Map();
    let start = null, moved = 0, lastPinch = null;
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('pointerdown', (e) => {
      el.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY, btn: e.button, shift: e.shiftKey });
      if (pts.size === 1) { start = { x: e.clientX, y: e.clientY, t: performance.now() }; moved = 0; }
      lastPinch = null;
    });
    el.addEventListener('pointermove', (e) => {
      const p = pts.get(e.pointerId); if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      if (pts.size === 1) {
        if (p.btn === 2 || p.shift) { camGoal.theta += dx * 0.008; camGoal.phi = clamp(camGoal.phi - dy * 0.005, 0.35, 1.3); }
        else pan(dx, dy);
      } else if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y), ang = Math.atan2(b.y - a.y, b.x - a.x), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        if (lastPinch) {
          camGoal.dist = clamp(camGoal.dist * (lastPinch.dist / dist), 30, 230);
          let da = ang - lastPinch.ang; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI;
          camGoal.theta -= da;
          pan(mx - lastPinch.mx, my - lastPinch.my);
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
    el.addEventListener('wheel', (e) => { e.preventDefault(); camGoal.dist = clamp(camGoal.dist * (1 + e.deltaY * 0.0012), 30, 230); }, { passive: false });
  }
  function pan(dx, dy) {
    const k = camGoal.dist * 0.0021, s = Math.sin(camGoal.theta), c = Math.cos(camGoal.theta);
    camGoal.tx = clamp(camGoal.tx - s * dx * k - c * dy * k, -90, 90);
    camGoal.tz = clamp(camGoal.tz + c * dx * k - s * dy * k, -90, 80);
  }
  function doPick(e) {
    const r = renderer.domElement.getBoundingClientRect();
    const v = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(v, camera);
    const hit = raycaster.intersectObjects(pickables, false)[0];
    if (onPick) onPick(hit ? hit.object.userData.lotId : null);
  }

  // ---------- кадр ----------
  function hourCurve() { return CURVES.grocery[state.hour] || 0; }
  function frame(t) {
    raf = 0;
    if (!container || !container.isConnected || !state) return;
    const dt = Math.min(0.05, (t - lastT) / 1000 || 0); lastT = t;
    if (t - lastSync > 400) { sync(); lastSync = t; }
    // камера
    for (const k of ['tx', 'tz', 'dist', 'theta', 'phi']) cam[k] += (camGoal[k] - cam[k]) * Math.min(1, dt * 10);
    camera.position.set(cam.tx + cam.dist * Math.sin(cam.phi) * Math.cos(cam.theta), cam.dist * Math.cos(cam.phi), cam.tz + cam.dist * Math.sin(cam.phi) * Math.sin(cam.theta));
    camera.lookAt(cam.tx, 0, cam.tz);
    // день/ніч
    const h = state.hour;
    const goal = h >= 8 && h < 18 ? 1 : h >= 6 && h < 8 ? (h - 5) / 3 : h >= 18 && h < 21 ? (21 - h) / 3.5 : 0.04;
    dayF += (goal - dayF) * Math.min(1, dt * 1.5);
    sky.set('#142038').lerp(new THREE.Color(h >= 17 && h < 21 ? '#f2a46b' : '#9fc9ef'), dayF);
    scene.background.copy(sky); scene.fog.color.copy(sky);
    hemi.intensity = 0.4 + 0.25 * dayF;
    const ls = clamp(cam.dist / 115, 0.42, 1.25);
    for (const sp of sprites) sp.scale.set(sp.userData.base.x * ls, sp.userData.base.y * ls, 1);
    sun.intensity = 0.06 + 0.72 * dayF;
    const sa = ((h - 6) / 12) * Math.PI;
    sun.position.set(Math.cos(sa) * 120, 40 + Math.sin(Math.max(0.15, sa)) * 110, -60);
    for (const m of wallMats) m.emissiveIntensity = (1 - dayF) * 0.95;
    // виділення
    const sel = state.ui.lot && lotObjs.get(state.ui.lot);
    if (sel) {
      selRing.visible = true; selRing.position.x = sel.g.position.x; selRing.position.z = sel.g.position.z;
      const l = state.lots.find((x) => x.id === state.ui.lot), s = Math.max(...LOT_DIM[l.size]) * 0.95;
      const pulse = 1 + Math.sin(t / 200) * 0.06; selRing.scale.set(s * pulse, s * pulse, 1);
    } else selRing.visible = false;
    for (const o of lotObjs.values()) if (o.g.userData.label) o.g.userData.label.position.y = o.g.userData.labelY + Math.sin(t / 500 + o.g.position.x) * 0.3;
    // транспорт і люди
    const activity = 0.15 + 0.85 * Math.min(1, hourCurve());
    const nCars = Math.round(cars.length * (0.25 + 0.75 * activity));
    for (const c of cars) {
      c.g.visible = c.idx < nCars;
      if (!c.g.visible) continue;
      c.pos += c.dir * c.speed * dt;
      if (c.pos > 78) c.pos = -78; if (c.pos < -78) c.pos = 78;
      if (c.axis === 'x') { c.g.position.set(c.pos, 0, c.line + c.lane); c.g.rotation.y = c.dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
      else { c.g.position.set(c.line + c.lane, 0, c.pos); c.g.rotation.y = c.dir > 0 ? 0 : Math.PI; }
    }
    const nPeds = Math.round(peds.length * activity * (state.over ? 0 : 1));
    for (const p of peds) {
      p.g.visible = p.idx < nPeds;
      if (!p.g.visible) continue;
      p.t = (p.t + p.speed * dt * 10 + 4) % 4;
      const side = Math.floor(p.t), f = p.t - side, o = p.off, a = -o + 2 * o * f;
      const [x, z] = side === 0 ? [a, -o] : side === 1 ? [o, a] : side === 2 ? [-a, o] : [-o, -a];
      p.g.position.set(p.b.x + x, 0.3 + Math.abs(Math.sin(t / 140 + p.phase)) * 0.12, p.b.z + z);
    }
    for (const b of boats) { b.g.position.x += b.speed * dt; if (b.g.position.x > 200) b.g.position.x = -200; }
    renderer.render(scene, camera);
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

  return {
    ok: () => supported(),
    mount(el, pickFn) {
      try {
        if (!built) init();
        container = el; onPick = pickFn;
        el.appendChild(renderer.domElement);
        resize();
        if (!ro && typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(resize); }
        if (ro) { ro.disconnect(); ro.observe(el); }
        if (!raf) { lastT = performance.now(); raf = requestAnimationFrame(frame); }
      } catch (e) {
        failed = true; console.error(e);
        el.innerHTML = '<p class="muted" style="padding:16px">3D недоступне на цьому пристрої.</p>';
      }
    },
    control(v) {
      if (v === 'in') camGoal.dist = clamp(camGoal.dist * 0.78, 30, 230);
      if (v === 'out') camGoal.dist = clamp(camGoal.dist * 1.28, 30, 230);
      if (v === 'left') camGoal.theta -= Math.PI / 4;
      if (v === 'right') camGoal.theta += Math.PI / 4;
      if (v === 'tilt') camGoal.phi = camGoal.phi > 0.8 ? 0.5 : 1.05;
      if (v === 'reset') Object.assign(camGoal, { tx: 0, tz: 6, dist: 125, theta: Math.PI * 0.32, phi: 0.92 });
    },
    focus(lotId) {
      const l = state.lots.find((x) => x.id === lotId); if (!l) return;
      const p = lotPos(l); camGoal.tx = p.x; camGoal.tz = p.z + 4; camGoal.dist = Math.min(camGoal.dist, 60);
    },
  };
})();
