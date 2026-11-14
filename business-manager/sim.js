'use strict';
/* БІЗНЕС ІМПЕРІЯ — симуляція: роздріб (щогодини), виробництво, ринок, ІІ-компанії,
   біржа, нерухомість, IT, авто, особисте життя, макроекономіка, бухгалтерія (щодня). */

// ================= Множники світу =================
const city = () => CITIES[state.city] || CITIES.kyiv;
const E = () => state.econ;
const priceLvl = () => city().price * state.econ.priceLevel;
const wageLvl = () => city().wage * state.econ.wageLevel;
const rentLvl = () => city().rent * state.econ.housing;
const weekday = (day = state.day) => (day - 1) % 7;
// Багатомістовість: кожна ділянка належить місту; ціни, оренда й потік рахуються за містом ділянки.
const lotCityId = (l) => (l && l.city) || state.city;
const cityOfLot = (l) => CITIES[lotCityId(l)] || city();
const priceAtLot = (l) => state.econ.priceLevel * cityOfLot(l).price;
const priceAt = (u) => (u && u.lotId ? priceAtLot(lotById(u.lotId)) : priceLvl());
const viewCity = () => (state.ui.mapCity && state.unlocked && state.unlocked[state.ui.mapCity] ? state.ui.mapCity : state.city);

// ================= Нова гра =================
function newGame(o = {}) {
  const C = CITIES[o.city] || CITIES.kyiv;
  state = {
    v: 2, company: o.company || 'Моя компанія', city: o.city || 'kyiv',
    me: { name: o.name || 'Підприємець', look: o.look || { skin: AVATAR.skin[1], hair: AVATAR.hair[0], shirt: AVATAR.shirt[0], style: 'short' }, job: null, jobDays: 0, home: 'room', homeProp: null, skills: { business: 1, coding: 0, management: 0 }, credit: 620 },
    cash: 4000, day: 1, hour: 6, speed: 1,
    econ: { phase: 'growth', phaseDays: ri(40, 80), growth: 2.5, inflation: 4, rate: 6.5, unemployment: 7, priceLevel: 1, wageLevel: 1, housing: 1, demand: 1, fx: 41, taxRate: C.tax, power: 80, hist: [] },
    market: {}, lots: [], biz: [], fac: [], staff: [], candidates: [], loans: [], mods: [], props: [], projects: [], carModels: [],
    wh: { goods: {} }, autoSell: {}, orders: [], companies: [], portfolio: {}, ipo: null,
    depts: { hr: 0, accounting: 0, legal: 0, rnd: 0, marketing: 0, sales: 0 },
    tech: { points: 0, retail: 0, industry: 0, auto: 0, it: 0 },
    led: {}, ledger: [], invPrev: 0, history: [], log: [], news: [], achievements: {}, flags: {}, over: false, negDays: 0,
    ui: { view: 'dashboard', bizId: null, facId: null, tab: 'overview', lot: null },
  };
  for (const g of Object.keys(GOODS)) state.market[g] = { mult: rnd(0.9, 1.1) };
  genCompanies();
  genLots();
  genProps();
  migrateState();
  for (let i = 0; i < 10; i++) state.candidates.push(makeCandidate());
  state.invPrev = inventoryValue();
  log(`Ласкаво просимо до міста ${C.name}, ${state.me.name}! На рахунку ${money(state.cash)}.`, 'good');
  log('Грошей на бізнес поки замало: влаштуйтесь на роботу («Життя»), візьміть кредит або почніть з квіткової крамниці.');
  news(`Економіка міста ${C.name}: ріст ${state.econ.growth}% , інфляція ${state.econ.inflation}%, облікова ставка ${state.econ.rate}%.`, 'econ');
}

function genCompanies() {
  for (const [name, ticker, sector] of COMPANY_SEED) addCompany(name, ticker, sector);
}
function addCompany(name, ticker, sector) {
  const S = SECTORS[sector], scale = rnd(0.5, 2);
  const daily = S.rev * scale * S.margin;
  const mcap = daily * 365 * S.pe * rnd(0.8, 1.2);
  const price = rnd(18, 260);
  const co = { id: ticker, name, ticker, sector, scale, cash: S.rev * scale * rnd(20, 60), shares: Math.round(mcap / price), price, ema: daily, hist: [price], alive: true, rep: rnd(0.8, 1.2), eff: rnd(0.85, 1.15), born: state.day };
  state.companies.push(co);
  return co;
}
const coById = (id) => state.companies.find((c) => c.id === id);
const aliveCos = () => state.companies.filter((c) => c.alive);

function genLots(cityId = state.city, prefix = '') {
  for (const d of DISTRICTS) {
    for (let i = 0; i < 12; i++) {
      const r = Math.random();
      const size = d.zone === 'industry' ? (r < 0.15 ? 'M' : r < 0.6 ? 'L' : 'XL') : (r < 0.4 ? 'S' : r < 0.75 ? 'M' : 'L');
      const street = pick(d.streets);
      const lot = { id: prefix + d.id + i, city: cityId, district: d.id, idx: i, size, addr: street.endsWith('№') ? `${street}${ri(1, 30)}` : `${street}, ${ri(1, 140)}`, npc: null, owner: null, ownerKind: null };
      populateCompetitor(lot);
      state.lots.push(lot);
    }
  }
}

/** Із певною ймовірністю віддає вільну ділянку під точку ІІ-компанії відповідної галузі. */
function populateCompetitor(lot, pRetail = 0.35, pIndustry = 0.3) {
  const d = DMAP[lot.district];
  if (d.zone === 'retail' && chance(pRetail)) {
    const types = Object.keys(TYPES).filter((t) => (d.id !== 'hills' || t !== 'fastfood') && (!TYPES[t].minSize || SIZE_ORDER.indexOf(lot.size) >= SIZE_ORDER.indexOf(TYPES[t].minSize)));
    const t = pick(types), cos = aliveCos().filter((c) => c.sector === t);
    if (cos.length) lot.npc = { co: pick(cos).id, type: t };
  } else if (d.zone === 'industry' && chance(pIndustry)) {
    const cos = aliveCos().filter((c) => FAC_BY_SECTOR[c.sector]);
    if (cos.length) { const co = pick(cos); lot.npc = { co: co.id, fac: FAC_BY_SECTOR[co.sector] }; }
  }
}
const FAC_BY_SECTOR = { steel: 'steelmill', oil: 'refinery', energy: 'powerplant', logistics: 'logistics' };

/** Адмін: відроджує збанкрутілі/поглинуті компанії й знову розселяє конкурентів по вільних ділянках. */
function restoreCompetitors() {
  let revived = 0, placed = 0;
  for (const co of state.companies) {
    if (co.alive) { if (co.cash < 0) co.cash = SECTORS[co.sector].rev * co.scale * 30; continue; }
    const S = SECTORS[co.sector];
    co.alive = true; co.fate = null; co.cash = S.rev * co.scale * rnd(20, 60); co.ema = S.rev * co.scale * S.margin;
    co.price = Math.max(5, (co.ema * 365 * S.pe) / co.shares); co.hist = [co.price];
    revived++;
  }
  for (const l of state.lots) {
    if (l.owner || l.npc) continue;
    populateCompetitor(l);
    if (l.npc) placed++;
  }
  news(`🔔 На ринок повернулися конкуренти: ${placed} нових точок у місті.`, 'corp');
  return { revived, placed };
}

function genProps() {
  const mk = (kind, district, lo, hi) => ({ id: uid(), kind, district, addr: `${pick(DMAP[district].streets)}, ${ri(1, 200)}${kind === 'apartment' ? ', кв. ' + ri(1, 120) : ''}`, base: Math.round(rnd(lo, hi) * DMAP[district].rent / 1.2 / 1000) * 1000, owned: false, rentOut: false, tenant: null, mortgage: null });
  for (let i = 0; i < 10; i++) state.props.push(mk('apartment', pick(['res', 'campus', 'center', 'river', 'biz']), 60000, 150000));
  for (let i = 0; i < 5; i++) state.props.push(mk('house', pick(['hills', 'res', 'hills']), 220000, 600000));
  for (let i = 0; i < 6; i++) state.props.push(mk('office', pick(['biz', 'center', 'biz']), 250000, 900000));
}

const ROLE_MULT = { sales: 1, worker: 0.95, engineer: 1.3, dev: 1.55, manager: 1.6 };
function makeCandidate() {
  const role = pick(['sales', 'sales', 'worker', 'worker', 'engineer', 'dev', 'dev', 'manager']);
  const skill = clamp(+(rnd(1, 4.2) + (chance(0.12) ? 0.8 : 0)).toFixed(1), 1, 5);
  const base = (8 + skill * 3 + rnd(-1.5, 2)) * ROLE_MULT[role];
  const wage = +(base * (state ? wageLvl() * (1 - 0.05 * state.depts.hr) : 1)).toFixed(1);
  return { id: uid(), name: `${pick(FIRST)} ${pick(LAST)}`, role, skill, wage, since: state ? state.day : 1 };
}
const marketWage = (p) => (8 + p.skill * 3 + 0.25) * ROLE_MULT[p.role] * wageLvl();

// ================= Пошук об'єктів =================
const lotById = (id) => state.lots.find((l) => l.id === id);
const lotOf = (u) => lotById(u.lotId);
const bizById = (id) => state.biz.find((b) => b.id === id);
const facById = (id) => state.fac.find((f) => f.id === id);
const unitById = (id) => bizById(id) || facById(id);
const staffOf = (u) => state.staff.filter((p) => p.unit === u.id);
const propById = (id) => state.props.find((p) => p.id === id);
const unitRole = (u) => (u.kind ? FACILITIES[u.kind].role : 'sales');
const effSkill = (p, role) => p.skill * (p.role === role ? 1 : 0.55) * (0.6 + 0.4 * p.morale / 100);
const lotRent = (lot) => Math.round(SIZES[lot.size].m2 * RENT_PER_M2 * DMAP[lot.district].rent * cityOfLot(lot).rent * state.econ.housing);
const debt = () => sum(state.loans, (l) => l.amount);
const modMult = (kind, key) => { let m = 1; for (const md of state.mods) if (md.kind === kind && (md.key == null || md.key === key)) m *= md.mult; return m; };
function maxStaff(u) {
  const S = SIZES[lotOf(u).size];
  if (!u.kind) return S.maxStaff;
  if (u.kind === 'office') return { S: 2, M: 8, L: 16, XL: 40 }[lotOf(u).size];
  return Math.ceil(FACILITIES[u.kind].staff * (1 + 0.5 * (u.level - 1)));
}
const absentPenalty = (u) => (state.me.job && !u.manager ? 0.9 : 1);
const managerCost = () => Math.round(140 * wageLvl());

// ================= Роздріб =================
const storageCap = (b) => Math.round(SIZES[lotOf(b).size].storage * (TYPES[b.type].store || 1) * (b.type === 'dealership' ? 0.02 : 1) * (1 + 0.5 * (b.upg.storage - 1)));
const stockTotal = (b) => sum(Object.values(b.products), (p) => p.stock);
const stockValue = (b) => sum(Object.values(b.products), (p) => p.stock * p.cost);
const openHours = (b) => b.close - b.open;
const dailyWages = (u) => sum(staffOf(u), (p) => p.wage) * (u.kind ? 8 : openHours(u));
const dailyMarketing = (b) => sum(Object.keys(CAMPAIGNS).filter((k) => b.marketing[k]), (k) => CAMPAIGNS[k].cost) * priceLvl();
const upgradeCost = (b, k) => Math.round(TYPES[b.type].setup * SIZES[lotOf(b).size].setup * UPGRADES[k].k * b.upg[k] * priceAt(b));
const setupCost = (type, lot) => Math.round(TYPES[type].setup * SIZES[lot.size].setup * priceAtLot(lot));

