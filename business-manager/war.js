'use strict';
/* БІЗНЕС ІМПЕРІЯ — корпоративні війни (Ultimate 3.0, етап 3, частина 2).
   Альянси, картелі (з ризиком антимонопольної справи), корпоративне шпигунство як ігрова механіка,
   судові позови, економічні блокади, біржові атаки (короткі продажі) з ризиком розслідування за маніпуляції.
   ІІ-компанії користуються тими самими інструментами, зокрема проти гравця. */

const SPY_GOALS = {
  intel: { name: 'Розвідка (стратегія, фінанси, плани)', icon: '🔍', cost: 150000, p: 0.75, risk: 0.15 },
  tech: { name: 'Викрадення технологій', icon: '🧪', cost: 600000, p: 0.45, risk: 0.35 },
  clients: { name: 'Переманювання ключових клієнтів', icon: '🤝', cost: 400000, p: 0.55, risk: 0.25 },
};
const SUIT_TYPES = {
  patent: { name: 'Порушення патенту', base: 0.55 },
  unfair: { name: 'Недобросовісна конкуренція', base: 0.45 },
  espionage: { name: 'Корпоративне шпигунство', base: 0.6 },
  defamation: { name: 'Наклеп і ділова репутація', base: 0.5 },
  contract: { name: 'Порушення договору', base: 0.5 },
};

function warState() {
  if (state.war) return state.war;
  state.war = { alliances: [], aiAlliances: [], cartels: [], intel: {}, suits: [], blockades: [], shorts: [], incidents: [], seq: 1 };
  return state.war;
}
const W_ = () => warState();
const isAlly = (coId) => warState().alliances.some((a) => a.co === coId);
function warLog(text, kind = '') { const W = warState(); W.incidents.unshift({ day: state.day, text }); if (W.incidents.length > 60) W.incidents.length = 60; log(text, kind); }
const lawPower = () => (state.gov ? state.gov.lawFirm : 0) + state.depts.legal * 0.3;
const csoInv = () => (state.crime ? CSO_LEVELS[state.crime.cso].inv : 0);

// ---------- Альянси ----------
function allianceFee(co) { return Math.round(SECTORS[co.sector].rev * co.scale * 0.3 * priceLvl()); }
function proposeAlliance(coId) {
  const co = coById(coId); if (!co || isSub(co) || isAlly(coId)) return;
  const fee = allianceFee(co) * 10; if (state.cash < fee) return toast(`Внесок у спільні проєкти: ${moneyK(fee)}.`, 'bad');
  const p = clamp(0.65 - (co.rivalry || 0) * 0.8 + (state.media ? (state.media.corpRep - 50) / 200 : 0) + (co.strat === 'conservative' ? 0.15 : co.strat === 'raider' ? -0.25 : 0), 0.05, 0.9);
  if (!chance(p)) { co.rivalry = Math.min(1, (co.rivalry || 0) + 0.05); return warLog(`🤝 «${co.name}» відхилила пропозицію альянсу.`, 'bad'); }
  book('corpwar', -fee);
  warState().alliances.push({ co: coId, since: state.day });
  co.rivalry = 0;
  news(`🤝 ${state.company} і «${co.name}» оголосили стратегічний альянс (спільні R&D і закупівлі).`, 'corp', 'good');
}
function breakAlliance(coId) {
  const W = warState(), co = coById(coId);
  W.alliances = W.alliances.filter((a) => a.co !== coId);
  if (co) { co.rivalry = Math.min(1, (co.rivalry || 0) + 0.3); news(`💔 Альянс ${state.company} і «${co.name}» розірвано.`, 'corp'); }
}

