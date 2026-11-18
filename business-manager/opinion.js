'use strict';
/* БІЗНЕС ІМПЕРІЯ — суспільна думка (оновлення 4). Доповнює media.js.
   Рейтинг схвалення гравця (його формують медіа, репутація, благодійність, скандали) і настрої суспільства
   за темами (податки, екологія, ставлення до бізнесу, безпека, соцпрограми). Інтерв’ю з вибором тону,
   рекламні кампанії, кампанії з формування думки через власні медіа, особисті й корпоративні скандали
   з вибором реакції. Думка впливає на популярність (вибори), голосування за закони й продажі. */

const ISSUES = {
  business: { name: 'Ставлення до великого бізнесу', plus: 'позитивне', minus: 'негативне' },
  taxes: { name: 'Податки для бізнесу', plus: 'за зниження', minus: 'за підвищення' },
  ecology: { name: 'Екологія', plus: 'за жорсткі норми', minus: 'байдуже' },
  safety: { name: 'Безпека', plus: 'за посилення поліції', minus: 'спокійно' },
  social: { name: 'Соціальні програми', plus: 'за підвищення виплат', minus: 'за економію' },
};
/** Який закон підтримує яка думка: [тема, напрям]. */
const BILL_OPINION = { taxCut: ['taxes', 1], taxHike: ['taxes', -1], minWage: ['social', 1], subsidyGreen: ['ecology', 1], lawOrder: ['safety', 1], dereg: ['business', 1], antitrustUp: ['business', -1], infra: ['social', 0.5], mediaLaw: ['business', -0.3] };
const TONES = {
  humble: { name: 'Скромно й по-людськи', icon: '🙂', gain: [2, 4], risk: 0 },
  visionary: { name: 'Візіонерськи, про майбутнє', icon: '🚀', gain: [4, 8], risk: 0.25 },
  provocative: { name: 'Провокаційно', icon: '🔥', gain: [6, 12], risk: 0.5 },
};
const ADS = {
  image: { name: 'Іміджева реклама корпорації', icon: '🏛️', cost: 3e5, desc: 'репутація корпорації й схвалення' },
  product: { name: 'Реклама продукції', icon: '🛍️', cost: 5e5, desc: '+8% покупців у всіх магазинах на 14 днів' },
  social: { name: 'Соціальна реклама', icon: '🤝', cost: 2e5, desc: 'схвалення й краще ставлення до бізнесу' },
};
function opinionState() {
  if (!state.opinion) state.opinion = { approval: 45, issues: { business: rnd(-10, 15), taxes: rnd(-10, 10), ecology: rnd(0, 25), safety: rnd(-5, 20), social: rnd(0, 25) }, scandals: [], hist: [], camps: [], lastInterview: 0, seq: 1 };
  return state.opinion;
}
function opinionBias(billKey) { const m = BILL_OPINION[billKey]; if (!m || !state.opinion) return 0; return state.opinion.issues[m[0]] / 100 * m[1] * 0.2; }
const approvalTraffic = () => (state.opinion ? 0.95 + state.opinion.approval / 1000 : 1);

