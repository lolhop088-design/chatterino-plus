'use strict';
/* БІЗНЕС ІМПЕРІЯ — екрани «Наука і технології» та «Розвиток міст». */

NAV.splice(NAV.findIndex((x) => x[0] === 'tech') + 1, 0, ['science', '🔬', 'Наука']);
NAV.splice(NAV.findIndex((x) => x[0] === 'regions') + 1, 0, ['citydev', '🏗️', 'Розвиток міст']);

Object.assign(VIEWS, {
  science() {
    const S = sciState(), tab = ['tree', 'labs', 'patents', 'phones'].includes(state.ui.tab) ? state.ui.tab : 'tree';
    const lpd = sum(S.labs, labPoints) * (1 + sciFx('research'));
    let html = `<h1>🔬 Наука і технології</h1><div class="kpis">${kpi('Очки досліджень', Math.floor(state.tech.points))}${kpi('Від центрів/день', Math.round(lpd))}${kpi('Технологій', Object.keys(S.done).length + '/' + Object.keys(TECHS).length)}${kpi('Роялті/день', money(sum(S.patents, (p) => (p.until > state.day ? sum(p.licensees, (id) => { const co = coById(id); return co ? royalty(co) : 0; }) : 0))))}${kpi('Поточне дослідження', S.active ? `${TECHS[S.active.k].icon} ${S.active.left} дн.` : '—')}</div>`
      + tabsHtml([['tree', 'Дерево технологій'], ['labs', 'Дослідницькі центри'], ['patents', 'Патенти й ліцензії'], ['phones', '📱 Смартфони']], tab);
    if (tab === 'tree') {
      html += `<div class="card"><p class="muted">Великі технології потребують очок досліджень (IT-офіси, відділ R&D, дослідницькі центри, союзники) і грошей; час скорочують дослідницькі центри. Кожна технологія дає патент. ІІ-компанії ведуть власну технологічну гонку.</p></div><div class="cards">`;
      for (const [k, T] of Object.entries(TECHS)) {
        const done = hasTech(k), avail = techAvail(k), act = S.active && S.active.k === k;
        const rivals = Object.entries(S.aiTech).filter(([, l]) => l.includes(k)).map(([id]) => coName2(id));
        html += `<div class="card" style="display:block;${done ? 'border-color:var(--good)' : ''}"><div class="row between"><b>${T.icon} ${T.name}</b>${done ? '<span class="tag good">готово</span>' : act ? '<span class="tag">досліджується</span>' : ''}</div><p style="margin:4px 0">${T.desc}</p>
          <small class="muted">${T.req.length ? 'Потрібно: ' + T.req.map((r) => `${hasTech(r) ? '✅' : '❌'} ${TECHS[r].name}`).join(', ') : 'Без передумов'}${rivals.length ? `<br>Уже мають: ${rivals.map(esc).join(', ')}` : ''}</small>
          ${!done && !act ? `<div style="margin-top:6px"><button class="btn sm primary" ${!avail || S.active || state.tech.points < T.pts ? 'disabled' : ''} data-act="scStart" data-k="${k}">${T.pts} оч. + ${moneyK(T.cost * priceLvl())} · ${Math.ceil(T.days / labSpeed())} дн.</button></div>` : ''}</div>`;
      }
      html += '</div>';
    } else if (tab === 'labs') {
      html += `<div class="card"><p class="muted">Центри генерують очки досліджень і пришвидшують великі дослідження. Кращі кадри — у Токіо, Нью-Йорку, Берліні, Лондоні та Києві.</p><div class="row wrap"><select id="labCity">${Object.keys(state.unlocked).map((c) => `<option value="${c}">${CITIES[c].name}${LAB_CITIES[c] ? ` (кадри ×${LAB_CITIES[c]})` : ''}</option>`).join('')}</select><button class="btn primary" data-act="scLab">Збудувати / розширити · від ${moneyK(LAB_COST * priceLvl())}</button></div></div>
        <div class="card">${S.labs.length ? S.labs.map((l) => `<div class="row between"><span>🏛️ ${CITIES[l.city].name} · рівень ${l.level}</span><small>${Math.round(labPoints(l))} оч./день · ${money(labUpkeep(l))}/день</small></div>`).join('') : '<p class="muted">Центрів ще немає.</p>'}</div>`;
    } else if (tab === 'patents') {
      html += `<div class="card"><p class="muted">Патент діє 1500 днів. Ліцензія дає щоденні роялті; згода залежить від стосунків і стратегії компанії. Якщо хтось використовує вашу технологію без ліцензії — подайте позов (є докази).</p></div>`;
      html += S.patents.length ? S.patents.map((p) => {
        const T = TECHS[p.tech], cands = aliveCos().filter((c) => !isSub(c) && !p.licensees.includes(c.id) && (c.sector === T.sector || c.strat === 'innovator')).slice(0, 8);
        return `<div class="card"><div class="row between"><b>📜 ${T.icon} ${T.name}</b><small>до дня ${p.until}</small></div><small>Ліцензіати: ${p.licensees.map(coName2).map(esc).join(', ') || 'немає'}${p.infringer ? ` · <span class="neg">порушник: ${esc(coName2(p.infringer))}</span>` : ''}</small>
          <div class="row wrap" style="margin-top:6px">${cands.map((c) => `<button class="btn sm" data-act="scLic" data-id="${p.id}" data-co="${c.id}">${esc(c.name)} · ${moneyK(royalty(c))}/д</button>`).join('')}${p.infringer ? `<button class="btn sm primary" data-act="cwSue" data-id="${p.infringer}" data-v="patent">⚖️ Позов</button>` : ''}</div></div>`;
      }).join('') : '<div class="card"><p class="muted">Патентів ще немає — завершіть дослідження з дерева технологій.</p></div>';
    } else {
      if (!hasTech('smartphone')) html += '<div class="card"><p class="muted">Відкрийте технологію «Платформа смартфонів» (потрібні «Власні процесори»). «Власна ОС», «Штучний інтелект», завод електроніки й рівень IT підвищують якість.</p></div>';
      else html += `<div class="card"><h3>Нова модель · ${moneyK(15e6 * priceLvl())}</h3><div class="row wrap"><select id="phTier">${Object.entries(PHONE_TIERS).map(([k, T]) => `<option value="${k}">${T.name} — $${T.price}</option>`).join('')}</select><input id="phName" placeholder="Назва моделі" maxlength="24"><button class="btn primary" data-act="phLaunch">Запустити</button></div><p class="muted">Електроніка з вашого складу здешевлює виробництво. Продажі падають з віком моделі — оновлюйте лінійку. Конкуренти: ${aliveCos().filter((c) => c.sector === 'electronics').map((c) => esc(c.name)).join(', ')}.</p></div>`;
      html += S.phones.map((p) => `<div class="card"><div class="row between"><b>📱 ${esc(p.name)}</b><span class="tag">${PHONE_TIERS[p.tier].name} · якість ${p.q}</span></div><div class="kpis">${kpi('Продажі/день', p.y ? Math.round(p.y.units).toLocaleString('uk-UA') : '—')}${kpi('Частка ринку', p.y ? pct(p.y.share, 1) : '—')}${kpi('Прибуток/день', p.y ? money(p.y.p) : '—', p.y && p.y.p < 0 ? 'neg' : 'pos')}${kpi('Продано всього', Math.round(p.sold).toLocaleString('uk-UA'))}</div><div class="row wrap"><span class="muted">Маркетинг:</span>${[0, 1, 2, 3].map((v) => `<button class="chip ${p.mkt === v ? 'on' : ''}" data-act="phMkt" data-id="${p.id}" data-v="${v}">${['немає', 'базовий', 'сильний', 'глобальний'][v]}</button>`).join('')}<button class="btn sm danger" data-act="phStop" data-id="${p.id}">Зняти з виробництва</button></div></div>`).join('');
    }
    return html;
  },

  citydev() {
    const S = cityState(), cid = state.ui.devCity && S.c[state.ui.devCity] ? state.ui.devCity : state.city, D = S.c[cid];
    const ids = Object.keys(S.c);
    let html = `<h1>🏗️ Розвиток міст</h1><div class="chips filter">${ids.map((c) => `<button class="chip ${c === cid ? 'on' : ''}" data-act="devCity" data-v="${c}">${CITIES[c].name}</button>`).join('')}</div>
      <div class="kpis">${kpi('Населення', D.pop.toFixed(2) + ' млн', D.pop > D.pop0 ? 'pos' : '', `база ${D.pop0} млн`)}${kpi('Привабливість', Math.round(D.attract))}${kpi('Потік покупців', '×' + cityMult(cid, 'traffic').toFixed(2))}${kpi('Логістика', '×' + cityMult(cid, 'transport').toFixed(2))}${kpi('Туризм', '×' + cityMult(cid, 'tourism').toFixed(2))}${kpi('Електроенергія', '×' + cityMult(cid, 'power').toFixed(2))}${kpi('Концесії/день', money(concessionPreview()))}</div>
      <div class="card"><p class="muted">Інфраструктуру будують держава (щомісяця з бюджету), ІІ-інвестори і ви — у форматі державно-приватного партнерства: ви оплачуєте будівництво й отримуєте концесійний дохід (плата за проїзд, збори аеропорту й порту, оренда). Якщо ви мер — місто співфінансує 20%; власна будівельна компанія в місті здешевлює й пришвидшує роботи. Ефекти видно на 3D-карті міста.</p></div><div class="cards">`;
    for (const [k, I] of Object.entries(INFRA)) {
      const lvl = D.lv[k], building = S.projects.find((p) => p.city === cid && p.k === k), ok = canBuild(cid, k);
      const fx = Object.entries(I.fx).map(([f, v]) => `${{ transport: 'логістика', traffic: 'покупці', industry: 'заводи', tourism: 'туризм', airline: 'авіа', import: 'імпорт', power: 'енергія', pop: 'населення', wage: 'зарплати', hotel: 'готелі' }[f]} ${v > 0 ? '+' : ''}${Math.round(v * 100)}%`).join(', ');
      html += `<div class="card" style="display:block"><div class="row between"><b>${I.icon} ${I.name}</b><span class="tag">рівень ${lvl}/5${D.owner[k] ? ` · ваших ${D.owner[k]}` : ''}</span></div>${bar(lvl, 5)}<small class="muted">За рівень: ${fx}</small>
        ${building ? `<p>🏗️ Будується (${building.by === 'player' ? 'ви' : building.by === 'gov' ? 'держава' : esc(coName2(building.by))}): ${building.left} дн.</p>` : !ok ? '<p class="muted">Немає виходу до моря.</p>' : lvl >= 5 ? '' : `<div style="margin-top:6px"><button class="btn sm primary" ${state.cash < projectCost(cid, k) ? 'disabled' : ''} data-act="devBuild" data-c="${cid}" data-k="${k}">Інвестувати ${moneyK(projectCost(cid, k))} · ${I.days} дн.</button></div>`}</div>`;
    }
    html += '</div>';
    const pr = S.projects.slice(0, 20);
    html += `<div class="card"><h3>Будівництва</h3>${pr.length ? pr.map((p) => `<p>${INFRA[p.k].icon} ${CITIES[p.city].name}: ${INFRA[p.k].name} · ${p.by === 'player' ? 'ви' : p.by === 'gov' ? 'держава' : esc(coName2(p.by))} · ${p.left} дн.</p>`).join('') : '<p class="muted">Немає.</p>'}</div>
      <div class="card"><h3>Населення й міграція</h3><table class="pl">${ids.map((c) => `<tr><td>${CITIES[c].name}</td><td>${S.c[c].pop.toFixed(2)} млн</td><td>привабливість ${Math.round(S.c[c].attract)}</td></tr>`).join('')}</table></div>`;
    if (!S.custom) html += `<div class="card"><h3>🏙️ Заснувати власне місто</h3><p class="muted">Ендгейм-проєкт: нове місто з 8 районами, низькими податками й орендою, де ви одразу мер. Населення й потік покупців ростуть разом з інфраструктурою, яку ви будуєте.</p><div class="row wrap"><input id="myCityName" placeholder="Назва міста" maxlength="24"><button class="btn primary" ${state.cash < MY_CITY_COST * priceLvl() ? 'disabled' : ''} data-act="devFound">Заснувати · ${moneyK(MY_CITY_COST * priceLvl())}</button></div></div>`;
    return html;
  },
});

