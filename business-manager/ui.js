'use strict';
/* БІЗНЕС ІМПЕРІЯ — інтерфейс. */

let timer = null, lastMainRender = 0;
const SPEEDS = [0, 1000, 400, 120];
const isMobile = () => window.matchMedia('(max-width: 760px)').matches;

function setSpeed(v) {
  if (!state) return;
  if (state.over) v = 0;
  state.speed = v;
  clearInterval(timer);
  if (v > 0) timer = setInterval(() => { try { tick(); } catch (e) { console.error(e); } render(false); }, SPEEDS[v]);
  renderTop();
}
function toast(msg, kind = '') {
  if (typeof document === 'undefined') return;
  const box = document.getElementById('toasts');
  while (box.children.length > 2) box.firstChild.remove();
  const el = document.createElement('div');
  el.className = 'toast ' + kind; el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => el.classList.add('out'), 2800);
  setTimeout(() => el.remove(), 3300);
}
function showModal(html) { const m = document.getElementById('modal'); m.innerHTML = `<div class="modal-card">${html}</div>`; m.classList.remove('hidden'); }
function hideModal() { document.getElementById('modal').classList.add('hidden'); }
let pendingConfirm = null;
function confirmBox(msg, fn) { pendingConfirm = fn; showModal(`<p>${msg}</p><div class="row end"><button class="btn" data-act="modalClose">Скасувати</button><button class="btn danger" data-act="confirmYes">Так</button></div>`); }

function avatarSVG(look, size = 40) {
  const hair = {
    short: `<path d="M19 27c0-10 6-15 13-15s13 5 13 15c-3-5-8-7-13-7s-10 2-13 7z" fill="${look.hair}"/>`,
    long: `<path d="M18 30c0-12 6-18 14-18s14 6 14 18v14h-5V28c-3-4-6-5-9-5s-6 1-9 5v16h-5z" fill="${look.hair}"/>`,
    bun: `<circle cx="32" cy="11" r="5" fill="${look.hair}"/><path d="M19 27c0-10 6-14 13-14s13 4 13 14c-3-5-8-6-13-6s-10 1-13 6z" fill="${look.hair}"/>`,
    bald: '',
  }[look.style] || '';
  return `<svg class="avatar" viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true"><circle cx="32" cy="32" r="32" fill="#dfe6ef"/><path d="M8 64c2-15 12-20 24-20s22 5 24 20z" fill="${look.shirt}"/><rect x="28" y="36" width="8" height="9" rx="3" fill="${look.skin}"/><circle cx="32" cy="27" r="13" fill="${look.skin}"/>${hair}<circle cx="27" cy="28" r="1.6" fill="#222"/><circle cx="37" cy="28" r="1.6" fill="#222"/><path d="M28 33q4 3 8 0" stroke="#7a4b3a" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>`;
}

const NAV = [
  ['dashboard', '📊', 'Огляд', true], ['map', '🏙️', 'Місто', true], ['businesses', '🏪', 'Магазини', true], ['industry', '🏭', 'Виробництво'],
  ['cars', '🚗', 'Авто'], ['tech', '💻', 'IT і R&D'], ['realty', '🏠', 'Нерухомість'], ['staff', '👥', 'Персонал'],
  ['hq', '🏛️', 'Штаб'], ['regions', '🌍', 'Регіони'], ['ventures', '🚀', 'Стартапи'], ['sponsor', '🏆', 'Спорт'], ['bank', '🏦', 'Банк'], ['stocks', '📈', 'Біржа'], ['ranking', '🥇', 'Топ компаній'], ['finance', '💼', 'Фінанси', true], ['news', '📰', 'Новини'],
  ['life', '🧑', 'Життя'], ['achievements', '🏆', 'Досягнення'], ['settings', '⚙️', 'Гра'], ['admin', '🛠️', 'Адмін'],
];

function renderTop() {
  if (!state) return;
  const sp = ['❚❚', '▶', '▶▶', '▶▶▶'];
  const ph = PHASES[state.econ.phase];
  document.getElementById('topbar').innerHTML = `
    <button class="brand" data-act="nav" data-v="life">${avatarSVG(state.me.look, 30)}<span><b>${esc(state.company)}</b><small>${esc(state.me.name)} · ${city().name}${Object.keys(state.unlocked || {}).length > 1 ? ` +${Object.keys(state.unlocked).length - 1}` : ''}</small></span></button>
    <div class="clock"><span>День ${state.day} · ${WEEKDAYS[weekday()]}</span><b>${pad2(state.hour)}:00</b></div>
    <div class="speed">${sp.map((s, i) => `<button class="${state.speed === i ? 'on' : ''}" data-act="speed" data-v="${i}" aria-label="Швидкість ${i}">${s}</button>`).join('')}</div>
    <div class="cash hide-sm"><span>Економіка</span><b class="phase ${state.econ.phase}">${ph.name}</b></div>
    <div class="cash"><span>Готівка</span><b class="${state.cash < 0 ? 'neg' : ''}">${moneyK(state.cash)}</b></div>
    <div class="cash hide-sm"><span>Капітал</span><b>${moneyK(netWorth())}</b></div>`;
}
function renderNav() {
  const v = state.ui.view, cur = v === 'biz' ? 'businesses' : v === 'fac' ? 'industry' : v;
  const items = NAV.map(([id, ic, n, main]) => `<button class="${cur === id ? 'active' : ''} ${main ? 'main' : 'extra'}" data-act="nav" data-v="${id}"><span class="ic">${ic}</span><span class="lbl">${n}</span></button>`).join('');
  const inMore = !NAV.find((x) => x[0] === cur && x[3]);
  document.getElementById('nav').innerHTML = items + `<button class="more ${inMore ? 'active' : ''}" data-act="more"><span class="ic">☰</span><span class="lbl">Ще</span></button>`;
}

function render(force = true) {
  if (!state) return;
  renderTop();
  const main = document.getElementById('main');
  const ae = document.activeElement;
  if (!force && ae && main.contains(ae) && (ae.tagName === 'INPUT' || ae.tagName === 'SELECT')) return;
  const now = Date.now();
  if (!force && now - lastMainRender < (isMobile() ? 700 : 350)) return;
  if (!force && state.ui.view === 'map' && use3D()) return;
  if (!force && ['settings', 'achievements', 'cars', 'life', 'admin'].includes(state.ui.view)) return;
  lastMainRender = now;
  renderNav();
  const v = VIEWS[state.ui.view] || VIEWS.dashboard;
  const y = main.scrollTop;
  try { main.innerHTML = v(); } catch (e) { console.error(e); main.innerHTML = `<div class="card warn"><p>Помилка відображення: ${esc(e.message)}</p></div>`; }
  if (!force) main.scrollTop = y;
  const c3 = document.getElementById('city3d');
  if (c3) City3D.mount(c3, (id) => { state.ui.lot = id; render(true); }, onCity3DFail);
  document.body.classList.toggle('in-city', !!c3);
  requestAnimationFrame(drawCharts);
}
function onCity3DFail(msg) {
  state.ui.no3d = true;
  toast('3D вимкнено на цьому пристрої: ' + msg, 'bad');
  if (state.ui.view === 'map') render(true);
}
function use3D() { return !state.ui.no3d && typeof City3D !== 'undefined' && City3D.ok(); }

