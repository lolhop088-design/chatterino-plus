'use strict';
/* БІЗНЕС ІМПЕРІЯ — штаб-квартира: директори виконують доручення гравця щодня. */

const HQ_COST = 250000;
const DIRECTIVES = {
  production: { icon: '🏭', name: 'Оптимізувати виробництво', exec: 'Операційний директор', salary: 900,
    desc: 'Укомплектовує штат заводів, ремонтує обладнання, вмикає автопостачання, обирає найприбутковішу продукцію й модернізує заводи, коли вистачає грошей.' },
  rnd: { icon: '🔬', name: 'Розробка й інновації', exec: 'Технічний директор', salary: 1000,
    desc: 'Наймає програмістів, тримає IT-офіси завантаженими новими проєктами, сам вкладає очки досліджень у найдешевші технології.' },
  retail: { icon: '🛒', name: 'Керувати мережею магазинів', exec: 'Директор роздрібу', salary: 800,
    desc: 'Призначає керуючих у всі магазини (їхня зарплата окремо), тримає цінову політику, вмикає рекламу в прибуткових магазинах, оновлює інтер’єр при низькій репутації.' },
  expansion: { icon: '🗺️', name: 'Розширювати мережу', exec: 'Директор з розвитку', salary: 1100,
    desc: 'Раз на 3 дні відкриває магазин на найкращій вільній ділянці у ваших містах (попит району, потік, конкуренти) у межах бюджету.' },
  finance: { icon: '🏦', name: 'Фінансовий контроль', exec: 'Фінансовий директор', salary: 900,
    desc: 'Гасить кредити, коли готівки втричі більше за борг; попереджає про від’ємні грошові потоки.' },
  hr: { icon: '🧑‍💼', name: 'Кадрова політика', exec: 'HR-директор', salary: 700,
    desc: 'Підтягує зарплати до ринкових, підвищує ставки працівникам із низькою мораллю, щоб не було звільнень і страйків.' },
  ma: { icon: '🦈', name: 'Поглинання конкурентів', exec: 'Директор з M&A', salary: 1500,
    desc: 'Раз на тиждень викуповує найслабшого конкурента у ваших галузях, якщо вистачає бюджету.' },
};

function hqState() {
  if (!state.hq) state.hq = { founded: false, on: {}, log: [], last: {}, opts: { expansionBudget: 0.1, maBudget: 0.25, retailMode: 'market' } };
  return state.hq;
}
function hqLog(key, text) {
  const H = hqState();
  H.last[key] = `День ${state.day}: ${text}`;
  H.log.unshift({ day: state.day, key, text });
  if (H.log.length > 80) H.log.length = 80;
}
const hqCost = () => Math.round(HQ_COST * priceLvl());
function foundHQ() {
  const H = hqState();
  if (H.founded) return;
  if (state.cash < hqCost()) return toast(`Штаб-квартира коштує ${moneyK(hqCost())}.`, 'bad');
  book('capex', -hqCost());
  H.founded = true;
  news(`🏛️ ${state.company} відкриває штаб-квартиру.`, 'corp', 'good');
  log('🏛️ Штаб-квартиру засновано. Призначте директорів і дайте їм доручення.', 'good');
}
const directiveSalary = (k) => Math.round(DIRECTIVES[k].salary * wageLvl());

