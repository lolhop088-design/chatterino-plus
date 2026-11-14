'use strict';
/* БІЗНЕС ІМПЕРІЯ — розвиток міст (Ultimate 3.0, етап 6, частина 2).
   Інфраструктура кожного міста (дороги, мости, залізниця, аеропорт, порт, електростанції, житлові райони,
   торговельні центри, готелі, промзони, туристичні об’єкти) з рівнями 0–5. Будують держава (з бюджету),
   ІІ-компанії та гравець (державно-приватне партнерство з концесійним доходом). Населення росте й мігрує
   залежно від привабливості міста. Ефекти: потік покупців, логістика, імпорт, ціна електроенергії,
   продуктивність промзон, туризм (готелі, авіа). Ендгейм: заснувати власне місто. */

const INFRA = {
  roads: { name: 'Дороги й розв’язки', icon: '🛣️', cost: 20e6, days: 60, fx: { transport: -0.06, traffic: 0.02 }, toll: 0.00012 },
  bridges: { name: 'Мости', icon: '🌉', cost: 30e6, days: 90, fx: { transport: -0.04, traffic: 0.02 }, toll: 0.00012 },
  rail: { name: 'Залізниця', icon: '🚆', cost: 50e6, days: 120, fx: { transport: -0.08, industry: 0.03 }, toll: 0.0002 },
  airport: { name: 'Аеропорт', icon: '🛫', cost: 80e6, days: 150, fx: { tourism: 0.1, airline: 0.15, traffic: 0.02 }, toll: 0.00025 },
  port: { name: 'Морський порт', icon: '⚓', cost: 70e6, days: 140, fx: { import: -0.04, transport: -0.05 }, toll: 0.00025, coastal: true },
  power: { name: 'Міська електростанція', icon: '🏭', cost: 40e6, days: 100, fx: { power: -0.08 }, toll: 0.0002 },
  housing: { name: 'Житловий район', icon: '🏘️', cost: 35e6, days: 90, fx: { pop: 0.05, wage: -0.01 }, toll: 0.00022 },
  malls: { name: 'Торговельний центр', icon: '🛍️', cost: 25e6, days: 70, fx: { traffic: 0.04, tourism: 0.03 }, toll: 0.00025 },
  hotels: { name: 'Готельний квартал', icon: '🏨', cost: 20e6, days: 60, fx: { tourism: 0.06, hotel: 0.1 }, toll: 0.00025 },
  industrial: { name: 'Промислова зона', icon: '🏗️', cost: 30e6, days: 80, fx: { industry: 0.04 }, toll: 0.0002 },
  tourism: { name: 'Туристичні об’єкти', icon: '🎡', cost: 15e6, days: 60, fx: { tourism: 0.08, traffic: 0.01 }, toll: 0.0002 },
};
const COASTAL = ['odesa', 'newyork', 'london', 'dubai', 'tokyo', 'mycity'];
const POP0 = { kyiv: 3.0, lviv: 0.72, odesa: 1.0, berlin: 3.7, newyork: 8.3, warsaw: 1.8, london: 8.9, dubai: 3.6, tokyo: 14, mycity: 0.05 };
const MY_CITY_COST = 2e9;

