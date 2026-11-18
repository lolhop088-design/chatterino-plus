'use strict';
/* БІЗНЕС ІМПЕРІЯ — головна сторінка (за дизайном гравця): шапка з поштою/трофеями/налаштуваннями,
   картка CEO з рівнем, 6 великих розділів-ілюстрацій, біржа BIZ-50, досягнення й події світу. */

// ---------- ілюстрації (SVG, без зовнішніх файлів) ----------
const ILL = {
  business: () => `<svg viewBox="0 0 200 140" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="isk1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5fa8e8"/><stop offset="1" stop-color="#cfe6fb"/></linearGradient><linearGradient id="igl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2f6fb8"/><stop offset=".5" stop-color="#7fb6ea"/><stop offset="1" stop-color="#1d4f8f"/></linearGradient></defs><rect width="200" height="140" fill="url(#isk1)"/><ellipse cx="40" cy="30" rx="30" ry="8" fill="#fff" opacity=".6"/><ellipse cx="150" cy="22" rx="24" ry="6" fill="#fff" opacity=".5"/>${[[10, 70, 22], [34, 45, 26], [62, 20, 34], [98, 35, 28], [128, 55, 24], [154, 30, 30], [184, 65, 20]].map(([x, y, w]) => `<rect x="${x}" y="${y}" width="${w}" height="${140 - y}" fill="url(#igl)"/>${Array.from({ length: Math.floor((140 - y) / 7) }, (_, i) => `<rect x="${x + 2}" y="${y + 3 + i * 7}" width="${w - 4}" height="1.2" fill="#dbeeff" opacity=".55"/>`).join('')}`).join('')}<rect y="128" width="200" height="12" fill="#3c6b4a"/></svg>`,
  economy: () => `<svg viewBox="0 0 200 140" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="iec" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1d3a"/><stop offset="1" stop-color="#1c3a6b"/></linearGradient><linearGradient id="igd" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b8860b"/><stop offset=".5" stop-color="#ffd66b"/><stop offset="1" stop-color="#c8961e"/></linearGradient></defs><rect width="200" height="140" fill="url(#iec)"/>${Array.from({ length: 14 }, (_, i) => { const h = 10 + ((i * 37) % 30), y = 70 - i * 2 - h / 2; return `<line x1="${10 + i * 13}" x2="${10 + i * 13}" y1="${y - 6}" y2="${y + h + 6}" stroke="${i % 3 ? '#4fb3ff' : '#7aa7d6'}" stroke-width="1"/><rect x="${7 + i * 13}" y="${y}" width="6" height="${h}" fill="${i % 3 ? '#3a8fd6' : '#5a7fa8'}" opacity=".7"/>`; }).join('')}${[[60, 6], [80, 9], [100, 12], [120, 8]].map(([x, n]) => Array.from({ length: n }, (_, k) => `<ellipse cx="${x}" cy="${128 - k * 5}" rx="10" ry="3" fill="url(#igd)" stroke="#8a6410" stroke-width=".4"/>`).join('')).join('')}${[[150, 40], [165, 60], [180, 85]].map(([x, h]) => `<rect x="${x}" y="${130 - h}" width="11" height="${h}" fill="url(#igd)"/>`).join('')}<path d="M100 95 L140 70 L160 78 L190 30" stroke="#ffd66b" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M182 28 L194 24 L192 37 Z" fill="#ffd66b"/></svg>`,
  state: () => `<svg viewBox="0 0 200 140" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="ist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6fb2ea"/><stop offset="1" stop-color="#e2f0fb"/></linearGradient></defs><rect width="200" height="140" fill="url(#ist)"/><circle cx="20" cy="110" r="16" fill="#4f8f4a"/><circle cx="182" cy="108" r="18" fill="#4f8f4a"/><rect x="30" y="58" width="140" height="70" fill="#efe9da"/><polygon points="24,60 100,30 176,60" fill="#e6dfcd" stroke="#cfc6b0"/><polygon points="40,58 100,36 160,58" fill="#f5f0e3"/>${Array.from({ length: 9 }, (_, i) => `<rect x="${38 + i * 15}" y="64" width="6" height="56" fill="#fbf8f0" stroke="#d8cfba" stroke-width=".6"/>`).join('')}<rect x="26" y="120" width="148" height="8" fill="#d8cfba"/><rect x="20" y="128" width="160" height="6" fill="#c9bfa8"/><line x1="70" y1="10" x2="70" y2="40" stroke="#888" stroke-width="1.2"/><rect x="70" y="10" width="16" height="10" fill="#2f6fd6"/><rect x="70" y="15" width="16" height="5" fill="#ffd23f"/><line x1="130" y1="12" x2="130" y2="42" stroke="#888" stroke-width="1.2"/><rect x="130" y="12" width="16" height="10" fill="#d64545"/><rect x="130" y="15.5" width="16" height="3" fill="#fff"/></svg>`,
  city: () => `<svg viewBox="0 0 200 140" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="icy" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7cb4e4"/><stop offset="1" stop-color="#d7e8f6"/></linearGradient><linearGradient id="iwt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f6ea8"/><stop offset="1" stop-color="#173f66"/></linearGradient></defs><rect width="200" height="140" fill="url(#icy)"/>${[[5, 60, 14], [20, 45, 12], [33, 70, 16], [50, 30, 10], [61, 52, 14], [76, 20, 8], [85, 40, 15], [101, 55, 12], [114, 28, 13], [128, 48, 16], [145, 36, 12], [158, 62, 14], [173, 44, 12], [186, 58, 14]].map(([x, y, w]) => `<rect x="${x}" y="${y}" width="${w}" height="${100 - y}" fill="${['#3d6c9c', '#4f7fb0', '#2c5682', '#6a90b8'][x % 4]}"/>`).join('')}<rect x="79" y="8" width="2" height="12" fill="#2c5682"/><rect y="100" width="200" height="40" fill="url(#iwt)"/>${Array.from({ length: 8 }, (_, i) => `<rect x="${10 + i * 25}" y="${106 + (i % 3) * 8}" width="14" height="1.4" fill="#9cc7ef" opacity=".6"/>`).join('')}</svg>`,
  dev: () => `<svg viewBox="0 0 200 140" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="idv" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1b4f8f"/><stop offset="1" stop-color="#0b2347"/></linearGradient><linearGradient id="ifl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5ec8ff"/><stop offset="1" stop-color="#1f6fd6"/></linearGradient></defs><rect width="200" height="140" fill="url(#idv)"/>${Array.from({ length: 6 }, (_, i) => `<rect x="${8 + i * 32}" y="${20 + (i % 2) * 14}" width="12" height="40" rx="5" fill="#6fb6ff" opacity=".18"/>`).join('')}<rect x="60" y="118" width="80" height="8" rx="2" fill="#e8edf3"/><rect x="92" y="60" width="10" height="58" fill="#d9dfe7"/><rect x="74" y="34" width="14" height="44" rx="3" fill="#f2f5f8" transform="rotate(-28 81 56)"/><rect x="70" y="20" width="10" height="18" rx="2" fill="#2b2f36" transform="rotate(-28 75 29)"/><circle cx="106" cy="76" r="10" fill="#c9d1db"/><rect x="66" y="96" width="44" height="6" fill="#bfc8d3"/><path d="M150 50 L150 74 L132 112 Q130 120 138 120 L176 120 Q184 120 182 112 L164 74 L164 50 Z" fill="#e6f3ff" opacity=".85"/><path d="M140 96 L174 96 L181 112 Q183 119 175 119 L139 119 Q131 119 133 112 Z" fill="url(#ifl)"/><rect x="147" y="44" width="20" height="7" rx="2" fill="#e6f3ff"/></svg>`,
  other: () => `<svg viewBox="0 0 200 140" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="iot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a4a66"/><stop offset=".6" stop-color="#c88a4a"/><stop offset="1" stop-color="#5a4636"/></linearGradient></defs><rect width="200" height="140" fill="url(#iot)"/><circle cx="160" cy="70" r="22" fill="#ffcf7a" opacity=".5"/>${[[0, 70, 30], [30, 82, 22], [150, 76, 26], [176, 66, 24]].map(([x, y, w]) => `<rect x="${x}" y="${y}" width="${w}" height="${140 - y}" fill="#2e2a2a" opacity=".55"/>`).join('')}<rect x="44" y="72" width="54" height="40" rx="3" fill="#f3efe6" transform="rotate(-8 71 92)"/>${Array.from({ length: 5 }, (_, i) => `<rect x="50" y="${80 + i * 6}" width="${i ? 40 : 30}" height="${i ? 2 : 4}" fill="#555" transform="rotate(-8 71 92)"/>`).join('')}<circle cx="128" cy="108" r="14" fill="#fff"/><path d="M128 94 l5 6 -5 5 -5 -5 Z M114 108 l6 -3 3 6 -5 4 Z M142 108 l-6 -3 -3 6 5 4 Z" fill="#222"/><path d="M60 30 L104 74 M104 30 L60 74" stroke="#d9dde3" stroke-width="5" stroke-linecap="round"/><path d="M60 30 L54 24 M104 30 L110 24" stroke="#8a6a3a" stroke-width="7" stroke-linecap="round"/><path d="M150 24 l6 12 13 2 -10 9 3 13 -12 -7 -12 7 3 -13 -10 -9 13 -2 Z" fill="#ffd23f" opacity=".9"/></svg>`,
};
const HOME_CATS = [
  { k: 'business', icon: '🏢', name: 'Бізнес', sub: 'Компанії, філії та корпорації', views: ['businesses', 'industry', 'divisions', 'cars', 'hq', 'staff', 'map'] },
  { k: 'economy', icon: '📈', name: 'Економіка', sub: 'Ринки, банки, інвестиції', views: ['finance', 'stocks', 'bank', 'ventures', 'world', 'ranking'] },
  { k: 'state', icon: '🏛️', name: 'Держава', sub: 'Політика, закони й вплив', views: ['politics', 'gov', 'antitrust', 'investigations'] },
  { k: 'city', icon: '📍', name: 'Місто', sub: 'Інфраструктура й нерухомість', views: ['map', 'citydev', 'realty', 'regions', 'globe'] },
  { k: 'dev', icon: '⚗️', name: 'Розвиток', sub: 'Технології й інновації', views: ['science', 'tech'] },
  { k: 'other', icon: '⚔️', name: 'Інші системи', sub: 'Війни корпорацій, злочинність, ЗМІ й спорт', views: ['corpwar', 'rivals', 'media', 'newsroom', 'underworld', 'security', 'clubs', 'sponsor'] },
];
const VIEW_DESC = { businesses: 'ваші магазини', industry: 'заводи й склад', divisions: 'телеком, авіа, готелі, фарма, космос', cars: 'власні моделі авто', hq: 'директори й дочірні компанії', staff: 'працівники й відділи', map: '3D-карта міста', finance: 'звіти й баланс', stocks: 'біржа й IPO', bank: 'кредити й власний банк', ventures: 'інвестиції в стартапи', world: 'сировина, валюти, мита', ranking: 'топ компаній', politics: 'партії, вибори, закони', gov: 'міністерства й бюджет', antitrust: 'частки ринку й справи', investigations: 'суди й розслідування', citydev: 'будівництво інфраструктури', realty: 'квартири, ТЦ, ЖК', regions: 'нові міста', globe: 'світова карта', science: 'дерево технологій', tech: 'IT-продукти й R&D', corpwar: 'альянси, картелі, суди', rivals: 'ІІ-конкуренти', media: 'телеканали, газети, сайти', newsroom: 'термінал новин', underworld: 'угруповання', security: 'охорона й страхування', clubs: 'власні клуби й ліги', sponsor: 'спонсорство команд' };

