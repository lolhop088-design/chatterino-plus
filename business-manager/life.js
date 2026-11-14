'use strict';
/* БІЗНЕС ІМПЕРІЯ — особисте життя, родина й покоління (Ultimate 3.0, етап 7, частина 1).
   Вік, здоров’я, стрес, щастя; медицина; знайомства, шлюб (шлюбний договір), розлучення; діти з характерами
   й освітою; розкіш (пентхауси, маєтки, яхти, літаки, мистецтво, острів) і суспільний статус; подорожі;
   благодійність; заповіт і спадкування імперії наступним поколінням (податок на спадщину). */

const AGE_DAYS = 60; // ігрових днів в одному році життя
const FEM = ['Олена', 'Марія', 'Ірина', 'Софія', 'Наталія', 'Юлія', 'Катерина', 'Оксана', 'Анна', 'Дарина', 'Христина', 'Леся', 'Вікторія', 'Злата'];
const MASC = ['Андрій', 'Тарас', 'Богдан', 'Дмитро', 'Олег', 'Максим', 'Ігор', 'Віктор', 'Роман', 'Степан', 'Назар', 'Артем', 'Остап', 'Матвій'];
const PARTNER_TRAITS = {
  business: { name: 'Ділова людина', desc: 'може очолити імперію; +навички дітям' },
  caring: { name: 'Турботлива', desc: 'менше стресу, щасливіша родина' },
  public: { name: 'Публічна особа', desc: '+популярність і репутація' },
  spender: { name: 'Любить розкіш', desc: 'дорожче утримання, але щаслива від розкоші' },
};
const CHILD_TRAITS = {
  ambitious: { name: 'Амбітний', skill: 1.3 }, genius: { name: 'Геній', skill: 1.6 }, creative: { name: 'Творчий', skill: 1.0 },
  rebel: { name: 'Бунтар', skill: 0.8 }, playboy: { name: 'Гульвіса', skill: 0.6, spend: 1 },
};
const EDU = [
  { name: 'Державна школа', cost: 0, gain: 0.04 },
  { name: 'Приватна школа', cost: 250, gain: 0.07 },
  { name: 'Елітний пансіон', cost: 900, gain: 0.1 },
  { name: 'Пансіон + Ліга плюща', cost: 2500, gain: 0.14 },
];
const MEDICAL = [
  { name: 'Державна медицина', cost: 0, h: 0 },
  { name: 'Приватна клініка', cost: 300, h: 4 },
  { name: 'Преміум-страхування', cost: 1500, h: 8 },
  { name: 'Найкращі лікарі світу', cost: 6000, h: 14 },
];
const LUXURY = {
  supercar: { name: 'Суперкар', icon: '🏎️', price: 4e5, upkeep: 300, status: 5, happy: 3, dep: 0.0006 },
  penthouse: { name: 'Пентхаус', icon: '🏙️', price: 3e6, upkeep: 1500, status: 10, happy: 5, re: true },
  art: { name: 'Колекція мистецтва', icon: '🖼️', price: 5e6, upkeep: 200, status: 15, happy: 4, art: true },
  mansion: { name: 'Маєток', icon: '🏰', price: 12e6, upkeep: 5000, status: 25, happy: 10, re: true },
  villa: { name: 'Вілла на узбережжі', icon: '🏝️', price: 25e6, upkeep: 8000, status: 35, happy: 15, re: true, rest: 1 },
  yacht: { name: 'Яхта', icon: '🛥️', price: 30e6, upkeep: 12000, status: 40, happy: 12, dep: 0.0003, rest: 1 },
  jet: { name: 'Приватний літак', icon: '🛩️', price: 60e6, upkeep: 25000, status: 50, happy: 8, dep: 0.0003, jet: true },
  island: { name: 'Приватний острів', icon: '🌴', price: 150e6, upkeep: 30000, status: 80, happy: 20, re: true, rest: 2 },
};
const TRIPS = {
  sea: { name: 'Відпочинок на морі', icon: '🏖️', cost: 20000, stress: 25, health: 3, happy: 5 },
  ski: { name: 'Гірськолижний курорт', icon: '⛷️', cost: 50000, stress: 35, health: 5, happy: 8 },
  world: { name: 'Навколосвітня подорож', icon: '🌍', cost: 500000, stress: 60, health: 6, happy: 18 },
  spa: { name: 'Оздоровчий центр', icon: '🧘', cost: 80000, stress: 30, health: 12, happy: 4 },
  business: { name: 'Бізнес-тур (переговори)', icon: '💼', cost: 150000, stress: -10, health: 0, happy: 0, biz: true },
};
const STATUS_TITLES = [[0, 'Підприємець'], [40, 'Мільйонер'], [80, 'Магнат'], [130, 'Олігарх'], [200, 'Легенда бізнесу']];