// ---------- малі компоненти ----------
const kpi = (label, value, cls = '', sub = '') => `<div class="kpi"><span>${label}</span><b class="${cls}">${value}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;
function bar(v, max = 100, cls) { const r = clamp(v / max, 0, 1); const c = cls || (r >= 0.7 ? 'good' : r >= 0.45 ? 'mid' : 'bad'); return `<div class="bar ${c}"><i style="width:${(r * 100).toFixed(0)}%"></i></div>`; }
const repBar = (r) => `${bar(r)}<small>${r.toFixed(0)}/100</small>`;
function stars(x) { const n = clamp(Math.round((x - 0.4) * 4.5), 1, 5); return '★'.repeat(n) + '☆'.repeat(5 - n); }
function skillDots(s) { const n = Math.round(s); return `<span class="skill" title="${s.toFixed(1)}">${'●'.repeat(n)}${'○'.repeat(5 - n)}</span> <small>${s.toFixed(1)}</small>`; }
const pn = (v, f = money) => `<span class="${v < 0 ? 'neg' : 'pos'}">${f(v)}</span>`;
const tabsHtml = (tabs, cur) => `<div class="tabs">${tabs.map(([id, n]) => `<button class="${cur === id ? 'on' : ''}" data-act="tab" data-v="${id}">${n}</button>`).join('')}</div>`;
function spark(data, w = 80, h = 24) {
  if (!data || data.length < 2) return '';
  const mn = Math.min(...data), mx = Math.max(...data), r = mx - mn || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1) * w).toFixed(1)},${(h - (v - mn) / r * h).toFixed(1)}`).join(' ');
  const up = data[data.length - 1] >= data[0];
  return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="${pts}" fill="none" stroke="${up ? 'var(--good)' : 'var(--bad)'}" stroke-width="1.5"/></svg>`;
}
const isOpenNow = (b) => state.hour >= b.open && state.hour < b.close;
function bizStatus(b) {
  if (!staffOf(b).length) return '<span class="tag bad">Без персоналу</span>';
  if (!isOpenNow(b)) return '<span class="tag">Зачинено</span>';
  if (stockTotal(b) < 1) return '<span class="tag bad">Немає товару</span>';
  return '<span class="tag good">Відчинено</span>';
}
function facStatus(f) {
  if (!staffOf(f).length) return '<span class="tag bad">Без персоналу</span>';
  if (f.broken) return '<span class="tag bad">Аварія</span>';
  if (f.strike) return '<span class="tag bad">Страйк</span>';
  if (f.yest && f.yest.short) return `<span class="tag mid">${esc(f.yest.short)}</span>`;
  return '<span class="tag good">Працює</span>';
}
const hourOpts = (a, b, sel) => { let s = ''; for (let i = a; i <= b; i++) s += `<option value="${i}" ${i === sel ? 'selected' : ''}>${pad2(i)}:00</option>`; return s; };
const unitOptions = (sel, filter) => [...state.biz, ...state.fac].filter(filter || (() => true)).map((u) => `<option value="${u.id}" ${sel === u.id ? 'selected' : ''}>${u.kind ? FACILITIES[u.kind].icon : TYPES[u.type].icon} ${esc(u.name)} (${staffOf(u).length}/${maxStaff(u)})</option>`).join('');
const goodName = (g) => (g.startsWith('car:') ? '🚗 ' + ((state.carModels.find((m) => 'car:' + m.id === g) || {}).name || 'Авто') : `${GOODS[g].icon} ${GOODS[g].name}`);

const charts = [];
function chartBox(id, series, labels, title, fmt) {
  charts.push({ id, series, labels, fmt });
  const legend = series.filter((s) => s.name).map((s) => `<span><i style="background:${s.color}"></i>${s.name}</span>`).join('');
  return `<div class="card"><h3>${title}</h3>${legend ? `<div class="legend">${legend}</div>` : ''}<canvas id="${id}" height="170"></canvas></div>`;
}
function drawCharts() {
  const cs = getComputedStyle(document.documentElement);
  const grid = cs.getPropertyValue('--line').trim(), txt = cs.getPropertyValue('--muted').trim();
  while (charts.length) {
    const c = charts.shift();
    const cv = document.getElementById(c.id);
    if (!cv) continue;
    const w = cv.clientWidth, h = 170, dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = w * dpr; cv.height = h * dpr;
    const g = cv.getContext('2d'); g.scale(dpr, dpr);
    const all = c.series.flatMap((s) => s.data).filter((v) => isFinite(v));
    if (!all.length) { g.fillStyle = txt; g.font = '13px system-ui'; g.fillText('Даних поки немає — зачекайте кінця дня.', 10, h / 2); continue; }
    const mn = Math.min(0, ...all), mx = Math.max(...all, 1);
    const padL = 52, padB = 20, padT = 8, pw = w - padL - 8, ph = h - padB - padT;
    const y = (v) => padT + ph - ((v - mn) / (mx - mn || 1)) * ph;
    g.strokeStyle = grid; g.fillStyle = txt; g.font = '11px system-ui'; g.lineWidth = 1;
    const f = c.fmt || ((v) => (Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : Math.abs(v) >= 1000 ? (v / 1000).toFixed(0) + 'k' : v.toFixed(Math.abs(v) < 10 ? 1 : 0)));
    for (let i = 0; i <= 4; i++) { const v = mn + (mx - mn) * i / 4, yy = y(v); g.beginPath(); g.moveTo(padL, yy); g.lineTo(w - 8, yy); g.stroke(); g.fillText(f(v), 4, yy + 4); }
    const n = Math.max(...c.series.map((s) => s.data.length));
    const x = (i) => padL + (n <= 1 ? pw / 2 : (i / (n - 1)) * pw);
    const step = Math.ceil(n / 7);
    c.labels.forEach((l, i) => { if (i % step === 0) g.fillText(l, x(i) - 6, h - 5); });
    for (const s of c.series) {
      g.strokeStyle = s.color; g.lineWidth = 2; g.beginPath();
      s.data.forEach((v, i) => (i ? g.lineTo(x(i), y(v)) : g.moveTo(x(i), y(v))));
      g.stroke();
    }
  }
}
const logList = (n = 12) => `<ul class="log">${state.log.slice(0, n).map((l) => `<li class="${l.kind}"><small>Д${l.day} ${pad2(l.hour)}:00</small> ${esc(l.msg)}</li>`).join('')}</ul>`;
function econStrip() {
  const e = state.econ;
  return `<div class="econ"><span class="phase ${e.phase}">${PHASES[e.phase].name}</span><span>ВВП <b>${e.growth.toFixed(1)}%</b></span><span>Інфляція <b>${e.inflation.toFixed(1)}%</b></span><span>Ставка <b>${e.rate.toFixed(2)}%</b></span><span>Безробіття <b>${e.unemployment.toFixed(1)}%</b></span><span>Попит <b>×${e.demand.toFixed(2)}</b></span><span>Ціни <b>×${priceLvl().toFixed(2)}</b></span></div>`;
}

// ================= Екрани =================
const VIEWS = {
  dashboard() {
    const last = state.ledger[state.ledger.length - 1];
    const units = state.biz.length + state.fac.length;
    let html = `<h1>Огляд</h1>${econStrip()}<div class="kpis">
      ${kpi('Готівка', money(state.cash), state.cash < 0 ? 'neg' : '')}
      ${kpi('Чистий капітал', moneyK(netWorth()))}
      ${kpi('Прибуток учора', last ? money(last.profit) : '—', last && last.profit < 0 ? 'neg' : 'pos')}
      ${kpi('Борг', money(debt()), debt() ? 'neg' : '', debt() ? `рейтинг ${Math.round(state.me.credit)}` : '')}
      ${state.ipo ? kpi('Капіталізація', moneyK(state.ipo.price * state.ipo.shares)) : kpi('Об’єктів', units)}
    </div>`;
    const alerts = [];
    for (const b of state.biz) { if (!staffOf(b).length) alerts.push(`👥 «${esc(b.name)}» без персоналу. <a data-act="biz" data-id="${b.id}">Відкрити</a>`); else if (stockTotal(b) < 1 && productsOf(b).length) alerts.push(`📦 «${esc(b.name)}»: немає товару. <a data-act="biz" data-id="${b.id}">Відкрити</a>`); }
    for (const f of state.fac) { if (!staffOf(f).length) alerts.push(`👥 ${esc(f.name)} без персоналу. <a data-act="fac" data-id="${f.id}">Відкрити</a>`); else if (f.broken || f.strike) alerts.push(`⚠️ ${esc(f.name)}: ${f.broken ? 'аварія' : 'страйк'}. <a data-act="fac" data-id="${f.id}">Відкрити</a>`); }
    if (state.cash < 0) alerts.push('💸 Від’ємний баланс! 3 дні нижче ліміту — банкрутство.');
    if (units >= 3 && !state.flags.autoManagers && [...state.biz, ...state.fac].some((x) => !x.manager)) alerts.push('🧑‍💼 Забагато рутини? <a data-act="nav" data-v="staff">Персонал → Відділи</a> → передайте все керуючим.');
    if (alerts.length) html += `<div class="card warn">${alerts.slice(0, 6).map((a) => `<p>${a}</p>`).join('')}</div>`;
    if (!units) {
      html += `<div class="card hero"><h2>Шлях від нуля до імперії</h2><ol>
        <li><b>Життя</b> → влаштуйтесь на роботу, щоб мати стабільний дохід.</li>
        <li><b>Банк</b> → кредит, якщо не хочете чекати.</li>
        <li><b>Місто</b> → торкніться вільної ділянки ＋ і відкрийте перший магазин.</li>
        <li>Далі: заводи, авто, IT, нерухомість, біржа й IPO.</li></ol>
        <div class="row wrap"><button class="btn primary" data-act="nav" data-v="map">🏙️ До міста</button><button class="btn" data-act="nav" data-v="life">🧑 Робота</button></div></div>`;
    } else {
      html += `<div class="card"><h3>Мої об’єкти</h3><div class="table-wrap"><table><thead><tr><th>Об’єкт</th><th>Статус</th><th>Сьогодні / учора</th></tr></thead><tbody>
      ${state.biz.map((b) => `<tr class="click" data-act="biz" data-id="${b.id}"><td>${TYPES[b.type].icon} ${esc(b.name)}<br><small>${DMAP[lotOf(b).district].name} · реп. ${b.rep.toFixed(0)}</small></td><td>${bizStatus(b)}</td><td>${money(b.today.rev)}<br><small class="${b.yest && b.yest.profit < 0 ? 'neg' : 'pos'}">${b.yest ? money(b.yest.profit) : '—'}</small></td></tr>`).join('')}
      ${state.fac.map((f) => `<tr class="click" data-act="fac" data-id="${f.id}"><td>${FACILITIES[f.kind].icon} ${esc(f.name)}<br><small>рівень ${f.level} · стан ${f.cond.toFixed(0)}%</small></td><td>${facStatus(f)}</td><td>${f.yest && f.yest.out ? `${Math.round(f.yest.out).toLocaleString('uk-UA')} од.` : f.yest && f.yest.devPts ? `${f.yest.devPts.toFixed(0)} оч.` : '—'}</td></tr>`).join('')}
      </tbody></table></div></div>`;
    }
    if (state.mods.length) html += `<div class="card"><h3>Активні події</h3><div class="chips">${state.mods.map((m) => `<span class="chip">${m.label} · ${m.days} дн.</span>`).join('')}</div></div>`;
    const h = state.history.slice(-30);
    html += `<div class="grid2">${chartBox('chNw', [{ data: h.map((x) => x.nw), color: '#a3558a', name: 'Капітал' }, { data: h.map((x) => x.cash), color: '#3f7fc4', name: 'Готівка' }], h.map((x) => String(x.day)), 'Капітал і готівка')}
      <div class="card"><h3>Журнал</h3>${logList(14)}</div></div>`;
    return html;
  },

  map() {
    const sel = state.ui.lot && lotById(state.ui.lot);
    if (use3D()) {
      return `<div class="city-wrap"><div id="city3d"></div>
        <div class="city-hint">${cityChips()}${sel ? '' : '<div>Торкніться будівлі або ділянки ＋</div>'}</div>
        <div class="city-ctrl">
          <button data-act="cam" data-v="in" aria-label="Наблизити">＋</button><button data-act="cam" data-v="out" aria-label="Віддалити">−</button>
          <button data-act="cam" data-v="left" aria-label="Повернути ліворуч">⟲</button><button data-act="cam" data-v="right" aria-label="Повернути праворуч">⟳</button>
          <button data-act="cam" data-v="tilt" aria-label="Нахил">◩</button><button data-act="cam" data-v="reset" aria-label="Скинути камеру">⌂</button>
          <button data-act="toggle3d" aria-label="2D-мапа">2D</button>
        </div>${sel ? `<div class="sheet">${lotPanel(sel)}</div>` : ''}</div>`;
    }
    let html = `<div class="chips filter">${cityChips()}</div><div class="row between"><h1>${CITIES[viewCity()].name}</h1>${typeof City3D !== 'undefined' && City3D.ok() ? '<button class="btn sm" data-act="toggle3d">🏙️ 3D</button>' : ''}</div><p class="muted"><span class="lg own"></span> ваші · <span class="lg npc"></span> конкуренти · <span class="lg free"></span> вільні</p><div class="map">`;
    for (const d of DISTRICTS) {
      html += `<div class="district" style="--dc:${d.color}"><div class="dh"><b>${d.name}</b><small>${d.zone === 'industry' ? 'Промислова зона' : 'Потік ' + d.traffic} · оренда ×${d.rent}</small></div><div class="lots">`;
      for (const l of state.lots.filter((x) => x.district === d.id && lotCityId(x) === viewCity())) {
        const cls = l.owner || (l.npc && isSub(coById(l.npc.co))) ? 'own' : l.npc ? 'npc' : 'free';
        html += `<button class="lot ${cls} ${sel === l ? 'sel' : ''}" data-act="selLot" data-id="${l.id}" title="${esc(l.addr)}"><span>${lotIcon(l)}</span><small>${l.size}</small></button>`;
      }
      html += '</div></div>';
    }
    html += '</div>';
    if (sel) html += lotPanel(sel);
    return html;
  },

  businesses() {
    if (!state.biz.length) return `<h1>Магазини</h1><div class="card hero"><p>У вас ще немає магазинів.</p><button class="btn primary" data-act="nav" data-v="map">🏙️ Обрати приміщення</button></div>`;
    return `<h1>Магазини і заклади</h1><div class="cards">${state.biz.map((b) => {
      const T = TYPES[b.type], lot = lotOf(b);
      return `<div class="card bizcard click" data-act="biz" data-id="${b.id}">
        <div class="row"><span class="big">${T.icon}</span><div><b>${esc(b.name)}</b><br><small>${DMAP[lot.district].name} · ${SIZES[lot.size].name}</small></div></div>
        <div class="row between">${bizStatus(b)}<small>${pad2(b.open)}:00–${pad2(b.close)}:00</small></div>
        <div class="rep">${repBar(b.rep)}</div>
        <div class="mini"><span>Сьогодні<br><b>${money(b.today.rev)}</b></span><span>Учора<br><b class="${b.yest && b.yest.profit < 0 ? 'neg' : 'pos'}">${b.yest ? money(b.yest.profit) : '—'}</b></span><span>Персонал<br><b>${staffOf(b).length}/${maxStaff(b)}</b></span><span>Склад<br><b>${Math.round(stockTotal(b) / storageCap(b) * 100)}%</b></span></div>
      </div>`;
    }).join('')}</div>`;
  },

  biz() {
    const b = bizById(state.ui.bizId);
    if (!b) { state.ui.view = 'businesses'; return VIEWS.businesses(); }
    const T = TYPES[b.type], lot = lotOf(b);
    const tab = state.ui.tab || 'overview';
    return `<button class="btn ghost" data-act="nav" data-v="businesses">← Усі магазини</button>
      <div class="bizhead"><span class="big">${T.icon}</span><div><h1>${esc(b.name)} <button class="btn ghost sm" data-act="rename" data-id="${b.id}" aria-label="Перейменувати">✏️</button><button class="btn ghost sm" data-act="showOnMap" data-id="${b.id}" aria-label="Показати в місті">📍</button></h1>
      <small>${T.name} · ${DMAP[lot.district].name}, ${esc(lot.addr)} · ${SIZES[lot.size].name} (${SIZES[lot.size].m2} м²)</small></div>${bizStatus(b)}</div>
      ${tabsHtml([['overview', 'Огляд'], ['products', 'Товари'], ['staff', 'Персонал'], ['marketing', 'Маркетинг'], ['upgrades', 'Покращення']], tab)}
      ${(BIZ_TABS[tab] || BIZ_TABS.overview)(b)}`;
  },

  industry() {
    const tab = ['units', 'warehouse', 'market', 'logistics'].includes(state.ui.tab) ? state.ui.tab : 'units';
    let html = `<h1>Виробництво і логістика</h1>${tabsHtml([['units', 'Підприємства'], ['warehouse', 'Склад'], ['market', 'Ринок B2B'], ['logistics', 'Логістика']], tab)}`;
    if (tab === 'units') {
      const fs = state.fac;
      if (!fs.length) html += `<div class="card hero"><p>Підприємства будуються на ділянках у <b>Промзоні</b> та <b>Порту</b>. IT-офіси — на ділянках у торгових районах.</p><p class="muted">Приклад ланцюжка: шахта → металургійний комбінат → автозавод → автосалон.</p><button class="btn primary" data-act="nav" data-v="map">🏙️ Обрати ділянку</button></div>`;
      else html += `<div class="cards">${fs.map((f) => {
        const F = FACILITIES[f.kind], r = facRecipe(f);
        return `<div class="card bizcard click" data-act="fac" data-id="${f.id}"><div class="row"><span class="big">${F.icon}</span><div><b>${esc(f.name)}</b><br><small>${DMAP[lotOf(f).district].name} · рівень ${f.level}</small></div></div>
          <div class="row between">${facStatus(f)}<small>${r ? (r.model ? '🚗 ' + esc(r.model.name) : goodName(r.out === 'power' ? 'oil' : r.out).replace('Нафта', 'Електроенергія')) : f.kind === 'office' ? 'IT' : ''}</small></div>
          <div>${bar(f.cond)}<small>Стан обладнання ${f.cond.toFixed(0)}%</small></div>
          <div class="mini"><span>Учора<br><b>${f.yest ? (f.yest.out ? Math.round(f.yest.out).toLocaleString('uk-UA') : f.yest.devPts ? f.yest.devPts.toFixed(0) + ' оч.' : '0') : '—'}</b></span><span>Персонал<br><b>${staffOf(f).length}/${maxStaff(f)}</b></span><span>Ефект.<br><b>${f.kind === 'office' ? '—' : pct(facStaffFactor(f), 0)}</b></span></div></div>`;
      }).join('')}</div>`;
    } else if (tab === 'warehouse') {
      const goods = Object.entries(state.wh.goods);
      html += `<div class="card"><p>Заповненість: <b>${Math.round(whUsed()).toLocaleString('uk-UA')}</b> / ${whCap().toLocaleString('uk-UA')} (вагових од.)</p>${bar(whUsed(), whCap(), whUsed() / whCap() > 0.9 ? 'bad' : 'good')}<p class="muted">Логістичні центри збільшують склад на 100 000 і здешевлюють перевезення на 30%.</p></div>`;
      const clients = Object.entries(state.contracts || {}).sort((a, b) => b[1].total - a[1].total).slice(0, 10);
      html += `<div class="card"><h3>📑 Контракти з компаніями</h3><p class="muted">Конкуренти щодня купують продукцію з вашого складу за ціною на 8% вищою за ринкову (з урахуванням відділу продажів): мережі — хліб, молочку, овочі; автовиробники — сталь, пластик, мікросхеми; техкомпанії — електроніку. Запас «лишати» з автопродажу не продається.</p>
        <label class="switch"><input type="checkbox" data-change="contracts" ${state.flags.noContracts ? '' : 'checked'}> Продавати компаніям за контрактами</label>
        ${clients.length ? `<div class="table-wrap"><table><thead><tr><th>Клієнт</th><th>Купує</th><th>Усього</th></tr></thead><tbody>${clients.map(([, c]) => `<tr><td>${esc(c.name)}</td><td>${Object.keys(c.goods).map((g) => GOODS[g].icon).join(' ')}</td><td>${moneyK(c.total)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Поки немає закупівель: побудуйте завод, і компанії відповідних галузей почнуть купувати.</p>'}</div>`;
      if (!goods.length) html += `<div class="card"><p class="muted">Склад порожній. Продукція заводів і закупівлі з ринку з’являться тут.</p></div>`;
      else html += `<div class="table-wrap card"><table><thead><tr><th>Товар</th><th>К-сть</th><th>Собівартість</th><th>Ринок</th><th>Продати</th><th>Автопродаж</th></tr></thead><tbody>${goods.map(([g, x]) => {
        const car = g.startsWith('car:');
        const s = state.autoSell[g] || { on: false, keep: 0 };
        return `<tr><td>${goodName(g)}</td><td>${Math.floor(x.qty).toLocaleString('uk-UA')}</td><td>${money(x.cost, 2)}</td><td>${car ? '—' : money(sellPrice(g), 2)}</td>
          <td>${car ? '<small>через автосалони</small>' : `<div class="row nowrap"><input type="number" min="1" value="${Math.floor(x.qty)}" id="sell-${g}" aria-label="Кількість"><button class="btn sm" data-act="mktSell" data-g="${g}">Продати</button></div>`}</td>
          <td>${car ? '' : `<label class="switch"><input type="checkbox" data-change="autoSell" data-g="${g}" ${s.on ? 'checked' : ''}> лишати</label><input type="number" min="0" value="${s.keep}" data-change="autoKeep" data-g="${g}" aria-label="Залишок" style="width:80px">`}</td></tr>`;
      }).join('')}</tbody></table></div>`;
    } else if (tab === 'market') {
      html += `<div class="card"><p class="muted">Ціни залежать від інфляції, попиту та ваших обсягів: великі продажі знижують ціну, великі закупівлі — підвищують. Доставка — наступного ранку. Транспорт: ${money(0.012 * priceLvl() * city().transport * transportDiscount(), 3)} за вагову одиницю.</p></div>
      <div class="table-wrap card"><table><thead><tr><th>Товар</th><th>Купівля</th><th>Продаж</th><th>Тренд</th><th>На складі</th><th>Замовити</th></tr></thead><tbody>${Object.entries(GOODS).map(([g, G]) => `<tr><td>${G.icon} ${G.name}${G.raw ? ' <small class="muted">сировина</small>' : ''}</td><td>${money(buyPrice(g), 2)}</td><td>${money(sellPrice(g), 2)}</td><td>${state.market[g].mult >= 1 ? '<span class="neg">▲</span>' : '<span class="pos">▼</span>'} ×${state.market[g].mult.toFixed(2)}</td><td>${Math.floor(whQty(g)).toLocaleString('uk-UA')}</td><td><div class="row nowrap"><input type="number" min="1" step="100" value="1000" id="buy-${g}" aria-label="Кількість"><button class="btn sm" data-act="mktBuy" data-g="${g}">Купити</button></div></td></tr>`).join('')}</tbody></table></div>`;
    } else {
      html += `<div class="kpis">${kpi('Логістичних центрів', state.fac.filter((f) => f.kind === 'logistics').length)}${kpi('Знижка на транспорт', pct(1 - transportDiscount(), 0))}${kpi('Місткість складу', whCap().toLocaleString('uk-UA'))}${kpi('Ціна електроенергії', money(state.econ.power * priceLvl(), 0) + '/МВт·год')}</div>
        <div class="card"><h3>Замовлення в дорозі</h3>${state.orders.length ? `<table><thead><tr><th>Товар</th><th>К-сть</th><th>Прибуде</th></tr></thead><tbody>${state.orders.map((o) => `<tr><td>${goodName(o.g)}</td><td>${o.qty.toLocaleString('uk-UA')}</td><td>День ${o.day}, 06:00</td></tr>`).join('')}</tbody></table>` : '<p class="muted">Немає активних поставок.</p>'}</div>
        <div class="card"><h3>Як працює логістика</h3><ul class="help"><li>Кожна покупка та продаж на ринку оплачує перевезення пропорційно вазі вантажу.</li><li>Поставки приходять о 06:00 наступного дня; іноді затримуються через затори в порту.</li><li>Заводи з «автопостачанням» купують сировину одразу (+3% за терміновість).</li><li>Логістичні центри (Промзона/Порт) потребують персоналу, щоб працювати.</li><li>Без електростанції енергія купується з мережі; надлишок власної — продається.</li></ul></div>`;
    }
    return html;
  },

  fac() {
    const f = facById(state.ui.facId);
    if (!f) { state.ui.view = 'industry'; return VIEWS.industry(); }
    const F = FACILITIES[f.kind], lot = lotOf(f);
    const tab = state.ui.tab === 'staff' ? 'staff' : 'overview';
    return `<button class="btn ghost" data-act="nav" data-v="industry">← Виробництво</button>
      <div class="bizhead"><span class="big">${F.icon}</span><div><h1>${esc(f.name)} <button class="btn ghost sm" data-act="rename" data-id="${f.id}" aria-label="Перейменувати">✏️</button><button class="btn ghost sm" data-act="showOnMap" data-id="${f.id}" aria-label="Показати в місті">📍</button></h1>
      <small>${F.name} · ${DMAP[lot.district].name}, ${esc(lot.addr)} · рівень ${f.level}</small></div>${facStatus(f)}</div>
      ${tabsHtml([['overview', f.kind === 'office' ? 'Проєкти' : 'Виробництво'], ['staff', 'Персонал']], tab)}
      ${tab === 'staff' ? staffTab(f) : f.kind === 'office' ? officeTab(f) : facTab(f)}`;
  },

  cars() {
    const d = state.ui.carDraft || (state.ui.carDraft = { name: 'Модель ' + (state.carModels.length + 1), seg: 'family', engine: 'i4', mat: 'steel', trim: 2 });
    const s = carStats(d);
    const sel = (k, obj, cur) => Object.entries(obj).map(([id, o]) => `<option value="${id}" ${cur === id ? 'selected' : ''}>${o.name}</option>`).join('');
    const plants = state.fac.filter((f) => f.kind === 'carplant').length, dealers = state.biz.filter((b) => b.type === 'dealership').length;
    let html = `<h1>Автомобільний бізнес</h1>
      <div class="kpis">${kpi('Моделей', state.carModels.length)}${kpi('Автозаводів', plants)}${kpi('Автосалонів', dealers)}${kpi('Продано авто', sum(state.carModels, (m) => m.sold))}${kpi('Технології авто', 'рівень ' + state.tech.auto)}</div>
      ${!plants || !dealers ? `<div class="card warn"><p>Ланцюжок: <b>автозавод</b> (Промзона, XL) виробляє авто зі сталі, пластику й мікросхем → <b>автосалони</b> (торгові райони) продають їх. Конкуренти: ${aliveCos().filter((c) => c.sector === 'dealership').map((c) => esc(c.name)).join(', ')}.</p></div>` : ''}
      <div class="grid2"><div class="card"><h3>Конструктор автомобіля</h3>
        <label>Назва <input value="${esc(d.name)}" data-change="car" data-k="name" maxlength="30"></label>
        <label>Сегмент <select data-change="car" data-k="seg">${sel('seg', SEGMENTS, d.seg)}</select></label>
        <label>Двигун <select data-change="car" data-k="engine">${sel('engine', ENGINES, d.engine)}</select></label>
        <label>Кузов <select data-change="car" data-k="mat">${sel('mat', MATERIALS, d.mat)}</select></label>
        <label>Комплектація <select data-change="car" data-k="trim">${[1, 2, 3].map((t) => `<option value="${t}" ${+d.trim === t ? 'selected' : ''}>${['Базова', 'Комфорт', 'Люкс'][t - 1]}</option>`).join('')}</select></label>
        ${SEGMENTS[d.seg].engines.includes(d.engine) ? '' : '<p class="neg">Двигун погано підходить для сегмента: −якість.</p>'}
        <button class="btn primary" data-act="designCar">Розробити за ${money(s.designCost)}</button></div>
      <div class="card"><h3>Характеристики</h3><table class="pl">
        <tr><td>Якість</td><td><b>${s.quality}/100</b></td></tr><tr><td>Потужність</td><td>${s.hp} к.с.</td></tr><tr><td>Маса</td><td>${s.weight} кг</td></tr>
        <tr><td>Макс. швидкість</td><td>${s.speed} км/год</td></tr><tr><td>Витрата</td><td>${s.fuel}</td></tr>
        <tr><td>Сталь / пластик / мікросхеми</td><td>${s.steel} / ${s.plastic} / ${s.chips}</td></tr>
        <tr><td>Комплектуючі</td><td>${money(s.comp * priceLvl())}</td></tr>
        <tr><td>Собівартість (оцінка)</td><td>${money(s.estCost)}</td></tr>
        <tr class="tot"><td>Ринкова ціна</td><td class="pos">${money(s.fairBase * priceLvl())}</td></tr></table></div></div>`;
    if (state.carModels.length) html += `<div class="card"><h3>Модельний ряд</h3><div class="table-wrap"><table><thead><tr><th>Модель</th><th>Якість</th><th>Ринкова ціна</th><th>Вироблено / продано</th><th>На складі</th><th></th></tr></thead><tbody>${state.carModels.map((m) => `<tr><td>🚗 ${esc(m.name)}<br><small>${SEGMENTS[m.seg].name} · ${ENGINES[m.engine].name}</small></td><td>${m.quality}</td><td>${money(m.fairBase * priceLvl())}</td><td>${m.produced} / ${m.sold}</td><td>${Math.floor(whQty('car:' + m.id))}</td><td><button class="btn sm ${m.active ? '' : 'primary'}" data-act="carToggle" data-id="${m.id}">${m.active ? 'Зняти з виробництва' : 'Повернути'}</button></td></tr>`).join('')}</tbody></table></div></div>`;
    return html;
  },

  tech() {
    const live = state.projects.filter((p) => p.status !== 'dev');
    let html = `<h1>IT і дослідження</h1><div class="kpis">${kpi('Очки досліджень', Math.floor(state.tech.points))}${kpi('R&D у день', state.depts.rnd * 12, '', 'від відділу R&D + вільні програмісти')}${kpi('IT-продуктів', live.filter((p) => p.status === 'live').length)}${kpi('Дохід IT сьогодні', money(sum(live, (p) => (p.status === 'live' ? p.rev : 0))))}</div>
      <div class="cards">${Object.entries(RESEARCH).map(([k, R]) => `<div class="card camp"><span class="big">${R.icon}</span><div><b>${R.name}</b> <span class="tag">рівень ${state.tech[k]}</span><br><small>${R.desc}</small></div><button class="btn primary sm" ${state.tech.points < researchCost(k) ? 'disabled' : ''} data-act="research" data-k="${k}">${researchCost(k)} оч.</button></div>`).join('')}</div>`;
    html += `<div class="card"><h3>IT-продукти</h3>`;
    if (!state.projects.length) html += `<p class="muted">Відкрийте IT-офіс на ділянці в торговому районі (найкраще — Діловий квартал або Студмістечко), найміть програмістів і почніть проєкт.</p>`;
    else html += `<div class="table-wrap"><table><thead><tr><th>Продукт</th><th>Статус</th><th>Якість</th><th>Користувачі</th><th>Дохід/день</th><th>Усього</th><th></th></tr></thead><tbody>${state.projects.map((p) => `<tr><td>${SOFT[p.kind].icon} ${esc(p.name)}</td><td>${p.status === 'dev' ? `розробка ${pct(p.progress / p.work, 0)}` : p.status === 'live' ? '<span class="tag good">на ринку</span>' : '<span class="tag">знято</span>'}</td><td>${p.quality || '—'}</td><td>${Math.round(p.users).toLocaleString('uk-UA')}</td><td>${money(p.rev)}</td><td>${moneyK(p.total)}</td><td>${p.status === 'live' ? `<button class="btn sm" data-act="promo" data-id="${p.id}">Промо ${moneyK(12000 * priceLvl())}</button>` : ''}</td></tr>`).join('')}</tbody></table></div>`;
    return html + '</div>';
  },

  realty() {
    const mine = state.props.filter((p) => p.owned), market = state.props.filter((p) => !p.owned && !p.lotId);
    let html = `<h1>Нерухомість</h1><div class="kpis">${kpi('Мої об’єкти', mine.length)}${kpi('Вартість', moneyK(propertyValue()))}${kpi('Оренда/день', money(sum(mine, (p) => (p.tenant ? p.tenant.rent : 0))))}${kpi('Індекс цін', '×' + state.econ.housing.toFixed(2))}</div>`;
    html += `<div class="card"><h3>Мої об’єкти</h3>`;
    if (!mine.length) html += `<p class="muted">Немає нерухомості. Купіть квартиру нижче або збудуйте ТЦ / ЖК / бізнес-центр на великій ділянці в місті.</p>`;
    else html += `<div class="table-wrap"><table><thead><tr><th>Об’єкт</th><th>Вартість</th><th>Стан</th><th>Дії</th></tr></thead><tbody>${mine.map((p) => {
      const K = PROP_KINDS[p.kind];
      const st = p.building ? `🏗️ будівництво: ${p.building} дн.` : state.me.homeProp === p.id ? '🏠 ви тут живете' : p.tenant ? `орендар: ${money(p.tenant.rent)}/день` : p.rentOut ? 'шукаємо орендаря…' : 'вільний';
      return `<tr><td>${K.icon} ${K.name}<br><small>${esc(p.addr)} · ${DMAP[p.district].name}${p.mortgage ? ' · іпотека' : ''}</small></td><td>${money(p.building ? p.cost : propValue(p))}</td><td>${st}</td><td><div class="row wrap">${p.building ? '' : `${!p.rentOut && state.me.homeProp !== p.id ? `<button class="btn sm primary" data-act="rentOut" data-id="${p.id}">Здати</button>` : ''}${p.rentOut ? `<button class="btn sm" data-act="rentOut" data-id="${p.id}">Не здавати</button>` : ''}${K.live && state.me.homeProp !== p.id ? `<button class="btn sm" data-act="liveIn" data-id="${p.id}">Жити тут</button>` : ''}<button class="btn sm danger" data-act="sellProp" data-id="${p.id}">Продати</button>`}</div></td></tr>`;
    }).join('')}</tbody></table></div>`;
    html += `</div><div class="card"><h3>Ринок нерухомості</h3><p class="muted">Ціни залежать від району, ставки ЦБ та стану економіки. Іпотека: 25% внесок, ставка ${(creditRate() - 1).toFixed(1)}%.</p><div class="table-wrap"><table><thead><tr><th>Об’єкт</th><th>Ціна</th><th>Дохідність</th><th></th></tr></thead><tbody>${market.map((p) => `<tr><td>${PROP_KINDS[p.kind].icon} ${PROP_KINDS[p.kind].name}<br><small>${esc(p.addr)} · ${DMAP[p.district].name}</small></td><td>${money(propBuyPrice(p))}</td><td>${pct(PROP_KINDS[p.kind].yield)}/рік</td><td><div class="row wrap"><button class="btn sm primary" ${state.cash < propBuyPrice(p) ? 'disabled' : ''} data-act="buyProp" data-id="${p.id}">Купити</button><button class="btn sm" data-act="buyPropM" data-id="${p.id}">Іпотека</button></div></td></tr>`).join('')}</tbody></table></div></div>`;
    return html;
  },

  staff() {
    const tab = ['hire', 'team', 'depts'].includes(state.ui.tab) ? state.ui.tab : 'team';
    const units = [...state.biz, ...state.fac];
    let html = `<h1>Персонал і корпорація</h1>${tabsHtml([['team', `Працівники (${state.staff.length})`], ['hire', 'Найм'], ['depts', 'Відділи']], tab)}`;
    if (tab === 'hire') {
      html += `<div class="card"><p class="muted">Ролі: ${Object.values(ROLES).join(', ')}. Працівник не за профілем працює на 55%. Кандидати оновлюються щодня; зарплати ростуть з інфляцією та низьким безробіттям.</p>`;
      if (!units.length) html += '<p>Спочатку відкрийте бізнес або підприємство.</p>';
      html += `<div class="table-wrap"><table><thead><tr><th>Кандидат</th><th>Роль</th><th>Навичка</th><th>Ставка</th><th>Найняти в</th></tr></thead><tbody>${state.candidates.map((c) => `<tr><td>${esc(c.name)}</td><td>${ROLES[c.role]}</td><td>${skillDots(c.skill)}</td><td>${money(c.wage, 1)}/год</td><td>${units.length ? `<div class="row nowrap"><select id="hire-${c.id}">${unitOptions(state.ui.bizId || state.ui.facId)}</select><button class="btn primary sm" data-act="hire" data-id="${c.id}">Найняти</button></div>` : '—'}</td></tr>`).join('')}</tbody></table></div></div>`;
    } else if (tab === 'team') {
      if (!state.staff.length) html += '<div class="card"><p class="muted">Поки нікого не найнято.</p></div>';
      else html += `<div class="card"><div class="table-wrap"><table><thead><tr><th>Працівник</th><th>Навичка</th><th>Мораль</th><th>Ставка</th><th>Місце</th><th></th></tr></thead><tbody>${state.staff.map((p) => `<tr><td>${esc(p.name)}<br><small>${ROLES[p.role]}</small></td><td>${skillDots(p.skill)}</td><td>${bar(p.morale)}<small>${p.morale.toFixed(0)}</small></td><td>${money(p.wage, 1)}<br><small class="${p.wage < marketWage(p) ? 'neg' : 'muted'}">ринок ${money(marketWage(p), 1)}</small></td><td><select data-change="transfer" data-id="${p.id}">${unitOptions(p.unit)}</select></td><td><div class="row nowrap"><button class="btn sm" data-act="raise" data-id="${p.id}">+10%</button><button class="btn danger sm" data-act="fire" data-id="${p.id}">✕</button></div></td></tr>`).join('')}</tbody></table></div></div>`;
    } else {
      const nm = [...state.biz, ...state.fac].filter((x) => x.manager).length, tot = state.biz.length + state.fac.length;
      html += `<div class="card"><h3>🧑‍💼 Аутсорс управління</h3><p>Керуючі ведуть об’єкти замість вас: закупівлі, ціни, найм, ремонти, нові IT-проєкти. ${money(managerCost())}/день за кожен об’єкт.</p><p class="muted">Зараз з керуючим: ${nm}/${tot}.${state.flags.autoManagers ? ' Нові об’єкти отримують керуючого автоматично.' : ''}</p>
        <div class="row wrap">${state.flags.autoManagers ? '<button class="btn" data-act="allManagers" data-v="0">Відкликати всіх керуючих</button>' : '<button class="btn primary" data-act="allManagers" data-v="1">Призначити керуючих усюди</button>'}</div></div>
      <div class="card"><p class="muted">Відділи головного офісу працюють на всю корпорацію. Утримання: ${money(sum(Object.values(state.depts), deptDaily))}/день.</p></div><div class="cards">${Object.entries(DEPTS).map(([k, D]) => {
        const l = state.depts[k];
        return `<div class="card camp"><span class="big">${D.icon}</span><div><b>${D.name}</b> <span class="tag">рівень ${l}/5</span><br><small>${D.desc}</small><br><small class="muted">${l ? money(deptDaily(l)) + '/день' : 'не створено'}</small></div><div class="col">${l < 5 ? `<button class="btn primary sm" ${state.cash < deptUpCost(l) ? 'disabled' : ''} data-act="deptUp" data-k="${k}">${l ? '↑' : 'Створити'} ${moneyK(deptUpCost(l))}</button>` : '<span class="tag good">Макс.</span>'}${l ? `<button class="btn sm" data-act="deptDown" data-k="${k}">↓</button>` : ''}</div></div>`;
      }).join('')}</div>`;
    }
    return html;
  },

  bank() {
    const tab = state.ui.tab === 'credit' ? 'credit' : 'own';
    const head = tabsHtml([['own', '🏦 Мій банк'], ['credit', '💳 Кредити й рейтинг']], tab);
    if (tab === 'own') return `<h1>Банк</h1>${head}${ownBankView()}`;
    const lim = creditLimit(), cr = state.me.credit;
    let html = `<h1>Банк</h1>${head}<div class="kpis">${kpi('Кредитний рейтинг', Math.round(cr), cr >= 700 ? 'pos' : cr < 560 ? 'neg' : '', cr >= 700 ? 'відмінний' : cr >= 620 ? 'добрий' : cr >= 560 ? 'задовільний' : 'поганий')}${kpi('Ваша ставка', creditRate().toFixed(1) + '%', '', `облікова ${state.econ.rate.toFixed(2)}%`)}${kpi('Доступний ліміт', money(lim))}${kpi('Борг', money(debt()), debt() ? 'neg' : '')}${kpi('Відсотки на залишок', Math.max(0, state.econ.rate - 2.5).toFixed(1) + '%')}</div>
    <div class="card"><h3>Оформити кредит</h3><p class="muted">Рейтинг росте, коли ви вчасно обслуговуєте борг, і падає при від’ємному балансі. Відсотки списуються щоночі.</p><div class="row wrap">
      ${[5000, 20000, 50000, 150000, 500000, 2000000].map((a) => Math.round(a * priceLvl() / 1000) * 1000).map((a) => `<button class="btn ${a <= lim ? 'primary' : ''}" ${a > lim ? 'disabled' : ''} data-act="loan" data-v="${a}">+ ${moneyK(a)}</button>`).join('')}</div></div>
    <div class="card"><h3>Мої кредити</h3>`;
    if (!state.loans.length) html += '<p class="muted">Кредитів немає.</p>';
    else html += `<div class="table-wrap"><table><thead><tr><th>Тип</th><th>Сума</th><th>Ставка</th><th>Відсотки/день</th><th></th></tr></thead><tbody>${state.loans.map((l) => `<tr><td>${l.kind === 'mortgage' ? '🏠 Іпотека' : '💳 Кредит'}<br><small>з дня ${l.day}</small></td><td>${money(l.amount)}</td><td>${(l.rate * 36500).toFixed(1)}%</td><td>${money(l.amount * l.rate, 2)}</td><td><div class="row nowrap"><button class="btn sm" data-act="repayPart" data-id="${l.id}">−10%</button><button class="btn sm primary" ${state.cash < l.amount ? 'disabled' : ''} data-act="repay" data-id="${l.id}">Погасити</button></div></td></tr>`).join('')}</tbody></table></div>`;
    return html + '</div>';
  },

  stocks() {
    const tab = ['market', 'portfolio', 'ipo'].includes(state.ui.tab) ? state.ui.tab : 'market';
    const cos = aliveCos();
    const idx = state.ui.sector || 'all';
    let html = `<h1>Фондова біржа</h1>${tabsHtml([['market', 'Ринок'], ['portfolio', 'Портфель'], ['ipo', 'Моя компанія']], tab)}`;
    if (tab === 'market') {
      const sectors = ['all', ...new Set(cos.map((c) => c.sector))];
      html += `<div class="chips filter">${sectors.map((s) => `<button class="chip ${idx === s ? 'on' : ''}" data-act="sector" data-v="${s}">${s === 'all' ? 'Усі' : SECTORS[s].name}</button>`).join('')}</div>
      <div class="card stocklist">${cos.filter((c) => idx === 'all' || c.sector === idx).sort((a, b) => b.price * b.shares - a.price * a.shares).map((c) => {
        const h = c.hist, ch = h.length > 1 ? c.price / h[Math.max(0, h.length - 31)] - 1 : 0;
        const own = state.portfolio[c.id];
        return `<div class="stock"><div><b>${esc(c.name)}</b><br><small>${c.ticker} · ${SECTORS[c.sector].name} · кап. ${moneyK(c.price * c.shares)}${own ? ` · <b>у вас ${own.qty}</b>` : ''}</small></div><div class="px">${money(c.price, 2)}<br><small class="${ch < 0 ? 'neg' : 'pos'}">${ch >= 0 ? '+' : ''}${pct(ch)}</small></div>${spark(h.slice(-30))}
          <div class="trade"><input type="number" min="1" value="100" id="sh-${c.id}" aria-label="Кількість"><button class="btn sm primary" data-act="buySh" data-id="${c.id}">Купити</button>${own ? `<button class="btn sm" data-act="sellSh" data-id="${c.id}">Продати</button>` : ''}</div></div>`;
      }).join('')}</div>`;
      const dead = state.companies.filter((c) => !c.alive);
      if (dead.length) html += `<div class="card"><h3>Зникли з біржі</h3><p class="muted">${dead.map((c) => `${esc(c.name)} — ${c.fate}`).join(' · ')}</p></div>`;
    } else if (tab === 'portfolio') {
      const rows = Object.entries(state.portfolio).map(([id, h]) => ({ c: coById(id), h })).filter((x) => x.c);
      const val = portfolioValue(), cost = sum(rows, (x) => x.h.qty * x.h.cost);
      html += `<div class="kpis">${kpi('Вартість портфеля', money(val))}${kpi('Прибуток/збиток', money(val - cost), val - cost < 0 ? 'neg' : 'pos')}${kpi('Позицій', rows.length)}</div>`;
      html += rows.length ? `<div class="card"><div class="table-wrap"><table><thead><tr><th>Компанія</th><th>К-сть</th><th>Середня ціна</th><th>Поточна</th><th>Результат</th><th></th></tr></thead><tbody>${rows.map(({ c, h }) => `<tr><td>${esc(c.name)} <small>${c.ticker}</small></td><td>${h.qty}</td><td>${money(h.cost, 2)}</td><td>${money(c.price, 2)}</td><td>${pn(h.qty * (c.price - h.cost))}</td><td><button class="btn sm" data-act="sellAll" data-id="${c.id}">Продати все</button></td></tr>`).join('')}</tbody></table></div></div>` : '<div class="card"><p class="muted">Портфель порожній. Дивіденди виплачуються раз на 30 днів.</p></div>';
    } else {
      if (state.ipo) {
        const I = state.ipo, mcap = I.price * I.shares;
        html += `<div class="kpis">${kpi('Ціна акції', money(I.price, 2))}${kpi('Капіталізація', moneyK(mcap))}${kpi('У вільному обігу', pct(I.float, 0))}${kpi('Ваша частка', moneyK(mcap * (1 - I.float)))}</div>${chartBox('chIpo', [{ data: I.hist, color: '#3f7fc4' }], I.hist.map((_, i) => String(i + 1)), 'Акції ' + esc(state.company), (v) => '$' + v.toFixed(1))}`;
      } else {
        const ok = canIPO();
        html += `<div class="card"><h3>Вихід на біржу (IPO)</h3><p>Вимоги: капітал від ${moneyK(750000 * priceLvl())}, щонайменше 4 об’єкти, 60 днів історії.</p>
          <ul class="help"><li>Капітал: ${moneyK(netWorth())} ${netWorth() >= 750000 * priceLvl() ? '✅' : '❌'}</li><li>Об’єкти: ${state.biz.length + state.fac.length} ${state.biz.length + state.fac.length >= 4 ? '✅' : '❌'}</li><li>Днів: ${state.day} ${state.day >= 60 ? '✅' : '❌'}</li></ul>
          <div class="row wrap">${[0.1, 0.25, 0.4].map((p) => `<button class="btn primary" ${ok ? '' : 'disabled'} data-act="ipo" data-v="${p}">Розмістити ${p * 100}%</button>`).join('')}</div></div>`;
      }
    }
    return html;
  },

  finance() {
    const n = state.ui.period || 7;
    const rows = state.ledger.slice(-n);
    const tot = {};
    for (const r of rows) for (const k of Object.keys(LEDGER)) tot[k] = (tot[k] || 0) + (r[k] || 0);
    const invD = sum(rows, (r) => r.invDelta), dep = sum(rows, (r) => r.dep), profit = sum(rows, (r) => r.profit);
    const B = balance();
    const inc = Object.keys(LEDGER).filter((k) => LEDGER[k].kind === 'inc' && tot[k]);
    const exp = Object.keys(LEDGER).filter((k) => LEDGER[k].kind === 'exp' && tot[k]);
    const cash = Object.keys(LEDGER).filter((k) => LEDGER[k].kind === 'cash' && tot[k]);
    const revenue = sum(inc, (k) => tot[k]);
    const dailyOut = -sum(exp, (k) => tot[k]) / Math.max(1, rows.length);
    let html = `<h1>Фінанси</h1><div class="chips filter">${[[7, '7 днів'], [30, '30 днів'], [90, '90 днів']].map(([v, l]) => `<button class="chip ${n === v ? 'on' : ''}" data-act="period" data-v="${v}">${l}</button>`).join('')}</div>
      <div class="kpis">${kpi('Виручка', moneyK(revenue))}${kpi('Чистий прибуток', moneyK(profit), profit < 0 ? 'neg' : 'pos')}${kpi('Рентабельність', revenue ? pct(profit / revenue) : '—', profit < 0 ? 'neg' : '')}${kpi('ROA (річна)', B.equity + B.debt > 0 ? pct(profit / rows.length * 365 / (B.equity + B.debt)) : '—')}${kpi('Запас ліквідності', dailyOut > 0 ? Math.floor(Math.max(0, state.cash) / dailyOut) + ' дн.' : '∞')}</div>
      <div class="grid2"><div class="card"><h3>Звіт про прибутки та збитки</h3><table class="pl">
        ${inc.map((k) => `<tr><td>${LEDGER[k].name}</td><td class="pos">${money(tot[k])}</td></tr>`).join('') || '<tr><td colspan="2" class="muted">Доходів поки немає</td></tr>'}
        ${exp.map((k) => `<tr><td>${LEDGER[k].name}</td><td class="neg">${money(tot[k])}</td></tr>`).join('')}
        <tr><td>Зміна запасів (капіталізація)</td><td>${pn(invD)}</td></tr><tr><td>Амортизація</td><td class="neg">${money(-dep)}</td></tr>
        <tr class="tot"><td>Чистий прибуток</td><td>${pn(profit)}</td></tr></table></div>
      <div class="card"><h3>Баланс</h3><table class="pl"><tr><td>Грошові кошти</td><td>${money(B.cash)}</td></tr><tr><td>Запаси (магазини + склад)</td><td>${money(B.inventory)}</td></tr><tr><td>Основні засоби (за залишковою вартістю)</td><td>${money(B.fixed)}</td></tr><tr><td>Нерухомість (ринкова)</td><td>${money(B.property)}</td></tr><tr><td>Цінні папери</td><td>${money(B.shares)}</td></tr><tr class="tot"><td>Активи</td><td>${money(B.cash + B.inventory + B.fixed + B.property + B.shares)}</td></tr><tr><td>Зобов’язання (кредити)</td><td class="neg">${money(-B.debt)}</td></tr><tr class="tot"><td>Власний капітал</td><td>${pn(B.equity)}</td></tr></table>
      ${cash.length ? `<h3 style="margin-top:14px">Інвестиційні й фінансові потоки</h3><table class="pl">${cash.map((k) => `<tr><td>${LEDGER[k].name}</td><td>${pn(tot[k])}</td></tr>`).join('')}</table>` : ''}</div></div>`;
    const h = state.ledger.slice(-n), hh = state.history.slice(-n);
    html += `<div class="grid2">${chartBox('chProfit', [{ data: h.map((x) => x.profit), color: '#2e9a5a', name: 'Прибуток' }, { data: h.map((x) => (x.sales || 0) + (x.b2b || 0) + (x.software || 0) + (x.rentInc || 0)), color: '#e08a3c', name: 'Виручка' }], h.map((x) => String(x.day)), 'Виручка і прибуток')}
      ${chartBox('chNw2', [{ data: hh.map((x) => x.nw), color: '#a3558a', name: 'Капітал' }], hh.map((x) => String(x.day)), 'Чистий капітал')}</div>`;
    return html;
  },

  news() {
    const cat = state.ui.newsCat || 'all';
    const cats = { all: 'Усі', econ: 'Економіка', corp: 'Компанії', market: 'Ринки', city: 'Місто', tech: 'Технології' };
    const e = state.econ.hist.slice(-90);
    return `<h1>Ділова газета</h1>${econStrip()}
      <div class="grid2">${chartBox('chEcon', [{ data: e.map((x) => x.inflation), color: '#d2463c', name: 'Інфляція' }, { data: e.map((x) => x.rate), color: '#3f7fc4', name: 'Ставка ЦБ' }, { data: e.map((x) => x.unemp), color: '#e08a3c', name: 'Безробіття' }, { data: e.map((x) => x.growth), color: '#2e9a5a', name: 'ВВП' }], e.map((x) => String(x.day)), 'Макропоказники, %', (v) => v.toFixed(1))}
      <div class="card"><h3>Ключові індикатори</h3><table class="pl"><tr><td>Фаза циклу</td><td>${PHASES[state.econ.phase].name}</td></tr><tr><td>Рівень цін (з початку)</td><td>×${state.econ.priceLevel.toFixed(3)}</td></tr><tr><td>Рівень зарплат</td><td>×${state.econ.wageLevel.toFixed(3)}</td></tr><tr><td>Індекс нерухомості</td><td>×${state.econ.housing.toFixed(3)}</td></tr><tr><td>Курс гривні до $</td><td>${state.econ.fx.toFixed(2)}</td></tr><tr><td>Податок на прибуток</td><td>${pct(state.econ.taxRate, 0)}</td></tr><tr><td>Електроенергія</td><td>${money(state.econ.power * priceLvl())}/МВт·год</td></tr><tr><td>Компаній на біржі</td><td>${aliveCos().length}</td></tr></table></div></div>
      <div class="chips filter">${Object.entries(cats).map(([k, v]) => `<button class="chip ${cat === k ? 'on' : ''}" data-act="newsCat" data-v="${k}">${v}</button>`).join('')}</div>
      <div class="card"><ul class="log news">${state.news.filter((n) => cat === 'all' || n.cat === cat).slice(0, 80).map((n) => `<li class="${n.kind}"><small>День ${n.day}</small> ${esc(n.text)}</li>`).join('') || '<li class="muted">Новин поки немає.</li>'}</ul></div>`;
  },

  life() {
    const me = state.me;
    return `<h1>Життя підприємця</h1><div class="card row lifehead">${avatarSVG(me.look, 72)}<div><h2>${esc(me.name)}</h2><p class="muted">${city().name} · ${HOMES[me.home].name}${me.homeProp ? ' (власна)' : ''} · ${me.job ? JOBS[me.job].name : 'без найму'}</p><button class="btn sm" data-act="editLook">Змінити зовнішність</button></div></div>
      <div class="kpis">${kpi('Особисті витрати', money(livingCost()) + '/день')}${kpi('Зарплата', me.job ? money(JOBS[me.job].pay * wageLvl()) + '/день' : '—')}${kpi('Кредитний рейтинг', Math.round(me.credit))}</div>
      <div class="grid2"><div class="card"><h3>Навички</h3>${Object.entries(SKILLS).map(([k, n]) => `<div class="row between skillrow"><span>${n}</span><span>${skillDots(me.skills[k])}</span><button class="btn sm" ${me.skills[k] >= 5 ? 'disabled' : ''} data-act="course" data-k="${k}">Курс ${money(courseCost(k))}</button></div>`).join('')}<p class="muted">Робота поступово підвищує профільну навичку.</p></div>
      <div class="card"><h3>Житло</h3>${Object.entries(HOMES).map(([k, H]) => `<label class="switch radio"><input type="radio" name="home" data-change="home" value="${k}" ${me.home === k ? 'checked' : ''}> ${H.name} <small class="muted">${money(H.rent * rentLvl() + H.food * priceLvl())}/день</small></label>`).join('')}<p class="muted">Власну квартиру чи будинок можна обрати в розділі «Нерухомість» → «Жити тут».</p></div></div>
      <div class="card"><h3>Робота</h3><p class="muted">Поки ви працюєте найманим працівником, ваші об’єкти без керуючого працюють на 90%.</p><div class="table-wrap"><table><thead><tr><th>Посада</th><th>Зарплата/день</th><th>Вимоги</th><th></th></tr></thead><tbody>${Object.entries(JOBS).map(([k, J]) => `<tr><td>${J.name}</td><td>${money(J.pay * wageLvl())}</td><td>${Object.entries(J.req).map(([s, v]) => `${SKILLS[s]} ${v}`).join(', ') || '—'}</td><td>${me.job === k ? '<button class="btn sm danger" data-act="quitJob">Звільнитися</button>' : `<button class="btn sm primary" ${canTakeJob(k) ? '' : 'disabled'} data-act="takeJob" data-k="${k}">Влаштуватися</button>`}</td></tr>`).join('')}</tbody></table></div></div>`;
  },

  achievements() {
    const got = Object.keys(state.achievements).length;
    return `<h1>Досягнення <small class="muted">${got}/${ACHIEVEMENTS.length}</small></h1><div class="cards">${ACHIEVEMENTS.map((a) => {
      const d = state.achievements[a.id];
      return `<div class="card ach ${d ? 'got' : ''}"><span class="big">${d ? a.icon : '🔒'}</span><div><b>${a.name}</b><br><small>${a.desc}</small>${d ? `<br><small class="pos">День ${d}</small>` : ''}</div></div>`;
    }).join('')}</div>`;
  },

  hq() {
    const H = hqState();
    if (!H.founded) return `<h1>🏛️ Штаб-квартира</h1><div class="card hero"><p>Штаб-квартира дозволяє призначити директорів і давати їм доручення: оптимізувати виробництво, вести розробку, керувати мережею магазинів, розширюватися, контролювати фінанси, кадри й поглинання. Вони виконують завдання щодня самі.</p><button class="btn primary" ${state.cash < hqCost() ? 'disabled' : ''} data-act="foundHQ">Заснувати штаб-квартиру · ${moneyK(hqCost())}</button></div>`;
    const active = Object.keys(DIRECTIVES).filter((k) => H.on[k]);
    let html = `<h1>🏛️ Штаб-квартира</h1><div class="kpis">${kpi('Активних доручень', active.length + '/' + Object.keys(DIRECTIVES).length)}${kpi('Зарплати директорів', money(sum(active, directiveSalary)) + '/день')}${kpi('Готівка', moneyK(state.cash))}</div><div class="cards">`;
    for (const [k, D] of Object.entries(DIRECTIVES)) {
      const on = !!H.on[k];
      let opts = '';
      const chips = (opt, list, fmt) => `<div class="chips">${list.map((v) => `<button class="chip ${H.opts[opt] === v ? 'on' : ''}" data-act="hqOpt" data-k="${opt}" data-v="${v}">${fmt(v)}</button>`).join('')}</div>`;
      if (k === 'expansion') opts = `<small class="muted">Бюджет на одне відкриття (частка готівки):</small>${chips('expansionBudget', [0.05, 0.1, 0.2, 0.4], (v) => Math.round(v * 100) + '%')}`;
      if (k === 'ma') opts = `<small class="muted">Бюджет на поглинання (частка готівки):</small>${chips('maBudget', [0.1, 0.25, 0.5], (v) => Math.round(v * 100) + '%')}`;
      if (k === 'retail') opts = `<small class="muted">Цінова політика мережі:</small>${chips('retailMode', Object.keys(PRICE_MODES), (v) => PRICE_MODES[v].name)}`;
      html += `<div class="card camp ${on ? 'on' : ''}" style="display:block"><div class="row between"><b>${D.icon} ${D.name}</b><button class="btn sm ${on ? 'danger' : 'primary'}" data-act="hqToggle" data-k="${k}">${on ? 'Скасувати' : 'Доручити'}</button></div>
        <small class="muted">${D.exec} · ${money(directiveSalary(k))}/день</small><p style="margin:6px 0">${D.desc}</p>${opts}${H.last[k] ? `<small class="pos">${esc(H.last[k])}</small>` : on ? '<small class="muted">Звіт з’явиться після закриття дня.</small>' : ''}</div>`;
    }
    html += `</div><div class="card"><h3>Журнал штабу</h3><ul class="log">${H.log.slice(0, 40).map((l) => `<li><small>Д${l.day}</small> ${DIRECTIVES[l.key].icon} ${esc(l.text)}</li>`).join('') || '<li class="muted">Поки порожньо.</li>'}</ul></div>`;
    return html;
  },

  ventures() {
    const V = vcState();
    const st = V.stats;
    let html = `<h1>🚀 Стартапи</h1><div class="kpis">${kpi('Портфель', moneyK(venturesValue()), '', `${V.active.length} компаній`)}${kpi('Вкладено всього', moneyK(st.invested))}${kpi('Повернуто', moneyK(st.returned), st.returned >= st.invested ? 'pos' : '')}${kpi('Успіхи / провали', `${st.exits} / ${st.fails}`)}</div>
      <div class="card"><p class="muted">${Object.values(VC_TIERS).map((T) => `${T.icon} <b>${T.name}</b> — ${T.desc}`).join('<br>')}<br>Перевірка (due diligence, 2% суми) показує справжні шанси. Стартапи з вашої галузі отримують +8% до шансу успіху (ваша експертиза).</p></div>
      <h3>Нові пропозиції</h3><div class="cards">`;
    for (const p of V.pitches) {
      const T = VC_TIERS[p.tier], syn = vcSynergy(p.cat);
      html += `<div class="card" style="display:block"><div class="row between"><b>${T.icon} ${esc(p.name)}</b><span class="tag">${T.name}</span></div><p style="margin:6px 0">${esc(p.theme)}${syn ? ' <span class="tag good">ваша експертиза</span>' : ''}</p>
        <small class="muted">Потрібно ${moneyK(p.ask)} за ${Math.round(p.stake * 100)}% · оцінка ${moneyK(p.ask / p.stake)} · ціль ×${T.mult[0]}–${T.mult[1]} за ${T.days[0]}–${T.days[1]} дн. · пропозиція до дня ${p.expires}</small>
        ${p.dd ? `<p class="${p.p > 0.6 ? 'pos' : p.p > 0.3 ? '' : 'neg'}">🔍 Шанс успіху: ≈${Math.round(clamp(p.p + (syn ? 0.08 : 0), 0, 0.98) * 100)}%, очікуваний множник ×${p.mult}</p>` : ''}
        <div class="row wrap" style="margin-top:8px">${p.dd ? '' : `<button class="btn sm" data-act="vcDD" data-id="${p.id}">🔍 Перевірити · ${moneyK(ddCost(p))}</button>`}<button class="btn sm primary" ${state.cash < p.ask ? 'disabled' : ''} data-act="vcInvest" data-id="${p.id}">Інвестувати ${moneyK(p.ask)}</button></div></div>`;
    }
    html += '</div>';
    if (V.active.length) {
      html += `<h3>Мій портфель</h3><div class="card stocklist">${V.active.map((a) => { const ch = a.value / a.invested - 1; const left = Math.max(0, a.start + a.days - state.day); return `<div class="stock"><div><b>${VC_TIERS[a.tier].icon} ${esc(a.name)}</b><br><small>${esc(a.theme)} · вкладено ${moneyK(a.invested)} · до виходу ≈${left} дн.${a.events[0] ? '<br>' + esc(a.events[0]) : ''}</small></div><div class="px">${moneyK(a.value)}<br><small class="${ch < 0 ? 'neg' : 'pos'}">${ch >= 0 ? '+' : ''}${pct(ch, 0)}</small></div>${spark(a.hist.slice(-30))}<div class="trade"><button class="btn sm" data-act="vcSell" data-id="${a.id}">Продати частку за ${moneyK(a.value * 0.85)}</button></div></div>`; }).join('')}</div>`;
    }
    if (V.done.length) html += `<div class="card"><h3>Історія</h3><ul class="log">${V.done.slice(0, 15).map((d) => `<li class="${d.got > d.invested ? 'good' : 'bad'}"><small>Д${d.day}</small> ${VC_TIERS[d.tier].icon} ${esc(d.name)}: ${d.how} — ${moneyK(d.invested)} → ${moneyK(d.got)}</li>`).join('')}</ul></div>`;
    return html;
  },

  sponsor() {
    const S = sportState();
    const lg = state.ui.league || 'football';
    const mine = myTeams();
    let html = `<h1>🏆 Спорт і спонсорство</h1><div class="kpis">${kpi('Ваших команд', mine.length)}${kpi('Бонус до покупців', '+' + pct(sponsorTraffic() - 1))}${kpi('Утримання', money(sum(mine, (t) => sponsorCost(t) * (1 + t.invest))) + '/день')}${kpi('Трофеї', S.trophies)}${kpi('Сезон', `${S.season} · ${SEASON_DAYS - (state.day % SEASON_DAYS)} дн. до фіналу`)}</div>
      <div class="card"><p class="muted">Спонсорство збільшує кількість покупців у всіх ваших магазинах (більше фанатів і сильніша команда — більший ефект). Перемоги додають хайпу, чемпіонство дає +5 репутації всім магазинам. Гоночна команда додатково піднімає продажі ваших авто (+12%). Інвестиції в команду (трансфери, болід) щодня підвищують її силу.</p></div>
      <div class="chips filter">${Object.entries(LEAGUES).map(([k, L]) => `<button class="chip ${lg === k ? 'on' : ''}" data-act="league" data-v="${k}">${L.icon} ${L.name}</button>`).join('')}</div>
      <div class="card stocklist">`;
    const ts = S.teams.filter((t) => t.league === lg).sort((a, b) => b.points - a.points || b.strength - a.strength);
    ts.forEach((t, i) => {
      const mineT = t.sponsor === 'player';
      const co = t.sponsor && !mineT ? coById(t.sponsor) : null;
      const form = t.form.map((f) => (f === 1 ? '🟢' : f === 0 ? '⚪' : '🔴')).join('');
      const fee = sponsorCost(t) * (co ? 30 : 10);
      html += `<div class="stock ${mineT ? 'mine' : ''}"><div><b>#${i + 1} ${LEAGUES[lg].icon} ${esc(t.name)}</b>${mineT ? ' <span class="tag good">ваша</span>' : ''}${t.titles ? ` <span class="tag">🏆×${t.titles}</span>` : ''}<br><small>${t.points} оч. · ${t.played} матчів ${form} · сила ${Math.round(t.strength)} · фанатів ${moneyK(t.reach).replace('$', '')}${co ? ` · спонсор: ${esc(co.name)}` : !mineT ? ' · без спонсора' : ''}</small></div><div class="px">${money(sponsorCost(t))}<br><small class="muted">/день</small></div><span></span>
        <div class="trade">${mineT ? `<span class="muted">Інвестиції в команду:</span>${[0, 1, 2].map((v) => `<button class="chip ${t.invest === v ? 'on' : ''}" data-act="teamInvest" data-id="${t.id}" data-v="${v}">${v ? '+' + v * 100 + '% бюджету' : 'без'}</button>`).join('')}<button class="btn sm danger" data-act="dropTeam" data-id="${t.id}">Завершити</button>` : `<button class="btn sm primary" ${state.cash < fee ? 'disabled' : ''} data-act="sponsorTeam" data-id="${t.id}">${co ? 'Переманити' : 'Спонсорувати'} · підписання ${moneyK(fee)}</button>`}</div></div>`;
    });
    return html + '</div>';
  },

  regions() {
    const ids = Object.keys(CITIES);
    const myCities = new Set([...state.biz, ...state.fac].map((u) => lotCityId(lotOf(u))));
    let html = `<h1>🌍 Регіони</h1><div class="kpis">${kpi('Відкритих ринків', Object.keys(state.unlocked).length + '/' + ids.length)}${kpi('Міст із вашим бізнесом', myCities.size)}${kpi('Готівка', moneyK(state.cash))}</div>
      <div class="card"><p class="muted">Вихід на новий ринок — ліцензії, реєстрація та офіс (разовий внесок). У кожному місті свої оренда, ціни й потік людей; там з’являться ваші ділянки та місцеві точки конкурентів. Персонал, склад і ринок B2B — спільні для всієї корпорації.</p></div><div class="cards">`;
    for (const cid of ids) {
      const C = CITIES[cid], open = !!state.unlocked[cid];
      const lots = state.lots.filter((l) => lotCityId(l) === cid);
      const mine = [...state.biz, ...state.fac].filter((u) => lotCityId(lotOf(u)) === cid);
      const comp = lots.filter((l) => l.npc).length, free = lots.filter((l) => !l.npc && !l.owner).length;
      const rev = sum(state.biz.filter((b) => lotCityId(lotOf(b)) === cid), (b) => (b.yest ? b.yest.rev : 0));
      html += `<div class="card ${open ? 'camp on' : ''}" style="display:block"><div class="row between"><b>${C.name} <small class="muted">${C.flag} · ${REGION_OF[cid]}</small></b>${cid === state.city ? '<span class="tag good">головне місто</span>' : open ? '<span class="tag good">відкрито</span>' : ''}</div>
        <p class="muted">${C.desc}</p><small>Потік ×${C.traffic} · оренда ×${C.rent} · ціни ×${C.price} · зарплати ×${C.wage}${C.tourism ? ' · туристи' : ''}</small>
        ${open ? `<div class="mini"><span>Ваших об’єктів<br><b>${mine.length}</b></span><span>Конкурентів<br><b>${comp}</b></span><span>Вільно ділянок<br><b>${free}</b></span><span>Виручка вчора<br><b>${moneyK(rev)}</b></span></div><div class="row wrap" style="margin-top:8px"><button class="btn sm primary" data-act="goCity" data-v="${cid}">🏙️ До міста</button></div>`
          : `<div class="row wrap" style="margin-top:8px"><button class="btn sm primary" ${state.cash < regionCost(cid) ? 'disabled' : ''} data-act="unlockCity" data-v="${cid}">Вийти на ринок · ${moneyK(regionCost(cid))}</button></div>`}</div>`;
    }
    return html + '</div>';
  },

  ranking() {
    const rows = companyRanking();
    const myRank = rows.findIndex((x) => x.me) + 1;
    const subs = subsidiaries();
    const sector = state.ui.rankSector || 'all';
    const sectors = ['all', 'subs', ...new Set(aliveCos().map((c) => c.sector))];
    let html = `<h1>🥇 Топ компаній</h1><div class="kpis">${kpi('Ваше місце', '#' + myRank, myRank <= 3 ? 'pos' : '', `з ${rows.length}`)}${kpi('Ваша вартість', moneyK(rows[myRank - 1].cap))}${kpi('Дочірніх компаній', subs.length)}${kpi('Їхній прибуток/день', money(sum(subs, (c) => c.subToday || 0)), sum(subs, (c) => c.subToday || 0) < 0 ? 'neg' : 'pos')}${kpi('Готівка', moneyK(state.cash))}</div>
      <div class="card"><p class="muted">Поглинання — викуп 100% компанії з премією 30% до ринкової капіталізації (ваші акції цієї компанії зараховуються). Дочірні компанії не конкурують з вашими магазинами, їхні точки в місті стають вашими, а прибуток надходить вам (частку виплати можна змінити). Збиткова дочірня компанія тягне вас у мінус і може збанкрутувати.</p></div>
      <div class="chips filter">${sectors.map((s) => `<button class="chip ${sector === s ? 'on' : ''}" data-act="rankSector" data-v="${s}">${s === 'all' ? 'Усі' : s === 'subs' ? 'Мої дочірні' : SECTORS[s].name}</button>`).join('')}</div><div class="card stocklist">`;
    rows.forEach((r, i) => {
      if (sector === 'subs' && !(r.co && isSub(r.co))) return;
      if (sector !== 'all' && sector !== 'subs' && (!r.co || r.co.sector !== sector)) return;
      const sub = r.co && isSub(r.co);
      let actions = '';
      if (sub) {
        const p = r.co.payout == null ? 1 : r.co.payout;
        actions = `<div class="trade"><span class="muted">Виплата прибутку:</span>${[[1, '100%'], [0.5, '50%'], [0, '0% (розвиток)']].map(([v, l]) => `<button class="chip ${p === v ? 'on' : ''}" data-act="payout" data-id="${r.co.id}" data-v="${v}">${l}</button>`).join('')}<button class="btn sm danger" data-act="sellSub" data-id="${r.co.id}">Продати за ${moneyK(coMcap(r.co) * 0.95)}</button></div>`;
      } else if (r.co) {
        const tp = takeoverPrice(r.co);
        actions = `<div class="trade"><button class="btn sm primary" ${state.cash < tp ? 'disabled' : ''} data-act="acquire" data-id="${r.co.id}">🦈 Поглинути за ${moneyK(tp)}</button>${state.portfolio[r.co.id] ? `<small class="muted">у вас ${state.portfolio[r.co.id].qty} акцій</small>` : ''}</div>`;
      }
      html += `<div class="stock ${r.me || sub ? 'mine' : ''}"><div><b>#${i + 1} ${esc(r.name)}</b>${r.me ? ' <span class="tag good">ви</span>' : sub ? ' <span class="tag good">дочірня</span>' : ''}<br><small>${r.sector} · точок у місті: ${r.shops} · прибуток ${money(r.profit)}/день${r.co && r.co.acquired ? ` · поглинула: ${r.co.acquired.map(esc).join(', ')}` : ''}${r.co && !sub ? influenceNote(r.co) : ''}${r.co && state.contracts && state.contracts[r.co.id] ? ` · ваш клієнт (${moneyK(state.contracts[r.co.id].total)})` : ''}</small></div><div class="px"><b>${moneyK(r.cap)}</b><br><small class="muted">капіталізація</small></div>${r.co ? spark(r.co.hist.slice(-30)) : '<span></span>'}${actions}</div>`;
    });
    return html + '</div>';
  },

  admin() {
    const e = state.econ;
    const units = [...state.biz, ...state.fac];
    const btn = (act, label, extra = '', cls = 'primary') => `<button class="btn sm ${cls}" data-act="${act}" ${extra}>${label}</button>`;
    let html = `<h1>🛠️ Адмін-панель</h1><p class="muted">Режим розробника: зміни застосовуються одразу. Гроші, додані тут, позначаються в обліку як «Адмін-коригування».</p>
      <div class="card"><h3>💰 Гроші</h3><p>Баланс: <b>${money(state.cash)}</b> · борг ${money(debt())} · рейтинг ${Math.round(state.me.credit)}</p>
        <div class="row wrap">${[10000, 100000, 1000000, 10000000].map((v) => btn('admAdd', '+' + moneyK(v), `data-v="${v}"`)).join('')}${btn('admAdd', '−' + moneyK(10000), 'data-v="-10000"', 'danger')}</div>
        <div class="row wrap" style="margin-top:8px"><input type="number" id="admCash" value="${Math.round(state.cash)}" aria-label="Баланс" style="width:160px">${btn('admSetCash', 'Встановити баланс')}${btn('admPayDebt', 'Списати всі кредити', '', '')}${btn('admCredit', 'Рейтинг 850', '', '')}</div></div>
      <div class="card"><h3>✏️ Назви</h3>
        <label>Компанія <input value="${esc(state.company)}" data-change="admName" data-k="company" maxlength="40"></label>
        <label>Ваше ім’я <input value="${esc(state.me.name)}" data-change="admName" data-k="player" maxlength="40"></label>
        ${units.map((x) => `<label>${x.kind ? FACILITIES[x.kind].icon : TYPES[x.type].icon} Об’єкт <input value="${esc(x.name)}" data-change="admUnitName" data-id="${x.id}" maxlength="40"></label>`).join('')}
        ${state.carModels.map((m) => `<label>🚗 Модель авто <input value="${esc(m.name)}" data-change="admCarName" data-id="${m.id}" maxlength="30"></label>`).join('')}</div>
      <div class="card"><h3>🏷️ Ціни в магазинах</h3>${state.biz.length ? state.biz.map((b) => `<details ${state.ui.admOpen === b.id ? 'open' : ''}><summary data-act="admOpen" data-id="${b.id}"><b>${TYPES[b.type].icon} ${esc(b.name)}</b></summary><div class="table-wrap"><table><thead><tr><th>Товар</th><th>Ціна</th><th>Запас</th></tr></thead><tbody>${productsOf(b).map((p) => { const st = b.products[p.id] || {}; return `<tr><td>${esc(p.name)}</td><td><input type="number" step="0.1" min="0.01" value="${(st.price || 0).toFixed(2)}" data-change="price" data-id="${b.id}" data-p="${p.id}" style="width:100px"></td><td><input type="number" min="0" value="${Math.floor(st.stock || 0)}" data-change="admStock" data-id="${b.id}" data-p="${p.id}" style="width:100px"></td></tr>`; }).join('')}</tbody></table></div>
        <div class="row wrap">${btn('admPrices', 'Усі ціни +10%', `data-id="${b.id}" data-v="1.1"`, '')}${btn('admPrices', 'Усі ціни −10%', `data-id="${b.id}" data-v="0.9"`, '')}${btn('admPrices', 'Ринкові ціни', `data-id="${b.id}" data-v="0"`, '')}</div></details>`).join('') : '<p class="muted">Немає магазинів.</p>'}</div>
      <div class="card"><h3>📦 Ринок B2B (ціна сировини й товарів)</h3><div class="table-wrap"><table><thead><tr><th>Товар</th><th>Множник</th><th>Ціна</th><th>На складі</th></tr></thead><tbody>${Object.entries(GOODS).map(([g, G]) => `<tr><td>${G.icon} ${G.name}</td><td><input type="number" step="0.05" min="0.1" max="10" value="${state.market[g].mult.toFixed(2)}" data-change="admMkt" data-g="${g}" style="width:90px"></td><td>${money(mktPrice(g), 2)}</td><td><input type="number" min="0" value="${Math.floor(whQty(g))}" data-change="admWh" data-g="${g}" style="width:110px"></td></tr>`).join('')}</tbody></table></div></div>
      <div class="card"><h3>🏢 Бізнеси й підприємства</h3><div class="row wrap">${btn('admRep', 'Репутація всіх магазинів 100')}${btn('admFill', 'Безкоштовно заповнити склади')}${btn('admRepair', 'Відремонтувати все')}${btn('admLevel', 'Усі рівні та покращення на максимум')}${btn('admSkill', 'Персонал: навичка 5, мораль 100')}${btn('admCands', 'Кандидати-профі на ринку праці')}${btn('admRestoreComp', 'Повернути конкурентів')}${btn('admNoComp', 'Прибрати конкурентів з міста', '', 'danger')}</div></div>
      <div class="card"><h3>📈 Економіка</h3><div class="row wrap">${Object.entries(PHASES).map(([k, P]) => btn('admPhase', P.name, `data-v="${k}"`, e.phase === k ? 'primary' : '')).join('')}</div>
        <div class="row wrap" style="margin-top:8px"><label>Інфляція % <input type="number" step="0.5" value="${e.inflation.toFixed(1)}" data-change="admEcon" data-k="inflation" style="width:100px"></label><label>Ставка ЦБ % <input type="number" step="0.25" value="${e.rate.toFixed(2)}" data-change="admEcon" data-k="rate" style="width:100px"></label><label>Безробіття % <input type="number" step="0.5" value="${e.unemployment.toFixed(1)}" data-change="admEcon" data-k="unemployment" style="width:100px"></label><label>Податок % <input type="number" step="1" value="${Math.round(e.taxRate * 100)}" data-change="admEcon" data-k="tax" style="width:100px"></label></div>
        ${btn('admResetPrices', 'Скинути рівень цін, зарплат і нерухомості до 1.0', '', '')}</div>
      <div class="card"><h3>⏱️ Час і дослідження</h3><div class="row wrap">${btn('admSkip', '+1 день', 'data-v="1"', '')}${btn('admSkip', '+7 днів', 'data-v="7"', '')}${btn('admSkip', '+30 днів', 'data-v="30"', '')}${btn('admResearch', '+1000 очок досліджень')}${btn('admAch', 'Відкрити всі досягнення', '', '')}</div></div>`;
    return html;
  },

  settings() {
    const q = (typeof City3D !== 'undefined' && City3D.quality()) || 'low';
    return `<h1>Гра</h1><div class="card"><h3>Графіка 3D-міста</h3><div class="chips filter">${[['low', 'Низька (економія батареї)'], ['high', 'Висока (тіні, згладжування)']].map(([k, n]) => `<button class="chip ${q === k ? 'on' : ''}" data-act="quality" data-v="${k}">${n}</button>`).join('')}<button class="chip ${state.ui.no3d ? 'on' : ''}" data-act="toggle3d">${state.ui.no3d ? '2D-мапа (увімкнути 3D)' : 'Вимкнути 3D'}</button></div></div>
      <div class="card"><h3>Збереження</h3><p class="muted">Автозбереження щоночі та при згортанні застосунку.</p><div class="row wrap"><button class="btn primary" data-act="saveNow">💾 Зберегти</button><button class="btn danger" data-act="newGameConfirm">🔄 Нова гра</button></div></div>
      <div class="card"><h3>Перенесення збереження</h3><p class="muted">Скопіюйте код, щоб не втратити прогрес під час перевстановлення або щоб перенести гру на інший телефон.</p>
        <div class="row wrap"><button class="btn" data-act="exportSave">📤 Експорт</button><button class="btn" data-act="importSave">📥 Імпорт</button></div></div>
      <div class="card"><h3>Як грати</h3><ul class="help">
      <li><b>Старт:</b> ${money(4000)} — цього мало для бізнесу. Працюйте, беріть кредит, починайте з малого.</li>
      <li><b>Економіка</b> циклічна: бум → рецесія → криза. Інфляція підвищує ціни, зарплати й оренду — переглядайте свої ціни.</li>
      <li><b>Ланцюжки:</b> ферма → харчовий комбінат → мінімаркет; шахта → сталь → автозавод → автосалон; нафта → пластик → мікросхеми → електроніка → магазин.</li>
      <li><b>Склад</b> спільний для всіх підприємств; магазини спершу беруть товар із власного складу (якщо увімкнено).</li>
      <li><b>Персонал</b> має роль, навичку й мораль. Зарплата нижче ринку → звільнення та страйки.</li>
      <li><b>Обладнання</b> зношується: ремонтуйте вчасно або найміть керуючого.</li>
      <li><b>Податки</b> щотижня з прибутку; бухгалтерія зменшує їх. 3 дні з готівкою нижче −$15 000 = банкрутство.</li></ul></div>`;
  },
};