function cityState() {
  if (!state.cities) {
    state.cities = { c: {}, projects: [], seq: 1, custom: null };
  }
  const S = state.cities;
  if (S.custom) restoreCustomCity(S.custom);
  for (const cid of Object.keys(CITIES)) {
    if (S.c[cid]) continue;
    const lv = Object.fromEntries(Object.keys(INFRA).map((k) => [k, 0]));
    if (cid !== 'mycity') for (const k of Object.keys(lv)) lv[k] = (INFRA[k].coastal && !COASTAL.includes(cid)) ? 0 : ri(0, 2);
    S.c[cid] = { lv, pop: POP0[cid] || 1, pop0: POP0[cid] || 1, attract: 50, owner: {} };
  }
  return S;
}
const cdev = (cid) => cityState().c[cid];
/** Множник ефекту інфраструктури міста. */
function cityMult(cid, key) {
  if (!state.cities) return 1;
  const D = state.cities.c[cid]; if (!D) return 1;
  let v = 1;
  for (const [k, l] of Object.entries(D.lv)) { const f = INFRA[k].fx[key]; if (f) v *= 1 + f * l; }
  if (key === 'traffic') v *= Math.sqrt(D.pop / D.pop0);
  return v;
}
const canBuild = (cid, k) => !(INFRA[k].coastal && !COASTAL.includes(cid));
function projectCost(cid, k, by = 'player') {
  const D = cdev(cid), lvl = D.lv[k] + 1;
  let c = INFRA[k].cost * lvl * CITIES[cid].price * state.econ.priceLevel;
  if (by === 'player') {
    if (state.pol && state.pol.mayors[cid] && state.pol.mayors[cid].player) c *= 0.8; // мер — співфінансування з міського бюджету
    if (state.corp && state.corp.divs.some((d) => d.ind === 'construction' && d.city === cid)) c *= 0.9; // власна будівельна компанія
  }
  return Math.round(c);
}
function startProject(cid, k) {
  const S = cityState(), D = cdev(cid);
  if (!canBuild(cid, k)) return toast('Місто не має виходу до моря.', 'bad');
  if (D.lv[k] >= 5) return toast('Максимальний рівень.', 'bad');
  if (S.projects.some((p) => p.city === cid && p.k === k)) return toast('Цей проєкт уже будується.', 'bad');
  const c = projectCost(cid, k); if (state.cash < c) return toast(`Проєкт коштує ${moneyK(c)}.`, 'bad');
  book('capex', -c);
  const days = Math.round(INFRA[k].days * (state.corp && state.corp.divs.some((d) => d.ind === 'construction' && d.city === cid) ? 0.8 : 1));
  S.projects.push({ id: 'ip' + (S.seq++), city: cid, k, by: 'player', left: days, days, cost: c });
  news(`🏗️ ${state.company} будує в місті ${CITIES[cid].name}: ${INFRA[k].name} (рівень ${D.lv[k] + 1}) за ${moneyK(c)}.`, 'city', 'good');
  if (state.pol) state.pol.me.popularity = Math.min(100, state.pol.me.popularity + 1.5);
}
/** Концесійний дохід гравця з власних об’єктів інфраструктури. */
function concessionDaily() {
  const S = cityState(); let tot = 0;
  for (const [cid, D] of Object.entries(S.c)) for (const [k, n] of Object.entries(D.owner)) {
    if (!n) continue;
    const base = INFRA[k].cost * CITIES[cid].price * priceLvl() * INFRA[k].toll * n * Math.sqrt(D.pop / D.pop0) * state.econ.demand;
    tot += base;
  }
  if (tot > 0) book('infraRev', tot);
  return tot;
}
function attractiveness(cid) {
  const D = cdev(cid), C = CITIES[cid];
  const infra = sum(Object.values(D.lv), (x) => x) / (Object.keys(INFRA).length * 5);
  const crime = state.crime && state.crime.police[cid] != null ? crimeIndex(cid) : 0.2;
  const wage = C.wage * (cityMult(cid, 'wage'));
  return clamp(30 + infra * 50 + (1 - crime) * 15 + wage * 6 + (C.tourism ? 5 : 0) + (state.cities.c[cid].owner && sum(Object.values(D.owner), (x) => x) ? 3 : 0), 0, 100);
}

// ---------- Власне місто ----------
function restoreCustomCity(m) {
  if (CITIES.mycity) return;
  CITIES.mycity = { name: m.name, flag: m.flag || 'UA', traffic: 0.6, rent: 0.55, wage: 0.8, price: 0.95, tax: 0.12, transport: 0.9, tourism: 1.05, desc: 'Ваше власне місто: низькі податки й оренда, росте разом з інфраструктурою.' };
  REGION_OF.mycity = REGION_OF[m.home] || REGION_OF.kyiv;
  CURRENCY_OF.mycity = CURRENCY_OF[m.home] || 'UAH';
}
function foundCity(name) {
  const S = cityState();
  if (S.custom) return;
  const c = Math.round(MY_CITY_COST * priceLvl()); if (state.cash < c) return toast(`Заснування міста коштує ${moneyK(c)}.`, 'bad');
  book('capex', -c);
  S.custom = { name: name || `Нове ${state.company.split(' ')[0]}`, home: state.city, since: state.day };
  restoreCustomCity(S.custom);
  cityState();
  const D = cdev('mycity'); D.lv.roads = 1; D.lv.housing = 1; D.lv.power = 1; D.owner = { roads: 1, housing: 1, power: 1 };
  genLots('mycity', 'mycity:');
  state.unlocked.mycity = true;
  if (state.crime) { state.crime.police.mycity = 0.7; if (state.crime.policeBase) state.crime.policeBase.mycity = 0.7; }
  if (state.pol) state.pol.mayors.mycity = { name: state.me.name, party: state.pol.me.party, player: true, since: state.day };
  if (state.pol) state.pol.me.posts = [...new Set([...state.pol.me.posts, 'mayor:mycity'])];
  news(`🏙️ ${state.company} засновує нове місто «${S.custom.name}»! Перші квартали, дороги й електростанція вже будуються.`, 'city', 'good', true);
  checkAchievements();
}

