'use strict';
/* БІЗНЕС ІМПЕРІЯ — реальна фінансова система (оновлення 3).
   Кредитний рейтинг з літерою й чинниками; типи кредитів (овердрафт, бізнес-кредит, інвестиційний,
   кредитна лінія) з термінами й погашенням; власні облігації та купівля чужих; інвестиційні фонди;
   дивідендна політика публічної компанії; журнал податкових перевірок; боргова криза при надмірному
   боргу; дефолт із реструктуризацією замість миттєвого банкрутства. */

const LOAN_TYPES = {
  overdraft: { name: 'Овердрафт', icon: '⚡', term: 30, spread: 4, limitK: 0.15, amort: false, desc: 'Швидкі гроші на 30 днів, найдорожчий. Не повернули вчасно — штраф і падіння рейтингу.' },
  business: { name: 'Бізнес-кредит', icon: '🏦', term: 180, spread: 0, limitK: 0.5, amort: true, desc: 'Стандартний кредит на 180 днів, рівні щоденні погашення.' },
  invest: { name: 'Інвестиційний кредит', icon: '🏗️', term: 720, spread: -1, limitK: 0.8, amort: true, minRating: 'BBB', desc: 'Дешевий і довгий (720 днів) під заставу активів; потрібен рейтинг від BBB.' },
  line: { name: 'Кредитна лінія', icon: '🔁', term: 365, spread: 1.5, limitK: 0.3, amort: false, desc: 'Беріть і повертайте будь-коли в межах ліміту; відсотки лише на використане.' },
};
const RATINGS = [['AAA', 800], ['AA', 760], ['A', 720], ['BBB', 670], ['BB', 610], ['B', 540], ['CCC', 450], ['D', 0]];
const ratingOf = (score) => RATINGS.find(([, t]) => score >= t)[0];
const ratingIdx = (r) => RATINGS.findIndex(([x]) => x === r);
const FUNDS = {
  index: { name: 'Індексний фонд BIZ-50', icon: '📈', fee: 0.002, desc: 'Повторює біржовий індекс.' },
  bonds: { name: 'Облігаційний фонд', icon: '🧾', fee: 0.005, desc: 'Стабільна дохідність ≈ ставка ЦБ − 1%.' },
  realty: { name: 'Фонд нерухомості', icon: '🏢', fee: 0.008, desc: 'Іде за індексом цін на нерухомість + орендний дохід.' },
  commod: { name: 'Сировинний фонд', icon: '🛢️', fee: 0.01, desc: 'Нафта, газ, метали, зерно — волатильно.' },
  venture: { name: 'Венчурний фонд', icon: '🚀', fee: 0.02, desc: 'Висока волатильність, шанс великих стрибків.' },
};

function finState() {
  if (!state.fin) state.fin = { bonds: [], myBonds: [], funds: {}, nav: {}, audits: [], payout: 0, defaultDay: 0, crisis: 0, missed: 0, seq: 1, hist: [] };
  const F = state.fin;
  for (const k of Object.keys(FUNDS)) if (!F.nav[k]) F.nav[k] = 100;
  return F;
}

// ---------- Кредитний рейтинг ----------
function creditFactors() {
  const nw = Math.max(1, netWorth()), d = debt() + sum(finState().bonds, (b) => b.amount);
  const lev = d / nw;
  const prof = avgProfit(30), interest = sum(state.loans, (l) => l.amount * l.rate) + sum(finState().bonds, (b) => b.amount * b.coupon / 365);
  const cover = interest > 0 ? prof / interest : 99;
  return { lev, cover, missed: finState().missed, def: finState().defaultDay && state.day - finState().defaultDay < 360 };
}
function rating() { return ratingOf(state.me.credit); }