function lifeState() {
  if (state.life) return state.life;
  state.life = { age: 25, health: 90, stress: 20, happy: 60, medical: 0, partner: null, dates: [], kids: [], lux: [], charity: 0, will: null, gen: 1, dynasty: [], seq: 1, lastAge: state.day };
  return state.life;
}
const ageOf = (born) => (state.day - born) / AGE_DAYS;
const kidAge = (k) => ageOf(k.born);
const randLook = () => ({ skin: pick(AVATAR.skin), hair: pick(AVATAR.hair), shirt: pick(AVATAR.shirt), style: pick(AVATAR.style) });
const lastName = () => state.me.name.split(' ').slice(1).join(' ') || state.me.name;
function luxValue(x) {
  const L = LUXURY[x.kind], age = state.day - x.bought;
  if (L.re) return x.price * state.econ.housing / (x.housing0 || 1);
  if (L.art) return x.price * Math.pow(1.0003, age) * (x.artLuck || 1);
  return x.price * Math.max(0.3, 1 - L.dep * age);
}
const luxuryValue = () => (state.life ? sum(state.life.lux, luxValue) : 0);
function statusScore() {
  const L = lifeState();
  const nw = Math.max(1, netWorth());
  return Math.round(Math.max(0, Math.log10(nw) - 4) * 20 + sum(L.lux, (x) => LUXURY[x.kind].status) + Math.sqrt(L.charity / 1e5) * 3 + (state.pol && state.pol.me.office ? 25 : 0) + (state.sport ? state.sport.trophies * 3 : 0));
}
const statusTitle = () => { const s = statusScore(); return STATUS_TITLES.filter(([t]) => s >= t).pop()[1]; };

