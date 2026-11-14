'use strict';
/* БІЗНЕС ІМПЕРІЯ — медіа, новини та інформаційний вплив.
   Медіахолдинги гравця й ІІ-компаній, аудиторія/довіра/охоплення, редакційна політика, персонал;
   репутація корпорацій; інформаційні кампанії (PR, розслідування, дискредитація, боти, спростування);
   незалежний фактчекінг, позови за наклеп. Новини впливають на акції, продажі й довіру. */

const OUTLET_TYPES = {
  tv: { name: 'Телеканал', icon: '📺', setup: 8e6, base: 2.5e6, cpm: 18, ops: 18000, need: 60 },
  newspaper: { name: 'Газета', icon: '📰', setup: 6e5, base: 2.5e5, cpm: 20, ops: 2500, need: 15 },
  magazine: { name: 'Журнал', icon: '📖', setup: 4e5, base: 1.2e5, cpm: 30, ops: 1500, need: 8 },
  radio: { name: 'Радіостанція', icon: '📻', setup: 1.2e6, base: 7e5, cpm: 10, ops: 4000, need: 12 },
  portal: { name: 'Новинний портал', icon: '🌐', setup: 3e5, base: 9e5, cpm: 4.5, ops: 1200, need: 10 },
};
const MEDIA_POLICIES = {
  neutral: { name: 'Нейтральна', trust: 0, aud: 1, power: 1 },
  investigative: { name: 'Розслідувальна', trust: 0.04, aud: 0.95, power: 1.4 },
  probiz: { name: 'Проділова', trust: -0.005, aud: 0.95, power: 1.1 },
  tabloid: { name: 'Таблоїд', trust: -0.04, aud: 1.35, power: 0.8 },
  loyal: { name: 'Лояльна до влади', trust: -0.02, aud: 0.9, power: 1.2 },
};
const MEDIA_ROLES = { journalist: { name: 'Журналісти', wage: 180, w: 1 }, editor: { name: 'Редактори', wage: 260, w: 2 }, host: { name: 'Ведучі', wage: 420, w: 3 }, analyst: { name: 'Аналітики', wage: 300, w: 1.5 } };
const CAMPAIGNS_INFO = {
  pr: { name: 'PR-кампанія про себе', icon: '✨', cost: 150000, fake: false, desc: 'Правдива позитивна кампанія: репутація корпорації росте.' },
  expose: { name: 'Журналістське розслідування', icon: '🔎', cost: 250000, fake: false, desc: 'Сильне, якщо в цілі є реальні проблеми (борги, збитки, справи АМКУ). Інакше слабке й ризикує позовом.' },
  smear: { name: 'Кампанія дискредитації (чутки)', icon: '🗯️', cost: 200000, fake: true, desc: 'Неправдиві матеріали: швидка шкода цілі, але фактчекери можуть викрити — тоді позов, штраф і падіння довіри.' },
  counter: { name: 'Спростування атак', icon: '🛡️', cost: 120000, fake: false, desc: 'Послаблює активні атаки проти вас і допомагає фактчекерам їх викрити.' },
};
const WORLD_OUTLETS = [
  ['Ділова правда', 'newspaper', 'investigative'], ['Новини 24', 'tv', 'neutral'], ['Вечірній кур’єр', 'newspaper', 'tabloid'],
  ['Фінанси Сьогодні', 'magazine', 'probiz'], ['Канал Столиця', 'tv', 'loyal'], ['Радіо Хвиля', 'radio', 'neutral'],
  ['Таблоїд Плюс', 'portal', 'tabloid'], ['Незалежний репортер', 'portal', 'investigative'], ['Економічний вісник', 'magazine', 'neutral'], ['Інсайдер', 'portal', 'probiz'],
];

