'use strict';
/* БІЗНЕС ІМПЕРІЯ — наука й технології (Ultimate 3.0, етап 6, частина 1).
   Дерево технологій із передумовами (очки досліджень + гроші + час) і реальними ефектами на продуктивність;
   дослідницькі центри в містах (кадри), патенти й ліцензії ІІ-компаніям, порушення патентів;
   власні смартфони (на власних процесорах і ОС); технологічна гонка ІІ-компаній. */

const TECHS = {
  automation: { name: 'Роботизація складів і кас', icon: '🤖', pts: 400, cost: 2e6, days: 30, req: [], fx: { retail: 0.08 }, sector: 'grocery', desc: '+8% пропускної здатності магазинів' },
  robotics: { name: 'Промислова робототехніка', icon: '🦾', pts: 900, cost: 6e6, days: 45, req: ['automation'], fx: { factory: 0.12 }, sector: 'steel', desc: '+12% продуктивності заводів' },
  cloud: { name: 'Хмарна інфраструктура', icon: '☁️', pts: 700, cost: 4e6, days: 40, req: [], fx: { it: 0.1, telecom: 4 }, sector: 'tech', desc: '+10% продуктивності програмістів, +4 якості телекому' },
  ai: { name: 'Штучний інтелект', icon: '🧠', pts: 2000, cost: 15e6, days: 60, req: ['cloud'], fx: { it: 0.2, div: 5, research: 0.15 }, sector: 'tech', desc: '+20% IT, +5 якості всіх підрозділів, +15% очок досліджень' },
  chips: { name: 'Власні процесори', icon: '🔬', pts: 2500, cost: 25e6, days: 75, req: ['robotics'], fx: { chipfab: 0.25 }, sector: 'electronics', desc: '+25% випуску заводів мікросхем; потрібні для смартфона' },
  os: { name: 'Власна операційна система', icon: '🖥️', pts: 1800, cost: 10e6, days: 60, req: ['ai'], fx: { it: 0.05, phone: 10 }, sector: 'tech', desc: '+10 якості смартфонів, +5% IT' },
  smartphone: { name: 'Платформа смартфонів', icon: '📱', pts: 1500, cost: 12e6, days: 45, req: ['chips'], fx: { phoneUnlock: 1 }, sector: 'electronics', desc: 'Відкриває випуск власних смартфонів' },
  green: { name: 'Зелена енергетика', icon: '🌱', pts: 1000, cost: 8e6, days: 50, req: [], fx: { power: 0.3, energyUse: 0.1 }, sector: 'energy', desc: '+30% виробітку електростанцій, −10% споживання енергії' },
  batteries: { name: 'Батареї нового покоління', icon: '🔋', pts: 1600, cost: 12e6, days: 60, req: ['green'], fx: { ev: 10 }, sector: 'dealership', desc: '+10 якості електромобілів' },
  biotech: { name: 'Біотехнології', icon: '🧬', pts: 1800, cost: 14e6, days: 60, req: ['ai'], fx: { drug: 0.08 }, sector: 'pharma', desc: '+8% шансу успіху клінічних випробувань' },
  reusable: { name: 'Багаторазові ракети', icon: '🚀', pts: 3000, cost: 40e6, days: 90, req: ['robotics'], fx: { launch: 0.5, rel: 0.1 }, sector: 'space', desc: '−50% вартості запуску, +10% надійності' },
  quantum: { name: 'Квантові обчислення', icon: '⚛️', pts: 6000, cost: 80e6, days: 120, req: ['ai', 'chips'], fx: { research: 0.3, it: 0.15 }, sector: 'tech', desc: '+30% очок досліджень, +15% IT' },
};
const LAB_CITIES = { tokyo: 1.3, berlin: 1.2, newyork: 1.25, london: 1.15, kyiv: 1.1, lviv: 1.05 };

function sciState() {
  if (state.sci) return state.sci;
  state.sci = { done: {}, active: null, labs: [], patents: [], phones: [], aiTech: {}, seq: 1 };
  return state.sci;
}
/** Сумарний ефект технологій гравця. */
function sciFx(key) { if (!state.sci) return 0; let v = 0; for (const k of Object.keys(state.sci.done)) v += (TECHS[k].fx[key] || 0); return v; }
const hasTech = (k) => !!(state.sci && state.sci.done[k]);
const techAvail = (k) => !hasTech(k) && TECHS[k].req.every(hasTech);