// ---------- Щоденна симуляція ----------
function cityDaily() {
  const S = cityState();
  for (const p of [...S.projects]) {
    if (--p.left > 0) continue;
    S.projects = S.projects.filter((x) => x !== p);
    const D = cdev(p.city); D.lv[p.k] = Math.min(5, D.lv[p.k] + 1);
    if (p.by === 'player') { D.owner[p.k] = (D.owner[p.k] || 0) + 1; S.invested = (S.invested || 0) + p.cost; if (typeof applyReputation === 'function') applyReputation('player', 1); }
    else if (p.by !== 'gov') { const co = coById(p.by); if (co) co.cash += p.cost * 0.15; }
    news(`✅ ${CITIES[p.city].name}: відкрито «${INFRA[p.k].name}» (рівень ${D.lv[p.k]})${p.by === 'player' ? ` — інвестор ${state.company}` : p.by === 'gov' ? ' за державні кошти' : ` — інвестор «${(coById(p.by) || {}).name}»`}.`, 'city', p.by === 'player' ? 'good' : '');
    checkAchievements();
  }
  concessionDaily();
  // Держава будує: щомісяця, якщо є бюджет (або діє програма інфраструктури)
  if (state.day % 30 === 15) {
    const G = state.gov, budgetOk = !G || G.budget.balance > -5e8;
    if (budgetOk && chance(0.6)) {
      const cid = pick(Object.keys(CITIES).filter((c) => c !== 'mycity')), k = pick(Object.keys(INFRA).filter((x) => canBuild(cid, x) && cdev(cid).lv[x] < 4));
      if (k && !S.projects.some((p) => p.city === cid && p.k === k)) {
        const c = projectCost(cid, k, 'gov');
        S.projects.push({ id: 'ip' + (S.seq++), city: cid, k, by: 'gov', left: INFRA[k].days, days: INFRA[k].days, cost: c });
        if (G) G.budget.balance -= c;
        // будівельні компанії заробляють на держзамовленні
        for (const co of aliveCos().filter((x) => x.sector === 'construction')) co.cash += c * 0.03;
        if (state.corp) for (const d of state.corp.divs) if (d.ind === 'construction' && d.city === cid) { book('divRev', c * 0.02); log(`🏗️ Ваша будівельна компанія отримала підряд на «${INFRA[k].name}» (${CITIES[cid].name}): ${money(c * 0.02)}.`, 'good'); }
      }
    }
  }
  // ІІ-інвестори
  if (chance(0.01)) {
    const co = pick(aliveCos().filter((c) => !isSub(c) && c.cash > 2e8));
    if (co) {
      const cid = pick(Object.keys(CITIES).filter((c) => c !== 'mycity')), k = pick(['malls', 'hotels', 'housing', 'tourism', 'industrial'].filter((x) => cdev(cid).lv[x] < 5));
      if (k && !S.projects.some((p) => p.city === cid && p.k === k)) { const c = projectCost(cid, k, co.id); co.cash -= c; S.projects.push({ id: 'ip' + (S.seq++), city: cid, k, by: co.id, left: INFRA[k].days, days: INFRA[k].days, cost: c }); news(`🏗️ «${co.name}» інвестує в місто ${CITIES[cid].name}: ${INFRA[k].name}.`, 'city'); }
    }
  }
  // Населення: росте з житлом і привабливістю, мігрує до привабливіших міст
  const ids = Object.keys(S.c);
  const att = Object.fromEntries(ids.map((c) => [c, attractiveness(c)]));
  const avg = sum(ids, (c) => att[c]) / ids.length;
  for (const cid of ids) {
    const D = S.c[cid];
    D.attract = att[cid];
    const target = D.pop0 * (1 + 0.05 * D.lv.housing) * (1 + (att[cid] - avg) / 250) * (cid === 'mycity' ? 1 + sum(Object.values(D.lv), (x) => x) * 1.2 : 1);
    const prev = D.pop;
    D.pop = Math.max(0.01, D.pop + (target - D.pop) * 0.004 + (state.econ.growth / 100) * D.pop / 365);
    if (Math.floor(prev * 10) !== Math.floor(D.pop * 10) && cid === 'mycity') news(`🏙️ «${CITIES.mycity.name}»: населення досягло ${D.pop.toFixed(2)} млн.`, 'city', 'good');
  }
  if (S.custom && cdev('mycity')) {
    const D = cdev('mycity');
    CITIES.mycity.traffic = clamp(0.4 + D.pop * 0.25, 0.4, 1.4);
  }
}

const infraValue = () => (state.cities ? (state.cities.invested || 0) * 0.8 : 0);

/** Ключ для 3D: рівні інфраструктури міста. */
function infraKey3d(cid) { const D = state.cities && state.cities.c[cid]; return D ? Object.values(D.lv).join('') : ''; }

HOOKS.day.push(cityDaily);