function concessionPreview() {
  const S = cityState(); let tot = 0;
  for (const [cid, D] of Object.entries(S.c)) for (const [k, n] of Object.entries(D.owner)) if (n) tot += INFRA[k].cost * CITIES[cid].price * priceLvl() * INFRA[k].toll * n * Math.sqrt(D.pop / D.pop0) * state.econ.demand;
  return tot;
}

Object.assign(ACT, {
  scStart: (d) => startTech(d.k),
  scLab: () => buildLab(askVal('labCity')),
  scLic: (d) => licensePatent(d.id, d.co),
  phLaunch: () => launchPhone(askVal('phTier'), askVal('phName').trim()),
  phMkt: (d) => { const p = sciState().phones.find((x) => x.id === d.id); if (p) p.mkt = +d.v; },
  phStop: (d) => confirmBox('Зняти модель з виробництва?', () => { const S = sciState(); S.phones = S.phones.filter((x) => x.id !== d.id); }),
  devCity: (d) => { state.ui.devCity = d.v; },
  devBuild: (d) => confirmBox(`Інвестувати ${money(projectCost(d.c, d.k))} у «${INFRA[d.k].name}» (${CITIES[d.c].name})?`, () => startProject(d.c, d.k)),
  devFound: () => confirmBox(`Заснувати власне місто за ${money(MY_CITY_COST * priceLvl())}?`, () => foundCity(askVal('myCityName').trim())),
});

