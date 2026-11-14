'use strict';
/* БІЗНЕС ІМПЕРІЯ — політика й влада.
   Партії (зокрема власна партія гравця), рейтинги, вибори президента, парламенту й мерів,
   коаліції, уряд (призначає профільних міністрів), законопроєкти й голосування, законне лобіювання,
   державні тендери, прозорість (ліміти фінансування, декларації, конфлікт інтересів),
   антикорупційні розслідування й незалежні суди. Центробанк, антимонопольний комітет і суди
   незалежні: їхніх керівників обирають за конкурсом на довгий строк, курс визначають самі.
   Ті самі правила діють для гравця й ІІ-компаній. */

const IDEOLOGIES = {
  right: { name: 'Праві (ринкові)', color: '#2f6fd6', tax: -0.02, wage: 0, strict: -0.08, protect: 0 },
  center: { name: 'Центр', color: '#8a8f98', tax: 0, wage: 0.01, strict: 0, protect: 0 },
  left: { name: 'Ліві (соціальні)', color: '#d64545', tax: 0.03, wage: 0.03, strict: 0.1, protect: 0.02 },
  national: { name: 'Протекціоністи', color: '#c99a1e', tax: 0.01, wage: 0.01, strict: 0.03, protect: 0.06 },
  green: { name: 'Зелені', color: '#2e9a5a', tax: 0.02, wage: 0.01, strict: 0.05, protect: 0.01 },
};
const PARTY_SEED = [
  ['Партія Розвитку', 'right'], ['Народний Союз', 'center'], ['Соціальна Справедливість', 'left'],
  ['Сильна Держава', 'national'], ['Зелена Платформа', 'green'], ['Нові Обличчя', 'center'],
];
const POLITICIANS = ['Олександр Гончар', 'Марія Литвин', 'Богдан Кравець', 'Юлія Савчук', 'Тарас Мельник', 'Ганна Остапчук', 'Роман Захарченко', 'Світлана Вовк', 'Ігор Панченко', 'Леся Коваленко', 'Максим Дорош', 'Віра Гриценко', 'Степан Яворський', 'Аліна Бойко'];
const SEATS = 300, TERM = 360;
const INDEPENDENT = ['cb', 'antitrust', 'courts']; // незалежні інституції
const CABINET = ['economy', 'tax', 'finreg'];      // призначає уряд
const BILLS = {
  taxCut: { name: 'Зниження податку на прибуток на 2 п.п.', ideo: { right: 0.9, center: 0.5, left: 0.1, national: 0.4, green: 0.25 }, apply: () => { state.econ.taxRate = clamp(+(state.econ.taxRate - 0.02).toFixed(2), 0.08, 0.45); } },
  taxHike: { name: 'Підвищення податку на прибуток на 2 п.п.', ideo: { right: 0.05, center: 0.35, left: 0.9, national: 0.5, green: 0.7 }, apply: () => { state.econ.taxRate = clamp(+(state.econ.taxRate + 0.02).toFixed(2), 0.08, 0.45); } },
  minWage: { name: 'Підвищення мінімальної зарплати на 5%', ideo: { right: 0.1, center: 0.5, left: 0.95, national: 0.6, green: 0.7 }, apply: () => { state.econ.wageLevel *= 1.05; } },
  subsidyInd: { name: 'Програма підтримки промисловості', ideo: { right: 0.4, center: 0.6, left: 0.5, national: 0.9, green: 0.2 }, apply: () => govState().subsidies.push({ target: 'industry', rate: 0.2, until: state.day + 120 }) },
  subsidyGreen: { name: 'Зелений перехід енергетики', ideo: { right: 0.3, center: 0.5, left: 0.6, national: 0.3, green: 0.98 }, apply: () => govState().subsidies.push({ target: 'energy', rate: 0.25, until: state.day + 120 }) },
  subsidyTech: { name: 'Податкові канікули для IT', ideo: { right: 0.8, center: 0.6, left: 0.3, national: 0.4, green: 0.5 }, apply: () => govState().subsidies.push({ target: 'tech', rate: 0.3, until: state.day + 120 }) },
  protect: { name: 'Захисні мита на імпорт (+5%)', ideo: { right: 0.15, center: 0.35, left: 0.5, national: 0.95, green: 0.4 }, apply: () => { const W = state.world; if (W) for (const r of new Set(Object.values(REGION_OF))) W.tariffs[r] = Math.min(0.5, (W.tariffs[r] || 0) + 0.05); } },
  freeTrade: { name: 'Угода про вільну торгівлю (мита −5%)', ideo: { right: 0.9, center: 0.6, left: 0.3, national: 0.05, green: 0.4 }, apply: () => { const W = state.world; if (W) for (const r of new Set(Object.values(REGION_OF))) W.tariffs[r] = Math.max(0, (W.tariffs[r] || 0) - 0.05); } },
  antitrustUp: { name: 'Розширення повноважень антимонопольного комітету', ideo: { right: 0.2, center: 0.55, left: 0.85, national: 0.5, green: 0.7 }, apply: () => { const m = govState().ministries.antitrust; m.strict = Math.min(0.95, +(m.strict + 0.1).toFixed(2)); } },
  dereg: { name: 'Дерегуляція бізнесу', ideo: { right: 0.95, center: 0.55, left: 0.1, national: 0.35, green: 0.15 }, apply: () => { const m = govState().ministries.tax; m.strict = Math.max(0.1, +(m.strict - 0.1).toFixed(2)); } },
  partyFinance: { name: 'Закон про прозоре фінансування партій', law: 'partyFinance', ideo: { right: 0.5, center: 0.7, left: 0.6, national: 0.4, green: 0.9 }, apply: () => { polState().laws.partyFinance = true; } },
  declarations: { name: 'Е-декларації для посадовців', law: 'declarations', ideo: { right: 0.5, center: 0.65, left: 0.6, national: 0.35, green: 0.85 }, apply: () => { polState().laws.declarations = true; } },
  lawOrder: { name: 'Посилення фінансування поліції', law: 'lawOrder', ideo: { right: 0.6, center: 0.6, left: 0.4, national: 0.95, green: 0.3 }, apply: () => { polState().lawOrder = true; } },
  mediaLaw: { name: 'Закон про фактчекінг і відповідальність медіа', ideo: { right: 0.4, center: 0.6, left: 0.6, national: 0.5, green: 0.7 }, apply: () => { if (state.media) state.media.factcheck = Math.min(1, state.media.factcheck + 0.25); } },
  infra: { name: 'Програма інвестицій в інфраструктуру', ideo: { right: 0.4, center: 0.7, left: 0.8, national: 0.7, green: 0.6 }, apply: () => { state.econ.demand *= 1.02; govState().budget.balance -= 2e8; } },
};

