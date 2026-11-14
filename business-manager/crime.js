'use strict';
/* БІЗНЕС ІМПЕРІЯ — кримінальний світ і безпека (ігрова абстракція).
   Незалежні угруповання з босами, територіями, силою й «жаром» (увагою поліції); вимагання,
   шантаж, саботаж, крадіжки; війни, злиття й розгром угруповань; поліція міст.
   Захист: особиста охорона, служба безпеки (СБ), рівні охорони об’єктів, кібербезпека, страхування.
   Будь-які незаконні дії мають ризики: розслідування, суд, штрафи, удар по репутації. */

const GANG_NAMES = ['Чорні Круки', 'Портові', 'Сірі Вовки', 'Брати Залізняки', 'Нічна Зміна', 'Клан Скорпіона', 'Синдикат «Туман»', 'Північні'];
const GANG_BOSSES = ['«Бульдог»', '«Професор»', '«Тихий»', '«Кривий»', '«Дантист»', '«Кардинал»', '«Шрам»', '«Механік»', '«Лис»'];
const GUARD_TIERS = [
  { name: 'Без охорони', cost: 0, prot: 0 },
  { name: 'Водій-охоронець', cost: 600, prot: 0.25 },
  { name: 'Особиста охорона (3 особи)', cost: 2500, prot: 0.5 },
  { name: 'Елітна служба захисту', cost: 9000, prot: 0.8 },
];
const SEC_LEVELS = [
  { name: 'Немає', cost: 0, prot: 0 },
  { name: 'Сигналізація', cost: 60, prot: 0.3 },
  { name: 'Камери + охоронець', cost: 220, prot: 0.55 },
  { name: 'Цілодобова охорона', cost: 650, prot: 0.8 },
];
const CSO_LEVELS = [
  { name: 'Немає', cost: 0, inv: 0 },
  { name: 'Відділ безпеки', cost: 3000, inv: 0.3 },
  { name: 'Служба безпеки', cost: 9000, inv: 0.55 },
  { name: 'Корпоративна розвідка', cost: 25000, inv: 0.8 },
];
const CYBER_LEVELS = [
  { name: 'Базовий антивірус', cost: 0, prot: 0.1 },
  { name: 'SOC-моніторинг', cost: 1500, prot: 0.45 },
  { name: 'Захист банківського рівня', cost: 6000, prot: 0.8 },
];
const INSURANCE = [
  { name: 'Без страховки', rate: 0, cover: 0 },
  { name: 'Базова', rate: 0.00004, cover: 0.5 },
  { name: 'Розширена', rate: 0.00008, cover: 0.8 },
  { name: 'Повна', rate: 0.00014, cover: 0.95 },
];

