'use strict';
/* БІЗНЕС ІМПЕРІЯ — етап 10: розумні сповіщення, центр криз, фінансовий прогноз, інтелектуальні CEO,
   історія імперії, довгострокові цілі з нагородами. */

// ================= 1. Сповіщення =================
const NOTIF_KINDS = {
  crit: { name: 'Критичні', icon: '🔴', desc: 'ризик банкрутства, дефолт, аварія, касовий розрив' },
  imp: { name: 'Важливі', icon: '🟠', desc: 'падіння прибутку, втрата ринку, проблеми директорів, суди, скандали' },
  news: { name: 'Новини', icon: '🔵', desc: 'події світової економіки, політика, вибори' },
  opp: { name: 'Можливості', icon: '🟢', desc: 'дешеві компанії, тендери, вигідні інвестиції' },
};
function notifState() {
  if (!state.notif) state.notif = { list: [], seen: {}, set: { crit: { on: true, toast: true, pause: true }, imp: { on: true, toast: true, pause: false }, news: { on: true, toast: false, pause: false }, opp: { on: true, toast: true, pause: false } }, snap: {}, seq: 1 };
  return state.notif;
}
/** Додати сповіщення (з дедуплікацією за ключем). Критичні можуть ставити гру на паузу. */
function notify(kind, key, text, view, ttl = 7) {
  const N = notifState(), S = N.set[kind];
  if (!S || !S.on && kind !== 'crit') return;
  if (N.seen[key] && state.day - N.seen[key] < ttl) return;
  N.seen[key] = state.day;
  N.list.unshift({ id: 'n' + (N.seq++), day: state.day, hour: state.hour, kind, text, view: view || null, read: false });
  if (N.list.length > 150) N.list.length = 150;
  if (S.toast && typeof toast === 'function') toast(`${NOTIF_KINDS[kind].icon} ${text}`, kind === 'crit' ? 'bad' : kind === 'opp' ? 'good' : '');
  if (kind === 'crit' && S.pause && state.speed > 0 && typeof setSpeed === 'function') { setSpeed(0); if (typeof toast === 'function') toast('⏸ Гру поставлено на паузу через критичну подію.', 'bad'); }
}
const unreadCount = () => (state.notif ? state.notif.list.filter((n) => !n.read).length : 0);

