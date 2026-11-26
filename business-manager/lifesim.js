'use strict';
/* БІЗНЕС ІМПЕРІЯ — режим «Життя»: симулятор життя, у якому бізнес-імперія — один із шляхів.
   Потреби (їжа, енергія, дозвілля, спілкування, гігієна), погодинні заняття з автопілотом (сон, робота,
   навчання, їжа, спорт, друзі, розваги), 9 кар’єрних треків з рівнями, оцінкою роботи, підвищеннями й
   звільненнями; школа й університет (6 спеціальностей, сесії, стипендії); друзі й батьки; життєві події
   з вибором. Вік, здоров’я, партнер, діти, розкіш і спадок — з life.js. */

Object.assign(SKILLS, { medicine: 'Медицина', law: 'Право', fitness: 'Фізична форма', creativity: 'Творчість', charisma: 'Харизма', engineering: 'Інженерія', cooking: 'Кулінарія' });
HOMES.parents = HOMES.parents || { name: 'З батьками', rent: 0, food: 0 };
const NEEDS = { food: { name: 'Їжа', icon: '🍽️', decay: 4 }, energy: { name: 'Енергія', icon: '⚡', decay: 4 }, fun: { name: 'Дозвілля', icon: '🎮', decay: 2 }, social: { name: 'Спілкування', icon: '💬', decay: 1.5 }, hygiene: { name: 'Гігієна', icon: '🚿', decay: 2.5 } };
const ACTS = {
  sleep: { name: 'Сон', icon: '😴', h: 1, fx: { energy: 13, food: 2, fun: 1, social: 1, hygiene: 1 } },
  eat_home: { name: 'Приготувати й поїсти', icon: '🍳', h: 1, cost: 6, fx: { food: 50, fun: 2 }, skill: ['cooking', 0.03] },
  eat_out: { name: 'Кафе чи ресторан', icon: '🍝', h: 1, cost: 28, fx: { food: 55, fun: 10, social: 6 } },
  shower: { name: 'Душ і побут', icon: '🚿', h: 1, fx: { hygiene: 65, fun: -1 } },
  gym: { name: 'Спортзал', icon: '🏋️', h: 2, cost: 12, fx: { energy: -9, fun: 6, hygiene: -15 }, skill: ['fitness', 0.06], health: 0.4 },
  walk: { name: 'Прогулянка', icon: '🚶', h: 1, fx: { fun: 12, energy: -2 }, health: 0.15 },
  friends: { name: 'Зустріч із друзями', icon: '🍻', h: 3, cost: 25, fx: { social: 22, fun: 12, energy: -3 }, skill: ['charisma', 0.03], friends: true },
  games: { name: 'Відеоігри / серіали', icon: '🎮', h: 2, fx: { fun: 20, energy: -2 } },
  read: { name: 'Самоосвіта', icon: '📚', h: 2, fx: { fun: 2, energy: -3 }, selfStudy: true },
  create: { name: 'Творчість (музика, блог)', icon: '🎸', h: 2, fx: { fun: 14, energy: -3 }, skill: ['creativity', 0.06] },
  party: { name: 'Вечірка', icon: '🎉', h: 4, cost: 60, fx: { social: 18, fun: 14, energy: -6, hygiene: -6 }, skill: ['charisma', 0.05], party: true },
  partner: { name: 'Час із партнером', icon: '💞', h: 3, cost: 20, fx: { social: 20, fun: 10 }, partner: true },
  parents: { name: 'Провідати батьків', icon: '👪', h: 3, fx: { social: 16, fun: 4, food: 12 }, family: true },
  rest: { name: 'Відпочинок удома', icon: '🛋️', h: 1, fx: { energy: 3, fun: 3 } },
  work: { name: 'Робота', icon: '💼', h: 1, fx: { energy: -6, food: -1, fun: -2, social: 1, hygiene: -1 } },
  study: { name: 'Навчання', icon: '🎓', h: 1, fx: { energy: -5, fun: -2, social: 2 } },
  school: { name: 'Школа', icon: '🏫', h: 1, fx: { energy: -4, fun: -1, social: 3 } },
};
const TRACKS = {
  retail: { name: 'Торгівля', icon: '🛒', skill: 'business', levels: [['Продавець', 12, 0], ['Старший продавець', 16, 1.5], ['Адміністратор магазину', 22, 2.5], ['Директор магазину', 35, 3.5], ['Регіональний менеджер', 55, 4.5]] },
  it: { name: 'IT', icon: '💻', skill: 'coding', degree: 'it', levels: [['Стажер', 10, 0.5], ['Junior-розробник', 20, 1.5], ['Middle-розробник', 35, 2.5, true], ['Senior-розробник', 55, 3.5], ['Tech Lead', 75, 4.2], ['CTO', 120, 4.8]] },
  medicine: { name: 'Медицина', icon: '🩺', skill: 'medicine', degree: 'med', levels: [['Медбрат / медсестра', 14, 0.5], ['Лікар-інтерн', 20, 1.5, true], ['Лікар', 40, 2.5, true], ['Хірург', 80, 3.8, true], ['Головний лікар', 110, 4.6, true]] },
  law: { name: 'Право', icon: '⚖️', skill: 'law', degree: 'law', levels: [['Помічник юриста', 13, 0.5], ['Юрист', 30, 2, true], ['Старший юрист', 55, 3.2, true], ['Партнер юрфірми', 120, 4.5, true]] },
  finance: { name: 'Фінанси', icon: '🏦', skill: 'business', degree: 'econ', levels: [['Касир банку', 12, 0.5], ['Фінансовий аналітик', 30, 2, true], ['Старший аналітик', 50, 3], ['Фінансовий директор', 110, 4.5]] },
  engineering: { name: 'Інженерія', icon: '🛠️', skill: 'engineering', degree: 'eng', levels: [['Робітник', 11, 0], ['Технік', 17, 1], ['Інженер', 32, 2.2, true], ['Головний інженер', 60, 3.5], ['Технічний директор', 100, 4.5]] },
  civil: { name: 'Держслужба', icon: '🏛️', skill: 'management', levels: [['Клерк', 11, 0], ['Спеціаліст', 18, 1.5], ['Начальник відділу', 30, 2.8], ['Заступник міністра', 60, 4.2]] },
  sport: { name: 'Професійний спорт', icon: '⚽', skill: 'fitness', maxAge: 35, levels: [['Аматор', 5, 1], ['Напівпрофесіонал', 15, 2.5], ['Професіонал', 60, 3.8], ['Зірка спорту', 200, 4.8]] },
  art: { name: 'Мистецтво й блогінг', icon: '🎬', skill: 'creativity', degree: 'art', levels: [['Початківець', 3, 0], ['Блогер', 10, 1.5], ['Інфлюенсер', 40, 3], ['Зірка', 150, 4.5]] },
};
const MAJORS = {
  it: { name: 'Комп’ютерні науки', years: 4, fee: 2000, skill: 'coding' },
  med: { name: 'Медицина', years: 6, fee: 4000, skill: 'medicine' },
  law: { name: 'Право', years: 5, fee: 3000, skill: 'law' },
  econ: { name: 'Економіка', years: 4, fee: 2500, skill: 'business' },
  eng: { name: 'Інженерія', years: 4, fee: 2500, skill: 'engineering' },
  art: { name: 'Мистецтво й медіа', years: 4, fee: 1500, skill: 'creativity' },
};
const WEEKEND = (d) => (d % 7 === 5 || d % 7 === 6);

