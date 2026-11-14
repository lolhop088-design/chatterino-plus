'use strict';
/* БІЗНЕС ІМПЕРІЯ — етап 8: «Імперія» (головна панель) і «Світова карта» з шарами
   (економіка, політика, бізнес, інформація, кримінал), маршрутами й картками міст. */

const GEO = { kyiv: [30.52, 50.45], lviv: [24.03, 49.84], odesa: [30.72, 46.48], berlin: [13.4, 52.52], newyork: [-74, 40.71], warsaw: [21.01, 52.23], london: [-0.12, 51.5], dubai: [55.27, 25.2], tokyo: [139.69, 35.68] };
const LAND = [
  [[-168, 65], [-140, 70], [-110, 72], [-85, 70], [-75, 62], [-60, 55], [-52, 47], [-66, 44], [-70, 41], [-76, 35], [-81, 31], [-80, 25], [-84, 30], [-90, 29], [-97, 26], [-97, 20], [-87, 21], [-83, 10], [-77, 8], [-80, 7], [-92, 15], [-105, 20], [-110, 23], [-117, 32], [-124, 40], [-124, 48], [-133, 55], [-146, 60], [-160, 58], [-165, 62]],
  [[-80, 8], [-75, 11], [-62, 10], [-50, 0], [-35, -7], [-39, -14], [-48, -26], [-58, -38], [-65, -42], [-68, -52], [-74, -50], [-73, -40], [-71, -30], [-70, -18], [-76, -12], [-81, -5], [-80, 0]],
  [[-50, 60], [-42, 60], [-20, 70], [-20, 80], [-60, 82], [-70, 78], [-55, 70]],
  [[-10, 36], [-9, 43], [-1, 44], [-5, 48], [2, 51], [8, 54], [8, 57], [5, 61], [13, 68], [25, 71], [40, 68], [60, 70], [80, 73], [105, 77], [140, 72], [180, 68], [180, 62], [160, 60], [142, 59], [135, 54], [141, 46], [130, 42], [126, 38], [122, 40], [121, 31], [117, 24], [108, 21], [106, 10], [100, 13], [98, 8], [100, 3], [104, 1], [98, 16], [94, 17], [90, 22], [80, 15], [77, 8], [72, 20], [67, 25], [57, 25], [56, 27], [50, 30], [48, 29], [52, 24], [56, 24], [59, 22], [55, 17], [44, 12], [43, 14], [39, 22], [35, 28], [34, 31], [36, 36], [30, 36], [27, 40], [24, 38], [22, 36], [20, 40], [16, 38], [12, 44], [9, 44], [3, 43], [-4, 37]],
  [[-17, 21], [-16, 12], [-8, 4], [5, 5], [9, 4], [9, -1], [13, -6], [12, -17], [15, -27], [18, -34], [26, -34], [33, -26], [35, -20], [40, -15], [40, -5], [44, 2], [51, 11], [43, 12], [37, 18], [33, 27], [32, 31], [20, 31], [10, 33], [10, 37], [-1, 36], [-6, 35], [-10, 30]],
  [[114, -22], [113, -26], [115, -34], [123, -34], [131, -31], [138, -35], [141, -38], [150, -37], [153, -28], [153, -25], [146, -19], [142, -11], [136, -12], [131, -11], [123, -17]],
  [[-5, 50], [1, 51], [2, 53], [-2, 56], [-2, 58.5], [-5, 58.5], [-6, 56], [-4, 54], [-5, 52]],
  [[130, 31], [131, 34], [135, 34], [140, 35], [141, 38], [142, 43], [145, 44], [141, 45], [140, 41], [136, 37], [132, 35]],
];
const MAP_LAYERS = { business: '🏢 Бізнес', economy: '📈 Економіка', politics: '🗳️ Політика', info: '📰 Інформація', crime: '🕶️ Кримінал' };
const prj = ([lon, lat]) => [(lon + 180) / 360 * 1000, (90 - lat) / 180 * 500];
function cityGeo(cid) {
  if (GEO[cid]) return GEO[cid];
  if (cid === 'mycity' && state.cities && state.cities.custom) { const h = GEO[state.cities.custom.home] || GEO.kyiv; return [h[0] + 3, h[1] - 2.5]; }
  return [0, 0];
}
function cityLayerInfo(cid, layer) {
  const unl = state.unlocked && state.unlocked[cid];
  const units = [...state.biz, ...state.fac].filter((u) => lotCityId(lotOf(u)) === cid).length + (state.corp ? state.corp.divs.filter((d) => d.city === cid).length : 0);
  const D = state.cities && state.cities.c[cid];
  if (layer === 'business') return { color: units ? '#2e9a5a' : unl ? '#3f7fc4' : '#8e96aa', r: 5 + Math.min(12, Math.sqrt(units) * 3), val: units ? `${units} об’єктів` : unl ? 'ринок відкрито' : 'закрито' };
  if (layer === 'economy') { const a = D ? D.attract : 50; return { color: a > 65 ? '#2e9a5a' : a > 45 ? '#d39b22' : '#d2463c', r: 4 + Math.sqrt(D ? D.pop : 1) * 2.4, val: `${D ? D.pop.toFixed(1) : '?'} млн · прив. ${Math.round(a)}` }; }
  if (layer === 'politics') { const m = state.pol && state.pol.mayors[cid]; const p = m && partyById(m.party); return { color: m && m.player ? '#ffb02e' : p ? IDEOLOGIES[p.ideo].color : '#8e96aa', r: 8, val: m ? `мер ${m.player ? '— ви' : m.name}` : '' }; }
  if (layer === 'info') { const n = state.news.filter((x) => x.text.includes(CITIES[cid].name)).length; return { color: n > 5 ? '#d2463c' : n > 1 ? '#e08a3c' : '#3f7fc4', r: 4 + Math.min(12, n * 1.5), val: `${n} згадок у новинах` }; }
  const ci = state.crime ? crimeIndex(cid) : 0, g = state.crime && strongestGang(cid);
  return { color: ci > 0.4 ? '#d2463c' : ci > 0.2 ? '#e08a3c' : '#2e9a5a', r: 5 + ci * 16, val: `злочинність ${Math.round(ci * 100)}%${g ? ` · ${g.name}` : ''}` };
}
function mapRoutes() {
  const r = [], unl = Object.keys(state.unlocked || {});
  const air = state.corp ? [...new Set(state.corp.divs.filter((d) => d.ind === 'airline').map((d) => d.city))] : [];
  for (const a of air) for (const b of unl) if (a !== b) r.push([a, b, '#5b9be0', 'авіа']);
  const ports = unl.filter((c) => state.cities && state.cities.c[c] && state.cities.c[c].lv.port > 0);
  for (let i = 0; i < ports.length; i++) for (let j = i + 1; j < ports.length; j++) r.push([ports[i], ports[j], '#2bb3a3', 'море']);
  if (!r.length) for (let i = 1; i < unl.length; i++) r.push([unl[0], unl[i], '#8e96aa', 'логістика']);
  return r;
}