// ---------- Картелі ----------
/** Картель — змова про ціни. Вигідно, але незаконно: АМКУ може відкрити справу щодо всіх учасників. */
function proposeCartel(sector) {
  const W = warState();
  if (W.cartels.some((k) => k.sector === sector && k.members.includes('player'))) return;
  const rivals = aliveCos().filter((c) => c.sector === sector && !isSub(c));
  if (rivals.length < 2) return toast('Замало гравців на ринку.', 'bad');
  const joined = rivals.filter((c) => chance(clamp(0.5 - (c.rivalry || 0) * 0.6 + (c.strat === 'conservative' ? 0.2 : 0) - (c.strat === 'discount' ? 0.3 : 0), 0.05, 0.85)));
  if (joined.length < 2) return warLog(`🤫 Конкуренти в галузі «${SECTORS[sector].name}» відмовились від змови.`);
  W.cartels.push({ id: W.seq++, sector, members: ['player', ...joined.map((c) => c.id)], since: state.day, caseId: null });
  for (const c of joined) c.cartel = true;
  warLog(`🤫 Таємна домовленість про ціни в галузі «${SECTORS[sector].name}» з ${joined.map((c) => c.name).join(', ')}. Ризик антимонопольної справи!`, 'bad');
  applyCartelMods();
}
function leaveCartel(id, leniency) {
  const W = warState(), k = W.cartels.find((x) => x.id === id); if (!k) return;
  k.members = k.members.filter((m) => m !== 'player');
  if (leniency) {
    // програма поблажливості: перший, хто зізнався, звільняється від штрафу; іншим — справа
    for (const m of k.members) { const co = coById(m); if (co) { co.cartel = false; const fine = Math.round(annualTurnover(m) * 0.06); co.cash -= fine; if (typeof applyReputation === 'function') applyReputation(m, -2); } }
    news(`⚖️ ${state.company} повідомила АМКУ про картель у галузі «${SECTORS[k.sector].name}» і отримала імунітет. Учасників оштрафовано.`, 'econ', 'good', true);
    W.cartels = W.cartels.filter((x) => x !== k);
  } else if (k.members.length < 2) W.cartels = W.cartels.filter((x) => x !== k);
  applyCartelMods();
}
function applyCartelMods() {
  state.mods = state.mods.filter((m) => !m.cartel);
  for (const k of warState().cartels) if (k.members.includes('player') && TYPES[k.sector]) state.mods.push({ kind: 'pricewar', key: k.sector, mult: 0.6, days: 99999, cartel: true, label: `🤫 Картель: ${SECTORS[k.sector].name}` });
}

// ---------- Шпигунство ----------
function spy(coId, goal) {
  const co = coById(coId), G = SPY_GOALS[goal]; if (!co || !G) return;
  const cost = Math.round(G.cost * priceLvl()); if (state.cash < cost) return toast(`Операція коштує ${moneyK(cost)}.`, 'bad');
  book('corpwar', -cost);
  const W = warState(), targetSec = co.sec == null ? (co.sec = +rnd(0.1, 0.6).toFixed(2)) : co.sec;
  const ok = chance(clamp(G.p + csoInv() * 0.2 - targetSec * 0.3, 0.05, 0.95));
  if (ok) {
    if (goal === 'intel') { W.intel[coId] = { day: state.day, cash: co.cash, debt: co.debt, strat: co.strat, tech: co.tech, rivalry: co.rivalry, plan: co.actions && co.actions[0], target: co.targetCo || null }; warLog(`🔍 Розвідка «${co.name}»: отримано фінанси, стратегію й плани.`, 'good'); }
    if (goal === 'tech') { const g = Math.max(1, Math.round((co.tech || 0) * 0.5)); state.tech.points += g * 40; warLog(`🧪 Отримано технологічні напрацювання «${co.name}»: +${g * 40} очок досліджень.`, 'good'); }
    if (goal === 'clients') { co.pr = Math.max(0, (co.pr || 50) - 5); co.cash -= SECTORS[co.sector].rev * co.scale * 3; book('b2b', SECTORS[co.sector].rev * co.scale * 2 * priceLvl()); warLog(`🤝 Переманено ключових клієнтів «${co.name}».`, 'good'); }
  } else warLog(`🕵️ Операція проти «${co.name}» не вдалася.`, 'bad');
  if (chance(G.risk + (ok ? 0 : 0.15) + targetSec * 0.2)) {
    co.rivalry = Math.min(1, (co.rivalry || 0) + 0.4);
    news(`🕵️ Викрито корпоративне шпигунство: ${state.company} проти «${co.name}».`, 'business', 'bad', true);
    if (typeof applyReputation === 'function') applyReputation('player', -2);
    fileSuit(co.id, 'player', 'espionage', Math.round(G.cost * 8 * priceLvl()));
    if (typeof policeCase === 'function' && chance(0.4)) policeCase('player', 'корпоративне шпигунство', G.cost * 5 * priceLvl());
  }
}

