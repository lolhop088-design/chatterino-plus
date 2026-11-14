'use strict';
/* БІЗНЕС ІМПЕРІЯ — дані світу та базові утиліти.
   Усі назви компаній вигадані (пародійні) й не пов'язані з реальними брендами. */

// ================= Утиліти =================
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rnd(a, b + 1));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const chance = (p) => Math.random() < p;
const sround = (x) => { if (x <= 0) return 0; const f = Math.floor(x); return f + (Math.random() < x - f ? 1 : 0); };
const uid = () => Math.random().toString(36).slice(2, 10);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sum = (arr, f) => arr.reduce((s, x) => s + (f ? f(x) : x), 0);
const pad2 = (n) => String(n).padStart(2, '0');
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
function money(n, dec = 0) {
  if (!isFinite(n)) n = 0;
  const v = Math.abs(n);
  return (n < 0 ? '−' : '') + '$' + v.toLocaleString('uk-UA', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function moneyK(n) {
  const v = Math.abs(n), s = n < 0 ? '−' : '';
  if (v >= 1e9) return s + '$' + (v / 1e9).toFixed(2) + ' млрд';
  if (v >= 1e6) return s + '$' + (v / 1e6).toFixed(2) + ' млн';
  if (v >= 1e4) return s + '$' + (v / 1e3).toFixed(1) + ' тис';
  return money(n);
}
const pct = (x, d = 1) => (x * 100).toFixed(d) + '%';
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

// ================= Міста =================
const CITIES = {
  kyiv: { name: 'Київ', flag: 'UA', traffic: 1, rent: 1, wage: 1, price: 1, tax: 0.18, transport: 1, desc: 'Збалансований старт: середні ціни, оренда й зарплати.' },
  lviv: { name: 'Львів', flag: 'UA', traffic: 0.92, rent: 0.8, wage: 0.85, price: 0.95, tax: 0.18, transport: 1.05, tourism: 1.25, desc: 'Дешевша оренда і туристи в центрі та на набережній.' },
  odesa: { name: 'Одеса', flag: 'UA', traffic: 0.95, rent: 0.85, wage: 0.9, price: 0.95, tax: 0.18, transport: 0.7, desc: 'Морський порт — логістика на 30% дешевша.' },
  berlin: { name: 'Берлін', flag: 'DE', traffic: 1.25, rent: 1.6, wage: 1.6, price: 1.25, tax: 0.3, transport: 1.1, desc: 'Великий стабільний ринок, але податок 30%.' },
  newyork: { name: 'Нью-Йорк', flag: 'US', traffic: 1.6, rent: 2.4, wage: 2.0, price: 1.5, tax: 0.25, transport: 1.2, desc: 'Найбільший ринок і шалені витрати. Хардкор.' },
};

// ================= Райони =================
// zone: retail — магазини/офіси/будівництво; industry — заводи, ферми, логістика.
const DISTRICTS = [
  { id: 'center', name: 'Історичний центр', zone: 'retail', traffic: 100, rent: 1.8, sens: 1.0, color: '#e08a3c', streets: ['вул. Соборна', 'пл. Ринок', 'вул. Галицька', 'вул. Театральна'], desc: 'Найбільший потік людей і найдорожча оренда.' },
  { id: 'biz', name: 'Діловий квартал', zone: 'retail', traffic: 85, rent: 1.5, sens: 0.95, color: '#3f7fc4', streets: ['просп. Свободи', 'вул. Банкова', 'вул. Офісна', 'бульв. Інновацій'], desc: 'Офіси й IT. Кава зранку, обіди вдень, тихі вихідні.' },
  { id: 'res', name: 'Спальний район', zone: 'retail', traffic: 55, rent: 0.7, sens: 1.15, color: '#5aa469', streets: ['вул. Липова', 'вул. Садова', 'просп. Миру', 'вул. Затишна'], desc: 'Дешева оренда, багато мешканців. Добре для продуктових.' },
  { id: 'campus', name: 'Студмістечко', zone: 'retail', traffic: 75, rent: 0.9, sens: 1.35, color: '#a3558a', streets: ['вул. Студентська', 'вул. Наукова', 'вул. Бібліотечна', 'пров. Лекційний'], desc: 'Багато молоді, але дуже чутливі до цін. Дешеві програмісти.' },
  { id: 'river', name: 'Набережна', zone: 'retail', traffic: 80, rent: 1.4, sens: 0.8, color: '#3a8f99', streets: ['Набережна вул.', 'вул. Яхтова', 'вул. Маяк', 'Портова пл.'], desc: 'Заможні відвідувачі, туристи, ресторани.' },
  { id: 'hills', name: 'Пагорби', zone: 'retail', traffic: 45, rent: 1.6, sens: 0.65, color: '#c9a227', streets: ['вул. Виноградна', 'вул. Панорамна', 'Кедровий пров.', 'вул. Оранжерейна'], desc: 'Елітні особняки. Мало людей, але великі чеки.' },
  { id: 'industrial', name: 'Промзона', zone: 'industry', traffic: 15, rent: 0.45, sens: 1.0, color: '#8a7f73', streets: ['вул. Заводська', 'вул. Ливарна', 'вул. Індустріальна', 'вул. Машинобудівна'], desc: 'Заводи, шахти, ферми й електростанції.' },
  { id: 'port', name: 'Порт і логістика', zone: 'industry', traffic: 20, rent: 0.55, sens: 1.0, color: '#4d6c8a', streets: ['Причал №', 'вул. Контейнерна', 'вул. Митна', 'Складський пров.'], desc: 'Склади, логістичні центри та переробка біля води.' },
];
const DMAP = Object.fromEntries(DISTRICTS.map((d) => [d.id, d]));

const SIZES = {
  S: { name: 'Малий', m2: 40, setup: 1, storage: 300, maxStaff: 2, attract: 1 },
  M: { name: 'Середній', m2: 80, setup: 1.4, storage: 700, maxStaff: 4, attract: 1.3 },
  L: { name: 'Великий', m2: 150, setup: 2, storage: 1500, maxStaff: 7, attract: 1.6 },
  XL: { name: 'Промисловий', m2: 600, setup: 3, storage: 4000, maxStaff: 40, attract: 1.8 },
};
const SIZE_ORDER = ['S', 'M', 'L', 'XL'];
const RENT_PER_M2 = 1.4;

const CURVES = {
  morning: [0, 0, 0, 0, 0, 0.1, 0.4, 1.3, 1.7, 1.3, 1.0, 0.9, 1.1, 1.0, 0.8, 0.8, 0.9, 0.8, 0.6, 0.5, 0.4, 0.3, 0.15, 0.05],
  lunch: [0.1, 0.05, 0, 0, 0, 0, 0.1, 0.3, 0.5, 0.6, 0.8, 1.3, 1.9, 1.6, 0.9, 0.7, 0.8, 1.1, 1.5, 1.6, 1.3, 0.9, 0.5, 0.3],
  retail: [0, 0, 0, 0, 0, 0, 0, 0.1, 0.3, 0.6, 0.9, 1.1, 1.2, 1.2, 1.2, 1.3, 1.4, 1.5, 1.5, 1.3, 1.0, 0.6, 0.2, 0],
  grocery: [0.1, 0.05, 0.05, 0, 0, 0.1, 0.3, 0.8, 1.0, 0.9, 0.8, 0.9, 1.0, 0.9, 0.8, 0.9, 1.1, 1.4, 1.6, 1.4, 1.1, 0.7, 0.4, 0.2],
  dinner: [0.1, 0, 0, 0, 0, 0, 0, 0, 0.1, 0.2, 0.3, 0.6, 1.3, 1.2, 0.6, 0.4, 0.5, 0.9, 1.6, 2.0, 1.9, 1.3, 0.7, 0.3],
};

// ================= Роздрібні бізнеси =================
// good/gq — який товар із власного виробництва замінює оптову закупівлю (і скільки одиниць на 1 шт).
const TYPES = {
  coffee: {
    name: "Кав'ярня", icon: '☕', setup: 9000, cap: 16, draw: 0.22, elast: 1.3, curve: 'morning', hours: [7, 21], retail: false, role: 'sales',
    aff: { res: 0.8, center: 1.1, biz: 1.4, campus: 1.3, river: 1.0, hills: 0.9 },
    products: [
      { id: 'espresso', name: 'Еспресо', cost: 0.5, price: 2.5, share: 0.25, spoil: 0 },
      { id: 'cappuccino', name: 'Капучино', cost: 0.8, price: 3.8, share: 0.35, spoil: 0 },
      { id: 'croissant', name: 'Круасан', cost: 0.9, price: 3.0, share: 0.2, spoil: 0.25, good: 'bread', gq: 1 },
      { id: 'sandwich', name: 'Сендвіч', cost: 1.8, price: 5.5, share: 0.2, spoil: 0.3 },
    ],
  },
  fastfood: {
    name: 'Бургерна', icon: '🍔', setup: 12000, cap: 20, draw: 0.15, elast: 1.3, curve: 'lunch', hours: [10, 23], retail: false, role: 'sales',
    aff: { res: 1.0, center: 1.2, biz: 1.1, campus: 1.4, river: 0.9, hills: 0.6 },
    products: [
      { id: 'burger', name: 'Бургер', cost: 2.2, price: 7.0, share: 0.35, spoil: 0.2 },
      { id: 'fries', name: 'Картопля фрі', cost: 0.6, price: 3.0, share: 0.25, spoil: 0.1, good: 'veg', gq: 1 },
      { id: 'soda', name: 'Напій', cost: 0.4, price: 2.2, share: 0.25, spoil: 0 },
      { id: 'hotdog', name: 'Хот-дог', cost: 1.4, price: 5.0, share: 0.15, spoil: 0.2 },
    ],
  },
  grocery: {
    name: 'Мінімаркет', icon: '🛒', setup: 15000, cap: 26, draw: 0.36, elast: 1.8, curve: 'grocery', hours: [7, 23], retail: false, store: 1.6, role: 'sales',
    aff: { res: 1.5, center: 0.9, biz: 0.7, campus: 1.1, river: 0.8, hills: 1.0 },
    products: [
      { id: 'bread', name: 'Хліб', cost: 0.6, price: 1.9, share: 0.25, spoil: 0.3, good: 'bread', gq: 1 },
      { id: 'milk', name: 'Молочка', cost: 0.7, price: 2.0, share: 0.2, spoil: 0.12, good: 'dairy', gq: 1 },
      { id: 'veggies', name: 'Овочі', cost: 1.1, price: 3.2, share: 0.2, spoil: 0.15, good: 'veg', gq: 2 },
      { id: 'snacks', name: 'Снеки', cost: 0.8, price: 2.8, share: 0.2, spoil: 0 },
      { id: 'drinks', name: 'Напої', cost: 0.6, price: 2.2, share: 0.15, spoil: 0 },
    ],
  },
  flowers: {
    name: 'Квіткова крамниця', icon: '💐', setup: 7000, cap: 8, draw: 0.035, elast: 1.1, curve: 'retail', hours: [8, 20], retail: true, role: 'sales',
    aff: { res: 1.0, center: 1.2, biz: 0.9, campus: 0.8, river: 1.4, hills: 1.3 },
    products: [
      { id: 'roses', name: 'Троянди', cost: 1.5, price: 5, share: 0.35, spoil: 0.15 },
      { id: 'bouquet', name: 'Букет', cost: 8, price: 28, share: 0.35, spoil: 0.12 },
      { id: 'pot', name: 'Вазон', cost: 5, price: 16, share: 0.2, spoil: 0.02 },
      { id: 'card', name: 'Листівка', cost: 0.3, price: 2, share: 0.1, spoil: 0 },
    ],
  },
  restaurant: {
    name: 'Ресторан', icon: '🍝', setup: 26000, cap: 6, draw: 0.028, elast: 0.9, curve: 'dinner', hours: [11, 24], retail: false, minSize: 'M', role: 'sales',
    aff: { res: 0.7, center: 1.3, biz: 1.1, campus: 0.7, river: 1.5, hills: 1.4 },
    products: [
      { id: 'pasta', name: 'Паста', cost: 3, price: 14, share: 0.35, spoil: 0.2, good: 'dairy', gq: 2 },
      { id: 'steak', name: 'Стейк', cost: 9, price: 32, share: 0.2, spoil: 0.25 },
      { id: 'salad', name: 'Салат', cost: 2, price: 9, share: 0.25, spoil: 0.3, good: 'veg', gq: 2 },
      { id: 'wine', name: 'Вино', cost: 4, price: 12, share: 0.2, spoil: 0 },
    ],
  },
  fashion: {
    name: 'Магазин одягу', icon: '👕', setup: 22000, cap: 6, draw: 0.022, elast: 1.0, curve: 'retail', hours: [10, 21], retail: true, import: true, role: 'sales',
    aff: { res: 0.6, center: 1.4, biz: 0.9, campus: 0.9, river: 1.3, hills: 1.2 },
    products: [
      { id: 'tshirt', name: 'Футболка', cost: 6, price: 20, share: 0.35, spoil: 0, good: 'clothes', gq: 1 },
      { id: 'jeans', name: 'Джинси', cost: 18, price: 55, share: 0.25, spoil: 0, good: 'clothes', gq: 2 },
      { id: 'jacket', name: 'Куртка', cost: 40, price: 120, share: 0.15, spoil: 0, good: 'clothes', gq: 5 },
      { id: 'acc', name: 'Аксесуари', cost: 3, price: 12, share: 0.25, spoil: 0 },
    ],
  },
  electronics: {
    name: 'Магазин електроніки', icon: '📱', setup: 40000, cap: 4, draw: 0.012, elast: 0.9, curve: 'retail', hours: [10, 21], retail: true, import: true, role: 'sales',
    aff: { res: 0.7, center: 1.3, biz: 1.2, campus: 1.1, river: 1.0, hills: 1.1 },
    products: [
      { id: 'headphones', name: 'Навушники', cost: 15, price: 45, share: 0.35, spoil: 0, good: 'electronics', gq: 0.3 },
      { id: 'charger', name: 'Зарядка', cost: 3, price: 15, share: 0.3, spoil: 0 },
      { id: 'phone', name: 'Смартфон', cost: 190, price: 399, share: 0.15, spoil: 0, good: 'electronics', gq: 4 },
      { id: 'tablet', name: 'Планшет', cost: 150, price: 329, share: 0.2, spoil: 0, good: 'electronics', gq: 3 },
    ],
  },
  dealership: {
    name: 'Автосалон', icon: '🚗', setup: 60000, cap: 1.5, draw: 0.0045, elast: 1.4, curve: 'retail', hours: [9, 20], retail: true, minSize: 'M', role: 'sales', dynamic: 'cars',
    aff: { res: 1.0, center: 0.9, biz: 1.1, campus: 0.7, river: 1.0, hills: 1.5 },
    products: [],
  },
};

const CAMPAIGNS = {
  flyers: { name: 'Листівки', icon: '📄', cost: 40, boost: 0.12 },
  social: { name: 'Соцмережі', icon: '📲', cost: 90, boost: 0.22 },
  radio: { name: 'Радіо', icon: '📻', cost: 160, boost: 0.3 },
  billboard: { name: 'Білборд', icon: '🪧', cost: 260, boost: 0.45 },
  tv: { name: 'Телереклама', icon: '📺', cost: 900, boost: 0.8 },
};
const UPGRADES = {
  interior: { name: "Інтер'єр", icon: '🛋️', k: 0.35, desc: '+12% відвідувачів і задоволеність за рівень' },
  equipment: { name: 'Обладнання', icon: '⚙️', k: 0.3, desc: '+20% швидкості обслуговування за рівень' },
  storage: { name: 'Склад', icon: '📦', k: 0.2, desc: '+50% місткості складу за рівень' },
};
const MAX_UPG = 3;

// ================= Товари B2B-ринку =================
// price — базова ціна за одиницю, w — вага для логістики.
const GOODS = {
  grain: { name: 'Зерно', icon: '🌾', price: 0.22, w: 1, raw: true },
  milk: { name: 'Сире молоко', icon: '🥛', price: 0.32, w: 1, raw: true },
  veg: { name: 'Овочі', icon: '🥕', price: 0.45, w: 1, raw: true },
  cotton: { name: 'Бавовна', icon: '☁️', price: 0.75, w: 1, raw: true },
  ore: { name: 'Залізна руда', icon: '⛏️', price: 0.55, w: 2, raw: true },
  sand: { name: 'Кварцовий пісок', icon: '🏖️', price: 0.28, w: 2, raw: true },
  oil: { name: 'Нафта', icon: '🛢️', price: 1.15, w: 1.5, raw: true },
  bread: { name: 'Хліб і випічка', icon: '🍞', price: 0.55, w: 0.5 },
  dairy: { name: 'Молочні продукти', icon: '🧀', price: 0.7, w: 0.7 },
  clothes: { name: 'Одяг', icon: '👕', price: 4.6, w: 0.3 },
  steel: { name: 'Сталь', icon: '🔩', price: 4.4, w: 2 },
  plastic: { name: 'Пластик', icon: '🧪', price: 2.9, w: 1 },
  chips: { name: 'Мікросхеми', icon: '💾', price: 11, w: 0.1 },
  electronics: { name: 'Електроніка', icon: '📱', price: 38, w: 0.3 },
};

// ================= Виробничі об'єкти =================
// rate — одиниць виходу на день (рівень 1, повний штат); in — витрата на 1 одиницю виходу; power — МВт·год/день.
const FACILITIES = {
  farm: { name: 'Ферма', icon: '🚜', setup: 35000, staff: 4, power: 1, zones: ['industry'], sizes: ['L', 'XL'], role: 'worker', shape: 'farm',
    recipes: [{ id: 'grain', out: 'grain', rate: 9200, in: {} }, { id: 'milk', out: 'milk', rate: 6200, in: {} }, { id: 'veg', out: 'veg', rate: 4400, in: {} }, { id: 'cotton', out: 'cotton', rate: 2600, in: {} }] },
  mine: { name: 'Залізорудна шахта', icon: '⛏️', setup: 80000, staff: 8, power: 6, zones: ['industry'], sizes: ['L', 'XL'], role: 'worker', shape: 'mine',
    recipes: [{ id: 'ore', out: 'ore', rate: 8000, in: {} }] },
  quarry: { name: "Кар'єр піску", icon: '🏖️', setup: 30000, staff: 4, power: 2, zones: ['industry'], sizes: ['M', 'L', 'XL'], role: 'worker', shape: 'mine',
    recipes: [{ id: 'sand', out: 'sand', rate: 7500, in: {} }] },
  oilwell: { name: 'Нафтова свердловина', icon: '🛢️', setup: 120000, staff: 5, power: 3, zones: ['industry'], sizes: ['L', 'XL'], role: 'worker', shape: 'oil',
    recipes: [{ id: 'oil', out: 'oil', rate: 2950, in: {} }] },
  foodplant: { name: 'Харчовий комбінат', icon: '🏭', setup: 60000, staff: 6, power: 2, zones: ['industry'], sizes: ['L', 'XL'], role: 'worker', shape: 'factory',
    recipes: [{ id: 'bread', out: 'bread', rate: 10800, in: { grain: 1 } }, { id: 'dairy', out: 'dairy', rate: 9700, in: { milk: 1 } }] },
  textile: { name: 'Швейна фабрика', icon: '🧵', setup: 55000, staff: 10, power: 2, zones: ['industry'], sizes: ['L', 'XL'], role: 'worker', shape: 'factory',
    recipes: [{ id: 'clothes', out: 'clothes', rate: 1900, in: { cotton: 3 } }] },
  steelmill: { name: 'Металургійний комбінат', icon: '🔥', setup: 150000, staff: 12, power: 8, zones: ['industry'], sizes: ['XL'], role: 'engineer', shape: 'steel',
    recipes: [{ id: 'steel', out: 'steel', rate: 2600, in: { ore: 2 } }] },
  refinery: { name: 'Хімічний завод', icon: '🧪', setup: 130000, staff: 8, power: 6, zones: ['industry'], sizes: ['L', 'XL'], role: 'engineer', shape: 'factory',
    recipes: [{ id: 'plastic', out: 'plastic', rate: 3150, in: { oil: 1 } }] },
  chipfab: { name: 'Завод мікросхем', icon: '💾', setup: 300000, staff: 14, power: 10, zones: ['industry'], sizes: ['XL'], role: 'engineer', shape: 'clean',
    recipes: [{ id: 'chips', out: 'chips', rate: 1300, in: { sand: 2, plastic: 0.2 } }] },
  elecplant: { name: 'Завод електроніки', icon: '📱', setup: 250000, staff: 16, power: 6, zones: ['industry'], sizes: ['XL'], role: 'engineer', shape: 'clean',
    recipes: [{ id: 'electronics', out: 'electronics', rate: 560, in: { chips: 1, plastic: 1, steel: 0.3 } }] },
  carplant: { name: 'Автозавод', icon: '🚗', setup: 600000, staff: 30, power: 15, zones: ['industry'], sizes: ['XL'], role: 'engineer', shape: 'carplant', recipes: [] },
  powerplant: { name: 'Електростанція', icon: '⚡', setup: 200000, staff: 6, power: 0, zones: ['industry'], sizes: ['L', 'XL'], role: 'engineer', shape: 'power',
    recipes: [{ id: 'power', out: 'power', rate: 150, in: { oil: 18 } }] },
  logistics: { name: 'Логістичний центр', icon: '🚚', setup: 80000, staff: 5, power: 1, zones: ['industry'], sizes: ['L', 'XL'], role: 'worker', shape: 'warehouse', recipes: [] },
  office: { name: 'IT-офіс / студія', icon: '💻', setup: 45000, staff: 0, power: 0, zones: ['retail'], sizes: ['M', 'L', 'XL'], role: 'dev', shape: 'office', recipes: [], maxStaffMult: 2 },
};

// ================= Автомобілі =================
const SEGMENTS = {
  economy: { name: 'Економ', base: 15000, demand: 0.35, size: 0.85, engines: ['i3', 'i4', 'ev'] },
  family: { name: 'Сімейний', base: 25000, demand: 0.3, size: 1, engines: ['i4', 'v6', 'ev'] },
  suv: { name: 'Кросовер', base: 33000, demand: 0.2, size: 1.2, engines: ['i4', 'v6', 'ev'] },
  sport: { name: 'Спорткар', base: 58000, demand: 0.08, size: 0.95, engines: ['v6', 'v8', 'ev'] },
  luxury: { name: 'Преміум', base: 72000, demand: 0.07, size: 1.15, engines: ['v6', 'v8', 'ev'] },
};
const ENGINES = {
  i3: { name: '3-циліндровий 1.0', hp: 90, cost: 1400, chips: 0, q: 0 },
  i4: { name: '4-циліндровий 1.8', hp: 145, cost: 2200, chips: 0, q: 4 },
  v6: { name: 'V6 3.0', hp: 260, cost: 4200, chips: 10, q: 8 },
  v8: { name: 'V8 4.4', hp: 430, cost: 7800, chips: 20, q: 12 },
  ev: { name: 'Електро 75 кВт·год', hp: 300, cost: 9000, chips: 160, q: 10 },
};
const MATERIALS = {
  steel: { name: 'Сталевий кузов', steel: 1, plastic: 1, extra: 0, weight: 1, q: 0 },
  alu: { name: 'Алюмінієвий', steel: 0.45, plastic: 1.2, extra: 2600, weight: 0.85, q: 5 },
  carbon: { name: 'Карбоновий', steel: 0.25, plastic: 1.8, extra: 9500, weight: 0.7, q: 10 },
};
const AUTO_RIVALS = 6;

// ================= IT-продукти =================
const SOFT = {
  app: { name: 'Мобільний застосунок', icon: '📱', work: 400, users: 22000, arpu: 0.02, growth: -0.006, cap: 1, tech: 0 },
  game: { name: "Комп'ютерна гра", icon: '🎮', work: 900, users: 55000, arpu: 0.045, growth: -0.014, cap: 1, tech: 0 },
  web: { name: 'Вебсервіс', icon: '🌐', work: 700, users: 9000, arpu: 0.06, growth: 0.01, cap: 3, tech: 0 },
  cloud: { name: 'Хмарний сервіс', icon: '☁️', work: 1600, users: 6000, arpu: 0.3, growth: 0.015, cap: 4, tech: 1 },
  engine: { name: 'Ігровий рушій (ліцензії)', icon: '🧩', work: 2400, users: 40, arpu: 25, growth: 0.004, cap: 3, tech: 2 },
  os: { name: 'Операційна система', icon: '🖥️', work: 4500, users: 250000, arpu: 0.012, growth: 0.006, cap: 3, tech: 3 },
};

// ================= Нерухомість =================
const PROP_KINDS = {
  apartment: { name: 'Квартира', icon: '🏢', yield: 0.06, live: true },
  house: { name: 'Будинок', icon: '🏡', yield: 0.045, live: true },
  office: { name: 'Офісний поверх', icon: '🏬', yield: 0.08 },
  mall: { name: 'Торговий центр', icon: '🛍️', yield: 0.095 },
  complex: { name: 'Житловий комплекс', icon: '🏘️', yield: 0.075 },
  bizcenter: { name: 'Бізнес-центр', icon: '🏙️', yield: 0.085 },
};
const CONSTRUCT = {
  complex: { name: 'Житловий комплекс', cost: 650000, days: 40, sizes: ['L', 'XL'] },
  mall: { name: 'Торговий центр', cost: 900000, days: 45, sizes: ['L', 'XL'] },
  bizcenter: { name: 'Бізнес-центр', cost: 1100000, days: 50, sizes: ['L', 'XL'] },
};

// ================= Особисте життя =================
const JOBS = {
  courier: { name: "Кур'єр", pay: 90, req: {}, skill: 'business' },
  barista: { name: 'Бариста', pay: 85, req: {}, skill: 'business' },
  cashier: { name: 'Продавець-консультант', pay: 95, req: {}, skill: 'business' },
  office: { name: 'Офіс-менеджер', pay: 135, req: { business: 2 }, skill: 'management' },
  dev: { name: 'Програміст', pay: 240, req: { coding: 3 }, skill: 'coding' },
  manager: { name: 'Менеджер проєктів', pay: 210, req: { management: 3 }, skill: 'management' },
  analyst: { name: 'Фінансовий аналітик', pay: 290, req: { business: 4, management: 2 }, skill: 'business' },
};
const SKILLS = { business: 'Бізнес', coding: 'Програмування', management: 'Менеджмент' };
const HOMES = {
  room: { name: 'Кімната в гуртожитку', rent: 14, food: 12 },
  flat: { name: 'Орендована квартира', rent: 38, food: 18 },
  loft: { name: 'Лофт у центрі', rent: 95, food: 30 },
  villa: { name: 'Вілла', rent: 260, food: 60 },
};
const AVATAR = {
  skin: ['#f6d3b3', '#e8b48c', '#c98f63', '#8d5a3b', '#5b3a26'],
  hair: ['#2b1d16', '#6b4423', '#c8a15a', '#b5442b', '#9aa0a8', '#1c1c1c'],
  shirt: ['#3f7fc4', '#2e9a5a', '#d2463c', '#7a5ac8', '#e08a3c', '#2b2f38'],
  style: ['short', 'long', 'bald', 'bun'],
};

// ================= Корпорація =================
const DEPTS = {
  hr: { name: 'Відділ кадрів', icon: '🧑‍💼', desc: '+мораль, −5% зарплат кандидатів, швидший ріст навичок' },
  accounting: { name: 'Бухгалтерія', icon: '🧮', desc: '−4% ефективного податку за рівень' },
  legal: { name: 'Юридичний відділ', icon: '⚖️', desc: '−20% ймовірності штрафів і менші штрафи' },
  rnd: { name: 'R&D', icon: '🔬', desc: '+12 очок досліджень на день за рівень' },
  marketing: { name: 'Маркетинг', icon: '📣', desc: '+3% відвідувачів усіх магазинів і користувачів IT' },
  sales: { name: 'Відділ продажів', icon: '🤝', desc: '+2,5% до цін B2B-продажів на ринку' },
};
const RESEARCH = {
  retail: { name: 'Роздрібна торгівля', icon: '🛒', desc: '+5% пропускної здатності магазинів' },
  industry: { name: 'Виробничі технології', icon: '🏭', desc: '+8% продуктивності заводів, −5% енергії' },
  auto: { name: 'Автомобілебудування', icon: '🚗', desc: '+5 якості нових моделей авто' },
  it: { name: 'Інформаційні технології', icon: '💻', desc: '+6 якості IT-продуктів, нові типи продуктів' },
};
const ROLES = { sales: 'Продавець', worker: 'Робітник', engineer: 'Інженер', dev: 'Програміст', manager: 'Менеджер' };

// ================= Компанії-конкуренти (пародійні назви) =================
// sector: тип роздрібу, який компанія відкриває в місті, або галузь.
const COMPANY_SEED = [
  ['Волмарк', 'WLMK', 'grocery'], ['Косткен Гоулсейл', 'CSTN', 'grocery'], ['АТВ-Маркет', 'ATVM', 'grocery'], ['Кроґерс', 'KRGS', 'grocery'],
  ['Старбокс Кава', 'SBXK', 'coffee'], ['Данкен Донатс', 'DNKN', 'coffee'], ['Тім Гордонс', 'TIMG', 'coffee'],
  ['МакДоннелс', 'MCDN', 'fastfood'], ['Бургер Кінґдом', 'BKDM', 'fastfood'], ['КФЧ Кура', 'KFCH', 'fastfood'], ['Сабвіл', 'SBWL', 'fastfood'],
  ['Зарра Групп', 'ZARA', 'fashion'], ['Ейч-енд-Ен', 'HNEN', 'fashion'], ['Юніклоу', 'UNKL', 'fashion'], ['Найко Спорт', 'NAYK', 'fashion'],
  ['Еппол Стор', 'APPL', 'electronics'], ['Самсонґ Електронікс', 'SMSG', 'electronics'], ['Бест Бей', 'BSTB', 'electronics'], ['Фокстрод', 'FXTD', 'electronics'],
  ['Флора Делюкс', 'FLRD', 'flowers'], ['Олів Гарден Клаб', 'OLVG', 'restaurant'], ['Ла Скала Груп', 'LSCL', 'restaurant'],
  ['Тойода Моторс', 'TYDA', 'dealership'], ['Фолькскар', 'VLKC', 'dealership'], ['Теслар', 'TSLR', 'dealership'], ['Форт Моторс', 'FORT', 'dealership'], ['Хюндао', 'HYND', 'dealership'], ['БМК Баварія', 'BMKB', 'dealership'],
  ['Макрософтіс', 'MCRS', 'tech'], ['Ґуґлер', 'GGLR', 'tech'], ['Амазонія', 'AMZN', 'tech'], ['Нвідіо', 'NVDO', 'tech'], ['Метаверс Інк', 'MTVS', 'tech'], ['Епік Гейминг', 'EPIC', 'tech'],
  ['Джей-Ті Морґан', 'JTMG', 'bank'], ['Ґолдбрідж Сакс', 'GLDB', 'bank'], ['ПриваБанк', 'PRVB', 'bank'],
  ['Ексо-Мобіл', 'EXOM', 'oil'], ['Шелф Ойл', 'SHLF', 'oil'], ['Нафтоґазенерго', 'NFTG', 'oil'],
  ['Арселон Стіл', 'ARCS', 'steel'], ['Метинвестал', 'MTVL', 'steel'], ['Юнайтед Стіл', 'USTL', 'steel'],
  ['Дженерал Енерджі', 'GENE', 'energy'], ['ДТЕК-Пауер', 'DTKP', 'energy'],
  ['Маерскен Лайн', 'MRSK', 'logistics'], ['Нова Пошта Експрес', 'NPEX', 'logistics'], ['ФедЕкспо', 'FDEX', 'logistics'],
];
const SECTORS = {
  grocery: { name: 'Продуктовий ритейл', rev: 90000, margin: 0.04, pe: 18 },
  coffee: { name: "Кав'ярні", rev: 40000, margin: 0.1, pe: 24 },
  fastfood: { name: 'Фастфуд', rev: 60000, margin: 0.12, pe: 22 },
  fashion: { name: 'Одяг', rev: 50000, margin: 0.1, pe: 20 },
  electronics: { name: 'Електроніка', rev: 120000, margin: 0.14, pe: 25 },
  flowers: { name: 'Квіти', rev: 8000, margin: 0.08, pe: 14 },
  restaurant: { name: 'Ресторани', rev: 25000, margin: 0.07, pe: 18 },
  dealership: { name: 'Автовиробники', rev: 300000, margin: 0.07, pe: 12 },
  tech: { name: 'Технології', rev: 250000, margin: 0.22, pe: 30 },
  bank: { name: 'Банки', rev: 150000, margin: 0.25, pe: 11 },
  oil: { name: 'Нафта і газ', rev: 280000, margin: 0.12, pe: 10 },
  steel: { name: 'Металургія', rev: 120000, margin: 0.08, pe: 9 },
  energy: { name: 'Енергетика', rev: 100000, margin: 0.11, pe: 13 },
  logistics: { name: 'Логістика', rev: 90000, margin: 0.07, pe: 15 },
};
const RESERVE_NAMES = ['Нью Вейв Фудс', 'Тріумф Холдинг', 'Альфа Капітал', 'Зенит Індастріз', 'Оріон Технолоджис', 'Прайм Ритейл', 'Глобал Транс', 'Віста Енерджі', 'Кварц Електронікс', 'Аврора Моторс', 'Сігма Софт', 'Атлас Метал'];

const FIRST = ['Олена', 'Андрій', 'Марія', 'Тарас', 'Ірина', 'Богдан', 'Софія', 'Дмитро', 'Наталія', 'Олег', 'Юлія', 'Максим', 'Катерина', 'Ігор', 'Оксана', 'Віктор', 'Анна', 'Роман', 'Христина', 'Степан', 'Дарина', 'Назар', 'Леся', 'Артем', 'Емілі', 'Джон', 'Сара', 'Майкл', 'Лукас', 'Ганна'];
const LAST = ['Коваленко', 'Шевчук', 'Бондар', 'Мельник', 'Ткачук', 'Кравець', 'Олійник', 'Лисенко', 'Гнатюк', 'Савчук', 'Петренко', 'Мороз', 'Поліщук', 'Романюк', 'Зінченко', 'Литвин', 'Міллер', 'Шмідт', 'Джонсон', 'Нгуєн'];

// ================= Бухгалтерія =================
// kind: inc — дохід, exp — витрата у звіті про прибутки; cash — лише рух грошей (капвкладення, кредити, закупівлі).
const LEDGER = {
  sales: { name: 'Роздрібні продажі', kind: 'inc' },
  b2b: { name: 'Продажі на ринку (B2B)', kind: 'inc' },
  software: { name: 'IT-продукти', kind: 'inc' },
  rentInc: { name: 'Орендний дохід', kind: 'inc' },
  power: { name: 'Продаж електроенергії', kind: 'inc' },
  salary: { name: 'Зарплата (особиста)', kind: 'inc' },
  dividends: { name: 'Дивіденди', kind: 'inc' },
  subsidiary: { name: 'Прибуток дочірніх компаній', kind: 'inc' },
  interestInc: { name: 'Відсотки на рахунку', kind: 'inc' },
  purchases: { name: 'Закупівлі товарів і сировини', kind: 'exp' },
  wages: { name: 'Зарплати персоналу', kind: 'exp' },
  rent: { name: 'Оренда приміщень', kind: 'exp' },
  marketing: { name: 'Маркетинг', kind: 'exp' },
  utilities: { name: 'Електроенергія', kind: 'exp' },
  maint: { name: 'Обслуговування і ремонти', kind: 'exp' },
  transport: { name: 'Логістика', kind: 'exp' },
  depts: { name: 'Корпоративні відділи', kind: 'exp' },
  components: { name: 'Комплектуючі (авто)', kind: 'exp' },
  interest: { name: 'Відсотки за кредитами', kind: 'exp' },
  living: { name: 'Особисті витрати', kind: 'exp' },
  fines: { name: 'Штрафи', kind: 'exp' },
  tax: { name: 'Податки', kind: 'exp' },
  capex: { name: 'Капітальні вкладення', kind: 'cash' },
  propTrade: { name: 'Купівля/продаж нерухомості', kind: 'cash' },
  shares: { name: 'Операції з акціями', kind: 'cash' },
  loans: { name: 'Кредити (отримано/погашено)', kind: 'cash' },
  equity: { name: 'Залучений капітал (IPO)', kind: 'cash' },
  admin: { name: 'Адмін-коригування', kind: 'cash' },
  assetSale: { name: 'Продаж активів', kind: 'cash' },
};

// ================= Стан =================
let state = null;
const SAVE_KEY = 'bizimperia_save_v2';
const HOOKS = { hour: [], day: [], morning: [] };

function book(cat, amt) {
  if (!amt) return;
  state.cash += amt;
  const L = state.led;
  L[cat] = (L[cat] || 0) + amt;
}
function log(msg, kind = '') {
  if (!state) return;
  state.log.unshift({ day: state.day, hour: state.hour, msg, kind });
  if (state.log.length > 120) state.log.length = 120;
}
function news(text, cat = 'econ', kind = '') {
  if (!state) return;
  state.news.unshift({ day: state.day, cat, text, kind });
  if (state.news.length > 150) state.news.length = 150;
}
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* сховище недоступне */ } }
function loadSave() {
  try { const s = localStorage.getItem(SAVE_KEY); if (s) { state = JSON.parse(s); return true; } } catch (e) { /* ignore */ }
  return false;
}
