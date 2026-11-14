'use strict';
/* БІЗНЕС ІМПЕРІЯ — венчурні інвестиції в стартапи та спонсорство спортивних команд. */

// ================= Стартапи =================
const VC_TIERS = {
  safe: { name: 'Надійний', icon: '🟢', p: 0.85, mult: [1.15, 1.6], fail: 0.4, ask: [50e3, 600e3], days: [40, 80], desc: 'Стабільний бізнес: висока ймовірність помірного прибутку.' },
  risky: { name: 'Ризиковий', icon: '🟠', p: 0.3, mult: [3, 7], fail: 0, ask: [150e3, 2.5e6], days: [60, 120], desc: 'Або великий прибуток, або повна втрата.' },
  unicorn: { name: 'Потенційний єдиноріг', icon: '🦄', p: 0.1, mult: [8, 30], fail: 0, ask: [2e6, 25e6], days: [90, 200], desc: 'Рідко злітає, але тоді повертає десятки вкладень.' },
};
const VC_THEMES = [
  ['ШІ-асистент для бухгалтерів', 'tech'], ['Агродрони для ферм', 'farm'], ['Сонячні панелі для дахів', 'power'], ['Платіжний фінтех', 'bank'],
  ['Доставка їжі за 15 хвилин', 'food'], ['Телемедицина', 'tech'], ['Інді-ігрова студія', 'games'], ['Електросамокати й шеринг', 'auto'],
  ['Кібербезпека для бізнесу', 'tech'], ['Біотех: нові ліки', 'bio'], ['Малі супутники', 'space'], ['Онлайн-освіта', 'tech'],
  ['Розумні склади й роботи', 'logistics'], ['Ресейл-платформа одягу', 'fashion'], ['Батареї для електромобілів', 'auto'], ['Вертикальні ферми', 'farm'],
];
const VC_PRE = ['Нейро', 'Агро', 'Еко', 'Квант', 'Мета', 'Біо', 'Кібер', 'Фін', 'Смарт', 'Гео', 'Аеро', 'Мед', 'Вольт', 'Орбіт'];
const VC_SUF = ['Лаб', 'Тек', 'Флоу', 'Хаб', 'Сенс', 'Мейт', 'Пей', 'Бот', 'Віжн', 'Вейв', 'Нова', 'Ворк'];

/** Чи має гравець експертизу в темі стартапу (підвищує шанс успіху). */
function vcSynergy(theme) {
  const has = (pred) => state.biz.some(pred) || state.fac.some(pred);
  switch (theme) {
    case 'tech': case 'games': return state.fac.some((f) => f.kind === 'office');
    case 'farm': return state.fac.some((f) => f.kind === 'farm' || f.kind === 'foodplant');
    case 'power': return state.fac.some((f) => f.kind === 'powerplant');
    case 'bank': return !!(state.bank && state.bank.open);
    case 'food': return state.biz.some((b) => ['grocery', 'fastfood', 'restaurant', 'coffee'].includes(b.type));
    case 'auto': return state.carModels.length > 0 || has((u) => u.type === 'dealership' || u.kind === 'carplant');
    case 'logistics': return state.fac.some((f) => f.kind === 'logistics');
    case 'fashion': return state.biz.some((b) => b.type === 'fashion') || state.fac.some((f) => f.kind === 'textile');
    default: return false;
  }
}

