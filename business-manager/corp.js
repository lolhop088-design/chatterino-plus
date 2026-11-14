'use strict';
/* БІЗНЕС ІМПЕРІЯ — нові галузі та міжнародний бізнес (Ultimate 3.0, етап 3, частина 1).
   Нова сировина й заводи (газ, цемент, ліки); сервісні галузі-підрозділи в містах: телеком, авіакомпанія,
   готелі й туризм, страхування, будівництво; фармацевтичні R&D (клінічні випробування, патенти, ліцензії);
   космічна програма (супутники, запуски); міжнародний холдинг. Нові ІІ-компанії в цих галузях. */

// ---------- Нова сировина й виробництва ----------
Object.assign(GOODS, {
  gas: { name: 'Природний газ', icon: '🔥', price: 0.9, w: 1, raw: true },
  cement: { name: 'Цемент', icon: '🧱', price: 0.95, w: 2 },
  medicine: { name: 'Ліки', icon: '💊', price: 18, w: 0.1 },
});
Object.assign(FACILITIES, {
  gasfield: { name: 'Газове родовище', icon: '🔥', setup: 110000, staff: 5, power: 2, zones: ['industry'], sizes: ['L', 'XL'], role: 'worker', shape: 'oil', recipes: [{ id: 'gas', out: 'gas', rate: 3300, in: {} }] },
  cementplant: { name: 'Цементний завод', icon: '🧱', setup: 70000, staff: 6, power: 6, zones: ['industry'], sizes: ['L', 'XL'], role: 'worker', shape: 'factory', recipes: [{ id: 'cement', out: 'cement', rate: 6000, in: { sand: 1.5 } }] },
  pharmaplant: { name: 'Фармацевтичний завод', icon: '💊', setup: 280000, staff: 14, power: 5, zones: ['industry'], sizes: ['XL'], role: 'engineer', shape: 'clean', recipes: [{ id: 'medicine', out: 'medicine', rate: 600, in: { plastic: 0.3, grain: 0.5 } }] },
});
FACILITIES.powerplant.recipes.push({ id: 'power_gas', out: 'power', rate: 150, in: { gas: 22 } });
Object.assign(COMMOD_LINKS, { gas: { gas: 1 }, cement: { gas: 0.3 }, medicine: { oil: 0.1 } });
Object.assign(SECTORS, {
  telecom: { name: 'Телеком', rev: 200000, margin: 0.18, pe: 14 },
  airline: { name: 'Авіаперевезення', rev: 220000, margin: 0.05, pe: 10 },
  hotel: { name: 'Готелі й туризм', rev: 70000, margin: 0.1, pe: 16 },
  insurance: { name: 'Страхування', rev: 160000, margin: 0.12, pe: 12 },
  pharma: { name: 'Фармацевтика', rev: 200000, margin: 0.2, pe: 22 },
  space: { name: 'Космос', rev: 150000, margin: 0.08, pe: 40 },
  construction: { name: 'Будівництво', rev: 130000, margin: 0.07, pe: 11 },
  agro: { name: 'Агробізнес', rev: 110000, margin: 0.09, pe: 12 },
});
Object.assign(AI_FAC, { agro: ['farm'], pharma: ['pharmaplant'], construction: ['cementplant'] });
AI_FAC.oil = [...AI_FAC.oil, 'gasfield'];
if (SUBSIDY_TARGETS.energy) SUBSIDY_TARGETS.energy.kinds.push('gasfield');
if (SUBSIDY_TARGETS.industry) SUBSIDY_TARGETS.industry.kinds.push('cementplant', 'pharmaplant');
const COMPANY_SEED2 = [
  ['Водафорт', 'VDFT', 'telecom'], ['Київстрім', 'KVST', 'telecom'], ['Ей-Ті-енд-Ті Глобал', 'ATTG', 'telecom'],
  ['Люфтганза Єр', 'LFTG', 'airline'], ['Райанейр Лайт', 'RYNL', 'airline'], ['Емірейтс Скай', 'EMRS', 'airline'],
  ['Хілтоун Готелі', 'HLTN', 'hotel'], ['Маріотт Плаза', 'MRTP', 'hotel'], ['Ейрбейс Хоумс', 'AIRH', 'hotel'],
  ['Аліанц Захист', 'ALNZ', 'insurance'], ['Аксай Страхування', 'AXSI', 'insurance'],
  ['Пфайзерон', 'PFZN', 'pharma'], ['Фармак-Плюс', 'FRMP', 'pharma'], ['Байєрс Фарма', 'BAYF', 'pharma'],
  ['СпейсІкс Орбіта', 'SPXO', 'space'], ['Блу Орбітал', 'BLUO', 'space'],
  ['Вінсі Білд', 'VNCB', 'construction'], ['Брук Констракшн', 'BRKC', 'construction'],
  ['Кернел Агро', 'KRNA', 'agro'], ['МХП Фудс', 'MHPF', 'agro'],
];

