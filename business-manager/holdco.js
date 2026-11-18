'use strict';
/* БІЗНЕС ІМПЕРІЯ — структура групи: материнська компанія + дочірні компанії за напрямами
   (електроніка, кав’ярні й ресторани, продукти, мода, авто, енергетика, важка промисловість, технології, фарма).
   Кожна дочірня має CEO (навички, стиль, зарплата), бюджет розвитку, власні правила (ціни, штат, ремонти,
   реклама, розширення, межа частки ринку), комплаєнс, звітність, часткове IPO (міноритарії) або повне
   виділення (spin-off) із втратою контролю.

   Антимонопольні правила ті самі, що й для ІІ-корпорацій: частку рахують для всієї групи під вашим
   контролем (>50%). Поділ на дочірні дає: штраф від обороту дочірньої компанії (а не всієї групи),
   окрему історію порушень, примусовий поділ лише однієї дочірньої, пом’якшення за комплаєнс.
   Повністю вивести активи з-під підрахунку можна лише виділенням (продажем контролю). */

const SEGS = {
  electronics: { name: 'Електроніка', icon: '📱', types: ['electronics'], kinds: ['chipfab', 'elecplant'], sector: 'electronics' },
  food: { name: 'Кав’ярні й ресторани', icon: '☕', types: ['coffee', 'fastfood', 'restaurant'], kinds: [], sector: 'coffee' },
  grocery: { name: 'Продукти й агро', icon: '🛒', types: ['grocery'], kinds: ['farm', 'foodplant'], sector: 'grocery' },
  fashion: { name: 'Мода й квіти', icon: '👗', types: ['fashion', 'flowers'], kinds: ['textile'], sector: 'fashion' },
  auto: { name: 'Автомобілі', icon: '🚗', types: ['dealership'], kinds: ['carplant'], sector: 'dealership' },
  energy: { name: 'Енергетика', icon: '⚡', types: [], kinds: ['oilwell', 'gasfield', 'refinery', 'powerplant'], sector: 'energy' },
  heavy: { name: 'Важка промисловість', icon: '🏭', types: [], kinds: ['mine', 'quarry', 'steelmill', 'cementplant', 'logistics'], sector: 'steel' },
  tech: { name: 'Технології', icon: '💻', types: [], kinds: ['office', 'bankbranch'], sector: 'tech' },
  pharma: { name: 'Фармацевтика', icon: '💊', types: [], kinds: ['pharmaplant'], sector: 'pharma' },
};
const CEO_STYLES = {
  aggressive: { name: 'Агресивний', price: 'cheap', expand: 1.5, risk: 1.4, desc: 'низькі ціни й швидке розширення, вищий антимонопольний ризик' },
  balanced: { name: 'Збалансований', price: 'market', expand: 1, risk: 1, desc: 'ринкові ціни, помірне зростання' },
  careful: { name: 'Обережний', price: 'premium', expand: 0.6, risk: 0.6, desc: 'вищі ціни й маржа, повільне зростання, мало претензій регулятора' },
};
const SUB_SETUP = 150000;

function groupState() {
  if (!state.group) state.group = { subs: [], ceoPool: [], seq: 1 };
  return state.group;
}
const subById = (id) => groupState().subs.find((s) => s.id === id);
function subOfUnit(u) {
  if (!state.group) return null;
  for (const s of state.group.subs) { const G = SEGS[s.seg]; if (u.kind ? G.kinds.includes(u.kind) : G.types.includes(u.type)) return s; }
  return null;
}
function subOfType(type) { if (!state.group) return null; return state.group.subs.find((s) => SEGS[s.seg].types.includes(type)) || null; }
const subUnits = (s) => [...state.biz.filter((b) => SEGS[s.seg].types.includes(b.type)), ...state.fac.filter((f) => SEGS[s.seg].kinds.includes(f.kind))];
/** Бонус ефективності юніта від CEO дочірньої компанії. */
function groupMult(u) { const s = subOfUnit(u); if (!s) return 1; return (s.ceo ? 1 + 0.015 * s.ceo.skill : 1) * (0.92 + (s.brand == null ? 50 : s.brand) / 625); }