function scanNotifications() {
  const N = notifState(), F = state.fin, e = state.econ;
  // --- критичні
  if (state.cash < 0) notify('crit', 'cash-neg', `Від’ємний баланс ${moneyK(state.cash)} — ризик дефолту й банкрутства.`, 'fincenter', 3);
  if (F && F.defaultDay === state.day) notify('crit', 'default-' + state.day, 'Технічний дефолт: активи продано, борг реструктуризовано.', 'fincenter');
  for (const f of state.fac) if (f.broken > 0 && !f._nb) { f._nb = 1; notify('crit', 'acc-' + f.id + state.day, `Аварія: ${f.name} простоює ${f.broken} дн.`, 'industry', 1); } else if (!f.broken) f._nb = 0;
  const fc = forecast(14);
  if (fc.deficitDay != null && state.cash >= 0) notify('crit', 'deficit', `Прогноз: касовий розрив через ${fc.deficitDay} дн. (мінімум ${moneyK(fc.minCash)}).`, 'forecast', 5);
  for (const l of state.loans) if (l.due && l.due - state.day <= 3 && l.amount > state.cash) notify('crit', 'due-' + l.id, `Кредит ${moneyK(l.amount)} треба погасити до дня ${l.due}, а коштів не вистачає.`, 'fincenter', 3);
  // --- важливі
  const L = state.ledger, p7 = L.slice(-7), p14 = L.slice(-14, -7);
  if (p14.length === 7) { const a = sum(p7, (x) => x.profit) / 7, b = sum(p14, (x) => x.profit) / 7; if (b > 0 && a < b * 0.7) notify('imp', 'profit-drop', `Прибуток упав на ${Math.round((1 - a / b) * 100)}% за тиждень (${moneyK(b)} → ${moneyK(a)}/день).`, 'crisis', 7); }
  if (state.day % 7 === 0 && typeof marketShares === 'function') {
    const M = marketShares(), prev = N.snap.shares || {}, now = {};
    for (const m of Object.values(M)) { const s = (m.by.player || 0) / m.total; if (s > 0 && m.n >= 4) { now[m.key] = s; if (prev[m.key] != null && prev[m.key] - s > 0.1) notify('imp', 'share-' + m.key, `Втрата ринку: ${marketName(m.key)} ${Math.round(prev[m.key] * 100)}% → ${Math.round(s * 100)}%.`, 'antitrust', 14); } }
    N.snap.shares = now;
  }
  if (state.corp2) for (const c of state.corp2.conflicts) notify('imp', 'cf-' + c.id, `Директор: ${c.text}`, 'hq', 30);
  if (state.opinion) for (const s of state.opinion.scandals) if (!s.done && state.day < s.until) notify('imp', 'sc-' + s.id, `Скандал: ${s.text}`, 'opinion', 30);
  if (state.gov) for (const c of state.gov.cases) if (c.target === 'player' && c.stage !== 'closed') notify('imp', 'amc-' + c.id, `АМКУ: справа ${c.id} — ${CASE_TYPES[c.type]}.`, 'antitrust', 60);
  if (state.war) for (const s of state.war.suits) if (s.defendant === 'player' && !s.outcome) notify('imp', 'suit-' + s.id, `Позов проти вас: ${SUIT_TYPES[s.type].name} на ${moneyK(s.claim)}.`, 'corpwar', 90);
  if (state.crime) for (const d of state.crime.demands) notify('imp', 'dem-' + d.id, `Вимагання: ${moneyK(d.amount)}.`, 'underworld', 30);
  if (typeof rating === 'function' && state.fin) { const r = rating(); if (N.snap.rating && r !== N.snap.rating && ratingIdx(r) > ratingIdx(N.snap.rating)) notify('imp', 'rate-' + r + state.day, `Кредитний рейтинг знижено: ${N.snap.rating} → ${r}.`, 'fincenter'); N.snap.rating = r; }
  // --- новини
  if (state.live && state.live.today && state.live.today.day === state.day) notify('news', 'live-' + state.day, `${state.live.today.icon} ${state.live.today.title}`, 'newsroom', 1);
  if (N.snap.phase && N.snap.phase !== e.phase) notify('news', 'phase-' + state.day, `Економіка перейшла у фазу «${PHASES[e.phase].name}».`, 'world', 1);
  N.snap.phase = e.phase;
  if (state.pol && state.pol.history[0] && state.pol.history[0].day === state.day) { const h = state.pol.history[0]; notify('news', 'el-' + state.day, `Вибори: ${h.type === 'pres' ? 'президент' : h.type === 'parl' ? 'парламент' : 'мер'} — переміг(-ла) ${h.res[0].name} (${h.res[0].pct}%).`, 'politics', 1); }
  // --- можливості
  for (const co of aliveCos()) {
    if (isSub(co) || co.hist.length < 30) continue;
    const old = co.hist[co.hist.length - 30];
    if (co.price < old * 0.6 && co.ema > 0 && takeoverPrice(co) < state.cash * 0.8) notify('opp', 'cheap-' + co.id, `«${co.name}» подешевшала на ${Math.round((1 - co.price / old) * 100)}% і прибуткова — поглинання за ${moneyK(takeoverPrice(co))}.`, 'ranking', 30);
  }
  if (state.pol) for (const t of state.pol.tenders) notify('opp', 'tender-' + t.id, `Держтендер «${t.title}» на ${moneyK(t.value)}.`, 'politics', 30);
  if (state.vc) for (const p of state.vc.pitches) if (p.tier === 'unicorn') notify('opp', 'vc-' + p.id, `Стартап-кандидат у єдинороги: «${p.name}».`, 'ventures', 30);
}

