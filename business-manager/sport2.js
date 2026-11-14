'use strict';
/* БІЗНЕС ІМПЕРІЯ — спортивна імперія (Ultimate 3.0, етап 7, частина 2).
   Власні клуби (купівля в лізі), склад спортсменів з рейтингом, віком, зарплатою й контрактом; тренери;
   трансферний ринок (купівля/продаж, ІІ-клуби теж торгують); стадіони (місткість, квитки); телетрансляції
   (бонус, якщо у вас власний телеканал); мерчандайзинг; призові; міжнародний турнір чемпіонів;
   власна ліга. Розширює спонсорство з fun.js, не замінюючи його. */

const COACHES = [{ name: 'Без головного тренера', wage: 0, bonus: 0 }, { name: 'Молодий тренер', wage: 1500, bonus: 2 }, { name: 'Досвідчений тренер', wage: 5000, bonus: 5 }, { name: 'Зірковий тренер', wage: 15000, bonus: 9 }];
const STADIUM = [5000, 15000, 30000, 50000, 80000];
const ATH_FIRST = ['Олекс', 'Марко', 'Яків', 'Лука', 'Ден', 'Тім', 'Еліас', 'Крістіан', 'Ріо', 'Сем', 'Оскар', 'Нікола', 'Жоау', 'Кай', 'Педро'];
const ATH_LAST = ['Шевчук', 'Рейєс', 'Мюллер', 'Сато', 'Новак', 'Сільва', 'Коваль', 'Дюбуа', 'Россі', 'Ким', 'Ліндквіст', 'Гарсія', 'Бойко', 'Окафор'];
const SQUAD = 12, LINEUP = 8;

function clubsState() {
  const S = sportState();
  if (!S.clubs) S.clubs = { market: [], cupHist: [], ownLeague: null, seq: 1 };
  if (S.clubs.ownLeague) restoreOwnLeague(S.clubs.ownLeague);
  return S.clubs;
}
const myClubs = () => (state.sport ? state.sport.teams.filter((t) => t.owner === 'player') : []);
function makeAthlete(level) {
  const r = clamp(Math.round(level + rnd(-12, 12)), 30, 97), age = ri(18, 34);
  return { id: 'a' + (clubsState().seq++), name: `${pick(ATH_FIRST)} ${pick(ATH_LAST)}`, rating: r, age, wage: Math.round(Math.pow(r / 50, 3) * 400), until: state.day + ri(120, 500), pot: clamp(r + ri(0, 15) - Math.max(0, age - 24), r, 99) };
}
const athValue = (a) => Math.round(Math.pow(a.rating / 50, 4) * 2e5 * Math.max(0.3, 1 - Math.max(0, a.age - 27) * 0.08) * priceLvl());
const clubPrice = (t) => Math.round((t.reach * 18 + Math.pow(t.strength / 50, 3) * 4e6 + t.titles * 2e6) * priceLvl());
function squadStrength(t) {
  if (!t.squad || !t.squad.length) return t.strength;
  const top = [...t.squad].sort((a, b) => b.rating - a.rating).slice(0, LINEUP);
  return clamp(sum(top, (a) => a.rating) / LINEUP + COACHES[t.coach || 0].bonus, 20, 99);
}

