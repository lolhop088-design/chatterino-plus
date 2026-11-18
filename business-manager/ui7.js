'use strict';
/* БІЗНЕС ІМПЕРІЯ — штаб-квартира 2.0: детальні доручення, структура групи (дочірні компанії), звіти. */

const _hqOld = VIEWS.hq;
VIEWS.hq = function () {
  const H = hqState();
  if (!H.founded) return _hqOld();
  const tab = ['dir', 'group', 'report'].includes(state.ui.tab) ? state.ui.tab : 'dir';
  const G = groupState();
  const active = Object.keys(DIRECTIVES).filter((k) => H.on[k]);
  let html = `<h1>🏛️ Штаб-квартира</h1><div class="kpis">${kpi('Активних доручень', active.length + '/' + Object.keys(DIRECTIVES).length)}${kpi('Зарплати директорів', money(sum(active, directiveSalary)) + '/день')}${kpi('Дочірніх компаній', G.subs.length)}${kpi('Резерв готівки', H.opts.reserve ? moneyK(H.opts.reserve * priceLvl()) : 'немає')}${kpi('Доступно директорам', moneyK(freeCash()))}</div>`
    + tabsHtml([['dir', '📋 Доручення'], ['group', '🏢 Структура групи'], ['report', '📊 Звіти']], tab);
  const O = H.opts;
  const chips = (opt, list, fmt) => `<div class="chips">${list.map((v) => `<button class="chip ${O[opt] === v ? 'on' : ''}" data-act="hqOpt2" data-k="${opt}" data-v="${typeof v === 'boolean' ? (v ? 'true' : 'false') : v}">${fmt(v)}</button>`).join('')}</div>`;
  const yn = (v) => (v ? 'так' : 'ні');
  const lbl = (t) => `<small class="muted">${t}</small>`;
  if (tab === 'dir') {
    const unlocked = Object.keys(state.unlocked || {});
    const OPTS = {
      production: lbl('Ремонт, коли стан нижче:') + chips('repairAt', [50, 70, 85], (v) => v + '%') + lbl('Модернізувати заводи до рівня:') + chips('maxLevel', [1, 2, 3, 5], (v) => (v === 1 ? 'не модернізувати' : v)) + lbl('Перемикати на найприбутковішу продукцію:') + chips('prodSwitch', [true, false], yn),
      retail: lbl('Цінова політика мережі:') + chips('retailMode', Object.keys(PRICE_MODES), (v) => PRICE_MODES[v].name) + lbl('Реклама в прибуткових магазинах:') + chips('ads', [true, false], yn) + lbl('Оновлювати інтер’єр при низькій репутації:') + chips('interior', [true, false], yn),
      expansion: lbl('Бюджет на одне відкриття (частка вільної готівки):') + chips('expansionBudget', [0.05, 0.1, 0.2, 0.4], (v) => Math.round(v * 100) + '%') + lbl('Як часто відкривати:') + chips('expandEvery', [1, 3, 7, 14], (v) => `раз на ${v} дн.`) + lbl('Формат:') + `<div class="chips"><button class="chip ${O.expandType === 'all' ? 'on' : ''}" data-act="hqOpt2" data-k="expandType" data-v="all">будь-який</button>${Object.entries(TYPES).filter(([, T]) => !T.dynamic).map(([k, T]) => `<button class="chip ${O.expandType === k ? 'on' : ''}" data-act="hqOpt2" data-k="expandType" data-v="${k}">${T.name}</button>`).join('')}</div>` + lbl('Місто:') + `<div class="chips"><button class="chip ${O.expandCity === 'all' ? 'on' : ''}" data-act="hqOpt2" data-k="expandCity" data-v="all">усі відкриті</button>${unlocked.map((c) => `<button class="chip ${O.expandCity === c ? 'on' : ''}" data-act="hqOpt2" data-k="expandCity" data-v="${c}">${CITIES[c].name}</button>`).join('')}</div>` + lbl('Не перевищувати частку ринку (антимонопольний ліміт):') + chips('shareCap', [0.25, 0.35, 0.45, 1], (v) => (v === 1 ? 'без ліміту' : Math.round(v * 100) + '%')),
      finance: lbl('Незнижуваний резерв готівки (директори його не витрачають):') + chips('reserve', [0, 1e5, 1e6, 1e7, 1e8], (v) => (v ? moneyK(v * priceLvl()) : 'немає')) + lbl('Гасити кредит, коли вільної готівки більше за борг у:') + chips('repayMult', [1.5, 3, 6], (v) => '×' + v) + lbl('Брати кредит при касовому розриві:') + chips('autoLoan', [true, false], yn),
      hr: lbl('Зарплатна політика:') + chips('wagePolicy', [0.95, 1, 1.1, 1.25], (v) => (v < 1 ? 'економна (−5%)' : v === 1 ? 'ринкова' : `+${Math.round((v - 1) * 100)}% до ринку`)) + lbl('Піднімати ставку, якщо мораль нижче:') + chips('moraleAt', [30, 45, 60], (v) => v) + lbl('Закривати вакансії через кадрове агентство:') + chips('hrAgency', [true, false], yn),
      ma: lbl('Бюджет на поглинання (частка вільної готівки):') + chips('maBudget', [0.1, 0.25, 0.5], (v) => Math.round(v * 100) + '%') + lbl('Кого купувати:') + chips('maSector', ['own', 'any'], (v) => (v === 'own' ? 'лише у ваших галузях' : 'будь-кого')),
      compliance: lbl('Ліміт частки для розширення (спільний із директором з розвитку):') + chips('shareCap', [0.25, 0.35, 0.45], (v) => Math.round(v * 100) + '%') + (H.risk && H.risk.length ? `<small>Ризикові ринки: ${H.risk.slice(0, 5).map((r) => `${marketName(r.key)} ${Math.round(r.share * 100)}%`).join(' · ')}</small>` : ''),
    };
    html += `<div class="card"><p class="muted">Об’єкти дочірніх компаній, у яких є CEO, керує їхній CEO — штаб їх не чіпає (налаштування — на вкладці «Структура групи»).</p></div><div class="cards">`;
    for (const [k, D] of Object.entries(DIRECTIVES)) {
      const on = !!H.on[k];
      html += `<div class="card camp ${on ? 'on' : ''}" style="display:block"><div class="row between"><b>${D.icon} ${D.name}</b><button class="btn sm ${on ? 'danger' : 'primary'}" data-act="hqToggle" data-k="${k}">${on ? 'Скасувати' : 'Доручити'}</button></div>
        <small class="muted">${D.exec} · ${money(directiveSalary(k))}/день${H.stats[k] ? ` · працює ${H.stats[k]} дн.` : ''}</small><p style="margin:6px 0">${D.desc}</p>${OPTS[k] || ''}${H.last[k] ? `<small class="pos">${esc(H.last[k])}</small>` : on ? '<small class="muted">Звіт з’явиться після закриття дня.</small>' : ''}</div>`;
    }
    html += '</div>';
  } else if (tab === 'group') {
    html += `<div class="card"><h3>🏛️ ${esc(state.company)} — материнська компанія</h3><p class="muted">Розділіть бізнес на дочірні компанії за напрямами: одна керує електронікою, інша — кав’ярнями тощо. Кожна має свого CEO, бюджет розвитку й правила.</p>
      <div class="card warn" style="margin:8px 0"><b>Як це працює з АМКУ</b><p style="margin:4px 0">Регулятор рахує частку ринку для всієї групи під вашим контролем (понад 50%) — так само, як для ІІ-корпорацій, тож просто перейменувати бізнес у «різні фірми» недостатньо. Але структура групи реально зменшує претензії й наслідки:</p>
        <ul style="margin:0;padding-left:18px"><li>штраф рахується від обороту <b>дочірньої</b> компанії (+15%), а не всієї групи;</li><li>історія порушень окрема — повторні порушення однієї «дочки» не роблять рецидивістом усю групу;</li><li>примусовий поділ зачіпає лише ту дочірню, яка порушила;</li><li>комплаєнс-офіцер дочірньої: справи −45%, докази −12, штраф −20%; обережний CEO — ще менше ризику, агресивний — більше;</li><li><b>виділення (spin-off)</b> — продаж контролю: активи стають окремою компанією на біржі й більше не рахуються у вашу частку.</li></ul></div>
      <div class="row wrap"><select id="subSeg">${Object.entries(SEGS).filter(([k]) => !G.subs.some((s) => s.seg === k)).map(([k, S]) => `<option value="${k}">${S.icon} ${S.name}</option>`).join('')}</select><input id="subName" placeholder="Назва дочірньої" maxlength="30"><button class="btn primary" data-act="subFound">Заснувати · ${moneyK(SUB_SETUP * priceLvl())}</button></div></div>`;
    const direct = [...state.biz, ...state.fac].filter((u) => !subOfUnit(u));
    html += `<div class="card"><b>Під прямим управлінням материнської:</b> ${direct.length} об’єктів${direct.length ? ` <small class="muted">(${[...new Set(direct.map((u) => (u.kind ? FACILITIES[u.kind].name : TYPES[u.type].name)))].join(', ')})</small>` : ''}</div>`;
    for (const s of G.subs) {
      const S = SEGS[s.seg], us = subUnits(s), P = s.hist.length ? s.hist[s.hist.length - 1] : { rev: 0, p: 0 };
      const p30 = sum(s.hist.slice(-30), (h) => h.p);
      html += `<div class="card"><div class="row between"><b>${S.icon} ${esc(s.name)}</b><span class="tag">${S.name}${s.float ? ` · у вільному обігу ${Math.round(s.float * 100)}%` : ''}${s.violations ? ` · порушень ${s.violations}` : ''}</span></div>
        <div class="kpis">${kpi('Об’єктів', us.length)}${kpi('Виручка/день', money(P.rev))}${kpi('Прибуток/день', money(P.p), P.p < 0 ? 'neg' : 'pos')}${kpi('Прибуток 30 дн.', moneyK(p30), p30 < 0 ? 'neg' : 'pos')}${kpi('Оцінка', moneyK(subValue(s)))}</div>${spark(s.hist.map((h) => h.p), 160, 26)}`;
      if (s.ceo) html += `<div class="row lifehead" style="gap:10px;margin:6px 0">${s.ceo.look ? avatarSVG(s.ceo.look, 40) : ''}<div><b>CEO: ${esc(s.ceo.name)}</b> · навички ${'★'.repeat(s.ceo.skill)}${'☆'.repeat(5 - s.ceo.skill)} · ${CEO_STYLES[s.ceo.style].name}<br><small class="muted">${CEO_STYLES[s.ceo.style].desc} · ${money(ceoSalary(s.ceo))}/день · +${Math.round(s.ceo.skill * 1.5)}% ефективності об’єктів</small></div><button class="btn sm danger" data-act="subFire" data-id="${s.id}">Звільнити</button></div>`;
      else html += `<div style="margin:6px 0"><b>CEO не призначено</b> — об’єктами керує штаб або ви. Кандидати (оновлюються щомісяця):<div class="row wrap" style="margin-top:4px">${G.ceoPool.map((c) => `<button class="btn sm" data-act="subHire" data-id="${s.id}" data-c="${c.id}">${esc(c.name)} · ${'★'.repeat(c.skill)} · ${CEO_STYLES[c.style].name} · ${money(ceoSalary(c))}/д</button>`).join('') || '<span class="muted">немає</span>'}</div></div>`;
      const so = (opt, list, fmt) => `<div class="chips">${list.map((v) => `<button class="chip ${s.opts[opt] === v ? 'on' : ''}" data-act="subOpt" data-id="${s.id}" data-k="${opt}" data-v="${typeof v === 'boolean' ? (v ? 'true' : 'false') : v}">${fmt(v)}</button>`).join('')}</div>`;
      if (s.ceo) html += `<div class="grid2"><div>${lbl('Ціни:')}${so('price', Object.keys(PRICE_MODES), (v) => PRICE_MODES[v].name)}${lbl('Добирати персонал:')}${so('staff', [true, false], yn)}${lbl('Ремонти / модернізація:')}${so('repair', [true, false], yn)}${so('upgrade', [true, false], (v) => (v ? 'модернізувати' : 'без модернізації'))}</div>
        <div>${lbl('Реклама:')}${so('ads', [true, false], yn)}${S.types.length ? lbl('Розширюватися (відкривати нові точки):') + so('expand', [true, false], yn) + lbl('Ліміт частки ринку:') + so('shareCap', [0.25, 0.35, 0.45, 0.6], (v) => Math.round(v * 100) + '%') : ''}
          ${lbl(`Бюджет розвитку: використано ${moneyK(s.spent)} з ${moneyK(s.budget)}`)}<div class="chips">${[1e5, 1e6, 1e7].map((v) => `<button class="chip" data-act="subBudget" data-id="${s.id}" data-v="${v}">+${moneyK(v * priceLvl())}</button>`).join('')}</div></div></div>`;
      html += `<div class="row wrap" style="margin-top:6px"><label class="switch"><input type="checkbox" data-change="subComp" data-id="${s.id}" ${s.compliance ? 'checked' : ''}> ⚖️ Комплаєнс-офіцер (${money(2500 * priceLvl())}/д)</label></div>
        <div class="row wrap" style="margin-top:6px"><button class="btn sm" data-act="subFloat" data-id="${s.id}" data-v="0.2" ${s.float + 0.2 > 0.49 ? 'disabled' : ''}>🔔 IPO 20% · ≈${moneyK(subValue(s) * 0.2 * 0.95)}</button><button class="btn sm danger" data-act="subSpin" data-id="${s.id}">✂️ Виділити (продати контроль) · ≈${moneyK(subValue(s) * (0.6 - s.float) * 0.95)} + 40% акцій</button><button class="btn sm" data-act="subDissolve" data-id="${s.id}">Ліквідувати</button></div>
        ${s.log.length ? `<ul class="log" style="margin-top:6px">${s.log.slice(0, 5).map((l) => `<li><small>Д${l.day}</small> ${esc(l.text)}</li>`).join('')}</ul>` : ''}</div>`;
    }
  } else {
    const G2 = govState(), shares = marketShares();
    const mine = Object.values(shares).map((M) => ({ M, s: (M.by.player || 0) / M.total })).filter((x) => x.s > 0 && x.M.n >= 3).sort((a, b) => b.s - a.s);
    html += `<div class="card"><h3>Консолідований звіт за напрямами (учора)</h3><div class="table-wrap"><table><thead><tr><th>Підрозділ</th><th>Об’єктів</th><th>Виручка</th><th>Прибуток</th><th>Порушень</th></tr></thead><tbody>${G.subs.map((s) => { const P = s.hist[s.hist.length - 1] || { rev: 0, p: 0 }; return `<tr><td>${SEGS[s.seg].icon} ${esc(s.name)}</td><td>${subUnits(s).length}</td><td>${money(P.rev)}</td><td class="${P.p < 0 ? 'neg' : 'pos'}">${money(P.p)}</td><td>${s.violations}</td></tr>`; }).join('')}${(() => { const d = [...state.biz, ...state.fac].filter((u) => !subOfUnit(u)); const r = sum(d, (u) => unitPL(u).rev), p = sum(d, (u) => unitPL(u).p); return `<tr><td>🏛️ Материнська (пряме управління)</td><td>${d.length}</td><td>${money(r)}</td><td class="${p < 0 ? 'neg' : 'pos'}">${money(p)}</td><td>${G2.violations.player || 0}</td></tr>`; })()}</tbody></table></div></div>
      <div class="card"><h3>Антимонопольна карта ризиків</h3>${mine.length ? mine.slice(0, 20).map(({ M, s }) => { const sb = subOfType(M.type); const L = shareLevel(s); return `<div class="segrow"><span>${marketName(M.key)}</span><div class="segbar"><i style="width:${Math.round(s * 100)}%;background:${s >= 0.6 ? 'var(--bad)' : s >= 0.4 ? 'var(--mid)' : 'var(--good)'}"></i></div><b class="${L[2]}">${Math.round(s * 100)}%</b></div><small class="muted">${L[1]}${sb ? ` · ${esc(sb.name)}${sb.compliance ? ' · комплаєнс' : ''}` : ' · материнська'}</small>`; }).join('') : '<p class="muted">Ваших ринків із 3+ точками ще немає.</p>'}</div>
      <div class="card"><h3>Журнал штабу</h3><ul class="log">${H.log.slice(0, 40).map((l) => `<li><small>Д${l.day}</small> ${DIRECTIVES[l.key] ? DIRECTIVES[l.key].icon : ''} ${esc(l.text)}</li>`).join('') || '<li class="muted">Поки порожньо.</li>'}</ul></div>`;
  }
  return html;
};

