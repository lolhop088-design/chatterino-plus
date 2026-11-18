'use strict';
/* БІЗНЕС ІМПЕРІЯ — ринок праці й реальне населення міст.
   Населення кожного міста в людях (а не умовних одиницях), поділене по районах; безробіття в кожному
   місті; розмір пулу кандидатів залежить від населення й безробіття ваших міст; кандидати з’являються
   переважно на ті ролі, де у вас вакансії; кадрове агентство заповнює вакансії за гроші;
   ваші працівники знижують безробіття міста, а дефіцит кадрів підвищує зарплати. */

/** Частки населення за районами (житлові — найбільші). */
const DIST_POP = { center: 0.09, biz: 0.07, res: 0.38, campus: 0.14, river: 0.1, hills: 0.06, industrial: 0.09, port: 0.07 };
const cityPopPeople = (cid) => { const D = state.cities && state.cities.c[cid]; return Math.round((D ? D.pop : (POP0[cid] || 1)) * 1e6); };
const districtPop = (cid, dist) => Math.round(cityPopPeople(cid) * (DIST_POP[dist] || 0.1));
function laborState() { if (!state.labor) state.labor = { unemp: {}, hiredAgency: 0 }; return state.labor; }
/** Безробіття міста: загальне по країні з поправкою на місто, мінус ваші робочі місця. */
function cityUnemp(cid) {
  const L = laborState();
  if (L.unemp[cid] == null) L.unemp[cid] = +(state.econ.unemployment * (CITIES[cid].wage < 1 ? 1.15 : 0.9)).toFixed(1);
  return L.unemp[cid];
}
function playerJobs(cid) { let n = 0; for (const p of state.staff) { const u = unitById(p.unit); if (u && lotCityId(lotOf(u)) === cid) n++; } return n; }
/** Вакансії за ролями по всіх ваших об’єктах. */
function vacancies() {
  const v = { sales: 0, worker: 0, engineer: 0, dev: 0, manager: 0 };
  for (const u of [...state.biz, ...state.fac]) { const need = maxStaff(u) - staffOf(u).length; if (need > 0) v[unitRole(u)] = (v[unitRole(u)] || 0) + need; }
  return v;
}
/** Розмір пулу кандидатів: що більше населення й безробіття у ваших містах — то більше людей шукають роботу. */
function laborPoolSize() {
  const cs = Object.keys(state.unlocked || { [state.city]: 1 });
  let n = 10;
  for (const c of cs) n += Math.sqrt(cityPopPeople(c) / 1e6) * cityUnemp(c) * 2.2;
  const vac = sum(Object.values(vacancies()), (x) => x);
  return Math.round(clamp(Math.max(n, Math.min(vac * 0.6, n * 2)), 10, 260));
}
/** Кандидат: 60% — на ролі з вакансіями, решта — випадкові. */
function makeCandidate2() {
  const c = makeCandidate(), v = vacancies(), tot = sum(Object.values(v), (x) => x);
  if (tot > 0 && chance(0.6)) {
    let r = Math.random() * tot;
    for (const [role, n] of Object.entries(v)) { r -= n; if (r <= 0) { c.role = role; break; } }
    c.wage = +((8 + c.skill * 3 + rnd(-1.5, 2)) * ROLE_MULT[c.role] * wageLvl() * (1 - 0.05 * state.depts.hr)).toFixed(1);
  }
  return c;
}
/** Кадрове агентство: заповнює вакансії об’єкта або всіх об’єктів. Гонорар — 10 денних ставок за людину. */
function agencyCost(units) { let c = 0; for (const u of units) { const need = Math.max(0, maxStaff(u) - staffOf(u).length); c += need * (8 + 3 * 3) * ROLE_MULT[unitRole(u)] * wageLvl() * 10; } return Math.round(c); }
function agencyFill(units, quiet) {
  const cost = agencyCost(units);
  if (!cost) return quiet ? 0 : toast('Вакансій немає.', 'good');
  if (state.cash < cost) return quiet ? 0 : toast(`Агентство бере ${moneyK(cost)}.`, 'bad');
  book('wages', -cost);
  let n = 0;
  for (const u of units) {
    const role = unitRole(u);
    while (staffOf(u).length < maxStaff(u)) {
      const c = makeCandidate(); c.role = role; c.skill = clamp(+rnd(2.2, 4.3).toFixed(1), 1, 5);
      c.wage = +((8 + c.skill * 3 + 0.5) * ROLE_MULT[role] * wageLvl()).toFixed(1);
      state.candidates.push(c); hire(c.id, u.id, true); n++;
    }
  }
  laborState().hiredAgency += n;
  if (!quiet) log(`🧑‍💼 Кадрове агентство закрило ${n} вакансій за ${money(cost)}.`, 'good');
  return n;
}
const allUnits2 = () => [...state.biz, ...state.fac];

function laborDaily() {
  const L = laborState();
  for (const cid of Object.keys(CITIES)) {
    const pop = cityPopPeople(cid), jobs = playerJobs(cid);
    // базове безробіття країни + регіональна поправка − ваші робочі місця (вплив обмежений)
    const target = clamp(state.econ.unemployment * (CITIES[cid].wage < 1 ? 1.15 : 0.9) - Math.min(3, jobs / Math.max(1, pop) * 2000), 1.5, 30);
    L.unemp[cid] = +(cityUnemp(cid) + (target - cityUnemp(cid)) * 0.05).toFixed(2);
  }
  // дефіцит кадрів: багато вакансій при низькому безробітті — кандидати просять більше
  const vac = sum(Object.values(vacancies()), (x) => x), pool = state.candidates.length;
  L.tight = vac > pool * 1.5;
  if (L.tight) for (const c of state.candidates) if (c.since === state.day) c.wage = +(c.wage * 1.06).toFixed(1);
  // HR-директор штабу з налаштуванням «агентство» сам закриває вакансії
  if (state.hq && state.hq.on && state.hq.on.hr && state.hq.opts.hrAgency && state.day % 3 === 0) {
    const units = allUnits2().filter((u) => !(typeof ceoRuns === 'function' && ceoRuns(u)) && staffOf(u).length < maxStaff(u));
    if (units.length && state.cash > agencyCost(units) * 4) { const n = agencyFill(units, true); if (n && typeof hqLog === 'function') hqLog('hr', `через кадрове агентство закрито ${n} вакансій`); }
  }
}

HOOKS.day.push(laborDaily);