/** Рівень CEO: досвід за досягнення, капітал, дні в грі й покоління. */
function ceoLevel() {
  const nw = Math.max(1, netWorth());
  const xp = Object.keys(state.achievements).length * 60 + Math.max(0, Math.log10(nw) - 3) * 120 + state.day * 0.8 + (state.life ? (state.life.gen - 1) * 300 : 0);
  const lvl = Math.floor(Math.sqrt(xp / 25)) + 1, cur = (lvl - 1) * (lvl - 1) * 25, next = lvl * lvl * 25;
  return { lvl, prog: (xp - cur) / (next - cur) };
}
function idxRange(r) { const L = liveState(), n = { w: 7, m: 30, q: 90, y: 365, all: 99999 }[r] || 30; return L.idx.slice(-n - 1); }

Object.assign(VIEWS, {
  home() {
    const last = state.ledger[state.ledger.length - 1] || {}, h = state.history;
    const nw = netWorth(), nwPrev = h.length > 1 ? h[h.length - 2].nw : nw;
    const C = ceoLevel(), al = typeof empireAlerts === 'function' ? empireAlerts() : [];
    const L = liveState(), rng = state.ui.idxRange || 'm', pts = idxRange(rng);
    const iv = pts.length ? pts[pts.length - 1].v : 1000, i0 = pts.length ? pts[0].v : iv, ich = i0 ? iv / i0 - 1 : 0;
    const mn = Math.min(...pts.map((p) => p.v), iv), mx = Math.max(...pts.map((p) => p.v), iv), W = 300, H = 70;
    const xy = pts.map((p, i) => `${(i / Math.max(1, pts.length - 1) * W).toFixed(1)},${(H - (p.v - mn) / Math.max(1e-9, mx - mn) * (H - 8) - 4).toFixed(1)}`);
    const col = ich >= 0 ? '#22a35a' : '#e04848';
    const got = Object.keys(state.achievements).length, today = L.today && L.today.day >= state.day - 1 ? L.today : null;
    return `<div class="home">
      <div class="hhead"><div class="hlogo">👑<div><b>БізІмперія</b><small>Побудуй свою імперію</small></div></div>
        <div class="hicons"><button data-act="homeEvents" aria-label="Події">✉️${al.length ? `<i>${al.length}</i>` : ''}</button><button data-act="nav" data-v="achievements" aria-label="Досягнення">🏆</button><button data-act="nav" data-v="settings" aria-label="Налаштування">⚙️</button></div></div>
      <div class="hprofile" data-act="nav" data-v="personal"><div class="hav">${avatarSVG(state.me.look, 64)}</div><div class="hpinfo"><b>${esc(state.me.name).toUpperCase()} 👑</b><small>CEO · Рівень ${C.lvl}</small><div class="hxp"><i style="width:${Math.round(C.prog * 100)}%"></i></div><small class="hxpp">${Math.round(C.prog * 100)}%</small></div>
        <div class="hmoney"><div><span>💵</span><b>${moneyK(state.cash).replace('$', '')}</b><small class="${(last.profit || 0) >= 0 ? 'up' : 'down'}">${(last.profit || 0) >= 0 ? '+' : ''}${moneyK(last.profit || 0).replace('$', '')}/день</small></div><div><span>🪙</span><b>${moneyK(nw).replace('$', '')}</b><small class="${nw >= nwPrev ? 'up' : 'down'}">${nw >= nwPrev ? '+' : ''}${moneyK(nw - nwPrev).replace('$', '')}/день</small></div></div></div>
      <div class="hgrid">${HOME_CATS.map((c) => `<button class="hcat" data-act="homeCat" data-v="${c.k}">${ILL[c.k]()}<div class="hshade"></div><div class="htxt"><b><span>${c.icon}</span> ${c.name}</b><small>${c.sub}</small></div><span class="hchev">›</span></button>`).join('')}</div>
      <div class="card hstock" data-act="nav" data-v="stocks"><div class="row between"><b>📊 Біржа</b><span>BIZ-50 <b>${iv.toFixed(1)}</b> <span style="color:${col}">${ich >= 0 ? '▲' : '▼'} ${pct(Math.abs(ich), 1)}</span></span></div>
        <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" class="hspark">${xy.length > 1 ? `<path d="M0,${H} L${xy.join(' L')} L${W},${H} Z" fill="${col}" opacity=".15"/><path d="M${xy.join(' L')}" stroke="${col}" stroke-width="1.6" fill="none" vector-effect="non-scaling-stroke"/>` : `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" font-size="10" fill="currentColor" opacity=".5">історія з’явиться після першого дня</text>`}</svg>
        <div class="hrng">${[['w', '1т'], ['m', '1м'], ['q', '3м'], ['y', '1р'], ['all', 'Все']].map(([k, n]) => `<button class="${rng === k ? 'on' : ''}" data-act="idxRange" data-v="${k}">${n}</button>`).join('')}</div></div>
      <div class="hrow"><button class="card hmini" data-act="nav" data-v="achievements"><span class="big">🏆</span><div><b>Досягнення</b><small>${got} / ${ACHIEVEMENTS.length}</small><div class="hxp"><i style="width:${Math.round(got / ACHIEVEMENTS.length * 100)}%"></i></div></div><span class="hchev2">›</span></button>
        <button class="card hmini" data-act="homeEvents"><span class="big">📅</span><div><b>Події ${al.length ? `<i class="hbadge">${al.length}</i>` : ''}</b><small>${today ? `${today.icon} ${esc(today.title)}` : 'Нові події у світі'}</small></div><span class="hchev2">›</span></button></div>
      ${today ? `<div class="card hevent ${today.kind}"><small>Подія дня · день ${today.day}</small><p><b>${today.icon} ${esc(today.title)}</b><br>${esc(today.text)}</p>${today.effect ? `<small class="muted">Наслідок: ${esc(today.effect)}</small>` : ''}</div>` : ''}
    </div>`;
  },
});

Object.assign(ACT, {
  homeCat: (d) => {
    const c = HOME_CATS.find((x) => x.k === d.v); if (!c) return;
    const byId = Object.fromEntries(NAV.map((x) => [x[0], x]));
    showModal(`<h2>${c.icon} ${c.name}</h2><div class="newlist">${c.views.filter((v) => byId[v] || VIEWS[v]).map((v) => `<button data-act="nav" data-v="${v}"><span>${byId[v] ? byId[v][1] : '•'}</span><div><b>${byId[v] ? byId[v][2] : v}</b><br><small>${VIEW_DESC[v] || ''}</small></div></button>`).join('')}</div><div class="row end"><button class="btn" data-act="modalClose">Закрити</button></div>`);
  },
  homeEvents: () => {
    const al = typeof empireAlerts === 'function' ? empireAlerts() : [], L = liveState();
    showModal(`<h2>📅 Події</h2>${al.length ? `<h3>Потребує уваги</h3><ul class="alerts">${al.map(([k, t, v]) => `<li class="${k}" data-act="nav" data-v="${v}">${t} <span>›</span></li>`).join('')}</ul>` : ''}<h3>Події світу</h3><ul class="log news">${L.hist.slice(0, 20).map((e) => `<li class="${e.kind}"><small>Д${e.day}</small> ${e.icon} <b>${esc(e.title)}</b> — ${esc(e.text)}</li>`).join('') || '<li class="muted">Поки тихо.</li>'}</ul><div class="row end"><button class="btn" data-act="nav" data-v="newsroom">Усі новини</button><button class="btn primary" data-act="modalClose">Закрити</button></div>`);
  },
  idxRange: (d) => { state.ui.idxRange = d.v; },
});

// Нижнє меню: Головна · Профіль · Статистика · Досягнення · Ще
NAV.unshift(['home', '🏠', 'Головна', true]);
for (const n of NAV) n[3] = ['home', 'personal', 'empire', 'achievements'].includes(n[0]);
const NAV_SHORT = { personal: 'Профіль', empire: 'Статистика', achievements: 'Досягнення' };
renderNav = function () {
  const v = state.ui.view, cur = v === 'biz' ? 'businesses' : v === 'fac' ? 'industry' : v;
  const ORDER = ['home', 'personal', 'empire', 'achievements'];
  const list = [...ORDER.map((id) => NAV.find((x) => x[0] === id)).filter(Boolean), ...NAV.filter((x) => !ORDER.includes(x[0]))];
  const items = list.map(([id, ic, n, main]) => `<button class="${cur === id ? 'active' : ''} ${main ? 'main' : 'extra'}" data-act="nav" data-v="${id}"><span class="ic">${ic}</span><span class="lbl">${main && isMobile() && NAV_SHORT[id] ? NAV_SHORT[id] : n}</span></button>`).join('');
  const inMore = !NAV.find((x) => x[0] === cur && x[3]);
  document.getElementById('nav').innerHTML = items + `<button class="more ${inMore ? 'active' : ''}" data-act="more"><span class="ic">☰</span><span class="lbl">Ще</span></button>`;
};
if (typeof NAV_GROUPS !== 'undefined') NAV_GROUPS[0][1].unshift('home');

// ---------- Банери розділів у стилі головної ----------
const VIEW_CAT = {};
for (const c of HOME_CATS) for (const v of c.views) if (!VIEW_CAT[v]) VIEW_CAT[v] = c.k;
Object.assign(VIEW_CAT, { dashboard: 'business', empire: 'economy', personal: 'other', life: 'other', achievements: 'other', settings: 'dev', admin: 'dev', hq: 'business', news: 'other' });
const NO_BANNER = new Set(['home', 'map', 'biz', 'fac']);
function decorateView(id, html) {
  if (NO_BANNER.has(id) || typeof html !== 'string') return html;
  const i = html.indexOf('<h1>'); if (i < 0 || i > 80) return html;
  const j = html.indexOf('</h1>', i); if (j < 0) return html;
  const title = html.slice(i + 4, j), cat = VIEW_CAT[id] || 'business';
  return html.slice(0, i) + `<div class="vbanner">${ILL[cat]()}<div class="vshade"></div><div class="vtxt"><h1>${title}</h1>${VIEW_DESC[id] ? `<span class="vsub">${VIEW_DESC[id]}</span>` : ''}</div></div>` + html.slice(j + 5);
}
for (const id of Object.keys(VIEWS)) { const f = VIEWS[id]; VIEWS[id] = function () { return decorateView(id, f.apply(this, arguments)); }; }
