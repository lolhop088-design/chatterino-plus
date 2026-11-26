'use strict';
/* БІЗНЕС ІМПЕРІЯ — інтерфейс режиму «Життя»: головна життя, кар’єра, навчання, стосунки.
   Бізнес-розділи приховані, доки гравець не заснує власну справу. */

NAV.unshift(['lifehome', '🧑', 'Життя'], ['career', '💼', 'Кар’єра'], ['education', '🎓', 'Навчання'], ['social', '👥', 'Стосунки']);
if (typeof NAV_GROUPS !== 'undefined') NAV_GROUPS.unshift(['Життя', ['lifehome', 'career', 'education', 'social', 'personal', 'life']]);
Object.assign(VIEW_DESC, { lifehome: 'потреби, заняття, розклад дня', career: 'робота, підвищення, вакансії', education: 'школа, університет, дипломи', social: 'друзі, родина, партнер' });
Object.assign(VIEW_CAT, { lifehome: 'city', career: 'business', education: 'dev', social: 'other' });
const BIZ_LOCKED = new Set(['home', 'empire', 'dashboard', 'businesses', 'industry', 'divisions', 'cars', 'tech', 'science', 'hq', 'staff', 'rivals', 'corpwar', 'antitrust', 'ranking', 'regions', 'citydev', 'media', 'clubs', 'crisis']);
const bizOpen = () => !lsOn() || state.ls.bizUnlocked || state.biz.length + state.fac.length > 0;
const navAllowed = (id) => (lsOn() ? (bizOpen() || !BIZ_LOCKED.has(id)) : !['lifehome', 'career', 'education', 'social'].includes(id));
const needBar = (v) => `<div class="nbar"><i style="width:${Math.round(v)}%;background:${v >= 60 ? 'var(--good)' : v >= 30 ? 'var(--mid)' : 'var(--bad)'}"></i></div>`;