function bankCardHtml() {
  const B = state.bank;
  return `<div class="bankcard"><div class="bc-top"><span class="bc-chip"></span><span class="bc-wave">)))</span></div>
    <div class="bc-num">${B ? B.card : '4000 •••• •••• ••••'}</div>
    <div class="bc-bottom"><span>${esc(state.me.name.toUpperCase())}</span><span class="bc-logo">${esc(bankName().split(' ')[0].slice(0, 1))}</span></div></div>`;
}

function ownBankView() {
  const B = state.bank;
  if (!B) {
    const okNw = netWorth() >= bankMinNetWorth(), okCash = state.cash >= bankLicenseCost();
    return `<div class="bankapp"><div class="bank-hero"><h2>Власний банк</h2><div class="bank-phone"><div class="bank-top"><div class="bank-bal"><span>Капітал банку</span><b>${moneyK(bankLicenseCost())}</b><div class="bank-pill"><small>Прибуток за годину</small><b>—</b></div></div>${bankCardHtml()}</div>
      <div class="bank-body"><p>Залучайте депозити, кредитуйте компанії та населення й заробляйте на різниці ставок. Капітал має покривати щонайменше 10% кредитів, інакше вкладники почнуть забирати гроші.</p>
      <ul class="help"><li>Чистий капітал корпорації від ${moneyK(bankMinNetWorth())} ${okNw ? '✅' : '❌'}</li><li>Ліцензія ${moneyK(bankLicenseCost())} — стає статутним капіталом ${okCash ? '✅' : '❌'}</li></ul>
      <button class="btn primary" ${okNw && okCash ? '' : 'disabled'} data-act="bankOpen">Отримати банківську ліцензію</button></div></div></div></div>`;
  }
  const T = B.today || { income: 0, depCost: 0, losses: 0, opex: 0, profit: 0, paid: 0, pd: 0 };
  const L = bankLevel(), K = state.econ.rate / 100, car = bankCar();
  const prog = clamp((L.size - L.prev) / Math.max(1, L.next - L.prev), 0, 1);
  const rate = (v) => (v * 100).toFixed(2) + '%';
  const h = B.hist.slice(-30);
  let html = `<div class="bankapp"><div class="bank-hero"><h2>${esc(bankName())}</h2><div class="bank-phone"><div class="bank-top"><div class="bank-bal"><span>Капітал банку</span><b>${money(B.capital)}</b>
      <div class="bank-pill"><small>Прибуток за годину</small><b class="${T.profit < 0 ? 'neg' : ''}">${T.profit >= 0 ? '+' : ''}${moneyK(T.profit / 24)}</b></div>
      <div class="bank-lvl"><span><b>${L.lvl}</b> рівень</span><span>${moneyK(L.next)}</span></div><div class="bank-progress"><i style="width:${(prog * 100).toFixed(0)}%"></i></div></div>${bankCardHtml()}</div>
    <div class="bank-body">
      <div class="kpis">${kpi('Депозити', moneyK(B.deposits))}${kpi('Кредити', moneyK(B.loans), '', B.internal ? `з них вашій корпорації ${moneyK(B.internal)}` : '')}${kpi('Норматив капіталу', pct(Math.min(car, 9)), car < 0.1 ? 'neg' : 'pos', 'мін. 10%')}${kpi('Відділень', bankBranches())}</div>
      ${car < 0.1 && B.loans > 0 ? '<div class="card warn"><p>⚠️ Капіталу замало для такого кредитного портфеля. Внесіть капітал або підніміть ставку кредитів, інакше почнеться відтік вкладників.</p></div>' : ''}
      <div class="card"><h3>Ставки</h3><p class="muted">Облікова ставка ЦБ: ${rate(K)}. Вища ставка депозитів залучає вкладників; нижча ставка кредитів — позичальників, але більший ризик неповернення при високих ставках.</p>
        <div class="row between wrap"><span>Депозити: <b>${rate(B.depRate)}</b> <small class="muted">(ринок ≈ ${rate(Math.max(0, K - 0.02))})</small></span><span class="row nowrap"><button class="btn sm" data-act="bankRate" data-k="dep" data-v="-0.0025">−0.25%</button><button class="btn sm" data-act="bankRate" data-k="dep" data-v="0.0025">+0.25%</button></span></div>
        <div class="row between wrap" style="margin-top:8px"><span>Кредити: <b>${rate(B.loanRate)}</b> <small class="muted">(ринок ≈ ${rate(K + 0.03)} · дефолти ${rate(T.pd)}/рік)</small></span><span class="row nowrap"><button class="btn sm" data-act="bankRate" data-k="loan" data-v="-0.0025">−0.25%</button><button class="btn sm" data-act="bankRate" data-k="loan" data-v="0.0025">+0.25%</button></span></div></div>
      <div class="card"><h3>Учора</h3><table class="pl"><tr><td>Процентний дохід</td><td class="pos">${money(T.income)}</td></tr><tr><td>Відсотки вкладникам</td><td class="neg">${money(-T.depCost)}</td></tr><tr><td>Неповернені кредити</td><td class="neg">${money(-T.losses)}</td></tr><tr><td>Операційні витрати</td><td class="neg">${money(-T.opex)}</td></tr><tr class="tot"><td>Прибуток банку</td><td>${pn(T.profit)}</td></tr><tr><td>Виплачено вам</td><td>${money(T.paid)}</td></tr></table>
        <div class="chips" style="margin-top:8px"><small class="muted">Виплата прибутку вам:</small>${[[0, '0% (капітал)'], [0.5, '50%'], [1, '100%']].map(([v, l]) => `<button class="chip ${B.payout === v ? 'on' : ''}" data-act="bankPayout" data-v="${v}">${l}</button>`).join('')}</div></div>
      <div class="card"><h3>Капітал і корпорація</h3><div class="row wrap">${[10e6, 100e6].map((v) => `<button class="btn sm primary" ${state.cash < v ? 'disabled' : ''} data-act="bankInject" data-v="${v}">+ ${moneyK(v)} у капітал</button>`).join('')}<button class="btn sm" data-act="bankInject" data-v="-10000000">− ${moneyK(10e6)} з капіталу</button></div>
        <p class="muted" style="margin-top:8px">Банк може кредитувати вашу корпорацію замість сторонніх банків (відсотки лишаються в групі). Вільний ліміт: ${moneyK(Math.max(0, bankMaxLoans() - B.loans))}.</p>
        <div class="row wrap"><button class="btn sm" data-act="bankLend" data-v="10000000">Позичити корпорації ${moneyK(10e6)}</button>${B.internal ? `<button class="btn sm" data-act="bankRepay">Повернути ${moneyK(Math.min(B.internal, Math.max(0, state.cash)))}</button>` : ''}${state.loans.some((l) => l.kind !== 'mortgage') ? '<button class="btn sm primary" data-act="bankRefi">Рефінансувати зовнішні кредити</button>' : ''}</div></div>
      <div class="card"><h3>Відділення</h3><p class="muted">Кожне відділення з персоналом дає +15% вкладників і позичальників. Відкриваються на ділянках у торгових районах (як магазини).</p><button class="btn sm" data-act="nav" data-v="map">🏙️ Обрати ділянку</button></div>
      ${chartBox('chBank', [{ data: h.map((x) => x.deposits), color: '#1fb5a0', name: 'Депозити' }, { data: h.map((x) => x.loans), color: '#e08a3c', name: 'Кредити' }, { data: h.map((x) => x.capital), color: '#a3558a', name: 'Капітал' }], h.map((x) => String(x.day)), 'Баланс банку')}
    </div></div></div>`;
  return html;
}