function productsOf(b) {
  const T = TYPES[b.type];
  if (T.dynamic !== 'cars') return T.products;
  const ms = state.carModels.filter((m) => m.active);
  const tot = sum(ms, (m) => SEGMENTS[m.seg].demand) || 1;
  return ms.map((m) => ({ id: m.id, name: m.name, cost: m.estCost / priceLvl(), price: m.fairBase, share: SEGMENTS[m.seg].demand / tot, spoil: 0, good: 'car:' + m.id, gq: 1, carOnly: true }));
}
function ensureProducts(b) {
  const S = SIZES[lotOf(b).size];
  for (const p of productsOf(b)) {
    if (!b.products[p.id]) b.products[p.id] = { price: +(p.price * priceAt(b)).toFixed(2), stock: 0, cost: p.cost * priceAt(b), target: Math.max(2, Math.round(storageCap(b) * p.share * 0.6)), sold: 0, soldY: 0 };
  }
  return S;
}
const fairPrice = (p, b) => p.price * (b ? priceAt(b) : priceLvl());
function wholesale(b, p) {
  const T = TYPES[b.type];
  return p.cost * priceAt(b) * modMult('wholesale') * modMult('supplier', b.type) * (T.import ? state.econ.fx / 41 : 1);
}
function competitors(b) {
  const lot = lotOf(b);
  let s = 0;
  for (const l of state.lots) {
    if (l.district !== lot.district || l === lot || lotCityId(l) !== lotCityId(lot)) continue;
    if (l.npc && l.npc.type === b.type) { const co = coById(l.npc.co); if (!isSub(co)) s += co ? co.rep : 1; }
    if (l.ownerKind === 'biz') { const o = bizById(l.owner); if (o && o.type === b.type) s += 1; }
  }
  return s * modMult('pricewar', b.type);
}
function trafficMult(districtId, type, C = city()) {
  let m = (typeof sponsorTraffic === 'function' ? sponsorTraffic() : 1) * modMult('traffic', districtId) * modMult('traffic', '*') * C.traffic * state.econ.demand * (1 + 0.03 * state.depts.marketing);
  if (C.tourism && (districtId === 'center' || districtId === 'river')) m *= C.tourism;
  const wd = weekday();
  if (wd >= 5) {
    if (districtId === 'biz') m *= 0.55;
    if (TYPES[type].retail) m *= 1.25;
    if (districtId === 'river' || districtId === 'center' || districtId === 'hills') m *= 1.15;
  }
  return m;
}
function retailCapacity(b) {
  const T = TYPES[b.type];
  return sum(staffOf(b), (p) => T.cap * (0.5 + effSkill(p, 'sales') * 0.2)) * (1 + 0.2 * (b.upg.equipment - 1)) * (1 + 0.05 * state.tech.retail) * (b.manager ? 1.05 : 1) * absentPenalty(b);
}

function simulateHour(b, h) {
  if (h < b.open || h >= b.close) return;
  const staff = staffOf(b);
  if (!staff.length) { b.today.noStaff++; return; }
  const T = TYPES[b.type], lot = lotOf(b), D = DMAP[lot.district], S = SIZES[lot.size];
  const prods = productsOf(b);
  if (!prods.length) return;
  ensureProducts(b);
  const e = T.elast * D.sens;
  const mkt = 1 + sum(Object.keys(CAMPAIGNS).filter((k) => b.marketing[k]), (k) => CAMPAIGNS[k].boost);
  const ratio = sum(prods, (p) => p.share * (b.products[p.id].price / fairPrice(p, b)));
  let potential = D.traffic * trafficMult(D.id, b.type, cityOfLot(lot)) * T.draw * (T.aff[D.id] || 0.5) * CURVES[T.curve][h] * S.attract
    * (1 / (1 + 0.3 * competitors(b))) * mkt * (0.5 + b.rep / 100) * (1 + 0.12 * (b.upg.interior - 1));
  potential *= clamp(1 - 0.5 * e * (ratio - 1), 0.2, 1.4) * rnd(0.85, 1.15) * (b.type === 'dealership' && typeof racingBoost === 'function' ? racingBoost() : 1);
  const arrivals = sround(potential);
  const served = Math.min(arrivals, sround(retailCapacity(b)));
  let rev = 0, cogs = 0, wanted = 0, sold = 0;
  for (const p of prods) {
    const st = b.products[p.id];
    const accept = clamp(1 - e * (st.price / fairPrice(p, b) - 1), 0, 1.3);
    const want = sround(served * p.share * accept);
    const s = Math.min(want, Math.floor(st.stock));
    st.stock -= s; st.sold += s; st.miss = (st.miss || 0) + (want - s);
    rev += s * st.price; cogs += s * st.cost; wanted += want; sold += s;
    if (p.carOnly && s) { const m = state.carModels.find((x) => x.id === p.id); if (m) m.sold += s; }
  }
  if (rev) book('sales', rev);
  const t = b.today;
  t.rev += rev; t.cogs += cogs; t.arrivals += arrivals; t.served += served; t.lost += arrivals - served; t.oos += wanted - sold; t.units += sold;
  if (arrivals > 0) {
    const servedR = served / arrivals, stockR = wanted ? sold / wanted : 1;
    const priceS = clamp(1 - (ratio - 1) * 1.5, 0, 1);
    const skill = sum(staff, (p) => p.skill) / staff.length;
    const sat = 30 * servedR + 30 * stockR + 20 * priceS + 10 * (skill / 5) + 10 * (b.upg.interior / MAX_UPG);
    t.satSum += sat * arrivals; t.satN += arrivals;
    b.rep = clamp(b.rep + (sat - b.rep) * Math.min(0.06, arrivals * 0.0025), 0, 100);
  }
  for (const p of staff) p.skill = Math.min(5, p.skill + 0.0015 * (1 + 0.2 * state.depts.hr));
}

function emptyDay() { return { rev: 0, cogs: 0, arrivals: 0, served: 0, lost: 0, oos: 0, units: 0, satSum: 0, satN: 0, noStaff: 0 }; }

function openBusiness(lotId, type, silent = false) {
  const lot = lotById(lotId);
  if (!lot || lot.npc || lot.owner) return;
  const T = TYPES[type];
  if (T.minSize && SIZE_ORDER.indexOf(lot.size) < SIZE_ORDER.indexOf(T.minSize)) return toast('Замале приміщення.', 'bad');
  const setup = setupCost(type, lot), cost = setup + lotRent(lot) * 7;
  if (state.cash < cost) return toast('Недостатньо коштів.', 'bad');
  book('capex', -cost);
  const b = {
    id: uid(), lotId, type, name: `${T.name} на ${lot.addr.split(',')[0].replace(/^(вул\.|просп\.|пл\.|бульв\.|пров\.)\s*/, '')}`,
    open: T.hours[0], close: Math.min(24, T.hours[1]), rep: 50, invested: setup, bookVal: setup,
    upg: { interior: 1, equipment: 1, storage: 1 }, marketing: {}, autoRestock: true, useOwn: true, manager: false,
    products: {}, today: emptyDay(), yest: null, history: [], opened: state.day,
  };
  lot.owner = b.id; lot.ownerKind = 'biz';
  if (state.flags.autoManagers) b.manager = true;
  state.biz.push(b);
  ensureProducts(b);
  log(`Відкрито «${b.name}» (${DMAP[lot.district].name}). Витрати: ${money(cost)}.`, 'good');
  checkAchievements();
  if (silent) return b;
  toast(`${T.icon} Бізнес відкрито! Наймайте персонал і закупіть товар.`, 'good');
  Object.assign(state.ui, { view: 'biz', bizId: b.id, tab: 'overview', lot: null });
  return b;
}

function buyStock(b, pid, qty, markup = 1, silent = false) {
  const p = productsOf(b).find((x) => x.id === pid);
  if (!p) return { ok: false, cost: 0 };
  ensureProducts(b);
  const st = b.products[pid];
  const free = storageCap(b) - stockTotal(b);
  qty = Math.min(Math.floor(qty), Math.floor(free));
  if (qty <= 0) { if (!silent) toast('Склад заповнений.', 'bad'); return { ok: false, cost: 0 }; }
  let got = 0, cost = 0, own = 0;
  if (p.good && (b.useOwn || p.carOnly)) {
    const n = Math.min(qty, Math.floor(whQty(p.good) / p.gq));
    if (n > 0) { const c = whTake(p.good, n * p.gq); st.cost = (st.cost * st.stock + c) / (st.stock + n); st.stock += n; got += n; own = n; state.flags.ownSupply = true; }
  }
  const rest = qty - got;
  if (rest > 0 && !p.carOnly) {
    const unit = wholesale(b, p) * markup;
    let n = rest;
    if (unit * n > Math.max(0, state.cash)) n = Math.floor(Math.max(0, state.cash) / unit);
    if (n > 0) { cost = unit * n; book('purchases', -cost); st.cost = (st.cost * st.stock + cost) / (st.stock + n); st.stock += n; got += n; }
    if (n < rest && !silent) toast(got ? `Вистачило лише на ${got} од.` : 'Недостатньо коштів.', 'bad');
  }
  if (!got && p.carOnly && !silent) toast('Немає автомобілів на складі — виробіть їх на автозаводі.', 'bad');
  return { ok: got === qty, cost, qty: got, own };
}
function fillAll(b) {
  let spent = 0, got = 0;
  for (const p of productsOf(b)) {
    const st = b.products[p.id];
    if (st && st.target > st.stock) { const r = buyStock(b, p.id, st.target - st.stock, 1, true); spent += r.cost; got += r.qty || 0; }
  }
  toast(got ? `Поповнено ${got} од. за ${money(spent)}.` : 'Нічого не закуплено (склад повний або немає коштів).', got ? 'good' : '');
}
function upgradeBiz(b, k) {
  if (b.upg[k] >= MAX_UPG) return;
  const c = upgradeCost(b, k);
  if (state.cash < c) return toast('Недостатньо коштів.', 'bad');
  book('capex', -c); b.invested += c; b.bookVal += c; b.upg[k]++;
  log(`«${b.name}»: ${UPGRADES[k].name} → рівень ${b.upg[k]} за ${money(c)}.`, 'good');
}
function bizValue(b) {
  const h = b.history.slice(-7);
  const avg = h.length ? sum(h, (x) => x.profit) / h.length : 0;
  return Math.max(0, Math.round(b.bookVal * 0.6 + Math.max(0, avg) * 60 + stockValue(b) * 0.6));
}
function sellBiz(b) {
  const v = bizValue(b);
  book('assetSale', v);
  state.staff = state.staff.filter((p) => p.unit !== b.id);
  const lot = lotOf(b); lot.owner = null; lot.ownerKind = null;
  state.biz = state.biz.filter((x) => x !== b);
  log(`«${b.name}» продано за ${money(v)}.`, 'good');
  state.ui.view = 'businesses';
}

