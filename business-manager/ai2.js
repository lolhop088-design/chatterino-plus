'use strict';
/* БІЗНЕС ІМПЕРІЯ — розширені ІІ-конкуренти (етап 3):
   стратегії, цінова політика, R&D, кредити, власні заводи (впливають на ринок B2B), частки в інших компаніях,
   ворожі поглинання, ворожнеча з гравцем (цінові війни, переманювання, відмова від контрактів),
   боротьба за постачальників і переманювання працівників гравцем. */

const STRATS = {
  expansion: { name: 'Агресивне розширення', icon: '🚀', expand: 2.0, price: 0.97, rnd: 0.5, borrow: 1.5, raid: 0.6 },
  discount: { name: 'Дискаунтер', icon: '🏷️', expand: 1.2, price: 0.88, rnd: 0.3, borrow: 1.0, raid: 0.3 },
  premium: { name: 'Преміум-бренд', icon: '💎', expand: 0.7, price: 1.15, rnd: 0.8, borrow: 0.6, raid: 0.3 },
  innovator: { name: 'Технологічний лідер', icon: '🔬', expand: 0.8, price: 1.05, rnd: 2.0, borrow: 0.8, raid: 0.4 },
  conservative: { name: 'Консервативна', icon: '🛡️', expand: 0.5, price: 1.0, rnd: 0.5, borrow: 0.3, raid: 0.2 },
  raider: { name: 'Корпоративний рейдер', icon: '🦈', expand: 0.8, price: 1.0, rnd: 0.4, borrow: 1.6, raid: 2.5 },
};
/** Які заводи будує ІІ-компанія галузі (вихід — товар B2B-ринку, вхід — сировина). */
const AI_FAC = { steel: ['steelmill', 'mine'], oil: ['oilwell', 'refinery'], energy: ['powerplant'], logistics: ['logistics'], dealership: ['carplant'], electronics: ['elecplant', 'chipfab'], fashion: ['textile'], grocery: ['farm', 'foodplant'] };

function pickStrategy(co) {
  const w = { expansion: 2, discount: 2, premium: 1.5, innovator: 1, conservative: 2, raider: 1 };
  if (co.sector === 'tech' || co.sector === 'electronics') w.innovator = 4;
  if (co.sector === 'bank') w.raider = 3;
  if (co.sector === 'grocery' || co.sector === 'fastfood') w.discount = 4;
  if (co.sector === 'fashion' || co.sector === 'restaurant' || co.sector === 'dealership') w.premium = 3;
  let r = Math.random() * sum(Object.values(w));
  for (const [k, v] of Object.entries(w)) if ((r -= v) <= 0) return k;
  return 'conservative';
}
/** Дозаповнює нові поля компаній (і для старих збережень). */
function aiInit(co) {
  if (co.strat) return co;
  co.strat = pickStrategy(co);
  co.priceIdx = STRATS[co.strat].price;
  co.tech = Math.round(rnd(0, 3));
  co.debt = 0;
  co.stakes = {};
  co.rivalry = 0;
  co.actions = [];
  return co;
}
const strat = (co) => STRATS[aiInit(co).strat];
function coAction(co, text) { co.actions = [`Д${state.day}: ${text}`, ...(co.actions || [])].slice(0, 6); }
/** Сила конкурента для покупців: репутація, ціни, технології. */
const coStrength = (co) => (co ? co.rep * Math.pow(1 / (co.priceIdx || 1), 2) * (1 + 0.03 * (co.tech || 0)) : 1);

/** Частка гравця на ринках, де присутня компанія (для реакції на вас). */
function playerPressureOn(co) {
  if (!TYPES[co.sector]) return 0;
  const mine = state.biz.filter((b) => b.type === co.sector);
  if (!mine.length) return 0;
  const theirCities = new Set(state.lots.filter((l) => l.npc && l.npc.co === co.id).map(lotCityId));
  const overlap = mine.filter((b) => theirCities.has(lotCityId(lotOf(b)))).length;
  return overlap / Math.max(1, overlap + state.lots.filter((l) => l.npc && l.npc.co === co.id).length);
}