function lsState() { return state.ls || null; }
const lsOn = () => !!(state && state.ls && state.ls.on);
function lsInit(age) {
  state.ls = { on: true, needs: { food: 80, energy: 85, fun: 70, social: 70, hygiene: 80 }, act: null, auto: true, sleep: [23, 7], career: null, edu: { gpa: 3.5, uni: null, degrees: [] }, friends: [], parents: [], choices: [], log: [], seq: 1, bizUnlocked: false, hours: { work: 0, study: 0 } };
  const L = lifeState(); L.age = age;
  const ln = lastName();
  state.ls.parents = [{ name: `${pick(MASC)} ${ln}`, role: 'Батько', age: age + ri(24, 34), rel: 70, alive: true }, { name: `${pick(FEM)} ${ln}`, role: 'Мати', age: age + ri(22, 32), rel: 80, alive: true }];
  for (let i = 0; i < 3; i++) state.ls.friends.push(makeFriend());
  for (const k of Object.keys(SKILLS)) if (state.me.skills[k] == null) state.me.skills[k] = 0;
  state.me.skills.business = age >= 22 ? 1 : 0.5;
}
function makeFriend() { const fem = chance(0.5); return { id: 'fr' + (state.ls.seq++), name: `${pick(fem ? FEM : MASC)} ${pick(LAST)}`, rel: ri(40, 70), met: state.day, trait: pick(['весельчак', 'розумник', 'спортсмен', 'тусовщик', 'надійний друг', 'бізнесмен']), look: randLook() }; }
function lsLog(text) { const S = state.ls; S.log.unshift({ day: state.day, h: state.hour, text }); if (S.log.length > 40) S.log.length = 40; }
const lsAge = () => (state.life ? state.life.age : 25);