function vcState() {
  if (!state.vc) state.vc = { pitches: [], active: [], done: [], stats: { invested: 0, returned: 0, exits: 0, fails: 0 } };
  while (state.vc.pitches.length < 6) state.vc.pitches.push(makePitch());
  return state.vc;
}
function makePitch() {
  const tierKey = pick(['safe', 'safe', 'risky', 'risky', 'unicorn']);
  const T = VC_TIERS[tierKey];
  const [theme, cat] = pick(VC_THEMES);
  const ask = Math.round(rnd(T.ask[0], T.ask[1]) * priceLvl() / 1000) * 1000;
  return {
    id: uid(), name: pick(VC_PRE) + pick(VC_SUF), theme, cat, tier: tierKey, ask, stake: +(rnd(0.08, 0.3)).toFixed(2),
    p: clamp(T.p + rnd(-0.12, 0.12), 0.03, 0.97), mult: +rnd(T.mult[0], T.mult[1]).toFixed(2),
    days: ri(T.days[0], T.days[1]), expires: state.day + ri(5, 12), dd: false,
  };
}
const ddCost = (p) => Math.round(p.ask * 0.02);
function vcDueDiligence(id) {
  const V = vcState(), p = V.pitches.find((x) => x.id === id);
  if (!p || p.dd) return;
  if (state.cash < ddCost(p)) return toast('Недостатньо коштів на перевірку.', 'bad');
  book('ventureInv', -ddCost(p)); p.dd = true;
}
function vcInvest(id) {
  const V = vcState(), i = V.pitches.findIndex((x) => x.id === id);
  if (i < 0) return;
  const p = V.pitches[i];
  if (state.cash < p.ask) return toast('Недостатньо коштів.', 'bad');
  book('ventureInv', -p.ask);
  const syn = vcSynergy(p.cat);
  const success = Math.random() < clamp(p.p + (syn ? 0.08 : 0), 0, 0.98);
  V.active.push({ ...p, invested: p.ask, value: p.ask, start: state.day, success, syn, hist: [p.ask], events: [] });
  V.pitches.splice(i, 1);
  V.stats.invested += p.ask;
  log(`🚀 Інвестовано ${money(p.ask)} у «${p.name}» (${p.theme}) за ${Math.round(p.stake * 100)}% частки.`, 'good');
  checkAchievements();
}
function vcSell(id) {
  const V = vcState(), i = V.active.findIndex((x) => x.id === id);
  if (i < 0) return;
  const a = V.active[i], v = Math.round(a.value * 0.85);
  book('ventureExit', v);
  V.stats.returned += v;
  V.done.unshift({ name: a.name, tier: a.tier, invested: a.invested, got: v, how: 'продано достроково', day: state.day });
  V.active.splice(i, 1);
  log(`Продано частку в «${a.name}» за ${money(v)}.`);
}
const venturesValue = () => (state.vc ? sum(state.vc.active, (a) => a.value) : 0);

function vcDaily() {
  const V = vcState();
  V.pitches = V.pitches.filter((p) => p.expires >= state.day);
  for (const a of [...V.active]) {
    const t = (state.day - a.start) / a.days;
    const T = VC_TIERS[a.tier];
    // Траєкторія вартості відображає (приховану) долю з шумом — уважний інвестор може вийти вчасно.
    const target = a.success ? a.invested * (1 + (a.mult - 1) * Math.pow(Math.min(1, t), 1.5)) : a.invested * Math.max(T.fail, 1 - Math.min(1, t) * 1.2);
    a.value = Math.max(0, target * (1 + gauss() * 0.06));
    a.hist.push(Math.round(a.value)); if (a.hist.length > 60) a.hist.shift();
    if (state.day % 20 === 0 && t < 1) {
      const ev = a.success ? pick(['закрив раунд A з вищою оцінкою', 'вийшов на прибуток', 'підписав великого клієнта', 'запустився в Європі'])
        : pick(['втратив ключового розробника', 'не залучив наступний раунд', 'зіткнувся з сильним конкурентом', 'скорочує команду']);
      a.events.unshift(`День ${state.day}: ${ev}`);
      news(`🚀 Стартап «${a.name}» ${ev}.`, 'tech', a.success ? 'good' : 'bad');
    }
    if (t >= 1) {
      const got = a.success ? Math.round(a.invested * a.mult) : Math.round(a.invested * T.fail);
      if (got) book('ventureExit', got);
      V.stats.returned += got;
      if (a.success) V.stats.exits++; else V.stats.fails++;
      V.done.unshift({ name: a.name, tier: a.tier, invested: a.invested, got, how: a.success ? (a.tier === 'unicorn' ? 'IPO — єдиноріг!' : 'продаж компанії') : got ? 'частково повернуто' : 'збанкрутував', day: state.day });
      if (V.done.length > 30) V.done.length = 30;
      V.active.splice(V.active.indexOf(a), 1);
      news(a.success ? `🎉 «${a.name}» — успішний вихід! Інвестори отримали ×${a.mult}.` : `💥 Стартап «${a.name}» закрився.`, 'tech', a.success ? 'good' : 'bad');
      log(a.success ? `🎉 Вихід із «${a.name}»: отримано ${money(got)} (вкладено ${money(a.invested)}).` : `💥 «${a.name}» не вижив: повернуто ${money(got)} з ${money(a.invested)}.`, a.success ? 'good' : 'bad');
      checkAchievements();
    }
  }
  while (V.pitches.length < 6) V.pitches.push(makePitch());
}