function buyClub(id) {
  const t = sportState().teams.find((x) => x.id === id); if (!t || t.owner === 'player') return;
  const p = clubPrice(t); if (state.cash < p) return toast(`Клуб коштує ${moneyK(p)}.`, 'bad');
  book('capex', -p);
  t.owner = 'player'; t.boughtFor = p; t.director = true; t.stadium = t.stadium || 1; t.coach = t.coach || 1; t.ticket = 1;
  if (!t.squad) t.squad = Array.from({ length: SQUAD }, () => makeAthlete(t.strength));
  t.strength = squadStrength(t);
  news(`⚽ ${state.company} купує клуб «${t.name}» (${LEAGUES[t.league].name}) за ${moneyK(p)}.`, 'city', 'good', true);
  checkAchievements();
}
function sellClub(id) {
  const t = sportState().teams.find((x) => x.id === id); if (!t || t.owner !== 'player') return;
  const v = Math.round(clubPrice(t) * 0.9); book('assetSale', v); t.owner = null;
  log(`Клуб «${t.name}» продано за ${money(v)}.`);
}
function buyAthlete(teamId, aid) {
  const C = clubsState(), t = sportState().teams.find((x) => x.id === teamId), a = C.market.find((x) => x.id === aid);
  if (!t || !a) return;
  if (t.squad.length >= 18) return toast('Склад заповнений (18).', 'bad');
  const fee = athValue(a); if (state.cash < fee) return toast(`Трансфер коштує ${moneyK(fee)}.`, 'bad');
  book('sportExp', -fee);
  if (a.from) { const src = sportState().teams.find((x) => x.id === a.from); if (src) src.strength = Math.max(30, src.strength - a.rating / 40); }
  C.market = C.market.filter((x) => x !== a); delete a.from; a.until = state.day + 365;
  t.squad.push(a); t.strength = squadStrength(t);
  news(`✍️ Трансфер: ${a.name} (рейтинг ${a.rating}) переходить до «${t.name}» за ${moneyK(fee)}.`, 'city', 'good');
}
function sellAthlete(teamId, aid) {
  const t = sportState().teams.find((x) => x.id === teamId); if (!t) return;
  const a = t.squad.find((x) => x.id === aid); if (!a) return;
  if (t.squad.length <= LINEUP) return toast(`Мінімум ${LINEUP} гравців у складі.`, 'bad');
  const fee = Math.round(athValue(a) * 0.85);
  const buyer = pick(sportState().teams.filter((x) => x.league === t.league && x.owner !== 'player'));
  book('sportInc', fee); t.squad = t.squad.filter((x) => x !== a); t.strength = squadStrength(t);
  if (buyer) buyer.strength = Math.min(95, buyer.strength + a.rating / 60);
  log(`💸 ${a.name} проданий${buyer ? ` до «${buyer.name}»` : ''} за ${money(fee)}.`, 'good');
}
function renewAthlete(teamId, aid) {
  const t = sportState().teams.find((x) => x.id === teamId), a = t && t.squad.find((x) => x.id === aid); if (!a) return;
  const bonus = Math.round(a.wage * 30 * priceLvl()); if (state.cash < bonus) return toast('Недостатньо коштів.', 'bad');
  book('sportExp', -bonus); a.wage = Math.round(a.wage * 1.15); a.until = state.day + 365;
  log(`📝 Контракт ${a.name} продовжено на рік (бонус ${money(bonus)}).`);
}
function upgradeStadium(id) {
  const t = sportState().teams.find((x) => x.id === id); if (!t || t.stadium >= 5) return;
  const c = Math.round(STADIUM[t.stadium] * 1500 * priceLvl()); if (state.cash < c) return toast(`Коштує ${moneyK(c)}.`, 'bad');
  book('capex', -c); t.stadium++; t.stadiumVal = (t.stadiumVal || 0) + c;
  news(`🏟️ «${t.name}» відкриває оновлений стадіон на ${STADIUM[t.stadium - 1].toLocaleString('uk-UA')} місць.`, 'city', 'good');
}
const stadiumUpCost = (t) => Math.round(STADIUM[t.stadium] * 1500 * priceLvl());