// ================= 3. Центр криз =================
/** Усі проблеми імперії з причиною й наслідками. sev: 3 — критично, 2 — серйозно, 1 — увага. */
function crisisItems() {
  const out = [], add = (sev, cat, title, cause, effect, view) => out.push({ sev, cat, title, cause, effect, view });
  const fc = forecast(30);
  if (state.cash < 0) add(3, 'Фінанси', 'Від’ємний баланс', `Готівка ${moneyK(state.cash)}`, 'Через 3 дні нестачі — дефолт: продаж активів, рейтинг D, кредити закриті на 180 днів.', 'fincenter');
  else if (fc.deficitDay != null) add(3, 'Фінанси', `Касовий розрив через ${fc.deficitDay} дн.`, `Витрати й платежі за боргами перевищують надходження; мінімум готівки ${moneyK(fc.minCash)}.`, 'Прострочки знижують рейтинг; якщо готівка піде в мінус на 3 дні — дефолт.', 'forecast');
  if (state.fin) {
    const fx = creditFactors();
    if (fx.lev > 1.5) add(fx.lev > 2 ? 3 : 2, 'Фінанси', 'Високе боргове навантаження', `Борг у ${fx.lev.toFixed(1)}× більший за капітал.`, 'Ризик боргової кризи: ставки +4 п.п., скорочення кредитних ліній.', 'fincenter');
    if (state.fin.crisis) add(3, 'Фінанси', 'Боргова криза', 'Надмірний борг при слабкому покритті відсотків.', 'Дорогі кредити й облігації, банки вимагають погашення.', 'fincenter');
  }
  const wk = (u) => (u.kind ? (typeof unitPL === 'function' && u.yest ? unitPL(u).p * 7 : 0) : sum(u.history.slice(-7), (h) => h.profit));
  const losers = [...state.biz.filter((u) => u.history && u.history.length >= 7), ...state.fac.filter((f) => f.kind !== 'office' && f.yest)].filter((u) => wk(u) < 0);
  for (const u of losers.slice(0, 8)) {
    const y = u.yest || {}; let cause = 'низька виручка';
    if (!staffOf(u).length) cause = 'немає персоналу'; else if (staffOf(u).length < maxStaff(u) / 2) cause = 'недобір персоналу';
    else if (y.oos > 3 || (y.lost && y.lost > (y.served || 0) * 0.3)) cause = 'закінчується товар, покупці йдуть';
    else if (u.kind && (u.broken || u.cond < 45)) cause = 'зношене обладнання / аварії';
    else if (u.kind && y.short) cause = y.short;
    else if (y.rent && y.rev && y.rent > y.rev * 0.4) cause = 'занадто дорога оренда для такого потоку';
    add(2, 'Об’єкти', `Збитковий: ${u.name}`, `${moneyK(wk(u))} за тиждень — ${cause}.`, 'Продовжить «їсти» прибуток; варто виправити причину, змінити формат або продати.', u.kind ? 'industry' : 'businesses');
  }
  if (losers.length > 8) add(1, 'Об’єкти', `Ще збиткових об’єктів: ${losers.length - 8}`, 'Див. розділи «Магазини» й «Виробництво».', '', 'businesses');
  if (state.group) for (const s of state.group.subs) {
    const p30 = sum(s.hist.slice(-30), (h) => h.p);
    if (s.hist.length >= 20 && p30 < 0) add(2, 'Дочірні', `«${s.name}» збиткова`, `${moneyK(p30)} за 30 днів; утримання філій ${moneyK(s.overhead || 0)}/день${s.ceo ? '' : ', немає CEO'}.`, 'Тягне вниз оцінку групи; міноритарії можуть вимагати змін.', 'hq');
    if (s.ceo && s.ceo.loyalty != null && s.ceo.loyalty < 30) add(2, 'Директори', `Нелояльний CEO «${s.name}»`, `Лояльність ${Math.round(s.ceo.loyalty)}.`, 'Може піти до конкурента або конфліктувати.', 'hq');
  }
  for (const co of subsidiaries()) if ((co.debt || 0) > co.cash * 2 && co.debt > 0) add(2, 'Дочірні', `Борги «${co.name}»`, `Борг ${moneyK(co.debt)} при касі ${moneyK(co.cash)}.`, 'Ризик банкрутства дочірньої й втрати вкладень.', 'ranking');
  if (state.opinion && state.opinion.hist.length > 30) { const h = state.opinion.hist; const d = h[h.length - 1].a - h[h.length - 31].a; if (d < -10) add(2, 'Репутація', 'Падає популярність', `Схвалення −${Math.round(-d)} за 30 днів.`, 'Гірші шанси на виборах, слабша підтримка законів, менше покупців.', 'opinion'); }
  const cases = [...(state.gov ? state.gov.cases.filter((c) => c.target === 'player' && c.stage !== 'closed') : []), ...(state.war ? state.war.suits.filter((s) => s.defendant === 'player' && !s.outcome) : []), ...(state.crime ? state.crime.cases.filter((c) => c.target === 'player' && !c.outcome) : []), ...(state.pol ? state.pol.cases.filter((c) => c.target === 'player' && !c.outcome) : [])];
  if (cases.length) add(2, 'Суди', `Справ проти вас: ${cases.length}`, 'Антимонопольні, кримінальні, антикорупційні справи й позови.', 'Штрафи, удар по репутації, примусовий поділ при повторних порушеннях.', 'investigations');
  if (typeof marketShares === 'function') for (const m of Object.values(marketShares())) { const s = (m.by.player || 0) / m.total; if (m.n >= 4 && s >= 0.6) add(2, 'Активи', `Ризик примусового продажу: ${marketName(m.key)}`, `Частка ${Math.round(s * 100)}%.`, 'АМКУ може зобов’язати продати частину точок або виділити дочірню.', 'antitrust'); }
  if (state.crime && state.crime.demands.length) add(2, 'Безпека', 'Вимагання', `${state.crime.demands.length} вимог від угруповань.`, 'Відмова без охорони — ризик крадіжок і саботажу.', 'underworld');
  if (state.life && state.life.health < 35) add(2, 'Особисте', 'Слабке здоров’я', `Здоров’я ${Math.round(state.life.health)}.`, 'Ризик смерті й передачі імперії; складіть заповіт.', 'personal');
  return out.sort((a, b) => b.sev - a.sev);
}