// ================= Спонсорство =================
const LEAGUES = {
  football: { name: 'Футбол', icon: '⚽', teams: ['Левенята', 'Морські Вовки', 'Дніпряни', 'Карпатські Орли', 'Столичні Леви', 'Степові Вітри', 'Портові Чайки', 'Гірники'] },
  racing: { name: 'Автоперегони', icon: '🏎️', teams: ['Торнадо Рейсинг', 'Блискавка Моторспорт', 'Сапсан Ф-Тім', 'Нічний Вовк Рейсинг', 'Альфа Спід', 'Кобальт Моторс'] },
  basketball: { name: 'Баскетбол', icon: '🏀', teams: ['Метеори', 'Вежі', 'Хвиля', 'Титани', 'Чорні Пантери', 'Кидок'] },
  esports: { name: 'Кіберспорт', icon: '🎮', teams: ['Кібер Козаки', 'Нуль Пінг', 'Пікселі', 'Фенікс Гейминг', 'Дарк Хорс', 'Глітч Сквад'] },
  hockey: { name: 'Хокей', icon: '🏒', teams: ['Льодовики', 'Білі Ведмеді', 'Буревій', 'Полярні Зорі', 'Кригоріз', 'Сніжні Барси'] },
};
const SEASON_DAYS = 56;

function sportState() {
  if (state.sport) return state.sport;
  const teams = [];
  for (const [lg, L] of Object.entries(LEAGUES)) {
    for (const name of L.teams) {
      const reach = Math.round(rnd(0.05, 3) * 1e6);
      const co = chance(0.6) ? pick(aliveCos()) : null;
      teams.push({ id: uid(), league: lg, name, reach, strength: Math.round(rnd(40, 90)), points: 0, played: 0, sponsor: co ? co.id : null, invest: 0, titles: 0, form: [] });
    }
  }
  state.sport = { teams, hype: 0, trophies: 0, season: 1 };
  return state.sport;
}
const sponsorCost = (t) => Math.round((800 + t.reach * 0.0025) * priceLvl());
const myTeams = () => (state.sport ? state.sport.teams.filter((t) => t.sponsor === 'player') : []);

function sponsorTeam(id) {
  const t = sportState().teams.find((x) => x.id === id);
  if (!t || t.sponsor === 'player') return;
  const fee = sponsorCost(t) * (t.sponsor ? 30 : 10); // переманити команду в конкурента дорожче
  if (state.cash < fee) return toast(`Контракт коштує ${moneyK(fee)} (підписання).`, 'bad');
  book('marketing', -fee);
  const prev = t.sponsor ? coById(t.sponsor) : null;
  t.sponsor = 'player'; t.since = state.day;
  news(`🤝 ${state.company} стає титульним спонсором «${t.name}» (${LEAGUES[t.league].name})${prev ? `, переманивши контракт у «${prev.name}»` : ''}.`, 'city', 'good');
  checkAchievements();
}
function dropTeam(id) {
  const t = sportState().teams.find((x) => x.id === id);
  if (!t || t.sponsor !== 'player') return;
  t.sponsor = null; t.invest = 0;
  log(`Спонсорство «${t.name}» завершено.`);
}

