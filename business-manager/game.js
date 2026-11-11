'use strict';
/* Бізнес Імперія — економічний симулятор міста.
   Орендуйте приміщення, відкривайте бізнеси, наймайте персонал,
   керуйте цінами, закупівлями, маркетингом і кредитами. */

// ================= Утиліти =================
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rnd(a, b + 1));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const sround = (x) => { if (x <= 0) return 0; const f = Math.floor(x); return f + (Math.random() < x - f ? 1 : 0); };
const uid = () => Math.random().toString(36).slice(2, 10);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sum = (arr, f) => arr.reduce((s, x) => s + f(x), 0);
function money(n, dec = 0) {
  const v = Math.abs(n);
  return (n < 0 ? '−' : '') + '$' + v.toLocaleString('uk-UA', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
const pad2 = (n) => String(n).padStart(2, '0');
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

// ================= Дані світу =================
const DISTRICTS = [
  { id: 'res', name: 'Спальний район', traffic: 55, rent: 0.7, sens: 1.15, color: '#5aa469', streets: ['вул. Липова', 'вул. Садова', 'просп. Миру', 'вул. Затишна'], desc: 'Дешева оренда, багато мешканців. Добре для продуктових.' },
  { id: 'center', name: 'Історичний центр', traffic: 100, rent: 1.8, sens: 1.0, color: '#e08a3c', streets: ['вул. Соборна', 'пл. Ринок', 'вул. Галицька', 'вул. Театральна'], desc: 'Найбільший потік людей і найдорожча оренда.' },
  { id: 'biz', name: 'Діловий квартал', traffic: 85, rent: 1.5, sens: 0.95, color: '#3f7fc4', streets: ['просп. Свободи', 'вул. Банкова', 'вул. Офісна', 'бульв. Інновацій'], desc: 'Офісні працівники: кава зранку, обіди вдень. Вихідні — тихо.' },
  { id: 'campus', name: 'Студмістечко', traffic: 75, rent: 0.9, sens: 1.35, color: '#a3558a', streets: ['вул. Студентська', 'вул. Наукова', 'вул. Бібліотечна', 'пров. Лекційний'], desc: 'Багато молоді, але дуже чутливі до цін.' },
  { id: 'river', name: 'Набережна', traffic: 80, rent: 1.4, sens: 0.8, color: '#3a8f99', streets: ['Набережна вул.', 'вул. Яхтова', 'вул. Маяк', 'Портова пл.'], desc: 'Заможні відвідувачі, менше зважають на ціну.' },
];
const DMAP = Object.fromEntries(DISTRICTS.map((d) => [d.id, d]));

const SIZES = {
  S: { name: 'Малий', m2: 40, setup: 1, storage: 300, maxStaff: 2, attract: 1 },
  M: { name: 'Середній', m2: 80, setup: 1.4, storage: 700, maxStaff: 4, attract: 1.3 },
  L: { name: 'Великий', m2: 150, setup: 2, storage: 1500, maxStaff: 7, attract: 1.6 },
};
const RENT_PER_M2 = 1.4;

const CURVES = {
  morning: [0, 0, 0, 0, 0, 0.1, 0.4, 1.3, 1.7, 1.3, 1.0, 0.9, 1.1, 1.0, 0.8, 0.8, 0.9, 0.8, 0.6, 0.5, 0.4, 0.3, 0.15, 0.05],
  lunch: [0.1, 0.05, 0, 0, 0, 0, 0.1, 0.3, 0.5, 0.6, 0.8, 1.3, 1.9, 1.6, 0.9, 0.7, 0.8, 1.1, 1.5, 1.6, 1.3, 0.9, 0.5, 0.3],
  retail: [0, 0, 0, 0, 0, 0, 0, 0.1, 0.3, 0.6, 0.9, 1.1, 1.2, 1.2, 1.2, 1.3, 1.4, 1.5, 1.5, 1.3, 1.0, 0.6, 0.2, 0],
  grocery: [0.1, 0.05, 0.05, 0, 0, 0.1, 0.3, 0.8, 1.0, 0.9, 0.8, 0.9, 1.0, 0.9, 0.8, 0.9, 1.1, 1.4, 1.6, 1.4, 1.1, 0.7, 0.4, 0.2],
};

const TYPES = {
  coffee: {
    name: "Кав'ярня", icon: '☕', setup: 9000, cap: 16, draw: 0.22, elast: 1.3, curve: 'morning', hours: [7, 21], retail: false,
    aff: { res: 0.8, center: 1.1, biz: 1.4, campus: 1.3, river: 1.0 },
    products: [
      { id: 'espresso', name: 'Еспресо', cost: 0.5, price: 2.5, share: 0.25, spoil: 0 },
      { id: 'cappuccino', name: 'Капучино', cost: 0.8, price: 3.8, share: 0.35, spoil: 0 },
      { id: 'croissant', name: 'Круасан', cost: 0.9, price: 3.0, share: 0.2, spoil: 0.25 },
      { id: 'sandwich', name: 'Сендвіч', cost: 1.8, price: 5.5, share: 0.2, spoil: 0.3 },
    ],
  },
  fastfood: {
    name: 'Бургерна', icon: '🍔', setup: 12000, cap: 20, draw: 0.15, elast: 1.3, curve: 'lunch', hours: [10, 23], retail: false,
    aff: { res: 1.0, center: 1.2, biz: 1.1, campus: 1.4, river: 0.9 },
    products: [
      { id: 'burger', name: 'Бургер', cost: 2.2, price: 7.0, share: 0.35, spoil: 0.2 },
      { id: 'fries', name: 'Картопля фрі', cost: 0.6, price: 3.0, share: 0.25, spoil: 0.1 },
      { id: 'soda', name: 'Напій', cost: 0.4, price: 2.2, share: 0.25, spoil: 0 },
      { id: 'hotdog', name: 'Хот-дог', cost: 1.4, price: 5.0, share: 0.15, spoil: 0.2 },
    ],
  },
  grocery: {
    name: 'Мінімаркет', icon: '🛒', setup: 15000, cap: 26, draw: 0.36, elast: 1.8, curve: 'grocery', hours: [7, 23], retail: false, store: 1.6,
    aff: { res: 1.5, center: 0.9, biz: 0.7, campus: 1.1, river: 0.8 },
    products: [
      { id: 'bread', name: 'Хліб', cost: 0.6, price: 1.9, share: 0.25, spoil: 0.3 },
      { id: 'milk', name: 'Молоко', cost: 0.7, price: 2.0, share: 0.2, spoil: 0.12 },
      { id: 'veggies', name: 'Овочі', cost: 1.1, price: 3.2, share: 0.2, spoil: 0.15 },
      { id: 'snacks', name: 'Снеки', cost: 0.8, price: 2.8, share: 0.2, spoil: 0 },
      { id: 'drinks', name: 'Напої', cost: 0.6, price: 2.2, share: 0.15, spoil: 0 },
    ],
  },
  flowers: {
    name: 'Квіткова крамниця', icon: '💐', setup: 7000, cap: 8, draw: 0.035, elast: 1.1, curve: 'retail', hours: [8, 20], retail: true,
    aff: { res: 1.0, center: 1.2, biz: 0.9, campus: 0.8, river: 1.4 },
    products: [
      { id: 'roses', name: 'Троянди', cost: 1.5, price: 5, share: 0.35, spoil: 0.15 },
      { id: 'bouquet', name: 'Букет', cost: 8, price: 28, share: 0.35, spoil: 0.12 },
      { id: 'pot', name: 'Вазон', cost: 5, price: 16, share: 0.2, spoil: 0.02 },
      { id: 'card', name: 'Листівка', cost: 0.3, price: 2, share: 0.1, spoil: 0 },
    ],
  },
  fashion: {
    name: 'Магазин одягу', icon: '👕', setup: 22000, cap: 6, draw: 0.022, elast: 1.0, curve: 'retail', hours: [10, 21], retail: true,
    aff: { res: 0.6, center: 1.4, biz: 0.9, campus: 0.9, river: 1.3 },
    products: [
      { id: 'tshirt', name: 'Футболка', cost: 6, price: 20, share: 0.35, spoil: 0 },
      { id: 'jeans', name: 'Джинси', cost: 18, price: 55, share: 0.25, spoil: 0 },
      { id: 'jacket', name: 'Куртка', cost: 40, price: 120, share: 0.15, spoil: 0 },
      { id: 'acc', name: 'Аксесуари', cost: 3, price: 12, share: 0.25, spoil: 0 },
    ],
  },
  electronics: {
    name: 'Магазин електроніки', icon: '📱', setup: 40000, cap: 4, draw: 0.012, elast: 0.9, curve: 'retail', hours: [10, 21], retail: true,
    aff: { res: 0.7, center: 1.3, biz: 1.2, campus: 1.1, river: 1.0 },
    products: [
      { id: 'headphones', name: 'Навушники', cost: 15, price: 45, share: 0.35, spoil: 0 },
      { id: 'charger', name: 'Зарядка', cost: 3, price: 15, share: 0.3, spoil: 0 },
      { id: 'phone', name: 'Смартфон', cost: 190, price: 399, share: 0.15, spoil: 0 },
      { id: 'tablet', name: 'Планшет', cost: 150, price: 329, share: 0.2, spoil: 0 },
    ],
  },
};

const CAMPAIGNS = {
  flyers: { name: 'Листівки', icon: '📄', cost: 40, boost: 0.12 },
  social: { name: 'Соцмережі', icon: '📲', cost: 90, boost: 0.22 },
  radio: { name: 'Радіо', icon: '📻', cost: 160, boost: 0.3 },
  billboard: { name: 'Білборд', icon: '🪧', cost: 260, boost: 0.45 },
};

const UPGRADES = {
  interior: { name: "Інтер'єр", icon: '🛋️', k: 0.35, desc: '+12% відвідувачів і задоволеність за рівень' },
  equipment: { name: 'Обладнання', icon: '⚙️', k: 0.3, desc: '+20% швидкості обслуговування за рівень' },
  storage: { name: 'Склад', icon: '📦', k: 0.2, desc: '+50% місткості складу за рівень' },
};
const MAX_UPG = 3;

const FIRST = ['Олена', 'Андрій', 'Марія', 'Тарас', 'Ірина', 'Богдан', 'Софія', 'Дмитро', 'Наталія', 'Олег', 'Юлія', 'Максим', 'Катерина', 'Ігор', 'Оксана', 'Віктор', 'Анна', 'Роман', 'Христина', 'Степан', 'Дарина', 'Назар', 'Леся', 'Артем'];
const LAST = ['Коваленко', 'Шевчук', 'Бондар', 'Мельник', 'Ткачук', 'Кравець', 'Олійник', 'Лисенко', 'Гнатюк', 'Савчук', 'Петренко', 'Мороз', 'Поліщук', 'Романюк', 'Зінченко', 'Литвин'];

const ACHIEVEMENTS = [
  { id: 'first_biz', icon: '🚀', name: 'Перший крок', desc: 'Відкрийте перший бізнес', check: (s) => s.biz.length >= 1 },
  { id: 'first_profit', icon: '📈', name: 'У плюсі', desc: 'Завершіть день із прибутком', check: (s) => s.history.some((h) => h.profit > 0) },
  { id: 'three_biz', icon: '🏪', name: 'Мережа', desc: 'Володійте 3 бізнесами', check: (s) => s.biz.length >= 3 },
  { id: 'ten_staff', icon: '👥', name: 'Роботодавець', desc: 'Найміть 10 працівників', check: (s) => s.staff.length >= 10 },
  { id: 'cash100k', icon: '💰', name: 'Сто тисяч', desc: 'Майте $100 000 готівкою', check: (s) => s.cash >= 100000 },
  { id: 'rep90', icon: '⭐', name: 'Улюблене місце', desc: 'Репутація бізнесу 90+', check: (s) => s.biz.some((b) => b.rep >= 90) },
  { id: 'all_districts', icon: '🗺️', name: 'Усе місто', desc: 'Бізнес у кожному районі', check: (s) => DISTRICTS.every((d) => s.biz.some((b) => lotOf(b).district === d.id)) },
  { id: 'all_types', icon: '🎯', name: 'Диверсифікація', desc: 'Володійте всіма 6 типами бізнесу', check: (s) => Object.keys(TYPES).every((t) => s.biz.some((b) => b.type === t)) },
  { id: 'debt_free', icon: '🏦', name: 'Без боргів', desc: 'Повністю погасіть кредит', check: (s) => s.flags.repaid },
  { id: 'nw500k', icon: '🏙️', name: 'Магнат', desc: 'Чистий капітал $500 000', check: () => netWorth() >= 500000 },
  { id: 'nw1m', icon: '👑', name: 'Мільйонер', desc: 'Чистий капітал $1 000 000', check: () => netWorth() >= 1000000 },
];

// ================= Стан =================
let state = null;
const SAVE_KEY = 'bizimperia_save_v1';

function emptyDay() { return { rev: 0, cogs: 0, arrivals: 0, served: 0, lost: 0, oos: 0, units: 0, satSum: 0, satN: 0, noStaff: 0 }; }

function newGame(company) {
  state = {
    v: 1, company: company || 'Моя компанія', cash: 25000, day: 1, hour: 6, speed: 1,
    lots: [], biz: [], staff: [], candidates: [], loans: [], mods: [], wholesaleMult: 1,
    history: [], log: [], achievements: {}, weekProfit: 0, flags: {}, over: false,
    ui: { view: 'dashboard', bizId: null, tab: 'overview', lot: null },
  };
  for (const d of DISTRICTS) {
    for (let i = 0; i < 8; i++) {
      const r = Math.random();
      const size = r < 0.45 ? 'S' : r < 0.8 ? 'M' : 'L';
      const lot = { id: d.id + i, district: d.id, size, addr: `${pick(d.streets)}, ${ri(1, 120)}`, npc: null, owner: null };
      if (Math.random() < 0.35) lot.npc = { type: pick(Object.keys(TYPES)), name: npcName() };
      state.lots.push(lot);
    }
  }
  for (let i = 0; i < 8; i++) state.candidates.push(makeCandidate());
  log(`Ласкаво просимо, ${state.company}! Стартовий капітал: ${money(state.cash)}.`, 'good');
  log('Відкрийте «Місто», торкніться вільної ділянки ＋ і запустіть перший бізнес.');
}

function npcName() { return pick(['Смак', 'Лавка', 'Добрий', 'Міський', 'Сонячний', 'Кутик', 'Експрес', 'Плюс', 'Вільний', 'Старий']) + ' ' + pick(['№1', 'Маркет', 'Хаб', 'Стиль', 'Дім', 'Point', 'Світ', 'Ко']); }

function makeCandidate() {
  const skill = clamp(+(rnd(1, 4.2) + (Math.random() < 0.12 ? 0.8 : 0)).toFixed(1), 1, 5);
  const wage = +(8 + skill * 3 + rnd(-1.5, 2)).toFixed(1);
  return { id: uid(), name: `${pick(FIRST)} ${pick(LAST)}`, skill, wage, since: state ? state.day : 1 };
}

// ================= Обчислення =================
const lotOf = (b) => state.lots.find((l) => l.id === b.lotId);
const bizById = (id) => state.biz.find((b) => b.id === id);
const staffOf = (b) => state.staff.filter((p) => p.bizId === b.id);
const lotRent = (lot) => Math.round(SIZES[lot.size].m2 * RENT_PER_M2 * DMAP[lot.district].rent);
const setupCost = (type, lot) => Math.round(TYPES[type].setup * SIZES[lot.size].setup);
const storageCap = (b) => Math.round(SIZES[lotOf(b).size].storage * (TYPES[b.type].store || 1) * (1 + 0.5 * (b.upg.storage - 1)));
const stockTotal = (b) => sum(Object.values(b.products), (p) => p.stock);
const stockValue = (b) => sum(Object.values(b.products), (p) => p.stock * p.cost);
const wholesale = (p) => p.cost * state.wholesaleMult * modMult('wholesale', null);
const openHours = (b) => b.close - b.open;
const dailyWages = (b) => sum(staffOf(b), (p) => p.wage) * openHours(b);
const dailyMarketing = (b) => sum(Object.keys(CAMPAIGNS).filter((k) => b.marketing[k]), (k) => CAMPAIGNS[k].cost);
const debt = () => sum(state.loans, (l) => l.amount);
const upgradeCost = (b, k) => Math.round(TYPES[b.type].setup * SIZES[lotOf(b).size].setup * UPGRADES[k].k * b.upg[k]);
const weekday = (day = state.day) => (day - 1) % 7;

function competitors(b) {
  const lot = lotOf(b);
  const npc = state.lots.filter((l) => l.district === lot.district && l.npc && l.npc.type === b.type).length;
  const own = state.biz.filter((o) => o !== b && o.type === b.type && lotOf(o).district === lot.district).length;
  return npc + own;
}

function modMult(kind, district) {
  let m = 1;
  for (const md of state.mods) if (md.kind === kind && (md.district == null || md.district === district)) m *= md.mult;
  return m;
}

function trafficMult(districtId, type) {
  let m = modMult('traffic', districtId);
  const wd = weekday();
  if (wd >= 5) { // вихідні
    if (districtId === 'biz') m *= 0.55;
    if (TYPES[type].retail) m *= 1.25;
    if (districtId === 'river' || districtId === 'center') m *= 1.15;
  }
  return m;
}

function avgPriceRatio(b) {
  const T = TYPES[b.type];
  return sum(T.products, (p) => p.share * (b.products[p.id].price / p.price));
}

function bizValue(b) {
  const h = b.history.slice(-7);
  const avg = h.length ? sum(h, (x) => x.profit) / h.length : 0;
  return Math.max(0, Math.round(b.invested * 0.5 + Math.max(0, avg) * 60 + stockValue(b) * 0.6));
}
function netWorth() { return state.cash + sum(state.biz, bizValue) - debt(); }
function creditLimit() { return Math.max(0, Math.round(Math.max(15000, (state.cash + sum(state.biz, bizValue)) * 0.6) - debt())); }

// ================= Симуляція =================
function simulateHour(b, h) {
  if (h < b.open || h >= b.close) return;
  const staff = staffOf(b);
  if (!staff.length) { b.today.noStaff++; return; }
  const T = TYPES[b.type], lot = lotOf(b), D = DMAP[lot.district], S = SIZES[lot.size];
  const e = T.elast * D.sens;
  const mkt = 1 + sum(Object.keys(CAMPAIGNS).filter((k) => b.marketing[k]), (k) => CAMPAIGNS[k].boost);
  const repF = 0.5 + b.rep / 100;
  const intF = 1 + 0.12 * (b.upg.interior - 1);
  const compF = 1 / (1 + 0.3 * competitors(b));
  const ratio = avgPriceRatio(b);
  let potential = D.traffic * trafficMult(D.id, b.type) * T.draw * T.aff[D.id] * CURVES[T.curve][h] * S.attract * compF * mkt * repF * intF;
  potential *= clamp(1 - 0.5 * e * (ratio - 1), 0.2, 1.4) * rnd(0.85, 1.15);
  const arrivals = sround(potential);
  const cap = sum(staff, (p) => T.cap * (0.5 + p.skill * 0.2)) * (1 + 0.2 * (b.upg.equipment - 1));
  const served = Math.min(arrivals, sround(cap));
  let rev = 0, cogs = 0, wanted = 0, sold = 0;
  for (const p of T.products) {
    const st = b.products[p.id];
    const accept = clamp(1 - e * (st.price / p.price - 1), 0, 1.3);
    const want = sround(served * p.share * accept);
    const s = Math.min(want, Math.floor(st.stock));
    st.stock -= s; st.sold += s;
    rev += s * st.price; cogs += s * st.cost; wanted += want; sold += s;
  }
  state.cash += rev;
  const t = b.today;
  t.rev += rev; t.cogs += cogs; t.arrivals += arrivals; t.served += served; t.lost += arrivals - served; t.oos += wanted - sold; t.units += sold;
  if (arrivals > 0) {
    const servedR = served / arrivals;
    const stockR = wanted ? sold / wanted : 1;
    const priceS = clamp(1 - (ratio - 1) * 1.5, 0, 1);
    const skill = sum(staff, (p) => p.skill) / staff.length;
    const sat = 30 * servedR + 30 * stockR + 20 * priceS + 10 * (skill / 5) + 10 * (b.upg.interior / MAX_UPG);
    t.satSum += sat * arrivals; t.satN += arrivals;
    b.rep = clamp(b.rep + (sat - b.rep) * Math.min(0.06, arrivals * 0.0025), 0, 100);
  }
  for (const p of staff) p.skill = Math.min(5, p.skill + 0.0015);
}

function tick() {
  if (!state || state.over) return;
  state.hour++;
  if (state.hour >= 24) { state.hour = 0; endOfDay(); if (state.over) return; }
  if (state.hour === 6) morning();
  for (const b of state.biz) simulateHour(b, state.hour);
}

function morning() {
  for (const b of state.biz) {
    if (!b.autoRestock) continue;
    let spent = 0, short = false;
    for (const p of TYPES[b.type].products) {
      const st = b.products[p.id];
      const need = Math.floor(st.target - st.stock);
      if (need > 0) {
        const r = buyStock(b, p.id, need, 1.1, true);
        if (r.ok) spent += r.cost; else short = true;
      }
    }
    if (short) log(`${b.name}: автозакупівля неповна — бракує грошей або місця на складі.`, 'bad');
    else if (spent > 0) log(`${b.name}: автозакупівля на ${money(spent)}.`);
  }
}

function endOfDay() {
  let dayProfit = 0, dayRev = 0;
  for (const b of state.biz) {
    const T = TYPES[b.type];
    const wages = dailyWages(b), rent = lotRent(lotOf(b)), mkt = dailyMarketing(b);
    let spoil = 0;
    for (const p of T.products) {
      const st = b.products[p.id];
      if (p.spoil > 0 && st.stock > 0) { const lost = Math.floor(st.stock * p.spoil); st.stock -= lost; spoil += lost * st.cost; }
      st.soldY = st.sold; st.sold = 0;
    }
    const costs = wages + rent + mkt;
    state.cash -= costs;
    const t = b.today;
    const profit = t.rev - t.cogs - costs - spoil;
    b.yest = { ...t, wages, rent, mkt, spoil, profit, sat: t.satN ? t.satSum / t.satN : null };
    b.history.push({ day: state.day, rev: t.rev, profit, cust: t.served });
    if (b.history.length > 30) b.history.shift();
    if (t.noStaff > 0) log(`${b.name}: не працював(-ла) без персоналу ${t.noStaff} год.`, 'bad');
    if (t.oos > 10) log(`${b.name}: ${t.oos} відмов через відсутність товару.`, 'bad');
    b.today = emptyDay();
    dayProfit += profit; dayRev += t.rev;
  }
  const interest = sum(state.loans, (l) => l.amount * l.rate);
  state.cash -= interest;
  dayProfit -= interest;
  state.weekProfit += dayProfit;
  if (state.day % 7 === 0) {
    if (state.weekProfit > 0) {
      const tax = Math.round(state.weekProfit * 0.12);
      state.cash -= tax;
      log(`Сплачено тижневий податок 12%: ${money(tax)}.`);
    }
    state.weekProfit = 0;
  }
  state.mods = state.mods.filter((m) => --m.days > 0);
  state.history.push({ day: state.day, cash: state.cash, profit: dayProfit, rev: dayRev, nw: netWorth() });
  if (state.history.length > 60) state.history.shift();
  if (state.biz.length) log(`Підсумок дня ${state.day}: виручка ${money(dayRev)}, прибуток ${money(dayProfit)}.`, dayProfit >= 0 ? 'good' : 'bad');
  state.day++;
  // ринок праці
  state.candidates = state.candidates.filter((c) => state.day - c.since < 4 || Math.random() < 0.5);
  while (state.candidates.length < 8) state.candidates.push(makeCandidate());
  if (Math.random() < 0.3) randomEvent();
  checkAchievements();
  if (state.cash < -10000) {
    state.over = true; setSpeed(0);
    showModal(`<h2>💸 Банкрутство</h2><p>Борги стали непосильними — компанія «${esc(state.company)}» оголосила банкрутство на ${state.day}-й день.</p><p>Чистий капітал: <b>${money(netWorth())}</b></p><div class="row end"><button class="btn primary" data-act="newGamePrompt">Нова гра</button></div>`);
  } else if (state.cash < 0) {
    toast('⚠️ Від’ємний баланс! Скоротіть витрати або візьміть кредит.', 'bad');
  }
  save();
}

function randomEvent() {
  const d = pick(DISTRICTS);
  const evs = [
    () => { state.mods.push({ kind: 'traffic', district: d.id, mult: 1.5, days: 2, label: `🎉 Фестиваль: ${d.name}` }); log(`🎉 У районі «${d.name}» фестиваль — потік людей +50% на 2 дні!`, 'good'); },
    () => { state.mods.push({ kind: 'traffic', district: null, mult: 0.75, days: 1, label: '🌧️ Злива' }); log('🌧️ Злива по всьому місту — відвідувачів сьогодні менше.', 'bad'); },
    () => { state.wholesaleMult *= 1.06; log(`📊 Інфляція: оптові ціни зросли на 6% (зараз ×${state.wholesaleMult.toFixed(2)}).`, 'bad'); },
    () => { state.mods.push({ kind: 'wholesale', district: null, mult: 0.8, days: 2, label: '🏷️ Розпродаж в оптовика' }); log('🏷️ Розпродаж в оптовика: −20% на закупівлі 2 дні.', 'good'); },
    () => { if (!state.biz.length) return; const b = pick(state.biz); b.rep = clamp(b.rep + 15, 0, 100); log(`🔥 Блогер похвалив «${b.name}» — репутація +15!`, 'good'); },
    () => {
      if (!state.biz.length) return; const b = pick(state.biz);
      if (b.rep < 45) { const fine = ri(500, 2000); state.cash -= fine; log(`🧾 Перевірка в «${b.name}» виявила порушення. Штраф ${money(fine)}.`, 'bad'); }
      else log(`🧾 Перевірка в «${b.name}» пройшла без зауважень.`, 'good');
    },
    () => { if (!state.biz.length) return; const b = pick(state.biz); const c = ri(400, 1500); state.cash -= c; log(`🔧 У «${b.name}» зламалось обладнання. Ремонт: ${money(c)}.`, 'bad'); },
    () => { const free = state.lots.filter((l) => !l.npc && !l.owner); if (!free.length) return; const l = pick(free); l.npc = { type: pick(Object.keys(TYPES)), name: npcName() }; log(`🏬 Конкурент «${l.npc.name}» (${TYPES[l.npc.type].name}) відкрився: ${DMAP[l.district].name}.`, 'bad'); },
    () => { const occ = state.lots.filter((l) => l.npc); if (!occ.length) return; const l = pick(occ); log(`📉 Конкурент «${l.npc.name}» закрився — приміщення ${l.addr} вільне.`, 'good'); l.npc = null; },
  ];
  pick(evs)();
}

function checkAchievements() {
  for (const a of ACHIEVEMENTS) {
    if (!state.achievements[a.id] && a.check(state)) {
      state.achievements[a.id] = state.day;
      toast(`🏆 Досягнення: ${a.name}`, 'good');
      log(`🏆 Досягнення відкрито: ${a.name}.`, 'good');
    }
  }
}

// ================= Дії гравця =================
function openBusiness(lotId, type) {
  const lot = state.lots.find((l) => l.id === lotId);
  if (!lot || lot.npc || lot.owner) return;
  const T = TYPES[type];
  const cost = setupCost(type, lot) + lotRent(lot) * 7;
  if (state.cash < cost) return toast('Недостатньо коштів.', 'bad');
  state.cash -= cost;
  const S = SIZES[lot.size];
  const b = {
    id: uid(), lotId, type, name: `${T.name} на ${lot.addr.split(',')[0].replace(/^(вул\.|просп\.|пл\.|бульв\.|пров\.)\s*/, '')}`,
    open: T.hours[0], close: T.hours[1], rep: 50, invested: setupCost(type, lot),
    upg: { interior: 1, equipment: 1, storage: 1 }, marketing: {}, autoRestock: true,
    products: {}, today: emptyDay(), yest: null, history: [], opened: state.day,
  };
  for (const p of T.products) b.products[p.id] = { price: p.price, stock: 0, cost: p.cost, target: Math.round(S.storage * (T.store || 1) * p.share * 0.6), sold: 0, soldY: 0 };
  lot.owner = b.id;
  state.biz.push(b);
  log(`Відкрито «${b.name}» (${DMAP[lot.district].name}). Витрати: ${money(cost)}.`, 'good');
  toast(`${T.icon} Бізнес відкрито! Наймайте персонал і закупіть товар.`, 'good');
  checkAchievements();
  state.ui = { ...state.ui, view: 'biz', bizId: b.id, tab: 'overview' };
}

function buyStock(b, pid, qty, markup = 1, silent = false) {
  const p = TYPES[b.type].products.find((x) => x.id === pid);
  const st = b.products[pid];
  const free = storageCap(b) - stockTotal(b);
  qty = Math.min(Math.floor(qty), Math.floor(free));
  if (qty <= 0) { if (!silent) toast('Склад заповнений.', 'bad'); return { ok: false, cost: 0 }; }
  const unit = wholesale(p) * markup;
  let cost = unit * qty;
  if (cost > state.cash) {
    qty = Math.floor(Math.max(0, state.cash) / unit);
    if (qty <= 0) { if (!silent) toast('Недостатньо коштів.', 'bad'); return { ok: false, cost: 0 }; }
    cost = unit * qty;
    if (!silent) toast(`Вистачило лише на ${qty} од.`, 'bad');
    st.cost = (st.cost * st.stock + cost) / (st.stock + qty); st.stock += qty; state.cash -= cost;
    return { ok: false, cost };
  }
  st.cost = (st.cost * st.stock + cost) / (st.stock + qty);
  st.stock += qty;
  state.cash -= cost;
  return { ok: true, cost, qty };
}

function fillAll(b) {
  let spent = 0;
  for (const p of TYPES[b.type].products) {
    const st = b.products[p.id];
    const need = st.target - st.stock;
    if (need > 0) spent += buyStock(b, p.id, need, 1, true).cost;
  }
  toast(spent > 0 ? `Закуплено на ${money(spent)}.` : 'Склад уже заповнено до цілі.', spent > 0 ? 'good' : '');
}

function hire(candId, bizId) {
  const c = state.candidates.find((x) => x.id === candId);
  const b = bizById(bizId);
  if (!c || !b) return toast('Оберіть бізнес.', 'bad');
  if (staffOf(b).length >= SIZES[lotOf(b).size].maxStaff) return toast('У приміщенні немає місця для ще одного працівника.', 'bad');
  state.candidates = state.candidates.filter((x) => x !== c);
  state.staff.push({ id: c.id, name: c.name, skill: c.skill, wage: c.wage, bizId: b.id, hired: state.day });
  log(`Найнято ${c.name} у «${b.name}» (${money(c.wage, 1)}/год).`);
  checkAchievements();
}

function fire(staffId) {
  const p = state.staff.find((x) => x.id === staffId);
  if (!p) return;
  const sev = Math.round(p.wage * 8);
  state.cash -= sev;
  state.staff = state.staff.filter((x) => x !== p);
  log(`${p.name} звільнено. Вихідна допомога: ${money(sev)}.`);
}

function transfer(staffId, bizId) {
  const p = state.staff.find((x) => x.id === staffId);
  const b = bizById(bizId);
  if (!p || !b || p.bizId === bizId) return;
  if (staffOf(b).length >= SIZES[lotOf(b).size].maxStaff) return toast('У цьому приміщенні вже максимум працівників.', 'bad');
  p.bizId = bizId;
  log(`${p.name} переведено в «${b.name}».`);
}

function upgrade(b, k) {
  if (b.upg[k] >= MAX_UPG) return;
  const c = upgradeCost(b, k);
  if (state.cash < c) return toast('Недостатньо коштів.', 'bad');
  state.cash -= c; b.invested += c; b.upg[k]++;
  log(`«${b.name}»: ${UPGRADES[k].name} покращено до рівня ${b.upg[k]} за ${money(c)}.`, 'good');
}

function sellBiz(b) {
  const v = bizValue(b);
  state.cash += v;
  state.staff = state.staff.filter((p) => p.bizId !== b.id);
  const lot = lotOf(b); lot.owner = null;
  state.biz = state.biz.filter((x) => x !== b);
  log(`«${b.name}» продано за ${money(v)}. Персонал звільнено.`, 'good');
  state.ui.view = 'businesses';
}

function takeLoan(amount) {
  if (amount > creditLimit()) return toast('Банк відмовив: перевищено кредитний ліміт.', 'bad');
  const rate = 0.0008 + 0.0004 * clamp(debt() / 100000, 0, 2);
  state.loans.push({ id: uid(), amount, rate, day: state.day });
  state.cash += amount;
  log(`Отримано кредит ${money(amount)} під ${(rate * 100).toFixed(2)}% на день.`);
}
function repayLoan(id) {
  const l = state.loans.find((x) => x.id === id);
  if (!l) return;
  if (state.cash < l.amount) return toast('Недостатньо коштів для погашення.', 'bad');
  state.cash -= l.amount;
  state.loans = state.loans.filter((x) => x !== l);
  state.flags.repaid = true;
  log(`Кредит ${money(l.amount)} погашено.`, 'good');
  checkAchievements();
}

function log(msg, kind = '') {
  if (!state) return;
  state.log.unshift({ day: state.day, hour: state.hour, msg, kind });
  if (state.log.length > 80) state.log.length = 80;
}

// ================= Збереження =================
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* недоступно */ } }
function load() {
  try { const s = localStorage.getItem(SAVE_KEY); if (s) { state = JSON.parse(s); return true; } } catch (e) { /* ignore */ }
  return false;
}