function interview(tone, outletId) {
  const O = opinionState(), T = TONES[tone];
  if (state.day - O.lastInterview < 5) return toast('Наступне інтерв’ю — не раніше ніж через 5 днів після попереднього.', 'bad');
  const own = outletId && state.media && state.media.outlets.find((o) => o.id === outletId && o.owner === 'player');
  const outlet = own || (state.media ? pick(state.media.outlets.filter((o) => o.owner !== 'player')) : null);
  O.lastInterview = state.day;
  const reach = outlet ? Math.min(2, outletPower(outlet) + 0.4) : 1;
  const fail = chance(T.risk * (own ? 0.4 : 1));
  if (fail) {
    const d = -rnd(T.gain[0], T.gain[1]) * 0.7;
    O.approval = clamp(O.approval + d, 0, 100);
    news(`🎙️ Інтерв’ю ${state.me.name} для «${outlet ? outlet.name : 'ТБ'}» викликало хвилю критики в соцмережах.`, 'media', 'bad');
    if (tone === 'provocative') addScandal('Провокаційні заяви в інтерв’ю', 6, 'personal');
  } else {
    const d = rnd(T.gain[0], T.gain[1]) * reach;
    O.approval = clamp(O.approval + d, 0, 100);
    if (tone === 'visionary') O.issues.business = clamp(O.issues.business + 3, -100, 100);
    news(`🎙️ ${state.me.name} дав(-ла) інтерв’ю «${outlet ? outlet.name : 'ТБ'}»: ${tone === 'humble' ? 'глядачі оцінили щирість' : tone === 'visionary' ? 'смілива візія майбутнього зацікавила інвесторів' : 'гучні заяви стали трендом дня'}.`, 'media', 'good');
    if (state.ipo && tone === 'visionary') state.ipo.price *= 1.02;
  }
}
function adCampaign(kind) {
  const A = ADS[kind], O = opinionState(), c = Math.round(A.cost * priceLvl());
  if (state.cash < c) return toast(`Кампанія коштує ${moneyK(c)}.`, 'bad');
  book('marketing', -c);
  if (kind === 'image') { O.approval = clamp(O.approval + 3, 0, 100); if (state.media) state.media.corpRep = clamp(state.media.corpRep + 4, 0, 100); }
  if (kind === 'product') state.mods.push({ kind: 'traffic', key: '*', mult: 1.08, days: 14, label: '🛍️ Рекламна кампанія' });
  if (kind === 'social') { O.approval = clamp(O.approval + 4, 0, 100); O.issues.business = clamp(O.issues.business + 4, -100, 100); }
  log(`${A.icon} ${A.name}: запущено (${money(c)}).`, 'good');
}
/** Кампанія з формування думки: через власні медіа (сильніше) або платне розміщення. Боти — ризик скандалу. */
function opinionCampaign(issue, dir, bots) {
  const O = opinionState();
  const mine = state.media ? state.media.outlets.filter((o) => o.owner === 'player') : [];
  const power = mine.length ? Math.min(3, sum(mine, outletPower)) : 0.4;
  const c = Math.round(4e5 * priceLvl() * (mine.length ? 0.6 : 1.5) * (bots ? 1.4 : 1));
  if (state.cash < c) return toast(`Кампанія коштує ${moneyK(c)}.`, 'bad');
  book('marketing', -c);
  O.camps.push({ issue, dir: dir > 0 ? 1 : -1, power: power * (bots ? 1.5 : 1), bots: !!bots, days: 10 });
  log(`📣 Кампанія «${ISSUES[issue].name}: ${dir > 0 ? ISSUES[issue].plus : ISSUES[issue].minus}» на 10 днів (${money(c)}).`);
}
function addScandal(text, severity, kind) {
  const O = opinionState();
  if (O.scandals.some((s) => s.text === text && !s.done)) return;
  O.scandals.push({ id: 'sc' + (O.seq++), text, sev: severity, kind, day: state.day, until: state.day + 12, done: false });
  news(`🗞️ Скандал: ${text} (${state.me.name}, ${state.company}).`, 'media', 'bad', severity >= 8);
}
function respondScandal(id, how) {
  const O = opinionState(), s = O.scandals.find((x) => x.id === id && !x.done); if (!s) return;
  const own = state.media && state.media.outlets.some((o) => o.owner === 'player');
  if (how === 'apologize') { s.sev *= 0.4; O.approval = clamp(O.approval - 1, 0, 100); s.done = true; news(`🙏 ${state.me.name} публічно перепросив(-ла): «${s.text}». Суспільство сприйняло стримано.`, 'media'); }
  else if (how === 'deny') { if (chance(0.5)) { s.sev *= 0.3; s.done = true; log('🛡️ Спростування спрацювало.', 'good'); } else { s.sev *= 1.6; news(`🗞️ Нові докази: заперечення ${state.me.name} лише погіршили ситуацію.`, 'media', 'bad'); } }
  else if (how === 'counter') { if (!own) return toast('Для контратаки потрібне власне медіа.', 'bad'); if (chance(0.65)) { s.sev *= 0.35; s.done = true; log('📡 Ваші медіа перехопили порядок денний.', 'good'); } else { s.sev *= 1.3; if (state.media) state.media.trust = Math.max(0, state.media.trust - 5); } }
}