function makeCEO() {
  const skill = ri(1, 5), style = pick(Object.keys(CEO_STYLES));
  return { id: 'ceo' + (groupState().seq++), name: `${pick(FIRST)} ${pick(LAST)}`, skill, style, salary: Math.round(500 * Math.pow(skill, 1.35)), look: typeof randLook === 'function' ? randLook() : null, honesty: ri(1, 5), loyalty: ri(45, 90), ambition: ri(1, 5), age: ri(32, 62) };
}
const ceoSalary = (c) => Math.round(c.salary * wageLvl());
function refreshCEOs() { const G = groupState(); G.ceoPool = Array.from({ length: 4 }, makeCEO); }

function foundSub(seg, name) {
  const G = groupState(), S = SEGS[seg];
  if (!S || G.subs.some((s) => s.seg === seg)) return toast('Така дочірня компанія вже є.', 'bad');
  const c = Math.round(SUB_SETUP * priceLvl()); if (state.cash < c) return toast(`Реєстрація й структура коштують ${moneyK(c)}.`, 'bad');
  book('capex', -c);
  const s = { id: 'sub' + (G.seq++), seg, name: name || `${state.company.split(' ')[0]} ${S.name}`, ceo: null, budget: 0, spent: 0, opts: { price: 'market', staff: true, repair: true, ads: true, upgrade: true, expand: false, shareCap: 0.35 }, compliance: false, float: 0, violations: 0, founded: state.day, hist: [], log: [] };
  G.subs.push(s);
  log(`🏢 Засновано дочірню компанію «${s.name}» (${S.name}): ${subUnits(s).length} об’єктів переходять під її управління.`, 'good');
  news(`🏢 ${state.company} виділяє напрям «${S.name}» в окрему дочірню компанію «${s.name}».`, 'corp');
  if (!G.ceoPool.length) refreshCEOs();
}
function hireCEO(subId, ceoId) {
  const G = groupState(), s = subById(subId), c = G.ceoPool.find((x) => x.id === ceoId); if (!s || !c) return;
  const bonus = ceoSalary(c) * 20; if (state.cash < bonus) return toast(`Бонус за підписання: ${moneyK(bonus)}.`, 'bad');
  book('depts', -bonus);
  s.ceo = c; s.opts.price = CEO_STYLES[c.style].price; G.ceoPool = G.ceoPool.filter((x) => x !== c);
  subLog(s, `призначено CEO ${c.name} (${CEO_STYLES[c.style].name.toLowerCase()}, навички ${c.skill}/5)`);
}
function fireCEO(subId) { const s = subById(subId); if (!s || !s.ceo) return; const sev = ceoSalary(s.ceo) * 30; book('depts', -sev); subLog(s, `CEO ${s.ceo.name} звільнено (вихідна допомога ${money(sev)})`); s.ceo = null; }
function subLog(s, text) { s.log.unshift({ day: state.day, text }); if (s.log.length > 30) s.log.length = 30; }
function dissolveSub(id) { const G = groupState(); G.subs = G.subs.filter((s) => s.id !== id); log('Дочірню компанію ліквідовано: її об’єкти повернулись під пряме управління.'); }