// ---------- Сервісні галузі (підрозділи в містах) ----------
const INDUSTRIES = {
  telecom: { name: 'Телеком і інтернет', icon: '📶', sector: 'telecom', setup: 4e6, unit: 'абонентів', cap: 150000, arpu: 0.25, vc: 0.08, fixed: 18000, demand: 700000, elast: 1.6, desc: 'Мобільний зв’язок і інтернет. Великі постійні витрати, низькі змінні. Супутники власної космічної програми підвищують якість.' },
  airline: { name: 'Авіакомпанія', icon: '✈️', sector: 'airline', setup: 12e6, unit: 'пасажирів/день', cap: 2500, arpu: 128, vc: 95, fixed: 60000, demand: 9000, elast: 1.4, desc: 'Пасажиропотік залежить від туризму та кількості ваших ринків. Пальне прив’язане до ціни нафти. Низька якість — ризик інцидентів.' },
  hotel: { name: 'Готелі й туризм', icon: '🏨', sector: 'hotel', setup: 3e6, unit: 'зайнятих номерів', cap: 400, arpu: 90, vc: 38, fixed: 12000, demand: 2600, elast: 1.3, desc: 'Сезонність, туристичні міста дають більше гостей; злочинність і катастрофи їх відлякують.' },
  insurance: { name: 'Страхова компанія', icon: '☂️', sector: 'insurance', setup: 5e6, unit: 'полісів', cap: 80000, arpu: 1.2, vc: 0.8, fixed: 15000, demand: 260000, elast: 1.5, desc: 'Премії щодня, виплати — за збитковістю. Катастрофи різко збільшують виплати. Регулятор вимагає резервів.' },
  construction: { name: 'Будівельна компанія', icon: '🏗️', sector: 'construction', setup: 6e6, unit: 'бригад у роботі', cap: 20, arpu: 7500, vc: 6000, fixed: 12000, demand: 70, elast: 1.2, desc: 'Попит іде за економікою й ринком житла, держпрограми інфраструктури його підсилюють. Собівартість залежить від сталі й цементу.' },
};
const PRICE_IDX = [0.8, 0.9, 1, 1.1, 1.25];
const QUALITY_PLANS = [{ name: 'Економ', target: 40, cost: 0.7 }, { name: 'Стандарт', target: 65, cost: 1 }, { name: 'Преміум', target: 90, cost: 1.6 }];