function mediaState() {
  if (state.media) return state.media;
  const outlets = WORLD_OUTLETS.map(([name, type, policy]) => {
    const T = OUTLET_TYPES[type];
    const co = chance(0.4) ? pick(aliveCos()) : null;
    return { id: uid(), name, type, policy, owner: co ? co.id : 'independent', audience: Math.round(T.base * rnd(0.5, 1.2)), trust: Math.round(rnd(40, 75)),
      staff: { journalist: Math.round(T.need * 0.5), editor: Math.round(T.need * 0.15), host: type === 'tv' || type === 'radio' ? Math.round(T.need * 0.1) : 0, analyst: Math.round(T.need * 0.1) }, ads: 1, founded: 0, logo: ['🟥', '🟦', '🟩', '🟨', '🟪', '🟧'][ri(0, 5)] };
  });
  state.media = { outlets, campaigns: [], corpRep: 55, trust: 55, influence: 0, factcheck: 0.5, sued: 0, hist: [] };
  return state.media;
}
const myOutlets = () => mediaState().outlets.filter((o) => o.owner === 'player');
function outletQuality(o) {
  const T = OUTLET_TYPES[o.type];
  const pts = sum(Object.entries(o.staff), ([r, n]) => n * MEDIA_ROLES[r].w);
  return clamp(pts / (T.need * 1.3), 0.1, 1.3);
}
const outletCosts = (o) => (OUTLET_TYPES[o.type].ops + sum(Object.entries(o.staff), ([r, n]) => n * MEDIA_ROLES[r].wage)) * priceLvl();
const outletRevenue = (o) => (o.audience / 1000) * OUTLET_TYPES[o.type].cpm * o.ads * state.econ.demand * priceLvl() * (0.7 + o.trust / 200);
const outletPrice = (o) => Math.round((Math.max(0, outletRevenue(o) - outletCosts(o)) * 365 * 3 + OUTLET_TYPES[o.type].setup * 0.6 * priceLvl()) * (0.8 + o.trust / 250));
const outletPower = (o) => (o.audience / 1e6) * (o.trust / 100) * outletQuality(o) * MEDIA_POLICIES[o.policy].power;

// ---------- Новини з наслідками ----------
/** Новина з ціллю й впливом: impact < 0 шкодить (репутація, акції), > 0 допомагає. */
function pubNews(text, cat, kind, opts = {}) {
  news(text, cat, kind, opts.breaking);
  const n = state.news[0];
  if (opts.target) { n.target = opts.target; n.impact = opts.impact || 0; n.fake = !!opts.fake; n.source = opts.source || null; }
  if (opts.target && opts.impact) applyReputation(opts.target, opts.impact);
}
function applyReputation(target, impact) {
  const M = mediaState();
  if (target === 'player') {
    M.corpRep = clamp(M.corpRep + impact * 5, 0, 100);
    if (state.ipo) state.ipo.price *= 1 + impact * 0.03;
  } else {
    const co = coById(target); if (!co) return;
    co.pr = clamp((co.pr == null ? 50 : co.pr) + impact * 5, 0, 100);
    co.price = Math.max(0.05, co.price * (1 + impact * 0.04));
  }
}
/** Множник покупців від репутації корпорації гравця (0.85…1.15). */
const prTraffic = () => (state.media ? 0.85 + 0.3 * state.media.corpRep / 100 : 1);

// ---------- Дії гравця ----------
function foundOutlet(type, name) {
  const T = OUTLET_TYPES[type], cost = Math.round(T.setup * priceLvl());
  if (state.cash < cost) return toast(`Запуск коштує ${moneyK(cost)}.`, 'bad');
  book('capex', -cost);
  mediaState().outlets.push({ id: uid(), name: name || `${state.company.split(' ')[0]} ${T.name}`, type, policy: 'neutral', owner: 'player', audience: Math.round(T.base * 0.1), trust: 50,
    staff: { journalist: Math.round(T.need * 0.4), editor: Math.round(T.need * 0.1), host: type === 'tv' || type === 'radio' ? 2 : 0, analyst: 1 }, ads: 1, founded: state.day, logo: '🟨' });
  pubNews(`📡 ${state.company} запускає ${T.name.toLowerCase()} «${name || T.name}».`, 'media', 'good');
  checkAchievements();
}
function buyOutlet(id) {
  const o = mediaState().outlets.find((x) => x.id === id); if (!o || o.owner === 'player') return;
  const price = outletPrice(o);
  if (state.cash < price) return toast(`Купівля коштує ${moneyK(price)}.`, 'bad');
  book('capex', -price);
  const prev = o.owner !== 'independent' ? coById(o.owner) : null;
  if (prev) prev.cash += price;
  o.owner = 'player';
  pubNews(`📡 ${state.company} купує медіа «${o.name}»${prev ? ` у «${prev.name}»` : ''} за ${moneyK(price)}.`, 'media', '', { breaking: o.type === 'tv' });
  checkAchievements();
}
function sellOutlet(id) {
  const o = mediaState().outlets.find((x) => x.id === id); if (!o || o.owner !== 'player') return;
  const v = Math.round(outletPrice(o) * 0.9);
  book('assetSale', v); o.owner = 'independent';
  log(`Медіа «${o.name}» продано за ${money(v)}.`, 'good');
}
function mergeOutlets(aId, bId) {
  const M = mediaState(), a = M.outlets.find((x) => x.id === aId), b = M.outlets.find((x) => x.id === bId);
  if (!a || !b || a === b || a.owner !== 'player' || b.owner !== 'player' || a.type !== b.type) return toast('Об’єднувати можна лише власні медіа одного типу.', 'bad');
  a.audience = Math.round((a.audience + b.audience) * 0.9);
  a.trust = Math.round((a.trust + b.trust) / 2);
  for (const r of Object.keys(a.staff)) a.staff[r] += b.staff[r];
  M.outlets = M.outlets.filter((x) => x !== b);
  log(`📡 «${b.name}» об’єднано з «${a.name}».`, 'good');
}