// ---------- Кар’єра ----------
const careerLevel = () => { const c = state.ls && state.ls.career; return c ? TRACKS[c.track].levels[c.level] : null; };
const wageH = (track, level) => TRACKS[track].levels[level][1] * wageLvl();
const hasDegree = (k) => !!(state.ls && state.ls.edu.degrees.includes(k));
function canHold(track, level) {
  const T = TRACKS[track], L = T.levels[level];
  if (T.maxAge && lsAge() > T.maxAge && level > 0) return 'вік';
  if ((state.me.skills[T.skill] || 0) < L[2]) return `${SKILLS[T.skill]} ${L[2]}`;
  if (L[3] && !hasDegree(T.degree)) return `диплом «${MAJORS[T.degree].name}»`;
  if (lsAge() < 16) return 'вік від 16';
  return null;
}
/** Вакансії: стартові позиції всіх треків + вищі, якщо ви вже кваліфіковані. */
function jobOffers() {
  const out = [];
  for (const [k, T] of Object.entries(TRACKS)) for (let l = T.levels.length - 1; l >= 0; l--) { if (!canHold(k, l)) { out.push({ track: k, level: l }); break; } if (l === 0) out.push({ track: k, level: 0, blocked: canHold(k, 0) }); }
  return out;
}
function applyJob(track, level) {
  const S = state.ls, why = canHold(track, level); if (why) return toast(`Не вистачає: ${why}.`, 'bad');
  const p = clamp(0.55 + (state.me.skills.charisma || 0) * 0.07 + (state.ls.edu.gpa - 3) * 0.08 - level * 0.05, 0.15, 0.95);
  if (!chance(p)) { lsLog(`Співбесіда на посаду «${TRACKS[track].levels[level][0]}» не вдалась.`); return toast('Вам відмовили після співбесіди. Спробуйте ще або підтягніть навички.', 'bad'); }
  S.career = { track, level, perf: 55, days: 0, since: state.day, missed: 0 };
  state.me.job = null;
  lsLog(`Нова робота: ${TRACKS[track].levels[level][0]} (${TRACKS[track].name}).`);
  news(`💼 ${state.me.name} отримав(-ла) роботу: ${TRACKS[track].levels[level][0]}.`, 'city', 'good');
}
function quitCareer() { const S = state.ls; if (!S.career) return; lsLog(`Звільнення з посади «${careerLevel()[0]}».`); S.career = null; }
const shiftHours = (track) => (track === 'sport' ? [10, 16] : track === 'art' ? [12, 18] : track === 'medicine' ? [8, 17] : [9, 17]);
function isShift(h) {
  const c = state.ls.career; if (!c) return false;
  const [a, b] = shiftHours(c.track), weekend = WEEKEND(state.day);
  if (weekend && c.track !== 'sport' && c.track !== 'art') return false;
  return h >= a && h < b;
}