function corpState() {
  if (state.corp) return state.corp;
  state.corp = { divs: [], drugs: [], sats: [], builds: [], space: null, pharma: null, holding: null, lossShock: 1, disasters: [], seq: 1 };
  for (const [name, ticker, sector] of COMPANY_SEED2) if (!coById(ticker)) addCompany(name, ticker, sector);
  for (const g of Object.keys(GOODS)) if (!state.market[g]) state.market[g] = { mult: rnd(0.9, 1.1) };
  return state.corp;
}
const divById = (id) => corpState().divs.find((d) => d.id === id);
const myDivs = (ind) => corpState().divs.filter((d) => !ind || d.ind === ind);
const divPriceAt = (cid) => state.econ.priceLevel * CITIES[cid].price * (state.world ? fxPriceFactor(cid) : 1);
function divCost(ind, cid) { return Math.round(INDUSTRIES[ind].setup * divPriceAt(cid)); }
const upgradeDivCost = (d) => Math.round(INDUSTRIES[d.ind].setup * 0.6 * d.level * divPriceAt(d.city));

function openDivision(ind, cid) {
  const I = INDUSTRIES[ind], C = corpState();
  if (!state.unlocked || !state.unlocked[cid]) return toast('Спершу відкрийте цей ринок у розділі «Регіони».', 'bad');
  if (C.divs.some((d) => d.ind === ind && d.city === cid)) return toast('У цьому місті вже є такий підрозділ.', 'bad');
  const cost = divCost(ind, cid);
  if (state.cash < cost) return toast(`Потрібно ${moneyK(cost)}.`, 'bad');
  book('capex', -cost);
  C.divs.push({ id: 'd' + (C.seq++), ind, city: cid, level: 1, quality: 50, price: 2, plan: 1, mkt: 0, cust: 0, share: 0, invested: cost, opened: state.day, y: null, hist: [] });
  log(`${I.icon} Запущено: ${I.name} у місті ${CITIES[cid].name} (${money(cost)}).`, 'good');
  news(`${I.icon} ${state.company} виходить на ринок «${I.name}» (${CITIES[cid].name}).`, 'business');
  checkAchievements();
}
function upgradeDivision(id) {
  const d = divById(id); if (!d) return; if (d.level >= 5) return toast('Максимальний рівень.', 'bad');
  const c = upgradeDivCost(d); if (state.cash < c) return toast(`Потрібно ${moneyK(c)}.`, 'bad');
  book('capex', -c); d.level++; d.invested += c;
  log(`${INDUSTRIES[d.ind].icon} ${INDUSTRIES[d.ind].name} (${CITIES[d.city].name}) розширено до рівня ${d.level}.`, 'good');
}
function sellDivision(id) {
  const C = corpState(), d = divById(id); if (!d) return;
  const v = Math.round(divValue(d));
  book('assetSale', v); C.divs = C.divs.filter((x) => x !== d);
  log(`Підрозділ продано за ${money(v)}.`, 'good');
}
function divValue(d) {
  const prof = d.hist.length ? sum(d.hist.slice(-30), (h) => h.p) / Math.min(30, d.hist.length) : 0;
  return Math.max(d.invested * 0.5, d.invested * 0.6 + Math.max(0, prof) * 365 * 4);
}
const divisionsValue = () => (state.corp ? sum(state.corp.divs, divValue) + sum(state.corp.sats, () => 15e6 * priceLvl()) : 0);

/** Сила конкурентів у галузі: ІІ-компанії сектору (крім ваших дочірніх). */
function sectorRivals(sector) { return aliveCos().filter((c) => c.sector === sector && !isSub(c)); }
function divDemand(d) {
  const I = INDUSTRIES[d.ind], C = CITIES[d.city], e = state.econ;
  let D = I.demand * C.traffic * e.demand;
  if (d.ind === 'hotel') D *= (C.tourism || 1) * (1 + 0.25 * Math.sin(state.day / 365 * Math.PI * 2)) * (state.crime ? 1 - 0.3 * crimeIndex(d.city) : 1);
  if (d.ind === 'airline') D *= (C.tourism || 1) * (0.7 + 0.1 * Math.min(6, Object.keys(state.unlocked || {}).length));
  if (d.ind === 'construction') D *= e.housing * (e.phase === 'boom' ? 1.3 : e.phase === 'crisis' ? 0.6 : 1) * (1 + 0.1 * corpState().builds.length);
  if (d.ind === 'telecom') D *= 1 + 0.02 * state.tech.it;
  for (const z of corpState().disasters) if (z.city === d.city && (d.ind === 'hotel' || d.ind === 'airline')) D *= 0.6;
  return D;
}
function divAttract(d) {
  const I = INDUSTRIES[d.ind];
  const rep = state.media ? 0.85 + 0.3 * state.media.corpRep / 100 : 1;
  return Math.pow(d.quality / 65, 1.2) * Math.pow(PRICE_IDX[d.price], -I.elast) * (1 + 0.12 * d.mkt) * rep * Math.sqrt(d.level);
}