// ================= Склад і ринок =================
const whQty = (g) => (state.wh.goods[g] ? state.wh.goods[g].qty : 0);
const whUsed = () => sum(Object.entries(state.wh.goods), ([g, x]) => x.qty * (GOODS[g] ? GOODS[g].w : 0));
const logisticsCount = () => sum(state.fac.filter((f) => f.kind === 'logistics' && staffOf(f).length), (f) => f.level);
const whCap = () => 60000 + 100000 * logisticsCount();
const transportDiscount = () => Math.max(0.4, 1 - 0.3 * logisticsCount());
function whAdd(g, qty, totalCost) {
  if (qty <= 0) return 0;
  const w = GOODS[g] ? GOODS[g].w : 0;
  let n = qty;
  if (w > 0) n = Math.min(qty, Math.floor((whCap() - whUsed()) / w));
  if (n <= 0) return 0;
  const unit = totalCost / qty;
  const x = state.wh.goods[g] || (state.wh.goods[g] = { qty: 0, cost: unit });
  x.cost = (x.cost * x.qty + unit * n) / (x.qty + n); x.qty += n;
  return n;
}
function whTake(g, qty) {
  const x = state.wh.goods[g];
  if (!x || qty <= 0) return 0;
  const n = Math.min(qty, x.qty);
  x.qty -= n;
  const c = n * x.cost;
  if (x.qty <= 1e-6) delete state.wh.goods[g];
  return c;
}
const mktPrice = (g) => GOODS[g].price * priceLvl() * state.market[g].mult;
const sellPrice = (g) => mktPrice(g) * (0.93 + 0.025 * state.depts.sales);
const buyPrice = (g) => mktPrice(g) * 1.05;
const transportCost = (g, qty) => GOODS[g].w * qty * 0.012 * priceLvl() * city().transport * transportDiscount();
function marketSell(g, qty, silent) {
  qty = Math.floor(Math.min(qty, whQty(g)));
  if (qty <= 0) return 0;
  const gross = qty * sellPrice(g), tr = transportCost(g, qty);
  whTake(g, qty);
  book('b2b', gross); book('transport', -tr);
  state.market[g].mult = Math.max(0.4, state.market[g].mult * (1 - (qty * GOODS[g].price) / 3e6));
  if (!silent) toast(`Продано ${qty} × ${GOODS[g].name} за ${money(gross - tr)}.`, 'good');
  return gross - tr;
}
function marketBuy(g, qty, instant = false) {
  qty = Math.floor(qty);
  if (qty <= 0) return false;
  const unit = buyPrice(g) * (instant ? 1.03 : 1);
  const cost = qty * unit + transportCost(g, qty);
  if (cost > state.cash) { if (!instant) toast('Недостатньо коштів.', 'bad'); return false; }
  book('purchases', -cost);
  state.market[g].mult = Math.min(2.5, state.market[g].mult * (1 + (qty * GOODS[g].price) / 4e6));
  if (instant) { const got = whAdd(g, qty, cost); return got > 0; }
  const delay = chance(0.12 * transportDiscount()) ? 2 : 1;
  state.orders.push({ g, qty, cost, day: state.day + delay });
  toast(`Замовлено ${qty} × ${GOODS[g].name}. Доставка ${delay === 1 ? 'завтра' : 'через 2 дні (затор у порту)'} о 06:00.`);
  return true;
}
function deliverOrders() {
  const keep = [];
  for (const o of state.orders) {
    if (o.day > state.day) { keep.push(o); continue; }
    const got = whAdd(o.g, o.qty, o.cost);
    if (got < o.qty) log(`Склад переповнений: ${o.qty - got} × ${GOODS[o.g].name} довелося списати.`, 'bad');
    else log(`Доставлено ${o.qty} × ${GOODS[o.g].name}.`);
  }
  state.orders = keep;
}

// ================= Виробництво =================
function facSetupCost(kind, lot) { return Math.round(FACILITIES[kind].setup * (SIZES[lot.size].setup / 2) * priceAtLot(lot)); }
function openFacility(lotId, kind) {
  const lot = lotById(lotId), F = FACILITIES[kind];
  if (!lot || lot.npc || lot.owner) return;
  if (!F.sizes.includes(lot.size)) return toast('Розмір ділянки не підходить.', 'bad');
  if (kind === 'bankbranch' && !(state.bank && state.bank.open)) return toast('Спершу отримайте банківську ліцензію.', 'bad');
  const setup = facSetupCost(kind, lot), cost = setup + lotRent(lot) * 7;
  if (state.cash < cost) return toast(`Потрібно ${money(cost)}.`, 'bad');
  book('capex', -cost);
  const f = {
    id: uid(), kind, lotId, name: `${F.name} «${lot.addr.split(',')[0].replace(/^(вул\.|пров\.)\s*/, '')}»`, level: 1, cond: 100, broken: 0, strike: 0,
    recipe: F.recipes[0] ? F.recipes[0].id : null, manager: false, autoBuy: true, invested: setup, bookVal: setup, yest: null, history: [], opened: state.day,
  };
  lot.owner = f.id; lot.ownerKind = 'fac';
  state.fac.push(f);
  ensureAutoSell(f);
  if (state.flags.autoManagers) f.manager = true;
  log(`Збудовано: ${F.name} (${DMAP[lot.district].name}) за ${money(cost)}.`, 'good');
  toast(`${F.icon} ${F.name} готовий! Наймайте персонал.`, 'good');
  checkAchievements();
  Object.assign(state.ui, { view: 'fac', facId: f.id, tab: 'overview', lot: null });
}
// Нове підприємство за замовчуванням продає надлишок продукції на ринку (лишаючи запас на 3 дні).
function ensureAutoSell(f) {
  const r = facRecipe(f);
  if (!r || r.model || r.out === 'power' || state.autoSell[r.out]) return;
  state.autoSell[r.out] = { on: true, keep: Math.round(r.rate * 3) };
}
function facRecipe(f) {
  const F = FACILITIES[f.kind];
  if (f.kind === 'carplant') {
    const m = state.carModels.find((x) => x.id === f.recipe && x.active);
    if (!m) return null;
    return { id: m.id, out: 'car:' + m.id, rate: 5, in: { steel: m.steel, plastic: m.plastic, chips: m.chips }, comp: m.comp, model: m };
  }
  return F.recipes.find((r) => r.id === f.recipe) || null;
}
const facUpgradeCost = (f) => Math.round(FACILITIES[f.kind].setup * 0.6 * f.level * priceLvl());
function repairCost(f) { return Math.round(FACILITIES[f.kind].setup * f.level * priceLvl() * (0.0005 * (100 - f.cond) + (f.broken ? 0.02 : 0))); }
function repairFac(f, silent) {
  const c = repairCost(f);
  if (c <= 0) return;
  if (state.cash < c) { if (!silent) toast('Недостатньо коштів на ремонт.', 'bad'); return; }
  book('maint', -c); f.cond = 100; f.broken = 0;
  if (!silent) log(`${f.name}: ремонт за ${money(c)}.`);
}
function facStaffFactor(f) {
  const F = FACILITIES[f.kind];
  const need = Math.max(1, F.staff * (1 + 0.5 * (f.level - 1)));
  return Math.min(1, sum(staffOf(f), (p) => effSkill(p, F.role) / 3) / need);
}
function facRateFull(f, r) {
  if (!r) return 0;
  const rate = f.kind === 'carplant' ? 5 : r.rate;
  return rate * ({ S: 0.6, M: 0.8, L: 1, XL: 1.5 }[lotOf(f).size] || 1) * (1 + 0.6 * (f.level - 1)) * (1 + 0.08 * state.tech.industry) * (f.manager ? 1.05 : 1) * absentPenalty(f);
}
function facValue(f) { return Math.round(f.bookVal * 0.7); }
function sellFac(f) {
  const v = facValue(f);
  book('assetSale', v);
  state.staff = state.staff.filter((p) => p.unit !== f.id);
  state.projects = state.projects.filter((p) => p.office !== f.id || p.status === 'live');
  const lot = lotOf(f); lot.owner = null; lot.ownerKind = null;
  state.fac = state.fac.filter((x) => x !== f);
  log(`${f.name} продано за ${money(v)}.`, 'good');
  state.ui.view = 'industry';
}

let powerPool = 0;
function facDaily(f, phase) {
  const F = FACILITIES[f.kind];
  const isPower = f.kind === 'powerplant';
  if ((phase === 'power') !== isPower) return;
  const st = staffOf(f);
  const wages = sum(st, (p) => p.wage) * 8;
  const maint = F.setup * f.level * 0.0006 * priceLvl();
  book('wages', -wages); book('maint', -maint);
  if (f.manager) book('wages', -managerCost());
  const y = { out: 0, outGood: null, inCost: 0, wages, maint, power: 0, short: null, value: 0 };
  if (f.kind === 'office') { f.cond = 100; if (f.strike > 0) f.strike--; return officeDaily(f, y); }
  // знос, поломки, страйки
  f.cond = Math.max(0, f.cond - rnd(0.3, 1.0));
  if (f.broken > 0) f.broken--;
  else if (f.cond < 45 && chance((45 - f.cond) / 160)) { f.broken = ri(2, 4); log(`⚠️ ${f.name}: аварія обладнання! Простій ${f.broken} дн.`, 'bad'); }
  if (f.manager && (f.cond < 55 || f.broken)) repairFac(f, true);
  if (f.strike > 0) { f.strike--; y.short = 'страйк'; }
  if (f.kind === 'logistics' || f.kind === 'bankbranch') { f.yest = y; return; }
  const r = facRecipe(f);
  if (!r) { y.short = 'не обрано продукцію'; f.yest = y; return; }
  const staffF = facStaffFactor(f), condF = f.broken > 0 || f.strike > 0 ? 0 : 0.5 + 0.5 * f.cond / 100;
  const full = facRateFull(f, r);
  let n = full * staffF * condF;
  if (!st.length) y.short = 'немає персоналу';
  // сировина
  for (const [g, per] of Object.entries(r.in)) {
    if (per <= 0) continue;
    let have = whQty(g);
    if (have < n * per && f.autoBuy && n > 0) { marketBuy(g, Math.ceil(n * per - have), true); have = whQty(g); }
    if (have < n * per) { n = Math.min(n, have / per); y.short = `бракує: ${GOODS[g].name}`; }
  }
  n = isPower ? n : Math.floor(n);
  let cost = 0;
  if (n > 0) {
    for (const [g, per] of Object.entries(r.in)) cost += whTake(g, n * per);
    if (r.comp) { const c = r.comp * priceLvl() * n; book('components', -c); cost += c; }
  }
  y.inCost = cost;
  // енергія
  if (!isPower) {
    const need = F.power * f.level * (1 - 0.05 * state.tech.industry) * (0.3 + 0.7 * (full ? n / full : 0));
    const own = Math.min(powerPool, need);
    powerPool -= own;
    const buy = (need - own) * state.econ.power * priceLvl();
    if (buy) book('utilities', -buy);
    y.power = buy; cost += buy;
  }
  cost += wages + maint;
  if (isPower) { powerPool += n; y.out = n; y.outGood = 'power'; f.yest = y; return; }
  if (n > 0) {
    const stored = whAdd(r.out, n, cost);
    if (stored < n) { y.short = 'склад переповнений'; log(`${f.name}: склад переповнений, втрачено ${n - stored} од.`, 'bad'); }
    y.out = stored; y.outGood = r.out;
    y.value = r.model ? stored * r.model.estCost : stored * mktPrice(r.out);
    if (r.model) r.model.produced += stored;
  }
  f.yest = y;
  f.history.push({ day: state.day, out: y.out }); if (f.history.length > 30) f.history.shift();
}

// ================= IT =================
function officeDaily(f, y) {
  const devs = staffOf(f);
  const pts = sum(devs, (p) => effSkill(p, 'dev')) * (1 + 0.05 * state.tech.it) * (f.manager ? 1.05 : 1) * absentPenalty(f) * (f.strike ? 0 : 1);
  const proj = state.projects.find((p) => p.office === f.id && p.status === 'dev');
  y.devPts = pts;
  if (proj) {
    proj.progress += pts; proj.skillSum += sum(devs, (p) => p.skill); proj.skillN += devs.length;
    if (proj.progress >= proj.work) releaseProject(proj);
  } else if (pts > 0) {
    state.tech.points += pts * 0.4; y.research = pts * 0.4;
  }
  for (const p of devs) p.skill = Math.min(5, p.skill + 0.004 * (1 + 0.2 * state.depts.hr));
  f.yest = y;
}
function startProject(officeId, kind, name) {
  const K = SOFT[kind];
  if (state.tech.it < K.tech) return toast(`Потрібен рівень досліджень IT ${K.tech}.`, 'bad');
  if (state.projects.some((p) => p.office === officeId && p.status === 'dev')) return toast('Офіс уже працює над проєктом.', 'bad');
  state.projects.push({ id: uid(), office: officeId, kind, name: name || K.name, work: K.work, progress: 0, status: 'dev', users: 0, peak: 0, quality: 0, rev: 0, total: 0, skillSum: 0, skillN: 0, started: state.day });
  log(`Почато розробку: ${name || K.name}.`);
}
function releaseProject(p) {
  const K = SOFT[p.kind];
  const avg = p.skillN ? p.skillSum / p.skillN : 2;
  p.quality = Math.round(clamp(22 + avg * 9 + state.tech.it * 6 + rnd(-8, 8), 5, 100));
  p.users = Math.round(K.users * Math.pow(p.quality / 60, 2) * state.econ.demand * (1 + 0.03 * state.depts.marketing) * rnd(0.7, 1.3));
  p.peak = p.users * K.cap; p.status = 'live'; p.launched = state.day;
  news(`Реліз: «${p.name}» від ${state.company}. Оцінка критиків ${p.quality}/100.`, 'corp', 'good');
  log(`🚀 Реліз «${p.name}»: якість ${p.quality}, стартова аудиторія ${p.users.toLocaleString('uk-UA')}.`, 'good');
  checkAchievements();
}
function projectsDaily() {
  for (const p of state.projects) {
    if (p.status !== 'live') continue;
    const K = SOFT[p.kind];
    if (K.growth > 0 && p.users < p.peak) p.users *= 1 + K.growth * state.econ.demand;
    else p.users *= 1 + Math.min(K.growth, -0.003);
    p.rev = p.users * K.arpu * priceLvl();
    p.total += p.rev;
    if (p.rev) book('software', p.rev);
    if (p.rev < 5 && state.day - p.launched > 10) { p.status = 'retired'; log(`«${p.name}» знято з підтримки.`); }
  }
}
function promoteProject(p) {
  const c = Math.round(12000 * priceLvl());
  if (state.cash < c) return toast('Недостатньо коштів.', 'bad');
  book('marketing', -c); p.users *= 1.2; p.peak *= 1.05;
  toast('Промокампанія запущена: +20% користувачів.', 'good');
}