// ---------- Освіта ----------
const inSchool = () => lsAge() < 17.5;
function enroll(major) {
  const S = state.ls, M = MAJORS[major];
  if (S.edu.uni) return toast('Ви вже навчаєтесь.', 'bad');
  if (lsAge() < 16.8) return toast('Вступ — після школи (від 17 років).', 'bad');
  const exam = (state.me.skills[M.skill] || 0) * 0.15 + (S.edu.gpa - 2.5) * 0.35 + rnd(0, 0.4);
  const grant = exam > 0.75;
  const fee = Math.round(M.fee * priceLvl() * (grant ? 0 : 1));
  if (fee && state.cash < fee) return toast(`Перший рік контракту: ${money(fee)}. Або підвищте оцінки/навички для стипендії.`, 'bad');
  if (fee) book('family', -fee);
  S.edu.uni = { major, year: 1, prog: 0, att: 1, grant, since: state.day, yearStart: state.day };
  lsLog(`Вступ до університету: ${M.name}${grant ? ' (бюджет / стипендія)' : ` (контракт ${money(fee)}/рік)`}.`);
  news(`🎓 ${state.me.name} вступив(-ла) на «${M.name}».`, 'city', 'good');
}
function dropOut() { const S = state.ls; if (!S.edu.uni) return; lsLog(`Відрахування з «${MAJORS[S.edu.uni.major].name}».`); S.edu.uni = null; }
const isClass = (h) => !!(state.ls.edu.uni && !WEEKEND(state.day) && h >= 9 && h < 14);
const isSchoolH = (h) => inSchool() && !WEEKEND(state.day) && h >= 8 && h < 14;

// ---------- Дії ----------
function startAct(k, manual) {
  const S = state.ls, A = ACTS[k];
  if (A.cost) {
    const c = k === 'eat_home' && state.me.home === 'parents' ? 0 : Math.round(A.cost * priceLvl());
    if (state.cash < c) {
      if (k === 'eat_home') { S.act = { k: 'eat_home', left: 1, manual: !!manual, poor: true }; return true; } // скромний перекус без грошей
      if (manual) toast(`Потрібно ${money(c)}.`, 'bad'); return false;
    }
    if (c) book('living', -c);
  }
  if (A.partner && !(state.life && state.life.partner)) { if (manual) toast('У вас немає партнера.', 'bad'); return false; }
  if (A.family && !S.parents.some((p) => p.alive)) { if (manual) toast('Батьків уже немає з нами.', 'bad'); return false; }
  const hrs = k === 'sleep' ? sleepHoursLeft() : A.h;
  S.act = { k, left: hrs, manual: !!manual };
  if (manual && (isShift(state.hour) || isClass(state.hour))) lsLog(`Пропуск ${isShift(state.hour) ? 'роботи' : 'занять'}: ${A.name}.`);
  return true;
}
function sleepHoursLeft() { const [a, b] = state.ls.sleep, h = state.hour; if (h >= a) return 24 - h + b; if (h < b) return b - h; return 2; }
const inSleepWindow = (h) => { const [a, b] = state.ls.sleep; return a > b ? (h >= a || h < b) : (h >= a && h < b); };
/** Автопілот: що робити цієї години, якщо нічого не заплановано. */
function routine() {
  const S = state.ls, N = S.needs, h = state.hour;
  if (inSleepWindow(h)) return 'sleep';
  if (isShift(h)) return 'work';
  if (isSchoolH(h)) return 'school';
  if (isClass(h) && !isShift(h)) return 'study';
  if (N.energy < 12) return 'sleep';
  if (N.food < 40) return state.cash > 200 * priceLvl() && N.fun < 40 ? 'eat_out' : 'eat_home';
  if (N.hygiene < 35) return 'shower';
  if (N.social < 35) return state.life && state.life.partner && chance(0.5) ? 'partner' : 'friends';
  if (N.fun < 35) return pick(['games', 'walk', 'create']);
  if (h >= 18 && h < 21 && (state.me.skills.fitness || 0) < 4 && chance(0.25)) return 'gym';
  if (h >= 19 && h < 22 && chance(0.25)) return 'read';
  return 'rest';
}