Object.assign(VIEWS, {
  lifehome() {
    if (!lsOn()) return VIEWS.home();
    const S = state.ls, L = lifeState(), A = S.act ? ACTS[S.act.k] : ACTS.rest, c = S.career, lvl = careerLevel(), U = S.edu.uni;
    const u = typeof unreadCount === 'function' ? unreadCount() : 0;
    const quick = ['eat_home', 'eat_out', 'sleep', 'shower', 'gym', 'walk', 'friends', 'games', 'read', 'create', 'party', 'partner', 'parents', 'rest'];
    let html = `<div class="home"><div class="hhead"><div class="hlogo">🧑<div><b>Моє життя</b><small>${CITIES[state.city].name} · ${HOMES[state.me.home] ? HOMES[state.me.home].name : ''}${S.pet ? ` · 🐱 ${esc(S.pet.name)}` : ''}</small></div></div>
      <div class="hicons"><button data-act="nav" data-v="notifications" aria-label="Сповіщення">🔔${u ? `<i>${u > 99 ? '99+' : u}</i>` : ''}</button><button data-act="nav" data-v="achievements" aria-label="Досягнення">🏆</button><button data-act="nav" data-v="settings" aria-label="Налаштування">⚙️</button></div></div>
      <div class="hprofile" data-act="nav" data-v="personal"><div class="hav">${avatarSVG(state.me.look, 64)}</div><div class="hpinfo"><b>${esc(state.me.name)}</b><small>${Math.floor(L.age)} р. · ${lvl ? lvl[0] : U ? 'студент(ка)' : inSchool() ? 'школяр(ка)' : 'без роботи'}</small><div class="nowact">${A.icon} ${A.name}${S.act && S.act.left > 0 ? ` · ще ${S.act.left} год` : ''}</div></div>
        <div class="hmoney"><div><span>💵</span><b>${moneyK(state.cash).replace('$', '')}</b><small class="${c ? 'up' : ''}">${c ? `+${money(wageH(c.track, c.level))}/год` : 'без зарплати'}</small></div><div><span>❤️</span><b>${Math.round(L.health)}</b><small>щастя ${Math.round(L.happy)}</small></div></div></div>
      <div class="card"><div class="row between"><h3 style="margin:0">Потреби</h3><label class="switch"><input type="checkbox" data-change="lsAuto" ${S.auto ? 'checked' : ''}> 🤖 Автопілот</label></div>
        <div class="needs">${Object.entries(NEEDS).map(([k, N]) => `<div><span>${N.icon} ${N.name}</span>${needBar(S.needs[k])}<small>${Math.round(S.needs[k])}</small></div>`).join('')}</div>
        <p class="muted" style="margin:6px 0 0">${S.auto ? 'Автопілот сам планує день: сон, робота, навчання, їжа й відпочинок. Ви можете будь-коли обрати інше заняття.' : 'Автопілот вимкнено: обирайте заняття самі (робота й заняття все одно йдуть за розкладом).'}</p></div>
      ${S.choices.length ? `<div class="card warn"><h3>Рішення</h3>${S.choices.map((ch) => `<div class="stock"><div><b>${esc(LIFE_CHOICES[ch.type].text(ch))}</b></div><div class="px"></div><span></span><div class="trade">${LIFE_CHOICES[ch.type].opts.map(([k, n], i) => `<button class="btn sm ${i === 0 ? 'primary' : ''}" data-act="lsChoice" data-id="${ch.id}" data-v="${k}">${n}</button>`).join('')}</div></div>`).join('')}</div>` : ''}
      <h3 class="navgrp">Чим зайнятись</h3><div class="actgrid">${quick.map((k) => { const X = ACTS[k]; return `<button data-act="lsAct" data-v="${k}" class="${S.act && S.act.k === k ? 'on' : ''}"><span>${X.icon}</span>${X.name}<small>${X.h > 1 || k === 'sleep' ? (k === 'sleep' ? 'до ранку' : X.h + ' год') : '1 год'}${X.cost ? ` · ${money(X.cost * priceLvl())}` : ''}</small></button>`; }).join('')}</div>
      <div class="hrow"><button class="card hmini" data-act="nav" data-v="career"><span class="big">💼</span><div><b>${lvl ? esc(lvl[0]) : 'Шукати роботу'}</b><small>${c ? `оцінка ${Math.round(c.perf)} · ${TRACKS[c.track].name}` : 'вакансії й кар’єра'}</small>${c ? `<div class="hxp"><i style="width:${Math.round(c.perf)}%"></i></div>` : ''}</div></button>
        <button class="card hmini" data-act="nav" data-v="education"><span class="big">🎓</span><div><b>${U ? MAJORS[U.major].name : inSchool() ? 'Школа' : 'Навчання'}</b><small>${U ? `${U.year} курс · ${Math.round(U.prog * 100)}%` : inSchool() ? `середній бал ${S.edu.gpa.toFixed(1)}` : `дипломів: ${S.edu.degrees.length}`}</small>${U ? `<div class="hxp"><i style="width:${Math.round(U.prog * 100)}%"></i></div>` : ''}</div></button></div>
      <div class="hrow"><button class="card hmini" data-act="nav" data-v="social"><span class="big">👥</span><div><b>Стосунки</b><small>друзів ${S.friends.length}${L.partner ? ` · ❤️ ${esc(L.partner.name.split(' ')[0])}` : ''}</small></div></button>
        <button class="card hmini" data-act="${bizOpen() ? 'nav' : 'lsBiz'}" data-v="home"><span class="big">🚀</span><div><b>${bizOpen() ? 'Моя бізнес-імперія' : 'Власна справа'}</b><small>${bizOpen() ? `${state.biz.length + state.fac.length} об’єктів` : `заснувати компанію · ${money(500 * priceLvl())}`}</small></div></button></div>
      <div class="card"><h3>Щоденник</h3><ul class="log">${S.log.slice(0, 12).map((l) => `<li><small>Д${l.day} ${pad2(l.h)}:00</small> ${esc(l.text)}</li>`).join('') || '<li class="muted">Життя тільки починається.</li>'}</ul></div>
      <div class="card"><h3>Розпорядок</h3><small class="muted">Сон:</small><div class="chips">${[[22, 6], [23, 7], [0, 8], [1, 9]].map(([a, b]) => `<button class="chip ${S.sleep[0] === a ? 'on' : ''}" data-act="lsSleep" data-a="${a}" data-b="${b}">${pad2(a)}:00–${pad2(b)}:00</button>`).join('')}</div>
        <small class="muted">Самоосвіта прокачує:</small><div class="chips">${Object.entries(SKILLS).map(([k, n]) => `<button class="chip ${(S.selfSkill || 'business') === k ? 'on' : ''}" data-act="lsSelf" data-v="${k}">${n}</button>`).join('')}</div></div></div>`;
    return html;
  },

  career() {
    const S = state.ls, c = S.career;
    let html = `<h1>💼 Кар’єра</h1>`;
    if (c) {
      const T = TRACKS[c.track];
      html += `<div class="card"><div class="row between"><b>${T.icon} ${T.levels[c.level][0]}</b><span class="tag">${T.name}</span></div><div class="kpis">${kpi('Зарплата', money(wageH(c.track, c.level)) + '/год')}${kpi('Оцінка роботи', Math.round(c.perf), c.perf >= 80 ? 'pos' : c.perf < 30 ? 'neg' : '')}${kpi('Стаж на посаді', c.days + ' дн.')}${kpi('Пропусків', c.missed, c.missed > 5 ? 'neg' : '')}</div>${bar(c.perf)}
        <p class="muted">Графік: ${shiftHours(c.track).map(pad2).join(':00–')}:00${c.track === 'sport' || c.track === 'art' ? ', без вихідних' : ', пн–пт'}. Оцінка росте від навички «${SKILLS[T.skill]}», енергії й настрою; пропуски її знижують. Підвищення — при оцінці від 80 і стажі від 20 днів; нижче 12 — звільнення.</p>
        <h3>Кар’єрні сходи</h3>${T.levels.map((L, i) => { const why = canHold(c.track, i); return `<div class="row between ladder ${i === c.level ? 'cur' : ''}"><span>${i < c.level ? '✅' : i === c.level ? '📍' : why ? '🔒' : '⬜'} ${L[0]}</span><small>${money(L[1] * wageLvl())}/год${i > c.level && why ? ` · потрібно: ${why}` : ''}</small></div>`; }).join('')}
        <button class="btn sm danger" data-act="lsQuit">Звільнитися</button></div>`;
    }
    html += `<div class="card"><h3>Вакансії</h3><p class="muted">Шанс пройти співбесіду залежить від харизми, оцінок і рівня посади. Вищі посади відкриваються з навичками й дипломами.</p>${jobOffers().map((o) => { const T = TRACKS[o.track], L = T.levels[o.level]; return `<div class="stock"><div><b>${T.icon} ${L[0]}</b> <small class="muted">${T.name}</small><br><small>${money(L[1] * wageLvl())}/год · ${shiftHours(o.track).map(pad2).join(':00–')}:00${o.blocked ? ` · <span class="neg">потрібно: ${o.blocked}</span>` : ''}</small></div><div class="px"></div><span></span><div class="trade"><button class="btn sm primary" ${o.blocked || (c && c.track === o.track && c.level >= o.level) ? 'disabled' : ''} data-act="lsApply" data-t="${o.track}" data-l="${o.level}">Податися</button></div></div>`; }).join('')}</div>
      <div class="card"><h3>Навички</h3>${Object.entries(SKILLS).map(([k, n]) => `<div class="row between skillrow"><span>${n}</span><span>${skillDots(state.me.skills[k] || 0)}</span><button class="btn sm" ${(state.me.skills[k] || 0) >= 5 ? 'disabled' : ''} data-act="course" data-k="${k}">Курс ${money(courseCost(k))}</button></div>`).join('')}<p class="muted">Навички ростуть від роботи, навчання, самоосвіти, спорту, творчості й спілкування.</p></div>
      <div class="card"><h3>🚀 Власна справа</h3>${bizOpen() ? `<p>Компанія «${esc(state.company)}» зареєстрована. <button class="btn sm primary" data-act="nav" data-v="home">Відкрити бізнес-імперію</button></p>` : `<p class="muted">Підприємництво — окремий шлях: магазини, заводи, біржа, банк, політика. Можна поєднувати з роботою (поки ви на роботі, ваші магазини без керуючих працюють на 90%).</p><button class="btn primary" data-act="lsBiz">Зареєструвати компанію · ${money(500 * priceLvl())}</button>`}</div>`;
    return html;
  },

  education() {
    const S = state.ls, U = S.edu.uni;
    let html = `<h1>🎓 Навчання</h1><div class="kpis">${kpi('Середній бал', S.edu.gpa.toFixed(2), S.edu.gpa >= 4 ? 'pos' : S.edu.gpa < 3 ? 'neg' : '')}${kpi('Дипломи', S.edu.degrees.length ? S.edu.degrees.map((d) => MAJORS[d].name).join(', ') : 'немає')}${kpi('Годин навчання', S.hours.study)}</div>`;
    if (inSchool()) html += `<div class="card"><h3>🏫 Школа</h3><p>Заняття пн–пт 8:00–14:00. Бал росте, якщо приходите відпочилим. Після 17 років можна вступати до університету; високий бал і профільна навичка дають бюджетне місце.</p></div>`;
    if (U) {
      const M = MAJORS[U.major];
      html += `<div class="card"><div class="row between"><b>🎓 ${M.name}</b><span class="tag">${U.year} курс із ${M.years}${U.grant ? ' · бюджет' : ''}</span></div>${bar(U.prog * 100, 100, 'good')}<div class="kpis">${kpi('Прогрес', pct(U.prog, 0))}${kpi('Відвідуваність', pct(U.att, 0), U.att < 0.7 ? 'neg' : 'pos')}${kpi('Сесія', `через ${Math.max(0, AGE_DAYS - (state.day - U.yearStart))} дн.`)}</div><p class="muted">Пари пн–пт 9:00–14:00. Пропуски знижують шанс скласти сесію; провал — повторний рік. Контракт сплачується щороку.</p><button class="btn sm danger" data-act="lsDrop">Забрати документи</button></div>`;
    } else if (!inSchool()) {
      html += `<div class="card"><h3>Вступ до університету</h3>${Object.entries(MAJORS).map(([k, M]) => `<div class="stock"><div><b>${M.name}</b>${S.edu.degrees.includes(k) ? ' <span class="tag good">диплом є</span>' : ''}<br><small>${M.years} р. навчання · контракт ${money(M.fee * priceLvl())}/рік · профільна навичка: ${SKILLS[M.skill]} ${(state.me.skills[M.skill] || 0).toFixed(1)}</small></div><div class="px"></div><span></span><div class="trade"><button class="btn sm primary" data-act="lsEnroll" data-v="${k}">Вступати</button></div></div>`).join('')}<p class="muted">Бюджет (безкоштовно) дають за вступним іспитом: бал атестата + профільна навичка.</p></div>`;
    }
    return html;
  },

  social() {
    const S = state.ls, L = lifeState();
    let html = `<h1>👥 Стосунки</h1><div class="kpis">${kpi('Спілкування', Math.round(S.needs.social))}${kpi('Друзів', S.friends.length)}${kpi('Партнер', L.partner ? esc(L.partner.name) : '—')}</div>
      <div class="card"><h3>👪 Родина</h3>${S.parents.map((p) => `<div class="row between"><span>${p.role}: <b>${esc(p.name)}</b>${p.alive ? '' : ' 🕯️'}</span>${p.alive ? `<small>стосунки ${Math.round(p.rel)}</small>` : ''}</div>`).join('')}<div class="row wrap" style="margin-top:6px"><button class="btn sm" data-act="lsAct" data-v="parents">👪 Провідати (3 год)</button><button class="btn sm" data-act="nav" data-v="personal">💍 Партнер і діти</button></div></div>
      <div class="card"><h3>Друзі</h3>${S.friends.map((f) => `<div class="stock"><div class="row" style="gap:8px">${avatarSVG(f.look, 34)}<div><b>${esc(f.name)}</b> <small class="muted">${f.trait}</small>${bar(f.rel)}</div></div></div>`).join('') || '<p class="muted">Друзів поки немає — ходіть на вечірки й зустрічі.</p>'}
        <div class="row wrap" style="margin-top:6px"><button class="btn sm primary" data-act="lsAct" data-v="friends">🍻 Зустрітися з друзями</button><button class="btn sm" data-act="lsAct" data-v="party">🎉 Піти на вечірку</button></div></div>`;
    return html;
  },
});
for (const id of ['career', 'education', 'social']) { const f = VIEWS[id]; VIEWS[id] = function () { return decorateView(id, f()); }; }