function polState() {
  if (state.pol) return state.pol;
  const parties = PARTY_SEED.map(([name, ideo], i) => ({ id: 'p' + i, name, ideo, leader: POLITICIANS[i], rating: 0, seats: 0, funds: Math.round(rnd(2, 10)) * 1e6, player: false, scandals: 0, donors: {} }));
  const raw = parties.map(() => rnd(3, 25)), tot = raw.reduce((a, b) => a + b, 0);
  parties.forEach((p, i) => { p.rating = +(raw[i] / tot * 100).toFixed(1); });
  const P = state.pol = {
    parties, president: null, pm: null, coalition: [], mayors: {}, bills: [], laws: {}, lawOrder: false,
    nextPres: state.day + 120, nextParl: state.day + 60, nextLocal: state.day + 90, campaign: null, history: [],
    me: { party: null, popularity: 20, pc: 0, office: null, posts: [], donated: 0, monthDonated: 0, meetings: 0 },
    tenders: [], cases: [], seq: 1, appointees: {}, lobby: {}, newsFeed: [],
  };
  // Початковий розклад влади: парламент і президент
  allocateSeats();
  formCoalition();
  const top = [...parties].sort((a, b) => b.rating - a.rating)[0];
  P.president = { name: top.leader, party: top.id, since: state.day, player: false };
  for (const c of Object.keys(CITIES)) { const p = pickWeighted(parties); P.mayors[c] = { name: pick(POLITICIANS), party: p.id, player: false, since: state.day }; }
  // Незалежні органи: конкурсні призначення на довгий строк
  for (const k of INDEPENDENT) govState().ministries[k].term = state.day + ri(400, 700);
  return P;
}
const partyById = (id) => polState().parties.find((p) => p.id === id);
const myParty = () => (polState().me.party ? partyById(polState().me.party) : null);
function pickWeighted(parties) { const t = sum(parties, (p) => p.rating); let r = Math.random() * t; for (const p of parties) { r -= p.rating; if (r <= 0) return p; } return parties[0]; }
function polNews(text, kind = '', breaking = false) { news(`🗳️ ${text}`, 'politics', kind, breaking); }
const gov = () => { const P = polState(); return P.coalition.map(partyById).filter(Boolean); };
/** Ідеологічний профіль уряду (зважений за місцями коаліції). */
function govIdeo() {
  const c = gov(), seats = sum(c, (p) => p.seats) || 1;
  const r = { tax: 0, wage: 0, strict: 0, protect: 0 };
  for (const p of c) for (const k of Object.keys(r)) r[k] += IDEOLOGIES[p.ideo][k] * p.seats / seats;
  return r;
}