function divDaily(d) {
  const I = INDUSTRIES[d.ind], C = corpState(), pa = divPriceAt(d.city), Q = QUALITY_PLANS[d.plan];
  // якість тяжіє до плану; супутники допомагають телекому
  const qTarget = Q.target + (d.ind === 'telecom' ? Math.min(10, C.sats.length * 3) : 0) + state.tech.it * 0.5;
  d.quality = clamp(d.quality + (qTarget - d.quality) * 0.03, 5, 100);
  const rivals = sectorRivals(I.sector);
  const cartel = state.war && state.war.cartels.find((k) => k.sector === I.sector && k.members.includes('player'));
  const comp = sum(rivals, (c) => coStrength(c) * Math.sqrt(c.scale)) * 0.55 * (cartel ? 0.6 : 1);
  const a = divAttract(d);
  d.share = a / (a + comp + 0.2);
  const target = Math.min(I.cap * d.level, divDemand(d) * d.share);
  d.cust += (target - d.cust) * 0.06;
  // фінанси
  let vc = I.vc;
  if (d.ind === 'airline') vc *= 0.4 + 0.6 * commodFactor('oil');
  if (d.ind === 'insurance') vc *= C.lossShock * (d.city && C.disasters.some((z) => z.city === d.city) ? 2.5 : 1);
  if (d.ind === 'construction') vc *= 0.5 + 0.25 * commodFactor('steel') + 0.25 * (state.market.cement ? state.market.cement.mult : 1);
  const rev = d.cust * I.arpu * PRICE_IDX[d.price] * pa;
  const cost = d.cust * vc * pa * (0.85 + 0.15 * d.quality / 65) + I.fixed * d.level * pa * Q.cost + I.fixed * 0.35 * d.mkt * pa;
  book('divRev', rev); book('divCost', -cost);
  d.y = { rev, cost, p: rev - cost, cust: d.cust, share: d.share };
  d.hist.push({ day: state.day, p: rev - cost, c: Math.round(d.cust) }); if (d.hist.length > 90) d.hist.shift();
  // галузеві події
  if (d.ind === 'airline' && d.quality < 40 && chance(0.003)) {
    const fine = Math.round(2e6 * pa);
    book('fines', -fine); d.cust *= 0.7;
    news(`✈️ Інцидент з літаком ${state.company} (${CITIES[d.city].name}): авіарегулятор оштрафував компанію на ${moneyK(fine)}.`, 'business', 'bad', true);
    if (typeof applyReputation === 'function') applyReputation('player', -2);
  }
  if (d.ind === 'insurance' && state.day % 30 === 0) {
    // резерви: регулятор вимагає капіталу на рівні 20% річних премій
    const need = rev * 365 * 0.2 / 10, finreg = state.gov ? state.gov.ministries.finreg.strict : 0.5;
    if (state.cash < need && chance(finreg)) { const f = Math.round(need * 0.05); book('fines', -f); log(`☂️ Фінрегулятор: недостатні резерви страхової компанії. Штраф ${money(f)}.`, 'bad'); }
  }
}

