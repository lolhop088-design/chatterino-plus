'use strict';
/* БІЗНЕС ІМПЕРІЯ — «Термінал» у стилі фінансового терміналу:
   НОВИНИ · МОЇ МЕДІА · ПОЛІТИКА · КРИМІНАЛ · БЕЗПЕКА · РОЗСЛІДУВАННЯ. */

const TERM_TABS = [['newsroom', '📰 Новини'], ['media', '📡 Мої медіа'], ['politics', '🗳️ Політика'], ['underworld', '🕶️ Кримінал'], ['security', '🛡️ Безпека'], ['investigations', '🔎 Розслідування']];
NAV.splice(NAV.findIndex((x) => x[0] === 'news') + 1, 0, ['newsroom', '📟', 'Термінал'], ['politics', '🗳️', 'Політика'], ['media', '📡', 'Медіа'], ['underworld', '🕶️', 'Кримінал'], ['security', '🛡️', 'Безпека']);

const coName = (id) => (id === 'player' ? state.company : id === 'independent' ? 'Незалежне' : (coById(id) || {}).name || '—');
const partyName = (id) => (partyById(id) || {}).name || 'позапартійний';
const partyDot = (p) => `<i class="pdot" style="background:${IDEOLOGIES[p.ideo].color}"></i>`;

function termHead(cur) {
  const M = mediaState(), P = polState(), brk = state.news.filter((n) => n.breaking).slice(0, 6);
  const ticker = brk.length ? brk.map((n) => `<span><b>BREAKING</b> ${esc(n.text)}</span>`).join('') : '<span>Термінових новин немає</span>';
  const cid = state.ui.mapCity || state.city;
  return `<div class="term"><div class="tickerline"><div class="tick">${ticker}${ticker}</div></div>
    <div class="termkpi">${kpi('Репутація корпорації', Math.round(M.corpRep), M.corpRep >= 60 ? 'pos' : M.corpRep < 40 ? 'neg' : '')}${kpi('Медіавплив', M.influence + '%')}${kpi('Популярність', Math.round(P.me.popularity))}${kpi('Політ. капітал', Math.round(P.me.pc))}${kpi('Злочинність', pct(crimeIndex(cid), 0), crimeIndex(cid) > 0.4 ? 'neg' : '', CITIES[cid].name)}</div>
    <div class="tabs termtabs">${TERM_TABS.map(([id, n]) => `<button class="${cur === id ? 'on' : ''}" data-act="nav" data-v="${id}">${n}</button>`).join('')}</div></div>`;
}

