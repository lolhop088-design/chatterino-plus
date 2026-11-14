'use strict';
/* БІЗНЕС ІМПЕРІЯ — світова економіка (етап 2):
   сировинні ринки (нафта, газ, метали, зерно) з дефіцитами, валюти міст, мита й торгові війни,
   рівні складності. Підключається до ядра через функції-множники, які викликає sim.js. */

const DIFFICULTY = {
  easy: { name: 'Підприємець', cash: 10000, strict: 0.5, crisis: 0.6, rate: -1, bankrupt: 30000, desc: 'Помірна складність: м’якший регулятор, рідші кризи, більше стартових грошей.' },
  normal: { name: 'Магнат', cash: 4000, strict: 1, crisis: 1, rate: 0, bankrupt: 15000, desc: 'Реалістична економіка й конкуренція.' },
  hard: { name: 'Hardcore', cash: 4000, strict: 1.6, crisis: 1.7, rate: 2, bankrupt: 5000, desc: 'Жорсткий регулятор, часті кризи, дорожчі кредити, швидке банкрутство.' },
  sandbox: { name: 'Sandbox', cash: 1000000, strict: 0, crisis: 1, rate: 0, bankrupt: 1e12, desc: 'Вільна гра: $1 млн, регулятор вимкнено, без банкрутства.' },
};
const diff = () => DIFFICULTY[(state && state.difficulty) || 'normal'] || DIFFICULTY.normal;

// ---------- Валюти ----------
const CURRENCY_OF = { kyiv: 'UAH', lviv: 'UAH', odesa: 'UAH', warsaw: 'PLN', berlin: 'EUR', london: 'GBP', dubai: 'AED', newyork: 'USD', tokyo: 'JPY' };
const FX_BASE = { USD: 1, UAH: 41, PLN: 4.0, EUR: 0.92, GBP: 0.79, AED: 3.67, JPY: 150 };
/** Відхилення інфляції валюти від долара (річне) і волатильність. */
const FX_PROFILE = { USD: [0, 0], UAH: [0.05, 0.006], PLN: [0.015, 0.004], EUR: [0, 0.003], GBP: [0.005, 0.0035], AED: [0, 0.0005], JPY: [-0.01, 0.004] };
const EM = { UAH: 1, PLN: 0.5 }; // ринки, що слабшають у кризу

// ---------- Сировина ----------
const COMMODITIES = {
  oil: { name: 'Нафта', icon: '🛢️', unit: '$/барель', base: 80, vol: 0.018 },
  gas: { name: 'Природний газ', icon: '🔥', unit: '$/МВт·год', base: 35, vol: 0.025 },
  metal: { name: 'Метали', icon: '🔩', unit: 'індекс', base: 100, vol: 0.012 },
  grain: { name: 'Зерно', icon: '🌾', unit: '$/т', base: 220, vol: 0.01 },
};
/** Чутливість товарів B2B-ринку до світових цін сировини. */
const COMMOD_LINKS = {
  oil: { oil: 1 }, plastic: { oil: 0.5 }, ore: { metal: 1 }, steel: { metal: 0.7 }, chips: { metal: 0.25 },
  grain: { grain: 1 }, veg: { grain: 0.6 }, milk: { grain: 0.5 }, cotton: { grain: 0.6 }, bread: { grain: 0.5 }, dairy: { grain: 0.35 }, clothes: { grain: 0.15 },
};

function worldState() {
  if (!state.world) state.world = { fx: { ...FX_BASE }, commod: { oil: 1, gas: 1, metal: 1, grain: 1 }, shocks: [], tariffs: {}, wars: [], hist: [] };
  return state.world;
}
const fxOf = (cid) => { const cur = CURRENCY_OF[cid] || 'USD'; return worldState().fx[cur] || FX_BASE[cur]; };
/** Ціни міста в доларах: слабша місцева валюта — дешевші оренда й товари (і менша виручка в $). */
function fxPriceFactor(cid) { const cur = CURRENCY_OF[cid] || 'USD'; return Math.pow(FX_BASE[cur] / fxOf(cid), 0.6); }
/** Імпорт у місті: слабша валюта й мита роблять імпорт дорожчим. */
function importFactor(cid) {
  const cur = CURRENCY_OF[cid] || 'USD';
  const t = worldState().tariffs[REGION_OF[cid]] || 0;
  return (fxOf(cid) / FX_BASE[cur]) * (1 + t);
}
function commodFactor(g) {
  const L = COMMOD_LINKS[g]; if (!L || !state.world) return 1;
  let f = 1; for (const [c, w] of Object.entries(L)) f *= Math.pow(state.world.commod[c], w);
  return f;
}
const commodPrice = (c) => COMMODITIES[c].base * worldState().commod[c] * state.econ.priceLevel;
const electricityIndex = () => { const C = worldState().commod; return 0.5 * C.gas + 0.3 * C.oil + 0.2; };