function applyAct(k) {
  const S = state.ls, A = ACTS[k], N = S.needs;
  const home = HOMES[state.me.home] || HOMES.room, comfort = state.me.homeProp ? 1.2 : { parents: 1, room: 0.85, flat: 1, loft: 1.15, villa: 1.3 }[state.me.home] || 1;
  const poor = S.act && S.act.poor;
  for (const [n, v] of Object.entries(A.fx)) N[n] = clamp(N[n] + v * (n === 'energy' && k === 'sleep' ? comfort : 1) * (poor ? 0.5 : 1), 0, 100);
  if (A.skill) state.me.skills[A.skill[0]] = Math.min(5, (state.me.skills[A.skill[0]] || 0) + A.skill[1] / A.h);
  if (A.health && state.life) state.life.health = Math.min(100, state.life.health + A.health / A.h);
  if (A.selfStudy) { const k2 = S.selfSkill || 'business'; state.me.skills[k2] = Math.min(5, (state.me.skills[k2] || 0) + 0.025); }
  if (k === 'work') workHour();
  if (k === 'study') studyHour();
  if (k === 'school') { S.edu.gpa = clamp(S.edu.gpa + (N.energy > 40 ? 0.002 : -0.002), 1, 5); }
  if (A.friends && S.act && S.act.left === 1) { const f = pick(S.friends); if (f) f.rel = Math.min(100, f.rel + 6); if (chance(0.15)) { const nf = makeFriend(); S.friends.push(nf); lsLog(`Нове знайомство: ${nf.name} (${nf.trait}).`); } }
  if (A.party && S.act && S.act.left === 1 && !(state.life && state.life.partner) && chance(0.3) && typeof findDates === 'function') { state.life.dates = state.life.dates || []; if (state.life.dates.length < 3) { const d = { id: 'dt' + (state.life.seq++), name: `${pick(chance(0.5) ? FEM : MASC)} ${pick(LAST)}`, age: Math.round(lsAge() + rnd(-3, 3)), trait: pick(Object.keys(PARTNER_TRAITS)), compat: ri(40, 95), love: 15, look: randLook() }; state.life.dates.push(d); lsLog(`На вечірці ви познайомились із ${d.name}. Можна запросити на побачення (Профіль → Сім’я).`); } }
  if (A.partner && state.life && state.life.partner) state.life.partner.happy = Math.min(100, state.life.partner.happy + 2);
  if (A.family) for (const p of S.parents) if (p.alive) p.rel = Math.min(100, p.rel + 1.5);
}
function workHour() {
  const S = state.ls, c = S.career, T = TRACKS[c.track], N = S.needs;
  const pay = wageH(c.track, c.level) * (c.track === 'art' ? 0.5 + (state.me.skills.creativity || 0) * 0.3 : 1);
  book('salary', pay); S.hours.work++;
  const sk = state.me.skills[T.skill] || 0;
  state.me.skills[T.skill] = Math.min(5, sk + 0.006);
  const q = (sk - T.levels[c.level][2] + 1) * 0.25 + (N.energy - 40) / 120 + (N.fun - 40) / 200 + ((state.life ? state.life.happy : 60) - 50) / 250;
  c.perf = clamp(c.perf + q * 0.22 + rnd(-0.25, 0.25), 0, 100);
}
function studyHour() {
  const S = state.ls, U = S.edu.uni, M = MAJORS[U.major];
  const need = M.years * AGE_DAYS * (5 / 7) * 5;
  const eff = 0.6 + S.needs.energy / 250;
  U.prog = Math.min(1, U.prog + eff / need); S.hours.study++;
  state.me.skills[M.skill] = Math.min(5, (state.me.skills[M.skill] || 0) + 0.004 * eff);
}

function lsHour() {
  if (!lsOn() || state.over) return;
  const S = state.ls, N = S.needs;
  // природне згасання потреб
  for (const [k, D] of Object.entries(NEEDS)) if (!(k === 'energy' && S.act && S.act.k === 'sleep')) N[k] = clamp(N[k] - D.decay * (k === 'food' && S.act && S.act.k === 'sleep' ? 0.5 : 1), 0, 100);
  // поточне заняття або автопілот
  const h = state.hour;
  if (S.act && S.act.k !== 'work' && !S.act.manual && (isShift(h) && S.act.k !== 'sleep')) S.act = null; // на роботу вчасно
  if (!S.act || S.act.left <= 0) {
    S.act = null;
    if (N.energy <= 2) startAct('sleep'); // знепритомніли від утоми
    else if (S.auto) { let k = routine(); if (!startAct(k)) startAct('rest'); }
    else if (isShift(h)) startAct('work'); else if (isClass(h)) startAct('study'); else if (isSchoolH(h)) startAct('school'); else startAct(inSleepWindow(h) ? 'sleep' : 'rest');
  }
  const k = S.act.k;
  applyAct(k);
  S.act.left--;
  // пропуск роботи/занять (якщо в цей час робимо щось інше)
  if (isShift(h) && k !== 'work' && S.career) { S.career.perf = Math.max(0, S.career.perf - 1.2); S.career.missedToday = true; }
  if (isClass(h) && k !== 'study') S.edu.uni.att = Math.max(0, S.edu.uni.att - 0.01);
  // вплив потреб на настрій і здоров’я
  const L = state.life;
  if (L) {
    const low = sum(Object.values(N), (v) => (v < 20 ? (20 - v) / 20 : 0));
    L.stress = clamp(L.stress + low * 0.35 - (k === 'rest' || k === 'games' || k === 'walk' ? 0.4 : 0), 0, 100);
    L.happy = clamp(L.happy + (sum(Object.values(N), (v) => v) / 5 - 55) * 0.004, 0, 100);
    if (N.food < 8) L.health = Math.max(0, L.health - 0.25);
    if (N.energy < 5) L.health = Math.max(0, L.health - 0.15);
  }
}

