'use strict';
/* БІЗНЕС ІМПЕРІЯ — корпорації (оновлення 2), розширює holdco.js.
   Риси CEO (чесність, лояльність, амбітність, вік); репутація бренду кожної дочірньої (впливає на покупців
   і ефективність); корпоративні конфлікти з рішеннями гравця; реальні витрати на утримання філій
   (регіональні офіси, адміністрування мережі); злиття ІІ-компанії з вашою дочірньою (оплата грошима
   + акціями «дочки»); створення компанії з нуля — CEO будує й заводи свого напряму. */

const TRAIT_TXT = { honesty: 'чесність', loyalty: 'лояльність', ambition: 'амбітність' };
function corp2State() { if (!state.corp2) state.corp2 = { conflicts: [], seq: 1, overheadDay: 0 }; return state.corp2; }
function ceoFill(c) { if (!c) return c; if (c.honesty == null) { c.honesty = ri(2, 5); c.loyalty = ri(55, 85); c.ambition = ri(1, 5); c.age = ri(35, 60); } return c; }
const subBrand = (s) => (s.brand == null ? (s.brand = 50) : s.brand);

// ---------- Утримання філій ----------
/** Регіональний офіс у кожному місті присутності + адміністрування мережі (росте з кількістю об’єктів). */
function overheadOf(units) {
  const cities = new Set(units.map((u) => lotCityId(lotOf(u))));
  const offices = sum([...cities], (c) => 900 * CITIES[c].rent * state.econ.priceLevel);
  const network = units.length > 3 ? Math.pow(units.length - 3, 1.15) * 120 * priceLvl() : 0;
  return { cities: cities.size, offices, network, total: offices + network };
}
function overheadDaily() {
  const G = groupState();
  let tot = 0;
  for (const s of G.subs) { const o = overheadOf(subUnits(s)); s.overhead = o.total; tot += o.total; }
  const direct = [...state.biz, ...state.fac].filter((u) => !subOfUnit(u));
  const od = overheadOf(direct); tot += od.total;
  corp2State().parentOverhead = od.total;
  if (tot > 0) book('overhead', -tot);
}

// ---------- Бренд ----------
function brandCampaign(id) {
  const s = subById(id); if (!s) return;
  const c = Math.round(2e5 * priceLvl() * (1 + subUnits(s).length / 10)); if (state.cash < c) return toast(`Кампанія коштує ${moneyK(c)}.`, 'bad');
  book('marketing', -c); s.brand = Math.min(100, subBrand(s) + 8);
  subLog(s, `брендова кампанія: репутація бренду ${Math.round(s.brand)}`);
}
function brandDaily(s) {
  const us = subUnits(s), b = subBrand(s);
  const reps = us.filter((u) => u.rep != null);
  const target = clamp(40 + (reps.length ? (sum(reps, (u) => u.rep) / reps.length - 50) * 0.6 : 0) + (s.ceo ? s.ceo.skill * 2 : 0) - s.violations * 5 + (state.media ? (state.media.corpRep - 50) * 0.2 : 0), 5, 95);
  s.brand = clamp(b + (target - b) * 0.01, 0, 100);
}

