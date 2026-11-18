'use strict';
/* БІЗНЕС ІМПЕРІЯ — «Живий світ»: щодня одна помітна подія з реальними наслідками
   (зміни попиту на формати, ціни сировини, інфляційні шоки, рішення ЦБ, рецесії й кризи, банкрутства,
   поява нових конкурентів, корпоративні новини, що рухають біржу, настрої споживачів, перебої постачання).
   Плюс біржовий індекс BIZ-50 для головної сторінки. Доповнює наявні випадкові події, не замінює їх. */

const NEW_CO_NAMES = ['Нова Хвиля', 'Ікар Ритейл', 'Полярис Груп', 'Вектор Трейд', 'Сонячна Долина', 'Орбіта Маркет', 'Глорія Холдинг', 'Дельта Фудс', 'Кварта', 'Акорд Стор', 'Меридіан', 'Цитадель Брендс', 'Фенікс Ритейл', 'Атлант Сіті', 'Бриз Кафе', 'Нео Електро'];

function liveState() {
  if (!state.live) state.live = { today: null, hist: [], idx: [], base: 0, cd: {} };
  return state.live;
}
const capTotal = () => sum(aliveCos(), (c) => c.price * c.shares);
/** BIZ-50: середня зміна ціни 50 найбільших компаній від дня їхньої появи в індексі. */
function bizIndex() {
  const top = aliveCos().sort((a, b) => b.price * b.shares - a.price * a.shares).slice(0, 50);
  for (const c of top) if (!c.p0) c.p0 = c.price;
  return top.length ? sum(top, (c) => c.price / c.p0) / top.length * 1000 : 1000;
}
function liveEvent(icon, title, text, kind, effect) {
  const L = liveState();
  L.today = { day: state.day, icon, title, text, kind, effect };
  L.hist.unshift(L.today); if (L.hist.length > 60) L.hist.length = 60;
  news(`${icon} ${title}: ${text}`, 'world', kind, kind === 'bad' && /криз|рецес|обвал|банкрут/i.test(title));
}
const retailTypes = () => Object.keys(TYPES).filter((t) => !TYPES[t].dynamic);