// ================= Інтерфейс =================
let timer = null, lastMainRender = 0;
const SPEEDS = [0, 1000, 400, 120];

function setSpeed(v) {
  if (!state) return;
  if (state.over) v = 0;
  state.speed = v;
  clearInterval(timer);
  if (v > 0) timer = setInterval(() => { tick(); render(false); }, SPEEDS[v]);
  renderTop();
}

function toast(msg, kind = '') {
  if (typeof document === 'undefined') return;
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.textContent = msg;
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => el.classList.add('out'), 2800);
  setTimeout(() => el.remove(), 3300);
}

function showModal(html) { const m = document.getElementById('modal'); m.innerHTML = `<div class="modal-card">${html}</div>`; m.classList.remove('hidden'); }
function hideModal() { document.getElementById('modal').classList.add('hidden'); }
let pendingConfirm = null;
function confirmBox(msg, fn) { pendingConfirm = fn; showModal(`<p>${msg}</p><div class="row end"><button class="btn" data-act="modalClose">Скасувати</button><button class="btn danger" data-act="confirmYes">Так</button></div>`); }

const NAV = [
  ['dashboard', '📊', 'Огляд'], ['map', '🏙️', 'Місто'], ['businesses', '🏪', 'Бізнеси'],
  ['staff', '👥', 'Персонал', 'Люди'], ['bank', '🏦', 'Банк'], ['stats', '📈', 'Статистика', 'Графіки'],
  ['achievements', '🏆', 'Досягнення', 'Нагороди'], ['settings', '⚙️', 'Гра'],
];