// ---------- Здоров’я, розкіш, подорожі ----------
function setMedical(i) { lifeState().medical = i; log(`🩺 Медичне обслуговування: ${MEDICAL[i].name}.`); }
function buyLuxury(kind) {
  const L = LUXURY[kind], price = Math.round(L.price * priceLvl());
  if (state.cash < price) return toast(`Коштує ${moneyK(price)}.`, 'bad');
  book('propTrade', -price);
  lifeState().lux.push({ id: 'lx' + (lifeState().seq++), kind, price, bought: state.day, housing0: state.econ.housing, artLuck: L.art ? +rnd(0.6, 1.8).toFixed(2) : 1 });
  log(`${L.icon} Придбано: ${L.name} за ${money(price)}.`, 'good');
  if (L.status >= 40) news(`${L.icon} ${state.me.name} (${state.company}) придбав(-ла) ${L.name.toLowerCase()}.`, 'city');
  checkAchievements();
}
function sellLuxury(id) {
  const Lf = lifeState(), x = Lf.lux.find((y) => y.id === id); if (!x) return;
  const v = Math.round(luxValue(x) * 0.92);
  book('propTrade', v); Lf.lux = Lf.lux.filter((y) => y !== x);
  log(`${LUXURY[x.kind].icon} Продано за ${money(v)}.`);
}
function takeTrip(k) {
  const T = TRIPS[k], Lf = lifeState(), c = Math.round(T.cost * priceLvl() * (Lf.partner ? 1.6 : 1) * (Lf.lux.some((x) => LUXURY[x.kind].jet) ? 0.7 : 1));
  if (state.cash < c) return toast(`Коштує ${moneyK(c)}.`, 'bad');
  book('living', -c);
  Lf.stress = clamp(Lf.stress - T.stress, 0, 100); Lf.health = clamp(Lf.health + T.health, 0, 100); Lf.happy = clamp(Lf.happy + T.happy, 0, 100);
  if (Lf.partner) Lf.partner.happy = clamp(Lf.partner.happy + T.happy, 0, 100);
  if (T.biz) { for (const co of aliveCos().filter((c2) => (c2.rivalry || 0) > 0).slice(0, 5)) co.rivalry = Math.max(0, co.rivalry - 0.1); if (state.media) applyReputation('player', 0.5); }
  log(`${T.icon} ${T.name}: стрес −${Math.max(0, T.stress)}, здоров’я +${T.health}.`, 'good');
}
function donate2(amount, cause) {
  if (state.cash < amount) return toast('Недостатньо коштів.', 'bad');
  book('charity', -amount); const Lf = lifeState(); Lf.charity += amount;
  if (typeof applyReputation === 'function') applyReputation('player', Math.min(3, amount / 1e6));
  if (state.pol) state.pol.me.popularity = Math.min(100, state.pol.me.popularity + Math.min(5, amount / 2e6));
  Lf.happy = Math.min(100, Lf.happy + 3);
  news(`💝 ${state.me.name} пожертвував(-ла) ${moneyK(amount)} на ${cause}.`, 'city', 'good');
}

// ---------- Родина ----------
function findDates() {
  const Lf = lifeState(); if (Lf.partner) return;
  const c = Math.round(5000 * priceLvl()); if (state.cash < c) return toast('Недостатньо коштів.', 'bad');
  book('living', -c);
  const fem = chance(0.5);
  Lf.dates = Array.from({ length: 3 }, () => ({ id: 'dt' + (Lf.seq++), name: `${pick(fem ? FEM : MASC)} ${pick(LAST)}`, age: Math.round(clamp(Lf.age + rnd(-6, 6), 20, 80)), trait: pick(Object.keys(PARTNER_TRAITS)), compat: ri(30, 95), love: 0, look: randLook() }));
}
function date(id) {
  const Lf = lifeState(), d = Lf.dates.find((x) => x.id === id); if (!d) return;
  const c = Math.round(3000 * priceLvl() * (1 + statusScore() / 100)); if (state.cash < c) return toast('Недостатньо коштів.', 'bad');
  book('living', -c);
  d.love = Math.min(100, d.love + d.compat * rnd(0.15, 0.35) + statusScore() * 0.05);
  Lf.stress = Math.max(0, Lf.stress - 3);
  log(`💞 Побачення з ${d.name}: стосунки ${Math.round(d.love)}%.`);
}
function propose(id, prenup, scale) {
  const Lf = lifeState(), d = Lf.dates.find((x) => x.id === id); if (!d) return;
  if (d.love < 70) return toast('Стосунки ще не настільки близькі (потрібно 70%).', 'bad');
  const cost = Math.round([3e4, 3e5, 3e6][scale] * priceLvl());
  if (state.cash < cost) return toast(`Весілля коштує ${moneyK(cost)}.`, 'bad');
  if (!chance(prenup ? 0.75 : 0.95)) { d.love -= 20; return log(`💔 ${d.name} поки не готові до шлюбу${prenup ? ' зі шлюбним договором' : ''}.`, 'bad'); }
  book('living', -cost);
  Lf.partner = { name: d.name, age0: d.age, born: state.day - d.age * AGE_DAYS, trait: d.trait, happy: 70 + scale * 8, prenup: !!prenup, since: state.day, look: d.look };
  Lf.dates = []; Lf.happy = Math.min(100, Lf.happy + 15);
  news(`💍 ${state.me.name} (${state.company}) одружується з ${d.name}${scale === 2 ? ' — розкішне весілля року' : ''}.`, 'city', 'good');
  if (d.trait === 'public' && state.pol) state.pol.me.popularity = Math.min(100, state.pol.me.popularity + 5);
  checkAchievements();
}
function divorce() {
  const Lf = lifeState(), P = Lf.partner; if (!P) return;
  let lost = 0;
  if (!P.prenup) { lost = Math.max(0, state.cash) * 0.3; book('family', -lost); const half = Lf.lux.filter((_, i) => i % 2 === 0); Lf.lux = Lf.lux.filter((x) => !half.includes(x)); }
  Lf.partner = null; Lf.happy = Math.max(0, Lf.happy - 20); Lf.stress = Math.min(100, Lf.stress + 20);
  news(`💔 ${state.me.name} розлучається з ${P.name}${lost ? `; за рішенням суду колишній(-ій) партнер(-ка) отримує ${moneyK(lost)} і половину розкоші` : ' (шлюбний договір захистив активи)'}.`, 'city', 'bad');
}
function setEdu(id, lvl) { const k = lifeState().kids.find((x) => x.id === id); if (k) k.edu = lvl; }
function internship(id) {
  const k = lifeState().kids.find((x) => x.id === id); if (!k || kidAge(k) < 18) return;
  k.intern = !k.intern; log(k.intern ? `👔 ${k.name} проходить стажування в ${state.company}.` : `${k.name} завершив(-ла) стажування.`);
}
function setWill(id) { lifeState().will = id; log(`📜 Заповіт: спадкоємець — ${id === 'partner' ? lifeState().partner.name : (lifeState().kids.find((k) => k.id === id) || {}).name}.`); }