// ---------- Суди ----------
function suitCost(claim) { return Math.round(Math.max(50000 * priceLvl(), claim * 0.03)); }
function fileSuit(plaintiff, defendant, type, claim) {
  const W = warState();
  if (W.suits.some((s) => s.plaintiff === plaintiff && s.defendant === defendant && s.type === type && !s.outcome)) return null;
  const s = { id: 'C-' + (W.seq++), plaintiff, defendant, type, claim: Math.round(claim), filed: state.day, decide: state.day + ri(25, 60), outcome: null, evidence: 0 };
  W.suits.unshift(s); if (W.suits.length > 50) W.suits.length = 50;
  const pn = coName2(plaintiff), dn = coName2(defendant);
  news(`⚖️ Позов: ${pn} проти ${dn} — ${SUIT_TYPES[type].name}, сума ${moneyK(claim)}.`, 'business', defendant === 'player' ? 'bad' : '');
  if (defendant === 'player') log(`⚖️ «${pn}» подала проти вас позов (${SUIT_TYPES[type].name}) на ${money(claim)}. Рішення ≈ день ${s.decide}.`, 'bad');
  return s;
}
const coName2 = (id) => (id === 'player' ? state.company : (coById(id) || {}).name || id);
/** Підстави для позову гравця проти компанії. */
function suitGrounds(coId) {
  const co = coById(coId), g = [];
  if (!co) return g;
  if (state.corp && state.corp.drugs.some((x) => x.copied === coId)) g.push('patent');
  if ((state.tech.retail + state.tech.industry + state.tech.it) > (co.tech || 0) * 2 && co.strat === 'innovator') g.push('patent');
  if ((co.rivalry || 0) > 0.5) g.push('unfair');
  if (warState().incidents.some((i) => i.by === coId)) g.push('espionage');
  if (state.media && state.media.campaigns.some((c) => c.by === coId && c.target === 'player')) g.push('defamation');
  return [...new Set(g)];
}
function sue(coId, type) {
  const co = coById(coId); if (!co) return;
  const claim = Math.round(Math.max(1e6 * priceLvl(), SECTORS[co.sector].rev * co.scale * 20 * priceLvl()));
  const c = suitCost(claim); if (state.cash < c) return toast(`Судовий збір і юристи: ${moneyK(c)}.`, 'bad');
  book('corpwar', -c);
  const s = fileSuit('player', coId, type, claim);
  if (s) s.grounded = suitGrounds(coId).includes(type);
}
function decideSuit(s) {
  const courts = state.gov ? state.gov.ministries.courts.strict : 0.5;
  let p = SUIT_TYPES[s.type].base + (s.grounded ? 0.25 : -0.2) + (courts - 0.5) * 0.1;
  if (s.plaintiff === 'player') p += lawPower() * 0.05;
  if (s.defendant === 'player') p -= lawPower() * 0.06;
  const win = chance(clamp(p, 0.05, 0.9));
  const award = win ? Math.round(s.claim * rnd(0.3, 1)) : 0;
  s.outcome = win ? `Позов задоволено: ${moneyK(award)}` : 'У позові відмовлено';
  const pay = (from, to, amt) => {
    if (from === 'player') book('fines', -amt); else { const co = coById(from); if (co) co.cash -= amt; }
    if (to === 'player') book('legal', amt); else { const co = coById(to); if (co) co.cash += amt; }
  };
  if (win) pay(s.defendant, s.plaintiff, award);
  else pay(s.plaintiff, s.defendant, Math.round(s.claim * 0.03)); // відшкодування судових витрат
  if (win && s.type === 'patent' && s.plaintiff === 'player' && state.corp) for (const x of state.corp.drugs) if (x.copied === s.defendant) x.copied = null;
  news(`⚖️ Суд у справі ${s.id} (${coName2(s.plaintiff)} проти ${coName2(s.defendant)}): ${s.outcome}.`, 'business', (s.plaintiff === 'player') === win ? 'good' : s.defendant === 'player' || s.plaintiff === 'player' ? 'bad' : '');
}