function renderTop() {
  if (!state) return;
  const sp = ['⏸', '▶', '▶▶', '▶▶▶'];
  document.getElementById('topbar').innerHTML = `
    <div class="brand">🏙️ <b>${esc(state.company)}</b></div>
    <div class="clock"><span>День ${state.day} · ${WEEKDAYS[weekday()]}</span><b>${pad2(state.hour)}:00</b></div>
    <div class="speed">${sp.map((s, i) => `<button class="${state.speed === i ? 'on' : ''}" data-act="speed" data-v="${i}" aria-label="Швидкість ${i}">${s}</button>`).join('')}</div>
    <div class="cash"><span>Готівка</span><b class="${state.cash < 0 ? 'neg' : ''}">${money(state.cash)}</b></div>
    <div class="cash hide-sm"><span>Капітал</span><b>${money(netWorth())}</b></div>`;
}

function renderNav() {
  document.getElementById('nav').innerHTML = NAV.map(([id, ic, n, short]) => {
    const active = state.ui.view === id || (id === 'businesses' && state.ui.view === 'biz');
    return `<button class="${active ? 'active' : ''}" data-act="nav" data-v="${id}"><span class="ic">${ic}</span><span class="lbl">${n}</span><span class="lbl-s">${short || n}</span></button>`;
  }).join('');
}