Object.assign(VIEWS, {
  newsroom() {
    const cat = state.ui.newsCat2 || 'all';
    const cats = { all: 'Усі', econ: 'Економіка', politics: 'Політика', business: 'Бізнес', corp: 'Компанії', market: 'Ринки', media: 'Медіа', crime: 'Кримінал', tech: 'Технології' };
    const list = state.news.filter((n) => cat === 'all' || n.cat === cat).slice(0, 100);
    return `${termHead('newsroom')}<div class="chips filter">${Object.entries(cats).map(([k, v]) => `<button class="chip ${cat === k ? 'on' : ''}" data-act="newsCat2" data-v="${k}">${v}</button>`).join('')}</div>
      <div class="card"><ul class="log news">${list.map((n) => `<li class="${n.kind} ${n.breaking ? 'breaking' : ''}"><small>Д${n.day}</small> ${n.breaking ? '<b class="brk">BREAKING</b> ' : ''}${esc(n.text)}${n.fake ? ' <span class="tag bad">фейк</span>' : ''}</li>`).join('') || '<li class="muted">Новин немає.</li>'}</ul></div>`;
  },

  media() {
    const M = mediaState(), mine = myOutlets();
    const tot = sum(M.outlets, (o) => o.audience) || 1;
    let html = `${termHead('media')}<div class="kpis">${kpi('Моїх медіа', mine.length)}${kpi('Аудиторія', moneyK(sum(mine, (o) => o.audience)).replace('$', ''))}${kpi('Прибуток медіа/день', money(sum(mine, (o) => outletRevenue(o) - outletCosts(o))), sum(mine, (o) => outletRevenue(o) - outletCosts(o)) < 0 ? 'neg' : 'pos')}${kpi('Позовів програно', M.sued, M.sued ? 'neg' : '')}${kpi('Фактчекінг', pct(M.factcheck, 0))}</div>
      <div class="card"><p class="muted">Медіа заробляють на рекламі (аудиторія × довіра) і дають вплив: власний медіаресурс посилює PR, кампанії та політичні виборчі кампанії. Таблоїди збирають аудиторію, але втрачають довіру; розслідувальна політика — навпаки. Неправдиві матеріали викривають фактчекери — тоді суд і штраф.</p></div>`;
    for (const o of mine) {
      const T = OUTLET_TYPES[o.type], q = outletQuality(o);
      html += `<div class="card"><div class="row between"><b>${T.icon} ${esc(o.name)}</b><span class="tag">${T.name}</span></div>
        <div class="kpis">${kpi('Аудиторія', moneyK(o.audience).replace('$', ''), '', pct(o.audience / tot, 1) + ' ринку')}${kpi('Довіра', Math.round(o.trust), o.trust < 35 ? 'neg' : o.trust > 65 ? 'pos' : '')}${kpi('Якість редакції', pct(q, 0))}${kpi('Дохід/день', money(outletRevenue(o)))}${kpi('Витрати/день', money(outletCosts(o)))}${kpi('Сила впливу', outletPower(o).toFixed(2))}</div>
        <div class="row wrap"><span class="muted">Редакційна політика:</span> <select data-change="mPolicy" data-id="${o.id}">${Object.entries(MEDIA_POLICIES).map(([k, P]) => `<option value="${k}" ${o.policy === k ? 'selected' : ''}>${P.name}</option>`).join('')}</select>
          <span class="muted">Реклама:</span>${[0.6, 1, 1.4].map((v) => `<button class="chip ${o.ads === v ? 'on' : ''}" data-act="mAds" data-id="${o.id}" data-v="${v}">${v < 1 ? 'мало' : v > 1 ? 'багато' : 'норма'}</button>`).join('')}</div>
        <table class="pl">${Object.entries(MEDIA_ROLES).map(([r, R]) => `<tr><td>${R.name} (${money(R.wage * priceLvl())}/д)</td><td><button class="btn sm" data-act="mStaff" data-id="${o.id}" data-r="${r}" data-v="-1">−</button> <b>${o.staff[r]}</b> <button class="btn sm" data-act="mStaff" data-id="${o.id}" data-r="${r}" data-v="1">+</button></td></tr>`).join('')}</table>
        <div class="row wrap" style="margin-top:6px"><button class="btn sm" data-act="mShow" data-id="${o.id}" data-v="interview">🎙️ Ексклюзивне інтерв’ю · ${moneyK(5e4 * priceLvl())}</button><button class="btn sm" data-act="mShow" data-id="${o.id}" data-v="press">🎤 Пресконференція · ${moneyK(3e4 * priceLvl())}</button>${mine.filter((x) => x !== o && x.type === o.type).map((x) => `<button class="btn sm" data-act="mMerge" data-a="${o.id}" data-b="${x.id}">Об’єднати з «${esc(x.name)}»</button>`).join('')}<button class="btn sm danger" data-act="mSell" data-id="${o.id}">Продати · ${moneyK(outletPrice(o) * 0.9)}</button></div></div>`;
    }
    html += `<div class="card"><h3>Заснувати медіа</h3><div class="row wrap"><select id="mType">${Object.entries(OUTLET_TYPES).map(([k, T]) => `<option value="${k}">${T.icon} ${T.name} — ${moneyK(T.setup * priceLvl())}</option>`).join('')}</select><input id="mName" placeholder="Назва" maxlength="30"><button class="btn primary" data-act="mFound">Заснувати</button></div></div>`;
    if (mine.length) {
      const targets = aliveCos().filter((c) => !isSub(c)).sort((a, b) => (b.rivalry || 0) - (a.rivalry || 0));
      html += `<div class="card"><h3>Інформаційна кампанія</h3><div class="row wrap"><select id="cType">${Object.entries(CAMPAIGNS_INFO).map(([k, C]) => `<option value="${k}">${C.icon} ${C.name} — від ${moneyK(C.cost * priceLvl())}</option>`).join('')}</select>
        <select id="cOutlet">${mine.map((o) => `<option value="${o.id}">${OUTLET_TYPES[o.type].icon} ${esc(o.name)}</option>`).join('')}</select>
        <select id="cTarget"><option value="">— ціль (для розслідувань і чуток) —</option>${targets.map((c) => `<option value="${c.id}">${esc(c.name)} · ворожнеча ${Math.round((c.rivalry || 0) * 100)}%</option>`).join('')}</select>
        <label class="switch"><input type="checkbox" id="cBots"> 🤖 Боти (+50% охоплення, вищий ризик викриття)</label><button class="btn primary" data-act="mCampaign">Запустити</button></div>
        <p class="muted">${Object.values(CAMPAIGNS_INFO).map((C) => `${C.icon} <b>${C.name}</b>: ${C.desc}`).join('<br>')}</p></div>`;
    }
    const act = M.campaigns;
    html += `<div class="card"><h3>Активні кампанії</h3>${act.length ? act.map((c) => `<p>${CAMPAIGNS_INFO[c.type].icon} ${CAMPAIGNS_INFO[c.type].name}: ${esc(coName(c.by))} → ${esc(coName(c.target))}${c.bots ? ' 🤖' : ''} · ще ${c.days} дн.${c.target === 'player' && c.by !== 'player' ? ' <span class="tag bad">проти вас</span>' : ''}</p>`).join('') : '<p class="muted">Немає.</p>'}</div>
      <div class="card"><h3>Рейтинг медіа</h3><div class="table-wrap"><table><thead><tr><th>Медіа</th><th>Власник</th><th>Аудиторія</th><th>Довіра</th><th>Політика</th><th></th></tr></thead><tbody>${[...M.outlets].sort((a, b) => b.audience - a.audience).map((o) => `<tr class="${o.owner === 'player' ? 'mine' : ''}"><td>${OUTLET_TYPES[o.type].icon} ${esc(o.name)}</td><td>${esc(coName(o.owner))}</td><td>${moneyK(o.audience).replace('$', '')}</td><td>${Math.round(o.trust)}</td><td>${MEDIA_POLICIES[o.policy].name}</td><td>${o.owner === 'player' ? '' : `<button class="btn sm" ${state.cash < outletPrice(o) ? 'disabled' : ''} data-act="mBuy" data-id="${o.id}">Купити · ${moneyK(outletPrice(o))}</button>`}</td></tr>`).join('')}</tbody></table></div></div>`;
    return html;
  },

  politics() {
    const P = polState(), G = govState(), tab = ['overview', 'parl', 'parties', 'elections', 'lobby'].includes(state.ui.tab) ? state.ui.tab : 'overview';
    let html = termHead('politics') + tabsHtml([['overview', 'Влада'], ['parl', 'Парламент'], ['parties', 'Партії й рейтинги'], ['elections', 'Вибори'], ['lobby', 'Лобіювання й тендери']], tab);
    const mp = myParty();
    if (tab === 'overview') {
      const pres = P.president;
      html += `<div class="cards"><div class="card" style="display:block"><b>🎖️ Президент</b><p>${esc(pres.name)}${pres.player ? ' <span class="tag good">ви</span>' : ''}<br><small class="muted">${esc(partyName(pres.party))} · з дня ${pres.since} · наступні вибори ≈ день ${Math.round(P.nextPres)}</small></p></div>
        <div class="card" style="display:block"><b>🏛️ Прем’єр-міністр</b><p>${esc(P.pm ? P.pm.name : '—')}<br><small class="muted">${esc(partyName(P.pm && P.pm.party))} · коаліція ${sum(gov(), (p) => p.seats)}/${SEATS}</small></p></div>
        <div class="card" style="display:block"><b>👤 Ви в політиці</b><p>${P.me.office === 'president' ? 'Президент' : P.me.posts.length ? P.me.posts.map((x) => 'Мер: ' + CITIES[x.split(':')[1]].name).join(', ') : 'Без посади'}<br><small class="muted">Партія: ${mp ? esc(mp.name) : '—'} · популярність ${Math.round(P.me.popularity)} · політ. капітал ${Math.round(P.me.pc)} · внески ${moneyK(P.me.donated)}</small></p></div></div>
        <div class="card"><h3>Посади в уряді та незалежних органах</h3>${Object.entries(MINISTRIES).map(([k, Mi]) => { const m = G.ministries[k]; return `<div class="row between postrow"><div>${Mi.icon} <b>${Mi.name}</b><br><small class="muted">${INDEPENDENT.includes(k) ? `незалежний конкурс · строк до Д${m.term || '—'}` : 'призначає уряд (коаліція)'}</small></div><div style="text-align:right">${esc(m.head)}${P.appointees[k] && !P.appointees[k].pending ? ' <span class="tag good">ваша людина</span>' : ''}<br><small>${m.strict > 0.6 ? '<span class="neg">жорсткий курс</span>' : m.strict < 0.4 ? '<span class="pos">ліберальний курс</span>' : 'помірний курс'}</small></div></div>`; }).join('')}
        <p class="muted">Центробанк, антимонопольний комітет і суди незалежні: на них не можна призначити «свою людину» і з ними не проводять лобістських зустрічей.</p>
        ${(P.me.office === 'president' || (mp && P.coalition.includes(mp.id))) ? `<div class="row wrap"><select id="nomMin">${CABINET.map((k) => `<option value="${k}">${MINISTRIES[k].name}</option>`).join('')}</select><input id="nomName" placeholder="Ім’я кандидата" maxlength="30"><select id="nomStrict"><option value="0.25">ліберальний курс</option><option value="0.5">помірний</option><option value="0.75">жорсткий</option></select><button class="btn primary" data-act="pNominate">Висунути (20 капіталу)</button></div>` : '<p class="muted">Висувати своїх людей у профільні міністерства можна, коли ваша партія в коаліції або ви президент.</p>'}</div>
        <div class="card"><h3>Мери міст</h3><table class="pl">${Object.entries(P.mayors).map(([c, m]) => `<tr><td>${CITIES[c].name}</td><td>${esc(m.name)}${m.player ? ' <span class="tag good">ви</span>' : ''} · <small class="muted">${esc(partyName(m.party))}</small></td></tr>`).join('')}</table></div>
        <div class="card"><h3>Чинні закони прозорості</h3><p>${P.laws.partyFinance ? '✅' : '❌'} Прозоре фінансування партій (ліміт внесків ${moneyK(donationCap())}/міс.)<br>${P.laws.declarations ? '✅' : '❌'} Е-декларації посадовців (частіше виявляють конфлікт інтересів)<br>${P.lawOrder ? '✅' : '❌'} Посилене фінансування поліції</p></div>`;
    } else if (tab === 'parl') {
      const ps = [...P.parties].filter((p) => p.seats).sort((a, b) => b.seats - a.seats);
      html += `<div class="card"><h3>Верховна Рада · ${SEATS} місць · наступні вибори ≈ день ${P.nextParl}</h3><div class="seatbar">${ps.map((p) => `<i title="${esc(p.name)}" style="width:${p.seats / SEATS * 100}%;background:${IDEOLOGIES[p.ideo].color}"></i>`).join('')}</div>
        <table class="pl">${ps.map((p) => `<tr><td>${partyDot(p)} ${esc(p.name)}${p.player ? ' <span class="tag good">ваша</span>' : ''}${P.coalition.includes(p.id) ? ' <span class="tag">коаліція</span>' : ''}</td><td>${p.seats}</td></tr>`).join('')}</table></div>
        <div class="card"><h3>Внести законопроєкт · ${moneyK(3e5 * priceLvl())}</h3><div class="row wrap"><select id="billKey">${Object.entries(BILLS).filter(([k, B]) => !(B.law && P.laws[B.law])).map(([k, B]) => `<option value="${k}">${B.name}</option>`).join('')}</select><button class="btn primary" data-act="pBill">Внести</button></div><p class="muted">Потрібні власні депутати або партія, яку ви офіційно фінансуєте (≥$1M). Партії голосують за ідеологією; ваші зареєстровані внески трохи підвищують шанси. Президент може ветувати.</p></div>
        <div class="card"><h3>Законопроєкти</h3>${P.bills.length ? P.bills.slice(0, 25).map((b) => `<p>${b.status === 'passed' ? '✅' : b.status === 'failed' ? '❌' : b.status === 'vetoed' ? '🚫' : '⏳'} <b>${BILLS[b.key].name}</b><br><small class="muted">ініціатор: ${b.by === 'player' ? state.company : esc(partyName(b.by))} · ${b.status ? `${b.status === 'vetoed' ? 'вето президента' : (b.yes || 0) + ' голосів «за»'}` : 'голосування в день ' + b.vote}</small></p>`).join('') : '<p class="muted">Поки немає.</p>'}</div>`;
    } else if (tab === 'parties') {
      html += `<div class="card"><h3>Рейтинги партій</h3>${[...P.parties].sort((a, b) => b.rating - a.rating).map((p) => `<div class="stock"><div><b>${partyDot(p)} ${esc(p.name)}</b>${p.player ? ' <span class="tag good">ваша</span>' : ''}<br><small>${IDEOLOGIES[p.ideo].name} · лідер ${esc(p.player ? state.me.name : p.leader)} · каса ${moneyK(p.funds)} · місць ${p.seats}${p.scandals ? ` · скандалів ${p.scandals}` : ''}</small></div><div class="px"><b>${p.rating.toFixed(1)}%</b></div><span></span><div class="trade">${p.player ? `<button class="btn sm primary" data-act="pDonate" data-id="${p.id}" data-v="1000000">Профінансувати $1M</button><button class="btn sm primary" data-act="pDonate" data-id="${p.id}" data-v="5000000">$5M</button>` : `<button class="btn sm" data-act="pDonate" data-id="${p.id}" data-v="250000">Офіційний внесок $250K</button><button class="btn sm" data-act="pDonate" data-id="${p.id}" data-v="1000000">$1M</button>`}</div></div>`).join('')}</div>
        ${mp ? '' : `<div class="card"><h3>Заснувати власну партію · ${moneyK(PARTY_COST * priceLvl())}</h3><div class="row wrap"><input id="partyName" placeholder="Назва партії" maxlength="30"><select id="partyIdeo">${Object.entries(IDEOLOGIES).map(([k, I]) => `<option value="${k}">${I.name}</option>`).join('')}</select><button class="btn primary" data-act="pFound">Заснувати</button></div><p class="muted">Ідеологія визначає, за які закони голосуватимуть ваші депутати й кого підтримають виборці. Рейтинг росте від вашої популярності, медіавпливу й фінансування.</p></div>`}
        <div class="card"><h3>Фінансування партій</h3><p class="muted">Усі внески публічні. Ліміт на місяць для чужих партій: ${moneyK(donationCap())} (використано ${moneyK(P.me.monthDonated)}). Великі внески правлячим партіям + виграні тендери = ризик антикорупційного розслідування. ІІ-компанії підпадають під ті самі правила.</p></div>`;
    } else if (tab === 'elections') {
      const C = P.campaign;
      html += `<div class="card"><h3>Найближчі вибори</h3><p>🏛️ Парламентські: день ${P.nextParl} · 🎖️ Президентські: день ${Math.round(P.nextPres)} · 🏙️ Місцеві: ≈ день ${P.nextLocal}</p>
        <div class="row wrap"><button class="btn" data-act="pRun" data-v="pres" ${P.me.running ? 'disabled' : ''}>Висунутися в президенти · ${moneyK(2e6 * priceLvl())}</button><select id="runCity">${Object.keys(state.unlocked || { [state.city]: 1 }).map((c) => `<option value="${c}">${CITIES[c].name}</option>`).join('')}</select><button class="btn" data-act="pRun" data-v="mayor" ${P.me.running ? 'disabled' : ''}>Висунутися в мери · ${moneyK(2e5 * priceLvl())}</button></div>
        <p class="muted">Президент — потрібні партія і популярність ≥25. Мер — популярність ≥10. Популярність росте від репутації корпорації, кількості працівників, спорту й посад. ${P.me.running ? `Ви зареєстровані кандидатом (${P.me.running.type === 'pres' ? 'президент' : 'мер ' + CITIES[P.me.running.city].name}).` : ''}</p></div>`;
      if (C) {
        const tot = sum(C.cands, (c) => Math.max(0.5, c.score)) || 1, me = C.cands.find((c) => c.player);
        html += `<div class="card"><h3>Кампанія: ${C.type === 'pres' ? 'президент' : C.type === 'parl' ? 'парламент' : 'мер · ' + CITIES[C.city].name} · голосування в день ${C.ends}</h3>${[...C.cands].sort((a, b) => b.score - a.score).map((c) => `<div class="row between"><span>${esc(c.name)} <small class="muted">${esc(partyName(c.party))}</small>${c.player ? ' <span class="tag good">ви</span>' : ''}</span><b>${pct(Math.max(0.5, c.score) / tot, 1)}</b></div>${bar(Math.max(0.5, c.score), tot)}`).join('')}<small class="muted">Опитування — орієнтовні; результат залежить від витрат на кампанію, медіа й дебатів.</small>
          ${me ? `<div class="row wrap" style="margin-top:8px"><button class="btn sm primary" data-act="pSpend" data-v="500000">Реклама $500K</button><button class="btn sm primary" data-act="pSpend" data-v="2000000">$2M</button><button class="btn sm primary" data-act="pSpend" data-v="10000000">$10M</button><button class="btn sm" data-act="pDebate" ${C.debates >= 2 ? 'disabled' : ''}>🎤 Дебати (${2 - C.debates} лишилось)</button></div>` : ''}</div>`;
      }
      html += `<div class="card"><h3>Результати</h3>${P.history.length ? P.history.map((h) => `<p><small>Д${h.day}</small> <b>${h.type === 'pres' ? 'Президент' : h.type === 'parl' ? 'Парламент' : 'Мер · ' + CITIES[h.city].name}</b>: ${h.res.slice(0, 4).map((r) => `${esc(r.name)} ${r.pct}%`).join(' · ')}</p>`).join('') : '<p class="muted">Виборів ще не було.</p>'}</div>`;
    } else {
      html += `<div class="card"><h3>Офіційні зустрічі й консультації · ${moneyK(1e5 * priceLvl())}</h3><p class="muted">Зареєстроване лобіювання законних економічних інтересів: шанс на субсидію галузі чи пом’якшення регулювання. Незалежні органи (ЦБ, АМКУ, суди) недоступні.</p><div class="row wrap">${CABINET.map((k) => `<button class="btn sm" data-act="pLobby" data-v="${k}">${MINISTRIES[k].icon} ${MINISTRIES[k].name}</button>`).join('')}</div><p class="muted">Проведено зустрічей: ${P.me.meetings}</p></div>
        <div class="card"><h3>Державні тендери</h3>${P.tenders.length ? P.tenders.map((t) => { const my = t.bids.find((b) => b.by === 'player'); const can = t.need === 'any' || state.fac.some((f) => f.kind === t.need) || state.biz.some((b) => b.type === t.need); return `<div class="stock"><div><b>📑 ${esc(t.title)}</b><br><small>${MINISTRIES[t.ministry].name} · кошторис ${moneyK(t.value)} · до дня ${t.ends}${t.need !== 'any' ? ` · потрібен профіль: ${(FACILITIES[t.need] || TYPES[t.need] || {}).name || t.need}` : ''}${can ? '' : ' <span class="neg">(у вас немає профілю)</span>'}</small>${my ? `<br><small class="pos">Ваша заявка: ${Math.round(my.pct * 100)}%</small>` : ''}</div><div class="px"></div><span></span><div class="trade">${[0.85, 0.92, 1].map((v) => `<button class="btn sm" ${can ? '' : 'disabled'} data-act="pTender" data-id="${t.id}" data-v="${v}">${Math.round(v * 100)}%</button>`).join('')}</div></div>`; }).join('') : '<p class="muted">Відкритих тендерів немає.</p>'}<p class="muted">Перемагає найнижча ціна з урахуванням репутації. Якщо ваша партія в уряді або ви на посаді — тендер перевіряють на конфлікт інтересів.</p>
        ${(P.contracts || []).length ? `<h3>Ваші держконтракти</h3>${P.contracts.map((w) => `<p>${esc(w.title)}: ${money(w.daily)}/день ще ${w.left} дн.</p>`).join('')}` : ''}</div>`;
    }
    html += `<div class="card"><h3>Політичні новини</h3><ul class="log news">${state.news.filter((n) => n.cat === 'politics').slice(0, 12).map((n) => `<li class="${n.kind}"><small>Д${n.day}</small> ${esc(n.text)}</li>`).join('') || '<li class="muted">Немає.</li>'}</ul></div>`;
    return html;
  },

  underworld() {
    const K = crimeState();
    const cities = Object.keys(CITIES);
    let html = `${termHead('underworld')}<div class="card"><p class="muted">Кримінальний світ живе своїм життям: угруповання ділять території, воюють, об’єднуються, їх громить поліція. Вимагання можна заплатити (угруповання сильнішає, ризик справи), відмовити (ризик нападів) або заявити в поліцію (успіх залежить від сили поліції й вашої служби безпеки).</p></div>
      <h3>Карта злочинності</h3><div class="crimemap">${cities.map((c) => { const ci = crimeIndex(c), g = strongestGang(c); return `<div class="cm ${state.unlocked && state.unlocked[c] ? 'open' : ''}" style="--ci:${ci.toFixed(2)}"><b>${CITIES[c].name}</b><small>злочинність ${pct(ci, 0)}</small>${bar(ci * 100, 100, ci > 0.4 ? 'bad' : ci > 0.2 ? 'mid' : 'good')}<small>поліція ${pct(K.police[c], 0)}${g ? ` · домінує «${esc(g.name)}»` : ''}</small></div>`; }).join('')}</div>`;
    if (K.demands.length || K.blackmail || K.offers.length) {
      html += `<div class="card warn"><h3>⚠️ Вимоги й пропозиції</h3>${K.demands.map((d) => { const g = K.gangs.find((x) => x.id === d.gang) || {}; const u = allUnits().find((x) => x.id === d.unit) || {}; return `<div class="stock"><div><b>📞 «${esc(g.name)}» → «${esc(u.name)}»</b><br><small>Вимагають ${money(d.amount)} до дня ${d.until}</small></div><div class="px"></div><span></span><div class="trade"><button class="btn sm" data-act="cDemand" data-id="${d.id}" data-v="pay">Заплатити</button><button class="btn sm" data-act="cDemand" data-id="${d.id}" data-v="refuse">Відмовити</button><button class="btn sm primary" data-act="cDemand" data-id="${d.id}" data-v="report">Заявити в поліцію</button></div></div>`; }).join('')}
        ${K.blackmail ? `<div class="stock"><div><b>✉️ Шантаж</b><br><small>Погрожують оприлюднити: ${esc(K.blackmail.what)}. Вимагають ${money(K.blackmail.amount)} до дня ${K.blackmail.until}.</small></div><div class="px"></div><span></span><div class="trade"><button class="btn sm" data-act="cBlack" data-v="pay">Заплатити</button><button class="btn sm primary" data-act="cBlack" data-v="report">Звернутися в поліцію</button><button class="btn sm" data-act="cBlack" data-v="ignore">Ігнорувати</button></div></div>` : ''}
        ${K.offers.map((o) => `<div class="stock"><div><b>📦 Сумнівна угода</b><br><small>${esc(o.what)} · +${moneyK(o.gain)} · ризик розслідування ${Math.round(o.risk * 100)}% · до дня ${o.until}</small></div><div class="px"></div><span></span><div class="trade"><button class="btn sm danger" data-act="cOffer" data-id="${o.id}" data-v="1">Погодитись</button><button class="btn sm" data-act="cOffer" data-id="${o.id}" data-v="0">Відмовитись</button></div></div>`).join('')}</div>`;
    }
    html += `<div class="card"><h3>Угруповання</h3>${aliveGangs().sort((a, b) => b.power - a.power).map((g) => `<div class="stock"><div><b>🕶️ ${esc(g.name)}</b> <small class="muted">бос ${esc(g.boss)}</small><br><small>Території: ${Object.entries(g.turf).filter(([, v]) => v > 0.02).map(([c, v]) => `${CITIES[c].name} ${pct(v, 0)}`).join(', ') || '—'}</small><br><small>Увага поліції ${Math.round(g.heat)}${g.grudge > 0.5 ? ' · <span class="neg">ворожі до вас</span>' : ''}</small></div><div class="px"><b>${Math.round(g.power)}</b><br><small class="muted">сила</small></div></div>`).join('')}</div>
      <div class="card"><h3>Кримінальна хроніка</h3><ul class="log news">${state.news.filter((n) => n.cat === 'crime').slice(0, 20).map((n) => `<li class="${n.kind}"><small>Д${n.day}</small> ${esc(n.text)}</li>`).join('') || '<li class="muted">Спокійно.</li>'}</ul></div>`;
    return html;
  },

  security() {
    const K = crimeState(), units = allUnits();
    const chips = (list, cur, act, f) => `<div class="chips">${list.map((L, i) => `<button class="chip ${cur === i ? 'on' : ''}" data-act="${act}" data-v="${i}">${L.name}${f(L) ? ' · ' + f(L) : ''}</button>`).join('')}</div>`;
    let html = `${termHead('security')}<div class="kpis">${kpi('Витрати на безпеку', money(securityCostDaily()) + '/день')}${kpi('Страхування', money(insuranceCostDaily()) + '/день')}${kpi('Вартість активів', moneyK(assetsValue()))}${kpi('Інцидентів', K.incidents.length)}</div>
      <div class="card"><h3>👤 Особиста охорона</h3>${chips(GUARD_TIERS, K.guard, 'sGuard', (L) => (L.cost ? money(L.cost * priceLvl()) + '/д' : ''))}<p class="muted">Захищає від нападів і погроз власнику, знижує шанс шантажу.</p></div>
      <div class="card"><h3>🕵️ Корпоративна служба безпеки</h3>${chips(CSO_LEVELS, K.cso, 'sCSO', (L) => (L.cost ? money(L.cost * priceLvl()) + '/д' : ''))}<p class="muted">Внутрішні розслідування: виявляє замовників нападів і витоки, підвищує успіх заяв у поліцію.</p></div>
      <div class="card"><h3>💻 Кібербезпека й захист рахунків</h3>${chips(CYBER_LEVELS, K.cyber, 'sCyber', (L) => (L.cost ? money(L.cost * priceLvl()) + '/д' : ''))}</div>
      <div class="card"><h3>📄 Страхування бізнесу</h3>${chips(INSURANCE, K.insurance, 'sIns', (L) => (L.cover ? `покриття ${pct(L.cover, 0)}` : ''))}<p class="muted">Внесок залежить від вартості активів і рівня злочинності у ваших містах. Відшкодовує крадіжки, саботаж, кібератаки.</p></div>
      <div class="card"><h3>🏢 Охорона об’єктів</h3><div class="row wrap"><span class="muted">Усім:</span>${SEC_LEVELS.map((L, i) => `<button class="chip" data-act="sAll" data-v="${i}">${L.name}</button>`).join('')}</div>
        ${units.length ? `<div class="table-wrap"><table><thead><tr><th>Об’єкт</th><th>Місто</th><th>Злочинність</th><th>Охорона</th></tr></thead><tbody>${units.map((u) => { const ci = crimeIndex(unitCity(u)); return `<tr><td>${esc(u.name)}</td><td>${CITIES[unitCity(u)].name}</td><td class="${ci > 0.4 ? 'neg' : ''}">${pct(ci, 0)}</td><td><select data-change="unitSec" data-id="${u.id}">${SEC_LEVELS.map((L, i) => `<option value="${i}" ${(u.sec || 0) === i ? 'selected' : ''}>${L.name}${L.cost ? ` (${money(L.cost * priceLvl())}/д)` : ''}</option>`).join('')}</select></td></tr>`; }).join('')}</tbody></table></div>` : '<p class="muted">Об’єктів поки немає.</p>'}</div>
      <div class="card"><h3>Журнал інцидентів</h3><ul class="log">${K.incidents.slice(0, 25).map((i) => `<li class="bad"><small>Д${i.day}</small> ${esc(i.text)}</li>`).join('') || '<li class="muted">Інцидентів не було.</li>'}</ul></div>`;
    return html;
  },

  investigations() {
    const K = crimeState(), P = polState(), G = govState();
    const row = (c, src) => `<div class="stock"><div><b>${src}</b> · ${esc(coName(c.target) !== '—' ? coName(c.target) : partyName(c.target))}${c.target === 'player' ? ' <span class="tag bad">ви</span>' : ''}<br><small>${esc(c.what)} · відкрито Д${c.opened}</small></div><div class="px"><small>${c.outcome ? esc(c.outcome) : 'рішення суду ≈ Д' + c.decide}</small></div></div>`;
    const all = [...K.cases.map((c) => ({ c, s: '🚔 Поліція' })), ...P.cases.map((c) => ({ c, s: '🏛️ Антикорупційне бюро' }))].sort((a, b) => b.c.opened - a.c.opened);
    const antitrust = G.cases.filter((c) => c.stage !== 'closed');
    return `${termHead('investigations')}<div class="kpis">${kpi('Справ проти вас', all.filter((x) => x.c.target === 'player' && !x.c.outcome).length + antitrust.filter((c) => c.target === 'player').length, '')}${kpi('Порушень (усього)', G.violations.player || 0, G.violations.player ? 'neg' : '')}${kpi('Позовів за наклеп', mediaState().sued)}${kpi('Юристи', LAW_FIRMS[G.lawFirm].name)}</div>
      <div class="card"><p class="muted">Розслідування ведуть поліція, антикорупційне бюро й антимонопольний комітет; рішення ухвалюють незалежні суди. Юридична фірма (розділ «Антимонопольний комітет») підвищує шанси на виправдання. Ті самі правила діють для ІІ-компаній і партій.</p></div>
      <div class="card"><h3>Кримінальні й антикорупційні справи</h3>${all.length ? all.slice(0, 30).map((x) => row(x.c, x.s)).join('') : '<p class="muted">Справ немає.</p>'}</div>
      <div class="card"><h3>Антимонопольні справи</h3>${antitrust.length ? antitrust.map((c) => `<p>⚖️ ${esc(groupName(c.target))}: ${esc(c.why)} · ${c.stage}</p>`).join('') : '<p class="muted">Активних немає.</p>'}<button class="btn sm" data-act="nav" data-v="antitrust">Відкрити АМКУ</button></div>
      <div class="card"><h3>Фактчекінг і медіасуди</h3><ul class="log news">${state.news.filter((n) => n.cat === 'media' && /Фактчек|Суд/.test(n.text)).slice(0, 15).map((n) => `<li class="${n.kind}"><small>Д${n.day}</small> ${esc(n.text)}</li>`).join('') || '<li class="muted">Немає.</li>'}</ul></div>`;
  },
});