// ================= Автомобілі =================
function carStats(spec) {
  const S = SEGMENTS[spec.seg], En = ENGINES[spec.engine], M = MATERIALS[spec.mat], trim = +spec.trim;
  const weight = Math.round(1300 * S.size * M.weight + ({ ev: 350, v8: 220, v6: 140 }[spec.engine] || 80));
  const perf = (En.hp / weight) * 1000;
  const fit = S.engines.includes(spec.engine) ? 8 : -12;
  const quality = Math.round(clamp(28 + trim * 9 + En.q + M.q + fit + state.tech.auto * 5 + (perf - 110) * 0.04, 5, 100));
  const steel = Math.round(800 * S.size * M.steel), plastic = Math.round(300 * S.size * M.plastic), chips = Math.round(60 + En.chips + trim * 20);
  const comp = En.cost + M.extra + [0, 1200, 3200][trim - 1];
  const fairBase = Math.round(S.base * (0.55 + quality / 100 * 0.9));
  const matCost = steel * mktPrice('steel') + plastic * mktPrice('plastic') + chips * mktPrice('chips');
  const estCost = Math.round(matCost + comp * priceLvl() + 1400 * priceLvl());
  const designCost = Math.round((60000 + S.base * 3) * priceLvl());
  const fuel = spec.engine === 'ev' ? '18 кВт·год/100 км' : (3.2 + En.hp / 70 + weight / 900).toFixed(1) + ' л/100 км';
  return { weight, hp: En.hp, quality, steel, plastic, chips, comp, fairBase, estCost, designCost, fuel, speed: Math.round(140 + perf * 0.45) };
}
function designCar(spec) {
  const s = carStats(spec);
  if (state.cash < s.designCost) return toast(`Розробка коштує ${money(s.designCost)}.`, 'bad');
  book('capex', -s.designCost);
  const m = { id: 'M' + uid().slice(0, 5), name: spec.name || 'Модель ' + (state.carModels.length + 1), ...spec, trim: +spec.trim, ...s, produced: 0, sold: 0, active: true, day: state.day };
  state.carModels.push(m);
  log(`🚗 Розроблено модель «${m.name}» (${SEGMENTS[m.seg].name}), якість ${m.quality}.`, 'good');
  news(`${state.company} представляє новий автомобіль «${m.name}».`, 'corp', 'good');
  checkAchievements();
}

// ================= Нерухомість =================
const propValue = (p) => Math.round(p.base * rentLvl() * (p.condition || 1));
function propBuyPrice(p) { return Math.round(propValue(p) * 1.03); }
function buyProp(id, useMortgage) {
  const p = propById(id);
  if (!p || p.owned) return;
  const price = propBuyPrice(p), v = propValue(p);
  if (useMortgage) {
    const down = price - v * 0.75;
    if (state.cash < down) return toast(`Потрібен перший внесок ${money(down)}.`, 'bad');
    if (state.me.credit < 560) return toast('Банк відмовив в іпотеці: низький кредитний рейтинг.', 'bad');
    const amt = Math.round(v * 0.75);
    state.loans.push({ id: uid(), amount: amt, rate: (creditRate() - 1) / 100 / 365, day: state.day, kind: 'mortgage', prop: p.id });
    book('loans', amt);
    p.mortgage = true;
  } else if (state.cash < price) return toast('Недостатньо коштів.', 'bad');
  book('propTrade', -price);
  p.owned = true; p.bought = price;
  log(`Куплено: ${PROP_KINDS[p.kind].name}, ${p.addr} за ${money(price)}${useMortgage ? ' (іпотека)' : ''}.`, 'good');
  checkAchievements();
}
function sellProp(id) {
  const p = propById(id);
  if (!p || !p.owned || p.building) return;
  const v = Math.round(propValue(p) * 0.97);
  book('propTrade', v);
  for (const l of state.loans.filter((x) => x.prop === p.id)) { book('loans', -l.amount); state.loans = state.loans.filter((x) => x !== l); }
  if (state.me.homeProp === p.id) state.me.homeProp = null;
  p.owned = false; p.tenant = null; p.rentOut = false; p.mortgage = null;
  if (p.lotId) { const lot = lotById(p.lotId); if (lot) { lot.owner = null; lot.ownerKind = null; } state.props = state.props.filter((x) => x !== p); }
  log(`Продано нерухомість за ${money(v)}.`, 'good');
}
function constructCost(kind, lot) { return Math.round(CONSTRUCT[kind].cost * (lot ? priceAtLot(lot) : priceLvl()) * Math.sqrt(lot ? cityOfLot(lot).rent : city().rent)); }
function construct(lotId, kind) {
  const lot = lotById(lotId), C = CONSTRUCT[kind];
  if (!lot || lot.npc || lot.owner || !C.sizes.includes(lot.size)) return;
  const cost = constructCost(kind, lot);
  if (state.cash < cost) return toast(`Потрібно ${money(cost)}.`, 'bad');
  book('capex', -cost);
  const p = { id: uid(), kind, district: lot.district, addr: lot.addr, base: Math.round(cost * 1.3 / rentLvl()), owned: true, rentOut: true, tenant: null, building: C.days, lotId, bought: cost, cost };
  state.props.push(p);
  lot.owner = p.id; lot.ownerKind = 'prop';
  log(`🏗️ Розпочато будівництво: ${C.name} (${C.days} днів).`, 'good');
  state.ui.lot = null; state.ui.view = 'realty';
}
function propsDaily() {
  for (const p of state.props) {
    if (!p.owned) continue;
    if (p.building) {
      p.building--;
      if (!p.building) { news(`${state.company} відкриває ${PROP_KINDS[p.kind].name.toLowerCase()} за адресою ${p.addr}.`, 'corp', 'good'); log(`🏗️ Будівництво завершено: ${PROP_KINDS[p.kind].name}.`, 'good'); state.flags.built = true; }
      continue;
    }
    const v = propValue(p);
    book('maint', -v * 0.01 / 365); book('tax', -v * 0.004 / 365);
    if (state.me.homeProp === p.id) continue;
    if (p.rentOut) {
      if (!p.tenant && chance(0.18 * state.econ.demand)) {
        p.tenant = { rent: v * PROP_KINDS[p.kind].yield / 365 * rnd(0.9, 1.1), since: state.day };
        log(`Знайдено орендаря: ${PROP_KINDS[p.kind].name}, ${p.addr} — ${money(p.tenant.rent)}/день.`);
      } else if (p.tenant) {
        book('rentInc', p.tenant.rent);
        if (chance(state.econ.phase === 'recession' || state.econ.phase === 'crisis' ? 0.015 : 0.005)) { log(`Орендар з'їхав: ${p.addr}.`, 'bad'); p.tenant = null; }
      }
    }
  }
  // ринок оголошень оновлюється
  const listed = state.props.filter((p) => !p.owned && !p.lotId);
  if (listed.length < 18 && chance(0.3)) {
    const kind = pick(['apartment', 'apartment', 'house', 'office']);
    const d = kind === 'house' ? pick(['hills', 'res']) : kind === 'office' ? pick(['biz', 'center']) : pick(['res', 'campus', 'center', 'river', 'biz']);
    const [lo, hi] = { apartment: [60000, 150000], house: [220000, 600000], office: [250000, 900000] }[kind];
    state.props.push({ id: uid(), kind, district: d, addr: `${pick(DMAP[d].streets)}, ${ri(1, 200)}`, base: Math.round(rnd(lo, hi) * DMAP[d].rent / 1.2 / 1000) * 1000, owned: false, rentOut: false, tenant: null });
  }
}

// ================= Персонаж =================
function canTakeJob(id) { return Object.entries(JOBS[id].req).every(([s, v]) => state.me.skills[s] >= v); }
function takeJob(id) {
  if (!canTakeJob(id)) return toast('Бракує кваліфікації.', 'bad');
  state.me.job = id; state.me.jobDays = 0;
  log(`Ви влаштувались на роботу: ${JOBS[id].name} (${money(JOBS[id].pay * wageLvl())}/день).`, 'good');
}
function quitJob() { if (state.me.job) log(`Ви звільнились з роботи «${JOBS[state.me.job].name}».`); state.me.job = null; }
const courseCost = (s) => Math.round(700 * (state.me.skills[s] + 1) * priceLvl());
function takeCourse(s) {
  if (state.me.skills[s] >= 5) return;
  const c = courseCost(s);
  if (state.cash < c) return toast('Недостатньо коштів.', 'bad');
  book('living', -c); state.me.skills[s] = Math.min(5, Math.floor(state.me.skills[s]) + 1);
  log(`Пройдено курс «${SKILLS[s]}» — рівень ${state.me.skills[s]}.`, 'good');
}
function livingCost() {
  const H = HOMES[state.me.home];
  return (state.me.homeProp ? 0 : H.rent * rentLvl()) + H.food * priceLvl();
}
function personalDaily() {
  const me = state.me;
  if (me.job) {
    book('salary', JOBS[me.job].pay * wageLvl());
    me.jobDays++;
    const s = JOBS[me.job].skill; me.skills[s] = Math.min(5, me.skills[s] + 0.02);
  }
  book('living', -livingCost());
}

// ================= Корпорація =================
const deptDaily = (lvl) => lvl * 260 * wageLvl();
const deptUpCost = (lvl) => Math.round(6000 * (lvl + 1) * priceLvl());
function deptUp(k) {
  const l = state.depts[k];
  if (l >= 5) return;
  const c = deptUpCost(l);
  if (state.cash < c) return toast('Недостатньо коштів.', 'bad');
  book('capex', -c); state.depts[k]++;
  log(`${DEPTS[k].name}: рівень ${state.depts[k]}.`, 'good');
  checkAchievements();
}
const researchCost = (f) => Math.round(150 * Math.pow(state.tech[f] + 1, 1.6));
function research(f) {
  const c = researchCost(f);
  if (state.tech.points < c) return toast('Недостатньо очок досліджень.', 'bad');
  state.tech.points -= c; state.tech[f]++;
  log(`🔬 Дослідження «${RESEARCH[f].name}» — рівень ${state.tech[f]}.`, 'good');
  news(`${state.company} оголошує технологічний прорив у галузі «${RESEARCH[f].name}».`, 'corp', 'good');
}