// ---------- Власна ліга ----------
const OWN_LEAGUE_COST = 80e6;
function restoreOwnLeague(o) {
  if (LEAGUES.own) return;
  LEAGUES.own = { name: o.name, icon: LEAGUES[o.sport] ? LEAGUES[o.sport].icon : '🏆', teams: o.teams, own: true, sport: o.sport };
}
function foundLeague(sport, name) {
  const C = clubsState(); if (C.ownLeague) return;
  const c = Math.round(OWN_LEAGUE_COST * priceLvl()); if (state.cash < c) return toast(`Заснування ліги: ${moneyK(c)}.`, 'bad');
  book('capex', -c);
  const city = Object.keys(state.unlocked).map((k) => CITIES[k].name);
  const teams = Array.from({ length: 6 }, (_, i) => `${pick(city)} ${pick(['Юнайтед', 'Сіті', 'Атлетик', 'Ворріорз', 'Стар', 'Роялс', 'Шторм', 'Легіон'])}${i ? '' : ''}`).map((n, i) => `${n} ${['I', 'II', 'III', 'IV', 'V', 'VI'][i]}`.replace(/ I$/, ''));
  C.ownLeague = { name: name || `Суперліга ${state.company.split(' ')[0]}`, sport, teams, since: state.day };
  restoreOwnLeague(C.ownLeague);
  for (const n of teams) sportState().teams.push({ id: uid(), league: 'own', name: n, reach: Math.round(rnd(0.3, 2) * 1e6), strength: Math.round(rnd(55, 85)), points: 0, played: 0, sponsor: null, invest: 0, titles: 0, form: [] });
  news(`🏆 ${state.company} засновує нову професійну лігу «${C.ownLeague.name}». Права на трансляції належать засновнику.`, 'city', 'good', true);
  checkAchievements();
}
/** Дохід від ліги: права на трансляцію (бонус з власним ТБ). */
function leagueRights(lg) {
  const reach = sum(sportState().teams.filter((t) => t.league === lg), (t) => t.reach);
  const tv = state.media ? state.media.outlets.filter((o) => o.owner === 'player' && o.type === 'tv').length : 0;
  return reach * 0.002 * priceLvl() * (1 + 0.3 * Math.min(2, tv));
}