// ---------- Щоденна логіка ----------
function lsDaily() {
  if (!lsOn()) return;
  const S = state.ls, c = S.career, age = lsAge();
  // кар’єра: стаж, підвищення, звільнення
  if (c) {
    c.days++;
    if (c.missedToday) { c.missed++; c.missedToday = false; }
    const T = TRACKS[c.track];
    if (c.perf >= 80 && c.days >= 35 && c.level < T.levels.length - 1 && !canHold(c.track, c.level + 1)) {
      c.level++; c.days = 0; c.perf = 55;
      lsLog(`🎉 Підвищення: ${T.levels[c.level][0]}!`);
      news(`🎉 ${state.me.name} отримав(-ла) підвищення: ${T.levels[c.level][0]}.`, 'city', 'good');
      if (typeof notify === 'function') notify('opp', 'promo-' + state.day, `Підвищення: ${T.levels[c.level][0]} (${money(wageH(c.track, c.level))}/год).`, 'career', 1);
    } else if (c.perf >= 80 && c.level < T.levels.length - 1 && state.day % 10 === 0) {
      const why = canHold(c.track, c.level + 1); if (why && typeof notify === 'function') notify('imp', 'promo-block-' + c.level, `Для підвищення до «${T.levels[c.level + 1][0]}» бракує: ${why}.`, 'career', 30);
    }
    if (c.perf < 12 && c.days > 10) { lsLog(`❌ Звільнення: низька оцінка роботи.`); if (typeof notify === 'function') notify('crit', 'fired-' + state.day, 'Вас звільнили з роботи через низьку оцінку.', 'career', 1); S.career = null; }
    if (T.maxAge && age > T.maxAge + 2 && c.level > 0) { lsLog('Кінець спортивної кар’єри за віком.'); S.career = null; }
  }
  // освіта: сесії, випуск, оплата
  const U = S.edu.uni;
  if (U) {
    if (state.day - U.yearStart >= AGE_DAYS) {
      const pass = chance(clamp(U.att * 0.9 + 0.1, 0.1, 0.98));
      if (pass) { U.year++; S.edu.gpa = clamp(S.edu.gpa + (U.att - 0.7) * 0.4, 1, 5); lsLog(`Сесію складено: ${U.year} курс.`); }
      else { U.prog = Math.max(0, U.prog - 1 / MAJORS[U.major].years); lsLog('Сесію провалено — повторний рік.'); if (typeof notify === 'function') notify('imp', 'session-' + state.day, 'Провалено сесію: повторний рік навчання.', 'education', 1); }
      U.yearStart = state.day; U.att = 1;
      if (!U.grant) { const fee = Math.round(MAJORS[U.major].fee * priceLvl()); if (state.cash >= fee) book('family', -fee); else { lsLog('Немає грошей на контракт — відрахування.'); S.edu.uni = null; } }
    }
    if (S.edu.uni && U.prog >= 1) {
      S.edu.degrees.push(U.major); state.me.skills[MAJORS[U.major].skill] = Math.min(5, (state.me.skills[MAJORS[U.major].skill] || 0) + 1);
      lsLog(`🎓 Диплом: ${MAJORS[U.major].name}!`); news(`🎓 ${state.me.name} отримав(-ла) диплом: ${MAJORS[U.major].name}.`, 'city', 'good');
      if (typeof chron === 'function') chron('degree-' + U.major, '🎓', `Диплом: ${MAJORS[U.major].name}.`);
      S.edu.uni = null;
    }
  }
  // батьки: допомога, старіння, смерть
  for (const p of S.parents) {
    if (!p.alive) continue;
    const pa = p.age + (age - (p.age0 != null ? p.age0 : (p.age0 = age)));
    if (age < 22 && (state.me.home === 'parents' || S.edu.uni)) book('family', 8 * priceLvl() * (p.rel / 100));
    if (pa > 70 && chance(0.00004 * Math.pow(pa - 65, 2))) { p.alive = false; const inh = Math.round(rnd(0.5, 3) * 1e4 * priceLvl()); book('ventureExit', inh); lsLog(`🕯️ Помер(-ла) ${p.role.toLowerCase()} ${p.name}. Спадщина ${money(inh)}.`); if (state.life) { state.life.happy = Math.max(0, state.life.happy - 25); state.life.stress = Math.min(100, state.life.stress + 20); } }
    p.rel = clamp(p.rel - 0.05, 0, 100);
  }
  if (age >= 18 && state.me.home === 'parents' && chance(0.01)) addChoice('moveout');
  for (const f of S.friends) f.rel = clamp(f.rel - 0.15, 0, 100);
  S.friends = S.friends.filter((f) => f.rel > 5 || state.day - f.met < 30);
  // життєві події
  if (chance(0.12)) lifeEvent();
}