function influenceNote(co) {
  const { factor, parts } = playerInfluenceParts(co);
  if (Math.abs(factor - 1) < 0.01) return '';
  const pctTxt = `${factor < 1 ? '−' : '+'}${Math.round(Math.abs(1 - factor) * 100)}%`;
  return `<br><span class="${factor < 1 ? 'pos' : 'muted'}">ваш вплив: ${pctTxt} виручки (${parts.join(', ')})</span>`;
}

function cityChips() {
  const ids = Object.keys(state.unlocked || {});
  if (ids.length < 2) return '';
  return `<span class="citychips">${ids.map((cid) => `<button class="chip ${viewCity() === cid ? 'on' : ''}" data-act="mapCity" data-v="${cid}">${CITIES[cid].name}</button>`).join('')}</span>`;
}

function lotIcon(l) {
  if (l.ownerKind === 'biz') return TYPES[bizById(l.owner).type].icon;
  if (l.ownerKind === 'fac') return FACILITIES[facById(l.owner).kind].icon;
  if (l.ownerKind === 'prop') { const p = propById(l.owner); return p && p.building ? '🏗️' : PROP_KINDS[p ? p.kind : 'mall'].icon; }
  if (l.npc) return l.npc.type ? TYPES[l.npc.type].icon : FACILITIES[l.npc.fac].icon;
  return '＋';
}