// ================= 4. Фінансовий прогноз =================
const PHASE_DRIFT = { boom: 0.0004, growth: 0.0002, recovery: 0.0003, recession: -0.0006, crisis: -0.0012 };
const NEXT_PHASE = { boom: 'recession', growth: 'boom', recovery: 'growth', recession: 'recovery', crisis: 'recovery' };
/** Прогноз на N днів: доходи й витрати від середніх за 14 днів з поправкою на цикл, графік кредитів і облігацій, податки, дивіденди. */
function forecast(days) {
  const L = state.ledger.slice(-14), n = Math.max(1, L.length);
  const EXCL = new Set(['interest', 'tax', 'dividendsOut']);
  let inc = 0, exp = 0;
  for (const [k, D] of Object.entries(LEDGER)) { if (D.kind === 'cash' || EXCL.has(k)) continue; const avg = sum(L, (x) => x[k] || 0) / n; if (D.kind === 'inc') inc += avg; else exp += avg; }
  const loans = state.loans.map((l) => ({ a: l.amount, rate: l.rate, due: l.due, amort: l.type && LOAN_TYPES[l.type] && LOAN_TYPES[l.type].amort ? l.orig / LOAN_TYPES[l.type].term : 0 }));
  const bonds = state.fin ? state.fin.bonds.map((b) => ({ a: b.amount, c: b.coupon, due: b.due })) : [];
  const payout = state.fin && state.ipo ? state.fin.payout * state.ipo.float : 0;
  const tax = typeof effectiveTaxRate === 'function' ? effectiveTaxRate() : state.econ.taxRate;
  let phase = state.econ.phase, left = state.econ.phaseDays, mult = 1, cash = state.cash, minCash = cash, deficitDay = null;
  const res = { inc: 0, exp: 0, debt: 0, taxes: 0, div: 0, path: [] };
  let weekProfit = 0;
  for (let d = 1; d <= days; d++) {
    if (--left <= 0) { phase = NEXT_PHASE[phase] || 'growth'; left = 60; }
    mult *= 1 + (PHASE_DRIFT[phase] || 0);
    const di = inc * mult, de = exp * (1 + (mult - 1) * 0.4);
    let debt = 0;
    for (const l of loans) { if (l.a <= 0) continue; debt += l.a * l.rate; if (l.amort) { const p = Math.min(l.a, l.amort); debt += p; l.a -= p; } if (l.due && state.day + d >= l.due && l.a > 0) { debt += l.a; l.a = 0; } }
    for (const b of bonds) { if (b.a <= 0) continue; debt += b.a * b.c / 100 / 365; if (state.day + d >= b.due) { debt += b.a; b.a = 0; } }
    const profit = di - de; weekProfit += profit;
    let t = 0, dv = 0;
    if (d % 7 === 0) { t = Math.max(0, weekProfit) * tax; weekProfit = 0; }
    if (payout && profit > 0) dv = profit * payout;
    cash += di - de - debt - t - dv;
    res.inc += di; res.exp += de; res.debt += debt; res.taxes += t; res.div += dv;
    if (cash < minCash) minCash = cash;
    if (cash < 0 && deficitDay == null) deficitDay = d;
    res.path.push(cash);
  }
  return Object.assign(res, { end: cash, minCash, deficitDay, phaseEnd: phase });
}