/** Множник відвідуваності магазинів від спонсорства та перемог. */
function sponsorTraffic() {
  if (!state.sport) return 1;
  const aw = sum(myTeams(), (t) => (t.reach / 1e6) * (0.5 + t.strength / 100));
  return 1 + Math.min(0.3, aw * 0.03 + state.sport.hype);
}
const racingBoost = () => 1 + 0.12 * myTeams().filter((t) => t.league === 'racing').length;

function playMatch(a, b) {
  const pa = a.strength / (a.strength + b.strength);
  const r = Math.random();
  const draw = a.league === 'football' || a.league === 'hockey' ? 0.22 : 0;
  let res;
  if (r < pa * (1 - draw)) res = 1; else if (r < pa * (1 - draw) + draw) res = 0; else res = -1;
  const pts = (x) => (x === 1 ? 3 : x === 0 ? 1 : 0);
  a.points += pts(res); b.points += pts(-res); a.played++; b.played++;
  a.form = [res, ...a.form].slice(0, 5); b.form = [-res, ...b.form].slice(0, 5);
  return res;
}

function sportDaily() {
  const S = sportState();
  S.hype = Math.max(0, S.hype * 0.96);
  // Утримання спонсорства та інвестиції в силу команди
  for (const t of myTeams()) {
    book('marketing', -sponsorCost(t) * (1 + t.invest));
    if (t.invest > 0) t.strength = Math.min(99, t.strength + 0.08 * t.invest);
  }
  for (const t of S.teams) if (t.sponsor !== 'player') t.strength = clamp(t.strength + rnd(-0.15, 0.15), 30, 95);
  if (state.day % 7 === 0) {
    for (const lg of Object.keys(LEAGUES)) {
      const ts = S.teams.filter((t) => t.league === lg).sort(() => Math.random() - 0.5);
      for (let i = 0; i + 1 < ts.length; i += 2) {
        const a = ts[i], b = ts[i + 1], res = playMatch(a, b);
        const mine = a.sponsor === 'player' ? a : b.sponsor === 'player' ? b : null;
        if (mine) {
          const won = (mine === a && res === 1) || (mine === b && res === -1), drawn = res === 0;
          if (won) S.hype += 0.01;
          news(`${LEAGUES[lg].icon} «${a.name}» — «${b.name}»: ${res === 1 ? 'перемога господарів' : res === -1 ? 'перемога гостей' : 'нічия'}. ${won ? `Ваша команда «${mine.name}» перемогла!` : drawn ? '' : `«${mine.name}» поступилися.`}`, 'city', won ? 'good' : drawn ? '' : 'bad');
        }
      }
    }
  }
  if (state.day % SEASON_DAYS === 0) {
    for (const lg of Object.keys(LEAGUES)) {
      const ts = S.teams.filter((t) => t.league === lg).sort((x, y) => y.points - x.points || y.strength - x.strength);
      const ch = ts[0];
      ch.titles++;
      const sp = ch.sponsor === 'player' ? state.company : ch.sponsor ? (coById(ch.sponsor) || {}).name : null;
      news(`🏆 Чемпіон сезону ${S.season} (${LEAGUES[lg].name}): «${ch.name}»${sp ? ` — спонсор ${sp}` : ''}.`, 'city', ch.sponsor === 'player' ? 'good' : '');
      if (ch.sponsor === 'player') {
        S.trophies++; S.hype += 0.05;
        for (const b of state.biz) b.rep = Math.min(100, b.rep + 5);
        log(`🏆 Ваша команда «${ch.name}» — чемпіон! Репутація всіх магазинів +5.`, 'good');
      } else if (ch.sponsor) { const co = coById(ch.sponsor); if (co) co.rep = Math.min(1.4, co.rep + 0.03); }
      for (const t of ts) { t.points = 0; t.played = 0; }
    }
    S.season++;
    checkAchievements();
  }
  // ІІ-компанії іноді підписують вільні команди
  if (chance(0.05)) { const free = S.teams.filter((t) => !t.sponsor); if (free.length) { const t = pick(free), co = pick(aliveCos()); if (co) { t.sponsor = co.id; news(`📝 «${co.name}» стає спонсором «${t.name}».`, 'city'); } } }
}

HOOKS.day.push(vcDaily, sportDaily);