function lotPanel(l) {
  const D = DMAP[l.district], S = SIZES[l.size];
  let html = `<div class="card lotpanel" id="lotpanel"><div class="row between"><h3>📍 ${esc(l.addr)}</h3><button class="btn ghost sm" data-act="selLot" data-id="" aria-label="Закрити">✕</button></div>
    <p>${CITIES[lotCityId(l)].name} · ${D.name} · ${S.name} ${S.m2} м² · оренда <b>${money(lotRent(l))}/день</b></p><p class="muted">${D.desc}</p>`;
  if (l.ownerKind === 'biz') { const b = bizById(l.owner); return html + `<p>Ваш бізнес <b>${esc(b.name)}</b>.</p><button class="btn primary" data-act="biz" data-id="${b.id}">Перейти</button></div>`; }
  if (l.ownerKind === 'fac') { const f = facById(l.owner); return html + `<p>Ваше підприємство <b>${esc(f.name)}</b>.</p><button class="btn primary" data-act="fac" data-id="${f.id}">Перейти</button></div>`; }
  if (l.ownerKind === 'prop') { const p = propById(l.owner); return html + `<p>${PROP_KINDS[p.kind].icon} ${PROP_KINDS[p.kind].name}${p.building ? ` — будівництво, лишилось ${p.building} дн.` : ''}.</p><button class="btn primary" data-act="nav" data-v="realty">Нерухомість</button></div>`; }
  if (l.npc) {
    const co = coById(l.npc.co);
    const what = l.npc.type ? TYPES[l.npc.type] : FACILITIES[l.npc.fac];
    if (isSub(co)) return html + `<p>${what.icon} Точка вашої дочірньої компанії <b>${esc(co.name)}</b> — ${what.name}.</p><button class="btn primary" data-act="nav" data-v="ranking">🥇 Керувати</button></div>`;
    return html + `<p>Конкурент: <b>${what.icon} ${co ? esc(co.name) : 'Місцевий бізнес'}</b> — ${what.name}.</p>${co && co.alive ? `<p class="muted">Акції ${co.ticker}: ${money(co.price, 2)} · викуп компанії: ${moneyK(takeoverPrice(co))}</p><div class="row wrap"><button class="btn primary" ${state.cash < takeoverPrice(co) ? 'disabled' : ''} data-act="acquire" data-id="${co.id}">🦈 Поглинути</button><button class="btn" data-act="nav" data-v="ranking">🥇 Топ компаній</button></div>` : ''}</div>`;
  }
  const row = (icon, name, sub, cost, act, extra) => `<div class="typerow"><span class="big">${icon}</span><div><b>${name}</b><br>${sub}<br><small>Старт ${money(cost)}</small></div><button class="btn primary sm" ${state.cash < cost ? 'disabled' : ''} data-act="${act}" data-lot="${l.id}" ${extra}>Відкрити</button></div>`;
  html += '<div class="typelist">';
  if (D.zone === 'retail') {
    html += '<h4>Магазини і заклади</h4>';
    for (const [k, T] of Object.entries(TYPES)) {
      if (T.minSize && SIZE_ORDER.indexOf(l.size) < SIZE_ORDER.indexOf(T.minSize)) continue;
      const comp = state.lots.filter((x) => x.district === l.district && lotCityId(x) === lotCityId(l) && ((x.npc && x.npc.type === k) || (x.ownerKind === 'biz' && bizById(x.owner).type === k))).length;
      html += row(T.icon, T.name, `<span class="stars">${stars(T.aff[l.district] || 0.5)}</span> <small>· конкурентів: ${comp}</small>`, setupCost(k, l) + lotRent(l) * 7, 'openBiz', `data-type="${k}"`);
    }
    if (state.bank && state.bank.open && FACILITIES.bankbranch.sizes.includes(l.size)) html += '<h4>Банк</h4>' + row('🏦', FACILITIES.bankbranch.name, `<small>+15% вкладників і позичальників «${esc(bankName())}»</small>`, facSetupCost('bankbranch', l) + lotRent(l) * 7, 'openFac', 'data-kind="bankbranch"');
    if (FACILITIES.office.sizes.includes(l.size)) html += '<h4>IT</h4>' + row('💻', FACILITIES.office.name, '<small>Розробка застосунків, ігор, хмарних сервісів</small>', facSetupCost('office', l) + lotRent(l) * 7, 'openFac', 'data-kind="office"');
    const cons = Object.entries(CONSTRUCT).filter(([, C]) => C.sizes.includes(l.size));
    if (cons.length) html += '<h4>Будівництво</h4>' + cons.map(([k, C]) => `<div class="typerow"><span class="big">🏗️</span><div><b>${C.name}</b><br><small>${C.days} днів · потім оренда ${pct(PROP_KINDS[k].yield)}/рік</small><br><small>Вартість ${money(constructCost(k, l))}</small></div><button class="btn primary sm" ${state.cash < constructCost(k, l) ? 'disabled' : ''} data-act="construct" data-lot="${l.id}" data-kind="${k}">Будувати</button></div>`).join('');
  } else {
    html += '<h4>Підприємства</h4>';
    for (const [k, F] of Object.entries(FACILITIES)) {
      if (!F.zones.includes('industry')) continue;
      const fits = F.sizes.includes(l.size);
      const out = F.recipes.length ? F.recipes.map((r) => (r.out === 'power' ? '⚡ Енергія' : GOODS[r.out].icon + ' ' + GOODS[r.out].name)).join(', ') : k === 'carplant' ? '🚗 Ваші моделі авто' : '📦 Склад +100 000, логістика −30%';
      html += fits ? row(F.icon, F.name, `<small>${out} · ${F.staff} роб. · ${F.power} МВт·год</small>`, facSetupCost(k, l) + lotRent(l) * 7, 'openFac', `data-kind="${k}"`) : `<div class="typerow dim"><span class="big">${F.icon}</span><div><b>${F.name}</b><br><small>Потрібна ділянка: ${F.sizes.join('/')}</small></div></div>`;
    }
  }
  return html + '</div></div>';
}