function render(force = true) {
  if (!state) return;
  renderTop();
  const now = Date.now();
  const main = document.getElementById('main');
  const ae = document.activeElement;
  if (!force && ae && main.contains(ae) && (ae.tagName === 'INPUT' || ae.tagName === 'SELECT')) return;
  if (!force && now - lastMainRender < 300) return;
  if (!force && state.ui.view === 'map' && use3D()) return;
  lastMainRender = now;
  renderNav();
  const v = VIEWS[state.ui.view] || VIEWS.dashboard;
  if (!force && state.ui.view === 'map' && use3D()) return; // 3D-сцена оновлюється сама
  main.innerHTML = v();
  const c3 = document.getElementById('city3d');
  if (c3) City3D.mount(c3, (id) => { state.ui.lot = id; render(true); });
  document.body.classList.toggle('in-city', !!c3);
  requestAnimationFrame(drawCharts);
}

function kpi(label, value, cls = '', sub = '') { return `<div class="kpi"><span>${label}</span><b class="${cls}">${value}</b>${sub ? `<small>${sub}</small>` : ''}</div>`; }
function repBar(r) { const c = r >= 70 ? 'good' : r >= 45 ? 'mid' : 'bad'; return `<div class="bar ${c}"><i style="width:${r.toFixed(0)}%"></i></div><small>${r.toFixed(0)}/100</small>`; }
function stars(x) { const n = clamp(Math.round((x - 0.4) * 4.5), 1, 5); return '★'.repeat(n) + '☆'.repeat(5 - n); }
function isOpenNow(b) { return state.hour >= b.open && state.hour < b.close; }
function bizStatus(b) {
  if (!staffOf(b).length) return '<span class="tag bad">Без персоналу</span>';
  if (!isOpenNow(b)) return '<span class="tag">Зачинено</span>';
  if (stockTotal(b) < 1) return '<span class="tag bad">Немає товару</span>';
  return '<span class="tag good">Відчинено</span>';
}