// ---------- Щоденна симуляція ----------
function clubsDaily() {
  const C = clubsState(), S = sportState();
  for (const t of myClubs()) {
    if (!t.squad) t.squad = Array.from({ length: SQUAD }, () => makeAthlete(t.strength));
    const wages = sum(t.squad, (a) => a.wage) * priceLvl() + COACHES[t.coach || 0].wage * priceLvl() + STADIUM[(t.stadium || 1) - 1] * 0.3 * priceLvl();
    book('sportExp', -wages);
    const merch = t.reach * 0.0012 * (0.6 + t.strength / 100) * priceLvl() * (1 + S.hype);
    const tv = leagueRights(t.league) / Math.max(1, S.teams.filter((x) => x.league === t.league).length) * (0.6 + t.points / Math.max(1, t.played * 3) * 0.8);
    book('sportInc', merch + tv);
    t.yInc = merch + tv; t.yExp = wages;
    // розвиток гравців, старіння, контракти
    for (const a of [...t.squad]) {
      if (a.age < 25 && a.rating < a.pot) a.rating = Math.min(a.pot, a.rating + 0.03 + COACHES[t.coach || 0].bonus * 0.004);
      if (a.age > 31) a.rating = Math.max(30, a.rating - 0.02);
      if (state.day % AGE_DAYS === 0) a.age++;
      if (a.until <= state.day) { t.squad = t.squad.filter((x) => x !== a); log(`📤 Контракт ${a.name} («${t.name}») завершився — гравець пішов вільним агентом.`, 'bad'); }
    }
    if (t.director) { // спортивний директор: продовжує контракти сильних і докуповує гравців
      book('sportExp', -3000 * priceLvl());
      for (const a of t.squad) if (a.until - state.day < 10 && a.rating >= t.strength - 12 && a.age < 33) { const b = a.wage * 30 * priceLvl(); if (state.cash > b * 5) { book('sportExp', -b); a.wage = Math.round(a.wage * 1.12); a.until = state.day + 365; } }
      if (t.squad.length < SQUAD && state.cash > 0) {
        const budget = Math.max(0, state.cash * 0.02);
        const best = C.market.filter((a) => athValue(a) <= budget && a.rating > t.strength - 15).sort((a, b) => b.rating - a.rating)[0];
        if (best) { C.market = C.market.filter((x) => x !== best); book('sportExp', -athValue(best)); delete best.from; best.until = state.day + 365; t.squad.push(best); log(`✍️ Спортивний директор «${t.name}» підписав ${best.name} (рейтинг ${best.rating}).`); }
      }
    }
    while (t.squad.length < LINEUP) t.squad.push(makeAthlete(45));
    t.strength = squadStrength(t);
  }
  if (C.ownLeague) book('sportInc', leagueRights('own') * 0.5);
  // трансферний ринок
  C.market = C.market.filter((a) => a.listed > state.day - 30);
  while (C.market.length < 10) {
    const src = chance(0.5) ? pick(S.teams.filter((t) => t.owner !== 'player')) : null;
    const a = makeAthlete(src ? src.strength : rnd(45, 80)); a.listed = state.day; if (src) a.from = src.id;
    C.market.push(a);
  }
  // домашні матчі: квитки (раз на тиждень, у день туру)
  if (state.day % 7 === 0) for (const t of myClubs()) {
    const fill = clamp(0.35 + t.reach / 4e6 + (t.strength - 50) / 100 + S.hype, 0.1, 1) * (t.ticket === 2 ? 0.8 : t.ticket === 0 ? 1.1 : 1);
    const seats = Math.min(STADIUM[(t.stadium || 1) - 1], STADIUM[(t.stadium || 1) - 1] * fill);
    const inc = seats * [20, 35, 55][t.ticket == null ? 1 : t.ticket] * priceLvl();
    book('sportInc', inc); t.gate = { seats: Math.round(seats), inc };
  }
  // кінець сезону (fun.js скидає очки в той самий день — призові рахуємо до нього: хук стоїть раніше)
  if (state.day % SEASON_DAYS === SEASON_DAYS - 1) {
    for (const lg of Object.keys(LEAGUES)) {
      const ts = S.teams.filter((t) => t.league === lg).sort((x, y) => y.points - x.points || y.strength - x.strength);
      ts.forEach((t, i) => { if (t.owner === 'player') { const prize = Math.max(0, 6 - i) * 4e5 * priceLvl(); if (prize) { book('sportInc', prize); log(`🏅 «${t.name}» посіла ${i + 1} місце: призові ${money(prize)}.`, 'good'); } } });
    }
    if (S.season % 2 === 0) intlCup();
  }
}
/** Міжнародний турнір: чемпіони й призери ліг одного виду спорту + іноземні гості, плей-оф. */
function intlCup() {
  const S = sportState(), C = clubsState();
  for (const lg of Object.keys(LEAGUES).filter((k) => k !== 'own')) {
    const top = S.teams.filter((t) => t.league === lg || (LEAGUES.own && LEAGUES.own.sport === lg && t.league === 'own')).sort((x, y) => y.points - x.points || y.strength - x.strength).slice(0, 2);
    const guests = Array.from({ length: 2 }, () => ({ name: `${pick(['Реал', 'Інтер', 'Олімпік', 'Спартак', 'Аякс', 'Бенфіка', 'Селтік', 'Порту'])} (гість)`, strength: rnd(65, 92), guest: true }));
    let round = [...top, ...guests].sort(() => Math.random() - 0.5);
    while (round.length > 1) {
      const next = [];
      for (let i = 0; i + 1 < round.length; i += 2) { const a = round[i], b = round[i + 1]; next.push(Math.random() < a.strength / (a.strength + b.strength) ? a : b); }
      round = next;
    }
    const w = round[0]; C.cupHist.unshift({ day: state.day, league: lg, winner: w.name, mine: w.owner === 'player' || w.sponsor === 'player' }); if (C.cupHist.length > 20) C.cupHist.length = 20;
    news(`🌍 Міжнародний кубок (${LEAGUES[lg].name}): переміг «${w.name}».`, 'city', w.owner === 'player' ? 'good' : '');
    if (w.owner === 'player') { const p = 8e6 * priceLvl(); book('sportInc', p); S.trophies++; S.hype += 0.08; w.reach = Math.round(w.reach * 1.25); log(`🌍 «${w.name}» виграв міжнародний кубок! Призові ${money(p)}, фанатів +25%.`, 'good'); checkAchievements(); }
  }
}
const clubsValue = () => sum(myClubs(), (t) => clubPrice(t) + (t.stadiumVal || 0) * 0.7);

HOOKS.day.unshift(clubsDaily); // раніше за sportDaily, щоб бачити очки сезону