const BIZ_TABS = {
  overview(b) {
    const y = b.yest, hh = b.history.slice(-14);
    let html = `<div class="kpis">${kpi('Репутація', b.rep.toFixed(0) + '/100', b.rep >= 70 ? 'pos' : b.rep < 45 ? 'neg' : '')}${kpi('Виручка сьогодні', money(b.today.rev))}${kpi('Клієнтів сьогодні', b.today.served, '', b.today.lost ? `${b.today.lost} пішли через черги` : '')}${kpi('Прибуток учора', y ? money(y.profit) : '—', y && y.profit < 0 ? 'neg' : 'pos')}${kpi('Оцінка вартості', money(bizValue(b)))}</div>`;
    const tips = [];
    if (!staffOf(b).length) tips.push('👥 Немає персоналу — бізнес не працює. <a data-act="tab" data-v="staff">Найняти</a>');
    if (b.type === 'dealership' && !state.carModels.length) tips.push('🚗 Автосалон продає лише ваші моделі. <a data-act="nav" data-v="cars">Розробити авто</a>');
    else if (stockTotal(b) < 1) tips.push('📦 Склад порожній. <a data-act="tab" data-v="products">Закупити товар</a>');
    if (y && y.lost > y.served * 0.15) tips.push('⏳ Багато клієнтів пішло через черги — більше персоналу або обладнання.');
    if (y && y.oos > 10) tips.push('🚫 Товар закінчувався — збільште цільовий запас.');
    const under = productsOf(b).filter((p) => b.products[p.id] && b.products[p.id].price < wholesale(b, p) && !p.carOnly);
    if (under.length) tips.push(`📉 Ціна нижче оптової: ${under.map((p) => p.name).join(', ')} — інфляція з’їла маржу.`);
    if (tips.length) html += `<div class="card warn">${tips.map((t) => `<p>${t}</p>`).join('')}</div>`;
    html += '<div class="grid2">';
    html += y ? `<div class="card"><h3>Звіт за вчора</h3><table class="pl"><tr><td>Виручка</td><td class="pos">${money(y.rev)}</td></tr><tr><td>Собівартість</td><td class="neg">${money(-y.cogs)}</td></tr><tr><td>Зарплати</td><td class="neg">${money(-y.wages)}</td></tr><tr><td>Оренда</td><td class="neg">${money(-y.rent)}</td></tr><tr><td>Маркетинг</td><td class="neg">${money(-y.mkt)}</td></tr><tr><td>Списання</td><td class="neg">${money(-y.spoil)}</td></tr><tr class="tot"><td>Прибуток</td><td>${pn(y.profit)}</td></tr><tr><td>Клієнтів / пішли / без товару</td><td>${y.served} / ${y.lost} / ${y.oos}</td></tr><tr><td>Задоволеність</td><td>${y.sat != null ? y.sat.toFixed(0) + '/100' : '—'}</td></tr></table></div>` : '<div class="card"><h3>Звіт за вчора</h3><p class="muted">З’явиться після першого дня роботи.</p></div>';
    html += chartBox('chBiz', [{ data: hh.map((x) => x.profit), color: '#2e9a5a', name: 'Прибуток' }, { data: hh.map((x) => x.rev), color: '#e08a3c', name: 'Виручка' }], hh.map((x) => String(x.day)), '14 днів');
    html += `</div><div class="card"><h3>Керування</h3><div class="row wrap">
      <label>Відкриття <select data-change="hours" data-k="open" data-id="${b.id}">${hourOpts(0, 23, b.open)}</select></label>
      <label>Закриття <select data-change="hours" data-k="close" data-id="${b.id}">${hourOpts(1, 24, b.close)}</select></label></div>
      <label class="switch"><input type="checkbox" data-change="manager" data-id="${b.id}" ${b.manager ? 'checked' : ''}> <span><b>Керуючий</b> (${money(managerCost())}/день) — повний аутсорс</span></label>
      <p class="muted">Протягом дня дозакуповує товар (+2%), підлаштовує запаси під попит, тримає ціни за інфляцією, наймає й замінює персонал, підвищує зарплати при низькій моралі, оновлює обладнання при чергах. +5% швидкості.</p>
      ${b.manager ? `<label>Цінова політика <select data-change="priceMode" data-id="${b.id}">${Object.entries(PRICE_MODES).map(([k, m]) => `<option value="${k}" ${(b.priceMode || 'market') === k ? 'selected' : ''}>${m.name} (×${m.k})</option>`).join('')}</select></label>` : ''}
      <p class="muted">${openHours(b)} год/день · зарплати ${money(dailyWages(b))}/день · оренда ${money(lotRent(lotOf(b)))}/день</p></div>
      <div class="card"><h3>Продаж</h3><p class="muted">Покупець пропонує ${money(bizValue(b))}.</p><button class="btn danger" data-act="sell" data-id="${b.id}">Продати</button></div>`;
    return html;
  },

  products(b) {
    const cap = storageCap(b), tot = stockTotal(b);
    const prods = productsOf(b);
    ensureProducts(b);
    let html = `<div class="card"><div class="row between wrap"><div><b>Склад:</b> ${Math.round(tot)} / ${cap} од.<div class="bar ${tot / cap > 0.9 ? 'mid' : 'good'}" style="width:200px"><i style="width:${clamp(tot / cap * 100, 0, 100)}%"></i></div></div>
      <button class="btn primary" data-act="fillAll" data-id="${b.id}">📦 Докупити до цілі</button></div>
      <label class="switch"><input type="checkbox" data-change="auto" data-id="${b.id}" ${b.autoRestock ? 'checked' : ''}> Автозакупівля о 06:00 (${b.manager ? '+2%' : '+10%'})</label>
      ${prods.some((p) => p.good && !p.carOnly) ? `<label class="switch"><input type="checkbox" data-change="useOwn" data-id="${b.id}" ${b.useOwn ? 'checked' : ''}> Спершу брати власну продукцію зі складу</label>` : ''}</div>
      ${!prods.length ? '<div class="card"><p class="muted">Немає моделей авто для продажу. Розробіть модель і виробіть її на автозаводі.</p></div>' : ''}<div class="cards">`;
    for (const p of prods) {
      const st = b.products[p.id], fair = fairPrice(p, b), r = st.price / fair;
      const unitCost = p.carOnly ? st.cost : wholesale(b, p);
      html += `<div class="card prod"><div class="row between"><b>${esc(p.name)}</b>${p.spoil ? `<span class="tag">псується ${Math.round(p.spoil * 100)}%/ніч</span>` : ''}</div>
        ${p.good ? `<small class="muted">${p.carOnly ? 'З вашого заводу' : `Своє виробництво: ${GOODS[p.good].icon} ${GOODS[p.good].name} ×${p.gq} (на складі ${Math.floor(whQty(p.good))})`}</small>` : ''}
        <div class="mini"><span>На складі<br><b class="${st.stock < 1 ? 'neg' : ''}">${Math.floor(st.stock)}</b></span><span>Сьогодні<br><b>${st.sold}</b></span><span>Учора<br><b>${st.soldY || 0}</b></span><span>Собівартість<br><b>${money(st.cost, 2)}</b></span></div>
        <label>Ціна ($) <small class="muted">ринкова ${money(fair, 2)}</small><input type="number" step="0.1" min="0.1" value="${st.price.toFixed(2)}" data-change="price" data-id="${b.id}" data-p="${p.id}"></label>
        <small class="${r > 1.2 ? 'neg' : r < 0.9 ? 'pos' : 'muted'}">${r > 1.2 ? 'Дорого — клієнти відмовляються' : r < 0.9 ? 'Дешево — більше клієнтів' : 'Ринкова ціна'} · маржа ${money(st.price - unitCost, 2)}</small>
        <div class="row"><button class="btn sm" data-act="priceFair" data-id="${b.id}" data-p="${p.id}">= ринкова</button><button class="btn sm" data-act="priceUp" data-id="${b.id}" data-p="${p.id}">+5%</button><button class="btn sm" data-act="priceDown" data-id="${b.id}" data-p="${p.id}">−5%</button></div>
        <label>Цільовий запас <input type="number" min="0" step="${p.carOnly ? 1 : 10}" value="${st.target}" data-change="target" data-id="${b.id}" data-p="${p.id}"></label>
        <div class="row"><input type="number" min="1" step="${p.carOnly ? 1 : 10}" value="${p.carOnly ? 2 : 50}" id="qty-${p.id}" aria-label="Кількість"><button class="btn sm" data-act="buy" data-id="${b.id}" data-p="${p.id}">${p.carOnly ? 'Забрати зі складу' : 'Купити по ' + money(unitCost, 2)}</button></div></div>`;
    }
    return html + '</div>';
  },

  staff(b) { return staffTab(b); },

  marketing(b) {
    return `<div class="card"><p class="muted">Кампанії збільшують відвідуваність. Зараз: <b>${money(dailyMarketing(b))}/день</b>. Відділ маркетингу додає +3%/рівень до всіх магазинів.</p></div><div class="cards">${Object.entries(CAMPAIGNS).map(([k, c]) => `
      <div class="card camp ${b.marketing[k] ? 'on' : ''}"><span class="big">${c.icon}</span><div><b>${c.name}</b><br><small>+${Math.round(c.boost * 100)}% · ${money(c.cost * priceLvl())}/день</small></div>
      <button class="btn ${b.marketing[k] ? 'danger' : 'primary'} sm" data-act="camp" data-id="${b.id}" data-k="${k}">${b.marketing[k] ? 'Стоп' : 'Запустити'}</button></div>`).join('')}</div>`;
  },

  upgrades(b) {
    return `<div class="cards">${Object.entries(UPGRADES).map(([k, u]) => {
      const lvl = b.upg[k], max = lvl >= MAX_UPG, c = max ? 0 : upgradeCost(b, k);
      return `<div class="card camp"><span class="big">${u.icon}</span><div><b>${u.name}</b> <span class="tag">${lvl}/${MAX_UPG}</span><br><small>${u.desc}</small></div>${max ? '<span class="tag good">Макс.</span>' : `<button class="btn primary sm" ${state.cash < c ? 'disabled' : ''} data-act="upg" data-id="${b.id}" data-k="${k}">${money(c)}</button>`}</div>`;
    }).join('')}</div>`;
  },
};