const charts = [];
function chartBox(id, series, labels, title) {
  charts.push({ id, series, labels });
  return `<div class="card"><h3>${title}</h3><canvas id="${id}" height="180"></canvas></div>`;
}
function drawCharts() {
  const cs = getComputedStyle(document.documentElement);
  const grid = cs.getPropertyValue('--line').trim(), txt = cs.getPropertyValue('--muted').trim();
  while (charts.length) {
    const c = charts.shift();
    const cv = document.getElementById(c.id);
    if (!cv) continue;
    const w = cv.clientWidth, h = 180, dpr = window.devicePixelRatio || 1;
    cv.width = w * dpr; cv.height = h * dpr;
    const g = cv.getContext('2d'); g.scale(dpr, dpr);
    const all = c.series.flatMap((s) => s.data);
    if (!all.length) { g.fillStyle = txt; g.font = '13px system-ui'; g.fillText('Даних поки немає — зачекайте кінця дня.', 10, h / 2); continue; }
    let mn = Math.min(0, ...all), mx = Math.max(...all, 1);
    const padL = 56, padB = 22, padT = 10, pw = w - padL - 8, ph = h - padB - padT;
    const y = (v) => padT + ph - ((v - mn) / (mx - mn || 1)) * ph;
    g.strokeStyle = grid; g.fillStyle = txt; g.font = '11px system-ui'; g.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const v = mn + (mx - mn) * i / 4, yy = y(v);
      g.beginPath(); g.moveTo(padL, yy); g.lineTo(w - 8, yy); g.stroke();
      g.fillText(Math.abs(v) >= 1000 ? (v / 1000).toFixed(0) + 'k' : v.toFixed(0), 6, yy + 4);
    }
    if (mn < 0) { g.strokeStyle = txt; g.beginPath(); g.moveTo(padL, y(0)); g.lineTo(w - 8, y(0)); g.stroke(); }
    const n = Math.max(...c.series.map((s) => s.data.length));
    const x = (i) => padL + (n <= 1 ? pw / 2 : (i / (n - 1)) * pw);
    const step = Math.ceil(n / 8);
    c.labels.forEach((l, i) => { if (i % step === 0) g.fillText(l, x(i) - 6, h - 6); });
    for (const s of c.series) {
      g.strokeStyle = s.color; g.lineWidth = 2; g.beginPath();
      s.data.forEach((v, i) => (i ? g.lineTo(x(i), y(v)) : g.moveTo(x(i), y(v))));
      g.stroke();
      if (s.data.length === 1) { g.fillStyle = s.color; g.beginPath(); g.arc(x(0), y(s.data[0]), 3, 0, 7); g.fill(); }
    }
  }
}

function logList(n = 12) {
  return `<ul class="log">${state.log.slice(0, n).map((l) => `<li class="${l.kind}"><small>Д${l.day} ${pad2(l.hour)}:00</small> ${esc(l.msg)}</li>`).join('')}</ul>`;
}