// ---------- Спадкування ----------
function heirCandidates() {
  const Lf = lifeState(), c = [];
  for (const k of Lf.kids) c.push({ id: k.id, name: k.name, age: kidAge(k), skills: k.skills, kid: k });
  if (Lf.partner && Lf.partner.trait === 'business') c.push({ id: 'partner', name: Lf.partner.name, age: ageOf(Lf.partner.born), skills: { business: 3, management: 3, coding: 1 } });
  return c;
}
function succession(reason) {
  const Lf = lifeState(), cands = heirCandidates();
  let h = cands.find((c) => c.id === Lf.will) || cands.filter((c) => c.age >= 18).sort((a, b) => sum(Object.values(b.skills)) - sum(Object.values(a.skills)))[0] || cands.sort((a, b) => b.age - a.age)[0];
  const nw = netWorth(), old = state.me.name;
  Lf.dynasty.push({ name: old, gen: Lf.gen, from: Lf.genStart || 1, to: state.day, age: Math.round(Lf.age), nw: Math.round(nw), reason });
  if (!h) {
    news(`🕯️ ${old} пішов(-ла) з життя. Спадкоємців немає — імперія ${state.company} переходить у трастове управління.`, 'corp', 'bad', true);
    state.over = true; if (typeof setSpeed === 'function') setSpeed(0);
    if (typeof showModal === 'function') showModal(`<h2>🕯️ Кінець династії</h2><p>${esc(old)} помер(-ла) у віці ${Math.round(Lf.age)} років. Спадкоємців не залишилось — імперію передано в траст.</p><p>Капітал: <b>${money(nw)}</b> · поколінь: ${Lf.gen}</p><div class="row end"><button class="btn primary" data-act="newGamePrompt">Нова гра</button></div>`);
    return;
  }
  // податок на спадщину (лише при смерті) і частки братам/сестрам
  if (reason === 'death') { const tax = Math.max(0, state.cash) * state.econ.taxRate * 0.5; book('tax', -tax); }
  const siblings = Lf.kids.filter((k) => k.id !== h.id && kidAge(k) >= 18);
  for (const s of siblings) book('family', -Math.max(0, state.cash) * 0.04);
  state.me.name = h.name; state.me.skills = { business: Math.min(5, h.skills.business), coding: Math.min(5, h.skills.coding || 0), management: Math.min(5, h.skills.management) };
  state.me.look = h.kid && h.kid.look ? h.kid.look : randLook(); state.me.job = null;
  const keepPartner = h.id === 'partner' ? null : null;
  Lf.age = Math.max(18, h.age); Lf.health = clamp(95 - Math.max(0, Lf.age - 40), 40, 95); Lf.stress = 35; Lf.happy = 50;
  Lf.partner = keepPartner; Lf.kids = h.id === 'partner' ? Lf.kids : []; Lf.will = null; Lf.gen++; Lf.genStart = state.day; Lf.dates = [];
  if (state.pol) { state.pol.me.office = null; state.pol.me.posts = []; state.pol.me.popularity *= 0.6; }
  news(`👑 ${reason === 'death' ? `${old} пішов(-ла) з життя.` : `${old} передає справи.`} Імперію ${state.company} очолює ${h.name} (покоління ${Lf.gen}).`, 'corp', '', true);
  if (typeof showModal === 'function') showModal(`<h2>👑 Нове покоління</h2><p>${reason === 'death' ? `${esc(old)} помер(-ла) у віці ${Math.round(Lf.dynasty[Lf.dynasty.length - 1].age)} років.` : `${esc(old)} вийшов(-ла) на пенсію.`}</p><p>Імперію успадковує <b>${esc(h.name)}</b> (${Math.round(h.age)} р.). ${reason === 'death' ? `Податок на спадщину сплачено. ` : ''}Покоління №${Lf.gen}.</p><div class="row end"><button class="btn primary" data-act="modalClose">Продовжити</button></div>`);
  checkAchievements();
}
function retire() {
  const c = heirCandidates().filter((x) => x.age >= 18);
  if (!c.length) return toast('Немає повнолітнього спадкоємця.', 'bad');
  confirmBox('Передати імперію спадкоємцю за заповітом (або найздібнішому) зараз?', () => succession('retire'));
}

