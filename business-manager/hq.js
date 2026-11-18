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
  compliance: { icon: '⚖️', name: 'Комплаєнс і антимонопольний контроль', exec: 'Комплаєнс-директор', salary: 1200,
    desc: 'Щодня перевіряє ваші частки ринків, зупиняє розширення понад заданий ліміт, піднімає надто низькі ціни там, де частка висока (ризик справи про демпінг), наймає юристів при відкритті справи. Знижує ризик справ і штрафи.' },
  ma: { icon: '🦈', name: 'Поглинання конкурентів', exec: 'Директор з M&A', salary: 1500,
    desc: 'Раз на тиждень викуповує найслабшого конкурента у ваших галузях, якщо вистачає бюджету.' },
};

function hqState() {
  if (!state.hq) state.hq = { founded: false, on: {}, log: [], last: {}, opts: {} };
  state.hq.opts = Object.assign({ expansionBudget: 0.1, maBudget: 0.25, retailMode: 'market', repairAt: 70, maxLevel: 3, prodSwitch: true, ads: true, interior: true, reserve: 0, shareCap: 1, expandType: 'all', expandCity: 'all', expandEvery: 3, autoLoan: false, repayMult: 3, wagePolicy: 1, moraleAt: 45, maSector: 'own', hrAgency: false }, state.hq.opts);
  if (!state.hq.stats) state.hq.stats = {};
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
    const O = hqState().opts;
    for (const f of state.fac) {
      if (f.kind === 'office' || ceoRuns(f)) continue;
      f.autoBuy = true;
      hired += managerHire(f, maxStaff(f) - staffOf(f).length);
      if (f.cond < O.repairAt || f.broken) { const c = repairCost(f); if (state.cash > c * 3) { repairFac(f, true); repaired++; } }
      const F = FACILITIES[f.kind];
      if (O.prodSwitch && F.recipes.length > 1) {
        const score = (r) => r.rate * sellPrice(r.out) - sum(Object.entries(r.in), ([g, q]) => q * r.rate * buyPrice(g));
        const best = F.recipes.reduce((a, b) => (score(b) > score(a) ? b : a));
        if (best.id !== f.recipe) { f.recipe = best.id; ensureAutoSell(f); switched++; }
      }
      if (f.level < O.maxLevel && freeCash() > facUpgradeCost(f) * 8) { const c = facUpgradeCost(f); book('capex', -c); f.invested += c; f.bookVal += c; f.level++; upgraded++; }
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
      if (ceoRuns(b)) continue;
      if (!b.manager) { b.manager = true; mgr++; }
      b.priceMode = H.opts.retailMode;
      if (H.opts.ads && b.yest && b.yest.profit > CAMPAIGNS.social.cost * priceLvl() * 4 && !b.marketing.social) { b.marketing.social = true; ads++; }
      if (H.opts.interior && b.rep < 65 && b.upg.interior < MAX_UPG && freeCash() > upgradeCost(b, 'interior') * 5) { upgradeBiz(b, 'interior'); upg++; }
    }
    if (mgr + ads + upg) hqLog('retail', `призначено керуючих ${mgr}, запущено реклами ${ads}, оновлено інтер’єрів ${upg}`);
  },
  expansion() {
    const O = hqState().opts;
    if (state.day % O.expandEvery) return;
    const budget = freeCash() * O.expansionBudget;
    const shares = O.shareCap < 1 && typeof marketShares === 'function' ? marketShares() : {};
    let best = null;
    for (const l of state.lots) {
      if (l.owner || l.npc || DMAP[l.district].zone !== 'retail' || !state.unlocked[lotCityId(l)]) continue;
      if (O.expandCity !== 'all' && lotCityId(l) !== O.expandCity) continue;
      for (const [k, T] of Object.entries(TYPES)) {
        if (T.dynamic) continue;
        if (O.expandType !== 'all' && k !== O.expandType) continue;
        const sb = typeof subOfType === 'function' ? subOfType(k) : null; if (sb && sb.ceo && sb.opts.expand) continue; // цим напрямом розширюється CEO дочірньої
        const M = shares[lotCityId(l) + '|' + k]; if (M && M.n >= 3 && (M.by.player || 0) / M.total >= O.shareCap) continue;
        if (typeof isBanned === 'function' && isBanned(k, lotCityId(l))) continue;
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
    const O = hqState().opts;
    for (const l of [...state.loans]) if (freeCash() > l.amount * O.repayMult) { repayLoan(l.id); paid++; }
    if (O.autoLoan && state.cash < 0) { const need = Math.ceil(-state.cash * 1.2 / 1000) * 1000; takeLoan(need); hqLog('finance', `касовий розрив: залучено кредит ${money(need)}`); }
    const last = state.ledger[state.ledger.length - 1];
    if (paid) hqLog('finance', `погашено кредитів: ${paid}`);
    else if (last && last.profit < 0 && chance(0.3)) hqLog('finance', `увага: учорашній збиток ${money(last.profit)}`);
  },
  hr() {
    let raised = 0;
    const O = hqState().opts;
    for (const p of state.staff) if (p.wage < marketWage(p) * 0.97 * O.wagePolicy || p.morale < O.moraleAt) { p.wage = +Math.max(p.wage * 1.08, marketWage(p) * O.wagePolicy).toFixed(1); p.morale = Math.min(100, p.morale + 10); raised++; }
    for (const f of state.fac) if (f.strike) bonusAll(f);
    if (raised) hqLog('hr', `підвищено зарплати ${raised} працівникам`);
  },
  ma() {
    if (state.day % 7) return;
    const budget = freeCash() * hqState().opts.maBudget;
    const sectors = new Set([...state.biz.map((b) => b.type), ...state.fac.map((f) => ({ steelmill: 'steel', refinery: 'oil', oilwell: 'oil', powerplant: 'energy', logistics: 'logistics', office: 'tech', carplant: 'dealership' }[f.kind])).filter(Boolean)]);
    const ms = hqState().opts.maSector;
    const targets = aliveCos().filter((c) => !isSub(c) && (ms === 'any' || sectors.has(c.sector)) && takeoverPrice(c) <= budget).sort((a, b) => coMcap(a) - coMcap(b));
    if (!targets.length) return;
    const t = targets[0], price = takeoverPrice(t);
    acquireCompany(t.id);
    if (isSub(t)) hqLog('ma', `поглинуто «${t.name}» за ${moneyK(price)}`);
  },
};

/** Готівка, доступна директорам: за вирахуванням резерву, заданого фінансовим директором. */
const freeCash = () => Math.max(0, state.cash - (hqState().opts.reserve || 0) * priceLvl());
/** Об’єктом керує CEO дочірньої компанії — штаб його не чіпає. */
const ceoRuns = (u) => { const s = typeof subOfUnit === 'function' ? subOfUnit(u) : null; return !!(s && s.ceo); };
HQ_RUN.compliance = function () {
  const H = hqState(), O = H.opts, G = govState();
  const M = typeof marketShares === 'function' ? marketShares() : {};
  const risky = [];
  let raised = 0;
  for (const m of Object.values(M)) {
    const sh = (m.by.player || 0) / m.total; if (m.n < 4 || sh < 0.3) continue;
    risky.push({ key: m.key, share: sh });
    for (const b of state.biz.filter((x) => x.type === m.type && lotCityId(lotOf(x)) === m.city)) if (b.priceMode === 'cheap' || bizPriceRatio(b) < 0.9) { b.priceMode = 'market'; raised++; }
  }
  H.risk = risky.sort((a, b) => b.share - a.share).slice(0, 12);
  if (G.cases.some((c) => c.target === 'player' && c.stage === 'investigation') && G.lawFirm < 1) { G.lawFirm = 1; hqLog('compliance', 'відкрито справу — найнято юридичну фірму'); }
  if (raised) hqLog('compliance', `ціни в ${raised} магазинах на ринках з високою часткою підняті до ринкових (ризик демпінгу)`);
  if (state.day % 7 === 0 && risky.length) hqLog('compliance', `ринків із часткою понад 30%: ${risky.length} (найбільша — ${marketName(risky[0].key)}, ${Math.round(risky[0].share * 100)}%)`);
  if (O.shareCap > 0.45) O.shareCap = 0.45; // комплаєнс не дозволяє розширюватися понад 45%
};
function hqDaily() {
  const H = hqState();
  if (!H.founded) return;
  for (const k of Object.keys(DIRECTIVES)) {
    if (!H.on[k]) continue;
    book('depts', -directiveSalary(k));
    H.stats[k] = (H.stats[k] || 0) + 1;
    try { HQ_RUN[k](); } catch (e) { console.error(e); }
  }
}
HOOKS.day.push(hqDaily);