const VIEWS = {
  dashboard() {
    const todayRev = sum(state.biz, (b) => b.today.rev);
    const last = state.history[state.history.length - 1];
    let html = `<h1>Огляд</h1><div class="kpis">
      ${kpi('Готівка', money(state.cash), state.cash < 0 ? 'neg' : '')}
      ${kpi('Чистий капітал', money(netWorth()))}
      ${kpi('Виручка сьогодні', money(todayRev))}
      ${kpi('Прибуток учора', last ? money(last.profit) : '—', last && last.profit < 0 ? 'neg' : 'pos')}
      ${kpi('Борг', money(debt()), debt() ? 'neg' : '')}
    </div>`;
    if (!state.biz.length) {
      html += `<div class="card hero"><h2>З чого почати?</h2><ol>
        <li>Відкрийте <b>Місто</b> і торкніться вільної ділянки ＋.</li>
        <li>Оберіть тип бізнесу, що підходить району.</li>
        <li>Найміть персонал і закупіть товар.</li>
        <li>Налаштуйте ціни, маркетинг — і ростіть імперію!</li></ol>
        <button class="btn primary" data-act="nav" data-v="map">🏙️ До міста</button></div>`;
    } else {
      html += `<div class="card"><h3>Мої бізнеси</h3><div class="table-wrap"><table><thead><tr><th>Бізнес</th><th>Статус</th><th>Репутація</th><th>Виручка сьогодні</th><th>Прибуток учора</th></tr></thead><tbody>
      ${state.biz.map((b) => `<tr class="click" data-act="biz" data-id="${b.id}"><td>${TYPES[b.type].icon} ${esc(b.name)}<br><small>${DMAP[lotOf(b).district].name}</small></td><td>${bizStatus(b)}</td><td class="rep">${repBar(b.rep)}</td><td>${money(b.today.rev)}</td><td class="${b.yest && b.yest.profit < 0 ? 'neg' : 'pos'}">${b.yest ? money(b.yest.profit) : '—'}</td></tr>`).join('')}
      </tbody></table></div></div>`;
    }
    if (state.mods.length) html += `<div class="card"><h3>Активні події</h3><div class="chips">${state.mods.map((m) => `<span class="chip">${m.label} · ${m.days} дн.</span>`).join('')}</div></div>`;
    const h = state.history.slice(-30);
    html += `<div class="grid2">${chartBox('chCash', [{ data: h.map((x) => x.cash), color: '#3f7fc4' }], h.map((x) => String(x.day)), 'Готівка за 30 днів')}
      <div class="card"><h3>Журнал подій</h3>${logList(12)}</div></div>`;
    return html;
  },

  map() {
    const sel = state.ui.lot && state.lots.find((l) => l.id === state.ui.lot);
    if (use3D()) {
      return `<div class="city-wrap"><div id="city3d"></div>
        <div class="city-hint">${sel ? '' : 'Торкніться будівлі або ділянки ＋'}</div>
        <div class="city-ctrl">
          <button data-act="cam" data-v="in" aria-label="Наблизити">＋</button><button data-act="cam" data-v="out" aria-label="Віддалити">−</button>
          <button data-act="cam" data-v="left" aria-label="Повернути ліворуч">⟲</button><button data-act="cam" data-v="right" aria-label="Повернути праворуч">⟳</button>
          <button data-act="cam" data-v="tilt" aria-label="Нахил">◩</button><button data-act="cam" data-v="reset" aria-label="Скинути камеру">⌂</button>
          <button data-act="toggle3d" aria-label="2D-мапа">2D</button>
        </div>
        ${sel ? `<div class="sheet">${lotPanel(sel)}</div>` : ''}</div>`;
    }
    let html = `<div class="row between"><h1>Мапа міста</h1>${typeof City3D !== 'undefined' && City3D.ok() ? '<button class="btn sm" data-act="toggle3d">🏙️ 3D</button>' : ''}</div><p class="muted">Оберіть приміщення. <span class="lg own"></span> ваші · <span class="lg npc"></span> конкуренти · <span class="lg free"></span> вільні</p><div class="map">`;
    for (const d of DISTRICTS) {
      html += `<div class="district" style="--dc:${d.color}"><div class="dh"><b>${d.name}</b><small>Потік ${d.traffic} · Оренда ×${d.rent}</small></div><div class="lots">`;
      for (const l of state.lots.filter((x) => x.district === d.id)) {
        const cls = l.owner ? 'own' : l.npc ? 'npc' : 'free';
        const ic = l.owner ? TYPES[bizById(l.owner).type].icon : l.npc ? TYPES[l.npc.type].icon : '＋';
        html += `<button class="lot ${cls} sz${l.size} ${sel === l ? 'sel' : ''}" data-act="selLot" data-id="${l.id}" title="${esc(l.addr)}"><span>${ic}</span><small>${l.size}</small></button>`;
      }
      html += `</div></div>`;
    }
    html += `</div>`;
    if (sel) html += lotPanel(sel);
    return html;
  },

  businesses() {
    if (!state.biz.length) return `<h1>Бізнеси</h1><div class="card hero"><p>У вас ще немає бізнесів.</p><button class="btn primary" data-act="nav" data-v="map">🏙️ Обрати приміщення</button></div>`;
    return `<h1>Бізнеси</h1><div class="cards">${state.biz.map((b) => {
      const T = TYPES[b.type];
      return `<div class="card bizcard click" data-act="biz" data-id="${b.id}">
        <div class="row"><span class="big">${T.icon}</span><div><b>${esc(b.name)}</b><br><small>${DMAP[lotOf(b).district].name} · ${SIZES[lotOf(b).size].name}</small></div></div>
        <div class="row between">${bizStatus(b)}<small>${pad2(b.open)}:00–${pad2(b.close)}:00</small></div>
        <div class="rep">${repBar(b.rep)}</div>
        <div class="mini"><span>Сьогодні<br><b>${money(b.today.rev)}</b></span><span>Учора<br><b class="${b.yest && b.yest.profit < 0 ? 'neg' : 'pos'}">${b.yest ? money(b.yest.profit) : '—'}</b></span><span>Персонал<br><b>${staffOf(b).length}/${SIZES[lotOf(b).size].maxStaff}</b></span><span>Склад<br><b>${Math.round(stockTotal(b) / storageCap(b) * 100)}%</b></span></div>
      </div>`;
    }).join('')}</div>`;
  },

  biz() {
    const b = bizById(state.ui.bizId);
    if (!b) { state.ui.view = 'businesses'; return VIEWS.businesses(); }
    const T = TYPES[b.type], lot = lotOf(b);
    const tabs = [['overview', 'Огляд'], ['products', 'Товари'], ['staff', 'Персонал'], ['marketing', 'Маркетинг'], ['upgrades', 'Покращення']];
    const tab = state.ui.tab || 'overview';
    let html = `<button class="btn ghost" data-act="nav" data-v="businesses">← Усі бізнеси</button>
      <div class="bizhead"><span class="big">${T.icon}</span><div><h1>${esc(b.name)} <button class="btn ghost sm" data-act="rename" data-id="${b.id}" aria-label="Перейменувати">✏️</button> <button class="btn ghost sm" data-act="showOnMap" data-id="${b.id}" aria-label="Показати в місті">📍</button></h1>
      <small>${T.name} · ${DMAP[lot.district].name}, ${esc(lot.addr)} · ${SIZES[lot.size].name} (${SIZES[lot.size].m2} м²)</small></div>${bizStatus(b)}</div>
      <div class="tabs">${tabs.map(([id, n]) => `<button class="${tab === id ? 'on' : ''}" data-act="tab" data-v="${id}">${n}</button>`).join('')}</div>`;
    html += BIZ_TABS[tab](b);
    return html;
  },

  staff() {
    const opts = (sel) => state.biz.map((b) => `<option value="${b.id}" ${sel === b.id ? 'selected' : ''}>${TYPES[b.type].icon} ${esc(b.name)} (${staffOf(b).length}/${SIZES[lotOf(b).size].maxStaff})</option>`).join('');
    let html = `<h1>Персонал</h1><div class="card"><h3>Кадрове агентство</h3><p class="muted">Кандидати оновлюються щодня. Навичка зростає з досвідом. Зарплата нараховується за кожну годину роботи бізнесу.</p>`;
    if (!state.biz.length) html += `<p>Спочатку відкрийте бізнес.</p>`;
    html += `<div class="table-wrap"><table><thead><tr><th>Кандидат</th><th>Навичка</th><th>Ставка</th><th>Найняти в</th></tr></thead><tbody>
      ${state.candidates.map((c) => `<tr><td>${esc(c.name)}</td><td>${skillDots(c.skill)}</td><td>${money(c.wage, 1)}/год</td><td><div class="row nowrap">${state.biz.length ? `<select id="hire-${c.id}">${opts(state.ui.bizId)}</select><button class="btn primary sm" data-act="hire" data-id="${c.id}">Найняти</button>` : '—'}</div></td></tr>`).join('')}
      </tbody></table></div></div>`;
    html += `<div class="card"><h3>Мої працівники (${state.staff.length})</h3>`;
    if (!state.staff.length) html += `<p class="muted">Поки нікого не найнято.</p>`;
    else html += `<div class="table-wrap"><table><thead><tr><th>Ім’я</th><th>Навичка</th><th>Ставка</th><th>Місце роботи</th><th></th></tr></thead><tbody>
      ${state.staff.map((p) => `<tr><td>${esc(p.name)}</td><td>${skillDots(p.skill)}</td><td>${money(p.wage, 1)}/год</td><td><select data-change="transfer" data-id="${p.id}">${opts(p.bizId)}</select></td><td><button class="btn danger sm" data-act="fire" data-id="${p.id}">Звільнити</button></td></tr>`).join('')}
      </tbody></table></div>`;
    return html + `</div>`;
  },

  bank() {
    const lim = creditLimit();
    let html = `<h1>Банк «Гривня-Кредит»</h1><div class="kpis">${kpi('Борг', money(debt()), debt() ? 'neg' : '')}${kpi('Кредитний ліміт', money(lim))}${kpi('Відсотки на день', money(sum(state.loans, (l) => l.amount * l.rate)))}</div>
    <div class="card"><h3>Оформити кредит</h3><p class="muted">Ставка зростає разом із загальним боргом. Відсотки списуються щоночі.</p><div class="row wrap">
      ${[5000, 15000, 30000, 60000, 120000].map((a) => `<button class="btn ${a <= lim ? 'primary' : ''}" ${a > lim ? 'disabled' : ''} data-act="loan" data-v="${a}">+ ${money(a)}</button>`).join('')}</div></div>
    <div class="card"><h3>Мої кредити</h3>`;
    if (!state.loans.length) html += `<p class="muted">Кредитів немає.</p>`;
    else html += `<div class="table-wrap"><table><thead><tr><th>Сума</th><th>Ставка/день</th><th>Відсотки/день</th><th>Взято</th><th></th></tr></thead><tbody>
      ${state.loans.map((l) => `<tr><td>${money(l.amount)}</td><td>${(l.rate * 100).toFixed(2)}%</td><td>${money(l.amount * l.rate, 2)}</td><td>День ${l.day}</td><td><button class="btn sm" ${state.cash < l.amount ? 'disabled' : ''} data-act="repay" data-id="${l.id}">Погасити</button></td></tr>`).join('')}</tbody></table></div>`;
    return html + `</div>`;
  },

  stats() {
    const h = state.history.slice(-30);
    let html = `<h1>Статистика</h1><div class="grid2">
      ${chartBox('chProfit', [{ data: h.map((x) => x.profit), color: '#5aa469' }, { data: h.map((x) => x.rev), color: '#e08a3c' }], h.map((x) => String(x.day)), 'Виручка (помаранчевий) і прибуток (зелений)')}
      ${chartBox('chNw', [{ data: h.map((x) => x.nw ?? x.cash), color: '#a3558a' }], h.map((x) => String(x.day)), 'Чистий капітал')}</div>`;
    if (state.biz.length) html += `<div class="card"><h3>Порівняння бізнесів (середнє за 7 днів)</h3><div class="table-wrap"><table><thead><tr><th>Бізнес</th><th>Виручка/день</th><th>Прибуток/день</th><th>Клієнтів/день</th><th>Оцінка вартості</th></tr></thead><tbody>
      ${state.biz.map((b) => { const hh = b.history.slice(-7), n = hh.length || 1; return `<tr class="click" data-act="biz" data-id="${b.id}"><td>${TYPES[b.type].icon} ${esc(b.name)}</td><td>${money(sum(hh, (x) => x.rev) / n)}</td><td class="${sum(hh, (x) => x.profit) < 0 ? 'neg' : 'pos'}">${money(sum(hh, (x) => x.profit) / n)}</td><td>${Math.round(sum(hh, (x) => x.cust) / n)}</td><td>${money(bizValue(b))}</td></tr>`; }).join('')}
      </tbody></table></div></div>`;
    html += `<div class="card"><h3>Журнал</h3>${logList(40)}</div>`;
    return html;
  },

  achievements() {
    const got = Object.keys(state.achievements).length;
    return `<h1>Досягнення <small class="muted">${got}/${ACHIEVEMENTS.length}</small></h1><div class="cards">${ACHIEVEMENTS.map((a) => {
      const d = state.achievements[a.id];
      return `<div class="card ach ${d ? 'got' : ''}"><span class="big">${d ? a.icon : '🔒'}</span><div><b>${a.name}</b><br><small>${a.desc}</small>${d ? `<br><small class="pos">Отримано: день ${d}</small>` : ''}</div></div>`;
    }).join('')}</div>`;
  },

  settings() {
    return `<h1>Гра</h1><div class="card"><h3>Збереження</h3><p class="muted">Гра автоматично зберігається щоночі о 00:00.</p><div class="row wrap">
      <button class="btn primary" data-act="saveNow">💾 Зберегти зараз</button>
      <button class="btn danger" data-act="newGameConfirm">🔄 Нова гра</button></div></div>
      <div class="card"><h3>Як грати</h3><ul class="help">
      <li><b>Район</b> визначає потік людей, оренду та чутливість до цін. Кожен тип бізнесу має «улюблені» райони (★ на мапі).</li>
      <li><b>Конкуренти</b> того ж типу в районі забирають частину клієнтів.</li>
      <li><b>Персонал</b> обмежує, скільки клієнтів ви обслужите за годину. Черги = втрачені клієнти і падіння репутації.</li>
      <li><b>Товар</b> закінчується — клієнти йдуть ні з чим. Увімкніть автозакупівлю (о 06:00, +10% до ціни) або купуйте вручну.</li>
      <li><b>Свіжі продукти</b> (випічка, квіти, хліб) частково псуються щоночі.</li>
      <li><b>Ціни</b> вищі за ринкові дають більшу маржу, але відлякують клієнтів і знижують задоволеність.</li>
      <li><b>Репутація</b> залежить від швидкості обслуговування, наявності товару, цін, навичок персоналу та інтер'єру.</li>
      <li>Щонеділі сплачується податок 12% від тижневого прибутку. Готівка нижче −$10 000 = банкрутство.</li></ul></div>`;
  },
};