// ================= 5. Інтелектуальні CEO =================
Object.assign(CEO_STYLES, {
  innovator: { name: 'Інноватор', price: 'market', expand: 0.8, risk: 0.9, desc: 'вкладає бюджет у технології й обладнання' },
  merchant: { name: 'Комерсант', price: 'market', expand: 1.25, risk: 1.1, desc: 'реклама, гнучкі ціни, вихід на нові ринки' },
  corporate: { name: 'Корпоративний', price: 'market', expand: 0.7, risk: 0.7, desc: 'оптимізує структуру: закриває збиткові філії, ріже накладні' },
});
CEO_STYLES.careful.name = 'Обережний'; CEO_STYLES.careful.desc = 'економить гроші, уникає ризиків, вищі ціни';
function ceoDecision(s, text, good) { const c = s.ceo; c.decisions = (c.decisions || 0) + 1; subLog(s, `${good === false ? '❌' : good ? '✅' : '🧠'} ${text}`); }
function ceoBrainDaily() {
  if (!state.group) return;
  for (const s of state.group.subs) {
    const c = s.ceo; if (!c || state.day % 5) continue;
    const us = subUnits(s), left = Math.max(0, s.budget - s.spent), p30 = sum(s.hist.slice(-30), (h) => h.p);
    // кар’єра: результат за 30 днів → досвід, ріст навички, вимоги
    const p60 = sum(s.hist.slice(-60, -30), (h) => h.p);
    if (s.hist.length >= 60 && state.day % 30 === 0) {
      const ok = p30 > p60; c.xp = (c.xp || 0) + (ok ? 1 : -1); c.wins = (c.wins || 0) + (ok ? 1 : 0); c.fails = (c.fails || 0) + (ok ? 0 : 1);
      if (c.xp >= 3 && c.skill < 5) { c.skill++; c.xp = 0; ceoDecision(s, `${c.name} виріс(-ла) як керівник: навичка ${c.skill}/5`, true); if (typeof addConflict === 'function') addConflict('raise', s); }
      if (c.xp <= -3) { c.xp = 0; ceoDecision(s, `Слабкі результати ${c.name} два квартали поспіль`, false); if (c.loyalty != null) c.loyalty -= 5; }
    }
    const st = c.style;
    if (st === 'careful') {
      if (p30 < 0 && s.opts.expand) { s.opts.expand = false; ceoDecision(s, 'збиткова динаміка — заморожено розширення'); }
      if (s.spent > s.budget * 0.5 && s.opts.expand) { s.opts.expand = false; ceoDecision(s, 'витрачено половину бюджету — далі лише за потреби'); }
    } else if (st === 'aggressive') {
      if (!s.opts.expand && left > 0) { s.opts.expand = true; ceoDecision(s, 'відновлено агресивне розширення'); }
      if (p30 < 0 && chance(0.2)) { s.brand = Math.max(0, (s.brand || 50) - 3); ceoDecision(s, 'надто швидке розширення: частина нових точок поки збиткова', false); }
    } else if (st === 'innovator') {
      if (left > 0 && state.day % 10 === 0) {
        const spend = Math.min(left * 0.05, 5e6 * priceLvl()); s.spent += spend; book('depts', -spend);
        const pts = spend / (2000 * priceLvl()); state.tech.points += pts;
        const b = us.find((u) => !u.kind && u.upg.equipment < MAX_UPG && state.cash > upgradeCost(u, 'equipment') * 6);
        if (b) upgradeBiz(b, 'equipment');
        ceoDecision(s, `вкладено ${moneyK(spend)} у R&D (+${Math.round(pts)} очок досліджень)${b ? ', модернізовано обладнання' : ''}`, chance(0.75) ? true : undefined);
      }
    } else if (st === 'merchant') {
      let ads = 0;
      for (const u of us) if (!u.kind) {
        if (!u.marketing.social && u.yest && u.yest.profit > 0) { u.marketing.social = true; ads++; }
        if (u.yest && u.yest.oos > 2 && u.priceMode !== 'premium') u.priceMode = 'premium';
        else if (u.yest && u.yest.lost > (u.yest.served || 0) * 0.5) u.priceMode = 'cheap';
      }
      if (ads) ceoDecision(s, `запущено рекламу в ${ads} точках, ціни підлаштовано під попит`);
      if (chance(0.15)) { s.brand = Math.min(100, (s.brand || 50) + 2); }
    } else if (st === 'corporate') {
      s.ohMult = 0.85;
      const bad = us.filter((u) => !u.kind && u.history && u.history.length >= 30 && sum(u.history.slice(-30), (h) => h.profit) < 0);
      if (bad.length && us.length > 3) { const b = bad.sort((a, x) => sum(a.history.slice(-30), (h) => h.profit) - sum(x.history.slice(-30), (h) => h.profit))[0]; const view = state.ui.view; sellBiz(b); state.ui.view = view; ceoDecision(s, `закрито збиткову філію «${b.name}»`, true); }
    }
    // конфлікт із власником: ваші налаштування суперечать стилю CEO
    if ((st === 'careful' && s.opts.price === 'cheap') || (st === 'aggressive' && !s.opts.expand && left > 0) || (st === 'corporate' && s.budget - s.spent > 0 && s.opts.expand && p30 < 0)) {
      if (c.loyalty != null) c.loyalty = Math.max(0, c.loyalty - 1);
      if (chance(0.05)) ceoDecision(s, `${c.name} не згоден(-на) з вашими вказівками щодо ${st === 'careful' ? 'демпінгу' : 'розширення'}`, false);
    }
  }
}