// ---------- Фармацевтика: випробування, патенти, ліцензії ----------
const DRUG_AREAS = { onco: 'Онкологія', cardio: 'Кардіологія', neuro: 'Неврологія', vaccine: 'Вакцини', derm: 'Дерматологія', rare: 'Рідкісні хвороби' };
const PHASES_RX = [
  { name: 'Доклінічні', days: 40, cost: 15000, p: 0.8 },
  { name: 'Фаза I', days: 60, cost: 30000, p: 0.7 },
  { name: 'Фаза II', days: 90, cost: 70000, p: 0.55 },
  { name: 'Фаза III', days: 120, cost: 160000, p: 0.65 },
  { name: 'Реєстрація', days: 30, cost: 20000, p: 0.95 },
];
const PHARMA_SETUP = 8e6, SPACE_SETUP = 50e6;
function foundPharma() {
  const C = corpState(); if (C.pharma) return;
  const c = PHARMA_SETUP * priceLvl(); if (state.cash < c) return toast(`Дослідницький центр коштує ${moneyK(c)}.`, 'bad');
  book('capex', -c); C.pharma = { since: state.day, scientists: 20, invested: c };
  log('🧬 Відкрито фармацевтичний дослідницький центр.', 'good');
}
function startDrug(area) {
  const C = corpState(); if (!C.pharma) return;
  if (C.drugs.filter((x) => x.stage < PHASES_RX.length).length >= 2 + Math.floor(C.pharma.scientists / 30)) return toast('Замало науковців для ще одного проєкту.', 'bad');
  const c = 1e6 * priceLvl(); if (state.cash < c) return toast(`Старт проєкту: ${moneyK(c)}.`, 'bad');
  book('divCost', -c);
  const name = pick(['Ксан', 'Віро', 'Кардо', 'Нейро', 'Онко', 'Дерма', 'Іму', 'Фарм']) + pick(['ліз', 'мед', 'цин', 'тат', 'віл', 'прил', 'зол']) + '-' + ri(10, 99);
  C.drugs.push({ id: 'rx' + (C.seq++), name, area, stage: 0, day: 0, potential: +rnd(0.4, 2.2).toFixed(2), approved: null, patentUntil: null, licensed: null, rev: 0 });
  log(`🧬 Старт розробки препарату ${name} (${DRUG_AREAS[area]}).`);
}
function hireScientists(n) {
  const C = corpState(); if (!C.pharma) return;
  C.pharma.scientists = clamp(C.pharma.scientists + n, 10, 200);
}
function licenseDrug(id) {
  const C = corpState(), x = C.drugs.find((d) => d.id === id); if (!x || !x.approved || x.licensed) return;
  const buyer = pick(sectorRivals('pharma')); if (!buyer) return toast('Немає покупців.', 'bad');
  const lump = Math.round(drugPeak(x) * 250);
  book('ventureExit', lump); buyer.cash -= lump; x.licensed = buyer.id;
  news(`💊 ${state.company} ліцензує препарат ${x.name} компанії «${buyer.name}» за ${moneyK(lump)}.`, 'business', 'good');
}
const drugPeak = (x) => 60000 * x.potential * priceLvl() * (x.area === 'onco' || x.area === 'rare' ? 1.6 : 1);
function pharmaDaily() {
  const C = corpState(); if (!C.pharma) return;
  book('divCost', -C.pharma.scientists * 260 * wageLvl());
  for (const x of C.drugs) {
    if (x.stage < PHASES_RX.length) {
      const P = PHASES_RX[x.stage];
      book('divCost', -P.cost * priceLvl()); x.day++;
      if (x.day >= P.days) {
        const p = clamp(P.p + state.tech.it * 0.01 + (C.pharma.scientists - 20) * 0.0015, 0.05, 0.95);
        if (chance(p)) { x.stage++; x.day = 0; if (x.stage === PHASES_RX.length) { x.approved = state.day; x.patentUntil = state.day + 720; news(`💊 Препарат ${x.name} (${state.company}) схвалено регулятором! Патентний захист до дня ${x.patentUntil}.`, 'business', 'good', true); if (typeof applyReputation === 'function') applyReputation('player', 1.5); } else log(`🧬 ${x.name}: успішно завершено «${P.name}».`, 'good'); }
        else { x.stage = 99; x.failed = state.day; log(`🧬 ${x.name}: проєкт провалив «${P.name}». Інвестиції втрачено.`, 'bad'); }
      }
    } else if (x.approved && !x.licensed) {
      const age = state.day - x.approved, ramp = Math.min(1, age / 60), generic = state.day > x.patentUntil ? 0.2 : 1;
      x.rev = drugPeak(x) * ramp * generic * state.econ.demand;
      book('divRev', x.rev); book('divCost', -x.rev * 0.25);
      // порушення патенту генериком — можна подати до суду
      if (generic === 1 && chance(0.002) && state.war) { const co = pick(sectorRivals('pharma')); if (co) { x.copied = co.id; news(`💊 «${co.name}» випустила аналог ${x.name}, не чекаючи завершення патенту.`, 'business', 'bad'); } }
      if (x.copied) x.rev *= 0.75;
    }
  }
  C.drugs = C.drugs.filter((x) => x.stage !== 99 || state.day - x.failed < 60).slice(-30);
}