function crimeState() {
  if (state.crime) return state.crime;
  const cities = Object.keys(CITIES);
  const gangs = GANG_NAMES.slice(0, 6).map((name, i) => {
    const turf = {};
    for (const c of cities) if (chance(0.45)) turf[c] = +rnd(0.1, 0.5).toFixed(2);
    if (!Object.keys(turf).length) turf[pick(cities)] = 0.3;
    return { id: uid(), name, boss: GANG_BOSSES[i], power: Math.round(rnd(20, 70)), heat: Math.round(rnd(0, 30)), cash: Math.round(rnd(1, 8)) * 1e6, turf, alive: true, born: 0, hiredBy: null };
  });
  for (const c of cities) if (!gangs.some((g) => (g.turf[c] || 0) >= 0.15)) pick(gangs).turf[c] = +rnd(0.2, 0.35).toFixed(2);
  state.crime = {
    gangs, police: Object.fromEntries(cities.map((c) => [c, +rnd(0.35, 0.75).toFixed(2)])), policeBase: null,
    guard: 0, cso: 0, cyber: 0, insurance: 0, demands: [], incidents: [], cases: [], offers: [], protected: {}, threat: 0, blackmail: null, seq: 1,
  };
  return state.crime;
}
const aliveGangs = () => crimeState().gangs.filter((g) => g.alive);
const cityIdOf = (C) => (typeof C === 'string' ? C : Object.keys(CITIES).find((k) => CITIES[k] === C) || state.city);
/** Кримінальний індекс міста 0…1: сила угруповань на території мінус поліція. */
function crimeIndex(cid) {
  const K = crimeState();
  const g = sum(aliveGangs(), (x) => (x.turf[cid] || 0) * x.power / 100);
  return clamp(g * (1.2 - K.police[cid]), 0, 1);
}
const crimeTraffic = (C) => (state.crime ? 1 - 0.12 * crimeIndex(cityIdOf(C)) : 1);
const unitCity = (u) => lotCityId(lotOf(u));
const unitName = (u) => u.name;
const allUnits = () => [...state.biz, ...state.fac];
const unitSec = (u) => SEC_LEVELS[u.sec || 0];
function strongestGang(cid) {
  let best = null, bv = 0;
  for (const g of aliveGangs()) { const v = (g.turf[cid] || 0) * g.power; if (v > bv) { bv = v; best = g; } }
  return best;
}
function incident(text, kind = 'bad', loss = 0) {
  const K = crimeState();
  K.incidents.unshift({ day: state.day, text, loss });
  if (K.incidents.length > 60) K.incidents.length = 60;
  if (loss > 0) {
    book('crimeLoss', -loss);
    const cov = INSURANCE[K.insurance].cover;
    if (cov > 0) { const pay = Math.round(loss * cov); book('insurancePay', pay); text += ` Страховка відшкодувала ${moneyK(pay)}.`; }
  }
  log(text, kind);
  news(text, 'crime', kind);
}

// ---------- Дії гравця ----------
function setGuard(i) { crimeState().guard = i; log(`🛡️ Особиста охорона: ${GUARD_TIERS[i].name}.`); }
function setCSO(i) { crimeState().cso = i; log(`🕵️ Корпоративна безпека: ${CSO_LEVELS[i].name}.`); }
function setCyber(i) { crimeState().cyber = i; log(`💻 Кібербезпека: ${CYBER_LEVELS[i].name}.`); }
function setInsurance(i) { crimeState().insurance = i; log(`📄 Страхування бізнесу: ${INSURANCE[i].name}.`); }
function setUnitSec(id, lvl) { const u = allUnits().find((x) => x.id === id); if (u) u.sec = lvl; }
function setAllSec(lvl) { for (const u of allUnits()) u.sec = lvl; log(`🛡️ Охорона всіх об’єктів: ${SEC_LEVELS[lvl].name}.`); }
const assetsValue = () => sum(state.biz, (b) => b.bookVal || b.invested || 0) + sum(state.fac, (f) => f.invested || FACILITIES[f.kind].setup);
function securityCostDaily() {
  const K = crimeState();
  return (GUARD_TIERS[K.guard].cost + CSO_LEVELS[K.cso].cost + CYBER_LEVELS[K.cyber].cost + sum(allUnits(), (u) => unitSec(u).cost)) * priceLvl();
}
const insuranceCostDaily = () => assetsValue() * INSURANCE[crimeState().insurance].rate * (1 + crimeIndexAvg());
function crimeIndexAvg() { const cs = Object.keys(state.unlocked || { [state.city]: 1 }); return cs.length ? sum(cs, crimeIndex) / cs.length : 0; }

