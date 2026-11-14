'use strict';
/* БІЗНЕС ІМПЕРІЯ — державне управління (етап 5):
   міністерства з керівниками й бюджетом, податкова політика, субсидії, мінімальна зарплата,
   антимонопольна служба (ринкові частки, розслідування, злиття, штрафи, поділ активів), суди й апеляції.
   Правила однаково застосовуються до гравця й ІІ-компаній. */

const MINISTRIES = {
  economy: { name: 'Міністерство економіки', icon: '🏛️', role: 'податки, субсидії, мінімальна зарплата' },
  tax: { name: 'Податкова служба', icon: '🧾', role: 'перевірки й донарахування' },
  antitrust: { name: 'Антимонопольний комітет', icon: '⚖️', role: 'ринкові частки, злиття, розслідування' },
  cb: { name: 'Центральний банк', icon: '🏦', role: 'облікова ставка' },
  finreg: { name: 'Фінансовий регулятор', icon: '📊', role: 'нагляд за банками й біржею' },
  courts: { name: 'Господарський суд', icon: '👨‍⚖️', role: 'апеляції та спори' },
};
const OFFICIALS = ['Ірина Коваль', 'Петро Сидоренко', 'Олена Мартинюк', 'Андрій Ткаченко', 'Марта Гнатишин', 'Віктор Бондар', 'Наталія Руденко', 'Сергій Лук’яненко', 'Оксана Дячук', 'Дмитро Шевчук'];
const SHARE_LEVELS = [
  [0.2, 'Звичайна конкуренція', 'muted'], [0.4, 'Великий гравець', ''], [0.6, 'Посилений контроль', 'mid'],
  [0.8, 'Високий ризик монополізації', 'neg'], [1.01, 'Особлива увага регулятора', 'neg'],
];
const shareLevel = (s) => SHARE_LEVELS.find(([t]) => s < t);
const LAW_FIRMS = [
  { name: 'Без юристів', cost: 0, power: 0 },
  { name: 'Юридична фірма', cost: 2000, power: 1 },
  { name: 'Топова фірма', cost: 8000, power: 2 },
  { name: 'Міжнародна фірма', cost: 25000, power: 3 },
];
const SUBSIDY_TARGETS = {
  agro: { name: 'Агробізнес', kinds: ['farm', 'foodplant'] },
  energy: { name: 'Енергетика', kinds: ['powerplant', 'oilwell', 'refinery'] },
  industry: { name: 'Промисловість', kinds: ['steelmill', 'mine', 'chipfab', 'elecplant', 'carplant', 'textile'] },
  tech: { name: 'IT-галузь', kinds: ['office'] },
  retail: { name: 'Малий роздріб', types: ['grocery', 'coffee', 'flowers'] },
};

function govState() {
  if (state.gov) return state.gov;
  const mk = () => ({ head: pick(OFFICIALS), strict: +rnd(0.3, 0.8).toFixed(2), budget: Math.round(rnd(50, 400)) * 1e6, staff: ri(200, 3000), since: state.day });
  state.gov = {
    ministries: Object.fromEntries(Object.keys(MINISTRIES).map((k) => [k, mk()])),
    subsidies: [], decisions: [], budget: { revenue: 0, spending: 0, balance: 0, hist: [] },
    cases: [], seq: 1, lawFirm: 0, floors: [], bans: [], violations: { player: 0 },
  };
  return state.gov;
}
function govDecide(text, kind = '') {
  const G = govState();
  G.decisions.unshift({ day: state.day, text });
  if (G.decisions.length > 60) G.decisions.length = 60;
  news(`🏛️ ${text}`, 'econ', kind);
}
const strictness = (k) => govState().ministries[k].strict * (typeof diff === 'function' ? diff().strict : 1);