Object.assign(ACT, {
  lsAct: (d) => { if (startAct(d.v, true)) { const A = ACTS[d.v]; toast(`${A.icon} ${A.name}`); } },
  lsChoice: (d) => resolveChoice(d.id, d.v), lsApply: (d) => applyJob(d.t, +d.l), lsQuit: () => confirmBox('Звільнитися з роботи?', () => quitCareer()),
  lsEnroll: (d) => confirmBox(`Вступати на «${MAJORS[d.v].name}»?`, () => enroll(d.v)), lsDrop: () => confirmBox('Забрати документи з університету?', () => dropOut()),
  lsSleep: (d) => { state.ls.sleep = [+d.a, +d.b]; }, lsSelf: (d) => { state.ls.selfSkill = d.v; },
  lsBiz: () => confirmBox(`Зареєструвати компанію «${esc(state.company)}» за ${money(500 * priceLvl())}? Відкриються розділи бізнес-імперії.`, () => unlockBusiness()),
});
Object.assign(CHANGE, { lsAuto: (el) => { state.ls.auto = el.checked; } });

// Навігація: у режимі життя нижнє меню — Життя · Кар’єра · Стосунки · Профіль; бізнес-розділи — після реєстрації компанії
renderNav = function () {
  const v = state.ui.view, cur = v === 'biz' ? 'businesses' : v === 'fac' ? 'industry' : v;
  const ORDER = lsOn() ? ['lifehome', 'career', 'social', 'personal'] : ['home', 'personal', 'empire', 'achievements'];
  const list = [...ORDER.map((id) => NAV.find((x) => x[0] === id)).filter(Boolean), ...NAV.filter((x) => !ORDER.includes(x[0]))].filter((x) => navAllowed(x[0]));
  const SHORT = { personal: 'Профіль', empire: 'Статистика', achievements: 'Досягнення', lifehome: 'Життя', career: 'Кар’єра', social: 'Стосунки' };
  const items = list.map(([id, ic, n]) => { const main = ORDER.includes(id); return `<button class="${cur === id ? 'active' : ''} ${main ? 'main' : 'extra'}" data-act="nav" data-v="${id}"><span class="ic">${ic}</span><span class="lbl">${main && isMobile() && SHORT[id] ? SHORT[id] : n}</span></button>`; }).join('');
  const inMore = !ORDER.includes(cur);
  document.getElementById('nav').innerHTML = items + `<button class="more ${inMore ? 'active' : ''}" data-act="more"><span class="ic">☰</span><span class="lbl">Ще</span></button>`;
};
const _more = ACT.more;
ACT.more = () => {
  const byId = Object.fromEntries(NAV.map((x) => [x[0], x])), used = new Set();
  const grp = NAV_GROUPS.map(([g, ids]) => { const items = ids.filter((id) => byId[id] && navAllowed(id) && !used.has(id)); items.forEach((i) => used.add(i)); return items.length ? `<h3 class="navgrp">${g}</h3><div class="moregrid">${items.map((id) => `<button data-act="nav" data-v="${id}"><span>${byId[id][1]}</span>${byId[id][2]}</button>`).join('')}</div>` : ''; }).join('');
  showModal(`<h2>Розділи <small class="muted">v${GAME_VERSION}</small></h2>${grp}${lsOn() && !bizOpen() ? '<p class="muted">🔒 Бізнес-розділи відкриються, коли ви зареєструєте власну компанію (Кар’єра → Власна справа).</p>' : ''}<div class="row end"><button class="btn" data-act="whatsNew">🆕 Що нового</button><button class="btn" data-act="modalClose">Закрити</button></div>`);
};
// заборонені розділи не відкриваються навіть із посилань
const _nav = ACT.nav;
ACT.nav = (d) => { if (state && lsOn() && !navAllowed(d.v)) { toast('🔒 Спершу зареєструйте власну компанію (Кар’єра → Власна справа).', 'bad'); return; } return _nav(d); };
const _takeJob = ACT.takeJob;
if (_takeJob) ACT.takeJob = (d) => (lsOn() ? toast('У режимі життя роботу шукайте в розділі «Кар’єра».', 'bad') : _takeJob(d));