// ---------- Вибори ----------
function allocateSeats() {
  const P = polState(), pass = P.parties.filter((p) => p.rating >= 5), tot = sum(pass, (p) => p.rating) || 1;
  let left = SEATS;
  for (const p of P.parties) p.seats = 0;
  pass.sort((a, b) => b.rating - a.rating).forEach((p, i) => { const s = i === pass.length - 1 ? left : Math.round(SEATS * p.rating / tot); p.seats = Math.min(left, s); left -= p.seats; });
}
function formCoalition() {
  const P = polState(), sorted = [...P.parties].filter((p) => p.seats > 0).sort((a, b) => b.seats - a.seats);
  if (!sorted.length) return;
  const lead = sorted[0], co = [lead];
  let seats = lead.seats;
  // партнери — ідеологічно ближчі
  const near = (a, b) => (a.ideo === b.ideo ? 0 : (a.ideo === 'center' || b.ideo === 'center') ? 1 : 2);
  const rest = sorted.slice(1).sort((a, b) => near(lead, a) - near(lead, b) || b.seats - a.seats);
  for (const p of rest) { if (seats > SEATS / 2) break; co.push(p); seats += p.seats; }
  P.coalition = co.map((p) => p.id);
  P.pm = { name: lead.player ? state.me.name : POLITICIANS[(POLITICIANS.indexOf(lead.leader) + 7) % POLITICIANS.length], party: lead.id, player: !!lead.player, since: state.day };
  appointCabinet();
}
/** Уряд призначає профільних міністрів (не незалежні органи). */
function appointCabinet() {
  const P = polState(), G = govState(), I = govIdeo();
  for (const k of CABINET) {
    const m = G.ministries[k];
    const loyal = P.appointees[k];
    if (loyal && loyal.pending) { m.head = loyal.name; m.strict = loyal.strict; m.since = state.day; m.party = P.me.party; loyal.pending = false; polNews(`Призначено: ${MINISTRIES[k].name} — ${loyal.name} (кандидатура партії «${myParty() ? myParty().name : ''}»).`); continue; }
    m.head = pick(OFFICIALS); m.since = state.day; m.party = P.coalition[0];
    m.strict = clamp(+(0.5 + I.strict * 2 + rnd(-0.15, 0.15)).toFixed(2), 0.15, 0.9);
    if (P.appointees[k] && !P.appointees[k].pending) delete P.appointees[k];
  }
  polNews(`Сформовано уряд. Прем’єр-міністр: ${P.pm.name}. Коаліція: ${gov().map((p) => p.name).join(', ')}.`, '', true);
}
function startCampaign(type, city) {
  const P = polState();
  const cands = [];
  const ps = [...P.parties].sort((a, b) => b.rating - a.rating).slice(0, type === 'parl' ? 99 : 4);
  for (const p of ps) cands.push({ id: p.id, name: p.player ? state.me.name : p.leader, party: p.id, score: p.rating, spend: 0, player: !!p.player });
  if (type !== 'parl' && P.me.running && P.me.running.type === type && P.me.running.city === (city || null) && !cands.some((c) => c.player)) cands.push({ id: 'me', name: state.me.name, party: P.me.party, score: P.me.popularity * 0.6, spend: 0, player: true });
  P.campaign = { type, city: city || null, ends: state.day + 30, cands, debates: 0 };
  polNews(`Стартувала кампанія: ${type === 'pres' ? 'вибори президента' : type === 'parl' ? 'парламентські вибори' : `вибори мера (${CITIES[city].name})`}. Голосування через 30 днів.`, '', true);
}
function finishCampaign() {
  const P = polState(), C = P.campaign; P.campaign = null;
  const scores = C.cands.map((c) => ({ c, v: Math.max(0.5, c.score + Math.sqrt(c.spend / 1e6) * 2 + rnd(-4, 4)) }));
  const tot = sum(scores, (x) => x.v);
  scores.sort((a, b) => b.v - a.v);
  const res = scores.map((x) => ({ name: x.c.name, party: x.c.party, pct: +(x.v / tot * 100).toFixed(1), player: x.c.player }));
  P.history.unshift({ day: state.day, type: C.type, city: C.city, res }); if (P.history.length > 20) P.history.length = 20;
  if (C.type === 'parl') {
    for (const x of res) { const p = partyById(x.party); if (p) p.rating = x.pct; }
    allocateSeats(); formCoalition();
    const mp = myParty();
    if (mp) { polNews(`Партія «${mp.name}» отримала ${mp.seats} місць із ${SEATS}${P.coalition.includes(mp.id) ? ' й увійшла до коаліції' : ''}.`, mp.seats ? 'good' : 'bad', true); P.me.pc += mp.seats; }
    P.nextParl = state.day + TERM;
  } else if (C.type === 'pres') {
    const w = res[0];
    P.president = { name: w.name, party: w.party, since: state.day, player: !!w.player };
    if (w.player) { P.me.office = 'president'; polNews(`${state.me.name} обраний(-а) президентом з результатом ${w.pct}%!`, 'good', true); }
    else { if (P.me.office === 'president') P.me.office = null; polNews(`Президентом обрано ${w.name} (${(partyById(w.party) || {}).name || 'позапартійний'}) — ${w.pct}%.`, '', true); }
    P.nextPres = state.day + TERM * 1.5;
  } else {
    const w = res[0];
    P.mayors[C.city] = { name: w.name, party: w.party, player: !!w.player, since: state.day };
    if (w.player) P.me.posts = [...new Set([...P.me.posts, 'mayor:' + C.city])];
    else P.me.posts = P.me.posts.filter((x) => x !== 'mayor:' + C.city);
    polNews(`${CITIES[C.city].name}: новий мер — ${w.name} (${w.pct}%).`, w.player ? 'good' : '');
  }
  P.me.running = null;
  if (typeof checkAchievements === 'function') checkAchievements();
}

