'use strict';
/* БІЗНЕС ІМПЕРІЯ — екрани «Галузі» (сервісні підрозділи, фарма, космос, холдинг) і «Корпоративна війна». */

NAV.splice(NAV.findIndex((x) => x[0] === 'industry') + 1, 0, ['divisions', '🏢', 'Галузі']);
NAV.splice(NAV.findIndex((x) => x[0] === 'rivals') + 1, 0, ['corpwar', '🗡️', 'Корпоративна війна']);

Object.assign(VIEWS, {
  divisions() {
    const C = corpState(), tab = ['divs', 'pharma', 'space', 'holding'].includes(state.ui.tab) ? state.ui.tab : 'divs';
    const tot = sum(C.divs, (d) => (d.y ? d.y.p : 0));
    let html = `<h1>🏢 Галузі та міжнародний бізнес</h1><div class="kpis">${kpi('Підрозділів', C.divs.length)}${kpi('Прибуток підрозділів/день', money(tot), tot < 0 ? 'neg' : 'pos')}${kpi('Вартість', moneyK(divisionsValue()))}${kpi('Препаратів на ринку', C.drugs.filter((x) => x.approved).length)}${kpi('Супутників', C.sats.length)}</div>`
      + tabsHtml([['divs', 'Сервісні галузі'], ['pharma', '💊 Фарма R&D'], ['space', '🚀 Космос'], ['holding', '🏛️ Холдинг']], tab);
    if (tab === 'divs') {
      const cities = Object.keys(state.unlocked || { [state.city]: 1 });
      html += `<div class="card"><h3>Відкрити підрозділ</h3><div class="row wrap"><select id="dvInd">${Object.entries(INDUSTRIES).map(([k, I]) => `<option value="${k}">${I.icon} ${I.name} — від ${moneyK(I.setup * priceLvl())}</option>`).join('')}</select><select id="dvCity">${cities.map((c) => `<option value="${c}">${CITIES[c].name}</option>`).join('')}</select><button class="btn primary" data-act="dvOpen">Відкрити</button></div>
        <p class="muted">${Object.values(INDUSTRIES).map((I) => `${I.icon} <b>${I.name}</b>: ${I.desc}`).join('<br>')}<br>Нові заводи (газове родовище, цементний і фармацевтичний заводи) будуються в промислових районах на карті міста.</p></div>`;
      for (const d of C.divs) {
        const I = INDUSTRIES[d.ind], y = d.y || { rev: 0, cost: 0, p: 0 };
        const rivals = sectorRivals(I.sector);
        html += `<div class="card"><div class="row between"><b>${I.icon} ${I.name} · ${CITIES[d.city].name}</b><span class="tag">рівень ${d.level}</span></div>
          <div class="kpis">${kpi(I.unit[0].toUpperCase() + I.unit.slice(1), Math.round(d.cust).toLocaleString('uk-UA'), '', `місткість ${(I.cap * d.level).toLocaleString('uk-UA')}`)}${kpi('Частка ринку', pct(d.share, 0))}${kpi('Якість', Math.round(d.quality))}${kpi('Виручка/день', money(y.rev))}${kpi('Прибуток/день', money(y.p), y.p < 0 ? 'neg' : 'pos')}</div>
          ${spark(d.hist.map((h) => h.p), 160, 28)}
          <div class="row wrap"><span class="muted">Ціни:</span>${PRICE_IDX.map((v, i) => `<button class="chip ${d.price === i ? 'on' : ''}" data-act="dvSet" data-id="${d.id}" data-k="price" data-v="${i}">×${v}</button>`).join('')}</div>
          <div class="row wrap"><span class="muted">Сервіс:</span>${QUALITY_PLANS.map((Q, i) => `<button class="chip ${d.plan === i ? 'on' : ''}" data-act="dvSet" data-id="${d.id}" data-k="plan" data-v="${i}">${Q.name}</button>`).join('')}<span class="muted">Маркетинг:</span>${[0, 1, 2].map((v) => `<button class="chip ${d.mkt === v ? 'on' : ''}" data-act="dvSet" data-id="${d.id}" data-k="mkt" data-v="${v}">${['немає', 'активний', 'агресивний'][v]}</button>`).join('')}</div>
          <small class="muted">Конкуренти: ${rivals.map((c) => esc(c.name)).join(', ') || 'немає'}</small>
          <div class="row wrap" style="margin-top:6px"><button class="btn sm primary" ${d.level >= 5 ? 'disabled' : ''} data-act="dvUp" data-id="${d.id}">Розширити · ${moneyK(upgradeDivCost(d))}</button><button class="btn sm danger" data-act="dvSell" data-id="${d.id}">Продати · ${moneyK(divValue(d))}</button></div></div>`;
      }
      if (!C.divs.length) html += '<div class="card"><p class="muted">Підрозділів ще немає.</p></div>';
    } else if (tab === 'pharma') {
      if (!C.pharma) html += `<div class="card"><h3>Фармацевтичний дослідницький центр</h3><p class="muted">Розробка препаратів: доклінічні дослідження → три фази клінічних випробувань → реєстрація. Кожен етап коштує грошей і може провалитися. Схвалений препарат приносить дохід 2 роки під патентом, потім генерики знижують дохід на 80%. Препарат можна ліцензувати конкуренту за одноразову суму.</p><button class="btn primary" data-act="rxFound">Відкрити центр · ${moneyK(PHARMA_SETUP * priceLvl())}</button></div>`;
      else {
        html += `<div class="card"><div class="row between"><b>🧬 Дослідницький центр</b><span>Науковців: <button class="btn sm" data-act="rxSci" data-v="-10">−10</button> <b>${C.pharma.scientists}</b> <button class="btn sm" data-act="rxSci" data-v="10">+10</button></span></div><p class="muted">Зарплати науковців: ${money(C.pharma.scientists * 260 * wageLvl())}/день. Більше науковців — вищі шанси й більше паралельних проєктів (${2 + Math.floor(C.pharma.scientists / 30)}).</p>
          <div class="row wrap"><select id="rxArea">${Object.entries(DRUG_AREAS).map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select><button class="btn primary" data-act="rxStart">Почати розробку · ${moneyK(1e6 * priceLvl())}</button></div></div>`;
        html += `<div class="card stocklist">${C.drugs.length ? C.drugs.map((x) => { const P = PHASES_RX[x.stage]; return `<div class="stock"><div><b>💊 ${esc(x.name)}</b> <small class="muted">${DRUG_AREAS[x.area]}</small><br><small>${x.stage === 99 ? '<span class="neg">Провал випробувань</span>' : x.approved ? `${x.licensed ? `Ліцензовано «${esc(coName2(x.licensed))}»` : `На ринку · ${money(x.rev)}/день · патент до Д${x.patentUntil}`}${x.copied ? ` · <span class="neg">аналог від «${esc(coName2(x.copied))}»</span>` : ''}` : `${P.name}: ${x.day}/${P.days} дн. · шанс ≈${Math.round(P.p * 100)}% · ${money(P.cost * priceLvl())}/день`}</small></div><div class="px">${x.approved ? '' : bar(x.day, P ? P.days : 1)}</div><span></span>${x.approved && !x.licensed ? `<div class="trade"><button class="btn sm" data-act="rxLicense" data-id="${x.id}">Ліцензувати за ${moneyK(drugPeak(x) * 250)}</button>${x.copied ? `<button class="btn sm primary" data-act="cwSue" data-id="${x.copied}" data-v="patent">⚖️ Позов за патент</button>` : ''}</div>` : ''}</div>`; }).join('') : '<p class="muted">Проєктів немає.</p>'}</div>`;
      }
    } else if (tab === 'space') {
      if (!C.space) html += `<div class="card"><h3>Космічна програма</h3><p class="muted">Будуйте супутники (120 днів) і запускайте їх. Супутники зв’язку, спостереження й навігації приносять дохід ~4 роки та покращують якість вашого телекому. Надійність ракет зростає з досвідом. Можливі державні замовлення.</p><button class="btn primary" data-act="spFound">Запустити програму · ${moneyK(SPACE_SETUP * priceLvl())}</button></div>`;
      else {
        html += `<div class="kpis">${kpi('Надійність ракети', pct(C.space.rel, 0))}${kpi('Запусків', C.space.launches)}${kpi('Аварій', C.space.fails, C.space.fails ? 'neg' : '')}${kpi('Утримання', money(80000 * priceLvl()) + '/д')}</div>
          <div class="card"><h3>Збудувати супутник · ${moneyK(SAT_COST * priceLvl())}</h3><div class="row wrap"><button class="btn" data-act="spBuild" data-v="comm">📡 Зв’язок</button><button class="btn" data-act="spBuild" data-v="geo">🌍 Спостереження Землі</button><button class="btn" data-act="spBuild" data-v="nav">🧭 Навігація</button></div></div>
          <div class="card"><h3>У виробництві</h3>${C.builds.length ? C.builds.map((b) => `<div class="row between"><span>🛰️ ${b.kind === 'comm' ? 'Зв’язок' : b.kind === 'geo' ? 'Спостереження' : 'Навігація'} · ${b.ready > state.day ? `готовий у день ${b.ready}` : 'готовий до запуску'}</span>${b.ready <= state.day ? `<button class="btn sm primary" data-act="spLaunch" data-id="${b.id}">🚀 Запуск · ${moneyK(LAUNCH_COST * priceLvl())}</button>` : ''}</div>`).join('') : '<p class="muted">Немає.</p>'}</div>
          <div class="card"><h3>На орбіті</h3>${C.sats.length ? C.sats.map((s) => `<p>🛰️ ${s.kind === 'comm' ? 'Зв’язок' : s.kind === 'geo' ? 'Спостереження' : 'Навігація'} · з дня ${s.since} до ${s.until}</p>`).join('') : '<p class="muted">Немає.</p>'}</div>`;
      }
    } else {
      html += `<div class="card"><h3>Міжнародна холдингова структура</h3><p class="muted">Холдинг об’єднує ваші компанії в різних країнах. Поточна структура: <b>${C.holding ? HOLDINGS[C.holding].name : 'немає (усе на материнській компанії)'}</b>.</p>${Object.entries(HOLDINGS).map(([k, H]) => `<div class="stock"><div><b>${H.name}</b><br><small>${H.desc} Утримання ${money(H.daily * priceLvl())}/день.</small></div><div class="px"></div><span></span><div class="trade">${C.holding === k ? '<span class="tag good">діє</span>' : `<button class="btn sm primary" data-act="hdFound" data-v="${k}">Зареєструвати · ${moneyK(H.setup * priceLvl())}</button>`}</div></div>`).join('')}${C.holding ? '<button class="btn sm danger" data-act="hdFound" data-v="">Ліквідувати холдинг</button>' : ''}</div>`;
    }
    return html;
  },

  corpwar() {
    const W = warState(), tab = ['allies', 'cartels', 'spy', 'courts', 'attack'].includes(state.ui.tab) ? state.ui.tab : 'allies';
    const cos = aliveCos().filter((c) => !isSub(c)).sort((a, b) => (b.rivalry || 0) - (a.rivalry || 0));
    const opts = (sel) => cos.map((c) => `<option value="${c.id}" ${sel === c.id ? 'selected' : ''}>${esc(c.name)} · ${SECTORS[c.sector].name} · ворожнеча ${Math.round((c.rivalry || 0) * 100)}%</option>`).join('');
    let html = `<h1>🗡️ Корпоративна війна</h1><div class="kpis">${kpi('Союзників', W.alliances.length)}${kpi('Картелів з вами', W.cartels.filter((k) => k.members.includes('player')).length, W.cartels.some((k) => k.members.includes('player')) ? 'neg' : '')}${kpi('Позовів (активних)', W.suits.filter((s) => !s.outcome && (s.plaintiff === 'player' || s.defendant === 'player')).length)}${kpi('Блокад', W.blockades.length)}${kpi('Найворожчий', cos[0] && cos[0].rivalry > 0.05 ? esc(cos[0].name) : '—', 'neg', cos[0] && cos[0].rivalry > 0.05 ? Math.round(cos[0].rivalry * 100) + '%' : 'ворогів немає')}</div>`
      + tabsHtml([['allies', '🤝 Альянси'], ['cartels', '🤫 Картелі'], ['spy', '🕵️ Розвідка'], ['courts', '⚖️ Суди'], ['attack', '🚫 Блокади й біржа']], tab);
    if (tab === 'allies') {
      html += `<div class="card"><p class="muted">Союзник не воює з вами, ділиться технологіями (+очки досліджень щодня) і закупівлями. Внесок за вступ — 10 денних внесків, далі щоденна частка спільних проєктів. Ворожі й рейдерські компанії погоджуються рідко. ІІ-компанії теж утворюють альянси.</p><div class="row wrap"><select id="cwCo">${opts()}</select><button class="btn primary" data-act="cwAlly">Запропонувати альянс</button></div></div>
        <div class="card"><h3>Ваші союзники</h3>${W.alliances.length ? W.alliances.map((a) => { const co = coById(a.co); return `<div class="row between"><span>🤝 ${esc(co.name)} <small class="muted">з дня ${a.since} · ${money(allianceFee(co) * 0.05)}/день</small></span><button class="btn sm danger" data-act="cwBreak" data-id="${a.co}">Розірвати</button></div>`; }).join('') : '<p class="muted">Немає.</p>'}</div>
        <div class="card"><h3>Альянси конкурентів</h3>${W.aiAlliances.slice(-15).map((a) => `<p>${esc(coName2(a.a))} + ${esc(coName2(a.b))} <small class="muted">з дня ${a.since}</small></p>`).join('') || '<p class="muted">Немає.</p>'}</div>`;
    } else if (tab === 'cartels') {
      const mySectors = [...new Set([...state.biz.map((b) => b.type), ...corpState().divs.map((d) => INDUSTRIES[d.ind].sector)])].filter((s) => SECTORS[s]);
      html += `<div class="card warn"><p>⚠️ Картель — незаконна змова про ціни. Учасники отримують вищу маржу, але АМКУ може відкрити справу (штраф до 10% обороту). Програма поблажливості: якщо ви першим повідомите про картель, отримаєте імунітет, а інших учасників оштрафують.</p>
        ${mySectors.length ? `<div class="row wrap"><select id="cwSector">${mySectors.map((s) => `<option value="${s}">${SECTORS[s].name}</option>`).join('')}</select><button class="btn danger" data-act="cwCartel">Запропонувати змову</button></div>` : '<p class="muted">Потрібна присутність у галузі (магазини або підрозділи).</p>'}</div>
        <div class="card"><h3>Відомі картелі</h3>${W.cartels.length ? W.cartels.map((k) => `<div class="stock"><div><b>🤫 ${SECTORS[k.sector].name}</b>${k.caseId ? ` <span class="tag bad">справа ${k.caseId}</span>` : ''}<br><small>${k.members.includes('player') ? k.members.map(coName2).map(esc).join(', ') : 'учасники невідомі (є чутки)'} · з дня ${k.since}</small></div><div class="px"></div><span></span>${k.members.includes('player') ? `<div class="trade"><button class="btn sm" data-act="cwLeave" data-id="${k.id}" data-v="0">Вийти</button><button class="btn sm primary" data-act="cwLeave" data-id="${k.id}" data-v="1">Повідомити АМКУ (імунітет)</button></div>` : ''}</div>`).join('') : '<p class="muted">Немає.</p>'}</div>`;
    } else if (tab === 'spy') {
      html += `<div class="card"><p class="muted">Корпоративна розвідка — ризикована ігрова механіка. Успіх залежить від вашої служби безпеки (розділ «Безпека») і захисту цілі. Якщо операцію викрито — позов, удар по репутації, можлива кримінальна справа. Конкуренти так само шпигують за вами; служба безпеки допомагає їх викрити.</p>
        <div class="row wrap"><select id="cwSpyCo">${opts()}</select><select id="cwGoal">${Object.entries(SPY_GOALS).map(([k, G]) => `<option value="${k}">${G.icon} ${G.name} — ${moneyK(G.cost * priceLvl())}</option>`).join('')}</select><button class="btn danger" data-act="cwSpy">Провести операцію</button></div></div>
        <div class="card"><h3>Розвідувальні дані</h3>${Object.keys(W.intel).length ? Object.entries(W.intel).map(([id, i]) => `<p><b>${esc(coName2(id))}</b> <small class="muted">дані на день ${i.day}</small><br><small>Стратегія: ${STRATS[i.strat] ? STRATS[i.strat].name : i.strat} · каса ${moneyK(i.cash)} · борг ${moneyK(i.debt)} · технології ${i.tech} · ворожнеча ${Math.round((i.rivalry || 0) * 100)}%${i.plan ? '<br>Останній крок: ' + esc(i.plan) : ''}</small></p>`).join('') : '<p class="muted">Немає даних.</p>'}</div>
        <div class="card"><h3>Інциденти</h3><ul class="log">${W.incidents.slice(0, 20).map((i) => `<li><small>Д${i.day}</small> ${esc(i.text)}${i.by ? ` <button class="btn sm" data-act="cwSue" data-id="${i.by}" data-v="espionage">⚖️ Позов</button>` : ''}</li>`).join('') || '<li class="muted">Немає.</li>'}</ul></div>`;
    } else if (tab === 'courts') {
      html += `<div class="card"><h3>Подати позов</h3><div class="row wrap"><select id="cwSueCo">${opts(state.ui.sueCo)}</select><select id="cwSueType">${Object.entries(SUIT_TYPES).map(([k, T]) => `<option value="${k}">${T.name}</option>`).join('')}</select><button class="btn primary" data-act="cwSueSel">Подати</button></div>
        <p class="muted">Шанс залежить від підстав (позов із доказами набагато сильніший), ваших юристів і незалежного суду. Програш — відшкодування судових витрат відповідачу. Підстави з’являються, коли конкурент копіює ваш патент, шпигує, веде проти вас медіакампанії чи цінову війну.</p></div>
        <div class="card"><h3>Справи</h3>${W.suits.length ? W.suits.slice(0, 30).map((s) => `<div class="stock"><div><b>${s.id}</b> · ${esc(coName2(s.plaintiff))} → ${esc(coName2(s.defendant))}${s.plaintiff === 'player' || s.defendant === 'player' ? ' <span class="tag">ви</span>' : ''}<br><small>${SUIT_TYPES[s.type].name} · ${moneyK(s.claim)}${s.grounded ? ' · є докази' : ''}</small></div><div class="px"><small>${s.outcome ? esc(s.outcome) : 'рішення ≈ Д' + s.decide}</small></div></div>`).join('') : '<p class="muted">Справ немає.</p>'}</div>`;
    } else {
      html += `<div class="card"><h3>🚫 Економічна блокада</h3><p class="muted">Разом із союзниками й власними заводами перекрити конкуренту постачання на 30 днів (його продажі падають). Потрібно ≥3 заводи або союзники. Ризик справи АМКУ про обмеження доступу до постачання.</p><div class="row wrap"><select id="cwBlkCo">${opts()}</select><button class="btn danger" data-act="cwBlock">Блокада · ${moneyK(5e5 * priceLvl())}</button></div>
        ${W.blockades.length ? W.blockades.map((b) => `<p>🚫 ${esc(coName2(b.target))}: −${Math.round(b.power * 100)}% продажів до дня ${b.until}</p>`).join('') : ''}</div>
        <div class="card"><h3>📉 Біржова атака (короткий продаж)</h3><p class="muted">Позичити й продати акції конкурента: курс падає, через 10 днів позиція закривається за ринковою ціною. Здешевлює подальше поглинання. Великі атаки привертають увагу фінрегулятора (справа про маніпулювання).</p><div class="row wrap"><select id="cwShortCo">${cos.map((c) => `<option value="${c.id}">${esc(c.name)} · капіталізація ${moneyK(c.price * c.shares)}</option>`).join('')}</select>${[1e6, 5e6, 2e7].map((v) => `<button class="btn sm danger" data-act="cwShort" data-v="${v}">${moneyK(v * priceLvl())}</button>`).join('')}</div>
        ${W.shorts.length ? W.shorts.map((s) => { const co = coById(s.co); return `<p>📉 ${esc(co.name)}: позиція ${moneyK(s.amount)}, вхід ${s.entry.toFixed(2)} → зараз ${co.price.toFixed(2)} · закриття в день ${s.until}</p>`; }).join('') : ''}</div>`;
    }
    return html;
  },
});