function startTech(k) {
  const S = sciState(), T = TECHS[k];
  if (!techAvail(k)) return toast('Спершу потрібні попередні технології.', 'bad');
  if (S.active) return toast('Уже йде велике дослідження.', 'bad');
  const cost = Math.round(T.cost * priceLvl());
  if (state.tech.points < T.pts) return toast(`Потрібно ${T.pts} очок досліджень.`, 'bad');
  if (state.cash < cost) return toast(`Потрібно ${moneyK(cost)}.`, 'bad');
  state.tech.points -= T.pts; book('divCost', -cost);
  S.active = { k, left: Math.ceil(T.days / labSpeed()) };
  log(`🔬 Почато дослідження «${T.name}» (≈${S.active.left} дн.).`);
}
const labSpeed = () => 1 + sum(sciState().labs, (l) => l.level * 0.15 * (LAB_CITIES[l.city] || 1));
const LAB_COST = 5e6;
function buildLab(cid) {
  const S = sciState();
  if (!state.unlocked[cid]) return toast('Спершу відкрийте цей ринок.', 'bad');
  const ex = S.labs.find((l) => l.city === cid);
  const cost = Math.round(LAB_COST * priceLvl() * (ex ? ex.level + 1 : 1));
  if (ex && ex.level >= 5) return toast('Максимальний рівень.', 'bad');
  if (state.cash < cost) return toast(`Потрібно ${moneyK(cost)}.`, 'bad');
  book('capex', -cost);
  if (ex) ex.level++; else S.labs.push({ city: cid, level: 1, since: state.day });
  log(`🏛️ Дослідницький центр у місті ${CITIES[cid].name}: рівень ${ex ? ex.level : 1}.`, 'good');
}
const labUpkeep = (l) => 12000 * l.level * CITIES[l.city].wage * state.econ.wageLevel;
const labPoints = (l) => 18 * l.level * (LAB_CITIES[l.city] || 1);

// ---------- Патенти й ліцензії ----------
function licensePatent(pid, coId) {
  const S = sciState(), p = S.patents.find((x) => x.id === pid), co = coById(coId);
  if (!p || !co || p.licensees.includes(coId)) return;
  const p0 = clamp(0.4 + (co.strat === 'innovator' ? -0.2 : 0.1) - (co.rivalry || 0) * 0.5 + (isAlly && isAlly(coId) ? 0.3 : 0), 0.05, 0.95);
  if (!chance(p0)) return log(`📜 «${co.name}» відмовилась від ліцензії на «${TECHS[p.tech].name}».`, 'bad');
  p.licensees.push(coId); co.tech = (co.tech || 0) + 1;
  log(`📜 «${co.name}» купила ліцензію на «${TECHS[p.tech].name}»: роялті ${money(royalty(co))}/день.`, 'good');
}
const royalty = (co) => SECTORS[co.sector].rev * co.scale * 0.015 * priceLvl();