// ================= Персонал =================
function hire(candId, unitId, by) {
  const c = state.candidates.find((x) => x.id === candId);
  const u = unitById(unitId);
  if (!c || !u) return toast('Оберіть, куди найняти.', 'bad');
  if (staffOf(u).length >= maxStaff(u)) return toast('Немає вільних місць.', 'bad');
  state.candidates = state.candidates.filter((x) => x !== c);
  state.staff.push({ id: c.id, name: c.name, role: c.role, skill: c.skill, wage: c.wage, unit: u.id, morale: 70, hired: state.day });
  log(`${by ? '🧑‍💼 Керуючий найняв' : 'Найнято'} ${c.name} (${ROLES[c.role]}, навичка ${c.skill.toFixed(1)}) у «${u.name}».`);
  checkAchievements();
}
function fire(id) {
  const p = state.staff.find((x) => x.id === id);
  if (!p) return;
  const sev = Math.round(p.wage * 8 * 3);
  book('wages', -sev);
  state.staff = state.staff.filter((x) => x !== p);
  log(`${p.name} звільнено. Вихідна допомога: ${money(sev)}.`);
}
function transfer(id, unitId) {
  const p = state.staff.find((x) => x.id === id), u = unitById(unitId);
  if (!p || !u || p.unit === unitId) return;
  if (staffOf(u).length >= maxStaff(u)) return toast('Там уже максимум працівників.', 'bad');
  p.unit = unitId; log(`${p.name} переведено в «${u.name}».`);
}
function raise(id) { const p = state.staff.find((x) => x.id === id); if (!p) return; p.wage = +(p.wage * 1.1).toFixed(1); p.morale = Math.min(100, p.morale + 12); toast(`${p.name}: зарплату підвищено на 10%.`, 'good'); }
function bonusAll(u) {
  const st = staffOf(u);
  const c = Math.round(sum(st, (p) => p.wage) * 8 * 2);
  if (!st.length || state.cash < c) return toast('Недостатньо коштів.', 'bad');
  book('wages', -c);
  for (const p of st) p.morale = Math.min(100, p.morale + 18);
  if (u.strike) { u.strike = 0; log(`${u.name}: страйк припинено після виплати премій.`, 'good'); }
  toast(`Премії виплачено: ${money(c)}.`, 'good');
}
function staffDaily() {
  for (const p of [...state.staff]) {
    const target = clamp(60 + (p.wage / marketWage(p) - 1) * 120 + state.depts.hr * 5, 0, 100);
    p.morale = clamp(p.morale + (target - p.morale) * 0.1 + rnd(-1, 1), 0, 100);
    if (p.morale < 25 && chance(0.05)) { state.staff = state.staff.filter((x) => x !== p); log(`${p.name} звільнився(-лась): низька мораль і зарплата нижче ринку.`, 'bad'); }
  }
  state.candidates = state.candidates.filter((c) => state.day - c.since < 4 || chance(0.5));
  while (state.candidates.length < 10) state.candidates.push(makeCandidate());
}

// ================= Банк =================
const creditRate = () => state.econ.rate + 2 + (850 - state.me.credit) / 550 * 12;
function creditLimit() {
  const assets = state.cash + inventoryValue() + fixedAssets() + sum(state.props.filter((p) => p.owned && !p.mortgage), propValue);
  return Math.max(0, Math.round(Math.max(5000 * priceLvl(), assets * 0.5) * clamp(state.me.credit / 700, 0.4, 1.2) - debt()));
}
function takeLoan(amount) {
  if (amount > creditLimit()) return toast('Банк відмовив: перевищено кредитний ліміт.', 'bad');
  const rate = creditRate() / 100 / 365;
  state.loans.push({ id: uid(), amount, rate, day: state.day, kind: 'loan' });
  book('loans', amount);
  log(`Кредит ${money(amount)} під ${creditRate().toFixed(1)}% річних.`);
}
function repayLoan(id, part) {
  const l = state.loans.find((x) => x.id === id);
  if (!l) return;
  const amt = Math.min(l.amount, part || l.amount);
  if (state.cash < amt) return toast('Недостатньо коштів.', 'bad');
  book('loans', -amt); l.amount -= amt;
  if (l.amount <= 0.5) {
    state.loans = state.loans.filter((x) => x !== l);
    if (l.prop) { const p = propById(l.prop); if (p) p.mortgage = null; }
    state.flags.repaid = true; state.me.credit = Math.min(850, state.me.credit + 8);
    log(`Кредит повністю погашено.`, 'good');
  }
  checkAchievements();
}
function bankDaily() {
  const interest = sum(state.loans, (l) => l.amount * l.rate);
  if (interest) book('interest', -interest);
  if (state.cash > 0) { const dep = state.cash * Math.max(0, state.econ.rate - 2.5) / 100 / 365; if (dep > 0.01) book('interestInc', dep); }
  const me = state.me;
  if (state.cash < 0) me.credit -= 4; else if (debt() > 0) me.credit += 0.15; else me.credit += 0.03;
  me.credit = clamp(me.credit, 300, 850);
}

// ================= Макроекономіка =================
const PHASES = {
  growth: { name: 'Зростання', g: 2.5, i: 4, u: 6.5, pe: 1, next: [['boom', 0.3], ['growth', 0.4], ['recession', 0.3]] },
  boom: { name: 'Бум', g: 6, i: 8, u: 4.5, pe: 1.25, next: [['recession', 0.6], ['growth', 0.4]] },
  recession: { name: 'Рецесія', g: -1.5, i: 2.5, u: 9.5, pe: 0.8, next: [['growth', 0.6], ['crisis', 0.2], ['recession', 0.2]] },
  crisis: { name: 'Криза', g: -5, i: -0.5, u: 13, pe: 0.6, next: [['recession', 1]] },
};
function econDaily() {
  const e = state.econ;
  if (--e.phaseDays <= 0) {
    let r = Math.random(), nx = 'growth';
    for (const [p, w] of PHASES[e.phase].next) { if ((r -= w) <= 0) { nx = p; break; } }
    if (nx !== e.phase) {
      const txt = { boom: '📈 Економіка входить у фазу буму: попит росте, але й інфляція теж.', growth: '🌤️ Економіка стабілізувалась і повернулась до помірного зростання.', recession: '📉 Рецесія: споживачі скорочують витрати, безробіття росте.', crisis: '🚨 Фінансова криза! Ринки падають, банки посилюють умови.' }[nx];
      news(txt, 'econ', nx === 'boom' || nx === 'growth' ? 'good' : 'bad');
      log(txt, nx === 'boom' || nx === 'growth' ? 'good' : 'bad');
    }
    e.phase = nx; e.phaseDays = nx === 'crisis' ? ri(20, 45) : ri(45, 120);
  }
  const P = PHASES[e.phase];
  e.growth += (P.g - e.growth) * 0.05 + gauss() * 0.06;
  e.inflation += (P.i - e.inflation) * 0.04 + gauss() * 0.05;
  e.unemployment = clamp(e.unemployment + (P.u - e.unemployment) * 0.04 + gauss() * 0.04, 2, 25);
  if (state.day % 14 === 0) {
    const target = clamp(1.5 + 1.3 * e.inflation - 0.4 * (e.unemployment - 6), 0.25, 25);
    const step = clamp(Math.round((target - e.rate) * 2) / 4, -0.75, 0.75);
    if (step) { e.rate = +(e.rate + step).toFixed(2); news(`🏦 Центробанк ${step > 0 ? 'підвищив' : 'знизив'} облікову ставку до ${e.rate.toFixed(2)}%.`, 'econ', step > 0 ? 'bad' : 'good'); }
  }
  e.priceLevel *= 1 + e.inflation / 100 / 365;
  e.wageLevel *= 1 + (e.inflation + (6.5 - e.unemployment) * 0.4) / 100 / 365;
  e.housing = clamp(e.housing * (1 + (e.growth * 0.8 - (e.rate - 5) * 0.6 + e.inflation * 0.5) / 100 / 365 + gauss() * 0.001), 0.4, 6);
  e.demand = clamp(1 + (e.growth - 2.5) * 0.035 - (e.unemployment - 6.5) * 0.02 - (e.rate - 6.5) * 0.008, 0.55, 1.35);
  e.fx = clamp(e.fx * (1 + gauss() * 0.003 + (e.inflation - 3) / 100 / 365 * 0.5), 20, 120);
  e.power = 80 * Math.sqrt(state.market.oil.mult);
  for (const g of Object.keys(GOODS)) { const m = state.market[g]; m.mult = clamp(m.mult + (1 - m.mult) * 0.05 + gauss() * 0.012, 0.35, 3); }
  e.hist.push({ day: state.day, growth: e.growth, inflation: e.inflation, rate: e.rate, unemp: e.unemployment, demand: e.demand, cpi: e.priceLevel, housing: e.housing });
  if (e.hist.length > 365) e.hist.shift();
  if (state.day % 7 === 0) news(`📊 Тижневий огляд: ВВП ${e.growth.toFixed(1)}%, інфляція ${e.inflation.toFixed(1)}%, безробіття ${e.unemployment.toFixed(1)}%, ставка ${e.rate.toFixed(2)}%.`, 'econ');
}