// ---------- Фінанси дочірньої ----------
function unitPL(u) {
  if (!u.yest) return { rev: 0, p: 0 };
  if (!u.kind) return { rev: u.yest.rev || 0, p: u.yest.profit || 0 };
  const y = u.yest; return { rev: y.value || 0, p: (y.value || 0) - (y.inCost || 0) - (y.wages || 0) - (y.maint || 0) - (y.power || 0) };
}
function subPL(s) { let rev = 0, p = 0; for (const u of subUnits(s)) { const x = unitPL(u); rev += x.rev; p += x.p; } return { rev, p }; }
const subTurnover = (s) => Math.max(1e5, sum(s.hist.slice(-30), (h) => h.rev) / Math.max(1, Math.min(30, s.hist.length)) * 365);
function subValue(s) {
  const assets = sum(subUnits(s), (u) => (u.kind ? facValue(u) : bizValue(u)));
  const prof = s.hist.length ? sum(s.hist.slice(-30), (h) => h.p) / Math.min(30, s.hist.length) : 0;
  return Math.round(assets + Math.max(0, prof) * 365 * 8 * (s.ceo ? 1 + s.ceo.skill * 0.03 : 1));
}
/** Часткове IPO дочірньої: продаж міноритарної частки (контроль зберігається, частина прибутку — міноритаріям). */
function floatSub(id, pct) {
  const s = subById(id); if (!s) return;
  if (s.float + pct > 0.49) return toast('Щоб зберегти контроль, продати можна не більше 49%.', 'bad');
  if (!subUnits(s).length) return toast('У дочірньої ще немає активів.', 'bad');
  const v = Math.round(subValue(s) * pct * 0.95);
  book('equity', v); s.float = +(s.float + pct).toFixed(2);
  news(`🔔 IPO дочірньої компанії «${s.name}»: інвестори купили ${Math.round(pct * 100)}% за ${moneyK(v)}.`, 'market', 'good');
}
/** Виділення (spin-off): продаж контролю — дочірня стає окремою компанією на біржі, ви зберігаєте міноритарну частку. */
function spinOff(id, forced) {
  const G = groupState(), s = subById(id); if (!s) return;
  const units = subUnits(s); if (!units.length) return toast('У дочірньої немає активів.', 'bad');
  const v = subValue(s), keep = forced ? 0.2 : 0.4;
  const ticker = (s.name.replace(/[^A-Za-zА-Яа-яІіЇїЄєҐґ]/g, '').slice(0, 3) + 'X').toUpperCase();
  const co = addCompany(s.name, ticker + G.seq, SEGS[s.seg].sector);
  co.scale = Math.max(0.3, s.hist.length ? sum(s.hist.slice(-30), (h) => h.rev) / Math.min(30, s.hist.length) / (SECTORS[co.sector] ? SECTORS[co.sector].rev : 1e5) : 0.5);
  co.price = Math.max(1, v / co.shares); co.hist = [co.price]; co.cash = v * 0.1; co.spun = state.day;
  for (const u of units) {
    const lot = lotOf(u);
    state.staff = state.staff.filter((p) => p.unit !== u.id);
    if (u.kind) { state.fac = state.fac.filter((x) => x !== u); lot.npc = { co: co.id, fac: u.kind }; }
    else { state.biz = state.biz.filter((x) => x !== u); lot.npc = { co: co.id, type: u.type }; }
    lot.owner = null; lot.ownerKind = null;
  }
  const cash = Math.round(v * (1 - keep - s.float) * (forced ? 0.75 : 0.95));
  book('assetSale', cash);
  state.portfolio[co.id] = { qty: Math.round(co.shares * keep), cost: co.price };
  G.subs = G.subs.filter((x) => x !== s);
  news(`✂️ ${forced ? 'За рішенням АМКУ ' : ''}${state.company} виділяє «${s.name}» в незалежну компанію (${units.length} об’єктів). Вам — ${moneyK(cash)} і ${Math.round(keep * 100)}% акцій.`, 'corp', forced ? 'bad' : '', true);
  return `примусове виділення «${s.name}»`;
}

