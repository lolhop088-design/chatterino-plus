'use strict';
/* БІЗНЕС ІМПЕРІЯ — інтерфейс оновлень 4–6 і ринку праці:
   «Суспільна думка», «Влада й податки», райони міста, ринок праці й кадрове агентство. */

NAV.splice(NAV.findIndex((x) => x[0] === 'media') + 1, 0, ['opinion', '📢', 'Суспільна думка']);
NAV.splice(NAV.findIndex((x) => x[0] === 'politics') + 1, 0, ['power', '⚖️', 'Влада й податки']);
if (typeof NAV_GROUPS !== 'undefined') { NAV_GROUPS[4][1].splice(1, 0, 'power', 'opinion'); }
if (typeof HOME_CATS !== 'undefined') { HOME_CATS.find((c) => c.k === 'state').views.splice(1, 0, 'power', 'opinion'); }
Object.assign(VIEW_DESC, { opinion: 'рейтинг, інтерв’ю, реклама, скандали, настрої суспільства', power: 'галузеві податки, кризи, стосунки з чиновниками' });
Object.assign(VIEW_CAT, { opinion: 'state', power: 'state' });
const fmtPeople = (n) => n.toLocaleString('uk-UA');
const relBar = (v) => `${bar(v, 100, v >= 65 ? 'good' : v >= 40 ? 'mid' : 'bad')}`;