// ---------- Конфлікти ----------
const CONFLICTS = {
  raise: { icon: '💼', gen(s) { return `CEO «${s.name}» ${s.ceo.name} вимагає підвищення зарплати на 30%, інакше розгляне пропозиції конкурентів.`; },
    opts: [['accept', 'Погодитись (+30% зарплати)'], ['bonus', 'Разовий бонус (20 зарплат)'], ['refuse', 'Відмовити']] },
  poach: { icon: '🦈', gen(s, x) { return `«${x.coName}» пропонує ${s.ceo.name} (CEO «${s.name}») посаду з подвійною зарплатою.`; },
    opts: [['counter', 'Контрпропозиція (+50% зарплати й бонус)'], ['let', 'Відпустити']] },
  budget: { icon: '⚔️', gen(s, x) { return `Конфлікт CEO: «${s.name}» і «${x.otherName}» обидва вимагають додаткового бюджету розвитку ${moneyK(x.amount)}.`; },
    opts: [['a', 'Віддати першій'], ['b', 'Віддати другій'], ['split', 'Поділити навпіл']] },
  minority: { icon: '📉', gen(s) { return `Міноритарні акціонери «${s.name}» незадоволені збитками й вимагають заміни CEO або виплати компенсації.`; },
    opts: [['fire', 'Замінити CEO'], ['pay', 'Виплатити компенсацію'], ['ignore', 'Ігнорувати']] },
  fraud: { icon: '🕵️', gen(s, x) { return `Внутрішній аудит «${s.name}»: CEO ${s.ceo.name} підозрюється у виведенні ${moneyK(x.amount)}.`; },
    opts: [['sue', 'Звільнити й подати до суду'], ['hush', 'Звільнити тихо'], ['ignore', 'Не реагувати']] },
  union: { icon: '✊', gen(s) { return `Профспілка працівників «${s.name}» вимагає підвищення зарплат на 10% і погрожує страйком.`; },
    opts: [['accept', 'Підвищити зарплати'], ['refuse', 'Відмовити']] },
};
function addConflict(type, s, extra = {}) {
  const C = corp2State();
  if (C.conflicts.some((c) => c.sub === s.id && c.type === type)) return;
  C.conflicts.push({ id: 'cf' + (C.seq++), type, sub: s.id, day: state.day, until: state.day + 7, text: CONFLICTS[type].gen(s, extra), ...extra });
}
function resolveConflict(id, opt) {
  const C = corp2State(), c = C.conflicts.find((x) => x.id === id); if (!c) return;
  C.conflicts = C.conflicts.filter((x) => x !== c);
  const s = subById(c.sub); if (!s) return;
  const ceo = ceoFill(s.ceo), sal = ceo ? ceoSalary(ceo) : 0;
  const quit = (why) => { if (!s.ceo) return; subLog(s, `CEO ${s.ceo.name} пішов: ${why}`); news(`🚪 CEO «${s.name}» ${s.ceo.name} залишає компанію (${why}).`, 'corp', 'bad'); s.ceo = null; s.brand = Math.max(0, subBrand(s) - 4); };
  if (c.type === 'raise') {
    if (opt === 'accept' && ceo) { ceo.salary = Math.round(ceo.salary * 1.3); ceo.loyalty = Math.min(100, ceo.loyalty + 15); }
    else if (opt === 'bonus' && ceo) { book('depts', -sal * 20); ceo.loyalty = Math.min(100, ceo.loyalty + 8); }
    else if (ceo) { ceo.loyalty -= 25; if (ceo.loyalty < 35 || chance(0.25)) quit('відмова в підвищенні'); }
  } else if (c.type === 'poach') {
    if (opt === 'counter' && ceo) { ceo.salary = Math.round(ceo.salary * 1.5); book('depts', -sal * 15); ceo.loyalty = Math.min(100, ceo.loyalty + 20); }
    else { quit(`перейшов до «${c.coName}»`); const co = coById(c.co); if (co) co.eff = Math.min(1.5, co.eff * 1.04); }
  } else if (c.type === 'budget') {
    const o = subById(c.other);
    if (opt === 'a') { s.budget += c.amount; if (o && o.ceo) { ceoFill(o.ceo).loyalty -= 12; } }
    else if (opt === 'b') { if (o) o.budget += c.amount; if (s.ceo) ceo.loyalty -= 12; }
    else { s.budget += c.amount / 2; if (o) o.budget += c.amount / 2; if (s.ceo) ceo.loyalty -= 4; if (o && o.ceo) ceoFill(o.ceo).loyalty -= 4; }
  } else if (c.type === 'minority') {
    if (opt === 'fire') { if (s.ceo) { book('depts', -sal * 30); subLog(s, `CEO ${s.ceo.name} замінено на вимогу акціонерів`); s.ceo = null; } }
    else if (opt === 'pay') { const v = subValue(s) * s.float * 0.03; book('dividendsOut', -v); log(`📉 Компенсація міноритаріям «${s.name}»: ${money(v)}.`); }
    else { s.brand = Math.max(0, subBrand(s) - 6); s.float = Math.min(0.49, s.float); news(`📉 Акціонери «${s.name}» публічно критикують ${state.company}.`, 'market', 'bad'); }
  } else if (c.type === 'fraud') {
    if (opt === 'sue') { const rec = c.amount * 0.5; book('legal', rec); s.brand = Math.max(0, subBrand(s) - 4); news(`⚖️ ${state.company} звільнила CEO «${s.name}» і через суд повернула ${moneyK(rec)}.`, 'corp'); s.ceo = null; }
    else if (opt === 'hush') { s.ceo = null; if (chance(0.3)) { s.brand = Math.max(0, subBrand(s) - 12); news(`🗞️ Витік: керівництво «${s.name}» приховало розкрадання.`, 'business', 'bad', true); } }
    else { book('crimeLoss', -c.amount); s.brand = Math.max(0, subBrand(s) - 3); }
  } else if (c.type === 'union') {
    const us = subUnits(s);
    if (opt === 'accept') { for (const p of state.staff.filter((p) => us.some((u) => u.id === p.unit))) { p.wage = +(p.wage * 1.1).toFixed(1); p.morale = Math.min(100, p.morale + 15); } }
    else { for (const u of us) if (u.kind) u.strike = ri(2, 4); s.brand = Math.max(0, subBrand(s) - 3); log(`✊ Страйк на заводах «${s.name}».`, 'bad'); }
  }
}
function conflictsDaily() {
  const C = corp2State(), G = groupState();
  for (const c of [...C.conflicts]) if (c.until <= state.day) resolveConflict(c.id, CONFLICTS[c.type].opts[CONFLICTS[c.type].opts.length - 1][0]); // мовчання = останній варіант
  for (const s of G.subs) {
    const ceo = ceoFill(s.ceo);
    brandDaily(s);
    if (!ceo) continue;
    ceo.loyalty = clamp(ceo.loyalty + (s.hist.length && s.hist[s.hist.length - 1].p > 0 ? 0.03 : -0.03), 0, 100);
    if (state.day % AGE_DAYS === 0) ceo.age++;
    if (ceo.age > 66 && chance(0.004)) { subLog(s, `CEO ${ceo.name} вийшов на пенсію`); s.ceo = null; continue; }
    if (chance(0.004 * ceo.ambition)) addConflict('raise', s);
    if (chance(0.002 * (1 + (100 - ceo.loyalty) / 50) * ceo.skill / 3)) { const co = pick(aliveCos().filter((x) => !isSub(x))); if (co) addConflict('poach', s, { co: co.id, coName: co.name }); }
    if (ceo.honesty <= 2 && chance(0.003 * (3 - ceo.honesty))) {
      const amount = Math.round(Math.max(5e4, subValue(s) * rnd(0.01, 0.04)));
      const found = chance(0.4 + (state.crime ? CSO_LEVELS[state.crime.cso].inv * 0.5 : 0));
      if (found) addConflict('fraud', s, { amount }); else book('crimeLoss', -amount * 0.3);
    }
    if (s.float > 0 && s.hist.length > 30 && sum(s.hist.slice(-30), (h) => h.p) < 0 && chance(0.01)) addConflict('minority', s);
    if (subUnits(s).length >= 5 && chance(0.002)) addConflict('union', s);
  }
  if (G.subs.length >= 2 && chance(0.004)) { const [a, b] = [...G.subs].sort(() => Math.random() - 0.5); if (a.ceo && b.ceo) addConflict('budget', a, { other: b.id, otherName: b.name, amount: Math.round(Math.max(a.budget, b.budget, 1e6 * priceLvl()) * 0.3) }); }
}