Object.assign(ACT, {
  dvOpen: () => openDivision(askVal('dvInd'), askVal('dvCity')),
  dvSet: (d) => { const x = divById(d.id); if (x) x[d.k] = +d.v; },
  dvUp: (d) => upgradeDivision(d.id),
  dvSell: (d) => confirmBox('Продати підрозділ?', () => sellDivision(d.id)),
  rxFound: () => foundPharma(), rxStart: () => startDrug(askVal('rxArea')), rxSci: (d) => hireScientists(+d.v), rxLicense: (d) => licenseDrug(d.id),
  spFound: () => foundSpace(), spBuild: (d) => buildSatellite(d.v), spLaunch: (d) => launch(d.id),
  hdFound: (d) => foundHolding(d.v || null),
  cwAlly: () => proposeAlliance(askVal('cwCo')), cwBreak: (d) => breakAlliance(d.id),
  cwCartel: () => confirmBox('Запропонувати конкурентам незаконну змову про ціни? Ризик штрафу АМКУ.', () => proposeCartel(askVal('cwSector'))),
  cwLeave: (d) => leaveCartel(+d.id, d.v === '1'),
  cwSpy: () => { const id = askVal('cwSpyCo'), g = askVal('cwGoal'); confirmBox(`Провести операцію «${SPY_GOALS[g].name}»? Ризик викриття ${Math.round(SPY_GOALS[g].risk * 100)}%+.`, () => spy(id, g)); },
  cwSue: (d) => { state.ui.view = 'corpwar'; state.ui.tab = 'courts'; state.ui.sueCo = d.id; sue(d.id, d.v); },
  cwSueSel: () => sue(askVal('cwSueCo'), askVal('cwSueType')),
  cwBlock: () => blockade(askVal('cwBlkCo')),
  cwShort: (d) => shortAttack(askVal('cwShortCo'), +d.v * priceLvl()),
});