// ================= ІІ-компанії та біржа =================
function aiDaily() {
  const e = state.econ, ph = PHASES[e.phase];
  for (const co of state.companies) {
    if (!co.alive) continue;
    const S = SECTORS[co.sector];
    const shops = state.lots.filter((l) => l.npc && l.npc.co === co.id).length;
    co.influence = isSub(co) ? 1 : playerInfluence(co);
    const rev = S.rev * co.scale * e.demand * (1 + 0.06 * shops) * rnd(0.85, 1.15) * priceLvl() * co.influence;
    let profit = rev * S.margin * co.eff - S.rev * co.scale * 0.02 * (e.phase === 'crisis' ? 1.5 : 1);
    if (chance(0.01)) profit -= rev * rnd(0.5, 3); // разові збитки
    co.cash += profit;
    if (isSub(co)) {
      // Дочірня компанія: частку прибутку (або збитку) отримує власник.
      const pay = profit * (co.payout == null ? 1 : co.payout);
      co.cash -= pay;
      book('subsidiary', pay);
      co.subToday = pay;
    }
    co.ema = co.ema * 0.95 + profit * 0.05;
    const fair = Math.max(0.3, (Math.max(0, co.ema) * 365 * S.pe * ph.pe + co.cash * 0.3) / co.shares);
    co.price = Math.max(0.05, co.price * Math.exp(gauss() * 0.018) + (fair - co.price) * 0.03);
    co.hist.push(+co.price.toFixed(2)); if (co.hist.length > 120) co.hist.shift();
    // розширення в місті
    if (TYPES[co.sector] && co.cash > 2e6 * co.scale && chance(0.025)) {
      // Конкуренти не займають понад 60% торгових ділянок міста — гравцю має лишатися місце.
      const crowded = (cid) => { const ls = state.lots.filter((x) => lotCityId(x) === cid && DMAP[x.district].zone === 'retail'); return ls.filter((x) => x.npc).length >= ls.length * 0.6; };
      const free = state.lots.filter((l) => !l.npc && !l.owner && DMAP[l.district].zone === 'retail' && !crowded(lotCityId(l)) && (!TYPES[co.sector].minSize || SIZE_ORDER.indexOf(l.size) >= SIZE_ORDER.indexOf(TYPES[co.sector].minSize)));
      if (free.length) {
        const l = pick(free); l.npc = { co: co.id, type: co.sector }; co.cash -= 150000 * priceLvl();
        news(`🏬 «${co.name}» відкриває ${TYPES[co.sector].name.toLowerCase()} у районі «${DMAP[l.district].name}».`, 'corp');
      }
    }
    if (co.influence < 0.85 && chance(0.03)) news(`📉 «${co.name}» втрачає ринок через ${state.company}: виручка −${Math.round((1 - co.influence) * 100)}%.`, 'corp');
    if (co.ema < 0 && shops && chance(0.04)) {
      const l = pick(state.lots.filter((x) => x.npc && x.npc.co === co.id)); l.npc = null;
      news(`«${co.name}» закриває збиткову точку в районі «${DMAP[l.district].name}».`, 'corp');
    }
    if (co.cash < -2.5e6 * co.scale) {
      if (isSub(co)) log(`⚠️ Дочірня «${co.name}» збанкрутувала — ви втратили компанію.`, 'bad');
      bankruptCompany(co);
    }
    // дивіденди
    if (state.day % 30 === 0 && co.ema > 0 && !isSub(co)) {
      const dps = co.ema * 30 * 0.35 / co.shares;
      const h = state.portfolio[co.id];
      if (h && h.qty) { const d = h.qty * dps; book('dividends', d); log(`Дивіденди від «${co.name}»: ${money(d, 2)}.`, 'good'); }
      co.cash -= co.ema * 30 * 0.35;
    }
  }
  // поглинання
  // Поглинання між ІІ-компаніями: частіше в межах галузі, іноді — конгломерати з інших галузей.
  if (chance(0.025)) {
    const buyers = aliveCos().filter((c) => c.cash > 3e6 && !isSub(c));
    if (buyers.length) {
      const b = pick(buyers);
      const affordable = aliveCos().filter((c) => c !== b && !isSub(c) && c.price * c.shares * 1.3 < b.cash);
      const same = affordable.filter((c) => c.sector === b.sector);
      const targets = same.length && chance(0.7) ? same : affordable;
      if (targets.length) {
        const t = pick(targets), prem = t.price * 1.3;
        b.acquired = (b.acquired || []).concat(t.name).slice(-6);
        b.cash -= prem * t.shares;
        for (const l of state.lots) if (l.npc && l.npc.co === t.id) l.npc.co = b.id;
        const h = state.portfolio[t.id];
        if (h && h.qty) { book('shares', h.qty * prem); log(`Ваші акції «${t.name}» викуплено з премією: ${money(h.qty * prem)}.`, 'good'); delete state.portfolio[t.id]; }
        t.alive = false; t.fate = `поглинута «${b.name}»`;
        news(`🤝 «${b.name}» поглинає «${t.name}»${t.sector !== b.sector ? ` (${SECTORS[t.sector].name})` : ''} за ${moneyK(prem * t.shares)}.`, 'corp');
      }
    }
  }
  // нові гравці ринку
  if (aliveCos().length < COMPANY_SEED.length && chance(0.03)) {
    const name = pick(RESERVE_NAMES) + (chance(0.5) ? ' Груп' : '');
    if (!state.companies.some((c) => c.name === name)) {
      const sector = pick(Object.keys(SECTORS));
      const co = addCompany(name, name.replace(/[^A-ZА-ЯІЇЄҐ]/gi, '').slice(0, 4).toUpperCase() + ri(1, 9), sector);
      news(`🔔 IPO: «${co.name}» (${SECTORS[sector].name}) виходить на біржу за ціною ${money(co.price, 2)}.`, 'market');
    }
  }
  if (chance(0.012)) {
    const types = Object.keys(TYPES).filter((t) => aliveCos().some((c) => c.sector === t));
    const t = pick(types), co = pick(aliveCos().filter((c) => c.sector === t));
    state.mods.push({ kind: 'pricewar', key: t, mult: 1.35, days: 7, label: `⚔️ Цінова війна: ${TYPES[t].name}` });
    news(`⚔️ «${co.name}» знижує ціни — цінова війна в сегменті «${TYPES[t].name}».`, 'corp', 'bad');
  }
  if (state.ipo) ipoDaily();
}
// ================= Вплив гравця на ІІ-компанії =================
function bizPriceRatio(b) {
  const prods = productsOf(b).filter((p) => b.products[p.id]);
  return prods.length ? sum(prods, (p) => p.share * (b.products[p.id].price / fairPrice(p, b))) / (sum(prods, (p) => p.share) || 1) : 1;
}
/** Множник виручки компанії від дій гравця (1 — без впливу). Пояснення — у playerInfluenceParts. */
function playerInfluence(co) { return playerInfluenceParts(co).factor; }
function playerInfluenceParts(co) {
  let f = 1; const parts = [];
  if (TYPES[co.sector]) {
    const mine = state.biz.filter((b) => b.type === co.sector);
    const ai = state.lots.filter((l) => l.npc && l.npc.type === co.sector && !isSub(coById(l.npc.co))).length;
    if (mine.length) {
      const share = mine.length / (mine.length + ai);
      f *= 1 - 0.6 * share; parts.push(`ваша частка ринку ${Math.round(share * 100)}%`);
      const ratio = sum(mine, bizPriceRatio) / mine.length;
      if (ratio < 0.97) { f *= Math.max(0.6, 1 - (0.97 - ratio) * 1.5); parts.push(`ваші ціни нижчі на ${Math.round((1 - ratio) * 100)}%`); }
      const rep = sum(mine, (b) => b.rep) / mine.length;
      if (rep > 80) { f *= 0.95; parts.push('репутація ваших магазинів'); }
    }
  }
  if (co.sector === 'steel' && state.market.steel.mult < 0.98) { f *= state.market.steel.mult; parts.push('ви збили ціну сталі'); }
  if (co.sector === 'oil' && state.market.oil.mult < 0.98) { f *= state.market.oil.mult; parts.push('ви збили ціну нафти'); }
  const pp = state.fac.filter((x) => x.kind === 'powerplant').length;
  if (co.sector === 'energy' && pp) { f *= Math.max(0.6, 1 - 0.05 * pp); parts.push(`${pp} ваших електростанцій`); }
  const lc = state.fac.filter((x) => x.kind === 'logistics').length;
  if (co.sector === 'logistics' && lc) { f *= Math.max(0.6, 1 - 0.04 * lc); parts.push(`${lc} ваших логістичних центрів`); }
  const live = state.projects.filter((p) => p.status === 'live').length;
  if (co.sector === 'tech' && live) { f *= Math.max(0.6, 1 - 0.02 * live); parts.push(`${live} ваших IT-продуктів`); }
  const cm = state.carModels.filter((m) => m.active).length;
  if (co.sector === 'dealership' && cm) { f *= Math.max(0.6, 1 - 0.04 * cm); parts.push(`${cm} ваших моделей авто`); }
  if (co.sector === 'bank' && state.bank && state.bank.deposits > 0) { const k = Math.min(0.5, state.bank.deposits / (2e9 * priceLvl())); f *= 1 - k; parts.push(`ваш банк забрав ${Math.round(k * 100)}% ринку`); }
  const c = state.contracts && state.contracts[co.id];
  if (c && c.day >= state.day - 1) { f *= 1.03; parts.push('купує у вас за контрактом (+)'); }
  return { factor: clamp(f, 0.3, 1.2), parts };
}

// ================= Регіони =================
const regionCost = (cid) => Math.round(2500000 * CITIES[cid].rent * state.econ.priceLevel);
function unlockCity(cid) {
  if (!CITIES[cid] || state.unlocked[cid]) return;
  const cost = regionCost(cid);
  if (state.cash < cost) return toast(`Вихід на ринок коштує ${moneyK(cost)}.`, 'bad');
  book('capex', -cost);
  state.unlocked[cid] = true;
  genLots(cid, cid + ':');
  news(`🌍 ${state.company} виходить на ринок міста ${CITIES[cid].name} (${REGION_OF[cid]}).`, 'corp', 'good');
  log(`🌍 Відкрито новий ринок: ${CITIES[cid].name}. Ліцензії та реєстрація: ${money(cost)}.`, 'good');
  state.ui.mapCity = cid;
  checkAchievements();
}
/** Сумісність зі старими збереженнями (одне місто). */
function migrateState() {
  if (!state.unlocked) state.unlocked = { [state.city]: true };
  for (const l of state.lots) if (!l.city) l.city = state.city;
  if (!state.contracts) state.contracts = {};
}

// ================= Поглинання компаній =================
const isSub = (co) => !!co && co.owner === 'player';
const coMcap = (co) => co.price * co.shares;
const subsidiaries = () => state.companies.filter((c) => c.alive && isSub(c));
const subsidiariesValue = () => sum(subsidiaries(), coMcap);
/** Ціна викупу: премія 30% до ринку; вже куплені акції зараховуються. */
function takeoverPrice(co) {
  const h = state.portfolio[co.id];
  const owned = h ? Math.min(h.qty, co.shares) : 0;
  return Math.round(co.price * 1.3 * (co.shares - owned));
}
function acquireCompany(id) {
  const co = coById(id);
  if (!co || !co.alive || isSub(co)) return;
  const price = takeoverPrice(co);
  if (state.cash < price) return toast(`Для поглинання потрібно ${moneyK(price)}.`, 'bad');
  book('shares', -price);
  delete state.portfolio[co.id];
  co.owner = 'player'; co.payout = 1; co.boughtFor = price; co.boughtDay = state.day;
  const shops = state.lots.filter((l) => l.npc && l.npc.co === co.id).length;
  news(`🤝 ${state.company} поглинає «${co.name}» за ${moneyK(price)}.`, 'corp', 'good');
  log(`🤝 Поглинуто «${co.name}» (${SECTORS[co.sector].name}, ${shops} точок у місті) за ${money(price)}.`, 'good');
  checkAchievements();
}
function sellSubsidiary(id) {
  const co = coById(id);
  if (!isSub(co)) return;
  const v = Math.round(coMcap(co) * 0.95);
  book('assetSale', v);
  co.owner = null; co.payout = null;
  news(`«${co.name}» знову незалежна: ${state.company} продала компанію за ${moneyK(v)}.`, 'corp');
  log(`Продано дочірню «${co.name}» за ${money(v)}.`, 'good');
}
function companyRanking() {
  const rows = aliveCos().map((c) => ({ co: c, name: c.name, cap: coMcap(c), profit: c.ema, shops: state.lots.filter((l) => l.npc && l.npc.co === c.id).length, sector: SECTORS[c.sector].name }));
  rows.push({ me: true, name: state.company, cap: state.ipo ? state.ipo.price * state.ipo.shares : netWorth(), profit: avgProfit(7), shops: state.biz.length + state.fac.length, sector: 'Ваша корпорація' });
  return rows.sort((a, b) => b.cap - a.cap);
}

// ================= Контракти: ІІ-компанії купують продукцію ваших заводів =================
const CONTRACT_DEMAND = {
  grocery: ['bread', 'dairy', 'veg'], coffee: ['bread', 'dairy'], fastfood: ['bread', 'veg'], restaurant: ['dairy', 'veg', 'bread'],
  fashion: ['clothes', 'cotton'], electronics: ['electronics', 'chips'], dealership: ['steel', 'plastic', 'chips'], tech: ['chips', 'electronics'],
  energy: ['oil'], steel: ['ore'], oil: ['plastic'], logistics: ['oil'], flowers: [], bank: [],
};
const contractPrice = (g) => mktPrice(g) * 1.08 * (1 + 0.025 * state.depts.sales);
function contractsDaily() {
  if (state.flags.noContracts) return 0;
  state.contracts = state.contracts || {};
  let total = 0;
  for (const co of aliveCos()) {
    if (isSub(co)) continue;
    const goods = (CONTRACT_DEMAND[co.sector] || []).filter((g) => whQty(g) > 0);
    if (!goods.length) continue;
    const budget = SECTORS[co.sector].rev * co.scale * 0.04 * priceLvl() * state.econ.demand / goods.length;
    for (const g of goods) {
      const reserve = state.autoSell[g] ? state.autoSell[g].keep : 0;
      const price = contractPrice(g);
      const qty = Math.floor(Math.min(whQty(g) - reserve, budget / price));
      if (qty <= 0) continue;
      whTake(g, qty);
      const v = qty * price;
      book('b2b', v); book('transport', -transportCost(g, qty) * 0.5);
      const c = state.contracts[co.id] || (state.contracts[co.id] = { name: co.name, total: 0, today: 0, goods: {} });
      c.total += v; c.today = (c.day === state.day ? c.today : 0) + v; c.day = state.day;
      c.goods[g] = (c.goods[g] || 0) + qty;
      co.cash -= v * 0.2; // частина закупівлі — витрата компанії-клієнта
      total += v;
    }
  }
  if (total > 0) log(`📑 Контракти: компанії купили вашої продукції на ${money(total)}.`, 'good');
  return total;
}