function ai2Daily() {
  const P = priceLvl(), K = state.econ.rate / 100;
  for (const co of aliveCos()) {
    aiInit(co);
    if (isSub(co)) { co.rivalry = 0; continue; }
    const St = STRATS[co.strat], S = SECTORS[co.sector];
    const revDay = S.rev * co.scale * P;

    // Ворожнеча з гравцем: ваш тиск на їхні ринки, низькі ціни, поглинання конкурентів по галузі
    const pressure = playerPressureOn(co);
    const undercut = state.biz.some((b) => b.type === co.sector && bizPriceRatio(b) < 0.92);
    co.rivalry = clamp(co.rivalry * 0.96 + pressure * 0.03 + (undercut ? 0.01 : 0) + (co.influence < 0.9 ? 0.01 : 0), 0, 1);

    // Ціни: стратегія + відповідь на гравця
    const target = St.price - co.rivalry * 0.12;
    co.priceIdx = clamp(co.priceIdx + (target - co.priceIdx) * 0.05, 0.7, 1.3);
    co.volMult = Math.pow(1 / co.priceIdx, 1.2);
    co.marginMult = Math.pow(co.priceIdx, 2) * (1 + 0.03 * co.tech);

    // R&D
    const rd = revDay * 0.02 * St.rnd;
    co.cash -= rd;
    co.techProgress = (co.techProgress || 0) + rd / (4e5 * P * (co.tech + 1));
    if (co.techProgress >= 1) { co.techProgress = 0; co.tech++; coAction(co, `технологічний рівень ${co.tech}`); if (co.tech % 3 === 0) news(`🔬 «${co.name}» представляє нове покоління продуктів (технології рівня ${co.tech}).`, 'tech'); }

    // Кредити
    if (co.debt > 0) co.cash -= co.debt * (K + 0.03) / 365;
    if (co.cash < 1e6 * co.scale && St.borrow > 0.5 && co.debt < 6e6 * co.scale * St.borrow && chance(0.05)) {
      const amt = Math.round(rnd(1, 3) * 1e6 * co.scale * P);
      co.debt += amt; co.cash += amt; coAction(co, `кредит ${moneyK(amt)}`);
    } else if (co.debt > 0 && co.cash > co.debt * 3) { co.cash -= co.debt; coAction(co, `погасила борг ${moneyK(co.debt)}`); co.debt = 0; }

    // Власні заводи в промзонах (впливають на ринок)
    const kinds = AI_FAC[co.sector];
    if (kinds && co.cash > 4e6 * co.scale && chance(0.01 * St.expand)) {
      const free = state.lots.filter((l) => !l.npc && !l.owner && DMAP[l.district].zone === 'industry' && state.unlocked[lotCityId(l)]);
      const city = (cid) => { const ls = state.lots.filter((x) => lotCityId(x) === cid && DMAP[x.district].zone === 'industry'); return ls.filter((x) => x.npc).length < ls.length * 0.5; };
      const ok = free.filter((l) => city(lotCityId(l)));
      if (ok.length) {
        const l = pick(ok), kind = pick(kinds);
        if (FACILITIES[kind].sizes.includes(l.size)) {
          l.npc = { co: co.id, fac: kind }; co.cash -= FACILITIES[kind].setup * 1.5 * P;
          coAction(co, `збудувала ${FACILITIES[kind].name.toLowerCase()} (${CITIES[lotCityId(l)].name})`);
          news(`🏭 «${co.name}» будує ${FACILITIES[kind].name.toLowerCase()} у місті ${CITIES[lotCityId(l)].name}.`, 'corp');
        }
      }
    }

    // Цінова війна проти гравця
    if (co.rivalry > 0.5 && TYPES[co.sector] && chance(0.02) && !state.mods.some((m) => m.kind === 'pricewar' && m.key === co.sector)) {
      state.mods.push({ kind: 'pricewar', key: co.sector, mult: 1.35, days: 10, label: `⚔️ «${co.name}» проти вас: ${TYPES[co.sector].name}` });
      co.cash -= revDay * 2; coAction(co, 'оголосила цінову війну');
      news(`⚔️ «${co.name}» оголошує цінову війну у відповідь на експансію ${state.company}.`, 'corp', 'bad');
    }
    // Переманювання ваших працівників
    if (co.rivalry > 0.3 && (co.strat === 'expansion' || co.strat === 'innovator' || co.strat === 'premium') && chance(0.03)) {
      const target = state.staff.filter((p) => p.skill >= 3.5 && p.morale < 65).sort((a, b) => b.skill - a.skill)[0];
      if (target) {
        state.staff = state.staff.filter((x) => x !== target);
        coAction(co, `переманила ${target.name}`);
        log(`🧲 «${co.name}» переманила вашого працівника ${target.name} (навичка ${target.skill.toFixed(1)}). Підвищуйте зарплати й мораль.`, 'bad');
      }
    }
    // Боротьба за постачальників
    if (TYPES[co.sector] && co.rivalry > 0.4 && chance(0.01) && !state.mods.some((m) => m.kind === 'supplier' && m.key === co.sector)) {
      state.mods.push({ kind: 'supplier', key: co.sector, mult: 1.15, days: 20, label: `📦 Ексклюзив «${co.name}» з постачальниками` });
      coAction(co, 'уклала ексклюзивні контракти з постачальниками');
      news(`📦 «${co.name}» уклала ексклюзивні контракти з постачальниками — закупівлі в сегменті «${TYPES[co.sector].name}» для інших дорожчають на 15%.`, 'corp', 'bad');
    }

    // Частки в інших компаніях і ворожі поглинання
    if (St.raid > 1 && co.cash > 6e6 * co.scale && chance(0.05)) {
      // Рейдер обирає одну ціль і цілеспрямовано набирає пакет
      let t = co.raidTarget && coById(co.raidTarget);
      if (!t || !t.alive || isSub(t)) { const ts = aliveCos().filter((x) => x !== co && !isSub(x) && coMcap(x) < co.cash * 3); t = ts.length ? pick(ts) : null; co.raidTarget = t ? t.id : null; }
      if (t) {
        const pctBuy = +rnd(0.03, 0.08).toFixed(3), cost = coMcap(t) * pctBuy;
        co.cash -= cost; co.stakes[t.id] = +((co.stakes[t.id] || 0) + pctBuy).toFixed(3);
        coAction(co, `купила ${Math.round(pctBuy * 100)}% акцій «${t.name}»`);
        if (co.stakes[t.id] >= 0.3) {
          // Викуп решти пакета; бракує грошей — залучає борг (LBO), але в межах масштабу компанії
          const need = coMcap(t) * 1.15 * (1 - co.stakes[t.id]);
          const gap = Math.max(0, need - co.cash * 0.8);
          if (gap < 4e7 * co.scale * P) { co.debt += gap; co.cash += gap; hostileTakeover(co, t); }
        }
      }
    }
    if (St.raid > 1 && state.ipo && co.cash > state.ipo.price * state.ipo.shares * 0.05 && chance(0.01)) {
      state.ipo.holders = state.ipo.holders || {};
      const cap = state.ipo.float - sum(Object.values(state.ipo.holders));
      const part = Math.min(cap, +rnd(0.01, 0.04).toFixed(3));
      if (part > 0.005) {
        state.ipo.holders[co.id] = +((state.ipo.holders[co.id] || 0) + part).toFixed(3);
        co.cash -= state.ipo.price * state.ipo.shares * part;
        news(`🦈 «${co.name}» скупила ${Math.round(part * 100)}% акцій ${state.company} (усього ${Math.round(state.ipo.holders[co.id] * 100)}%).`, 'market', 'bad');
      }
    }
  }

  // Вплив ІІ-заводів на ринок B2B: продають вихід, купують сировину
  for (const l of state.lots) {
    if (!l.npc || !l.npc.fac) continue;
    const r = FACILITIES[l.npc.fac].recipes[0];
    if (!r || r.out === 'power' || !state.market[r.out]) continue;
    state.market[r.out].mult = Math.max(0.4, state.market[r.out].mult * 0.9985);
    for (const g of Object.keys(r.in)) if (state.market[g]) state.market[g].mult = Math.min(3, state.market[g].mult * 1.001);
  }
}