function use3D() { return !state.ui.no3d && typeof City3D !== 'undefined' && City3D.ok(); }

function skillDots(s) { return `<span class="skill" title="${s.toFixed(1)}">${'●'.repeat(Math.round(s))}${'○'.repeat(5 - Math.round(s))}</span> <small>${s.toFixed(1)}</small>`; }

function lotPanel(l) {
  const D = DMAP[l.district], S = SIZES[l.size];
  let html = `<div class="card lotpanel" id="lotpanel"><div class="row between"><h3>📍 ${esc(l.addr)}</h3><button class="btn ghost sm" data-act="selLot" data-id="">✕</button></div>
    <p>${D.name} · ${S.name} приміщення ${S.m2} м² · оренда <b>${money(lotRent(l))}/день</b> · до ${S.maxStaff} працівників · склад ${S.storage} од.</p><p class="muted">${D.desc}</p>`;
  if (l.owner) {
    const b = bizById(l.owner);
    html += `<p>Тут працює ваш бізнес <b>${esc(b.name)}</b>.</p><button class="btn primary" data-act="biz" data-id="${b.id}">Перейти</button>`;
  } else if (l.npc) {
    html += `<p>Зайнято конкурентом: <b>${TYPES[l.npc.type].icon} ${esc(l.npc.name)}</b> (${TYPES[l.npc.type].name}).</p>`;
  } else {
    html += `<div class="typelist">`;
    for (const [k, T] of Object.entries(TYPES)) {
      const comp = state.lots.filter((x) => x.district === l.district && ((x.npc && x.npc.type === k) || (x.owner && bizById(x.owner).type === k))).length;
      const cost = setupCost(k, l) + lotRent(l) * 7;
      html += `<div class="typerow"><span class="big">${T.icon}</span><div><b>${T.name}</b><br><span class="stars" title="Попит у районі">${stars(T.aff[l.district])}</span> <small>· конкурентів: ${comp}</small><br><small>Старт ${money(cost)} (вкл. депозит ${money(lotRent(l) * 7)})</small></div><button class="btn primary sm" ${state.cash < cost ? 'disabled' : ''} data-act="openBiz" data-lot="${l.id}" data-type="${k}">Відкрити</button></div>`;
    }
    html += `</div>`;
  }
  return html + `</div>`;
}

const BIZ_TABS = {
  overview(b) {
    const y = b.yest;
    const hh = b.history.slice(-14);
    let html = `<div class="kpis">${kpi('Репутація', b.rep.toFixed(0) + '/100', b.rep >= 70 ? 'pos' : b.rep < 45 ? 'neg' : '')}
      ${kpi('Виручка сьогодні', money(b.today.rev))}${kpi('Клієнтів сьогодні', b.today.served, '', b.today.lost ? `${b.today.lost} пішли через черги` : '')}
      ${kpi('Прибуток учора', y ? money(y.profit) : '—', y && y.profit < 0 ? 'neg' : 'pos')}${kpi('Оцінка вартості', money(bizValue(b)))}</div>`;
    const tips = [];
    if (!staffOf(b).length) tips.push(`👥 Немає персоналу — бізнес не працює. <a data-act="tab" data-v="staff">Найняти</a>`);
    if (stockTotal(b) < 1) tips.push(`📦 Склад порожній. <a data-act="tab" data-v="products">Закупити товар</a>`);
    if (y && y.lost > y.served * 0.15) tips.push('⏳ Багато клієнтів пішло через черги — найміть ще працівника або покращте обладнання.');
    if (y && y.oos > 10) tips.push('🚫 Товар закінчувався — збільште цільовий запас.');
    if (tips.length) html += `<div class="card warn">${tips.map((t) => `<p>${t}</p>`).join('')}</div>`;
    html += `<div class="grid2">`;
    if (y) {
      html += `<div class="card"><h3>Звіт за вчора</h3><table class="pl">
        <tr><td>Виручка</td><td class="pos">${money(y.rev)}</td></tr>
        <tr><td>Собівартість проданого</td><td class="neg">−${money(y.cogs).replace('−', '')}</td></tr>
        <tr><td>Зарплати</td><td class="neg">−${money(y.wages)}</td></tr>
        <tr><td>Оренда</td><td class="neg">−${money(y.rent)}</td></tr>
        <tr><td>Маркетинг</td><td class="neg">−${money(y.mkt)}</td></tr>
        <tr><td>Списання зіпсованого</td><td class="neg">−${money(y.spoil)}</td></tr>
        <tr class="tot"><td>Прибуток</td><td class="${y.profit < 0 ? 'neg' : 'pos'}">${money(y.profit)}</td></tr>
        <tr><td>Клієнтів / пішли / без товару</td><td>${y.served} / ${y.lost} / ${y.oos}</td></tr>
        <tr><td>Задоволеність</td><td>${y.sat != null ? y.sat.toFixed(0) + '/100' : '—'}</td></tr></table></div>`;
    } else html += `<div class="card"><h3>Звіт за вчора</h3><p class="muted">З’явиться після першого дня роботи.</p></div>`;
    html += chartBox('chBiz', [{ data: hh.map((x) => x.profit), color: '#5aa469' }, { data: hh.map((x) => x.rev), color: '#e08a3c' }], hh.map((x) => String(x.day)), 'Виручка і прибуток (14 днів)');
    html += `</div><div class="card"><h3>Графік роботи</h3><div class="row wrap">
      <label>Відкриття <select data-change="hours" data-k="open" data-id="${b.id}">${hourOpts(0, 23, b.open)}</select></label>
      <label>Закриття <select data-change="hours" data-k="close" data-id="${b.id}">${hourOpts(1, 24, b.close)}</select></label>
      <span class="muted">${openHours(b)} год/день · зарплати ${money(dailyWages(b))}/день · оренда ${money(lotRent(lotOf(b)))}/день</span></div></div>
      <div class="card"><h3>Продаж бізнесу</h3><p class="muted">Покупець пропонує ${money(bizValue(b))}. Персонал буде звільнено.</p><button class="btn danger" data-act="sell" data-id="${b.id}">Продати</button></div>`;
    return html;
  },

  products(b) {
    const T = TYPES[b.type], cap = storageCap(b), tot = stockTotal(b);
    let html = `<div class="card"><div class="row between wrap"><div><b>Склад:</b> ${Math.round(tot)} / ${cap} од.<div class="bar ${tot / cap > 0.9 ? 'mid' : 'good'}" style="width:220px"><i style="width:${clamp(tot / cap * 100, 0, 100)}%"></i></div></div>
      <label class="switch"><input type="checkbox" data-change="auto" data-id="${b.id}" ${b.autoRestock ? 'checked' : ''}> Автозакупівля о 06:00 (+10%)</label>
      <button class="btn primary" data-act="fillAll" data-id="${b.id}">📦 Докупити до цілі</button></div>
      ${state.wholesaleMult !== 1 || modMult('wholesale') !== 1 ? `<p class="muted">Оптові ціни зараз ×${(state.wholesaleMult * modMult('wholesale')).toFixed(2)} від базових.</p>` : ''}</div>
      <div class="cards">`;
    for (const p of T.products) {
      const st = b.products[p.id];
      const r = st.price / p.price;
      const margin = st.price - wholesale(p);
      html += `<div class="card prod"><div class="row between"><b>${p.name}</b>${p.spoil ? `<span class="tag">псується ${Math.round(p.spoil * 100)}%/ніч</span>` : ''}</div>
        <div class="mini"><span>На складі<br><b class="${st.stock < 1 ? 'neg' : ''}">${Math.floor(st.stock)}</b></span><span>Продано сьогодні<br><b>${st.sold}</b></span><span>Учора<br><b>${st.soldY || 0}</b></span></div>
        <label>Ціна продажу ($) <small class="muted">ринкова ${money(p.price, 2)}</small>
          <input type="number" step="0.1" min="0.1" value="${st.price.toFixed(2)}" data-change="price" data-id="${b.id}" data-p="${p.id}"></label>
        <small class="${r > 1.2 ? 'neg' : r < 0.9 ? 'pos' : 'muted'}">${r > 1.2 ? 'Дорого — клієнти відмовлятимуться' : r < 0.9 ? 'Дешево — більше клієнтів, менша маржа' : 'Нормальна ціна'} · маржа ${money(margin, 2)}</small>
        <label>Цільовий запас <input type="number" min="0" step="10" value="${st.target}" data-change="target" data-id="${b.id}" data-p="${p.id}"></label>
        <div class="row"><input type="number" min="1" step="10" value="50" id="qty-${p.id}" aria-label="Кількість"><button class="btn sm" data-act="buy" data-id="${b.id}" data-p="${p.id}">Купити по ${money(wholesale(p), 2)}</button></div>
      </div>`;
    }
    return html + `</div>`;
  },

  staff(b) {
    const st = staffOf(b), S = SIZES[lotOf(b).size], T = TYPES[b.type];
    const cap = sum(st, (p) => T.cap * (0.5 + p.skill * 0.2)) * (1 + 0.2 * (b.upg.equipment - 1));
    let html = `<div class="card"><p>Працівників: <b>${st.length}/${S.maxStaff}</b> · пропускна здатність ≈ <b>${Math.round(cap)}</b> клієнтів/год · зарплати ${money(dailyWages(b))}/день</p>`;
    if (st.length) html += `<div class="table-wrap"><table><thead><tr><th>Ім’я</th><th>Навичка</th><th>Ставка</th><th></th></tr></thead><tbody>${st.map((p) => `<tr><td>${esc(p.name)}</td><td>${skillDots(p.skill)}</td><td>${money(p.wage, 1)}/год</td><td><button class="btn danger sm" data-act="fire" data-id="${p.id}">Звільнити</button></td></tr>`).join('')}</tbody></table></div>`;
    html += `</div><div class="card"><h3>Кандидати</h3>`;
    if (st.length >= S.maxStaff) html += `<p class="muted">Приміщення заповнене персоналом.</p>`;
    html += `<div class="table-wrap"><table><thead><tr><th>Кандидат</th><th>Навичка</th><th>Ставка</th><th></th></tr></thead><tbody>${state.candidates.map((c) => `<tr><td>${esc(c.name)}</td><td>${skillDots(c.skill)}</td><td>${money(c.wage, 1)}/год</td><td><button class="btn primary sm" ${st.length >= S.maxStaff ? 'disabled' : ''} data-act="hireHere" data-id="${c.id}" data-biz="${b.id}">Найняти</button></td></tr>`).join('')}</tbody></table></div></div>`;
    return html;
  },

  marketing(b) {
    return `<div class="card"><p class="muted">Кампанії збільшують кількість відвідувачів. Оплата щодня, поки кампанія активна. Зараз: <b>${money(dailyMarketing(b))}/день</b>.</p></div><div class="cards">${Object.entries(CAMPAIGNS).map(([k, c]) => `
      <div class="card camp ${b.marketing[k] ? 'on' : ''}"><span class="big">${c.icon}</span><div><b>${c.name}</b><br><small>+${Math.round(c.boost * 100)}% відвідувачів · ${money(c.cost)}/день</small></div>
      <button class="btn ${b.marketing[k] ? 'danger' : 'primary'} sm" data-act="camp" data-id="${b.id}" data-k="${k}">${b.marketing[k] ? 'Зупинити' : 'Запустити'}</button></div>`).join('')}</div>`;
  },

  upgrades(b) {
    return `<div class="cards">${Object.entries(UPGRADES).map(([k, u]) => {
      const lvl = b.upg[k], max = lvl >= MAX_UPG, c = max ? 0 : upgradeCost(b, k);
      return `<div class="card camp"><span class="big">${u.icon}</span><div><b>${u.name}</b> <span class="tag">рівень ${lvl}/${MAX_UPG}</span><br><small>${u.desc}</small></div>
        ${max ? '<span class="tag good">Максимум</span>' : `<button class="btn primary sm" ${state.cash < c ? 'disabled' : ''} data-act="upg" data-id="${b.id}" data-k="${k}">${money(c)}</button>`}</div>`;
    }).join('')}</div>`;
  },
};