// ---------- Блокади та біржові атаки ----------
function blockade(coId) {
  const co = coById(coId); if (!co) return;
  const myFac = state.fac.length, allies = warState().alliances.length;
  if (myFac + allies * 2 < 3) return toast('Потрібен вплив на постачання: щонайменше 3 заводи або союзники.', 'bad');
  const cost = Math.round(5e5 * priceLvl()); if (state.cash < cost) return toast(`Коштує ${moneyK(cost)}.`, 'bad');
  book('corpwar', -cost);
  warState().blockades.push({ by: 'player', target: coId, until: state.day + 30, power: clamp(0.08 + myFac * 0.015 + allies * 0.03, 0.08, 0.35) });
  co.rivalry = Math.min(1, (co.rivalry || 0) + 0.3);
  warLog(`🚫 Ви з партнерами припинили постачання «${co.name}» на 30 днів.`);
  const share = clamp(myFac / Math.max(1, state.lots.filter((l) => l.npc && l.npc.fac).length + myFac), 0, 1);
  if (state.gov && chance(0.15 + share)) openCase('player', 'foreclosure', null, share, `блокада постачання для «${co.name}»`);
}
function shortAttack(coId, amount) {
  const co = coById(coId); if (!co) return;
  amount = Math.round(amount); if (state.cash < amount * 0.3) return toast('Потрібна маржа 30% від позиції.', 'bad');
  const mcap = co.price * co.shares, drop = clamp(amount / mcap * 2.5, 0.01, 0.35);
  book('corpwar', -amount * 0.01);
  warState().shorts.push({ co: coId, amount, entry: co.price, until: state.day + 10 });
  co.price *= 1 - drop;
  news(`📉 Масовий продаж акцій «${co.name}»: курс −${Math.round(drop * 100)}%.`, 'market', '');
  const finreg = state.gov ? state.gov.ministries.finreg.strict : 0.5;
  if (chance(drop * 1.5 * finreg)) { if (typeof policeCase === 'function') policeCase('player', `маніпулювання ринком акцій «${co.name}»`, amount * 0.2); }
}

