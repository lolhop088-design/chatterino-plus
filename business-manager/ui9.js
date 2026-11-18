'use strict';
/* БІЗНЕС ІМПЕРІЯ — «Фінансовий центр» (оновлення 3) і корпоративні доповнення штабу (оновлення 2). */

NAV.splice(NAV.findIndex((x) => x[0] === 'bank') + 1, 0, ['fincenter', '💳', 'Фінансовий центр']);
if (typeof NAV_GROUPS !== 'undefined') NAV_GROUPS[1][1].splice(1, 0, 'fincenter');
if (typeof HOME_CATS !== 'undefined') HOME_CATS.find((c) => c.k === 'economy').views.splice(1, 0, 'fincenter');
if (typeof VIEW_DESC !== 'undefined') VIEW_DESC.fincenter = 'рейтинг, кредити, облігації, фонди, дивіденди';
if (typeof VIEW_CAT !== 'undefined') VIEW_CAT.fincenter = 'economy';

const ratingCls = (r) => (['AAA', 'AA', 'A'].includes(r) ? 'pos' : ['BBB', 'BB'].includes(r) ? '' : 'neg');
VIEWS.fincenter = function () {
  const F = finState(), tab = ['rating', 'loans', 'bonds', 'funds', 'div'].includes(state.ui.tab) ? state.ui.tab : 'rating';
  const fx = creditFactors(), r = rating();
  const totalDebt = debt() + bondsDebt();
  let html = `<h1>💳 Фінансовий центр</h1><div class="kpis">${kpi('Кредитний рейтинг', r, ratingCls(r), `${Math.round(state.me.credit)} балів`)}${kpi('Борг усього', moneyK(totalDebt), totalDebt ? 'neg' : '', `кредити ${moneyK(debt())} · облігації ${moneyK(bondsDebt())}`)}${kpi('Боргове навантаження', netWorth() <= 0 ? 'капітал ≤ 0' : fx.lev > 99 ? '>99×' : fx.lev.toFixed(2) + '×', fx.lev > 2 ? 'neg' : fx.lev > 1 ? '' : 'pos', 'борг / капітал')}${kpi('Покриття відсотків', fx.cover > 50 ? '∞' : fx.cover.toFixed(1) + '×', fx.cover < 1.5 ? 'neg' : 'pos', 'прибуток / відсотки')}${kpi('Інвестиції', moneyK(fundsValue() + bondsValue()))}</div>`
    + (F.crisis ? '<div class="card warn"><b>🔥 Боргова криза</b><p>Ставки за новими кредитами +4 п.п., облігації дорожчі, банки скоротили строки кредитних ліній. Зменште борг нижче 1,5× капіталу.</p></div>' : '')
    + (F.defaultDay && state.day - F.defaultDay < 180 ? `<div class="card warn"><b>💥 Після дефолту</b><p>Нові кредити недоступні до дня ${F.defaultDay + 180}. Борг реструктуризовано.</p></div>` : '')
    + tabsHtml([['rating', '📊 Рейтинг'], ['loans', '🏦 Кредити'], ['bonds', '🧾 Облігації'], ['funds', '📈 Фонди'], ['div', '💰 Дивіденди й податки']], tab);
  if (tab === 'rating') {
    const h = F.hist.slice(-120);
    html += `<div class="grid2">${chartBox('chRating', [{ data: h.map((x) => x.r), color: '#2f6fd6', name: 'Кредитний бал' }], h.map((x) => String(x.d)), 'Динаміка рейтингу', (v) => Math.round(v))}
      <div class="card"><h3>Що впливає на рейтинг</h3><table class="pl"><tr><td>Борг / капітал</td><td class="${fx.lev > 1.5 ? 'neg' : 'pos'}">${fx.lev > 99 ? '>99' : fx.lev.toFixed(2)}× ${fx.lev > 1.5 ? '— забагато' : '— норма'}</td></tr><tr><td>Покриття відсотків прибутком</td><td class="${fx.cover < 2 ? 'neg' : 'pos'}">${fx.cover > 50 ? 'відсотків немає' : fx.cover.toFixed(1) + '×'}</td></tr><tr><td>Прострочені платежі</td><td class="${F.missed > 1 ? 'neg' : 'pos'}">${F.missed.toFixed(1)}</td></tr><tr><td>Дефолт за останній рік</td><td class="${fx.def ? 'neg' : 'pos'}">${fx.def ? 'так' : 'ні'}</td></tr></table>
      <p class="muted">Шкала: ${RATINGS.map(([n, t]) => `${n} ≥${t}`).join(' · ')}. Рейтинг визначає ставки кредитів, купон облігацій і доступ до інвестиційних кредитів. Надмірний борг (понад 2× капіталу) при слабкому покритті може спричинити боргову кризу; якщо грошей зовсім не вистачить — дефолт: продаж активів і реструктуризація.</p></div></div>`;
  } else if (tab === 'loans') {
    html += `<div class="cards">${Object.entries(LOAN_TYPES).map(([k, T]) => `<div class="card" style="display:block"><b>${T.icon} ${T.name}</b><p style="margin:4px 0">${T.desc}</p><small class="muted">Ставка ${loanRate(k).toFixed(1)}% · строк ${T.term} дн. · доступно ${moneyK(loanLimit(k))}${T.minRating ? ` · рейтинг від ${T.minRating}` : ''}</small><div class="row wrap" style="margin-top:6px">${[0.1, 0.25, 0.5, 1].map((p) => { const a = Math.round(loanLimit(k) * p); return a > 0 ? `<button class="btn sm primary" data-act="fnLoan" data-k="${k}" data-v="${a}">${moneyK(a)}</button>` : ''; }).join('')}</div></div>`).join('')}</div>
      <div class="card"><h3>Ваші кредити</h3>${state.loans.length ? state.loans.map((l) => { const T = LOAN_TYPES[l.type] || { name: l.prop ? 'Іпотека' : 'Кредит', icon: '🏦' }; return `<div class="stock"><div><b>${T.icon} ${T.name}${l.restructured ? ' <span class="tag bad">реструктуризований</span>' : ''}</b><br><small>${(l.apr || l.rate * 36500).toFixed(1)}% річних${l.due ? ` · до дня ${l.due}` : ''} · відсотки ${money(l.amount * l.rate)}/день</small></div><div class="px">${moneyK(l.amount)}</div><span></span><div class="trade"><button class="btn sm" data-act="repayPart" data-id="${l.id}">Погасити 25%</button><button class="btn sm primary" ${state.cash < l.amount ? 'disabled' : ''} data-act="repay" data-id="${l.id}">Погасити все</button></div></div>`; }).join('') : '<p class="muted">Кредитів немає.</p>'}</div>`;
  } else if (tab === 'bonds') {
    const cap = Math.max(0, netWorth() * 0.6 - debt() - bondsDebt());
    html += `<div class="card"><h3>Випустити облігації ${state.company}</h3><p class="muted">Купон залежить від ставки ЦБ, вашого рейтингу (${r}) і строку. Купони щодня, тіло — в кінці строку. Ринок готовий викупити до ${moneyK(cap)}.</p>${[180, 365, 720].map((t) => `<div class="row wrap" style="margin:4px 0"><span>${t} дн. · купон <b>${bondCoupon(t)}%</b>:</span>${[0.1, 0.3, 0.6].map((p) => { const a = Math.round(cap * p); return a > 1000 ? `<button class="btn sm primary" data-act="fnIssue" data-t="${t}" data-v="${a}">${moneyK(a)}</button>` : ''; }).join('')}</div>`).join('')}
        ${F.bonds.length ? `<h3>Ваші випуски</h3>${F.bonds.map((b) => `<div class="row between"><span>🧾 ${b.id}: ${moneyK(b.amount)} · ${b.coupon}% · до дня ${b.due}</span><button class="btn sm" data-act="fnBuyback" data-id="${b.id}">Викупити</button></div>`).join('')}` : ''}</div>
      <div class="card"><h3>Купити облігації</h3><p class="muted">Державні — без ризику. Корпоративні — вища дохідність, але якщо емітент збанкрутує, повернеться лише 30%. Строк 365 днів.</p>${bondMarket().map((b) => `<div class="stock"><div><b>${esc(b.name)}</b><br><small>дохідність ${b.yield}% · ризик ${b.risk ? pct(b.risk, 0) : 'мінімальний'}</small></div><div class="px"></div><span></span><div class="trade">${[1e5, 1e6, 1e7].map((v) => `<button class="btn sm" ${state.cash < v * priceLvl() ? 'disabled' : ''} data-act="fnBuyBond" data-id="${b.id}" data-v="${v}">${moneyK(v * priceLvl())}</button>`).join('')}</div></div>`).join('')}
        ${F.myBonds.length ? `<h3>Ваш портфель облігацій</h3>${F.myBonds.map((b) => `<div class="row between"><span>${esc(b.name)}: ${moneyK(b.amount)} · ${b.yield}% · до дня ${b.due}</span><button class="btn sm" data-act="fnSellBond" data-id="${b.id}">Продати</button></div>`).join('')}` : ''}</div>`;
  } else if (tab === 'funds') {
    html += `<div class="card"><p class="muted">Пасивні інвестиції без управління: вартість паю (NAV) змінюється щодня з ринком. Комісія фонду вже врахована.</p></div>${Object.entries(FUNDS).map(([k, Fd]) => { const h = F.funds[k], v = fundValue(k); return `<div class="card"><div class="row between"><b>${Fd.icon} ${Fd.name}</b><span>пай ${F.nav[k].toFixed(2)}</span></div><small class="muted">${Fd.desc} Комісія ${pct(Fd.fee, 1)}/рік.</small>${h ? `<p>У вас: <b>${moneyK(v)}</b> <span class="${v >= h.cost ? 'pos' : 'neg'}">(${v >= h.cost ? '+' : ''}${moneyK(v - h.cost)})</span></p>` : ''}<div class="row wrap">${[1e5, 1e6, 1e7, 1e8].map((a) => `<button class="btn sm primary" ${state.cash < a * priceLvl() ? 'disabled' : ''} data-act="fnFund" data-k="${k}" data-v="${a}">+${moneyK(a * priceLvl())}</button>`).join('')}${h ? `<button class="btn sm danger" data-act="fnRedeem" data-k="${k}">Погасити паї</button>` : ''}</div></div>`; }).join('')}`;
  } else {
    html += `<div class="card"><h3>💰 Дивідендна політика</h3>${state.ipo ? `<p class="muted">Частка прибутку, що виплачується акціонерам (вашої частки це не стосується — ви й так власник). Вищі дивіденди підтримують курс акцій, але зменшують гроші на розвиток. У вільному обігу ${pct(state.ipo.float, 0)}.</p><div class="chips">${[0, 0.1, 0.25, 0.5].map((p) => `<button class="chip ${F.payout === p ? 'on' : ''}" data-act="fnPayout" data-v="${p}">${p ? Math.round(p * 100) + '% прибутку' : 'без дивідендів'}</button>`).join('')}</div>` : '<p class="muted">Дивідендна політика з’явиться після IPO вашої компанії (розділ «Біржа»).</p>'}<p class="muted">Ви отримуєте дивіденди з акцій інших компаній і від дочірніх компаній автоматично (рядок «Дивіденди» у звіті).</p></div>
      <div class="card"><h3>🧾 Податкові перевірки</h3><p class="muted">Ризик перевірки залежить від суворості податкової, офшорних схем і відділу бухгалтерії (кожен рівень зменшує донарахування). Поточна ставка податку на прибуток: ${pct(state.econ.taxRate, 0)}.</p>${F.audits.length ? `<ul class="log">${F.audits.map((a) => `<li class="${a.amount ? 'bad' : 'good'}"><small>Д${a.day}</small> ${esc(a.text)}${a.amount ? `: ${money(a.amount)}` : ''}</li>`).join('')}</ul>` : '<p class="muted">Перевірок ще не було.</p>'}</div>`;
  }
  return html;
};
if (typeof decorateView === 'function') { const f = VIEWS.fincenter; VIEWS.fincenter = function () { return decorateView('fincenter', f()); }; }