Object.assign(VIEWS, {
  opinion() {
    const O = opinionState(), h = O.hist.slice(-120), mine = state.media ? state.media.outlets.filter((o) => o.owner === 'player') : [];
    const act = O.scandals.filter((s) => !s.done && state.day < s.until);
    let html = `<h1>📢 Суспільна думка</h1><div class="kpis">${kpi('Схвалення вас', Math.round(O.approval), O.approval >= 60 ? 'pos' : O.approval < 35 ? 'neg' : '')}${kpi('Популярність (вибори)', state.pol ? Math.round(state.pol.me.popularity) : '—')}${kpi('Репутація корпорації', state.media ? Math.round(state.media.corpRep) : '—')}${kpi('Довіра до уряду', state.pol2 ? Math.round(state.pol2.govApproval) : '—')}${kpi('Активні скандали', act.length, act.length ? 'neg' : 'pos')}</div>`;
    if (act.length) html += `<div class="card warn"><h3>🗞️ Скандали</h3>${act.map((s) => `<div class="stock"><div><b>${esc(s.text)}</b><br><small class="muted">сила ${s.sev.toFixed(1)} · до дня ${s.until}</small></div><div class="px"></div><span></span><div class="trade"><button class="btn sm" data-act="opResp" data-id="${s.id}" data-v="apologize">🙏 Перепросити</button><button class="btn sm" data-act="opResp" data-id="${s.id}" data-v="deny">🛡️ Спростувати</button><button class="btn sm primary" ${mine.length ? '' : 'disabled'} data-act="opResp" data-id="${s.id}" data-v="counter">📡 Контратака через свої медіа</button></div></div>`).join('')}</div>`;
    html += `<div class="grid2">${chartBox('chApproval', [{ data: h.map((x) => x.a), color: '#2f6fd6', name: 'Схвалення' }], h.map((x) => String(x.d)), 'Рейтинг схвалення', (v) => Math.round(v))}
      <div class="card"><h3>🎙️ Інтерв’ю</h3><p class="muted">Раз на 5 днів. У власних медіа ризик менший, а охоплення залежить від сили видання. Наступне — з дня ${O.lastInterview + 5}.</p><div class="row wrap"><select id="opOutlet"><option value="">Незалежне видання</option>${mine.map((o) => `<option value="${o.id}">${OUTLET_TYPES[o.type].icon} ${esc(o.name)}</option>`).join('')}</select></div><div class="row wrap" style="margin-top:6px">${Object.entries(TONES).map(([k, T]) => `<button class="btn sm ${k === 'humble' ? 'primary' : ''}" data-act="opInterview" data-v="${k}">${T.icon} ${T.name}${T.risk ? ` · ризик ${Math.round(T.risk * 100)}%` : ''}</button>`).join('')}</div></div></div>
      <div class="card"><h3>📺 Реклама</h3><div class="cards">${Object.entries(ADS).map(([k, A]) => `<div class="card camp"><span class="big">${A.icon}</span><div><b>${A.name}</b><br><small>${A.desc}</small></div><button class="btn sm primary" data-act="opAd" data-v="${k}">${moneyK(A.cost * priceLvl())}</button></div>`).join('')}</div></div>
      <div class="card"><h3>🧭 Настрої суспільства</h3><p class="muted">Впливають на голосування за закони, рейтинги партій і ваше схвалення. Формуйте думку кампаніями — через власні медіа дешевше й сильніше (${mine.length ? `у вас ${mine.length} медіа` : 'власних медіа немає'}). Боти посилюють ефект, але їх можуть викрити.</p>
        ${Object.entries(ISSUES).map(([k, I]) => { const v = O.issues[k]; return `<div style="margin:8px 0"><div class="row between"><b>${I.name}</b><small>${v >= 0 ? I.plus : I.minus} ${Math.round(Math.abs(v))}%</small></div><div class="opbar"><i style="left:50%;width:${Math.abs(v) / 2}%;${v < 0 ? `transform:translateX(-100%);background:var(--bad)` : 'background:var(--good)'}"></i></div><div class="row wrap"><button class="btn sm" data-act="opCamp" data-k="${k}" data-v="-1">◀ ${I.minus}</button><button class="btn sm" data-act="opCamp" data-k="${k}" data-v="1">${I.plus} ▶</button><label class="switch"><input type="checkbox" id="opBots-${k}"> 🤖 боти</label></div></div>`; }).join('')}
        ${O.camps.length ? `<small class="muted">Активні кампанії: ${O.camps.map((c) => `${ISSUES[c.issue].name} (${c.days} дн.)`).join(', ')}</small>` : ''}</div>`;
    return html;
  },

  power() {
    const P = pol2State(), Pl = polState(), tab = ['tax', 'rel', 'crisis'].includes(state.ui.tab) ? state.ui.tab : 'tax';
    let html = `<h1>⚖️ Влада й податки</h1><div class="kpis">${kpi('Ваша ефективна ставка', pct(effectiveTaxRate(), 1), '', 'з урахуванням галузей')}${kpi('Базовий податок', pct(state.econ.taxRate, 0))}${kpi('Довіра до уряду', Math.round(P.govApproval), P.govApproval < 30 ? 'neg' : P.govApproval > 55 ? 'pos' : '')}${kpi('Податок на розкіш', P.luxuryTax ? 'діє' : 'немає')}</div>` + tabsHtml([['tax', '🧾 Податки за галузями'], ['rel', '🤝 Чиновники'], ['crisis', '🔥 Політичні кризи']], tab);
    if (tab === 'tax') {
      html += `<div class="card"><table class="pl">${Object.entries(TAX_SECTORS).map(([k, S]) => `<tr><td>${S.icon} ${S.name}</td><td class="${P.sectorTax[k] > 0 ? 'neg' : P.sectorTax[k] < 0 ? 'pos' : ''}">${pct(state.econ.taxRate + P.sectorTax[k], 1)} ${P.sectorTax[k] ? `(${P.sectorTax[k] > 0 ? '+' : ''}${(P.sectorTax[k] * 100).toFixed(0)} п.п.)` : ''}</td></tr>`).join('')}</table>
        <p class="muted">Ваша ставка — середнє за структурою ваших доходів за тиждень. Галузеві ставки змінюють закони (вносьте їх у розділі «Політика → Парламент»: «Пільги для IT», «Податок на енергетику», «Банківський податок», «Знижка для торгівлі», «Промисловий податковий кредит», «Податок на медіа», «Податок на розкіш») і курс правлячої коаліції.</p></div>`;
    } else if (tab === 'rel') {
      html += `<div class="card"><p class="muted">Лише законні інструменти: зареєстровані робочі зустрічі, форуми, спільні соціальні проєкти. Кращі стосунки підвищують шанс успіху лобіювання в міністерстві, а з мером — здешевлюють і пришвидшують будівництво в місті. Скандали й справи проти вас псують стосунки. ЦБ, АМКУ й суди незалежні.</p><button class="btn primary" data-act="pwForum">🏛️ Партнерство в інвестфорумі · ${moneyK(3e5 * priceLvl())}</button></div>
        <div class="card"><h3>Міністерства</h3>${REL_TARGETS.map((k) => `<div style="margin:8px 0"><div class="row between"><span>${MINISTRIES[k].icon} ${MINISTRIES[k].name} · ${esc(govState().ministries[k].head)}</span><b>${Math.round(relOf(k))}</b></div>${relBar(relOf(k))}<button class="btn sm" data-act="pwMeet" data-v="${k}">🤝 Робоча зустріч · ${moneyK(5e4 * priceLvl())}</button></div>`).join('')}</div>
        <div class="card"><h3>Мери ваших міст</h3>${Object.keys(state.unlocked || {}).map((c) => { const m = Pl.mayors[c]; return `<div style="margin:8px 0"><div class="row between"><span>${CITIES[c].name} · ${esc(m ? (m.player ? state.me.name : m.name) : '—')}${m && (m.player || m.ally) ? ' <span class="tag good">свій</span>' : ''}</span><b>${Math.round(relMayor(c))}</b></div>${relBar(relMayor(c))}<button class="btn sm" data-act="pwCity" data-v="${c}">🌳 Спільний проєкт для міста · ${moneyK(1e6 * priceLvl())}</button> <small class="muted">знижка на будівництво ${Math.round((1 - mayorDiscount(c)) * 100)}%</small></div>`; }).join('')}</div>`;
    } else {
      const h = P.hist.slice(-120);
      html += `<div class="grid2">${chartBox('chGov', [{ data: h.map((x) => x.g), color: '#d64545', name: 'Довіра до уряду' }], h.map((x) => String(x.d)), 'Довіра до уряду', (v) => Math.round(v))}
        <div class="card"><h3>Що спричиняє кризи</h3><p class="muted">Низька довіра до уряду (рецесія, безробіття, інфляція) веде до протестів (нижче 30), відставки уряду (нижче 28), розпаду коаліції й дострокових виборів (нижче 22), імпічменту президента (нижче 18). Великий дефіцит бюджету — бюджетна криза з підвищенням податків і скасуванням субсидій.</p>
        <ul class="log">${P.crises.map((c) => `<li class="bad"><small>Д${c.day}</small> ${{ protest: '✊ Масові протести', coalition: '💥 Розпад коаліції', cabinet: '🏛️ Відставка уряду', impeach: '⚖️ Імпічмент', budget: '💸 Бюджетна криза' }[c.kind]}</li>`).join('') || '<li class="muted">Криз не було.</li>'}</ul></div></div>`;
    }
    return html;
  },
});
for (const id of ['opinion', 'power']) { const f = VIEWS[id]; VIEWS[id] = function () { return decorateView(id, f()); }; }