function bankruptCompany(co) {
  co.alive = false; co.fate = 'банкрут';
  for (const l of state.lots) if (l.npc && l.npc.co === co.id) l.npc = null;
  const h = state.portfolio[co.id];
  if (h && h.qty) { log(`💥 «${co.name}» збанкрутувала — ваші акції знецінились.`, 'bad'); delete state.portfolio[co.id]; }
  news(`💥 «${co.name}» оголошує банкрутство. Точки компанії закриваються.`, 'corp', 'bad');
}
function buyShares(id, qty) {
  const co = coById(id); qty = Math.floor(qty);
  if (!co || !co.alive || qty <= 0) return;
  if (isSub(co)) return toast('Це вже ваша дочірня компанія.', 'bad');
  const c = qty * co.price * 1.003;
  if (state.cash < c) return toast('Недостатньо коштів.', 'bad');
  book('shares', -c);
  const h = state.portfolio[id] || (state.portfolio[id] = { qty: 0, cost: 0 });
  h.cost = (h.cost * h.qty + c) / (h.qty + qty); h.qty += qty;
  toast(`Куплено ${qty} акцій ${co.ticker}.`, 'good');
  checkAchievements();
}
function sellShares(id, qty) {
  const co = coById(id), h = state.portfolio[id];
  if (!co || !h) return;
  qty = Math.min(h.qty, Math.floor(qty));
  if (qty <= 0) return;
  book('shares', qty * co.price * 0.997);
  h.qty -= qty; if (!h.qty) delete state.portfolio[id];
  toast(`Продано ${qty} акцій ${co.ticker}.`, 'good');
}
const portfolioValue = () => sum(Object.entries(state.portfolio), ([id, h]) => { const c = coById(id); return c && c.alive ? h.qty * c.price : 0; });

function avgProfit(n = 30) { const h = state.ledger.slice(-n); return h.length ? sum(h, (x) => x.profit) / h.length : 0; }
function canIPO() { return !state.ipo && netWorth() >= 750000 * priceLvl() && state.biz.length + state.fac.length >= 4 && state.day >= 60; }
function doIPO(pct) {
  if (!canIPO()) return;
  const shares = 10000000;
  const val = netWorth() * 1.1 + Math.max(0, avgProfit()) * 365 * 10;
  const price = val / shares;
  const raise = val * pct * 0.95;
  book('equity', raise);
  state.ipo = { shares, float: pct, price, hist: [price], day: state.day };
  news(`🔔 ${state.company} виходить на біржу! Розміщено ${Math.round(pct * 100)}% акцій по ${money(price, 2)}. Залучено ${moneyK(raise)}.`, 'market', 'good');
  log(`🔔 IPO: залучено ${money(raise)}. Ринкова капіталізація ${moneyK(val)}.`, 'good');
  checkAchievements();
}
function ipoDaily() {
  const I = state.ipo, ph = PHASES[state.econ.phase];
  const fair = Math.max(0.1, (netWorth() + Math.max(0, avgProfit()) * 365 * 12 * ph.pe) / I.shares);
  I.price = Math.max(0.05, I.price * Math.exp(gauss() * 0.015) + (fair - I.price) * 0.05);
  I.hist.push(+I.price.toFixed(2)); if (I.hist.length > 120) I.hist.shift();
}

// ================= Бухгалтерія та оцінка =================
function inventoryValue() {
  return sum(state.biz, stockValue) + sum(Object.values(state.wh.goods), (x) => x.qty * x.cost) + sum(state.orders, (o) => o.cost);
}
const fixedAssets = () => sum(state.biz, (b) => b.bookVal) + sum(state.fac, (f) => f.bookVal) + sum(state.carModels, (m) => m.bookVal || 0);
const propertyValue = () => sum(state.props.filter((p) => p.owned), (p) => (p.building ? p.cost : propValue(p)));
function netWorth() { const B = state.bank; return state.cash + inventoryValue() + fixedAssets() + propertyValue() + portfolioValue() + subsidiariesValue() + (B ? B.capital - B.internal : 0) + (typeof venturesValue === 'function' ? venturesValue() : 0) - debt(); }
function balance() {
  return { cash: state.cash, inventory: inventoryValue(), fixed: fixedAssets(), property: propertyValue(), shares: portfolioValue(), debt: debt(), equity: netWorth() };
}
function depreciate() {
  let dep = 0;
  for (const u of [...state.biz, ...state.fac]) { const d = u.bookVal * 0.0007; u.bookVal -= d; dep += d; }
  return dep;
}

// ================= Події =================
function randomEvent() {
  const d = pick(DISTRICTS.filter((x) => x.zone === 'retail'));
  const myFac = state.fac.filter((f) => staffOf(f).length);
  const evs = [
    () => { state.mods.push({ kind: 'traffic', key: d.id, mult: 1.5, days: 2, label: `🎉 Фестиваль: ${d.name}` }); news(`🎉 У районі «${d.name}» фестиваль — потік людей +50% на 2 дні.`, 'city', 'good'); },
    () => { state.mods.push({ kind: 'traffic', key: '*', mult: 0.75, days: 1, label: '🌧️ Злива' }); news('🌧️ Злива по всьому місту — відвідувачів сьогодні менше.', 'city', 'bad'); },
    () => { state.mods.push({ kind: 'wholesale', key: null, mult: 0.85, days: 3, label: '🏷️ Розпродаж в оптовиків' }); news('🏷️ Оптовики влаштували розпродаж: −15% на закупівлі 3 дні.', 'market', 'good'); },
    () => { const t = pick(Object.keys(TYPES)); state.mods.push({ kind: 'supplier', key: t, mult: 1.2, days: 7, label: `📦 Банкрутство постачальника: ${TYPES[t].name}` }); news(`📦 Великий постачальник для сегмента «${TYPES[t].name}» збанкрутував — оптові ціни +20% на тиждень.`, 'market', 'bad'); },
    () => { const g = pick(Object.keys(GOODS).filter((x) => GOODS[x].raw)); state.market[g].mult *= 1.45; news(`⛽ Стрибок цін на сировину: ${GOODS[g].name} подорожчала на 45%.`, 'market', 'bad'); },
    () => { if (!state.biz.length) return; const b = pick(state.biz); b.rep = clamp(b.rep + 15, 0, 100); news(`🔥 Блогер похвалив «${b.name}» — репутація +15.`, 'city', 'good'); },
    () => {
      if (!state.biz.length && !state.fac.length) return;
      const u = pick([...state.biz, ...state.fac]);
      const risky = u.rep != null ? u.rep < 45 : u.cond < 50;
      if (risky && !chance(0.2 * state.depts.legal)) { const fine = Math.round(rnd(500, 3000) * priceLvl() * (1 - 0.15 * state.depts.legal)); book('fines', -fine); log(`🧾 Перевірка в «${u.name}»: порушення. Штраф ${money(fine)}.`, 'bad'); }
      else log(`🧾 Перевірка в «${u.name}» пройшла без зауважень.`, 'good');
    },
    () => { if (!myFac.length) return; const f = pick(myFac); f.cond = Math.max(0, f.cond - 40); log(`🔧 ${f.name}: серйозна несправність, стан обладнання −40%.`, 'bad'); },
    () => { if (!myFac.length) return; const f = pick(myFac); const avgM = sum(staffOf(f), (p) => p.morale) / staffOf(f).length; if (avgM < 65) { f.strike = 3; news(`✊ Страйк на підприємстві «${f.name}»! Робітники вимагають підвищення зарплат.`, 'corp', 'bad'); log(`✊ Страйк: ${f.name}. Виплатіть премії, щоб зупинити.`, 'bad'); } },
    () => { const up = chance(0.5); state.econ.taxRate = clamp(state.econ.taxRate + (up ? 0.02 : -0.02), 0.1, 0.4); news(`⚖️ Податкова реформа: ставка податку на прибуток ${up ? 'зросла' : 'знизилась'} до ${pct(state.econ.taxRate, 0)}.`, 'econ', up ? 'bad' : 'good'); },
    () => { state.econ.wageLevel *= 1.05; news('⚖️ Уряд підвищив мінімальну зарплату — оплата праці +5%.', 'econ', 'bad'); },
    () => { state.tech.points += 120; news('💡 Нова технологія у відкритому доступі: +120 очок досліджень.', 'tech', 'good'); },
    () => { const up = chance(0.5); state.econ.fx *= up ? 1.08 : 0.94; news(`💱 Валютний ринок: курс ${up ? 'знецінився на 8% — імпорт дорожчає' : 'зміцнився на 6% — імпорт дешевшає'}.`, 'econ', up ? 'bad' : 'good'); },
    () => { const up = chance(0.55); state.econ.housing *= up ? 1.05 : 0.95; news(`🏠 Ринок нерухомості: ціни ${up ? 'зросли на 5%' : 'впали на 5%'}.`, 'econ'); },
  ];
  pick(evs)();
}

// ================= Керуючі (аутсорс управління) =================
// Керуючий: дозакуповує товар протягом дня, підлаштовує запаси під попит, тримає ціни відносно ринку
// (з урахуванням інфляції), наймає й замінює персонал, підвищує зарплати при низькій моралі.
// На заводі: укомплектовує штат, ремонтує, тримає автопостачання; в IT-офісі ще й запускає нові проєкти.
const PRICE_MODES = { cheap: { name: 'Дешево', k: 0.93 }, market: { name: 'Ринкова ціна', k: 1.0 }, premium: { name: 'Преміум', k: 1.12 } };
function bestCandidate(role, minSkill = 0) {
  const pool = state.candidates.filter((c) => c.role === role && c.skill >= minSkill);
  if (!pool.length) return null;
  return pool.sort((a, b) => (b.skill * b.skill) / b.wage - (a.skill * a.skill) / a.wage)[0];
}
function managerHire(u, n) {
  const role = unitRole(u);
  let hired = 0;
  while (hired < n && staffOf(u).length < maxStaff(u)) {
    const c = bestCandidate(role);
    if (!c) break;
    hire(c.id, u.id, true); hired++;
  }
  return hired;
}
function managerFixMorale(u) {
  for (const p of staffOf(u)) if (p.morale < 45 && p.wage < marketWage(p) * 1.15) { p.wage = +(p.wage * 1.1).toFixed(1); p.morale = Math.min(100, p.morale + 12); }
}
function managerRetailHour(b) {
  if (!b.manager || state.hour < b.open || state.hour >= b.close) return;
  for (const p of productsOf(b)) {
    const st = b.products[p.id];
    if (st && st.target > 0 && st.stock < st.target * 0.3) buyStock(b, p.id, st.target - st.stock, 1.02, true);
  }
}
function managerRetailDay(b) {
  if (!b.manager) return;
  const cap = storageCap(b), prods = productsOf(b);
  const mode = PRICE_MODES[b.priceMode || 'market'];
  for (const p of prods) {
    const st = b.products[p.id];
    if (!st) continue;
    // ціни йдуть за інфляцією й не падають нижче собівартості
    const unit = p.carOnly ? st.cost : wholesale(b, p);
    st.price = +Math.max(fairPrice(p, b) * mode.k, unit * 1.15).toFixed(2);
    // запаси під фактичний попит
    const sold = st.soldY || 0, miss = st.missY || 0;
    if (miss > 0) st.target = Math.round(st.target * 1.25 + miss);
    else if (p.spoil > 0 && sold < st.target * 0.5) st.target = Math.max(5, Math.round(st.target * 0.9));
  }
  const tot = sum(prods, (p) => (b.products[p.id] ? b.products[p.id].target : 0));
  if (tot > cap) for (const p of prods) if (b.products[p.id]) b.products[p.id].target = Math.max(1, Math.floor(b.products[p.id].target * cap / tot));
  b.autoRestock = true;
  // персонал
  const y = b.yest;
  if (!staffOf(b).length) managerHire(b, 1);
  if (y && y.lost > Math.max(5, y.served * 0.08)) {
    if (!managerHire(b, 1) && b.upg.equipment < MAX_UPG && state.cash > upgradeCost(b, 'equipment') * 3) { upgradeBiz(b, 'equipment'); log(`🧑‍💼 ${b.name}: керуючий оновив обладнання — черги.`); }
  }
  managerFixMorale(b);
}
function managerFacDay(f) {
  if (!f.manager) return;
  f.autoBuy = true;
  managerHire(f, maxStaff(f) - staffOf(f).length);
  managerFixMorale(f);
  if (f.kind === 'office' && !state.projects.some((p) => p.office === f.id && p.status === 'dev') && staffOf(f).length) {
    const kinds = Object.keys(SOFT).filter((k) => state.tech.it >= SOFT[k].tech);
    const k = kinds.includes('cloud') && staffOf(f).length >= 6 ? 'cloud' : kinds.includes('game') && staffOf(f).length >= 4 ? 'game' : 'app';
    startProject(f.id, k, `${SOFT[k].name} №${state.projects.length + 1}`);
  }
}
function setAllManagers(on) {
  state.flags.autoManagers = on;
  for (const u of [...state.biz, ...state.fac]) u.manager = on;
  log(on ? '🧑‍💼 Управління всіма об’єктами передано керуючим (аутсорс).' : 'Керуючих відкликано з усіх об’єктів.', 'good');
}
function managersMorning() {
  for (const b of state.biz) managerRetailDay(b);
  for (const f of state.fac) managerFacDay(f);
}