// ---------- Кредити ----------
function loanLimit(type) {
  const T = LOAN_TYPES[type];
  const base = Math.max(10000 * priceLvl(), (state.cash + inventoryValue() + fixedAssets() + propertyValue() + (typeof divisionsValue === 'function' ? divisionsValue() : 0)) * T.limitK) * clamp(state.me.credit / 700, 0.3, 1.25);
  const used = sum(state.loans.filter((l) => l.type === type), (l) => l.amount);
  return Math.max(0, Math.round(base - used));
}
const loanRate = (type) => Math.max(0.5, creditRate() + LOAN_TYPES[type].spread + finState().crisis * 4);
function takeLoan2(type, amount) {
  const T = LOAN_TYPES[type], F = finState();
  amount = Math.round(amount);
  if (F.defaultDay && state.day - F.defaultDay < 180) return toast('Після дефолту банки не кредитують 180 днів.', 'bad');
  if (T.minRating && ratingIdx(rating()) > ratingIdx(T.minRating)) return toast(`Потрібен рейтинг ${T.minRating} або вищий.`, 'bad');
  if (amount <= 0 || amount > loanLimit(type)) return toast(`Ліміт для «${T.name}»: ${moneyK(loanLimit(type))}.`, 'bad');
  const rate = loanRate(type);
  state.loans.push({ id: uid(), amount, rate: rate / 100 / 365, day: state.day, kind: 'loan', type, due: state.day + T.term, orig: amount, apr: rate });
  book('loans', amount);
  log(`${T.icon} ${T.name}: ${money(amount)} під ${rate.toFixed(1)}% на ${T.term} дн.`, 'good');
}

// ---------- Облігації ----------
function bondCoupon(term) { const r = ratingIdx(rating()); return +(state.econ.rate + 0.5 + r * 1.2 + term / 365 * 0.6 + finState().crisis * 3).toFixed(2); }
function issueBonds(amount, term) {
  const F = finState();
  if (ratingIdx(rating()) >= ratingIdx('CCC')) return toast('З таким рейтингом інвестори облігації не купують.', 'bad');
  const cap = Math.max(0, netWorth() * 0.6 - debt() - sum(F.bonds, (b) => b.amount));
  if (amount > cap) return toast(`Ринок готовий викупити не більше ${moneyK(cap)}.`, 'bad');
  const coupon = bondCoupon(term);
  F.bonds.push({ id: 'bd' + (F.seq++), amount: Math.round(amount), coupon, issued: state.day, due: state.day + term });
  book('loans', amount);
  news(`🧾 ${state.company} розміщує облігації на ${moneyK(amount)} (купон ${coupon}%, ${term} дн., рейтинг ${rating()}).`, 'market');
}
function buybackBond(id) {
  const F = finState(), b = F.bonds.find((x) => x.id === id); if (!b) return;
  const price = Math.round(b.amount * (1 + (b.coupon - state.econ.rate) / 100 * Math.max(0, b.due - state.day) / 365 * 0.5));
  if (state.cash < price) return toast(`Викуп коштує ${moneyK(price)}.`, 'bad');
  book('loans', -price); F.bonds = F.bonds.filter((x) => x !== b);
  log(`🧾 Облігації ${b.id} викуплено достроково за ${money(price)}.`);
}
/** Облігації ІІ-компаній і держави для інвестування. */
function bondMarket() {
  const list = [{ id: 'gov', name: 'Державні облігації', yield: Math.max(0.5, state.econ.rate - 0.5), risk: 0 }];
  for (const co of aliveCos().filter((c) => !isSub(c)).sort((a, b) => b.price * b.shares - a.price * a.shares).slice(0, 8)) {
    const risk = clamp((co.debt || 0) / Math.max(1, co.cash + co.price * co.shares * 0.2), 0, 1);
    list.push({ id: co.id, name: co.name, yield: +(state.econ.rate + 1 + risk * 8).toFixed(2), risk: +risk.toFixed(2) });
  }
  return list;
}
function buyBonds(issuer, amount) {
  const F = finState(), b = bondMarket().find((x) => x.id === issuer); if (!b) return;
  if (state.cash < amount) return toast('Недостатньо коштів.', 'bad');
  book('shares', -amount);
  F.myBonds.push({ id: 'mb' + (F.seq++), issuer, name: b.name, amount, yield: b.yield, risk: b.risk, due: state.day + 365 });
  log(`🧾 Куплено облігації «${b.name}» на ${money(amount)} (дохідність ${b.yield}%).`);
}
function sellMyBond(id) {
  const F = finState(), b = F.myBonds.find((x) => x.id === id); if (!b) return;
  const v = Math.round(b.amount * (1 - Math.max(0, state.econ.rate - b.yield + 1) / 100 * 0.5));
  book('shares', v); F.myBonds = F.myBonds.filter((x) => x !== b);
  log(`🧾 Облігації «${b.name}» продано за ${money(v)}.`);
}