// ================= Ринкові частки =================
/** Групи власників: гравець разом із дочірніми компаніями; кожна ІІ-компанія — своя група. */
function ownerOfLot(l) {
  if (l.ownerKind === 'biz') return { owner: 'player', type: bizById(l.owner).type };
  if (l.npc && l.npc.type) { const co = coById(l.npc.co); return { owner: isSub(co) ? 'player' : co ? co.id : 'local', type: l.npc.type }; }
  return null;
}
/** Роздрібні ринки: формат × місто, вага точки — її розмір. */
function marketShares() {
  const m = {};
  for (const l of state.lots) {
    const o = ownerOfLot(l); if (!o) continue;
    const key = lotCityId(l) + '|' + o.type;
    const M = m[key] || (m[key] = { key, city: lotCityId(l), type: o.type, total: 0, by: {}, n: 0 });
    const w = SIZES[l.size].attract;
    M.total += w; M.n++; M.by[o.owner] = (M.by[o.owner] || 0) + w;
  }
  return m;
}
const marketName = (key) => { const [c, t] = key.split('|'); return `${TYPES[t] ? TYPES[t].name : t} · ${CITIES[c].name}`; };
const groupName = (g) => (g === 'player' ? state.company : g === 'local' ? 'Місцевий бізнес' : (coById(g) || {}).name || g);
function annualTurnover(g) {
  if (g === 'player') return Math.max(1e5, sum(state.ledger.slice(-30), (x) => (x.sales || 0) + (x.b2b || 0) + (x.software || 0)) * 12);
  const co = coById(g); return co ? SECTORS[co.sector].rev * co.scale * 365 * state.econ.priceLevel : 0;
}

// ================= Антимонопольні справи =================
const CASE_TYPES = {
  dominance: 'Зловживання домінуванням', dumping: 'Демпінг', merger: 'Перевірка злиття', cartel: 'Картельна змова', foreclosure: 'Обмеження доступу до постачання',
};
function openCase(target, type, market, share, why) {
  const G = govState();
  if (G.cases.some((c) => c.target === target && c.market === market && c.type === type && c.stage !== 'closed')) return null;
  const c = { id: 'AMC-' + (G.seq++), target, type, market, share, why, opened: state.day, evidence: Math.round(rnd(10, 30) + share * 40), stage: 'investigation', due: state.day + ri(20, 40), log: [] };
  G.cases.unshift(c);
  if (G.cases.length > 60) G.cases.length = 60;
  news(`⚖️ АМКУ відкрив справу ${c.id} проти «${groupName(target)}»: ${CASE_TYPES[type].toLowerCase()} (${market ? marketName(market) : 'ринок B2B'}, частка ${Math.round(share * 100)}%).`, 'econ', target === 'player' ? 'bad' : '');
  if (target === 'player') log(`⚖️ Проти вас відкрито справу ${c.id}: ${CASE_TYPES[type]}. Наймайте юристів і подумайте про поведінку на ринку.`, 'bad');
  return c;
}

function antitrustDaily() {
  const G = govState();
  const S = strictness('antitrust');
  if (S <= 0) return;
  const markets = marketShares();
  for (const M of Object.values(markets)) {
    if (M.n < 4) continue;
    for (const [g, w] of Object.entries(M.by)) {
      if (g === 'local') continue;
      const share = w / M.total;
      if (share >= 0.4 && chance(0.004 * (1 + (share - 0.4) * 12) * S)) openCase(g, 'dominance', M.key, share, 'стійко висока частка ринку');
      if (g === 'player' && share >= 0.2) {
        const mine = state.biz.filter((b) => b.type === M.type && lotCityId(lotOf(b)) === M.city);
        const ratio = mine.length ? sum(mine, bizPriceRatio) / mine.length : 1;
        if (ratio < 0.85 && chance(0.01 * S)) openCase('player', 'dumping', M.key, share, `ціни нижче ринку на ${Math.round((1 - ratio) * 100)}% (скарги конкурентів)`);
      }
    }
    // Картель: двоє найбільших ІІ-гравців утримують > 70% ринку
    const top = Object.entries(M.by).filter(([g]) => g !== 'player' && g !== 'local').sort((a, b) => b[1] - a[1]);
    if (top.length >= 2 && (top[0][1] + top[1][1]) / M.total > 0.7 && chance(0.002 * S)) openCase(top[0][0], 'cartel', M.key, (top[0][1] + top[1][1]) / M.total, `змова з «${groupName(top[1][0])}»`);
  }
  // Постачання: велика частка B2B і відмова продавати конкурентам
  if (state.flags.noContracts && state.fac.length >= 5 && chance(0.004 * S)) openCase('player', 'foreclosure', null, 0.6, 'відмова постачати конкурентам за великої частки виробництва');

  // Розгляд справ
  for (const c of G.cases) {
    if (c.stage === 'investigation') {
      const defense = c.target === 'player' ? LAW_FIRMS[G.lawFirm].power * 0.6 + state.depts.legal * 0.2 : (coById(c.target) ? coById(c.target).scale * 0.4 : 0);
      c.evidence = clamp(c.evidence + rnd(0, 2.2) * S - defense * 0.5, 0, 100);
      if (state.day >= c.due) decideCase(c);
    } else if (c.stage === 'appeal' && state.day >= c.appealDue) decideAppeal(c);
  }
  // Заборони й цінові мінімуми спливають
  G.floors = G.floors.filter((f) => f.until > state.day);
  G.bans = G.bans.filter((f) => f.until > state.day);
  // Мінімальна ціна після рішення про демпінг
  for (const f of G.floors) for (const b of state.biz) {
    if (b.type !== f.type || lotCityId(lotOf(b)) !== f.city) continue;
    for (const p of productsOf(b)) { const st = b.products[p.id]; if (st && st.price < fairPrice(p, b) * 0.95) st.price = +(fairPrice(p, b) * 0.95).toFixed(2); }
  }
}

