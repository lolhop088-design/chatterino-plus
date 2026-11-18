'use strict';
/* БІЗНЕС ІМПЕРІЯ — інтерфейс етапу 10: сповіщення, центр криз, прогноз, історія імперії, цілі. */

NAV.splice(1, 0, ['notifications', '🔔', 'Сповіщення'], ['crisis', '🚨', 'Центр криз'], ['forecast', '🔮', 'Фінансовий прогноз'], ['goals', '🎯', 'Цілі'], ['chronicle', '📜', 'Історія імперії']);
if (typeof NAV_GROUPS !== 'undefined') NAV_GROUPS.unshift(['Керування імперією', ['notifications', 'crisis', 'forecast', 'goals', 'chronicle']]);
Object.assign(VIEW_DESC, { notifications: 'критичні, важливі, новини, можливості', crisis: 'усі проблеми з причинами й наслідками', forecast: 'гроші на 7, 30 і 90 днів', goals: 'великі цілі й нагороди', chronicle: 'ключові моменти вашої імперії' });
Object.assign(VIEW_CAT, { notifications: 'other', crisis: 'state', forecast: 'economy', goals: 'business', chronicle: 'city' });
if (typeof HOME_CATS !== 'undefined') { HOME_CATS.find((c) => c.k === 'economy').views.unshift('forecast'); HOME_CATS.find((c) => c.k === 'business').views.unshift('crisis'); }