// ================= Ритм часу =================
function morning() {
  deliverOrders();
  managersMorning();
  for (const b of state.biz) {
    if (!b.autoRestock) continue;
    let spent = 0, short = false;
    for (const p of productsOf(b)) {
      const st = b.products[p.id];
      if (!st) continue;
      const need = Math.floor(st.target - st.stock);
      if (need > 0) { const r = buyStock(b, p.id, need, b.manager ? 1.02 : 1.1, true); spent += r.cost; if (!r.ok && !p.carOnly) short = true; }
    }
    if (short) log(`${b.name}: автозакупівля неповна — бракує грошей або місця.`, 'bad');
  }
  for (const f of HOOKS.morning) f();
}

function retailEndOfDay() {
  for (const b of state.biz) {
    const wages = dailyWages(b) + (b.manager ? managerCost() : 0), rent = lotRent(lotOf(b)), mkt = dailyMarketing(b);
    let spoil = 0;
    for (const p of productsOf(b)) {
      const st = b.products[p.id];
      if (!st) continue;
      if (p.spoil > 0 && st.stock > 0) { const lost = Math.floor(st.stock * p.spoil); st.stock -= lost; spoil += lost * st.cost; }
      st.soldY = st.sold; st.sold = 0; st.missY = st.miss || 0; st.miss = 0;
    }
    book('wages', -wages); book('rent', -rent); book('marketing', -mkt);
    const t = b.today;
    const profit = t.rev - t.cogs - wages - rent - mkt - spoil;
    b.yest = { ...t, wages, rent, mkt, spoil, profit, sat: t.satN ? t.satSum / t.satN : null };
    b.history.push({ day: state.day, rev: t.rev, profit, cust: t.served });
    if (b.history.length > 30) b.history.shift();
    if (t.noStaff > 0) log(`${b.name}: не працював(-ла) без персоналу ${t.noStaff} год.`, 'bad');
    b.today = emptyDay();
  }
  for (const f of state.fac) book('rent', -lotRent(lotOf(f)));
}

function endOfDay() {
  retailEndOfDay();
  powerPool = 0;
  for (const f of state.fac) facDaily(f, 'power');
  for (const f of state.fac) facDaily(f, 'other');
  if (powerPool > 0) { book('power', powerPool * state.econ.power * priceLvl() * 0.7); powerPool = 0; }
  contractsDaily();
  for (const [g, s] of Object.entries(state.autoSell)) if (s && s.on && whQty(g) > s.keep) marketSell(g, whQty(g) - s.keep, true);
  projectsDaily();
  propsDaily();
  personalDaily();
  book('depts', -sum(Object.values(state.depts), deptDaily));
  state.tech.points += state.depts.rnd * 12;
  staffDaily();
  bankDaily();
  econDaily();
  aiDaily();
  // підсумок дня
  const L = state.led;
  const inv = inventoryValue(), invDelta = inv - state.invPrev; state.invPrev = inv;
  const dep = depreciate();
  let profit = invDelta - dep;
  for (const [k, v] of Object.entries(L)) if (LEDGER[k] && LEDGER[k].kind !== 'cash') profit += v;
  state.ledger.push({ day: state.day, ...L, invDelta, dep, profit });
  if (state.ledger.length > 120) state.ledger.shift();
  state.led = {};
  if (state.day % 7 === 0) {
    const wk = sum(state.ledger.slice(-7), (x) => x.profit - (x.salary || 0));
    if (wk > 0) { const tax = wk * state.econ.taxRate * (1 - 0.04 * state.depts.accounting); book('tax', -tax); log(`Сплачено податок на прибуток: ${money(tax)} (${pct(state.econ.taxRate, 0)}).`); }
  }
  state.mods = state.mods.filter((m) => --m.days > 0);
  const rev = (L.sales || 0) + (L.b2b || 0) + (L.software || 0) + (L.rentInc || 0);
  state.history.push({ day: state.day, cash: state.cash, profit, rev, nw: netWorth() });
  if (state.history.length > 120) state.history.shift();
  if (state.biz.length || state.fac.length) log(`Підсумок дня ${state.day}: виручка ${money(rev)}, прибуток ${money(profit)}.`, profit >= 0 ? 'good' : 'bad');
  state.day++;
  if (chance(0.35)) randomEvent();
  for (const f of HOOKS.day) f();
  checkAchievements();
  // банкрутство
  const lim = -15000 * priceLvl();
  state.negDays = state.cash < lim ? state.negDays + 1 : 0;
  if (state.negDays >= 3) gameOver();
  else if (state.cash < 0) toast('⚠️ Від’ємний баланс! Скоротіть витрати або візьміть кредит.', 'bad');
  save();
}

function tick() {
  if (!state || state.over) return;
  state.hour++;
  if (state.hour >= 24) { state.hour = 0; endOfDay(); if (state.over) return; }
  if (state.hour === 6) morning();
  for (const b of state.biz) { managerRetailHour(b); simulateHour(b, state.hour); }
  for (const f of HOOKS.hour) f();
}

// ================= Досягнення =================
const ACHIEVEMENTS = [
  { id: 'first_biz', icon: '🚀', name: 'Перший крок', desc: 'Відкрийте перший бізнес', check: (s) => s.biz.length >= 1 },
  { id: 'first_profit', icon: '📈', name: 'У плюсі', desc: 'Завершіть день із прибутком', check: (s) => s.ledger.some((h) => h.profit > 0) },
  { id: 'three_biz', icon: '🏪', name: 'Мережа', desc: 'Володійте 3 магазинами', check: (s) => s.biz.length >= 3 },
  { id: 'ten_staff', icon: '👥', name: 'Роботодавець', desc: '10 працівників', check: (s) => s.staff.length >= 10 },
  { id: 'hundred_staff', icon: '🏢', name: 'Великий роботодавець', desc: '100 працівників', check: (s) => s.staff.length >= 100 },
  { id: 'rep90', icon: '⭐', name: 'Улюблене місце', desc: 'Репутація магазину 90+', check: (s) => s.biz.some((b) => b.rep >= 90) },
  { id: 'all_districts', icon: '🗺️', name: 'Усе місто', desc: 'Бізнес у кожному торговому районі', check: (s) => DISTRICTS.filter((d) => d.zone === 'retail').every((d) => s.biz.some((b) => lotOf(b).district === d.id) || s.fac.some((f) => lotOf(f).district === d.id)) },
  { id: 'factory', icon: '🏭', name: 'Промисловець', desc: 'Збудуйте перше підприємство', check: (s) => s.fac.some((f) => f.kind !== 'office') },
  { id: 'chain', icon: '🔗', name: 'Вертикальна інтеграція', desc: 'Продавайте у своїх магазинах власну продукцію', check: (s) => s.flags.ownSupply },
  { id: 'car', icon: '🚗', name: 'Автобренд', desc: 'Розробіть власний автомобіль', check: (s) => s.carModels.length > 0 },
  { id: 'car100', icon: '🏁', name: 'Сотня авто', desc: 'Продайте 100 автомобілів', check: (s) => sum(s.carModels, (m) => m.sold) >= 100 },
  { id: 'release', icon: '💻', name: 'Реліз', desc: 'Випустіть IT-продукт', check: (s) => s.projects.some((p) => p.status !== 'dev') },
  { id: 'landlord', icon: '🏠', name: 'Орендодавець', desc: 'Володійте 3 об’єктами нерухомості', check: (s) => s.props.filter((p) => p.owned).length >= 3 },
  { id: 'builder', icon: '🏗️', name: 'Забудовник', desc: 'Завершіть будівництво', check: (s) => s.flags.built },
  { id: 'investor', icon: '📊', name: 'Інвестор', desc: 'Акції 5 різних компаній', check: (s) => Object.keys(s.portfolio).length >= 5 },
  { id: 'corp', icon: '🏛️', name: 'Корпорація', desc: 'Усі 6 відділів працюють', check: (s) => Object.values(s.depts).every((v) => v > 0) },
  { id: 'ipo', icon: '🔔', name: 'Публічна компанія', desc: 'Проведіть IPO', check: (s) => !!s.ipo },
  { id: 'cities3', icon: '🌍', name: 'Міжнародна корпорація', desc: 'Бізнес у 3 містах', check: (s) => new Set([...s.biz, ...s.fac].map((u) => lotCityId(lotOf(u)))).size >= 3 },
  { id: 'cities6', icon: '🌐', name: 'Глобальна присутність', desc: 'Бізнес у 6 містах', check: (s) => new Set([...s.biz, ...s.fac].map((u) => lotCityId(lotOf(u)))).size >= 6 },
  { id: 'vc', icon: '🚀', name: 'Венчурний інвестор', desc: 'Успішний вихід зі стартапу', check: (s) => !!(s.vc && s.vc.stats.exits > 0) },
  { id: 'unicorn', icon: '🦄', name: 'Єдиноріг', desc: 'Вихід зі стартапу-єдинорога', check: (s) => !!(s.vc && s.vc.done.some((d) => d.tier === 'unicorn' && d.got > d.invested)) },
  { id: 'sponsor', icon: '🤝', name: 'Меценат спорту', desc: 'Спонсоруйте команду', check: (s) => !!(s.sport && s.sport.teams.some((t) => t.sponsor === 'player')) },
  { id: 'champion', icon: '🏆', name: 'Чемпіон', desc: 'Ваша команда виграла сезон', check: (s) => !!(s.sport && s.sport.trophies > 0) },
  { id: 'banker', icon: '🏦', name: 'Банкір', desc: 'Отримайте банківську ліцензію', check: (s) => !!s.bank },
  { id: 'takeover', icon: '🦈', name: 'Поглинач', desc: 'Викупіть іншу компанію', check: (s) => s.companies.some((c) => c.owner === 'player') },
  { id: 'top1', icon: '🥇', name: 'Номер один', desc: 'Найдорожча компанія міста', check: () => companyRanking()[0].me },
  { id: 'debt_free', icon: '🏦', name: 'Без боргів', desc: 'Повністю погасіть кредит', check: (s) => s.flags.repaid },
  { id: 'nw1m', icon: '👑', name: 'Мільйонер', desc: 'Чистий капітал $1 млн', check: () => netWorth() >= 1e6 },
  { id: 'nw10m', icon: '💎', name: 'Національна корпорація', desc: 'Чистий капітал $10 млн', check: () => netWorth() >= 1e7 },
  { id: 'nw100m', icon: '🌍', name: 'Глобальна імперія', desc: 'Чистий капітал $100 млн', check: () => netWorth() >= 1e8 },
];
function checkAchievements() {
  for (const a of ACHIEVEMENTS) {
    if (!state.achievements[a.id] && a.check(state)) {
      state.achievements[a.id] = state.day;
      toast(`🏆 Досягнення: ${a.name}`, 'good');
      log(`🏆 Досягнення відкрито: ${a.name}.`, 'good');
    }
  }
}
function gameOver() {
  state.over = true;
  if (typeof setSpeed === 'function') setSpeed(0);
  news(`💥 Компанія «${state.company}» оголосила банкрутство.`, 'corp', 'bad');
  if (typeof showModal === 'function') showModal(`<h2>💸 Банкрутство</h2><p>Борги стали непосильними — «${esc(state.company)}» збанкрутувала на ${state.day}-й день.</p><p>Найкращий капітал: <b>${money(Math.max(...state.history.map((h) => h.nw), 0))}</b></p><div class="row end"><button class="btn primary" data-act="newGamePrompt">Нова гра</button></div>`);
}