// ---------- Фонди ----------
const fundValue = (k) => { const F = finState(), h = F.funds[k]; return h ? h.units * F.nav[k] : 0; };
const fundsValue = () => (state.fin ? sum(Object.keys(FUNDS), fundValue) : 0);
const bondsValue = () => (state.fin ? sum(state.fin.myBonds, (b) => b.amount) : 0);
const bondsDebt = () => (state.fin ? sum(state.fin.bonds, (b) => b.amount) : 0);
function investFund(k, amount) {
  const F = finState(); if (state.cash < amount || amount <= 0) return toast('Недостатньо коштів.', 'bad');
  book('shares', -amount);
  const h = F.funds[k] || (F.funds[k] = { units: 0, cost: 0 });
  h.units += amount / F.nav[k]; h.cost += amount;
  log(`${FUNDS[k].icon} Інвестовано ${money(amount)} у «${FUNDS[k].name}».`);
}
function redeemFund(k) {
  const F = finState(), h = F.funds[k]; if (!h || !h.units) return;
  const v = Math.round(h.units * F.nav[k]); book('shares', v); delete F.funds[k];
  log(`${FUNDS[k].icon} Паї «${FUNDS[k].name}» погашено: ${money(v)} (${v >= h.cost ? '+' : ''}${money(v - h.cost)}).`, v >= h.cost ? 'good' : 'bad');
}

// ---------- Дефолт ----------
/** Дефолт: автоматичний продаж активів, реструктуризація боргу, рейтинг D. Банкрутство — лише якщо й це не допомогло. */
function triggerDefault() {
  const F = finState();
  F.defaultDay = state.day; state.me.credit = 380; F.missed += 3;
  let raised = 0;
  if (state.life) for (const x of [...state.life.lux]) { raised += luxValue(x) * 0.7; book('propTrade', luxValue(x) * 0.7); state.life.lux = state.life.lux.filter((y) => y !== x); }
  for (const k of Object.keys(F.funds)) { raised += fundValue(k); redeemFund(k); }
  for (const b of [...F.myBonds]) { raised += b.amount * 0.9; book('shares', b.amount * 0.9); F.myBonds = F.myBonds.filter((x) => x !== b); }
  for (const [id, h] of Object.entries(state.portfolio)) { const co = coById(id); if (co && co.alive && h.qty) { const v = h.qty * co.price * 0.85; raised += v; book('shares', v); delete state.portfolio[id]; } }
  // реструктуризація: короткі борги перетворюються на довгий кредит під штрафну ставку
  const total = sum(state.loans, (l) => l.amount);
  if (total > 0) { state.loans = [{ id: uid(), amount: total, rate: (creditRate() + 6) / 100 / 365, day: state.day, kind: 'loan', type: 'business', due: state.day + 720, orig: total, apr: creditRate() + 6, restructured: true }]; }
  news(`💥 ${state.company} оголошує технічний дефолт. Продано активи на ${moneyK(raised)}, борги реструктуризовано на 720 днів під штрафну ставку. Рейтинг: D.`, 'market', 'bad', true);
  if (typeof applyReputation === 'function') applyReputation('player', -3);
  if (state.ipo) state.ipo.price *= 0.6;
  state.negDays = 0;
}