// ---------- Злиття з дочірньою ----------
const mergerCost = (co) => Math.round(takeoverPrice(co) * 0.55);
function mergeIntoSub(coId, subId) {
  const co = coById(coId), s = subById(subId); if (!co || !s || isSub(co)) return;
  if (s.float + 0.15 > 0.49) return toast('У дочірньої замало акцій для обміну (вільний обіг понад 34%).', 'bad');
  const cash = mergerCost(co); if (state.cash < cash) return toast(`Грошова частина угоди: ${moneyK(cash)}.`, 'bad');
  const review = typeof reviewMerger === 'function' ? reviewMerger('player', co) : { ok: true };
  if (!review.ok) return toast(`АМКУ заблокував злиття: ${review.reason}.`, 'bad');
  book('shares', -cash);
  delete state.portfolio[co.id];
  co.owner = 'player'; co.payout = 1; co.boughtFor = cash; co.boughtDay = state.day; co.parentSub = s.id; co.eff = Math.min(1.6, co.eff * 1.05);
  s.float = +(s.float + 0.15).toFixed(2); s.brand = Math.min(100, subBrand(s) + 5);
  news(`🤝 Злиття: «${co.name}» об’єднується з «${s.name}» (група ${state.company}). Угода: ${moneyK(cash)} грошима + 15% акцій «${s.name}».`, 'corp', 'good', true);
  checkAchievements();
}

// ---------- Компанія з нуля: CEO будує заводи свого напряму ----------
function buildFacilitiesDaily() {
  for (const s of groupState().subs) {
    if (!s.ceo || !s.opts.expand || !SEGS[s.seg].kinds.length || state.day % 9) continue;
    const left = s.budget - s.spent; if (left <= 0) continue;
    let best = null;
    for (const l of state.lots) {
      if (l.owner || l.npc || DMAP[l.district].zone !== 'industry' || !state.unlocked[lotCityId(l)]) continue;
      for (const k of SEGS[s.seg].kinds) {
        const F = FACILITIES[k]; if (!F || !F.sizes.includes(l.size) || !F.zones.includes('industry') || k === 'bankbranch') continue;
        const cost = facSetupCost(k, l) + lotRent(l) * 7; if (cost > left || cost > state.cash * 0.5) continue;
        const sc = (F.recipes[0] ? F.recipes[0].rate * (GOODS[F.recipes[0].out] ? GOODS[F.recipes[0].out].price : 1) : 1) / cost * rnd(0.8, 1.2);
        if (!best || sc > best.sc) best = { sc, l, k, cost };
      }
    }
    if (!best) continue;
    const n0 = state.fac.length; openFacility(best.l.id, best.k);
    if (state.fac.length > n0) { const f = state.fac[state.fac.length - 1]; s.spent += best.cost; f.manager = true; f.autoBuy = true; managerHire(f, maxStaff(f)); subLog(s, `збудовано ${FACILITIES[best.k].name} (${CITIES[lotCityId(best.l)].name}) за ${moneyK(best.cost)}`); }
  }
}

function corp2Daily() { corp2State(); overheadDaily(); conflictsDaily(); buildFacilitiesDaily(); }
HOOKS.day.push(corp2Daily);