Object.assign(VIEWS, {
  notifications() {
    const N = notifState(), f = state.ui.nFilter || 'all';
    const list = N.list.filter((n) => f === 'all' || n.kind === f).slice(0, 100);
    const html = `<h1>🔔 Сповіщення</h1><div class="chips filter"><button class="chip ${f === 'all' ? 'on' : ''}" data-act="nFilter" data-v="all">Усі</button>${Object.entries(NOTIF_KINDS).map(([k, K]) => `<button class="chip ${f === k ? 'on' : ''}" data-act="nFilter" data-v="${k}">${K.icon} ${K.name} ${N.list.filter((n) => n.kind === k && !n.read).length || ''}</button>`).join('')}</div>
      <div class="card"><div class="row between"><b>Стрічка</b><button class="btn sm" data-act="nReadAll">Позначити все прочитаним</button></div><ul class="alerts">${list.map((n) => `<li class="${n.kind === 'crit' ? 'bad' : n.kind === 'opp' ? 'good' : ''} ${n.read ? 'read' : ''}" ${n.view ? `data-act="nOpen" data-id="${n.id}"` : ''}><span>${NOTIF_KINDS[n.kind].icon} <small>Д${n.day} ${pad2(n.hour)}:00</small> ${esc(n.text)}</span>${n.view ? '<span>›</span>' : ''}</li>`).join('') || '<li class="muted">Сповіщень немає.</li>'}</ul></div>
      <div class="card"><h3>⚙️ Налаштування</h3><p class="muted">Для кожного типу: показувати в стрічці, спливаюче повідомлення, автопауза. Критичні вимкнути не можна — лише спливаючі вікна й паузу.</p>${Object.entries(NOTIF_KINDS).map(([k, K]) => { const S = N.set[k]; return `<div class="nset"><b>${K.icon} ${K.name}</b><small class="muted">${K.desc}</small><div class="chips">${k !== 'crit' ? `<button class="chip ${S.on ? 'on' : ''}" data-act="nSet" data-k="${k}" data-o="on">${S.on ? '✓' : '✕'} у стрічці</button>` : ''}<button class="chip ${S.toast ? 'on' : ''}" data-act="nSet" data-k="${k}" data-o="toast">${S.toast ? '✓' : '✕'} спливаючі</button><button class="chip ${S.pause ? 'on' : ''}" data-act="nSet" data-k="${k}" data-o="pause">${S.pause ? '✓' : '✕'} автопауза</button></div></div>`; }).join('')}<button class="btn sm" data-act="nOnlyCrit">Залишити лише критичні</button></div>`;
    for (const n of list) n.read = true;
    return html;
  },

  crisis() {
    const items = crisisItems(), by = { 3: items.filter((x) => x.sev === 3).length, 2: items.filter((x) => x.sev === 2).length, 1: items.filter((x) => x.sev === 1).length };
    return `<h1>🚨 Центр криз</h1><div class="kpis">${kpi('Критичних', by[3], by[3] ? 'neg' : 'pos')}${kpi('Серйозних', by[2], by[2] ? 'neg' : 'pos')}${kpi('Уваги', by[1])}</div>
      ${items.length ? items.map((x) => `<div class="card crit s${x.sev}" ${x.view ? `data-act="nav" data-v="${x.view}"` : ''}><div class="row between"><b>${x.sev === 3 ? '🔴' : x.sev === 2 ? '🟠' : '🟡'} ${esc(x.title)}</b><span class="tag">${x.cat}</span></div><p style="margin:6px 0"><b>Причина:</b> ${esc(x.cause)}</p>${x.effect ? `<p class="muted" style="margin:0"><b>Наслідки:</b> ${esc(x.effect)}</p>` : ''}${x.view ? '<small class="pos">Відкрити розділ ›</small>' : ''}</div>`).join('') : '<div class="card"><p>✅ Криз немає — імперія стабільна.</p></div>'}`;
  },

  forecast() {
    const H = state.ui.fcH || 30, F = forecast(H), F7 = forecast(7), F30 = H === 30 ? F : forecast(30), F90 = H === 90 ? F : forecast(90);
    const row = (n, f) => `<tr><td><b>${n}</b></td><td class="pos">${moneyK(f.inc)}</td><td class="neg">${moneyK(f.exp)}</td><td class="neg">${moneyK(f.debt)}</td><td class="neg">${moneyK(f.taxes + f.div)}</td><td class="${f.end < 0 ? 'neg' : ''}">${moneyK(f.end)}</td></tr>`;
    return `<h1>🔮 Фінансовий прогноз</h1><div class="kpis">${kpi('Готівка зараз', moneyK(state.cash))}${kpi(`Через ${H} дн.`, moneyK(F.end), F.end < 0 ? 'neg' : F.end > state.cash ? 'pos' : '')}${kpi('Мінімум готівки', moneyK(F.minCash), F.minCash < 0 ? 'neg' : '')}${kpi('Касовий розрив', F.deficitDay != null ? `через ${F.deficitDay} дн.` : 'не очікується', F.deficitDay != null ? 'neg' : 'pos')}</div>
      <div class="chips filter">${[7, 30, 90].map((d) => `<button class="chip ${H === d ? 'on' : ''}" data-act="fcH" data-v="${d}">${d} днів</button>`).join('')}</div>
      ${chartBox('chFc', [{ data: [state.cash, ...F.path], color: F.minCash < 0 ? '#d2463c' : '#2e9a5a', name: 'Прогноз готівки' }], ['0', ...F.path.map((_, i) => String(i + 1))], `Готівка на ${H} днів`, (v) => moneyK(v))}
      <div class="card"><div class="table-wrap"><table><thead><tr><th>Період</th><th>Доходи</th><th>Витрати</th><th>Борги (відсотки й тіло)</th><th>Податки й дивіденди</th><th>Готівка в кінці</th></tr></thead><tbody>${row('7 днів', F7)}${row('30 днів', F30)}${row('90 днів', F90)}</tbody></table></div>
      <p class="muted">Прогноз бере середні доходи й витрати за 14 днів і враховує економічний цикл (зараз «${PHASES[state.econ.phase].name}», ще ≈${Math.max(0, state.econ.phaseDays)} дн., далі — «${PHASES[NEXT_PHASE[state.econ.phase] || 'growth'].name}»), графік погашення кожного кредиту, купони й погашення облігацій, щотижневий податок за вашою ефективною ставкою (${pct(typeof effectiveTaxRate === 'function' ? effectiveTaxRate() : state.econ.taxRate, 1)}) і дивіденди. Випадкові події не передбачити.</p></div>`;
  },

  goals() {
    const done = GOALS.filter((g) => goalDone(g.id)).length;
    return `<h1>🎯 Цілі</h1><div class="kpis">${kpi('Виконано', `${done}/${GOALS.length}`)}${kpi('Ваш титул', playerTitle() || '—')}</div><div class="cards">${GOALS.map((g) => { let p = 0; try { p = Math.min(1, g.prog()); } catch (e) { p = 0; } const d = goalDone(g.id); return `<div class="card goal ${d ? 'done' : ''}" style="display:block"><div class="row between"><b>${g.icon} ${g.name}</b>${d ? `<span class="tag good">✓ день ${state.goals[g.id]}</span>` : `<span class="tag">${Math.round(p * 100)}%</span>`}</div><p style="margin:4px 0">${g.cond}</p>${bar(p * 100, 100, d ? 'good' : p > 0.6 ? 'mid' : 'bad')}<small class="${d ? 'pos' : 'muted'}">🎁 ${g.reward}</small></div>`; }).join('')}</div>`;
  },

  chronicle() {
    const C = chronState();
    return `<h1>📜 Історія імперії</h1><div class="card"><p class="muted">Ключові моменти записуються автоматично й зберігаються разом із грою — навіть після зміни поколінь.</p><div class="timeline">${[...C.items].reverse().map((x) => `<div class="tl"><span class="tld">День ${x.day}${x.gen > 1 ? ` · покоління ${x.gen}` : ''}</span><b>${x.icon} ${esc(x.text)}</b></div>`).join('') || '<p class="muted">Історія ще не почалась.</p>'}</div></div>`;
  },
});
for (const id of ['notifications', 'crisis', 'forecast', 'goals', 'chronicle']) { const f = VIEWS[id]; VIEWS[id] = function () { return decorateView(id, f()); }; }