function hourOpts(a, bb, sel) { let s = ''; for (let i = a; i <= bb; i++) s += `<option value="${i}" ${i === sel ? 'selected' : ''}>${pad2(i)}:00</option>`; return s; }

function startPrompt(canCancel) {
  showModal(`<h2>🏙️ Бізнес Імперія</h2><p>Почніть із $25 000 і збудуйте бізнес-імперію в місті з п’яти районів.</p>
    <label>Назва компанії <input id="coName" maxlength="32" value="Моя компанія"></label>
    <div class="row end">${canCancel ? '<button class="btn" data-act="modalClose">Скасувати</button>' : ''}<button class="btn primary" data-act="startGame">Почати</button></div>`);
  setTimeout(() => { const i = document.getElementById('coName'); if (i) { i.focus(); i.select(); } }, 50);
}

// ================= Обробники =================
const ACT = {
  nav: (d) => { state.ui.view = d.v; window.scrollTo(0, 0); },
  speed: (d) => setSpeed(+d.v),
  cam: (d) => City3D.control(d.v),
  toggle3d: () => { state.ui.no3d = !state.ui.no3d; },
  showOnMap: (d) => { const b = bizById(d.id); state.ui.view = 'map'; state.ui.lot = b.lotId; if (use3D()) City3D.focus(b.lotId); },
  selLot: (d) => { state.ui.lot = d.id || null; if (d.id && !use3D()) setTimeout(() => { const p = document.getElementById('lotpanel'); if (p) p.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 30); },
  openBiz: (d) => openBusiness(d.lot, d.type),
  biz: (d) => { state.ui.view = 'biz'; state.ui.bizId = d.id; state.ui.tab = 'overview'; window.scrollTo(0, 0); },
  tab: (d) => { state.ui.tab = d.v; },
  buy: (d) => { const b = bizById(d.id); const q = +document.getElementById('qty-' + d.p).value; const r = buyStock(b, d.p, q); if (r.ok) toast(`Куплено ${r.qty} од. за ${money(r.cost)}.`, 'good'); },
  fillAll: (d) => fillAll(bizById(d.id)),
  hire: (d) => { const s = document.getElementById('hire-' + d.id); hire(d.id, s && s.value); },
  hireHere: (d) => hire(d.id, d.biz),
  fire: (d) => { const p = state.staff.find((x) => x.id === d.id); confirmBox(`Звільнити ${esc(p.name)}? Вихідна допомога ${money(p.wage * 8)}.`, () => fire(d.id)); },
  camp: (d) => { const b = bizById(d.id); b.marketing[d.k] = !b.marketing[d.k]; },
  upg: (d) => upgrade(bizById(d.id), d.k),
  sell: (d) => { const b = bizById(d.id); confirmBox(`Продати «${esc(b.name)}» за ${money(bizValue(b))}?`, () => sellBiz(b)); },
  loan: (d) => takeLoan(+d.v),
  repay: (d) => repayLoan(d.id),
  rename: (d) => { const b = bizById(d.id); showModal(`<h2>Перейменувати</h2><label>Назва <input id="bizName" maxlength="40" value="${esc(b.name)}"></label><div class="row end"><button class="btn" data-act="modalClose">Скасувати</button><button class="btn primary" data-act="renameOk" data-id="${b.id}">Зберегти</button></div>`); },
  renameOk: (d) => { const v = document.getElementById('bizName').value.trim(); if (v) bizById(d.id).name = v; hideModal(); },
  saveNow: () => { save(); toast('Гру збережено.', 'good'); },
  newGameConfirm: () => confirmBox('Почати нову гру? Поточний прогрес буде втрачено.', () => setTimeout(() => startPrompt(true), 0)),
  newGamePrompt: () => startPrompt(false),
  startGame: () => { const n = document.getElementById('coName').value.trim(); hideModal(); newGame(n); save(); setSpeed(1); },
  modalClose: () => hideModal(),
  confirmYes: () => { hideModal(); const f = pendingConfirm; pendingConfirm = null; if (f) f(); },
};

const CHANGE = {
  price: (el) => { const b = bizById(el.dataset.id); const v = parseFloat(el.value); if (v > 0) b.products[el.dataset.p].price = Math.round(v * 100) / 100; },
  target: (el) => { const b = bizById(el.dataset.id); const v = parseInt(el.value, 10); if (v >= 0) b.products[el.dataset.p].target = v; },
  auto: (el) => { bizById(el.dataset.id).autoRestock = el.checked; },
  transfer: (el) => transfer(el.dataset.id, el.value),
  hours: (el) => {
    const b = bizById(el.dataset.id); const v = +el.value;
    if (el.dataset.k === 'open') { if (v >= b.close) return toast('Відкриття має бути раніше закриття.', 'bad'); b.open = v; }
    else { if (v <= b.open) return toast('Закриття має бути пізніше відкриття.', 'bad'); b.close = v; }
  },
};

function boot() {
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const f = ACT[el.dataset.act];
    if (!f) return;
    e.preventDefault();
    f(el.dataset);
    if (state) render(true);
  });
  document.addEventListener('change', (e) => {
    const el = e.target.closest('[data-change]');
    if (!el) return;
    const f = CHANGE[el.dataset.change];
    if (f) { f(el); el.blur(); render(true); }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.id === 'coName') ACT.startGame();
    if (e.key === 'Enter' && e.target.id === 'bizName') document.querySelector('[data-act="renameOk"]').click();
    if (e.key === ' ' && e.target === document.body && state) { e.preventDefault(); setSpeed(state.speed ? 0 : 1); }
  });
  window.addEventListener('resize', () => render(true));
  document.addEventListener('visibilitychange', () => { if (document.hidden && state) save(); });
  if (load() && state && !state.over) {
    if (!state.flags) state.flags = {};
    render(true); setSpeed(0);
    toast('Гру завантажено. Натисніть ▶, щоб продовжити.');
  } else {
    startPrompt(false);
  }
}

// Кнопка «Назад» в Android-застосунку: true — оброблено, false — вийти.
if (typeof window !== "undefined") window.androidBack = function () {
  const m = document.getElementById('modal');
  if (!m.classList.contains('hidden')) { if (state && !state.over) hideModal(); return true; }
  if (!state) return false;
  if (state.ui.view === 'map' && state.ui.lot) { state.ui.lot = null; render(true); return true; }
  if (state.ui.view === 'biz') { state.ui.view = 'businesses'; render(true); return true; }
  if (state.ui.view !== 'dashboard') { state.ui.view = 'dashboard'; render(true); return true; }
  save();
  return false;
};

if (typeof document !== 'undefined') boot();
if (typeof module !== 'undefined' && typeof window === 'undefined') module.exports = { newGame, tick, getState: () => state, TYPES, buyStock, hire, openBusiness, netWorth };