Object.assign(ACT, {
  hqOpt2: (d) => { const H = hqState(); H.opts[d.k] = d.v === 'true' ? true : d.v === 'false' ? false : isNaN(+d.v) ? d.v : +d.v; },
  subFound: () => foundSub(askVal('subSeg'), askVal('subName').trim()),
  subHire: (d) => hireCEO(d.id, d.c), subFire: (d) => confirmBox('Звільнити CEO? Вихідна допомога — 30 денних зарплат.', () => fireCEO(d.id)),
  subOpt: (d) => { const s = subById(d.id); if (s) s.opts[d.k] = d.v === 'true' ? true : d.v === 'false' ? false : isNaN(+d.v) ? d.v : +d.v; },
  subBudget: (d) => { const s = subById(d.id); if (s) { s.budget += +d.v * priceLvl(); log(`💼 «${s.name}»: бюджет розвитку збільшено до ${moneyK(s.budget)}.`); } },
  subFloat: (d) => confirmBox('Продати 20% дочірньої інвесторам? Контроль зберігається, але 20% її прибутку щодня йтиме міноритаріям.', () => floatSub(d.id, +d.v)),
  subSpin: (d) => confirmBox('Виділити дочірню в незалежну компанію? Ви втратите контроль над її об’єктами, отримаєте гроші й 40% її акцій. Її частка ринку більше не рахуватиметься вашою.', () => spinOff(d.id, false)),
  subDissolve: (d) => confirmBox('Ліквідувати дочірню? Об’єкти повернуться під пряме управління.', () => dissolveSub(d.id)),
});
Object.assign(CHANGE, { subComp: (el) => { const s = subById(el.dataset.id); if (s) s.compliance = el.checked; } });