function hostileTakeover(raider, t) {
  if (typeof reviewMerger === 'function') { const rv = reviewMerger(raider.id, t); if (!rv.ok) { news(`⚖️ АМКУ заблокував ворожий наступ «${raider.name}» на «${t.name}»: ${rv.reason}.`, 'econ'); return; } }
  const price = coMcap(t) * 1.15 * (1 - raider.stakes[t.id]);
  raider.cash -= price;
  for (const l of state.lots) if (l.npc && l.npc.co === t.id) l.npc.co = raider.id;
  const h = state.portfolio[t.id];
  if (h && h.qty) { book('shares', h.qty * t.price * 1.15); log(`Ваші акції «${t.name}» викуплено під час ворожого поглинання.`, 'good'); delete state.portfolio[t.id]; }
  t.alive = false; t.fate = `ворожо поглинута «${raider.name}»`;
  delete raider.stakes[t.id];
  raider.acquired = (raider.acquired || []).concat(t.name).slice(-6);
  coAction(raider, `ворожо поглинула «${t.name}»`);
  news(`🦈 Вороже поглинання: «${raider.name}» набрала контрольний пакет і забирає «${t.name}».`, 'corp');
}

// ---------- Переманювання працівників гравцем ----------
function poachCandidates() {
  const out = [];
  for (const co of aliveCos().filter((c) => !isSub(c)).sort((a, b) => (b.tech || 0) - (a.tech || 0)).slice(0, 6)) {
    const role = co.sector === 'tech' ? 'dev' : AI_FAC[co.sector] ? 'engineer' : co.sector === 'bank' ? 'manager' : 'sales';
    out.push({ co, role, skill: Math.min(5, 3.8 + (co.tech || 0) * 0.15), wage: 0 });
  }
  for (const c of out) c.wage = +(marketWage({ skill: c.skill, role: c.role }) * 1.4).toFixed(1);
  return out;
}
function poach(coId, unitId) {
  const co = coById(coId), u = unitById(unitId);
  if (!co || !u) return toast('Оберіть, куди найняти.', 'bad');
  if (staffOf(u).length >= maxStaff(u)) return toast('Немає вільних місць.', 'bad');
  const c = poachCandidates().find((x) => x.co.id === coId);
  const fee = Math.round(c.wage * 8 * 20);
  if (state.cash < fee) return toast(`Бонус за перехід — ${money(fee)}.`, 'bad');
  book('wages', -fee);
  state.staff.push({ id: uid(), name: `${pick(FIRST)} ${pick(LAST)}`, role: c.role, skill: +c.skill.toFixed(1), wage: c.wage, unit: u.id, morale: 80, hired: state.day, from: co.name });
  co.eff = Math.max(0.6, co.eff - 0.01); co.rivalry = Math.min(1, (co.rivalry || 0) + 0.1);
  coAction(co, `втратила фахівця на користь ${state.company}`);
  log(`🧲 Ви переманили фахівця з «${co.name}» у «${u.name}» (бонус ${money(fee)}).`, 'good');
}

HOOKS.day.push(ai2Daily);