// ---------- Події з вибором ----------
const LIFE_CHOICES = {
  loan: { text: (x) => `${x.name} просить позичити ${money(x.amount)} до зарплати.`, opts: [['give', 'Позичити'], ['no', 'Відмовити']] },
  wedding: { text: (x) => `${x.name} запрошує на весілля (подарунок ≈ ${money(x.amount)}).`, opts: [['go', 'Піти'], ['no', 'Не йти']] },
  pet: { text: () => 'Друзі віддають кошеня в добрі руки.', opts: [['take', 'Взяти'], ['no', 'Відмовитись']] },
  moveout: { text: () => 'Час жити окремо? Орендована квартира — свобода, але й витрати.', opts: [['move', 'Переїхати в кімнату'], ['stay', 'Ще пожити з батьками']] },
  sidejob: { text: (x) => `Підробіток на вихідних: ${money(x.amount)} за день роботи.`, opts: [['take', 'Погодитись'], ['no', 'Відпочити']] },
  course: { text: (x) => `Знижка 50% на курс «${SKILLS[x.skill]}».`, opts: [['buy', `Купити`], ['no', 'Не зараз']] },
};
function addChoice(type, x = {}) { const S = state.ls; if (S.choices.length >= 4 || S.choices.some((c) => c.type === type)) return; S.choices.push({ id: 'ch' + (S.seq++), type, day: state.day, ...x }); }
function resolveChoice(id, opt) {
  const S = state.ls, c = S.choices.find((x) => x.id === id); if (!c) return;
  S.choices = S.choices.filter((x) => x !== c);
  const f = S.friends.find((x) => x.id === c.fid);
  if (c.type === 'loan') { if (opt === 'give') { if (state.cash < c.amount) return toast('Недостатньо коштів.', 'bad'); book('family', -c.amount); if (f) f.rel = Math.min(100, f.rel + 15); if (chance(0.7)) { S.pending = (S.pending || []).concat({ day: state.day + ri(7, 20), amount: c.amount, name: c.name }); } else lsLog(`${c.name} так і не повернув(-ла) борг.`); } else if (f) f.rel -= 10; }
  if (c.type === 'wedding') { if (opt === 'go') { if (state.cash < c.amount) return toast('Недостатньо коштів.', 'bad'); book('family', -c.amount); S.needs.social = 100; S.needs.fun = Math.min(100, S.needs.fun + 30); if (f) f.rel = Math.min(100, f.rel + 12); } else if (f) f.rel -= 8; }
  if (c.type === 'pet' && opt === 'take') { S.pet = { name: pick(['Мурчик', 'Пушок', 'Сіма', 'Барсик', 'Люся']), since: state.day }; lsLog(`🐱 У вас тепер є кошеня ${S.pet.name}!`); }
  if (c.type === 'moveout' && opt === 'move') { state.me.home = 'room'; lsLog('Ви переїхали від батьків.'); }
  if (c.type === 'sidejob' && opt === 'take') { book('salary', c.amount); S.needs.energy = Math.max(0, S.needs.energy - 30); S.needs.fun = Math.max(0, S.needs.fun - 15); }
  if (c.type === 'course' && opt === 'buy') { const cost = Math.round(courseCost(c.skill) * 0.5); if (state.cash < cost) return toast('Недостатньо коштів.', 'bad'); book('family', -cost); state.me.skills[c.skill] = Math.min(5, (state.me.skills[c.skill] || 0) + 1); }
}
function lifeEvent() {
  const S = state.ls, f = pick(S.friends);
  const ev = pick(['wallet', 'loan', 'wedding', 'pet', 'sick', 'sidejob', 'course', 'gift', 'rent']);
  if (ev === 'wallet') { const v = Math.round(rnd(20, 200) * priceLvl()); book('family', v); lsLog(`👛 Ви знайшли гаманець і отримали винагороду ${money(v)} від власника.`); }
  if (ev === 'loan' && f) addChoice('loan', { fid: f.id, name: f.name, amount: Math.round(rnd(50, 400) * priceLvl()) });
  if (ev === 'wedding' && f) addChoice('wedding', { fid: f.id, name: f.name, amount: Math.round(rnd(60, 250) * priceLvl()) });
  if (ev === 'pet' && !S.pet) addChoice('pet');
  if (ev === 'sick' && state.life) { state.life.health = Math.max(5, state.life.health - ri(5, 15)); S.needs.energy = Math.max(0, S.needs.energy - 30); lsLog('🤒 Ви застудились: енергія й здоров’я знизились.'); }
  if (ev === 'sidejob') addChoice('sidejob', { amount: Math.round(rnd(40, 120) * priceLvl()) });
  if (ev === 'course') addChoice('course', { skill: pick(Object.keys(SKILLS)) });
  if (ev === 'gift') { S.needs.fun = Math.min(100, S.needs.fun + 15); lsLog('🎁 Батьки надіслали посилку з домашньою їжею й подарунком.'); S.needs.food = Math.min(100, S.needs.food + 20); }
  if (ev === 'rent' && state.me.home !== 'parents' && !state.me.homeProp) lsLog('🏠 Орендодавець нагадав про оплату — витрати на житло ростуть з інфляцією.');
  if (S.pending) for (const p of [...S.pending]) if (p.day <= state.day) { book('family', p.amount); S.pending = S.pending.filter((x) => x !== p); lsLog(`${p.name} повернув(-ла) борг ${money(p.amount)}.`); }
}
/** Заснувати власну справу: відкриває шлях бізнес-імперії. */
function unlockBusiness() {
  const S = state.ls, cost = Math.round(500 * priceLvl());
  if (S.bizUnlocked) return;
  if (state.cash < cost) return toast(`Реєстрація підприємця: ${money(cost)}.`, 'bad');
  book('capex', -cost); S.bizUnlocked = true;
  lsLog(`🚀 Ви зареєстрували компанію «${state.company}». Відкрито розділи бізнес-імперії.`);
  news(`🚀 ${state.me.name} засновує компанію «${state.company}».`, 'corp', 'good');
  if (typeof chron === 'function') chron('bizStart', '🚀', `Засновано компанію «${state.company}».`);
}

/** Особисте банкрутство (режим життя без бізнесу): борги списуються, кредитна історія зіпсована, життя триває. */
function personalBankruptcy() {
  const debt0 = -state.cash;
  if (typeof triggerDefault === 'function' && state.fin) triggerDefault();
  if (state.cash < 0) book('admin', -state.cash);
  state.me.credit = 330; state.negDays = 0;
  if (state.me.home !== 'parents' && state.ls.parents.some((p) => p.alive)) { state.me.home = 'parents'; lsLog('Через борги довелось повернутися жити до батьків.'); }
  else if (!state.me.homeProp) state.me.home = 'room';
  if (state.life) { state.life.stress = Math.min(100, state.life.stress + 30); state.life.happy = Math.max(0, state.life.happy - 20); }
  lsLog(`💸 Особисте банкрутство: борги ${money(debt0)} списано, кредитна історія зіпсована.`);
  if (typeof notify === 'function') notify('crit', 'pbank-' + state.day, 'Особисте банкрутство: борги списано, кредити недоступні.', 'fincenter', 1);
}
HOOKS.hour.push(lsHour);
HOOKS.day.push(lsDaily);