function staffTab(u) {
  const st = staffOf(u), role = unitRole(u);
  const fit = state.candidates.filter((c) => c.role === role), other = state.candidates.filter((c) => c.role !== role);
  let html = `<div class="card"><p>Працівників: <b>${st.length}/${maxStaff(u)}</b> · потрібна роль: <b>${ROLES[role]}</b> · зарплати ${money(dailyWages(u))}/день ${u.kind && u.kind !== 'office' ? `· ефективність ${pct(facStaffFactor(u), 0)}` : u.kind ? '' : `· ≈${Math.round(retailCapacity(u))} клієнтів/год`}</p>
    ${st.length ? `<div class="row wrap"><button class="btn sm" data-act="bonus" data-id="${u.id}">🎁 Премія всім (${money(sum(st, (p) => p.wage) * 16)})</button></div>` : ''}`;
  if (st.length) html += `<div class="table-wrap"><table><thead><tr><th>Ім’я</th><th>Навичка</th><th>Мораль</th><th>Ставка</th><th></th></tr></thead><tbody>${st.map((p) => `<tr><td>${esc(p.name)}<br><small>${ROLES[p.role]}${p.role !== role ? ' (не за профілем)' : ''}</small></td><td>${skillDots(p.skill)}</td><td>${bar(p.morale)}</td><td>${money(p.wage, 1)}/год</td><td><div class="row nowrap"><button class="btn sm" data-act="raise" data-id="${p.id}">+10%</button><button class="btn danger sm" data-act="fire" data-id="${p.id}">✕</button></div></td></tr>`).join('')}</tbody></table></div>`;
  html += `</div><div class="card"><h3>Кандидати</h3>${st.length >= maxStaff(u) ? '<p class="muted">Усі місця зайняті.</p>' : ''}<div class="table-wrap"><table><thead><tr><th>Кандидат</th><th>Роль</th><th>Навичка</th><th>Ставка</th><th></th></tr></thead><tbody>${[...fit, ...other].map((c) => `<tr class="${c.role === role ? '' : 'dim'}"><td>${esc(c.name)}</td><td>${ROLES[c.role]}</td><td>${skillDots(c.skill)}</td><td>${money(c.wage, 1)}/год</td><td><button class="btn primary sm" ${st.length >= maxStaff(u) ? 'disabled' : ''} data-act="hireHere" data-id="${c.id}" data-u="${u.id}">Найняти</button></td></tr>`).join('')}</tbody></table></div></div>`;
  return html;
}

function facTab(f) {
  const F = FACILITIES[f.kind], r = facRecipe(f), y = f.yest;
  let html = '';
  if (f.kind === 'carplant') {
    const ms = state.carModels.filter((m) => m.active);
    html += `<div class="card"><h3>Модель у виробництві</h3>${ms.length ? `<select data-change="recipe" data-id="${f.id}"><option value="">— оберіть —</option>${ms.map((m) => `<option value="${m.id}" ${f.recipe === m.id ? 'selected' : ''}>${esc(m.name)} (${SEGMENTS[m.seg].name}, якість ${m.quality})</option>`).join('')}</select>` : '<p>Немає моделей. <a data-act="nav" data-v="cars">Розробити авто</a></p>'}</div>`;
  } else if (F.recipes.length > 1) {
    html += `<div class="card"><h3>Продукція</h3><div class="chips filter">${F.recipes.map((x) => `<button class="chip ${f.recipe === x.id ? 'on' : ''}" data-act="recipe" data-id="${f.id}" data-v="${x.id}">${GOODS[x.out].icon} ${GOODS[x.out].name}</button>`).join('')}</div></div>`;
  }
  if (r) {
    const full = facRateFull(f, r);
    const outName = r.out === 'power' ? '⚡ Електроенергія (МВт·год)' : goodName(r.out);
    html += `<div class="kpis">${kpi('Потужність', `${Math.round(full).toLocaleString('uk-UA')}/день`, '', outName)}${kpi('Ефективність персоналу', pct(facStaffFactor(f), 0))}${kpi('Вироблено вчора', y ? Math.round(y.out).toLocaleString('uk-UA') : '—')}${kpi('Вартість випуску', y && y.value ? money(y.value) : '—')}</div>`;
    const ins = Object.entries(r.in);
    if (ins.length) html += `<div class="card"><h3>Сировина на день (при повній потужності)</h3><table><thead><tr><th>Ресурс</th><th>Потрібно</th><th>На складі</th><th>Ціна ринку</th></tr></thead><tbody>${ins.map(([g, per]) => `<tr><td>${goodName(g)}</td><td>${Math.round(per * full).toLocaleString('uk-UA')}</td><td class="${whQty(g) < per * full ? 'neg' : 'pos'}">${Math.floor(whQty(g)).toLocaleString('uk-UA')}</td><td>${money(buyPrice(g), 2)}</td></tr>`).join('')}${r.comp ? `<tr><td>🔧 Комплектуючі (двигун, кузов, салон)</td><td colspan="3">${money(r.comp * priceLvl())} за авто</td></tr>` : ''}</tbody></table>
      <label class="switch"><input type="checkbox" data-change="autoBuy" data-id="${f.id}" ${f.autoBuy ? 'checked' : ''}> Автопостачання з ринку (+3% і транспорт)</label></div>`;
  } else if (f.kind === 'logistics') {
    html += `<div class="card"><p>Логістичний центр ${staffOf(f).length ? 'працює' : '<b class="neg">не працює без персоналу</b>'}: +100 000 місткості складу та −30% вартості перевезень.</p></div>`;
  }
  if (y) html += `<div class="card"><h3>Витрати вчора</h3><table class="pl"><tr><td>Сировина і комплектуючі</td><td class="neg">${money(-y.inCost)}</td></tr><tr><td>Зарплати</td><td class="neg">${money(-y.wages)}</td></tr><tr><td>Електроенергія</td><td class="neg">${money(-y.power)}</td></tr><tr><td>Обслуговування</td><td class="neg">${money(-y.maint)}</td></tr>${y.short ? `<tr><td colspan="2" class="neg">⚠️ ${esc(y.short)}</td></tr>` : ''}</table></div>`;
  html += `<div class="card"><h3>Обладнання</h3>${bar(f.cond)}<p>Стан ${f.cond.toFixed(0)}%${f.broken ? ` · <b class="neg">аварія, ${f.broken} дн.</b>` : ''}${f.strike ? ` · <b class="neg">страйк ${f.strike} дн.</b>` : ''}</p><div class="row wrap">
    <button class="btn" ${repairCost(f) <= 0 ? 'disabled' : ''} data-act="repair" data-id="${f.id}">🔧 Ремонт ${money(repairCost(f))}</button>
    ${f.level < 3 ? `<button class="btn primary" ${state.cash < facUpgradeCost(f) ? 'disabled' : ''} data-act="facUp" data-id="${f.id}">⬆ Рівень ${f.level + 1}: ${moneyK(facUpgradeCost(f))}</button>` : '<span class="tag good">Макс. рівень</span>'}</div>
    <label class="switch"><input type="checkbox" data-change="manager" data-id="${f.id}" ${f.manager ? 'checked' : ''}> <span><b>Керуючий</b> (${money(managerCost())}/день): укомплектовує штат, ремонтує, закуповує сировину, тримає мораль, +5% виробництва</span></label></div>
    <div class="card"><h3>Продаж</h3><p class="muted">Оцінка: ${money(facValue(f))}.</p><button class="btn danger" data-act="sellFac" data-id="${f.id}">Продати</button></div>`;
  return html;
}

function officeTab(f) {
  const proj = state.projects.find((p) => p.office === f.id && p.status === 'dev');
  const devs = staffOf(f);
  let html = `<div class="kpis">${kpi('Програмістів', `${devs.length}/${maxStaff(f)}`)}${kpi('Очок розробки/день', f.yest && f.yest.devPts ? f.yest.devPts.toFixed(0) : '—')}${kpi('Технології IT', 'рівень ' + state.tech.it)}</div>`;
  if (proj) html += `<div class="card"><h3>${SOFT[proj.kind].icon} ${esc(proj.name)}</h3>${bar(proj.progress, proj.work, 'good')}<p>${Math.floor(proj.progress)} / ${proj.work} очок · ${devs.length ? `≈${Math.ceil((proj.work - proj.progress) / Math.max(1, f.yest && f.yest.devPts ? f.yest.devPts : sum(devs, (p) => p.skill)))} дн.` : 'немає розробників'}</p></div>`;
  else {
    html += `<div class="card"><h3>Новий проєкт</h3><p class="muted">Без проєкту програмісти займаються дослідженнями (+очки R&D).</p><label>Назва <input id="projName" maxlength="30" placeholder="Напр. «Кур'єр Онлайн»"></label><div class="typelist">${Object.entries(SOFT).map(([k, K]) => `<div class="typerow ${state.tech.it < K.tech ? 'dim' : ''}"><span class="big">${K.icon}</span><div><b>${K.name}</b><br><small>${K.work} очок · ${K.tech ? 'потрібно IT ' + K.tech : 'доступно'}</small></div><button class="btn primary sm" ${state.tech.it < K.tech ? 'disabled' : ''} data-act="startProj" data-id="${f.id}" data-k="${k}">Почати</button></div>`).join('')}</div></div>`;
  }
  const done = state.projects.filter((p) => p.office === f.id && p.status !== 'dev');
  if (done.length) html += `<div class="card"><h3>Випущені продукти</h3><table><thead><tr><th>Продукт</th><th>Якість</th><th>Користувачі</th><th>Дохід/день</th></tr></thead><tbody>${done.map((p) => `<tr><td>${SOFT[p.kind].icon} ${esc(p.name)}</td><td>${p.quality}</td><td>${Math.round(p.users).toLocaleString('uk-UA')}</td><td>${money(p.rev)}</td></tr>`).join('')}</tbody></table></div>`;
  html += `<div class="card"><label class="switch"><input type="checkbox" data-change="manager" data-id="${f.id}" ${f.manager ? 'checked' : ''}> <span><b>Тімлід</b> (${money(managerCost())}/день): наймає програмістів, сам запускає нові проєкти, +5% швидкості</span></label><p class="muted">Оренда ${money(lotRent(lotOf(f)))}/день · оцінка ${money(facValue(f))}</p><button class="btn danger" data-act="sellFac" data-id="${f.id}">Продати офіс</button></div>`;
  return html;
}

// ================= Старт =================
function startPrompt(canCancel) {
  const look = (state && state.me && state.me.look) || { skin: AVATAR.skin[1], hair: AVATAR.hair[0], shirt: AVATAR.shirt[0], style: 'short' };
  window._draftLook = { ...look };
  const sw = (k) => `<div class="swatches">${AVATAR[k].map((c) => `<button class="sw ${look[k] === c ? 'on' : ''}" style="background:${c}" data-act="look" data-k="${k}" data-v="${c}" aria-label="${c}"></button>`).join('')}</div>`;
  showModal(`<h2>Бізнес Імперія</h2><p class="muted">Від звичайної людини до глобальної корпорації.</p>
    <div class="row creator"><div id="avPrev">${avatarSVG(look, 84)}</div><div class="grow">
      <label>Ваше ім’я <input id="meName" maxlength="28" value="${esc(state && state.me ? state.me.name : 'Олександр Коваль')}"></label>
      <label>Назва компанії <input id="coName" maxlength="32" value="Коваль Груп"></label></div></div>
    <label>Шкіра</label>${sw('skin')}<label>Волосся</label>${sw('hair')}<label>Одяг</label>${sw('shirt')}
    <div class="chips filter">${AVATAR.style.map((s) => `<button class="chip ${look.style === s ? 'on' : ''}" data-act="look" data-k="style" data-v="${s}">${{ short: 'Коротке', long: 'Довге', bun: 'Пучок', bald: 'Лисий' }[s]}</button>`).join('')}</div>
    <label>Місто</label><div class="citylist">${Object.entries(CITIES).map(([k, C], i) => `<label class="cityopt"><input type="radio" name="city" value="${k}" ${i === 0 ? 'checked' : ''}><span><b>${C.name}</b> <small class="muted">${C.flag}</small><br><small>${C.desc}</small></span></label>`).join('')}</div>
    <div class="row end">${canCancel ? '<button class="btn" data-act="modalClose">Скасувати</button>' : ''}<button class="btn primary" data-act="startGame">Почати з $4 000</button></div>`);
}