// ---------- Дії гравця ----------
const PARTY_COST = 5e6;
function foundParty(name, ideo) {
  const P = polState();
  if (P.me.party) return toast('У вас уже є партія.', 'bad');
  const cost = PARTY_COST * priceLvl();
  if (state.cash < cost) return toast(`Реєстрація й структура партії коштують ${moneyK(cost)}.`, 'bad');
  book('politics', -cost);
  const p = { id: 'p' + (P.parties.length + 10) + uid().slice(0, 3), name: name || `Партія ${state.me.name.split(' ').pop()}`, ideo: IDEOLOGIES[ideo] ? ideo : 'center', leader: state.me.name, rating: 1.5, seats: 0, funds: 0, player: true, scandals: 0, donors: {} };
  P.parties.push(p); P.me.party = p.id;
  polNews(`Бізнесмен ${state.me.name} засновує партію «${p.name}» (${IDEOLOGIES[p.ideo].name}).`, '', true);
  if (typeof checkAchievements === 'function') checkAchievements();
}
const donationCap = () => (polState().laws.partyFinance ? 1e6 : 5e6) * priceLvl();
function donate(partyId, amount) {
  const P = polState(), p = partyById(partyId); if (!p) return;
  amount = Math.round(amount);
  const own = p.player;
  if (!own && P.me.monthDonated + amount > donationCap()) return toast(`Ліміт внесків на місяць: ${moneyK(donationCap())}${P.laws.partyFinance ? ' (закон про прозоре фінансування)' : ''}.`, 'bad');
  if (state.cash < amount) return toast('Недостатньо коштів.', 'bad');
  book('politics', -amount);
  p.funds += amount; if (!own) { P.me.monthDonated += amount; P.me.donated += amount; p.donors.player = (p.donors.player || 0) + amount; P.lobby[p.id] = (P.lobby[p.id] || 0) + amount / 1e6; }
  log(`🗳️ ${own ? 'Фінансування власної партії' : `Офіційний внесок партії «${p.name}»`}: ${money(amount)}.`);
}
function campaignSpend(amount) {
  const P = polState(), C = P.campaign; if (!C) return;
  const me = C.cands.find((c) => c.player); if (!me) return toast('Ви не берете участі в цих виборах.', 'bad');
  if (state.cash < amount) return toast('Недостатньо коштів.', 'bad');
  book('politics', -amount); me.spend += amount;
  // медіаресурс посилює кампанію
  if (state.media) me.score += state.media.influence * 0.02;
  log(`📣 Передвиборча кампанія: ${money(amount)} (реклама, штаб, зустрічі з виборцями).`);
}
function runFor(type, city) {
  const P = polState();
  if (!P.me.party && type !== 'mayor') return toast('Для виборів президента потрібна партія (своя або підтримка).', 'bad');
  if (P.me.popularity < (type === 'pres' ? 25 : 10)) return toast(`Замала популярність (потрібно ${type === 'pres' ? 25 : 10}).`, 'bad');
  const fee = (type === 'pres' ? 2e6 : 2e5) * priceLvl();
  if (state.cash < fee) return toast(`Застава кандидата: ${moneyK(fee)}.`, 'bad');
  book('politics', -fee);
  P.me.running = { type, city: city || null };
  const C = P.campaign;
  if (C && C.type === type && C.city === (city || null) && !C.cands.some((c) => c.player)) C.cands.push({ id: 'me', name: state.me.name, party: P.me.party, score: P.me.popularity * 0.6, spend: 0, player: true });
  polNews(`${state.me.name} висуває свою кандидатуру: ${type === 'pres' ? 'президент' : `мер (${CITIES[city].name})`}.`);
}
function debate() {
  const P = polState(), C = P.campaign; if (!C) return;
  const me = C.cands.find((c) => c.player); if (!me || C.debates >= 2) return;
  C.debates++;
  const skill = (state.me.skills ? (state.me.skills.management || 0) + (state.me.skills.business || 0) : 0) * 2 + (state.media ? state.media.corpRep / 20 : 2);
  const won = chance(clamp(0.35 + skill / 30, 0.2, 0.8));
  me.score += won ? 3 : -2;
  polNews(`Дебати: ${state.me.name} ${won ? 'переконливо переміг(-ла) опонентів' : 'невдало виступив(-ла)'}.`, won ? 'good' : 'bad');
}
/** Законне лобіювання: офіційна зустріч / консультації з міністерством (реєструються). */
function lobbyMeeting(ministry) {
  const P = polState(), G = govState(), m = G.ministries[ministry];
  if (INDEPENDENT.includes(ministry)) return toast('Незалежні органи не проводять лобістських зустрічей щодо своїх рішень.', 'bad');
  const cost = 1e5 * priceLvl(); if (state.cash < cost) return toast('Недостатньо коштів.', 'bad');
  book('politics', -cost); P.me.meetings++;
  P.lobby[ministry] = (P.lobby[ministry] || 0) + 1;
  const ok = chance(0.25 + (P.coalition.includes(P.me.party) ? 0.2 : 0) + P.me.pc / 400);
  if (ok && ministry === 'economy') { const t = pick(Object.keys(SUBSIDY_TARGETS)); G.subsidies.push({ target: t, rate: 0.15, until: state.day + 60 }); govDecide(`Після консультацій з бізнесом Мінекономіки запускає програму для галузі «${SUBSIDY_TARGETS[t].name}».`, 'good'); }
  else if (ok && ministry === 'tax') { m.strict = Math.max(0.1, +(m.strict - 0.05).toFixed(2)); govDecide('Податкова спрощує процедури перевірок після консультацій з бізнесом.', 'good'); }
  else if (ok) { m.strict = Math.max(0.1, +(m.strict - 0.04).toFixed(2)); govDecide(`${MINISTRIES[ministry].name} пом’якшує регулювання після публічних консультацій.`, 'good'); }
  else log(`🤝 Зустріч у «${MINISTRIES[ministry].name}» проведена, але рішень поки немає.`);
}
/** Внести законопроєкт: через власну партію (якщо є місця) або через партію, яку ви офіційно підтримуєте. */
function proposeBill(key) {
  const P = polState(), mp = myParty();
  const sponsorParty = mp && mp.seats > 0 ? mp : P.parties.filter((p) => (P.lobby[p.id] || 0) >= 1 && p.seats > 0).sort((a, b) => (P.lobby[b.id] || 0) - (P.lobby[a.id] || 0))[0];
  if (!sponsorParty && P.me.office !== 'president') return toast('Потрібні власні депутати або партія, яку ви офіційно підтримуєте (внесок ≥ $1M).', 'bad');
  if (P.bills.some((b) => b.key === key && !b.status)) return toast('Такий законопроєкт уже розглядається.', 'bad');
  const cost = 3e5 * priceLvl(); if (state.cash < cost) return toast('Недостатньо коштів.', 'bad');
  book('politics', -cost);
  P.bills.unshift({ id: P.seq++, key, by: 'player', party: sponsorParty ? sponsorParty.id : P.president.party, vote: state.day + 14, status: null });
  polNews(`До парламенту внесено законопроєкт «${BILLS[key].name}» (ініціатива ${state.company}).`);
}
/** Висунути свою людину на посаду в уряді (лише профільні міністерства; потрібна коаліція або президентство). */
function nominate(ministry, name, strict) {
  const P = polState();
  if (!CABINET.includes(ministry)) return toast('ЦБ, антимонопольний комітет і суди незалежні — їх формують за конкурсом.', 'bad');
  const can = P.me.office === 'president' || (myParty() && P.coalition.includes(P.me.party));
  if (!can) return toast('Висувати міністрів може лише коаліція або президент.', 'bad');
  if (P.me.pc < 20) return toast('Потрібно 20 політичного капіталу.', 'bad');
  P.me.pc -= 20;
  P.appointees[ministry] = { name: name || pick(POLITICIANS), strict: clamp(strict, 0.15, 0.9), pending: true, since: state.day };
  appointCabinet();
  // конфлікт інтересів: власні люди в уряді
  if (P.laws.declarations && chance(0.3)) openCorruptionCase('player', `конфлікт інтересів при призначенні в ${MINISTRIES[ministry].name}`, 3e6);
}
function bidTender(id, pctBid) {
  const P = polState(), t = P.tenders.find((x) => x.id === id); if (!t) return;
  const deposit = t.value * 0.02;
  if (state.cash < deposit) return toast(`Забезпечення заявки: ${moneyK(deposit)}.`, 'bad');
  t.bids = t.bids.filter((b) => b.by !== 'player');
  t.bids.push({ by: 'player', pct: clamp(pctBid, 0.7, 1.2) });
  log(`📑 Подано заявку на тендер «${t.title}» (${Math.round(pctBid * 100)}% кошторису).`);
}