// ---------- Персонал: ринок праці й кадрове агентство ----------
const _staffV = VIEWS.staff;
VIEWS.staff = function () {
  const html = _staffV(), v = vacancies(), tot = sum(Object.values(v), (x) => x), units = allUnits2().filter((u) => staffOf(u).length < maxStaff(u));
  const cs = Object.keys(state.unlocked || { [state.city]: 1 });
  const card = `<div class="card"><h3>🧑‍💼 Ринок праці</h3><div class="kpis">${kpi('Кандидатів у пулі', state.candidates.length, '', `ціль ${laborPoolSize()}`)}${kpi('Ваших вакансій', tot, tot ? 'neg' : 'pos', Object.entries(v).filter(([, n]) => n).map(([r, n]) => `${ROLES[r]} ${n}`).join(', ') || 'усе укомплектовано')}${kpi('Працівників', state.staff.length)}</div>
    <table class="pl">${cs.map((c) => `<tr><td>${CITIES[c].name} · ${fmtPeople(cityPopPeople(c))} жителів</td><td>безробіття ${cityUnemp(c).toFixed(1)}%</td></tr>`).join('')}</table>
    ${laborState().tight ? '<p class="neg">Дефіцит кадрів: вакансій набагато більше, ніж кандидатів — зарплати нових працівників ростуть.</p>' : ''}
    ${tot ? `<div class="row wrap" style="margin-top:6px"><button class="btn primary" ${state.cash < agencyCost(units) ? 'disabled' : ''} data-act="agAll">🏢 Кадрове агентство: закрити всі ${tot} вакансій · ${moneyK(agencyCost(units))}</button></div><small class="muted">Агентство підбирає людей потрібної ролі з навичкою 2–4 одразу; гонорар — 10 денних ставок за людину. У штабі HR-директору можна доручити робити це автоматично.</small>` : ''}</div>`;
  const i = html.indexOf('</div>', html.indexOf('class="vbanner"')) ;
  const bannerEnd = html.indexOf('<div class="tabs">');
  return bannerEnd > 0 ? html.slice(0, bannerEnd) + card + html.slice(bannerEnd) : card + html;
};
for (const id of ['biz', 'fac']) {
  const f = VIEWS[id];
  VIEWS[id] = function () {
    const html = f(), u = id === 'biz' ? bizById(state.ui.bizId) : facById(state.ui.facId);
    if (!u) return html;
    const need = maxStaff(u) - staffOf(u).length;
    return need > 0 ? `<div class="card warn row between"><span>👥 Вакансій: <b>${need}</b> (${ROLES[unitRole(u)]})</span><button class="btn sm primary" data-act="agUnit" data-id="${u.id}">Агентство · ${moneyK(agencyCost([u]))}</button></div>` + html : html;
  };
}