// ================= Дії =================
const ACT = {
  nav: (d) => { state.ui.view = d.v; state.ui.tab = null; hideModal(); document.getElementById('main').scrollTop = 0; window.scrollTo(0, 0); },
  more: () => showModal(`<h2>Розділи</h2><div class="moregrid">${NAV.map(([id, ic, n]) => `<button data-act="nav" data-v="${id}"><span>${ic}</span>${n}</button>`).join('')}</div><div class="row end"><button class="btn" data-act="modalClose">Закрити</button></div>`),
  speed: (d) => setSpeed(+d.v),
  selLot: (d) => { state.ui.lot = d.id || null; if (d.id && !use3D()) setTimeout(() => { const p = document.getElementById('lotpanel'); if (p) p.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 30); },
  openBiz: (d) => openBusiness(d.lot, d.type),
  openFac: (d) => openFacility(d.lot, d.kind),
  construct: (d) => confirmBox(`Збудувати ${CONSTRUCT[d.kind].name.toLowerCase()} за ${money(constructCost(d.kind, lotById(d.lot)))}?`, () => construct(d.lot, d.kind)),
  biz: (d) => { Object.assign(state.ui, { view: 'biz', bizId: d.id, tab: 'overview' }); hideModal(); },
  fac: (d) => { Object.assign(state.ui, { view: 'fac', facId: d.id, tab: 'overview' }); hideModal(); },
  tab: (d) => { state.ui.tab = d.v; },
  cam: (d) => City3D.control(d.v),
  quality: (d) => City3D.setQuality(d.v),
  toggle3d: () => { state.ui.no3d = !state.ui.no3d; },
  showOnMap: (d) => { const u = unitById(d.id); state.ui.view = 'map'; state.ui.lot = u.lotId; if (use3D()) City3D.focus(u.lotId); },
  buy: (d) => { const b = bizById(d.id); const q = +document.getElementById('qty-' + d.p).value; const r = buyStock(b, d.p, q); if (r.qty) toast(`Отримано ${r.qty} од.${r.own ? ` (${r.own} з власного складу)` : ''}${r.cost ? ' за ' + money(r.cost) : ''}.`, 'good'); },
  fillAll: (d) => fillAll(bizById(d.id)),
  priceFair: (d) => { const b = bizById(d.id), p = productsOf(b).find((x) => x.id === d.p); b.products[d.p].price = +fairPrice(p, b).toFixed(2); },
  priceUp: (d) => { const st = bizById(d.id).products[d.p]; st.price = +(st.price * 1.05).toFixed(2); },
  priceDown: (d) => { const st = bizById(d.id).products[d.p]; st.price = +(st.price * 0.95).toFixed(2); },
  hire: (d) => { const s = document.getElementById('hire-' + d.id); hire(d.id, s && s.value); },
  hireHere: (d) => hire(d.id, d.u),
  fire: (d) => { const p = state.staff.find((x) => x.id === d.id); confirmBox(`Звільнити ${esc(p.name)}? Вихідна допомога ${money(p.wage * 24)}.`, () => fire(d.id)); },
  raise: (d) => raise(d.id),
  bonus: (d) => bonusAll(unitById(d.id)),
  camp: (d) => { const b = bizById(d.id); b.marketing[d.k] = !b.marketing[d.k]; },
  upg: (d) => upgradeBiz(bizById(d.id), d.k),
  sell: (d) => { const b = bizById(d.id); confirmBox(`Продати «${esc(b.name)}» за ${money(bizValue(b))}?`, () => sellBiz(b)); },
  sellFac: (d) => { const f = facById(d.id); confirmBox(`Продати «${esc(f.name)}» за ${money(facValue(f))}?`, () => sellFac(f)); },
  recipe: (d) => { const f = facById(d.id); f.recipe = d.v; ensureAutoSell(f); },
  repair: (d) => repairFac(facById(d.id)),
  facUp: (d) => { const f = facById(d.id), c = facUpgradeCost(f); if (state.cash < c) return toast('Недостатньо коштів.', 'bad'); book('capex', -c); f.invested += c; f.bookVal += c; f.level++; log(`${f.name}: рівень ${f.level}.`, 'good'); },
  startProj: (d) => { const n = (document.getElementById('projName') || {}).value; startProject(d.id, d.k, n && n.trim()); },
  promo: (d) => promoteProject(state.projects.find((p) => p.id === d.id)),
  research: (d) => research(d.k),
  mktSell: (d) => marketSell(d.g, +document.getElementById('sell-' + d.g).value),
  mktBuy: (d) => marketBuy(d.g, +document.getElementById('buy-' + d.g).value),
  designCar: () => designCar(state.ui.carDraft),
  carToggle: (d) => { const m = state.carModels.find((x) => x.id === d.id); m.active = !m.active; },
  buyProp: (d) => buyProp(d.id, false),
  buyPropM: (d) => buyProp(d.id, true),
  sellProp: (d) => confirmBox('Продати цей об’єкт нерухомості?', () => sellProp(d.id)),
  rentOut: (d) => { const p = propById(d.id); p.rentOut = !p.rentOut; if (!p.rentOut) p.tenant = null; },
  liveIn: (d) => { const p = propById(d.id); state.me.homeProp = p.id; p.rentOut = false; p.tenant = null; state.me.home = p.kind === 'house' ? 'villa' : 'flat'; log('Ви переїхали у власне житло.', 'good'); },
  loan: (d) => takeLoan(+d.v),
  repay: (d) => repayLoan(d.id),
  repayPart: (d) => { const l = state.loans.find((x) => x.id === d.id); repayLoan(d.id, Math.ceil(l.amount * 0.1)); },
  buySh: (d) => buyShares(d.id, +document.getElementById('sh-' + d.id).value),
  sellSh: (d) => sellShares(d.id, +document.getElementById('sh-' + d.id).value),
  sellAll: (d) => sellShares(d.id, state.portfolio[d.id].qty),
  sector: (d) => { state.ui.sector = d.v; },
  ipo: (d) => confirmBox(`Розмістити ${+d.v * 100}% акцій на біржі?`, () => doIPO(+d.v)),
  period: (d) => { state.ui.period = +d.v; },
  newsCat: (d) => { state.ui.newsCat = d.v; },
  deptUp: (d) => deptUp(d.k),
  allManagers: (d) => setAllManagers(d.v === '1'),
  deptDown: (d) => { state.depts[d.k] = Math.max(0, state.depts[d.k] - 1); },
  takeJob: (d) => takeJob(d.k),
  quitJob: () => quitJob(),
  course: (d) => takeCourse(d.k),
  editLook: () => { const lk = state.me.look; window._draftLook = { ...lk }; showModal(`<h2>Зовнішність</h2><div id="avPrev">${avatarSVG(lk, 84)}</div>${['skin', 'hair', 'shirt'].map((k) => `<label>${{ skin: 'Шкіра', hair: 'Волосся', shirt: 'Одяг' }[k]}</label><div class="swatches">${AVATAR[k].map((c) => `<button class="sw" style="background:${c}" data-act="look" data-k="${k}" data-v="${c}" aria-label="${c}"></button>`).join('')}</div>`).join('')}<div class="chips filter">${AVATAR.style.map((s) => `<button class="chip" data-act="look" data-k="style" data-v="${s}">${{ short: 'Коротке', long: 'Довге', bun: 'Пучок', bald: 'Лисий' }[s]}</button>`).join('')}</div><div class="row end"><button class="btn primary" data-act="lookSave">Зберегти</button></div>`); },
  look: (d) => { window._draftLook[d.k] = d.v; const p = document.getElementById('avPrev'); if (p) p.innerHTML = avatarSVG(window._draftLook, 84); document.querySelectorAll(`[data-act="look"][data-k="${d.k}"]`).forEach((b) => b.classList.toggle('on', b.dataset.v === d.v)); return 'norender'; },
  lookSave: () => { state.me.look = { ...window._draftLook }; hideModal(); },
  rename: (d) => { const u = unitById(d.id); showModal(`<h2>Перейменувати</h2><label>Назва <input id="bizName" maxlength="40" value="${esc(u.name)}"></label><div class="row end"><button class="btn" data-act="modalClose">Скасувати</button><button class="btn primary" data-act="renameOk" data-id="${u.id}">Зберегти</button></div>`); },
  renameOk: (d) => { const v = document.getElementById('bizName').value.trim(); if (v) unitById(d.id).name = v; hideModal(); },
  saveNow: () => { save(); toast('Гру збережено.', 'good'); },
  // ---- Адмін-панель ----
  admAdd: (d) => { book('admin', +d.v); toast(`Баланс ${+d.v > 0 ? '+' : ''}${money(+d.v)}.`, 'good'); },
  admSetCash: () => { const v = +document.getElementById('admCash').value; if (isFinite(v)) { book('admin', v - state.cash); state.negDays = 0; toast(`Баланс: ${money(v)}.`, 'good'); } },
  admPayDebt: () => { for (const l of state.loans) if (l.prop) { const p = propById(l.prop); if (p) p.mortgage = null; } state.loans = []; toast('Усі кредити списано.', 'good'); },
  admCredit: () => { state.me.credit = 850; },
  admPrices: (d) => { const b = bizById(d.id); for (const p of productsOf(b)) { const st = b.products[p.id]; if (st) st.price = +(+d.v ? st.price * +d.v : fairPrice(p, b)).toFixed(2); } },
  acquire: (d) => { const co = coById(d.id); confirmBox(`Поглинути «${esc(co.name)}» за ${money(takeoverPrice(co))}?`, () => acquireCompany(d.id)); },
  sellSub: (d) => { const co = coById(d.id); confirmBox(`Продати дочірню «${esc(co.name)}» за ${money(coMcap(co) * 0.95)}?`, () => sellSubsidiary(d.id)); },
  payout: (d) => { coById(d.id).payout = +d.v; },
  foundHQ: () => confirmBox(`Заснувати штаб-квартиру за ${money(hqCost())}?`, foundHQ),
  hqToggle: (d) => { const H = hqState(); H.on[d.k] = !H.on[d.k]; if (H.on[d.k]) { try { HQ_RUN[d.k](); } catch (e) { console.error(e); } toast(`${DIRECTIVES[d.k].exec}: доручення прийнято.`, 'good'); } },
  hqOpt: (d) => { const H = hqState(); H.opts[d.k] = isNaN(+d.v) ? d.v : +d.v; },
  bankOpen: () => confirmBox(`Отримати банківську ліцензію за ${money(bankLicenseCost())}? Ця сума стане статутним капіталом банку.`, openBank),
  bankRate: (d) => bankSetRate(d.k, +d.v),
  bankPayout: (d) => { state.bank.payout = +d.v; },
  bankInject: (d) => bankInject(+d.v),
  bankLend: (d) => bankLendToCorp(+d.v),
  bankRepay: () => bankRepayCorp(state.bank.internal),
  bankRefi: () => bankRefinance(),
  vcDD: (d) => vcDueDiligence(d.id),
  vcInvest: (d) => { const p = vcState().pitches.find((x) => x.id === d.id); confirmBox(`Інвестувати ${money(p.ask)} у «${esc(p.name)}»?`, () => vcInvest(d.id)); },
  vcSell: (d) => vcSell(d.id),
  league: (d) => { state.ui.league = d.v; },
  sponsorTeam: (d) => sponsorTeam(d.id),
  dropTeam: (d) => confirmBox('Завершити спонсорський контракт?', () => dropTeam(d.id)),
  teamInvest: (d) => { const t = sportState().teams.find((x) => x.id === d.id); t.invest = +d.v; },
  unlockCity: (d) => confirmBox(`Вийти на ринок міста ${CITIES[d.v].name} за ${money(regionCost(d.v))}?`, () => unlockCity(d.v)),
  goCity: (d) => { state.ui.mapCity = d.v; state.ui.lot = null; state.ui.view = 'map'; },
  mapCity: (d) => { state.ui.mapCity = d.v; state.ui.lot = null; if (use3D()) City3D.control('reset'); },
  rankSector: (d) => { state.ui.rankSector = d.v; },
  admOpen: (d) => { state.ui.admOpen = state.ui.admOpen === d.id ? null : d.id; },
  admRep: () => { for (const b of state.biz) b.rep = 100; },
  admFill: () => { for (const b of state.biz) { ensureProducts(b); const ps = productsOf(b); for (const p of ps) { const st = b.products[p.id]; st.stock = Math.max(st.stock, Math.floor(storageCap(b) * p.share)); } } toast('Склади заповнено.', 'good'); },
  admRepair: () => { for (const f of state.fac) { f.cond = 100; f.broken = 0; f.strike = 0; } },
  admLevel: () => { for (const f of state.fac) f.level = 3; for (const b of state.biz) b.upg = { interior: 3, equipment: 3, storage: 3 }; for (const k of Object.keys(state.depts)) state.depts[k] = 5; },
  admSkill: () => { for (const p of state.staff) { p.skill = 5; p.morale = 100; } },
  admCands: () => { for (const role of Object.keys(ROLES)) for (let i = 0; i < 2; i++) { const c = makeCandidate(); c.role = role; c.skill = 5; c.wage = +(marketWage(c) * 0.9).toFixed(1); state.candidates.unshift(c); } toast('Додано кандидатів з навичкою 5.', 'good'); },
  admNoComp: () => confirmBox('Прибрати всі конкуруючі точки з міста?', () => { for (const l of state.lots) l.npc = null; }),
  admRestoreComp: () => { const r = restoreCompetitors(); toast(`Відновлено компаній: ${r.revived}, нових точок у місті: ${r.placed}.`, 'good'); },
  admPhase: (d) => { state.econ.phase = d.v; state.econ.phaseDays = 60; news(`🛠️ Адмін: фаза економіки — ${PHASES[d.v].name}.`, 'econ'); },
  admResetPrices: () => { Object.assign(state.econ, { priceLevel: 1, wageLevel: 1, housing: 1 }); },
  admSkip: (d) => { for (let i = 0; i < 24 * +d.v && !state.over; i++) tick(); toast(`Пропущено ${d.v} дн.`, 'good'); },
  admResearch: () => { state.tech.points += 1000; },
  admAch: () => { for (const a of ACHIEVEMENTS) if (!state.achievements[a.id]) state.achievements[a.id] = state.day; },
  exportSave: () => {
    const code = btoa(unescape(encodeURIComponent(JSON.stringify(state))));
    showModal(`<h2>Код збереження</h2><p class="muted">Скопіюйте весь текст і збережіть у нотатках.</p><textarea id="saveCode" readonly rows="8" class="code">${code}</textarea><div class="row end"><button class="btn" data-act="modalClose">Закрити</button><button class="btn primary" data-act="copySave">Копіювати</button></div>`);
  },
  copySave: () => {
    const t = document.getElementById('saveCode'); t.select();
    const done = () => toast('Код скопійовано.', 'good');
    if (navigator.clipboard) navigator.clipboard.writeText(t.value).then(done, () => { document.execCommand('copy'); done(); });
    else { document.execCommand('copy'); done(); }
    return 'norender';
  },
  importSave: () => showModal(`<h2>Імпорт збереження</h2><p class="muted">Вставте код. Поточна гра буде замінена.</p><textarea id="saveIn" rows="8" class="code"></textarea><div class="row end"><button class="btn" data-act="modalClose">Скасувати</button><button class="btn primary" data-act="importOk">Завантажити</button></div>`),
  importOk: () => {
    try {
      const s = JSON.parse(decodeURIComponent(escape(atob(document.getElementById('saveIn').value.trim()))));
      if (!s || s.v !== 2 || !s.econ) throw new Error('несумісний код');
      state = s; migrateState(); save(); hideModal(); setSpeed(0); toast('Збереження завантажено.', 'good');
    } catch (e) { toast('Не вдалося прочитати код: ' + e.message, 'bad'); return 'norender'; }
  },
  newGameConfirm: () => confirmBox('Почати нову гру? Прогрес буде втрачено.', () => setTimeout(() => startPrompt(true), 0)),
  newGamePrompt: () => startPrompt(false),
  startGame: () => {
    const nm = document.getElementById('meName').value.trim(), co = document.getElementById('coName').value.trim();
    const c = document.querySelector('input[name=city]:checked');
    hideModal();
    newGame({ name: nm, company: co, city: c ? c.value : 'kyiv', look: { ...window._draftLook } });
    save(); setSpeed(1);
  },
  modalClose: () => hideModal(),
  confirmYes: () => { hideModal(); const f = pendingConfirm; pendingConfirm = null; if (f) f(); },
};

const CHANGE = {
  contracts: (el) => { state.flags.noContracts = !el.checked; },
  admName: (el) => { const v = el.value.trim(); if (!v) return; if (el.dataset.k === 'company') state.company = v; else state.me.name = v; },
  admUnitName: (el) => { const v = el.value.trim(); if (v) unitById(el.dataset.id).name = v; },
  admCarName: (el) => { const v = el.value.trim(); const m = state.carModels.find((x) => x.id === el.dataset.id); if (v && m) m.name = v; },
  admStock: (el) => { const b = bizById(el.dataset.id); ensureProducts(b); const v = Math.max(0, Math.floor(+el.value || 0)); b.products[el.dataset.p].stock = v; },
  admMkt: (el) => { const v = +el.value; if (v > 0) state.market[el.dataset.g].mult = clamp(v, 0.1, 10); },
  admWh: (el) => { const g = el.dataset.g, v = Math.max(0, Math.floor(+el.value || 0)); const have = whQty(g); if (v > have) whAdd(g, v - have, (v - have) * GOODS[g].price * priceLvl()); else whTake(g, have - v); },
  admEcon: (el) => { const v = +el.value; if (!isFinite(v)) return; const e = state.econ; if (el.dataset.k === 'tax') e.taxRate = clamp(v / 100, 0, 0.9); else if (el.dataset.k === 'inflation') e.inflation = v; else if (el.dataset.k === 'rate') e.rate = clamp(v, 0, 50); else e.unemployment = clamp(v, 0, 60); },
  price: (el) => { const v = parseFloat(el.value); if (v > 0) bizById(el.dataset.id).products[el.dataset.p].price = Math.round(v * 100) / 100; },
  target: (el) => { const v = parseInt(el.value, 10); if (v >= 0) bizById(el.dataset.id).products[el.dataset.p].target = v; },
  auto: (el) => { bizById(el.dataset.id).autoRestock = el.checked; },
  useOwn: (el) => { bizById(el.dataset.id).useOwn = el.checked; },
  manager: (el) => { const u = unitById(el.dataset.id); u.manager = el.checked; if (u.manager) { if (u.kind) managerFacDay(u); else managerRetailDay(u); } },
  priceMode: (el) => { const b = bizById(el.dataset.id); b.priceMode = el.value; managerRetailDay(b); },
  autoBuy: (el) => { facById(el.dataset.id).autoBuy = el.checked; },
  recipe: (el) => { const f = facById(el.dataset.id); f.recipe = el.value || null; ensureAutoSell(f); },
  transfer: (el) => transfer(el.dataset.id, el.value),
  autoSell: (el) => { const s = state.autoSell[el.dataset.g] || (state.autoSell[el.dataset.g] = { on: false, keep: 0 }); s.on = el.checked; },
  autoKeep: (el) => { const s = state.autoSell[el.dataset.g] || (state.autoSell[el.dataset.g] = { on: false, keep: 0 }); s.keep = Math.max(0, +el.value || 0); },
  home: (el) => { state.me.home = el.value; state.me.homeProp = null; },
  car: (el) => { state.ui.carDraft[el.dataset.k] = el.value; },
  hours: (el) => {
    const b = bizById(el.dataset.id), v = +el.value;
    if (el.dataset.k === 'open') { if (v >= b.close) return toast('Відкриття має бути раніше закриття.', 'bad'); b.open = v; }
    else { if (v <= b.open) return toast('Закриття має бути пізніше відкриття.', 'bad'); b.close = v; }
  },
};

if (typeof window !== 'undefined') window.androidBack = function () {
  const m = document.getElementById('modal');
  if (!m.classList.contains('hidden')) { if (state && !state.over) hideModal(); return true; }
  if (!state) return false;
  if (state.ui.view === 'map' && state.ui.lot) { state.ui.lot = null; render(true); return true; }
  if (state.ui.view === 'biz') { state.ui.view = 'businesses'; render(true); return true; }
  if (state.ui.view === 'fac') { state.ui.view = 'industry'; render(true); return true; }
  if (state.ui.view !== 'dashboard') { state.ui.view = 'dashboard'; render(true); return true; }
  save();
  return false;
};

function boot() {
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const f = ACT[el.dataset.act];
    if (!f) return;
    e.preventDefault();
    let r;
    try { r = f(el.dataset); } catch (err) { console.error(err); toast('Помилка: ' + err.message, 'bad'); }
    if (state && r !== 'norender') render(true);
  });
  document.addEventListener('change', (e) => {
    const el = e.target.closest('[data-change]');
    if (!el) return;
    const f = CHANGE[el.dataset.change];
    if (f) { f(el); el.blur(); render(true); }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.id === 'bizName') document.querySelector('[data-act="renameOk"]').click();
    if (e.key === ' ' && e.target === document.body && state) { e.preventDefault(); setSpeed(state.speed ? 0 : 1); }
  });
  // Екранна клавіатура змінює лише висоту вікна — не перемальовуємо, інакше поле вводу зникає разом із клавіатурою.
  let rt = 0, lastW = window.innerWidth;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      const ae = document.activeElement;
      const typing = ae && (ae.tagName === 'INPUT' || ae.tagName === 'SELECT' || ae.tagName === 'TEXTAREA');
      if (Math.abs(window.innerWidth - lastW) < 2 || typing) return;
      lastW = window.innerWidth;
      if (state && state.ui.view !== 'map') render(true);
    }, 200);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && state) save(); });
  if (loadSave() && state && !state.over) {
    migrateState();
    render(true); setSpeed(0);
    toast('Гру завантажено. Натисніть ▶, щоб продовжити.');
  } else startPrompt(false);
}