Object.assign(ACT, {
  nFilter: (d) => { state.ui.nFilter = d.v; },
  nReadAll: () => { for (const n of notifState().list) n.read = true; },
  nOpen: (d) => { const n = notifState().list.find((x) => x.id === d.id); if (n) { n.read = true; if (n.view) state.ui.view = n.view; state.ui.tab = null; } },
  nSet: (d) => { const S = notifState().set[d.k]; S[d.o] = !S[d.o]; },
  nOnlyCrit: () => { const N = notifState(); for (const k of ['imp', 'news', 'opp']) { N.set[k].on = false; N.set[k].toast = false; } toast('Залишено лише критичні сповіщення.'); },
  fcH: (d) => { state.ui.fcH = +d.v; },
  homeEvents: () => { state.ui.view = 'notifications'; },
});

// Головна: дзвіночок із непрочитаними, плитки «Центр криз», «Цілі», «Прогноз», титул у картці CEO
const _homeV = VIEWS.home;
VIEWS.home = function () {
  let html = _homeV();
  const u = unreadCount(), crit = crisisItems().filter((x) => x.sev >= 2).length, fc = forecast(30);
  const doneG = GOALS.filter((g) => goalDone(g.id)).length;
  html = html.replace(/<button data-act="homeEvents" aria-label="Події">✉️(<i>\d+<\/i>)?<\/button>/, `<button data-act="nav" data-v="notifications" aria-label="Сповіщення">🔔${u ? `<i>${u > 99 ? '99+' : u}</i>` : ''}</button>`);
  const t = playerTitle(); if (t) html = html.replace('<small>CEO · Рівень', `<small>${esc(t)} · Рівень`);
  const tiles = `<div class="hrow3"><button class="card hmini" data-act="nav" data-v="crisis"><span class="big">🚨</span><div><b>Кризи ${crit ? `<i class="hbadge">${crit}</i>` : ''}</b><small>${crit ? 'потрібна увага' : 'усе стабільно'}</small></div></button><button class="card hmini" data-act="nav" data-v="forecast"><span class="big">🔮</span><div><b>Прогноз</b><small class="${fc.deficitDay != null ? 'neg' : ''}">${fc.deficitDay != null ? `розрив за ${fc.deficitDay} дн.` : `30 дн.: ${moneyK(fc.end)}`}</small></div></button><button class="card hmini" data-act="nav" data-v="goals"><span class="big">🎯</span><div><b>Цілі</b><small>${doneG}/${GOALS.length}</small></div></button></div>`;
  return html.replace('<div class="hrow">', tiles + '<div class="hrow">');
};