function decideCase(c) {
  const S = strictness('antitrust');
  const violation = c.evidence >= 50;
  c.stage = 'decided'; c.decided = state.day;
  if (!violation) {
    c.outcome = 'Порушень не виявлено'; c.stage = 'closed';
    news(`⚖️ Справу ${c.id} щодо «${groupName(c.target)}» закрито: порушень не виявлено.`, 'econ', c.target === 'player' ? 'good' : '');
    return;
  }
  const G = govState();
  const repeat = c.target === 'player' ? G.violations.player || 0 : 0;
  const rate = clamp(0.01 + (c.evidence - 50) / 50 * 0.06 + c.share * 0.03 + repeat * 0.01, 0.01, 0.1) * Math.max(0.5, S);
  c.fine = Math.round(annualTurnover(c.target) * rate);
  const [city, type] = c.market ? c.market.split('|') : [null, null];
  const remedies = [];
  if (c.type === 'dumping') { G.floors.push({ city, type, until: state.day + 90 }); remedies.push('мінімальна ціна 95% ринкової на 90 днів'); }
  if (c.type === 'dominance' && c.share >= 0.6) {
    const n = applyDivestiture(c.target, city, type, 0.3);
    if (n) remedies.push(`примусовий продаж ${n} точок`);
    G.bans.push({ target: c.target, city, type, until: state.day + 120 }); remedies.push('заборона відкривати нові точки на 120 днів');
  }
  if ((c.type === 'dominance' && c.share >= 0.8) || repeat >= 2) { const s = forceBreakup(c.target); if (s) remedies.push(s); }
  if (c.type === 'cartel') remedies.push('заборона узгоджених дій');
  if (c.type === 'foreclosure') { state.flags.noContracts = false; remedies.push('обов’язок постачати конкурентам'); }
  c.outcome = `Порушення: штраф ${moneyK(c.fine)}${remedies.length ? '; ' + remedies.join('; ') : ''}`;
  if (c.target === 'player') {
    book('fines', -c.fine); G.violations.player = repeat + 1;
    c.appealUntil = state.day + 10;
    log(`⚖️ Рішення у справі ${c.id}: ${c.outcome}. Можна оскаржити в суді протягом 10 днів.`, 'bad');
  } else { const co = coById(c.target); if (co) co.cash -= c.fine; c.stage = 'closed'; }
  news(`⚖️ ${c.id}: «${groupName(c.target)}» — ${c.outcome}.`, 'econ', c.target === 'player' ? 'bad' : '');
}