const askVal = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
Object.assign(ACT, {
  newsCat2: (d) => { state.ui.newsCat2 = d.v; },
  mFound: () => foundOutlet(askVal('mType'), askVal('mName').trim()),
  mBuy: (d) => { const o = mediaState().outlets.find((x) => x.id === d.id); confirmBox(`Купити «${esc(o.name)}» за ${money(outletPrice(o))}?`, () => buyOutlet(d.id)); },
  mSell: (d) => confirmBox('Продати це медіа?', () => sellOutlet(d.id)),
  mMerge: (d) => mergeOutlets(d.a, d.b),
  mAds: (d) => { const o = mediaState().outlets.find((x) => x.id === d.id); o.ads = +d.v; if (o.ads > 1) o.trust = Math.max(2, o.trust - 1); },
  mStaff: (d) => { const o = mediaState().outlets.find((x) => x.id === d.id); o.staff[d.r] = Math.max(0, o.staff[d.r] + (+d.v) * Math.max(1, Math.round(OUTLET_TYPES[o.type].need / 10))); },
  mShow: (d) => {
    const o = mediaState().outlets.find((x) => x.id === d.id), cost = (d.v === 'interview' ? 5e4 : 3e4) * priceLvl();
    if (state.cash < cost) return toast('Недостатньо коштів.', 'bad');
    book('marketing', -cost);
    if (d.v === 'interview') { o.audience = Math.round(o.audience * 1.04); o.trust = Math.min(98, o.trust + 1); news(`🎙️ «${o.name}»: ексклюзивне інтерв’ю з ${pick(POLITICIANS)} зібрало рекордну аудиторію.`, 'media', 'good'); }
    else { applyReputation('player', 0.8 * Math.min(2, outletPower(o) + 0.3)); news(`🎤 Пресконференція ${state.company}: нові плани розвитку й робочі місця.`, 'business', 'good'); }
  },
  mCampaign: () => launchCampaign(askVal('cType'), askVal('cOutlet'), askVal('cTarget') || null, document.getElementById('cBots') && document.getElementById('cBots').checked),
  pFound: () => foundParty(askVal('partyName').trim(), askVal('partyIdeo')),
  pDonate: (d) => donate(d.id, +d.v * priceLvl()),
  pRun: (d) => runFor(d.v, d.v === 'mayor' ? askVal('runCity') : null),
  pSpend: (d) => campaignSpend(+d.v * priceLvl()),
  pDebate: () => debate(),
  pLobby: (d) => lobbyMeeting(d.v),
  pBill: () => proposeBill(askVal('billKey')),
  pNominate: () => nominate(askVal('nomMin'), askVal('nomName').trim(), +askVal('nomStrict')),
  pTender: (d) => bidTender(d.id, +d.v),
  cDemand: (d) => answerDemand(d.id, d.v),
  cBlack: (d) => answerBlackmail(d.v),
  cOffer: (d) => confirmBox(d.v === '1' ? 'Погодитись на сумнівну угоду? Можлива кримінальна справа.' : 'Відмовитись?', () => answerOffer(d.id, d.v === '1')),
  sGuard: (d) => setGuard(+d.v), sCSO: (d) => setCSO(+d.v), sCyber: (d) => setCyber(+d.v), sIns: (d) => setInsurance(+d.v), sAll: (d) => setAllSec(+d.v),
});
Object.assign(CHANGE, {
  mPolicy: (el) => { const o = mediaState().outlets.find((x) => x.id === el.dataset.id); if (o) o.policy = el.value; },
  unitSec: (el) => setUnitSec(el.dataset.id, +el.value),
});