const SHOCKS = [
  { c: 'oil', mult: 1.6, text: '🛢️ Дефіцит нафти: OPEC скорочує видобуток — ціни злітають.' },
  { c: 'oil', mult: 0.65, text: '🛢️ Надлишок нафти на ринку — ціни обвалилися.' },
  { c: 'gas', mult: 1.8, text: '🔥 Газова криза: перебої з постачанням, електроенергія дорожчає.' },
  { c: 'metal', mult: 1.5, text: '🔩 Дефіцит металів: страйки на копальнях.' },
  { c: 'grain', mult: 1.5, text: '🌾 Посуха: неврожай зерна, продукти дорожчають.' },
  { c: 'grain', mult: 0.75, text: '🌾 Рекордний урожай — ціни на зерно падають.' },
];

function worldDaily() {
  const W = worldState(), e = state.econ, crisis = e.phase === 'crisis' ? 1 : e.phase === 'recession' ? 0.4 : 0;
  // Валюти
  for (const cur of Object.keys(FX_BASE)) {
    if (cur === 'USD') continue;
    const [drift, vol] = FX_PROFILE[cur];
    W.fx[cur] *= Math.exp(gauss() * vol + (drift + (e.inflation / 100) * 0.2 + crisis * (EM[cur] || 0) * 0.15) / 365);
    W.fx[cur] = clamp(W.fx[cur], FX_BASE[cur] * 0.5, FX_BASE[cur] * 3);
  }
  e.fx = W.fx.UAH;
  // Сировина: повернення до тренду + шоки
  const demand = e.demand;
  for (const [c, C] of Object.entries(COMMODITIES)) {
    const shock = W.shocks.filter((s) => s.c === c).reduce((m, s) => m * s.mult, 1);
    const target = shock * (0.85 + 0.15 * demand);
    W.commod[c] = clamp(W.commod[c] * Math.exp(gauss() * C.vol) + (target - W.commod[c]) * 0.04, 0.3, 4);
  }
  W.shocks = W.shocks.filter((s) => --s.days > 0);
  if (chance(0.006 * diff().crisis)) { const s = pick(SHOCKS); W.shocks.push({ c: s.c, mult: s.mult, days: ri(20, 50) }); news(s.text, 'market', s.mult > 1 ? 'bad' : 'good'); }
  // Нафта й газ розганяють інфляцію
  e.inflation += ((W.commod.oil - 1) * 0.6 + (W.commod.gas - 1) * 0.3) * 0.02;
  // Торгові війни: мита між регіонами
  W.wars = W.wars.filter((w) => {
    if (--w.days > 0) return true;
    for (const r of w.regions) W.tariffs[r] = Math.max(0, (W.tariffs[r] || 0) - w.rate);
    news(`🕊️ Торгова війна ${w.regions.join(' — ')} завершилась, мита скасовано.`, 'econ', 'good');
    return false;
  });
  if (chance(0.004 * diff().crisis)) {
    const regions = [...new Set(Object.values(REGION_OF))];
    const a = pick(regions); let b = pick(regions); if (a === b) b = regions[(regions.indexOf(a) + 1) % regions.length];
    const rate = +rnd(0.1, 0.35).toFixed(2);
    W.wars.push({ regions: [a, b], rate, days: ri(60, 150) });
    for (const r of [a, b]) W.tariffs[r] = (W.tariffs[r] || 0) + rate;
    news(`⚔️ Торгова війна: ${a} і ${b} запроваджують мита ${Math.round(rate * 100)}% на імпорт. Електроніка й одяг дорожчають.`, 'econ', 'bad');
  }
  W.hist.push({ day: state.day, oil: W.commod.oil, gas: W.commod.gas, metal: W.commod.metal, grain: W.commod.grain, UAH: W.fx.UAH, EUR: W.fx.EUR });
  if (W.hist.length > 180) W.hist.shift();
}