/** Продаж частки точок групи на ринку (гравець отримує 70% оцінки, ІІ-компанія просто втрачає точки). */
function applyDivestiture(target, city, type, part) {
  let n = 0;
  if (target === 'player') {
    const mine = state.biz.filter((b) => b.type === type && lotCityId(lotOf(b)) === city).sort((a, b) => (a.yest ? a.yest.profit : 0) - (b.yest ? b.yest.profit : 0));
    const k = Math.ceil(mine.length * part);
    for (const b of mine.slice(0, k)) { const full = bizValue(b), view = state.ui.view; sellBiz(b); state.ui.view = view; book('assetSale', -Math.round(full * 0.3)); n++; } // примусовий продаж — 70% оцінки
    const subsLots = state.lots.filter((l) => l.npc && l.npc.type === type && lotCityId(l) === city && isSub(coById(l.npc.co)));
    for (const l of subsLots.slice(0, Math.ceil(subsLots.length * part))) { l.npc = null; n++; }
  } else {
    const lots = state.lots.filter((l) => l.npc && l.npc.co === target && l.npc.type === type && lotCityId(l) === city);
    for (const l of lots.slice(0, Math.ceil(lots.length * part))) { l.npc = null; n++; }
  }
  return n;
}
/** Поділ корпорації: продаж найбільшої дочірньої компанії (гравець) або виділення частини точок (ІІ). */
function forceBreakup(target) {
  if (target === 'player') {
    const subs = subsidiaries().sort((a, b) => coMcap(b) - coMcap(a));
    if (!subs.length) return null;
    const s = subs[0]; sellSubsidiary(s.id);
    return `поділ корпорації: примусовий продаж «${s.name}»`;
  }
  const co = coById(target); if (!co) return null;
  const lots = state.lots.filter((l) => l.npc && l.npc.co === target);
  if (lots.length < 4) return null;
  const spin = addCompany(co.name + ' Нова', co.ticker.slice(0, 3) + 'N', co.sector);
  for (const l of lots.slice(0, Math.floor(lots.length / 2))) l.npc.co = spin.id;
  return `поділ: виділено «${spin.name}»`;
}

const appealCost = () => Math.round((50000 + LAW_FIRMS[govState().lawFirm].cost * 10) * priceLvl());
function fileAppeal(id) {
  const G = govState(), c = G.cases.find((x) => x.id === id);
  if (!c || c.target !== 'player' || c.stage !== 'decided' || state.day > c.appealUntil) return;
  const cost = appealCost();
  if (state.cash < cost) return toast(`Апеляція коштує ${moneyK(cost)}.`, 'bad');
  book('fines', -cost);
  c.stage = 'appeal'; c.appealDue = state.day + 20;
  log(`👨‍⚖️ Подано апеляцію у справі ${c.id}. Рішення суду — через 20 днів.`);
}
function decideAppeal(c) {
  const G = govState();
  const p = clamp(0.15 + 0.12 * LAW_FIRMS[G.lawFirm].power - (c.evidence - 50) / 100 - (G.ministries.courts.strict - 0.5) * 0.2, 0.02, 0.85);
  c.stage = 'closed';
  if (Math.random() < p) {
    book('fines', c.fine); G.violations.player = Math.max(0, G.violations.player - 1);
    G.floors = G.floors.filter((f) => !(c.market && f.city + '|' + f.type === c.market));
    G.bans = G.bans.filter((f) => !(f.target === 'player' && c.market && f.city + '|' + f.type === c.market));
    c.outcome += ' → суд скасував рішення, штраф повернуто';
    news(`👨‍⚖️ Суд задовольнив апеляцію ${state.company} у справі ${c.id}.`, 'econ', 'good');
  } else {
    c.outcome += ' → апеляцію відхилено';
    news(`👨‍⚖️ Суд відхилив апеляцію ${state.company} у справі ${c.id}.`, 'econ', 'bad');
  }
}
/** Чи заборонено гравцю відкривати точку цього формату в місті (рішення АМКУ). */
function isBanned(type, city) { return govState().bans.some((b) => b.target === 'player' && b.type === type && b.city === city); }

/** Перевірка злиття: блокування за дуже великої сукупної частки, умови — за помітної. Однаково для всіх. */
function reviewMerger(buyer, targetCo) {
  const S = strictness('antitrust');
  if (S <= 0) return { ok: true };
  const markets = marketShares();
  let worst = null;
  for (const M of Object.values(markets)) {
    if (M.n < 4) continue;
    const a = (M.by[buyer] || 0), b = (M.by[targetCo.id] || 0);
    if (!a || !b) continue;
    const share = (a + b) / M.total;
    if (!worst || share > worst.share) worst = { share, M };
  }
  if (!worst || worst.share < 0.4) return { ok: true };
  if (worst.share >= 0.6 && Math.random() < 0.5 + 0.4 * S) return { ok: false, reason: `сукупна частка ${Math.round(worst.share * 100)}% на ринку «${marketName(worst.M.key)}»` };
  return { ok: true, divest: worst.M, share: worst.share };
}