function launchCampaign(type, outletId, target, bots) {
  const M = mediaState(), C = CAMPAIGNS_INFO[type];
  const o = M.outlets.find((x) => x.id === outletId && x.owner === 'player');
  if (!o) return toast('Оберіть власне медіа.', 'bad');
  const cost = Math.round(C.cost * priceLvl() * (bots ? 1.5 : 1) * (o.type === 'tv' ? 2 : 1));
  if (state.cash < cost) return toast(`Кампанія коштує ${moneyK(cost)}.`, 'bad');
  if ((type === 'expose' || type === 'smear') && !target) return toast('Оберіть ціль.', 'bad');
  book('marketing', -cost);
  M.campaigns.push({ id: uid(), by: 'player', via: o.id, type, target: type === 'pr' || type === 'counter' ? 'player' : target, bots: !!bots, fake: C.fake, days: 7, strength: outletPower(o) * (bots ? 1.5 : 1), started: state.day });
  log(`${C.icon} Запущено: ${C.name}${target && target !== 'player' ? ` проти «${(coById(target) || {}).name}»` : ''} через «${o.name}».`);
}
/** Чи має ціль реальні проблеми (тоді розслідування правдиве й сильне). */
function hasIssues(target) {
  if (target === 'player') return (state.gov && state.gov.violations.player > 0) || state.cash < 0 || (state.media && state.media.sued > 0);
  const co = coById(target); if (!co) return false;
  return co.debt > co.cash || co.ema < 0 || (state.gov && state.gov.cases.some((c) => c.target === target && c.outcome && c.outcome.startsWith('Порушення')));
}