// ---------- Щоденна симуляція ----------
function warDaily() {
  const W = warState();
  // Альянси: спільні R&D і внески
  for (const a of [...W.alliances]) {
    const co = coById(a.co);
    if (!co || !co.alive || isSub(co)) { W.alliances = W.alliances.filter((x) => x !== a); continue; }
    co.rivalry = 0; state.tech.points += 2 + (co.tech || 0) * 0.3;
    book('corpwar', -allianceFee(co) * 0.05);
  }
  // ІІ-альянси проти лідера ринку
  if (chance(0.004)) {
    const cs = aliveCos().filter((c) => !isSub(c) && !c.ally);
    const a = pick(cs), b = pick(cs.filter((c) => c !== a && c.sector === a.sector));
    if (a && b) { a.ally = b.id; b.ally = a.id; W.aiAlliances.push({ a: a.id, b: b.id, since: state.day }); news(`🤝 «${a.name}» і «${b.name}» утворили альянс${(a.rivalry || 0) + (b.rivalry || 0) > 0.8 ? ` — аналітики бачать у цьому відповідь на експансію ${state.company}` : ''}.`, 'corp'); }
  }
  // Картелі: вигода учасникам і ризик справи (однакові правила)
  for (const k of [...W.cartels]) {
    for (const m of k.members) { const co = coById(m); if (co && co.alive) co.cash += SECTORS[k.sector].rev * co.scale * 0.01; }
    if (k.members.includes('player')) {
      const bonus = sum(state.biz.filter((b) => b.type === k.sector), (b) => (b.yest ? b.yest.rev : 0)) * 0.04;
      if (bonus > 0) book('sales', bonus);
    }
    const S = typeof strictness === 'function' ? strictness('antitrust') : 0.5;
    if (!k.caseId && chance(0.004 * (1 + S) * k.members.length)) {
      const share = clamp(k.members.length / (aliveCos().filter((c) => c.sector === k.sector).length + 1), 0, 1);
      const target = k.members.includes('player') ? 'player' : k.members[0];
      const c = openCase(target, 'cartel', null, share, `узгодження цін у галузі «${SECTORS[k.sector].name}»`);
      if (c) { k.caseId = c.id; c.evidence += 15; }
    }
    if (k.caseId) {
      const c = state.gov.cases.find((x) => x.id === k.caseId);
      if (c && c.stage !== 'investigation') {
        if (c.outcome && c.outcome.startsWith('Порушення')) for (const m of k.members) { if (m === 'player') continue; const co = coById(m); if (co) { co.cash -= annualTurnover(m) * 0.04; co.cartel = false; } }
        W.cartels = W.cartels.filter((x) => x !== k); news(`🤫 Картель у галузі «${SECTORS[k.sector].name}» припинив існування.`, 'econ'); applyCartelMods();
      }
    }
  }
  if (chance(0.003)) { // ІІ-компанії самі змовляються
    const sec = pick(Object.keys(SECTORS)), cs = aliveCos().filter((c) => c.sector === sec && !isSub(c) && !c.cartel && c.strat !== 'discount');
    if (cs.length >= 2 && !W.cartels.some((k) => k.sector === sec)) { W.cartels.push({ id: W.seq++, sector: sec, members: cs.slice(0, 3).map((c) => c.id), since: state.day, caseId: null }); for (const c of cs.slice(0, 3)) c.cartel = true; }
  }
  // Блокади
  W.blockades = W.blockades.filter((b) => b.until > state.day);
  // Короткі позиції: розрахунок
  for (const s of [...W.shorts]) if (s.until <= state.day) {
    const co = coById(s.co); W.shorts = W.shorts.filter((x) => x !== s);
    if (!co) continue;
    const pnl = Math.round(s.amount * (s.entry - co.price) / s.entry);
    book('shares', pnl);
    log(`📉 Закрито коротку позицію по «${co.name}»: ${pnl >= 0 ? '+' : ''}${money(pnl)}.`, pnl >= 0 ? 'good' : 'bad');
  }
  // ІІ проти гравця: шпигунство, позови, блокади
  for (const co of aliveCos()) {
    if (isSub(co) || isAlly(co.id)) continue;
    const r = co.rivalry || 0;
    if (r > 0.6 && chance(0.002)) {
      const caught = chance(0.2 + csoInv() * 0.7);
      const loss = Math.round(rnd(0.5, 2) * 1e5 * priceLvl());
      state.tech.points = Math.max(0, state.tech.points - 20); co.tech = (co.tech || 0) + 1;
      if (caught) { W.incidents.unshift({ day: state.day, text: `🕵️ Служба безпеки викрила шпигунство «${co.name}» проти вас.`, by: co.id }); log(`🕵️ Служба безпеки викрила шпигунство «${co.name}». Можна подати позов.`, 'good'); }
      else book('crimeLoss', -loss);
    }
    if (r > 0.7 && chance(0.0015)) fileSuit(co.id, 'player', pick(['unfair', 'patent', 'contract']), SECTORS[co.sector].rev * co.scale * 15 * priceLvl());
    if (r > 0.8 && co.strat === 'raider' && chance(0.001)) {
      state.mods.push({ kind: 'wholesale', key: null, mult: 1.08, days: 20, label: `🚫 Блокада постачальників від «${co.name}»` });
      news(`🚫 «${co.name}» тисне на постачальників ${state.company}: закупівельні ціни зросли.`, 'corp', 'bad');
    }
  }
  for (const s of W.suits) if (!s.outcome && s.decide <= state.day) decideSuit(s);
}

/** Вплив воєн на ІІ-компанії: блокади, картелі, підрозділи гравця. */
function warInfluence(co, parts) {
  let f = 1;
  if (typeof divInfluence === 'function') f *= divInfluence(co, parts);
  if (!state.war) return f;
  const b = state.war.blockades.find((x) => x.target === co.id);
  if (b) { f *= 1 - b.power; parts.push('блокада постачання'); }
  if (co.cartel) f *= 1.04;
  return f;
}

HOOKS.day.push(warDaily);