/** Відповідь на вимогу: pay / refuse / report. */
function answerDemand(id, how) {
  const K = crimeState(), d = K.demands.find((x) => x.id === id); if (!d) return;
  const g = K.gangs.find((x) => x.id === d.gang); K.demands = K.demands.filter((x) => x !== d);
  if (how === 'pay') {
    if (state.cash < d.amount) return toast('Недостатньо коштів.', 'bad');
    book('crimeLoss', -d.amount); if (g) { g.cash += d.amount; g.power = Math.min(100, g.power + 1); }
    K.protected[d.unit] = state.day + 60;
    log(`💸 Ви заплатили «${g ? g.name : '?'}» ${money(d.amount)}. Об’єкт тимчасово не чіпатимуть, але угруповання сильнішає.`, 'bad');
    if (chance(0.15)) policeCase('player', 'фінансування злочинного угруповання', d.amount * 2);
  } else if (how === 'report') {
    const cid = d.city, p = clamp(K.police[cid] * 0.7 + CSO_LEVELS[K.cso].inv * 0.4, 0.05, 0.95);
    if (g && chance(p)) {
      g.power = Math.max(5, g.power - ri(10, 25)); g.heat += 25; g.turf[cid] = Math.max(0, (g.turf[cid] || 0) - 0.1);
      incident(`🚓 Поліція ${CITIES[cid].name} за вашою заявою затримала членів «${g.name}». Угруповання ослаблене.`, 'good');
      if (typeof applyReputation === 'function') applyReputation('player', 1);
    } else { K.threat += 2; log(`🚓 Заява в поліцію не дала результату. «${g ? g.name : '?'}» погрожує помстою.`, 'bad'); if (g) g.grudge = (g.grudge || 0) + 2; }
  } else {
    if (g) g.grudge = (g.grudge || 0) + 1;
    log(`✋ Ви відмовились платити «${g ? g.name : '?'}». Посильте охорону об’єкта.`);
  }
}
function answerBlackmail(how) {
  const K = crimeState(), b = K.blackmail; if (!b) return;
  K.blackmail = null;
  if (how === 'pay') { if (state.cash < b.amount) return toast('Недостатньо коштів.', 'bad'); book('crimeLoss', -b.amount); log('💸 Ви заплатили шантажисту. Гарантій немає.', 'bad'); if (chance(0.3)) K.blackmailAgain = state.day + 30; }
  else if (how === 'report') {
    if (chance(0.5 + CSO_LEVELS[K.cso].inv * 0.4)) { incident('🚓 Шантажиста затримано. Справа закрита, інформація не потрапила в пресу.', 'good'); }
    else { leak(b.what); }
  } else leak(b.what);
}
function leak(what) {
  if (typeof pubNews === 'function') pubNews(`🔓 Витік: у пресу потрапили відомості про ${what} у ${state.company}.`, 'business', 'bad', { breaking: true, target: 'player', impact: -3 });
}
/** Сумнівна «сіра» угода: швидкі гроші й ризик кримінальної справи. */
function answerOffer(id, accept) {
  const K = crimeState(), o = K.offers.find((x) => x.id === id); if (!o) return;
  K.offers = K.offers.filter((x) => x !== o);
  if (!accept) return log('Ви відмовились від сумнівної угоди.');
  book('b2b', o.gain);
  log(`📦 Угоду проведено: +${money(o.gain)}. Ризик перевірки — ${Math.round(o.risk * 100)}%.`, 'bad');
  K.pendingRisk = (K.pendingRisk || []); K.pendingRisk.push({ day: state.day + ri(10, 60), risk: o.risk, gain: o.gain, what: o.what });
}
/** Кримінальна/адміністративна справа: суд — штраф і репутація. Рівні правила для всіх. */
function policeCase(target, what, base) {
  const K = crimeState();
  const c = { id: K.seq++, target, what, opened: state.day, decide: state.day + ri(20, 45), base: Math.round(base), outcome: null };
  K.cases.unshift(c); if (K.cases.length > 40) K.cases.length = 40;
  news(`🚔 Відкрито розслідування щодо ${target === 'player' ? state.company : (coById(target) || {}).name}: ${what}.`, 'crime', target === 'player' ? 'bad' : '');
}
function decidePoliceCase(c) {
  const lawyers = c.target === 'player' && state.gov ? state.gov.lawFirm : 1;
  const guilty = chance(0.6 - lawyers * 0.08);
  const fine = Math.round(c.base * (guilty ? rnd(1, 2) : 0));
  c.outcome = guilty ? `Винні. Штраф ${moneyK(fine)}` : 'Виправдано';
  if (c.target === 'player') {
    if (guilty) { book('fines', -fine); if (state.gov) state.gov.violations.player++; if (typeof applyReputation === 'function') applyReputation('player', -2); }
    log(`⚖️ Суд у справі «${c.what}»: ${c.outcome}.`, guilty ? 'bad' : 'good');
  } else { const co = coById(c.target); if (co && guilty) { co.cash -= fine; if (typeof applyReputation === 'function') applyReputation(co.id, -2); } }
  news(`⚖️ Суд: ${c.target === 'player' ? state.company : (coById(c.target) || {}).name} — ${c.what}. ${c.outcome}.`, 'crime');
}