// ---------- Щоденна симуляція ----------
function mediaDaily() {
  const M = mediaState();
  let totalPow = 0, myPow = 0;
  for (const o of M.outlets) {
    const T = OUTLET_TYPES[o.type], P = MEDIA_POLICIES[o.policy];
    const q = outletQuality(o);
    const target = T.base * (0.4 + q) * (0.6 + o.trust / 100) * P.aud * (o.owner === 'player' ? 1 + 0.03 * state.depts.marketing : 1);
    o.audience = Math.round(o.audience + (target - o.audience) * 0.03);
    o.trust = clamp(o.trust + P.trust + (q - 0.8) * 0.05 + (M.trust - 50) * 0.002, 2, 98);
    const net = outletRevenue(o) - outletCosts(o);
    if (o.owner === 'player') book('media', net);
    else if (o.owner !== 'independent') { const co = coById(o.owner); if (co && co.alive) co.cash += net; else o.owner = 'independent'; }
    const pw = outletPower(o); totalPow += pw; if (o.owner === 'player') myPow += pw;
  }
  M.influence = totalPow ? Math.round(myPow / totalPow * 100) : 0;
  // Кампанії
  for (const c of [...M.campaigns]) {
    c.days--;
    const counter = M.campaigns.filter((x) => x.type === 'counter' && x.target === c.target && x !== c).length;
    if (c.type === 'pr') applyReputation(c.by, 0.25 * c.strength);
    else if (c.type === 'expose') { const real = hasIssues(c.target); applyReputation(c.target, -(real ? 0.4 : 0.08) * c.strength / (1 + counter)); if (!real && chance(0.03)) defamation(c, 'безпідставні звинувачення'); }
    else if (c.type === 'smear') applyReputation(c.target, -0.45 * c.strength / (1 + counter));
    if (c.fake) {
      // Незалежний фактчекінг: боти й спростування цілі підвищують шанс викриття
      const p = 0.04 + (c.bots ? 0.05 : 0) + M.factcheck * 0.03 + counter * 0.1;
      if (chance(p)) { exposeFake(c); continue; }
    }
    if (c.days <= 0) M.campaigns = M.campaigns.filter((x) => x !== c);
  }
  // ІІ-компанії з власними медіа атакують ворогів (зокрема вас)
  for (const o of M.outlets) {
    if (o.owner === 'player' || o.owner === 'independent') continue;
    const co = coById(o.owner); if (!co) continue;
    if ((co.rivalry || 0) > 0.55 && chance(0.02)) {
      const type = hasIssues('player') ? 'expose' : chance(0.5) ? 'smear' : 'expose';
      M.campaigns.push({ id: uid(), by: co.id, via: o.id, type, target: 'player', bots: chance(0.4), fake: type === 'smear', days: 7, strength: outletPower(o), started: state.day });
      pubNews(`🗯️ «${o.name}» (власник «${co.name}») публікує серію матеріалів проти ${state.company}.`, 'media', 'bad');
    }
  }
  // Репутація корпорації тяжіє до «фундаменту»: магазини, порушення, банкрутство, перемоги
  const base = 45 + (state.biz.length ? (sum(state.biz, (b) => b.rep) / state.biz.length - 50) * 0.3 : 0) - (state.gov ? state.gov.violations.player * 5 : 0) + (state.sport ? state.sport.trophies * 2 : 0);
  M.corpRep = clamp(M.corpRep + (clamp(base, 10, 85) - M.corpRep) * 0.01, 0, 100);
  for (const co of aliveCos()) { if (co.pr == null) co.pr = 50; co.pr += (50 - co.pr) * 0.01; co.prMult = 0.85 + 0.3 * co.pr / 100; }
  // Скандали ІІ-компаній — випадкові новини
  if (chance(0.02)) { const co = pick(aliveCos()); pubNews(`📰 Скандал: ${pick(['витік даних клієнтів', 'порушення умов праці', 'приховані борги', 'неякісна продукція'])} у «${co.name}».`, 'business', 'bad', { target: co.id, impact: -1.5 }); }
  M.hist.push({ day: state.day, rep: M.corpRep, influence: M.influence }); if (M.hist.length > 120) M.hist.shift();
}

function exposeFake(c) {
  const M = mediaState(), o = M.outlets.find((x) => x.id === c.via);
  M.campaigns = M.campaigns.filter((x) => x !== c);
  if (o) o.trust = Math.max(2, o.trust - 15);
  const by = c.by === 'player' ? state.company : (coById(c.by) || {}).name;
  pubNews(`✅ Фактчек: матеріали «${o ? o.name : '?'}» проти ${c.target === 'player' ? state.company : (coById(c.target) || {}).name} виявилися фейком. Замовник — ${by}.`, 'media', c.by === 'player' ? 'bad' : 'good', { breaking: true, target: c.by, impact: -2 });
  applyReputation(c.target, 1);
  defamation(c, 'поширення неправдивої інформації');
}
/** Позов за наклеп: штраф для замовника (рішення суду). */
function defamation(c, why) {
  const fine = Math.round(rnd(1, 4) * 1e6 * priceLvl() * (c.bots ? 1.5 : 1));
  if (c.by === 'player') { book('fines', -fine); mediaState().sued++; log(`⚖️ Суд: ${why}. Штраф ${money(fine)}.`, 'bad'); }
  else { const co = coById(c.by); if (co) co.cash -= fine; if (c.target === 'player') { book('legal', fine * 0.5); log(`⚖️ Суд присудив вам компенсацію ${money(fine * 0.5)} від «${co ? co.name : ''}».`, 'good'); } }
  news(`⚖️ Суд у справі про наклеп (${why}): штраф ${moneyK(fine)}.`, 'media');
}

HOOKS.day.push(mediaDaily);