// ---------- Розвиток міст: райони, затори, реальне населення ----------
const _cityDevV = VIEWS.citydev;
VIEWS.citydev = function () {
  const html = _cityDevV(), cid = state.ui.devCity && CITIES[state.ui.devCity] ? state.ui.devCity : state.city, X = cityxState()[cid];
  const card = `<div class="card"><h3>🏘️ Райони: ${CITIES[cid].name} · ${fmtPeople(cityPopPeople(cid))} жителів</h3><div class="kpis">${kpi('Затори', Math.round(X.jam * 100) + '%', X.jam > 0.6 ? 'neg' : X.jam < 0.3 ? 'pos' : '', 'логістика ×' + jamMult(cid).toFixed(2))}${kpi('Безробіття', cityUnemp(cid).toFixed(1) + '%')}${kpi('Хмарочосів у силуеті', skylineLevel(cid) * 2)}</div>
    <div class="table-wrap"><table><thead><tr><th>Район</th><th>Жителів</th><th>Добробут</th><th>Земля</th><th>Забудова</th><th>Злочинність</th></tr></thead><tbody>${DISTRICTS.map((d) => { const x = X.dist[d.id]; return `<tr><td>${d.name}</td><td>${fmtPeople(districtPop(cid, d.id))}</td><td class="${x.wealth >= 70 ? 'pos' : x.wealth < 35 ? 'neg' : ''}">${wealthLabel(x.wealth)}</td><td>×${x.land.toFixed(2)}</td><td>${Math.round(x.dev)}</td><td>${pct(districtCrime(cid, d.id), 0)}</td></tr>`; }).join('')}</tbody></table></div>
    <p class="muted">Ціна землі множить оренду в районі; заможні райони купують більше; у години пік затори зменшують потік у центрі й діловому кварталі. Забудова росте від інвестицій (ваші об’єкти, хмарочоси, інфраструктура) — у 3D-місті з’являються нові хмарочоси. Власний хмарочос можна звести на великій (XL) ділянці в центрі, діловому кварталі чи на набережній.</p></div>`;
  const k = html.indexOf('<div class="cards">');
  return k > 0 ? html.slice(0, k) + card + html.slice(k) : html + card;
};

Object.assign(ACT, {
  opResp: (d) => respondScandal(d.id, d.v), opInterview: (d) => interview(d.v, askVal('opOutlet') || null), opAd: (d) => adCampaign(d.v),
  opCamp: (d) => { const b = document.getElementById('opBots-' + d.k); opinionCampaign(d.k, +d.v, b && b.checked); },
  pwForum: () => govForum(), pwMeet: (d) => workMeeting(d.v), pwCity: (d) => cityProject(d.v),
  agAll: () => agencyFill(allUnits2().filter((u) => staffOf(u).length < maxStaff(u))), agUnit: (d) => agencyFill([unitById(d.id)]),
});
if (typeof empireAlerts === 'function') {
  const _al2 = empireAlerts;
  empireAlerts = function () {
    const al = _al2();
    if (state.opinion && state.opinion.scandals.some((s) => !s.done && state.day < s.until)) al.unshift(['bad', '🗞️ Скандал — потрібна реакція', 'opinion']);
    const vac = state.labor ? sum(Object.values(vacancies()), (x) => x) : 0;
    if (vac > 5) al.push(['', `👥 Вакансій: ${vac} — закрийте через агентство`, 'staff']);
    return al;
  };
}