// ================= 6. Історія імперії =================
function chronState() { if (!state.chron) state.chron = { items: [], done: {}, maxDeal: 0 }; return state.chron; }
function chron(key, icon, text) {
  const C = chronState(); if (C.done[key]) return;
  C.done[key] = state.day; C.items.push({ day: state.day, icon, text, gen: state.life ? state.life.gen : 1 });
  if (typeof notify === 'function') notify('news', 'chron-' + key, `📜 Історія: ${text}`, 'chronicle', 9999);
}
function chronDaily() {
  const C = chronState(), nw = netWorth();
  if (state.biz.length || state.fac.length) chron('first', '🏪', `Засновано першу компанію: «${(state.biz[0] || state.fac[0]).name}».`);
  const cum = sum(state.ledger, (x) => x.profit);
  if (cum >= 1e6) chron('m1', '💵', 'Сукупний прибуток перевищив $1 млн.');
  for (const [t, n] of [[1e6, 'мільйонер'], [1e9, 'мільярдер'], [1e12, 'трильйонер']]) if (nw >= t) chron('nw' + t, '👑', `Капітал досяг ${moneyK(t)} — ${state.me.name} тепер ${n}.`);
  if (state.ipo) chron('ipo', '🔔', `IPO: акції ${state.company} торгуються на біржі.`);
  if (state.bank && state.bank.open) chron('bank', '🏦', 'Створено власний банк.');
  const home = REGION_OF[state.city];
  if (Object.keys(state.unlocked || {}).some((c) => REGION_OF[c] !== home)) chron('intl', '🌍', 'Вихід на міжнародний ринок.');
  for (const co of subsidiaries()) { const v = co.boughtFor || 0; if (v > C.maxDeal) { C.maxDeal = v; chron('deal-' + co.id, '🦈', `Найбільше поглинання: «${co.name}» за ${moneyK(v)}.`); } }
  if (state.econ.phase === 'crisis') chron('crisis1', '🔥', 'Перша економічна криза на шляху імперії.');
  if (state.fin && state.fin.defaultDay) { chron('default', '💥', 'Дефолт: борги реструктуризовано.'); if (state.cash > 0 && state.day - state.fin.defaultDay > 60 && rating() !== 'D') chron('recovery', '🌅', 'Відродження після дефолту.'); }
  if (state.pol && state.pol.me.party) chron('party', '🗳️', `Засновано партію «${(myParty() || {}).name}».`);
  if (state.pol && (state.pol.me.office || state.pol.me.posts.length || (state.pol.president && state.pol.president.ally))) chron('power', '🏛️', 'Отримано політичну владу.');
  if (state.life && state.life.gen > 1) chron('gen' + state.life.gen, '👑', `Імперію очолило покоління №${state.life.gen}: ${state.me.name}.`);
  if (state.cities && state.cities.custom) chron('city', '🏙️', `Засновано місто «${state.cities.custom.name}».`);
}