// ---------- Щоденна симуляція ----------
function lifeDaily() {
  const Lf = lifeState(); if (state.over) return;
  Lf.age += 1 / AGE_DAYS;
  // утримання розкоші, медицина, освіта
  const lux = sum(Lf.lux, (x) => LUXURY[x.kind].upkeep) * priceLvl() * (Lf.partner && Lf.partner.trait === 'spender' ? 1.3 : 1);
  if (lux) book('luxury', -lux);
  if (MEDICAL[Lf.medical].cost) book('family', -MEDICAL[Lf.medical].cost * priceLvl());
  for (const k of Lf.kids) {
    const a = kidAge(k);
    if (a < 22) { const E = EDU[k.edu]; if (E.cost) book('family', -E.cost * priceLvl()); }
    if (a >= 6 && a < 24) { const g = EDU[k.edu].gain / AGE_DAYS * 6 * CHILD_TRAITS[k.trait].skill * (Lf.partner && Lf.partner.trait === 'business' ? 1.2 : 1); k.skills.business = Math.min(5, k.skills.business + g * 0.6); k.skills.management = Math.min(5, k.skills.management + g * 0.5); k.skills.coding = Math.min(5, k.skills.coding + g * 0.3); }
    if (k.intern && a >= 18) { k.skills.management = Math.min(5, k.skills.management + 0.01); k.skills.business = Math.min(5, k.skills.business + 0.008); }
    if (CHILD_TRAITS[k.trait].spend && a >= 16) book('family', -400 * priceLvl());
    if (a >= 16 && k.trait === 'playboy' && chance(0.002)) { news(`📸 Таблоїди: ${k.name}, спадкоємець(-иця) ${state.company}, знову в центрі скандалу.`, 'city', 'bad'); if (typeof applyReputation === 'function') applyReputation('player', -1); }
  }
  // стрес: навантаження, загрози; щастя: родина, розкіш
  const units = state.biz.length + state.fac.length + (state.corp ? state.corp.divs.length : 0);
  const unmanaged = state.biz.filter((b) => !b.manager).length + state.fac.filter((f) => !f.manager).length;
  const restFx = sum(Lf.lux, (x) => LUXURY[x.kind].rest || 0) * 3;
  const sT = clamp(10 + unmanaged * 2 + Math.sqrt(units) * 2 + (state.cash < 0 ? 25 : 0) + (state.crime && state.crime.demands.length ? 10 : 0) - (Lf.partner && Lf.partner.trait === 'caring' ? 8 : 0) - restFx - (state.hq ? 5 : 0), 0, 100);
  Lf.stress = clamp(Lf.stress + (sT - Lf.stress) * 0.03, 0, 100);
  const hT = clamp(96 - Math.max(0, Lf.age - 40) * 1.3 - Lf.stress * 0.25 + MEDICAL[Lf.medical].h, 5, 100);
  Lf.health = clamp(Lf.health + (hT - Lf.health) * 0.02, 0, 100);
  const happyT = clamp(40 + (Lf.partner ? 15 : 0) + Math.min(15, Lf.kids.length * 5) + Math.min(20, sum(Lf.lux, (x) => LUXURY[x.kind].happy) * 0.4) - Lf.stress * 0.3 + (Lf.health - 60) * 0.2, 0, 100);
  Lf.happy = clamp(Lf.happy + (happyT - Lf.happy) * 0.03, 0, 100);
  // хвороби
  if (chance(0.002 + Math.max(0, Lf.age - 50) * 0.0002 + Lf.stress * 0.00003)) {
    const dmg = ri(8, 25); Lf.health = Math.max(1, Lf.health - dmg);
    const bill = Math.round(rnd(1, 5) * 1e4 * priceLvl() * (1 + Lf.medical)); book('family', -bill);
    log(`🤒 ${state.me.name} захворів(-ла): здоров’я −${dmg}. Лікування ${money(bill)}.`, 'bad');
  }
  // партнер і діти
  const P = Lf.partner;
  if (P) {
    const pT = 55 + sum(Lf.lux, (x) => LUXURY[x.kind].happy) * (P.trait === 'spender' ? 0.4 : 0.15) + Lf.kids.length * 3 - Lf.stress * 0.35;
    P.happy = clamp(P.happy + (pT - P.happy) * 0.01, 0, 100);
    if (P.happy < 15 && chance(0.01)) { news(`💔 ${P.name} подає на розлучення.`, 'city', 'bad'); divorce(); }
    else if (Lf.age < 55 && ageOf(P.born) < 45 && P.happy > 35 && Lf.kids.length < 6 && chance(0.35 / AGE_DAYS)) {
      const boy = chance(0.5), k = { id: 'kid' + (Lf.seq++), name: `${pick(boy ? MASC : FEM)} ${lastName()}`, boy, born: state.day, edu: 0, trait: pick(Object.keys(CHILD_TRAITS)), skills: { business: 0, management: 0, coding: 0 }, look: randLook() };
      Lf.kids.push(k); Lf.happy = Math.min(100, Lf.happy + 10);
      news(`👶 У родині ${state.me.name} поповнення: народився(-лась) ${k.name}.`, 'city', 'good');
      checkAchievements();
    }
  }
  // смерть
  const risk = (Lf.health < 8 ? 0.01 : 0) + (Lf.age > 60 ? 0.00003 * Math.pow(Lf.age - 60, 2) * (1 + Math.max(0, 50 - Lf.health) / 25) : 0);
  if (chance(risk)) succession('death');
}

HOOKS.day.push(lifeDaily);