// ---------- Смартфони ----------
const PHONE_TIERS = { budget: { name: 'Бюджетний', price: 180, cost: 120, demand: 1 }, mid: { name: 'Середній клас', price: 450, cost: 290, demand: 0.6 }, flagship: { name: 'Флагман', price: 1100, cost: 620, demand: 0.25 } };
function launchPhone(tier, name) {
  const S = sciState(); if (!hasTech('smartphone')) return toast('Потрібна технологія «Платформа смартфонів».', 'bad');
  const cost = Math.round(15e6 * priceLvl()); if (state.cash < cost) return toast(`Розробка й запуск: ${moneyK(cost)}.`, 'bad');
  book('capex', -cost);
  const q = clamp(45 + sciFx('phone') + state.tech.it * 3 + (hasTech('chips') ? 8 : 0) + (state.fac.some((f) => f.kind === 'elecplant') ? 5 : 0) + rnd(-6, 6), 10, 100);
  S.phones.push({ id: 'ph' + (S.seq++), name: name || `${state.company.split(' ')[0]} ${pick(['One', 'Pro', 'X', 'Air', 'Neo'])} ${ri(1, 9)}`, tier, q: Math.round(q), since: state.day, sold: 0, mkt: 1, y: null });
  news(`📱 ${state.company} представляє смартфон «${S.phones[S.phones.length - 1].name}» (${PHONE_TIERS[tier].name}).`, 'tech', 'good', true);
}
function phoneDaily(p) {
  const T = PHONE_TIERS[p.tier];
  const age = state.day - p.since, fade = Math.max(0.15, 1 - age / 540);
  const rivals = aliveCos().filter((c) => c.sector === 'electronics' && !isSub(c));
  const comp = sum(rivals, (c) => coStrength(c)) * 0.8;
  const a = Math.pow(p.q / 60, 2) * (1 + 0.3 * p.mkt) * (state.media ? 0.85 + 0.3 * state.media.corpRep / 100 : 1);
  const share = a / (a + comp);
  const units = 9000 * T.demand * state.econ.demand * share * fade * Object.keys(state.unlocked || { x: 1 }).length;
  // власна електроніка зі складу здешевлює виробництво
  const own = typeof whQty === 'function' ? Math.min(whQty('electronics'), units * 3) : 0;
  if (own > 0) whTake('electronics', own);
  const unitCost = T.cost * priceLvl() * (1 - Math.min(0.25, own / Math.max(1, units * 3) * 0.25));
  const rev = units * T.price * priceLvl(), cost = units * unitCost + 15000 * p.mkt * priceLvl();
  book('divRev', rev); book('divCost', -cost);
  p.sold += units; p.y = { units, rev, p: rev - cost, share };
}

// ---------- Щоденна симуляція ----------
function sciDaily() {
  const S = sciState();
  // дослідницькі центри
  for (const l of S.labs) { book('divCost', -labUpkeep(l)); state.tech.points += labPoints(l) * (1 + sciFx('research')); }
  if (S.active) {
    if (--S.active.left <= 0) {
      const k = S.active.k, T = TECHS[k]; S.active = null; S.done[k] = state.day;
      S.patents.push({ id: 'pt' + (S.seq++), tech: k, since: state.day, until: state.day + 1500, licensees: [] });
      news(`🔬 Технологічний прорив: ${state.company} розробила «${T.name}». Отримано патент.`, 'tech', 'good', true);
      if (k === 'reusable' && state.corp && state.corp.space) state.corp.space.rel = Math.min(0.97, state.corp.space.rel + 0.1);
      checkAchievements();
    }
  }
  // роялті й порушення патентів
  for (const p of S.patents) {
    if (p.until <= state.day) continue;
    for (const id of [...p.licensees]) { const co = coById(id); if (!co || !co.alive) { p.licensees = p.licensees.filter((x) => x !== id); continue; } book('divRev', royalty(co)); co.cash -= royalty(co); }
    if (chance(0.0015)) {
      const co = pick(aliveCos().filter((c) => c.sector === TECHS[p.tech].sector && !isSub(c) && !p.licensees.includes(c.id)));
      if (co && state.war) { p.infringer = co.id; news(`📜 «${co.name}» використовує технологію «${TECHS[p.tech].name}» без ліцензії ${state.company}.`, 'tech', 'bad'); }
    }
  }
  for (const ph of S.phones) phoneDaily(ph);
  // Технологічна гонка ІІ: компанії доходять до тих самих технологій
  for (const co of aliveCos()) {
    if (isSub(co)) continue;
    const pace = co.strat === 'innovator' ? 0.004 : 0.0012;
    if (chance(pace * (1 + (co.tech || 0) * 0.1))) {
      const cand = Object.keys(TECHS).filter((k) => TECHS[k].sector === co.sector && !(S.aiTech[co.id] || []).includes(k));
      if (!cand.length) continue;
      const k = pick(cand); (S.aiTech[co.id] = S.aiTech[co.id] || []).push(k); co.tech = (co.tech || 0) + 2; co.eff = Math.min(1.5, co.eff * 1.03);
      news(`🔬 «${co.name}» запускає технологію «${TECHS[k].name}»${hasTech(k) ? '' : ` раніше за ${state.company}`}.`, 'tech');
    }
  }
}

HOOKS.day.push(sciDaily);