Object.assign(ACT, {
  fnLoan: (d) => takeLoan2(d.k, +d.v), fnIssue: (d) => confirmBox(`Випустити облігації на ${money(+d.v)}?`, () => issueBonds(+d.v, +d.t)),
  fnBuyback: (d) => buybackBond(d.id), fnBuyBond: (d) => buyBonds(d.id, +d.v * priceLvl()), fnSellBond: (d) => sellMyBond(d.id),
  fnFund: (d) => investFund(d.k, +d.v * priceLvl()), fnRedeem: (d) => redeemFund(d.k), fnPayout: (d) => { finState().payout = +d.v; },
  repayPart: (d) => { const l = state.loans.find((x) => x.id === d.id); if (l) repayLoan(d.id, Math.ceil(l.amount * 0.25)); },
  cfResolve: (d) => resolveConflict(d.id, d.v), brandCamp: (d) => brandCampaign(d.id),
  subMerge: (d) => { const id = askVal('mergeCo-' + d.id); const co = coById(id); if (co) confirmBox(`Злити «${co.name}» з дочірньою? ${moneyK(mergerCost(co))} грошима + 15% акцій дочірньої.`, () => mergeIntoSub(id, d.id)); },
});

// ---------- Доповнення «Структури групи»: конфлікти, риси CEO, бренд, утримання, злиття ----------
const _hq2 = VIEWS.hq;
VIEWS.hq = function () {
  let html = _hq2();
  if (state.ui.tab !== 'group' || !state.hq || !state.hq.founded) return html;
  const C = corp2State(), G = groupState();
  const cf = C.conflicts.map((c) => `<div class="stock"><div><b>${CONFLICTS[c.type].icon} ${esc(c.text)}</b><br><small class="muted">Рішення до дня ${c.until}, інакше — «${CONFLICTS[c.type].opts[CONFLICTS[c.type].opts.length - 1][1]}»</small></div><div class="px"></div><span></span><div class="trade">${CONFLICTS[c.type].opts.map(([k, n]) => `<button class="btn sm ${k === CONFLICTS[c.type].opts[0][0] ? 'primary' : ''}" data-act="cfResolve" data-id="${c.id}" data-v="${k}">${n}</button>`).join('')}</div></div>`).join('');
  const parentOh = C.parentOverhead || 0;
  html = html.replace('<div class="card"><b>Під прямим управлінням материнської:</b>', `${cf ? `<div class="card warn"><h3>⚠️ Корпоративні конфлікти</h3>${cf}</div>` : ''}<div class="card"><small class="muted">Утримання філій материнської (регіональні офіси, адміністрування мережі): ${money(parentOh)}/день</small></div><div class="card"><b>Під прямим управлінням материнської:</b>`);
  for (const s of G.subs) {
    const c = ceoFill(s.ceo), b = Math.round(subBrand(s));
    const extra = `<div class="row wrap" style="gap:8px;margin:6px 0"><span>🏷️ Бренд: <b class="${b >= 60 ? 'pos' : b < 35 ? 'neg' : ''}">${b}</b>/100</span><span class="muted">утримання філій: ${money(s.overhead || 0)}/день</span><button class="btn sm" data-act="brandCamp" data-id="${s.id}">📣 Брендова кампанія · ${moneyK(2e5 * priceLvl() * (1 + subUnits(s).length / 10))}</button></div>${c ? `<small class="muted">Риси CEO: чесність ${'●'.repeat(c.honesty)}${'○'.repeat(5 - c.honesty)} · лояльність ${Math.round(c.loyalty)} · амбітність ${'●'.repeat(c.ambition)}${'○'.repeat(5 - c.ambition)} · ${c.age} р.</small>` : ''}
      <div class="row wrap" style="margin-top:6px"><select id="mergeCo-${s.id}">${aliveCos().filter((x) => !isSub(x) && x.sector === SEGS[s.seg].sector || (!isSub(x) && SEGS[s.seg].types.includes(x.sector))).slice(0, 12).map((x) => `<option value="${x.id}">${esc(x.name)} · ${moneyK(mergerCost(x))} + 15% акцій</option>`).join('') || '<option value="">немає кандидатів</option>'}</select><button class="btn sm" data-act="subMerge" data-id="${s.id}">🤝 Злиття з дочірньою</button></div>`;
    const marker = `data-act="subFloat" data-id="${s.id}"`;
    const i = html.indexOf(marker); if (i < 0) continue;
    const rowStart = html.lastIndexOf('<div class="row wrap" style="margin-top:6px"><label class="switch">', i);
    if (rowStart > 0) html = html.slice(0, rowStart) + extra + html.slice(rowStart);
  }
  return html;
};
// тривоги головної: конфлікти, кредити, криза
if (typeof empireAlerts === 'function') {
  const _al = empireAlerts;
  empireAlerts = function () {
    const al = _al();
    if (state.corp2 && state.corp2.conflicts.length) al.unshift(['bad', `💼 Корпоративні конфлікти: ${state.corp2.conflicts.length} — потрібне рішення`, 'hq']);
    if (state.fin && state.fin.crisis) al.unshift(['bad', '🔥 Боргова криза — скоротіть борг', 'fincenter']);
    const due = state.loans.filter((l) => l.due && l.due - state.day <= 5 && l.amount > state.cash).length;
    if (due) al.unshift(['bad', `⏰ Кредитів до погашення за 5 днів без коштів: ${due}`, 'fincenter']);
    return al;
  };
}