// ---------- Антикорупція ----------
function openCorruptionCase(target, what, base) {
  const P = polState();
  P.cases.unshift({ id: P.seq++, target, what, opened: state.day, decide: state.day + ri(25, 60), base: Math.round(base * priceLvl()), outcome: null });
  if (P.cases.length > 40) P.cases.length = 40;
  polNews(`Антикорупційне бюро розслідує ${target === 'player' ? state.company : (coById(target) || partyById(target) || {}).name}: ${what}.`, target === 'player' ? 'bad' : '', true);
}
function decideCorruption(c) {
  const courts = govState().ministries.courts.strict; // незалежний суд
  const lawyers = c.target === 'player' && state.gov ? state.gov.lawFirm : 1;
  const guilty = chance(clamp(0.35 + courts * 0.4 - lawyers * 0.07, 0.1, 0.85));
  const fine = guilty ? Math.round(c.base * rnd(1, 2.5)) : 0;
  c.outcome = guilty ? `Винні. Штраф ${moneyK(fine)}` : 'Виправдано';
  if (c.target === 'player') {
    if (guilty) { book('fines', -fine); const P = polState(); P.me.popularity = Math.max(0, P.me.popularity - 15); P.me.pc = Math.max(0, P.me.pc - 20); const mp = myParty(); if (mp) { mp.rating = Math.max(0.5, mp.rating * 0.7); mp.scandals++; } if (typeof applyReputation === 'function') applyReputation('player', -3); }
  } else { const co = coById(c.target); if (co && guilty) { co.cash -= fine; if (typeof applyReputation === 'function') applyReputation(co.id, -3); } const p = partyById(c.target); if (p && guilty) { p.rating *= 0.75; p.scandals++; } }
  polNews(`Вищий антикорупційний суд: ${c.what} — ${c.outcome}.`, c.target === 'player' ? (guilty ? 'bad' : 'good') : '');
}