// ---------- Версія, «Що нового», згруповане меню ----------
const GAME_VERSION = '3.0 · етап 7';
const WHATS_NEW = [
  ['personal', '🧑‍💼', 'Особистий кабінет', 'вік і здоров’я, сім’я й діти, розкіш, подорожі, спадкоємці й покоління'],
  ['clubs', '⚽', 'Спортивна імперія', 'власні клуби, склад, трансфери, стадіони, власна ліга, міжнародний кубок'],
  ['science', '🔬', 'Наука', 'дерево технологій, дослідницькі центри, патенти, власні смартфони'],
  ['citydev', '🏗️', 'Розвиток міст', 'аеропорти, порти, мости, залізниця, населення, власне місто'],
  ['divisions', '🏢', 'Галузі', 'телеком, авіа, готелі, страхування, будівництво, фарма, космос'],
  ['corpwar', '🗡️', 'Корпоративна війна', 'альянси, картелі, розвідка, суди, блокади'],
  ['newsroom', '📟', 'Термінал', 'BREAKING-новини, медіа, політика, кримінал, безпека'],
  ['politics', '🗳️', 'Політика', 'партії, вибори, парламент, лобіювання, тендери'],
];
const NAV_GROUPS = [
  ['Бізнес', ['dashboard', 'map', 'businesses', 'industry', 'divisions', 'cars', 'tech', 'science', 'realty', 'staff', 'hq']],
  ['Фінанси', ['finance', 'bank', 'stocks', 'ventures', 'ranking']],
  ['Конкуренція', ['rivals', 'corpwar', 'antitrust']],
  ['Світ і міста', ['world', 'regions', 'citydev', 'newsroom', 'news']],
  ['Влада й вплив', ['politics', 'gov', 'media', 'underworld', 'security']],
  ['Особисте', ['personal', 'clubs', 'life', 'sponsor', 'achievements', 'settings', 'admin']],
];
ACT.more = () => {
  const byId = Object.fromEntries(NAV.map((x) => [x[0], x]));
  const used = new Set();
  const grp = NAV_GROUPS.map(([g, ids]) => { const items = ids.filter((id) => byId[id]); items.forEach((i) => used.add(i)); return `<h3 class="navgrp">${g}</h3><div class="moregrid">${items.map((id) => `<button data-act="nav" data-v="${id}"><span>${byId[id][1]}</span>${byId[id][2]}</button>`).join('')}</div>`; }).join('');
  const rest = NAV.filter((x) => !used.has(x[0]));
  showModal(`<h2>Розділи <small class="muted">v${GAME_VERSION}</small></h2>${grp}${rest.length ? `<div class="moregrid">${rest.map(([id, ic, n]) => `<button data-act="nav" data-v="${id}"><span>${ic}</span>${n}</button>`).join('')}</div>` : ''}<div class="row end"><button class="btn" data-act="whatsNew">🆕 Що нового</button><button class="btn" data-act="modalClose">Закрити</button></div>`);
};
ACT.whatsNew = () => showModal(`<h2>🆕 Що нового · v${GAME_VERSION}</h2><p class="muted">Нові розділи (також у меню «☰ Ще»):</p><div class="newlist">${WHATS_NEW.map(([id, ic, n, d]) => `<button data-act="nav" data-v="${id}"><span>${ic}</span><div><b>${n}</b><br><small>${d}</small></div></button>`).join('')}</div><div class="row end"><button class="btn primary" data-act="modalClose">Зрозуміло</button></div>`);
function checkWhatsNew() {
  if (!state || state.over) return;
  if (state.seenVersion === GAME_VERSION) return;
  state.seenVersion = GAME_VERSION;
  setTimeout(() => { try { ACT.whatsNew(); } catch (e) { /* ignore */ } }, 300);
}
const _settingsView = VIEWS.settings;
VIEWS.settings = function () { return _settingsView() + `<div class="card"><p class="muted">Версія гри: <b>${GAME_VERSION}</b> <button class="btn sm" data-act="whatsNew">🆕 Що нового</button></p></div>`; };