// ================= Уряд =================
function govDaily() {
  const G = govState(), e = state.econ;
  // Бюджет: податки гравця + оцінка податків ІІ-компаній − субсидії
  const last = state.ledger[state.ledger.length - 1] || {};
  const aiTax = sum(aliveCos(), (c) => Math.max(0, c.ema)) * e.taxRate;
  G.budget.revenue = -(last.tax || 0) + aiTax;
  let subs = 0;
  for (const s of G.subsidies) {
    const T = SUBSIDY_TARGETS[s.target];
    const units = [...state.fac.filter((f) => T.kinds && T.kinds.includes(f.kind)), ...state.biz.filter((b) => T.types && T.types.includes(b.type))];
    const pay = sum(units, (u) => dailyWages(u)) * s.rate;
    if (pay > 0) { book('subsidy', pay); subs += pay; }
  }
  G.subsidies = G.subsidies.filter((s) => s.until > state.day);
  G.budget.spending = subs + 5e6 * priceLvl();
  if (G.lawFirm) book('depts', -LAW_FIRMS[G.lawFirm].cost * priceLvl()); // гонорар юридичної фірми
  G.budget.balance += G.budget.revenue - G.budget.spending;
  // Податкова: перевірки
  const T = govState().ministries.tax;
  if (chance(0.004 * T.strict * (typeof diff === 'function' ? diff().strict : 1)) && state.ledger.length > 30) {
    const avoid = 1 - 0.15 * state.depts.accounting;
    if (chance(0.5 * avoid)) { const extra = Math.round(Math.max(0, sum(state.ledger.slice(-30), (x) => x.profit)) * e.taxRate * 0.3); if (extra > 0) { book('tax', -extra); govDecide(`Податкова донарахувала ${state.company} ${moneyK(extra)} за результатами перевірки.`, 'bad'); } }
    else govDecide(`Податкова перевірка ${state.company} завершилась без порушень.`, 'good');
  }
  // Місячні рішення
  if (state.day % 30 === 0) monthlyPolicy();
  if (!state.pol && state.day % 180 === 0) { // після появи політики призначення робить уряд/парламент
    const k = pick(Object.keys(MINISTRIES)), M = G.ministries[k];
    M.head = pick(OFFICIALS.filter((n) => n !== M.head)); M.strict = +rnd(0.25, 0.85).toFixed(2); M.since = state.day;
    govDecide(`Новий керівник: ${MINISTRIES[k].name} очолив(-ла) ${M.head} (${M.strict > 0.6 ? 'жорсткий курс' : M.strict < 0.4 ? 'ліберальний курс' : 'помірний курс'}).`);
  }
  // Центробанк: «яструб» тримає ставку вищою, «голуб» — нижчою
  const cb = G.ministries.cb;
  if (state.day % 14 === 0) e.rate = clamp(+(e.rate + (cb.strict - 0.5) * 0.25).toFixed(2), 0.25, 30);
}

function monthlyPolicy() {
  const G = govState(), e = state.econ, eco = G.ministries.economy;
  if ((e.phase === 'recession' || e.phase === 'crisis') && chance(0.7)) {
    const target = pick(Object.keys(SUBSIDY_TARGETS)), rate = +rnd(0.1, 0.3).toFixed(2);
    G.subsidies.push({ target, rate, until: state.day + 90 });
    govDecide(`Мінекономіки запускає субсидії для галузі «${SUBSIDY_TARGETS[target].name}»: компенсація ${Math.round(rate * 100)}% фонду оплати праці на 90 днів.`, 'good');
    if (e.taxRate > 0.12 && chance(0.4)) { e.taxRate = +(e.taxRate - 0.01).toFixed(2); govDecide(`Податок на прибуток знижено до ${Math.round(e.taxRate * 100)}% для підтримки бізнесу.`, 'good'); }
  } else if (e.phase === 'boom' && G.budget.balance < 0 && chance(0.6 * eco.strict + 0.2)) {
    e.taxRate = +Math.min(0.4, e.taxRate + 0.01).toFixed(2);
    govDecide(`Через дефіцит бюджету податок на прибуток зростає до ${Math.round(e.taxRate * 100)}%.`, 'bad');
  }
  if (e.unemployment < 5 && chance(0.4)) { e.wageLevel *= 1.03; govDecide('Уряд підвищив мінімальну зарплату на 3%.', 'bad'); }
}

HOOKS.day.push(govDaily, antitrustDaily);