// ---------- Щоденна симуляція ----------
function crimeDaily() {
  const K = crimeState();
  // Витрати на безпеку й страховку
  const sc = securityCostDaily(); if (sc > 0) book('security', -sc);
  const ic = insuranceCostDaily(); if (ic > 0) book('insurance', -ic);
  // Поліція: бюджет держави й рівень злочинності
  if (!K.policeBase) K.policeBase = { ...K.police };
  const bal = state.gov ? state.gov.budget.balance : 0;
  for (const c of Object.keys(K.police)) {
    const target = (K.policeBase[c] || 0.5) + (bal > 0 ? 0.05 : -0.05) + (state.pol && state.pol.lawOrder ? 0.1 : 0) + crimeIndex(c) * 0.1;
    K.police[c] = clamp(K.police[c] + (target - K.police[c]) * 0.01, 0.15, 0.95);
  }
  // Угруповання: ріст, жар, розгроми, війни, злиття
  for (const g of aliveGangs()) {
    g.cash += g.power * 2000; g.heat = Math.max(0, g.heat - 0.4);
    for (const c of Object.keys(g.turf)) g.turf[c] = clamp(g.turf[c] + (g.power / 100 * 0.6 - K.police[c] * 0.5) * 0.001, 0.03, 0.9);
    if (chance(0.0006 * g.heat)) {
      const c = Object.keys(g.turf).sort((a, b) => g.turf[b] - g.turf[a])[0];
      if (chance(K.police[c])) { g.power = Math.round(g.power * 0.4); g.heat = 0; news(`🚔 Масштабна операція поліції: розгромлено осередки «${g.name}», бос ${g.boss} ${chance(0.5) ? 'заарештований' : 'у розшуку'}.`, 'crime', 'good', true); }
    }
    if (g.power < 8) { g.alive = false; news(`🕳️ Угруповання «${g.name}» припинило існування.`, 'crime'); }
  }
  if (chance(0.01)) {
    const gs = aliveGangs();
    if (gs.length >= 2) {
      const [a, b] = [pick(gs), pick(gs)];
      if (a !== b) {
        const shared = Object.keys(a.turf).filter((c) => b.turf[c]);
        if (shared.length) {
          if (chance(0.3)) { // злиття
            const [big, small] = a.power >= b.power ? [a, b] : [b, a];
            for (const c of Object.keys(small.turf)) big.turf[c] = Math.min(0.9, (big.turf[c] || 0) + small.turf[c] * 0.7);
            big.power = Math.min(100, big.power + small.power * 0.5); small.alive = false;
            news(`🤝 Кримінальний світ: «${small.name}» увійшли до складу «${big.name}».`, 'crime');
          } else { // війна
            const c = pick(shared), win = a.power * rnd(0.6, 1.4) > b.power * rnd(0.6, 1.4) ? a : b, lose = win === a ? b : a;
            win.turf[c] = Math.min(0.9, win.turf[c] + 0.1); lose.turf[c] = Math.max(0, lose.turf[c] - 0.15); lose.power = Math.max(5, lose.power - ri(5, 15)); win.heat += 10; lose.heat += 10;
            K.police[c] = Math.min(0.95, K.police[c] + 0.02);
            news(`💥 ${CITIES[c].name}: війна угруповань «${a.name}» і «${b.name}». Перемогли «${win.name}».`, 'crime', 'bad', true);
          }
        }
      }
    }
  }
  if (aliveGangs().length < 4 && chance(0.01)) {
    const name = pick(GANG_NAMES.filter((n) => !K.gangs.some((g) => g.alive && g.name === n))) || 'Нове угруповання';
    const c = pick(Object.keys(CITIES));
    K.gangs.push({ id: uid(), name, boss: pick(GANG_BOSSES), power: ri(15, 35), heat: 0, cash: 1e6, turf: { [c]: 0.2 }, alive: true, born: state.day });
    news(`🆕 ${CITIES[c].name}: з’явилось нове угруповання «${name}».`, 'crime');
  }
  // Загрози бізнесу гравця
  const guard = GUARD_TIERS[K.guard].prot;
  for (const u of allUnits()) {
    const cid = unitCity(u), ci = crimeIndex(cid), prot = unitSec(u).prot;
    const g = strongestGang(cid); if (!g) continue;
    const protectedNow = (K.protected[u.id] || 0) > state.day;
    // Вимагання
    if (!protectedNow && !K.demands.some((d) => d.unit === u.id) && chance(0.015 * ci * (1 - prot))) {
      const amount = Math.round(rnd(0.5, 2) * (u.products ? 8000 : 25000) * priceLvl() * (1 + g.power / 100));
      K.demands.push({ id: uid(), gang: g.id, unit: u.id, city: cid, amount, until: state.day + 7 });
      log(`📞 «${g.name}» (бос ${g.boss}) вимагає ${money(amount)} за «спокій» для «${u.name}». Термін — 7 днів.`, 'bad');
    }
    // Крадіжки / саботаж (частіше після відмови й при образі угруповання)
    const p = 0.006 * ci * (1 - prot) * (1 + (g.grudge || 0)) * (protectedNow ? 0.1 : 1);
    if (chance(p)) attackUnit(u, g, null);
  }
  for (const g of aliveGangs()) if (g.grudge) g.grudge = Math.max(0, g.grudge - 0.02);
  // Прострочені вимоги = відмова
  for (const d of [...K.demands]) if (d.until <= state.day) { answerDemand(d.id, 'refuse'); }
  // ІІ-конкуренти наймають угруповання проти гравця; СБ може розслідувати
  for (const co of aliveCos()) {
    if (isSub(co) || (co.rivalry || 0) < 0.75 || co.strat !== 'raider' && co.strat !== 'discount') continue;
    if (!chance(0.003)) continue;
    const units = allUnits(); if (!units.length) break;
    const u = pick(units), g = strongestGang(unitCity(u)); if (!g) continue;
    co.cash -= 5e5; g.cash += 5e5;
    if (chance(1 - unitSec(u).prot)) attackUnit(u, g, co);
    if (chance(0.15 + CSO_LEVELS[K.cso].inv * 0.6)) {
      incident(`🕵️ Ваша служба безпеки встановила: напад на «${u.name}» замовила «${co.name}». Матеріали передано поліції.`, 'good');
      policeCase(co.id, 'замовлення злочину проти конкурента', 5e6 * priceLvl());
    }
  }
  // Кібератаки на рахунки
  if (chance(0.002 * (1 - CYBER_LEVELS[K.cyber].prot)) && state.cash > 1e5) {
    const loss = Math.round(Math.min(state.cash * 0.03, 2e6 * priceLvl()));
    incident(`💻 Кібератака: зловмисники вивели ${moneyK(loss)} з корпоративного рахунку.`, 'bad', loss);
    if (chance(0.3)) leak('внутрішнє листування');
  }
  // Шантаж (якщо є «скелети»)
  const skeletons = (state.media && state.media.sued > 0) || (state.gov && state.gov.violations.player > 0) || (K.pendingRisk && K.pendingRisk.length);
  if (!K.blackmail && skeletons && chance(0.003 * (1 - guard * 0.5))) {
    const what = pick(['сумнівні угоди', 'приховані порушення', 'особисте листування', 'схеми з підрядниками']);
    K.blackmail = { what, amount: Math.round(rnd(1, 3) * 5e5 * priceLvl()), until: state.day + 5 };
    log(`✉️ Анонім погрожує оприлюднити ${what}, якщо не отримає ${money(K.blackmail.amount)}.`, 'bad');
  }
  if (K.blackmail && K.blackmail.until <= state.day) answerBlackmail('ignore');
  // Замах/погрози власнику — лише якщо охорона слабка
  if (chance(0.0004 * crimeIndexAvg() * (1 - guard))) {
    const loss = Math.round(rnd(0.2, 1) * 1e6 * priceLvl());
    incident(`⚠️ Напад на автомобіль власника ${state.company}. Обійшлося без жертв, але збитки ${moneyK(loss)}. Подумайте про охорону.`, 'bad', loss);
  }
  // Сірі пропозиції
  if (K.offers.length < 2 && chance(0.01) && aliveGangs().length) {
    const g = pick(aliveGangs()), gain = Math.round(rnd(0.5, 3) * 1e6 * priceLvl());
    K.offers.push({ id: uid(), gang: g.id, what: pick(['партія товару без документів', 'складські послуги без питань', 'перевезення «особливого» вантажу']), gain, risk: +rnd(0.25, 0.6).toFixed(2), until: state.day + 5 });
  }
  K.offers = K.offers.filter((o) => o.until > state.day);
  // Наслідки сірих угод
  if (K.pendingRisk) for (const r of [...K.pendingRisk]) if (r.day <= state.day) {
    K.pendingRisk = K.pendingRisk.filter((x) => x !== r);
    if (chance(r.risk)) policeCase('player', `незаконна угода (${r.what})`, r.gain * 2);
  }
  for (const c of K.cases) if (!c.outcome && c.decide <= state.day) decidePoliceCase(c);
  K.threat = Math.max(0, K.threat - 0.05);
}