// ---------- Щоденна симуляція ----------
function finDaily() {
  const F = finState(), e = state.econ;
  // Кредити: погашення за графіком, прострочення
  for (const l of [...state.loans]) {
    if (!l.type || !LOAN_TYPES[l.type]) continue;
    const T = LOAN_TYPES[l.type];
    if (T.amort && l.amount > 0) { const pay = Math.min(l.amount, l.orig / T.term); if (state.cash >= pay) { book('loans', -pay); l.amount -= pay; } else { F.missed++; l.amount += pay * 0.05; state.me.credit = Math.max(300, state.me.credit - 3); } }
    if (l.due && state.day >= l.due && l.amount > 0.5) {
      if (state.cash >= l.amount) { book('loans', -l.amount); l.amount = 0; log(`${T.icon} ${T.name} погашено в строк.`, 'good'); }
      else { F.missed++; state.me.credit = Math.max(300, state.me.credit - 25); l.amount *= 1.03; l.due = state.day + 15; log(`⚠️ Прострочено ${T.name.toLowerCase()}: штраф 3%, рейтинг падає. Нова дата — день ${l.due}.`, 'bad'); }
    }
    if (l.amount <= 0.5) { state.loans = state.loans.filter((x) => x !== l); state.me.credit = Math.min(850, state.me.credit + 4); }
  }
  // Власні облігації: купони й погашення
  for (const b of [...F.bonds]) {
    book('interest', -b.amount * b.coupon / 100 / 365);
    if (state.day >= b.due) {
      if (state.cash >= b.amount) { book('loans', -b.amount); F.bonds = F.bonds.filter((x) => x !== b); log(`🧾 Облігації ${b.id} погашено.`, 'good'); }
      else { F.missed += 2; state.me.credit = Math.max(300, state.me.credit - 40); b.due = state.day + 10; b.coupon += 2; news(`⚠️ ${state.company} не змогла погасити облігації вчасно. Купон підвищено, рейтинг знижено.`, 'market', 'bad'); }
    }
  }
  // Куплені облігації: дохід і ризик дефолту емітента
  for (const b of [...F.myBonds]) {
    book('interestInc', b.amount * b.yield / 100 / 365);
    const co = b.issuer !== 'gov' ? coById(b.issuer) : null;
    if (b.issuer !== 'gov' && (!co || !co.alive)) { const rec = b.amount * 0.3; book('shares', rec); F.myBonds = F.myBonds.filter((x) => x !== b); log(`💥 Емітент «${b.name}» збанкрутував: повернуто лише ${money(rec)} з ${money(b.amount)}.`, 'bad'); continue; }
    if (state.day >= b.due) { book('shares', b.amount); F.myBonds = F.myBonds.filter((x) => x !== b); log(`🧾 Облігації «${b.name}» погашено: ${money(b.amount)}.`, 'good'); }
  }
  // Фонди
  const idx = typeof bizIndex === 'function' ? bizIndex() : 1000;
  const prevIdx = F.lastIdx || idx; F.lastIdx = idx;
  const W = state.world, com = W ? (W.commod.oil + W.commod.gas + W.commod.metal + W.commod.grain) / 4 : 1, prevCom = F.lastCom || com; F.lastCom = com;
  const hs = e.housing, prevHs = F.lastHs || hs; F.lastHs = hs;
  F.nav.index *= (idx / prevIdx) * (1 - FUNDS.index.fee / 365);
  F.nav.bonds *= 1 + Math.max(0, e.rate - 1) / 100 / 365 - FUNDS.bonds.fee / 365;
  F.nav.realty *= (hs / prevHs) * (1 + 0.04 / 365) * (1 - FUNDS.realty.fee / 365);
  F.nav.commod *= (com / prevCom) * (1 - FUNDS.commod.fee / 365);
  F.nav.venture *= Math.exp(gauss() * 0.02 + (e.phase === 'boom' ? 0.001 : e.phase === 'crisis' ? -0.003 : 0.0003)) * (chance(0.004) ? rnd(1.2, 1.6) : 1) * (1 - FUNDS.venture.fee / 365);
  // Дивіденди публічної компанії: частка прибутку міноритаріям, підтримує курс
  if (state.ipo && F.payout > 0) {
    const p = avgProfit(7);
    if (p > 0) { const out = p * F.payout * state.ipo.float; book('dividendsOut', -out); state.ipo.price *= 1 + F.payout * 0.0006; }
  }
  // Боргова криза: надмірне боргове навантаження
  const fx = creditFactors();
  if (fx.lev > 2 && fx.cover < 1.5 && !F.crisis && chance(0.02)) {
    F.crisis = 1; F.crisisUntil = state.day + 45;
    state.me.credit = Math.max(300, state.me.credit - 60);
    news(`🔥 Боргова криза ${state.company}: банки вимагають часткового погашення, ставки за новими кредитами +4 п.п., облігації дешевшають.`, 'market', 'bad', true);
    for (const l of state.loans) if (l.type === 'line' || l.type === 'overdraft') l.due = Math.min(l.due || state.day + 10, state.day + 10);
  }
  if (F.crisis && state.day >= F.crisisUntil && fx.lev < 1.5) { F.crisis = 0; log('✅ Боргову кризу подолано: умови кредитування нормалізувались.', 'good'); }
  // Кредитний рейтинг дрейфує до «фундаментального»
  const fund = clamp(780 - Math.max(0, fx.lev - 0.5) * 120 - (fx.cover < 2 ? (2 - fx.cover) * 50 : 0) - F.missed * 4 + (state.flags.repaid ? 10 : 0) - (fx.def ? 120 : 0), 300, 850);
  state.me.credit = clamp(state.me.credit + (fund - state.me.credit) * 0.01, 300, 850);
  F.missed = Math.max(0, F.missed - 0.01);
  F.hist.push({ d: state.day, r: Math.round(state.me.credit) }); if (F.hist.length > 365) F.hist.shift();
}
/** Журнал податкових перевірок (доповнює перевірки уряду). */
function taxAuditLog(text, amount) { const F = finState(); F.audits.unshift({ day: state.day, text, amount }); if (F.audits.length > 30) F.audits.length = 30; }

HOOKS.day.push(finDaily);