// ---------- Космос ----------
function foundSpace() {
  const C = corpState(); if (C.space) return;
  const c = SPACE_SETUP * priceLvl(); if (state.cash < c) return toast(`Космічна програма коштує ${moneyK(c)}.`, 'bad');
  book('capex', -c); C.space = { since: state.day, rel: 0.7, launches: 0, fails: 0, invested: c };
  news(`🚀 ${state.company} запускає власну космічну програму.`, 'business', '', true);
  checkAchievements();
}
const SAT_COST = 20e6, LAUNCH_COST = 8e6;
function buildSatellite(kind) {
  const C = corpState(); if (!C.space) return;
  const c = SAT_COST * priceLvl(); if (state.cash < c) return toast(`Супутник коштує ${moneyK(c)}.`, 'bad');
  book('capex', -c); C.builds.push({ id: 's' + (C.seq++), kind, ready: state.day + 120 });
  log(`🛰️ Почато виробництво супутника (${kind === 'comm' ? 'зв’язок' : kind === 'geo' ? 'спостереження Землі' : 'навігація'}). Готовність через 120 днів.`);
}
function launch(id) {
  const C = corpState(), b = C.builds.find((x) => x.id === id); if (!b || b.ready > state.day) return;
  const c = LAUNCH_COST * priceLvl(); if (state.cash < c) return toast(`Запуск коштує ${moneyK(c)}.`, 'bad');
  book('divCost', -c); C.builds = C.builds.filter((x) => x !== b); C.space.launches++;
  if (chance(C.space.rel)) {
    C.sats.push({ id: b.id, kind: b.kind, since: state.day, until: state.day + 1500 });
    C.space.rel = Math.min(0.97, C.space.rel + 0.03);
    news(`🚀 Успішний запуск: супутник ${state.company} на орбіті.`, 'tech', 'good', true);
  } else { C.space.fails++; C.space.rel = Math.min(0.97, C.space.rel + 0.05); news(`💥 Аварія ракети ${state.company}: супутник втрачено.`, 'tech', 'bad', true); if (typeof applyReputation === 'function') applyReputation('player', -1); }
  checkAchievements();
}
function spaceDaily() {
  const C = corpState(); if (!C.space) return;
  book('divCost', -80000 * priceLvl());
  C.sats = C.sats.filter((s) => s.until > state.day);
  for (const s of C.sats) book('divRev', (s.kind === 'comm' ? 70000 : s.kind === 'geo' ? 55000 : 60000) * priceLvl());
  // державні замовлення на запуски
  if (chance(0.01) && C.space.launches > 0) { const v = Math.round(rnd(10, 30) * 1e6 * priceLvl()); book('divRev', v * 0.3); news(`🚀 Держзамовлення: ${state.company} виведе на орбіту державний апарат. Прибуток ${moneyK(v * 0.3)}.`, 'tech', 'good'); }
}