// ================= 7. Довгострокові цілі =================
const GOALS = [
  { id: 'magnate', icon: '👑', name: 'Магнат', cond: 'Капітал $1 млрд', prog: () => netWorth() / 1e9, reward: 'Титул «Магнат», кредити −0,5 п.п.' },
  { id: 'monopolist', icon: '🏰', name: 'Монополіст', cond: '60% ринку формату в місті (ринок від 10 точок)', prog: () => { if (typeof marketShares !== 'function') return 0; let m = 0; for (const x of Object.values(marketShares())) if (x.n >= 10) m = Math.max(m, (x.by.player || 0) / x.total); return m / 0.6; }, reward: 'Титул «Монополіст», оптові закупівлі −3%' },
  { id: 'banker', icon: '🏦', name: 'Банкір', cond: 'Власний банк з активами $10 млрд', prog: () => (state.bank && state.bank.open ? (state.bank.loans + state.bank.capital) / 1e10 : 0), reward: 'Титул «Банкір», купон ваших облігацій −0,5 п.п.' },
  { id: 'industrialist', icon: '🏭', name: 'Індустріаліст', cond: '20 діючих заводів', prog: () => state.fac.filter((f) => f.kind !== 'office' && f.kind !== 'bankbranch').length / 20, reward: 'Титул «Індустріаліст», заводи +5% продуктивності' },
  { id: 'politician', icon: '🎖️', name: 'Політик', cond: 'Посада президента (ваша або вашої людини)', prog: () => (state.pol && state.pol.president && (state.pol.president.player || state.pol.president.ally) ? 1 : state.pol && state.pol.me.party ? 0.5 : 0), reward: 'Титул «Політик», +0,5 політ. капіталу щодня' },
  { id: 'globalist', icon: '🌐', name: 'Глобаліст', cond: 'Працювати в 9 містах', prog: () => new Set([...state.biz, ...state.fac].map((u) => lotCityId(lotOf(u)))).size / 9, reward: 'Титул «Глобаліст», логістика −10%' },
  { id: 'mediamogul', icon: '📡', name: 'Медіамагнат', cond: '50% медіавпливу', prog: () => (state.media ? state.media.influence / 50 : 0), reward: 'Титул «Медіамагнат», схвалення +5' },
  { id: 'dynasty3', icon: '👪', name: 'Династія', cond: '3 покоління', prog: () => (state.life ? state.life.gen / 3 : 0), reward: 'Титул «Патріарх династії»' },
  { id: 'legend', icon: '🌟', name: 'Легенда', cond: 'Імперія вартістю $1 трлн', prog: () => netWorth() / 1e12, reward: 'Титул «Легенда», схвалення +10' },
];
const goalDone = (id) => !!(state.goals && state.goals[id]);
function goalsDaily() {
  if (!state.goals) state.goals = {};
  for (const g of GOALS) {
    if (state.goals[g.id]) continue;
    let p = 0; try { p = g.prog(); } catch (e) { p = 0; }
    if (p >= 1) { state.goals[g.id] = state.day; notify('opp', 'goal-' + g.id, `🏆 Ціль «${g.name}» виконано! Нагорода: ${g.reward}.`, 'goals', 9999); chron('goal-' + g.id, g.icon, `Досягнуто ціль «${g.name}».`); }
  }
  if (goalDone('politician') && state.pol) state.pol.me.pc = Math.min(500, state.pol.me.pc + 0.5);
}
const playerTitle = () => { const t = GOALS.filter((g) => goalDone(g.id)).pop(); return t ? t.name : null; };

function stage10Daily() { notifState(); chronDaily(); goalsDaily(); ceoBrainDaily(); scanNotifications(); }
HOOKS.day.push(stage10Daily);