// ---------- виконання доручень ----------
const HQ_RUN = {
  production() {
    let hired = 0, repaired = 0, switched = 0, upgraded = 0;
    for (const f of state.fac) {
      if (f.kind === 'office') continue;
      f.autoBuy = true;
      hired += managerHire(f, maxStaff(f) - staffOf(f).length);
      if (f.cond < 70 || f.broken) { const c = repairCost(f); if (state.cash > c * 3) { repairFac(f, true); repaired++; } }
      const F = FACILITIES[f.kind];
      if (F.recipes.length > 1) {
        const score = (r) => r.rate * sellPrice(r.out) - sum(Object.entries(r.in), ([g, q]) => q * r.rate * buyPrice(g));
        const best = F.recipes.reduce((a, b) => (score(b) > score(a) ? b : a));
        if (best.id !== f.recipe) { f.recipe = best.id; ensureAutoSell(f); switched++; }
      }
      if (f.level < 3 && state.cash > facUpgradeCost(f) * 8) { const c = facUpgradeCost(f); book('capex', -c); f.invested += c; f.bookVal += c; f.level++; upgraded++; }
    }
    if (hired + repaired + switched + upgraded) hqLog('production', `найнято ${hired}, відремонтовано ${repaired}, змінено продукцію ${switched}, модернізовано ${upgraded}`);
  },
  rnd() {
    let hired = 0, started = 0, researched = 0;
    for (const f of state.fac.filter((x) => x.kind === 'office')) {
      hired += managerHire(f, maxStaff(f) - staffOf(f).length);
      if (staffOf(f).length && !state.projects.some((p) => p.office === f.id && p.status === 'dev')) {
        const kinds = Object.keys(SOFT).filter((k) => state.tech.it >= SOFT[k].tech);
        const n = staffOf(f).length;
        const k = kinds.includes('os') && n >= 20 ? 'os' : kinds.includes('cloud') && n >= 8 ? 'cloud' : kinds.includes('engine') && n >= 10 ? 'engine' : n >= 4 ? 'game' : 'app';
        startProject(f.id, k, `${SOFT[k].name} ${state.company.split(' ')[0]} ${state.projects.length + 1}`); started++;
      }
    }
    for (let guard = 0; guard < 10; guard++) {
      const f = Object.keys(RESEARCH).reduce((a, b) => (researchCost(b) < researchCost(a) ? b : a));
      if (state.tech.points < researchCost(f)) break;
      state.tech.points -= researchCost(f); state.tech[f]++; researched++;
    }
    if (hired + started + researched) hqLog('rnd', `найнято програмістів ${hired}, нових проєктів ${started}, досліджень ${researched}`);
  },
  retail() {
    const H = hqState();
    let mgr = 0, ads = 0, upg = 0;
    for (const b of state.biz) {
      if (!b.manager) { b.manager = true; mgr++; }
      b.priceMode = H.opts.retailMode;
      if (b.yest && b.yest.profit > CAMPAIGNS.social.cost * priceLvl() * 4 && !b.marketing.social) { b.marketing.social = true; ads++; }
      if (b.rep < 65 && b.upg.interior < MAX_UPG && state.cash > upgradeCost(b, 'interior') * 5) { upgradeBiz(b, 'interior'); upg++; }
    }
    if (mgr + ads + upg) hqLog('retail', `призначено керуючих ${mgr}, запущено реклами ${ads}, оновлено інтер’єрів ${upg}`);
  },
  expansion() {
    if (state.day % 3) return;
    const budget = state.cash * hqState().opts.expansionBudget;
    let best = null;
    for (const l of state.lots) {
      if (l.owner || l.npc || DMAP[l.district].zone !== 'retail' || !state.unlocked[lotCityId(l)]) continue;
      for (const [k, T] of Object.entries(TYPES)) {
        if (T.dynamic) continue;
        if (T.minSize && SIZE_ORDER.indexOf(l.size) < SIZE_ORDER.indexOf(T.minSize)) continue;
        const cost = setupCost(k, l) + lotRent(l) * 7;
        if (cost > budget) continue;
        const comp = state.lots.filter((x) => x.district === l.district && lotCityId(x) === lotCityId(l) && ((x.npc && x.npc.type === k) || (x.ownerKind === 'biz' && bizById(x.owner).type === k))).length;
        const score = (T.aff[l.district] || 0.5) * DMAP[l.district].traffic * cityOfLot(l).traffic * SIZES[l.size].attract / (1 + 0.6 * comp);
        if (!best || score > best.score) best = { score, l, k, cost };
      }
    }
    if (!best) return;
    const b = openBusiness(best.l.id, best.k, true);
    if (!b) return;
    b.manager = true; b.priceMode = hqState().opts.retailMode;
    managerHire(b, 2);
    managerRetailDay(b);
    hqLog('expansion', `відкрито «${b.name}» (${CITIES[lotCityId(best.l)].name}, ${DMAP[best.l.district].name}) за ${moneyK(best.cost)}`);
  },
  finance() {
    let paid = 0;
    for (const l of [...state.loans]) if (state.cash > l.amount * 3) { repayLoan(l.id); paid++; }
    const last = state.ledger[state.ledger.length - 1];
    if (paid) hqLog('finance', `погашено кредитів: ${paid}`);
    else if (last && last.profit < 0 && chance(0.3)) hqLog('finance', `увага: учорашній збиток ${money(last.profit)}`);
  },
  hr() {
    let raised = 0;
    for (const p of state.staff) if (p.wage < marketWage(p) * 0.97 || p.morale < 45) { p.wage = +Math.max(p.wage * 1.08, marketWage(p)).toFixed(1); p.morale = Math.min(100, p.morale + 10); raised++; }
    for (const f of state.fac) if (f.strike) bonusAll(f);
    if (raised) hqLog('hr', `підвищено зарплати ${raised} працівникам`);
  },
  ma() {
    if (state.day % 7) return;
    const budget = state.cash * hqState().opts.maBudget;
    const sectors = new Set([...state.biz.map((b) => b.type), ...state.fac.map((f) => ({ steelmill: 'steel', refinery: 'oil', oilwell: 'oil', powerplant: 'energy', logistics: 'logistics', office: 'tech', carplant: 'dealership' }[f.kind])).filter(Boolean)]);
    const targets = aliveCos().filter((c) => !isSub(c) && sectors.has(c.sector) && takeoverPrice(c) <= budget).sort((a, b) => coMcap(a) - coMcap(b));
    if (!targets.length) return;
    const t = targets[0], price = takeoverPrice(t);
    acquireCompany(t.id);
    if (isSub(t)) hqLog('ma', `поглинуто «${t.name}» за ${moneyK(price)}`);
  },
};

function hqDaily() {
  const H = hqState();
  if (!H.founded) return;
  for (const k of Object.keys(DIRECTIVES)) {
    if (!H.on[k]) continue;
    book('depts', -directiveSalary(k));
    try { HQ_RUN[k](); } catch (e) { console.error(e); }
  }
}
HOOKS.day.push(hqDaily);