// ---------- Міжнародний холдинг ----------
const HOLDINGS = {
  eu: { name: 'Європейський холдинг (Нідерланди)', setup: 2e6, daily: 15000, rate: -0.8, tax: 1, rep: 0, desc: 'Дешевший капітал: ставка кредитів −0.8 п.п., вища довіра інвесторів.' },
  offshore: { name: 'Холдинг у вільній економічній зоні', setup: 1.5e6, daily: 10000, rate: 0, tax: 0.85, rep: -5, desc: 'Податок на прибуток ×0.85, але частіші податкові перевірки та гірша репутація.' },
};
function foundHolding(k) {
  const C = corpState(), H = HOLDINGS[k]; if (!H) { C.holding = null; return log('Холдингову структуру ліквідовано.'); }
  const c = H.setup * priceLvl(); if (state.cash < c) return toast(`Реєстрація: ${moneyK(c)}.`, 'bad');
  book('capex', -c); C.holding = k;
  if (state.media) state.media.corpRep = clamp(state.media.corpRep + H.rep, 0, 100);
  log(`🏛️ Зареєстровано: ${H.name}.`, 'good');
}
const holdingRate = () => (state.corp && state.corp.holding ? HOLDINGS[state.corp.holding].rate : 0);
const holdingTax = () => (state.corp && state.corp.holding ? HOLDINGS[state.corp.holding].tax : 1);

// ---------- Щоденна симуляція ----------
function corpDaily() {
  const C = corpState();
  for (const d of C.divs) divDaily(d);
  pharmaDaily(); spaceDaily();
  if (C.holding) {
    const H = HOLDINGS[C.holding]; book('depts', -H.daily * priceLvl());
    if (C.holding === 'offshore' && chance(0.004) && state.ledger.length > 30) { const extra = Math.round(Math.max(0, sum(state.ledger.slice(-30), (x) => x.profit)) * state.econ.taxRate * 0.15); if (extra > 0) { book('tax', -extra); log(`🧾 Податкова перевірила операції офшорного холдингу: донараховано ${money(extra)}.`, 'bad'); } }
  }
  // Катастрофи: вдаряють по страхуванню, готелях, авіа
  C.lossShock = 1 + (C.lossShock - 1) * 0.9;
  C.disasters = C.disasters.filter((z) => --z.days > 0);
  if (chance(0.006)) {
    const cid = pick(Object.keys(CITIES)), kind = pick(['повінь', 'землетрус', 'ураган', 'масштабна пожежа']);
    C.disasters.push({ city: cid, kind, days: ri(7, 20) }); C.lossShock = Math.min(4, C.lossShock + 1.5);
    news(`🌪️ ${CITIES[cid].name}: ${kind}. Страховики чекають великих виплат, туристи скасовують поїздки.`, 'city', 'bad', true);
    for (const co of aliveCos()) if (co.sector === 'insurance') co.cash -= SECTORS.insurance.rev * co.scale * 5;
  }
}

/** Вплив ваших підрозділів на ІІ-компанії тієї ж галузі (частка, яку ви в них забираєте). */
function divInfluence(co, parts) {
  if (!state.corp) return 1;
  const ds = state.corp.divs.filter((d) => INDUSTRIES[d.ind].sector === co.sector);
  if (!ds.length) return 1;
  const share = sum(ds, (d) => d.share) / Object.keys(CITIES).length;
  if (share > 0.01) parts.push(`ваші підрозділи забирають ${Math.round(share * 100)}% ринку`);
  return 1 - 0.6 * share;
}

HOOKS.day.push(corpDaily);