// ---------- Щоденне управління (CEO) ----------
function playerShareIn(M) { return M ? (M.by.player || 0) / M.total : 0; }
function subDaily(s) {
  const P = subPL(s);
  s.hist.push({ day: state.day, rev: P.rev, p: P.p }); if (s.hist.length > 120) s.hist.shift();
  if (s.float > 0 && P.p > 0) book('minority', -P.p * s.float);
  if (s.compliance) book('depts', -2500 * priceLvl());
  book('depts', -400 * priceLvl()); // адміністрування юрособи
  const c = s.ceo; if (!c) return;
  book('depts', -ceoSalary(c));
  const St = CEO_STYLES[c.style];
  let hired = 0, repaired = 0, ads = 0, upg = 0;
  const shares = s.compliance || s.opts.expand ? (typeof marketShares === 'function' ? marketShares() : {}) : {};
  for (const u of subUnits(s)) {
    if (s.opts.staff) hired += managerHire(u, Math.max(0, maxStaff(u) - staffOf(u).length));
    if (u.kind) {
      u.autoBuy = true; u.manager = true;
      if (s.opts.repair && (u.cond < 65 || u.broken)) { const rc = repairCost(u); if (state.cash > rc * 3) { repairFac(u, true); repaired++; } }
      if (s.opts.upgrade && u.level < 2 + Math.ceil(c.skill / 2) && state.cash > facUpgradeCost(u) * 10) { const uc = facUpgradeCost(u); book('capex', -uc); u.invested += uc; u.bookVal += uc; u.level++; upg++; }
    } else {
      u.manager = true; u.autoRestock = true;
      let mode = s.opts.price;
      if (s.compliance) { const M = shares[lotCityId(lotOf(u)) + '|' + u.type]; if (M && playerShareIn(M) >= 0.2 && mode === 'cheap') mode = 'market'; }
      u.priceMode = mode;
      if (s.opts.ads && u.yest && u.yest.profit > CAMPAIGNS.social.cost * priceLvl() * 4 && !u.marketing.social) { u.marketing.social = true; ads++; }
      if (s.opts.upgrade && u.rep < 60 && u.upg.interior < MAX_UPG && state.cash > upgradeCost(u, 'interior') * 6) { upgradeBiz(u, 'interior'); upg++; }
    }
  }
  if (hired + repaired + ads + upg) subLog(s, `найнято ${hired}, ремонтів ${repaired}, реклам ${ads}, модернізацій ${upg}`);
  // Розширення в межах бюджету та ліміту частки ринку
  const every = Math.max(2, Math.round(6 / St.expand));
  if (s.opts.expand && SEGS[s.seg].types.length && state.day % every === 0 && s.budget - s.spent > 0) {
    const cap = s.opts.shareCap;
    let best = null;
    for (const l of state.lots) {
      if (l.owner || l.npc || DMAP[l.district].zone !== 'retail' || !state.unlocked[lotCityId(l)]) continue;
      for (const k of SEGS[s.seg].types) {
        const T = TYPES[k]; if (T.dynamic || (T.minSize && SIZE_ORDER.indexOf(l.size) < SIZE_ORDER.indexOf(T.minSize))) continue;
        const M = shares[lotCityId(l) + '|' + k]; if (M && M.n >= 3 && playerShareIn(M) >= cap) continue;
        if (typeof isBanned === 'function' && isBanned(k, lotCityId(l))) continue;
        const cost = setupCost(k, l) + lotRent(l) * 7; if (cost > s.budget - s.spent || cost > state.cash * 0.5) continue;
        const score = (T.aff[l.district] || 0.5) * DMAP[l.district].traffic * cityOfLot(l).traffic * SIZES[l.size].attract * (0.8 + c.skill * 0.08 + rnd(0, 0.2));
        if (!best || score > best.score) best = { score, l, k, cost };
      }
    }
    if (best) { const b = openBusiness(best.l.id, best.k, true); if (b) { s.spent += best.cost; b.manager = true; b.priceMode = s.opts.price; managerHire(b, 2); managerRetailDay(b); subLog(s, `відкрито «${b.name}» (${CITIES[lotCityId(best.l)].name}) за ${moneyK(best.cost)}`); } }
  }
}
function groupDaily() {
  const G = groupState();
  for (const s of G.subs) try { subDaily(s); } catch (e) { console.error(e); }
  if (state.day % 30 === 0) refreshCEOs();
}

// ---------- Антимонопольна інтеграція ----------
function caseSub(c) { if (c.target !== 'player' || !c.market) return null; return subOfType(c.market.split('|')[1]); }
/** База штрафу: оборот дочірньої компанії (+15% солідарної відповідальності), а не всієї групи. */
function caseTurnover(c) { const s = caseSub(c); return s ? subTurnover(s) * 1.15 : annualTurnover(c.target); }
function caseRepeat(c) { const s = caseSub(c); return s ? s.violations : (govState().violations.player || 0); }
function caseMitigation(c) { const s = caseSub(c); return (s && s.compliance ? 0.8 : 1) * (hqState().on.compliance ? 0.9 : 1); }
/** Ймовірність відкриття справи проти гравця на ринку: комплаєнс і стиль CEO. */
function caseRiskMult(type) {
  const s = subOfType(type);
  let m = 1;
  if (s && s.compliance) m *= 0.55;
  if (s && s.ceo) m *= CEO_STYLES[s.ceo.style].risk;
  if (state.hq && state.hq.on && state.hq.on.compliance) m *= 0.75;
  return m;
}

HOOKS.day.push(groupDaily);