Object.assign(VIEWS, {
  globe() {
    const layer = state.ui.mapLayer || 'business', zoom = state.ui.mapZoom || 'world', sel = state.ui.globeCity;
    const vb = zoom === 'europe' ? '470 70 150 110' : '0 30 1000 380';
    const ids = Object.keys(CITIES);
    const land = LAND.map((poly) => `<path d="M${poly.map((p) => prj(p).map((v) => v.toFixed(1)).join(',')).join('L')}Z"/>`).join('');
    const routes = mapRoutes().map(([a, b, c]) => { const [x1, y1] = prj(cityGeo(a)), [x2, y2] = prj(cityGeo(b)); const mx = (x1 + x2) / 2, my = Math.min(y1, y2) - Math.abs(x2 - x1) * 0.18; return `<path class="route" d="M${x1},${y1} Q${mx},${my} ${x2},${y2}" stroke="${c}"/>`; }).join('');
    const sc = zoom === 'europe' ? 0.22 : 1;
    const dots = ids.map((cid) => { const [x, y] = prj(cityGeo(cid)), I = cityLayerInfo(cid, layer); return `<g class="gcity ${sel === cid ? 'sel' : ''}" data-act="globeCity" data-v="${cid}"><circle cx="${x}" cy="${y}" r="${(I.r * sc).toFixed(2)}" fill="${I.color}" fill-opacity=".85" stroke="#fff" stroke-width="${(1.2 * sc).toFixed(2)}"/><text x="${x}" y="${(y - I.r * sc - 3 * sc).toFixed(1)}" font-size="${(11 * sc).toFixed(2)}" text-anchor="middle">${esc(CITIES[cid].name)}</text></g>`; }).join('');
    const wars = state.world ? state.world.wars : [];
    setTimeout(() => { const g = document.querySelector('.gscroll'); if (!g) return; g.scrollLeft = state.ui.globeScroll != null ? state.ui.globeScroll : Math.max(0, g.scrollWidth * 0.43 - g.clientWidth / 2); g.onscroll = () => { state.ui.globeScroll = g.scrollLeft; }; }, 0);
    let html = `<h1>🌐 Світова карта</h1><div class="chips filter">${Object.entries(MAP_LAYERS).map(([k, n]) => `<button class="chip ${layer === k ? 'on' : ''}" data-act="mapLayer" data-v="${k}">${n}</button>`).join('')}<button class="chip ${zoom === 'europe' ? 'on' : ''}" data-act="mapZoom">${zoom === 'europe' ? '🔍 Увесь світ' : '🔍 Європа'}</button></div>
      <div class="globe card"><div class="gscroll ${zoom}"><svg viewBox="${vb}" preserveAspectRatio="xMidYMid meet"><rect x="-10" y="-10" width="1020" height="520" class="sea"/><g class="land">${land}</g>${routes}${dots}</svg></div>
      <div class="glegend">${layer === 'business' ? '<span><i style="background:#2e9a5a"></i>ваші об’єкти</span><span><i style="background:#3f7fc4"></i>ринок відкрито</span><span><i style="background:#8e96aa"></i>закрито</span>' : layer === 'economy' ? '<span><i style="background:#2e9a5a"></i>висока привабливість</span><span><i style="background:#d2463c"></i>низька</span> · розмір = населення' : layer === 'politics' ? Object.values(IDEOLOGIES).map((I) => `<span><i style="background:${I.color}"></i>${I.name}</span>`).join('') + '<span><i style="background:#ffb02e"></i>ви — мер</span>' : layer === 'info' ? '<span>розмір = кількість згадок у новинах</span>' : '<span><i style="background:#d2463c"></i>висока злочинність</span><span><i style="background:#2e9a5a"></i>низька</span>'} · лінії — ваші маршрути</div></div>`;
    if (sel && CITIES[sel]) {
      const C = CITIES[sel], D = state.cities && state.cities.c[sel], unl = state.unlocked && state.unlocked[sel];
      const units = [...state.biz, ...state.fac].filter((u) => lotCityId(lotOf(u)) === sel);
      const m = state.pol && state.pol.mayors[sel];
      html += `<div class="card"><div class="row between"><h3>${esc(C.name)}</h3><span class="tag">${REGION_OF[sel] || ''} · ${CURRENCY_OF[sel] || ''}</span></div><p class="muted">${esc(C.desc || '')}</p>
        <div class="kpis">${kpi('Населення', D ? D.pop.toFixed(2) + ' млн' : '—')}${kpi('Привабливість', D ? Math.round(D.attract) : '—')}${kpi('Податок', pct(C.tax, 0))}${kpi('Злочинність', state.crime ? pct(crimeIndex(sel), 0) : '—')}${kpi('Мито регіону', state.world ? pct(state.world.tariffs[REGION_OF[sel]] || 0, 0) : '—')}${kpi('Ваших об’єктів', units.length + (state.corp ? state.corp.divs.filter((d) => d.city === sel).length : 0))}</div>
        <p>${m ? `Мер: <b>${esc(m.player ? state.me.name : m.name)}</b> (${esc(partyName(m.party))})` : ''}</p>
        <div class="row wrap">${unl ? `<button class="btn primary" data-act="globeOpen" data-v="${sel}">🏙️ Відкрити місто</button><button class="btn" data-act="globeDev" data-v="${sel}">🏗️ Розвиток</button>` : `<button class="btn primary" data-act="unlockCity" data-v="${sel}">🌍 Вийти на ринок · ${moneyK(regionCost(sel))}</button>`}</div></div>`;
    }
    html += `<div class="card"><h3>Регіони світу</h3><table class="pl">${[...new Set(Object.values(REGION_OF))].map((r) => { const cs = ids.filter((c) => REGION_OF[c] === r); const cur = CURRENCY_OF[cs[0]]; return `<tr><td><b>${r}</b><br><small class="muted">${cs.map((c) => CITIES[c].name).join(', ')}</small></td><td>мито ${state.world ? pct(state.world.tariffs[r] || 0, 0) : '—'}<br><small class="muted">${cur}${state.world && cur !== 'USD' ? ' ' + (state.world.fx[cur] / FX_BASE[cur] > 1.03 ? '▼ слабшає' : state.world.fx[cur] / FX_BASE[cur] < 0.97 ? '▲ міцніє' : '≈') : ''}</small></td></tr>`; }).join('')}</table>${wars.length ? `<p class="neg">⚔️ Торгові війни: ${wars.map((w) => w.regions.join(' — ')).join('; ')}</p>` : ''}</div>`;
    return html;
  },

  empire() {
    const nw = netWorth(), h = state.history.slice(-120), prev = h.length > 30 ? h[h.length - 31].nw : h.length ? h[0].nw : nw;
    const ch = prev ? nw / prev - 1 : 0, last = state.ledger[state.ledger.length - 1] || {};
    const L = state.life;
    // склад капіталу
    const parts = [
      ['Готівка', Math.max(0, state.cash), '#3f7fc4'], ['Запаси', inventoryValue(), '#8a7f73'], ['Магазини й заводи', fixedAssets(), '#2e9a5a'],
      ['Нерухомість', propertyValue(), '#c9a227'], ['Акції', portfolioValue(), '#7a5ac8'], ['Дочірні компанії', subsidiariesValue(), '#3a8f99'],
      ['Банк', state.bank ? Math.max(0, state.bank.capital - state.bank.internal) : 0, '#2f6aa8'], ['Стартапи', typeof venturesValue === 'function' ? venturesValue() : 0, '#e07aa8'],
      ['Галузі', typeof divisionsValue === 'function' ? divisionsValue() : 0, '#d64a3a'], ['Інфраструктура', typeof infraValue === 'function' ? infraValue() : 0, '#4d6c8a'],
      ['Розкіш', typeof luxuryValue === 'function' ? luxuryValue() : 0, '#e0a42a'], ['Спорт', typeof clubsValue === 'function' && state.sport ? clubsValue() : 0, '#5aa469'],
    ].filter((p) => p[1] > 1);
    const tot = sum(parts, (p) => p[1]) || 1;
    let a0 = -Math.PI / 2;
    const arcs = parts.map(([n, v, c]) => { const a1 = a0 + v / tot * Math.PI * 2, large = a1 - a0 > Math.PI ? 1 : 0; const p = `M${50 + 40 * Math.cos(a0)},${50 + 40 * Math.sin(a0)} A40,40 0 ${large} 1 ${50 + 40 * Math.cos(a1 - 0.0001)},${50 + 40 * Math.sin(a1 - 0.0001)}`; a0 = a1; return `<path d="${p}" stroke="${c}" stroke-width="16" fill="none"/>`; }).join('');
    // доходи за напрямами (учора)
    const seg = [['Роздріб', last.sales], ['B2B і заводи', last.b2b], ['IT', last.software], ['Галузі', last.divRev], ['Медіа', last.media], ['Спорт', last.sportInc], ['Банк', last.bankProfit], ['Концесії', last.infraRev], ['Оренда', last.rentInc], ['Електроенергія', last.power]].filter((x) => x[1] > 0).sort((a, b) => b[1] - a[1]);
    const segMax = Math.max(1, ...seg.map((x) => x[1]));
    // тривоги
    const al = [];
    const K = state.crime, P = state.pol, W = state.war, G = state.gov;
    if (state.cash < 0) al.push(['bad', '💸 Від’ємний баланс рахунку', 'finance']);
    if (K && K.demands.length) al.push(['bad', `📞 Вимагання: ${K.demands.length}`, 'underworld']);
    if (K && K.blackmail) al.push(['bad', '✉️ Шантаж — потрібне рішення', 'underworld']);
    if (K && K.offers.length) al.push(['', `📦 Сумнівні пропозиції: ${K.offers.length}`, 'underworld']);
    const myCases = (K ? K.cases.filter((c) => c.target === 'player' && !c.outcome).length : 0) + (P ? P.cases.filter((c) => c.target === 'player' && !c.outcome).length : 0) + (G ? G.cases.filter((c) => c.target === 'player' && c.stage !== 'closed').length : 0) + (W ? W.suits.filter((s) => s.defendant === 'player' && !s.outcome).length : 0);
    if (myCases) al.push(['bad', `⚖️ Справ і позовів проти вас: ${myCases}`, 'investigations']);
    if (P && P.campaign && P.campaign.cands.some((c) => c.player)) al.push(['', `🗳️ Ви берете участь у виборах — голосування в день ${P.campaign.ends}`, 'politics']);
    if (P && P.tenders.length) al.push(['', `📑 Відкриті держтендери: ${P.tenders.length}`, 'politics']);
    if (state.corp && state.corp.builds.some((b) => b.ready <= state.day)) al.push(['good', '🛰️ Супутник готовий до запуску', 'divisions']);
    if (state.sci && !state.sci.active && Object.keys(TECHS).some(techAvail)) al.push(['', '🔬 Можна почати нове дослідження', 'science']);
    if (L && L.health < 40) al.push(['bad', `❤️ Здоров’я ${Math.round(L.health)} — варто подбати про себе`, 'personal']);
    if (L && L.stress > 70) al.push(['bad', `😰 Стрес ${Math.round(L.stress)} — візьміть відпустку`, 'personal']);
    if (L && L.age > 55 && !L.will) al.push(['', '📜 Складіть заповіт', 'personal']);
    if (state.media && state.media.campaigns.some((c) => c.target === 'player' && c.by !== 'player')) al.push(['bad', '🗯️ Проти вас іде медіакампанія', 'media']);
    const groups = typeof NAV_GROUPS !== 'undefined' ? NAV_GROUPS : [];
    const byId = Object.fromEntries(NAV.map((x) => [x[0], x]));
    return `<div class="hero"><div class="hero-l">${avatarSVG(state.me.look, 56)}<div><small>${esc(state.company)}${L ? ` · ${typeof statusTitle === 'function' ? statusTitle() : ''} · покоління ${L.gen}` : ''}</small><h1>${moneyK(nw)}</h1><span class="${ch >= 0 ? 'up' : 'down'}">${ch >= 0 ? '▲' : '▼'} ${pct(Math.abs(ch), 1)} за 30 днів</span></div></div>
        <div class="hero-r">${[['Готівка', moneyK(state.cash)], ['Прибуток учора', last.profit != null ? moneyK(last.profit) : '—'], ['Економіка', PHASES[state.econ.phase].name], ['День', state.day]].map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join('')}</div></div>
      ${econStrip()}
      <div class="grid2">${chartBox('chEmp', [{ data: h.map((x) => x.nw), color: '#e0a42a', name: 'Чистий капітал' }, { data: h.map((x) => x.cash), color: '#3f7fc4', name: 'Готівка' }], h.map((x) => String(x.day)), 'Капітал імперії', (v) => moneyK(v))}
        <div class="card"><h3>Склад капіталу</h3><div class="donutrow"><svg viewBox="0 0 100 100" class="donut">${arcs}<text x="50" y="47" text-anchor="middle" font-size="7" class="dt">Активи</text><text x="50" y="58" text-anchor="middle" font-size="9" font-weight="700" class="dt">${moneyK(tot)}</text></svg><div class="dleg">${parts.sort((a, b) => b[1] - a[1]).map(([n, v, c]) => `<span><i style="background:${c}"></i>${n} <b>${pct(v / tot, 0)}</b></span>`).join('')}${debt() ? `<span class="neg">Борг −${moneyK(debt())}</span>` : ''}</div></div></div></div>
      <div class="grid2"><div class="card"><h3>Доходи за напрямами (учора)</h3>${seg.length ? seg.map(([n, v]) => `<div class="segrow"><span>${n}</span><div class="segbar"><i style="width:${(v / segMax * 100).toFixed(0)}%"></i></div><b>${moneyK(v)}</b></div>`).join('') : '<p class="muted">Доходів поки немає.</p>'}</div>
        <div class="card"><h3>Потребує уваги</h3>${al.length ? `<ul class="alerts">${al.map(([k, t, v]) => `<li class="${k}" data-act="nav" data-v="${v}">${t} <span>›</span></li>`).join('')}</ul>` : '<p class="muted">Усе спокійно. 👌</p>'}</div></div>
      ${groups.map(([g, ids]) => `<h3 class="navgrp">${g}</h3><div class="tiles">${ids.filter((id) => byId[id] && id !== 'empire').map((id) => `<button data-act="nav" data-v="${id}"><span>${byId[id][1]}</span>${byId[id][2]}</button>`).join('')}</div>`).join('')}`;
  },
});

Object.assign(ACT, {
  mapLayer: (d) => { state.ui.mapLayer = d.v; },
  mapZoom: () => { state.ui.mapZoom = state.ui.mapZoom === 'europe' ? 'world' : 'europe'; },
  globeCity: (d) => { state.ui.globeCity = d.v; setTimeout(() => { const c = document.querySelector('.globe + .card'); if (c && isMobile()) c.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 30); },
  globeOpen: (d) => { state.ui.mapCity = d.v; state.ui.view = 'map'; state.ui.lot = null; },
  globeDev: (d) => { state.ui.devCity = d.v; state.ui.view = 'citydev'; },
});

// Навігація: «Імперія» й «Світова карта» — головні пункти нижнього меню
NAV.unshift(['empire', '👑', 'Імперія', true]);
NAV.splice(NAV.findIndex((x) => x[0] === 'map') + 1, 0, ['globe', '🌐', 'Світ', true]);
for (const n of NAV) if (n[0] === 'businesses' || n[0] === 'dashboard') n[3] = false;
if (typeof NAV_GROUPS !== 'undefined') { NAV_GROUPS[0][1].unshift('empire'); NAV_GROUPS[3][1].unshift('globe'); }