// ---------- Щоденна симуляція ----------
function polDaily() {
  const P = polState(), e = state.econ, G = govState();
  // Рейтинги: економіка карає/нагороджує владу, медіа впливають, скандали шкодять
  const econMood = e.phase === 'boom' ? 0.02 : e.phase === 'growth' ? 0.01 : e.phase === 'recession' ? -0.03 : e.phase === 'crisis' ? -0.06 : 0;
  for (const p of P.parties) {
    const inGov = P.coalition.includes(p.id) || (P.president && P.president.party === p.id);
    let d = (inGov ? econMood : -econMood * 0.5) + rnd(-0.08, 0.08) + Math.sqrt(p.funds / 1e7) * 0.01;
    if (p.player) d += (P.me.popularity - 30) * 0.002 + (state.media ? state.media.influence * 0.002 : 0);
    if (p.ideo === 'left' && e.unemployment > 9) d += 0.03;
    if (p.ideo === 'national' && state.world && state.world.wars && state.world.wars.length) d += 0.02;
    p.rating = clamp(p.rating + d, 0.3, 60);
    p.funds = Math.max(0, p.funds - p.funds * 0.01);
  }
  const t = sum(P.parties, (p) => p.rating);
  for (const p of P.parties) p.rating = +(p.rating / t * 100).toFixed(2);
  // Популярність гравця: репутація, спорт, роботодавець
  const staff = state.staff.length;
  const base = 10 + (state.media ? state.media.corpRep * 0.3 : 15) + Math.min(15, staff / 40) + (state.sport ? state.sport.trophies * 2 : 0) + (P.me.office ? 10 : 0);
  P.me.popularity = clamp(P.me.popularity + (base - P.me.popularity) * 0.02, 0, 100);
  P.me.pc = Math.min(500, P.me.pc + (myParty() ? myParty().seats / 300 : 0) + (P.me.office ? 0.3 : 0) + P.me.posts.length * 0.1);
  if (state.day % 30 === 0) P.me.monthDonated = 0;
  // ІІ-компанії фінансують близькі партії (за тими ж лімітами)
  for (const co of aliveCos()) {
    if (isSub(co) || !chance(0.01)) continue;
    const pref = co.strat === 'expansion' || co.strat === 'raider' ? 'right' : co.strat === 'conservative' ? 'center' : pick(Object.keys(IDEOLOGIES));
    const p = P.parties.find((x) => x.ideo === pref && !x.player) || pick(P.parties);
    const amt = Math.min(donationCap(), co.cash * 0.01);
    if (amt > 1e5) { co.cash -= amt; p.funds += amt; p.donors[co.id] = (p.donors[co.id] || 0) + amt; co.party = p.id; }
  }
  // Вибори
  if (!P.campaign) {
    if (state.day >= P.nextParl - 30) startCampaign('parl');
    else if (state.day >= P.nextPres - 30) startCampaign('pres');
    else if (state.day >= P.nextLocal - 30) { const c = (P.me.running && P.me.running.type === 'mayor') ? P.me.running.city : pick(Object.keys(CITIES)); startCampaign('mayor', c); P.nextLocal = state.day + 30 + 120; }
  } else {
    const C = P.campaign;
    for (const c of C.cands) if (!c.player) { const p = partyById(c.party); if (p) { const sp = p.funds * 0.03; p.funds -= sp; c.spend += sp; c.score += (p.rating - c.score) * 0.05; } }
    if (chance(0.03)) { const c = pick(C.cands); c.score -= 2; polNews(`Скандал у кампанії: ${c.name} звинувачують у ${pick(['непрозорих витратах', 'неправдивих обіцянках', 'конфлікті інтересів'])}.`, c.player ? 'bad' : ''); }
    if (state.day >= C.ends) finishCampaign();
  }
  // Законотворчість: партії вносять законопроєкти
  if (chance(0.035)) {
    const p = pickWeighted(P.parties.filter((x) => x.seats > 0 && !x.player));
    if (p) { const keys = Object.keys(BILLS).filter((k) => BILLS[k].ideo[p.ideo] > 0.7 && !(BILLS[k].law && P.laws[BILLS[k].law]) && !P.bills.some((b) => b.key === k && !b.status)); if (keys.length) { const k = pick(keys); P.bills.unshift({ id: P.seq++, key: k, by: p.id, party: p.id, vote: state.day + 14, status: null }); polNews(`«${p.name}» вносить законопроєкт «${BILLS[k].name}».`); } }
  }
  for (const b of P.bills) if (!b.status && b.vote <= state.day) voteBill(b);
  if (P.bills.length > 40) P.bills.length = 40;
  // Політика уряду: курс коаліції поступово змінює податки
  if (state.day % 30 === 0) {
    const I = govIdeo(), target = clamp(city().tax + I.tax, 0.1, 0.4);
    if (Math.abs(e.taxRate - target) > 0.015) { e.taxRate = +(e.taxRate + Math.sign(target - e.taxRate) * 0.01).toFixed(2); govDecide(`Уряд коригує податок на прибуток до ${Math.round(e.taxRate * 100)}% відповідно до програми коаліції.`); }
  }
  // Незалежні органи: конкурсні призначення після закінчення строку (без політичного втручання)
  for (const k of INDEPENDENT) {
    const m = G.ministries[k];
    if (!m.term) m.term = state.day + ri(400, 700);
    if (state.day >= m.term) { m.head = pick(OFFICIALS.filter((n) => n !== m.head)); m.strict = +rnd(0.35, 0.8).toFixed(2); m.since = state.day; m.term = state.day + ri(500, 800); govDecide(`За результатами відкритого конкурсу ${MINISTRIES[k].name} очолив(-ла) ${m.head}.`); }
  }
  // Тендери
  if (P.tenders.length < 3 && chance(0.08)) {
    const kinds = [['Будівництво дороги', 'any'], ['Постачання продуктів у школи', 'grocery'], ['Модернізація лікарень', 'any'], ['Електроенергія для держустанов', 'powerplant'], ['IT-система для міністерства', 'office'], ['Пальне для держтранспорту', 'refinery']];
    const [title, need] = pick(kinds);
    P.tenders.push({ id: uid(), title, need, value: Math.round(rnd(2, 20) * 1e6 * priceLvl()), ends: state.day + 10, bids: [], ministry: pick(CABINET) });
  }
  for (const t of [...P.tenders]) if (t.ends <= state.day) settleTender(t);
  for (const w of P.contracts || []) { if (w.left > 0) { book('b2b', w.daily); w.left--; } }
  if (P.contracts) P.contracts = P.contracts.filter((w) => w.left > 0);
  // Антикорупційні справи
  for (const c of P.cases) if (!c.outcome && c.decide <= state.day) decideCorruption(c);
  // Мер-гравець: місто розвивається (поліція, інвестиції)
  for (const [c, m] of Object.entries(P.mayors)) if (m.player && state.crime) state.crime.police[c] = Math.min(0.95, state.crime.police[c] + 0.0008);
}
function voteBill(b) {
  const P = polState(), B = BILLS[b.key];
  let yes = 0;
  for (const p of P.parties) {
    if (!p.seats) continue;
    let s = B.ideo[p.ideo];
    if (p.player) s = b.by === 'player' ? 1 : s;
    else if (b.by === 'player') s += Math.min(0.25, (P.lobby[p.id] || 0) * 0.03); // законний лобізм (зареєстровані внески)
    if (b.party && P.coalition.includes(p.id)) s += P.coalition.includes(b.party) ? 0.08 : -0.12;
    yes += p.seats * clamp(s + rnd(-0.1, 0.1), 0, 1);
  }
  let passed = yes > SEATS / 2;
  // Вето президента
  if (passed && P.president && !P.president.player) { const pp = partyById(P.president.party); if (pp && B.ideo[pp.ideo] < 0.25 && chance(0.6)) { passed = false; b.status = 'vetoed'; polNews(`Президент ветував закон «${B.name}».`, '', true); return; } }
  b.status = passed ? 'passed' : 'failed'; b.yes = Math.round(yes);
  if (passed) { B.apply(); polNews(`Парламент ухвалив закон «${B.name}» (${Math.round(yes)} голосів «за»).`, b.by === 'player' ? 'good' : '', true); if (b.by === 'player') polState().me.pc += 5; }
  else polNews(`Законопроєкт «${B.name}» провалено (${Math.round(yes)} «за»).`, b.by === 'player' ? 'bad' : '');
}
function settleTender(t) {
  const P = polState();
  P.tenders = P.tenders.filter((x) => x !== t);
  // ІІ-заявки
  for (const co of aliveCos().filter((c) => !isSub(c)).sort(() => Math.random() - 0.5).slice(0, ri(1, 3))) t.bids.push({ by: co.id, pct: +rnd(0.82, 1.05).toFixed(2) });
  const canPlayer = t.need === 'any' || state.fac.some((f) => f.kind === t.need) || state.biz.some((b) => b.type === t.need);
  const bids = t.bids.filter((b) => b.by !== 'player' || canPlayer);
  if (!bids.length) return;
  const rep = (b) => (b.by === 'player' ? (state.media ? state.media.corpRep : 50) : (coById(b.by) || {}).pr || 50);
  bids.sort((a, b) => a.pct * (1.2 - rep(a) / 250) - b.pct * (1.2 - rep(b) / 250));
  const w = bids[0];
  if (w.by === 'player') {
    const profit = t.value * (w.pct - 0.78), days = 30;
    P.contracts = P.contracts || [];
    P.contracts.push({ title: t.title, daily: profit / days, left: days });
    log(`📑 Ви виграли тендер «${t.title}»: ${moneyK(t.value * w.pct)}, очікуваний прибуток ${moneyK(profit)} за 30 днів.`, 'good');
    // Конфлікт інтересів: власна партія в уряді або посада
    const conflict = P.me.office || (P.me.party && P.coalition.includes(P.me.party)) || (P.appointees[t.ministry]);
    if (conflict && chance(P.laws.declarations ? 0.35 : 0.15)) openCorruptionCase('player', `можливий конфлікт інтересів у тендері «${t.title}»`, t.value * 0.3);
  } else {
    const co = coById(w.by); if (co) { co.cash += t.value * (w.pct - 0.8); if (co.party && P.coalition.includes(co.party) && (partyById(co.party).donors[co.id] || 0) > 2e6 && chance(0.15)) openCorruptionCase(co.id, `тендер «${t.title}» і фінансування правлячої партії`, t.value * 0.3); }
    if (t.bids.some((b) => b.by === 'player')) log(`📑 Тендер «${t.title}» виграла «${(co || {}).name}».${canPlayer ? '' : ' (у вас немає потрібного профілю)'}`);
  }
}

HOOKS.day.push(polDaily);