const LIVE_EVENTS = {
  demand: { w: 5, cd: 2, run() {
    const t = pick(retailTypes()), up = chance(0.5), m = +(up ? rnd(1.12, 1.35) : rnd(0.72, 0.9)).toFixed(2), days = ri(5, 14);
    state.mods.push({ kind: 'demand', key: t, mult: m, days, label: `${up ? '📈' : '📉'} Попит: ${TYPES[t].name} ×${m}` });
    for (const co of aliveCos().filter((c) => c.sector === t)) co.price *= up ? 1.03 : 0.97;
    liveEvent(up ? '📈' : '📉', `${up ? 'Зростання' : 'Падіння'} попиту`, `${TYPES[t].name}: ${up ? '+' : '−'}${Math.round(Math.abs(m - 1) * 100)}% покупців на ${days} дн. ${up ? 'Модний тренд у соцмережах.' : 'Покупці перейшли на альтернативи.'}`, up ? 'good' : 'bad', `попит ${TYPES[t].name} ×${m}, ${days} дн.`);
  } },
  commodity: { w: 4, cd: 3, run() {
    const g = pick(Object.keys(GOODS)), up = chance(0.55), m = up ? rnd(1.18, 1.5) : rnd(0.7, 0.86);
    state.market[g].mult = clamp(state.market[g].mult * m, 0.35, 3);
    liveEvent(up ? '⛽' : '📦', up ? 'Стрибок цін на ринку' : 'Обвал цін на ринку', `${GOODS[g].name}: ${up ? '+' : '−'}${Math.round(Math.abs(m - 1) * 100)}% до ціни (${up ? 'дефіцит постачання' : 'надлишок на складах'}).`, '', `ціна ${GOODS[g].name} ×${m.toFixed(2)}`);
  } },
  inflation: { w: 2, cd: 20, run() {
    const e = state.econ, d = rnd(1.2, 3);
    e.inflation = +(e.inflation + d).toFixed(1); e.priceLevel *= 1 + d / 200;
    liveEvent('💸', 'Інфляційний шок', `Ціни за місяць зросли швидше за прогноз: інфляція ${e.inflation.toFixed(1)}%. Зарплати й закупівлі дорожчають.`, 'bad', `інфляція +${d.toFixed(1)} п.п.`);
  } },
  rate: { w: 2, cd: 14, run() {
    const e = state.econ, up = e.inflation > 7 ? chance(0.7) : e.inflation < 3 ? chance(0.25) : chance(0.45), d = +rnd(0.5, 1.5).toFixed(2);
    e.rate = clamp(+(e.rate + (up ? d : -d)).toFixed(2), 0.25, 30);
    for (const co of aliveCos()) co.price *= up ? 0.985 : 1.015;
    liveEvent('🏦', up ? 'ЦБ підвищив ставку' : 'ЦБ знизив ставку', `Облікова ставка ${up ? 'зросла' : 'знизилась'} на ${d} п.п. до ${e.rate.toFixed(2)}%. Кредити ${up ? 'дорожчають' : 'дешевшають'}, біржа ${up ? 'падає' : 'росте'}.`, up ? 'bad' : 'good', `ставка ${up ? '+' : '−'}${d} п.п.`);
  } },
  recession: { w: 0.6, cd: 260, ok: () => ['growth', 'boom'].includes(state.econ.phase) && state.econ.phaseDays > 20, run() {
    const e = state.econ; e.phase = 'recession'; e.phaseDays = ri(30, 60); e.demand *= 0.96;
    for (const co of aliveCos()) co.price *= rnd(0.88, 0.96);
    liveEvent('🌧️', 'Початок рецесії', 'Ділова активність падає, споживачі економлять. Попит знижується на 1–3 місяці; держава може запустити субсидії.', 'bad', 'фаза: рецесія');
  } },
  crisis: { w: 0.4, cd: 500, ok: () => state.econ.phase !== 'crisis' && state.day > 120, run() {
    const e = state.econ; e.phase = 'crisis'; e.phaseDays = ri(25, 45); e.demand *= 0.9; e.unemployment += 3;
    for (const co of aliveCos()) co.price *= rnd(0.7, 0.85);
    if (state.ipo) state.ipo.price *= 0.8;
    liveEvent('🔥', 'Фінансова криза', 'Обвал ринків: біржа −15–30%, банки обмежують кредитування, безробіття зростає. Тримайте запас готівки.', 'bad', 'фаза: криза, біржа −20%');
  } },
  sector: { w: 3, cd: 4, run() {
    const secs = [...new Set(aliveCos().map((c) => c.sector))], s = pick(secs), up = chance(0.6), m = up ? rnd(1.06, 1.15) : rnd(0.86, 0.95);
    for (const co of aliveCos().filter((c) => c.sector === s)) co.price *= m;
    if (TYPES[s]) state.mods.push({ kind: 'demand', key: s, mult: up ? 1.08 : 0.93, days: 7, label: `${up ? '🚀' : '🔻'} ${SECTORS[s].name}` });
    liveEvent(up ? '🚀' : '🔻', `${SECTORS[s].name}: ${up ? 'ралі' : 'розпродаж'} акцій`, up ? 'Аналітики підвищили прогнози галузі після сильної звітності лідерів.' : 'Слабкі прогнози й регуляторні ризики тиснуть на галузь.', up ? 'good' : 'bad', `акції сектору ×${m.toFixed(2)}`);
  } },
  earnings: { w: 3, cd: 1, run() {
    const co = pick(aliveCos().filter((c) => !isSub(c))); if (!co) return false;
    const up = chance(0.55), m = up ? rnd(1.08, 1.2) : rnd(0.82, 0.93);
    co.price *= m;
    liveEvent(up ? '📊' : '⚠️', `«${co.name}»: ${up ? 'прибуток вище прогнозу' : 'попередження про прибуток'}`, `Акції ${co.ticker} ${up ? '+' : '−'}${Math.round(Math.abs(m - 1) * 100)}%.`, '', `${co.ticker} ×${m.toFixed(2)}`);
  } },
  bankrupt: { w: 2, cd: 15, run() {
    const weak = aliveCos().filter((c) => !isSub(c) && (c.cash < 0 || c.ema < 0)).sort((a, b) => a.cash - b.cash)[0];
    if (!weak) return false;
    const name = weak.name;
    bankruptCompany(weak);
    liveEvent('💥', 'Банкрутство', `«${name}» не змогла обслуговувати борги й оголосила банкрутство. Її точки звільняються, клієнти шукають нових постачальників.`, 'bad', 'компанія зникла з ринку');
  } },
  newcomer: { w: 2, cd: 12, run() {
    const t = pick(retailTypes()), used = new Set(state.companies.map((c) => c.name));
    const name = pick(NEW_CO_NAMES.filter((n) => !used.has(n))) || `${pick(NEW_CO_NAMES)} ${ri(2, 9)}`;
    const co = addCompany(name, (name.replace(/[^А-ЯA-ZІЇЄҐ]/g, '') + 'XX').slice(0, 3) + ri(1, 9), t);
    co.scale = rnd(0.3, 0.8); co.cash *= 1.5;
    let n = 0;
    for (const cid of Object.keys(state.unlocked || {})) {
      const free = state.lots.filter((l) => lotCityId(l) === cid && !l.owner && !l.npc && DMAP[l.district].zone === 'retail' && !(TYPES[t].minSize && SIZE_ORDER.indexOf(l.size) < SIZE_ORDER.indexOf(TYPES[t].minSize)));
      for (const l of free.sort(() => Math.random() - 0.5).slice(0, ri(1, 3))) { l.npc = { co: co.id, type: t }; n++; }
    }
    liveEvent('🆕', 'Новий конкурент', `На ринок формату «${TYPES[t].name}» виходить «${name}»: ${n} нових точок у ваших містах. Конкуренція посилюється.`, 'bad', `+${n} точок конкурента`);
  } },
  mood: { w: 3, cd: 3, run() {
    const up = chance(0.5), m = up ? 1.1 : 0.9, days = ri(3, 7);
    state.mods.push({ kind: 'traffic', key: '*', mult: m, days, label: up ? '😊 Оптимізм споживачів' : '😟 Песимізм споживачів' });
    liveEvent(up ? '😊' : '😟', up ? 'Зростання довіри споживачів' : 'Падіння довіри споживачів', `Опитування: покупці ${up ? 'готові більше витрачати' : 'відкладають покупки'}. Потік покупців ${up ? '+' : '−'}10% на ${days} дн.`, up ? 'good' : 'bad', `покупці ×${m}, ${days} дн.`);
  } },
  supply: { w: 2, cd: 10, run() {
    const days = ri(5, 12);
    state.mods.push({ kind: 'wholesale', key: null, mult: 1.1, days, label: '🚢 Перебої постачання' });
    liveEvent('🚢', 'Перебої в ланцюгах постачання', `Затори в портах і нестача контейнерів: оптові ціни +10% на ${days} дн.`, 'bad', `опт ×1.1, ${days} дн.`);
  } },
};

function liveDaily() {
  const L = liveState();
  const v = bizIndex(); L.idx.push({ d: state.day, v: +v.toFixed(1) }); if (L.idx.length > 400) L.idx.shift();
  const pool = Object.entries(LIVE_EVENTS).filter(([k, E]) => (L.cd[k] || 0) <= state.day && (!E.ok || E.ok()));
  for (let tries = 0; tries < 4 && pool.length; tries++) {
    const tot = sum(pool, ([, E]) => E.w); let r = Math.random() * tot, pickK = pool[0][0];
    for (const [k, E] of pool) { r -= E.w; if (r <= 0) { pickK = k; break; } }
    const E = LIVE_EVENTS[pickK];
    if (E.run() !== false) { L.cd[pickK] = state.day + E.cd; break; }
    pool.splice(pool.findIndex(([k]) => k === pickK), 1);
  }
}

HOOKS.day.push(liveDaily);