function opinionDaily() {
  const O = opinionState(), e = state.econ, I = O.issues;
  // Активні кампанії зсувають настрої
  for (const c of [...O.camps]) {
    I[c.issue] = clamp(I[c.issue] + c.dir * c.power * 1.2, -100, 100);
    if (c.bots && chance(0.04)) { addScandal('Мережу ботів, що просувала кампанію, викрили фактчекери', 7, 'corp'); c.days = 0; }
    if (--c.days <= 0) O.camps = O.camps.filter((x) => x !== c);
  }
  // Природний дрейф настроїв до подій у світі
  const heavy = state.fac.filter((f) => ['oilwell', 'gasfield', 'refinery', 'steelmill', 'mine', 'cementplant', 'powerplant'].includes(f.kind)).length;
  const drift = { business: (state.media ? (state.media.corpRep - 50) * 0.3 : 0) + (e.phase === 'crisis' ? -25 : e.phase === 'boom' ? 10 : 0), taxes: (e.phase === 'recession' || e.phase === 'crisis') ? 20 : -5, ecology: 15 + Math.min(40, heavy * 2), safety: state.crime ? (Object.keys(state.unlocked || {}).reduce((a, c) => a + crimeIndex(c), 0) * 40 - 5) : 5, social: e.unemployment > 8 ? 30 : 5 };
  for (const k of Object.keys(I)) I[k] = clamp(I[k] + ((drift[k] || 0) - I[k]) * 0.01 + rnd(-0.5, 0.5), -100, 100);
  // Скандали
  let pen = 0;
  for (const s of O.scandals) if (!s.done || state.day < s.until) { if (state.day < s.until) pen += s.sev * 0.08; }
  O.scandals = O.scandals.filter((s) => state.day - s.day < 60);
  // Схвалення гравця: медіа, репутація, благодійність, статус, скандали
  const charity = state.life ? Math.min(12, Math.sqrt(state.life.charity / 1e6) * 3) : 0;
  const target = clamp(30 + (state.media ? state.media.corpRep * 0.3 + state.media.influence * 0.15 : 15) + charity + (I.business > 0 ? I.business * 0.08 : I.business * 0.12) - pen * 4 + (typeof goalDone === 'function' ? (goalDone('mediamogul') ? 5 : 0) + (goalDone('legend') ? 10 : 0) : 0), 0, 100);
  O.approval = clamp(O.approval + (target - O.approval) * 0.03 - pen * 0.3, 0, 100);
  // Медіа впливають на рейтинг гравця: популярність у політиці тяжіє до схвалення
  if (state.pol) state.pol.me.popularity = clamp(state.pol.me.popularity + (O.approval - state.pol.me.popularity) * 0.02, 0, 100);
  // Випадкові скандали: що вища публічність — то частіше
  const pub = (state.media ? state.media.influence : 0) / 100 + (state.pol && (state.pol.me.office || state.pol.me.party) ? 0.4 : 0) + Math.min(0.5, Math.log10(Math.max(10, netWorth())) / 25);
  if (chance(0.004 * (1 + pub))) {
    const opts = [];
    if (state.life && state.life.lux.length && O.approval < 55) opts.push(['Демонстративна розкіш на тлі проблем у країні', 6, 'personal']);
    if (heavy && I.ecology > 20) opts.push(['Викиди на ваших підприємствах перевищують норми', 7, 'corp']);
    if (state.staff.some((p) => p.morale < 35)) opts.push(['Працівники скаржаться на умови праці', 5, 'corp']);
    if (state.gov && state.gov.violations.player) opts.push(['Журналісти нагадали про ваші антимонопольні порушення', 5, 'corp']);
    opts.push(['Таблоїди обговорюють ваше особисте життя', 3, 'personal'], ['Колишній партнер дає скандальне інтерв’ю', 5, 'personal']);
    const [t, sev, k] = pick(opts); addScandal(t, sev, k);
  }
  O.hist.push({ d: state.day, a: Math.round(O.approval) }); if (O.hist.length > 180) O.hist.shift();
}

HOOKS.day.push(opinionDaily);