function attackUnit(u, g, by) {
  const K = crimeState(), isFac = !u.products;
  const who = by ? ` (замовник — невідомий)` : '';
  if (!isFac && chance(0.6)) { // крадіжка товару
    let loss = 0;
    for (const p of Object.values(u.products)) { const n = Math.floor(p.stock * rnd(0.2, 0.5)); loss += n * p.cost; p.stock -= n; }
    if (loss > 0) incident(`🦹 «${u.name}»: крадіжка товару${who}. Збитки ${moneyK(loss)}.`, 'bad', loss);
  } else if (isFac) { // саботаж обладнання
    u.broken = Math.max(u.broken || 0, ri(2, 5)); u.cond = Math.max(10, (u.cond || 100) - 25);
    incident(`🔥 Саботаж на «${u.name}»${who}: обладнання пошкоджено, простій ${u.broken} дн.`, 'bad', Math.round(FACILITIES[u.kind].setup * 0.01 * priceLvl()));
  } else { // пошкодження майна
    u.rep = Math.max(0, u.rep - 5);
    incident(`🧱 «${u.name}»: пошкоджено вітрини й майно${who}.`, 'bad', Math.round(rnd(5000, 30000) * priceLvl()));
  }
  g.heat += 3;
  // Поліцейське розслідування
  if (chance(crimeState().police[unitCity(u)] * 0.4)) { g.power = Math.max(5, g.power - 3); news(`🚓 Поліція затримала підозрюваних у нападі на «${u.name}» (угруповання «${g.name}»).`, 'crime', 'good'); }
}

HOOKS.day.push(crimeDaily);
