'use strict';
/* БІЗНЕС ІМПЕРІЯ — «Особистий кабінет» (здоров’я, родина, розкіш, подорожі, спадок) і «Спортивна імперія». */

NAV.splice(NAV.findIndex((x) => x[0] === 'life'), 0, ['personal', '🧑‍💼', 'Особистий кабінет']);
NAV.splice(NAV.findIndex((x) => x[0] === 'sponsor') + 1, 0, ['clubs', '⚽', 'Спортивна імперія']);

const ageTxt = (a) => `${Math.floor(a)} р.`;
Object.assign(VIEWS, {
  personal() {
    const L = lifeState(), tab = ['health', 'family', 'lux', 'travel', 'legacy'].includes(state.ui.tab) ? state.ui.tab : 'health';
    let html = `<h1>🧑‍💼 Особистий кабінет</h1><div class="card row lifehead">${avatarSVG(state.me.look, 64)}<div><h2>${esc(state.me.name)}</h2><p class="muted">${ageTxt(L.age)} · ${statusTitle()} · покоління ${L.gen}${L.partner ? ` · у шлюбі з ${esc(L.partner.name)}` : ''}</p></div></div>
      <div class="kpis">${kpi('Здоров’я', Math.round(L.health), L.health < 40 ? 'neg' : L.health > 70 ? 'pos' : '')}${kpi('Стрес', Math.round(L.stress), L.stress > 60 ? 'neg' : '')}${kpi('Щастя', Math.round(L.happy), L.happy > 65 ? 'pos' : L.happy < 35 ? 'neg' : '')}${kpi('Статус', statusScore(), '', statusTitle())}${kpi('Розкіш', moneyK(luxuryValue()))}</div>`
      + tabsHtml([['health', '❤️ Здоров’я'], ['family', '👨‍👩‍👧 Сім’я'], ['lux', '💎 Розкіш'], ['travel', '✈️ Подорожі й благодійність'], ['legacy', '👑 Спадок']], tab);
    if (tab === 'health') {
      html += `<div class="card"><p class="muted">Рік життя = ${AGE_DAYS} ігрових днів. Здоров’я падає з віком і стресом; після 60 років зростає ризик смерті — тоді імперію успадковує наступне покоління. Стрес росте від кількості бізнесів без керуючих, боргів і загроз; знижують — штаб, турботливий партнер, вілли, яхти, подорожі.</p></div>
        <div class="card"><h3>🩺 Медицина</h3><div class="chips">${MEDICAL.map((M, i) => `<button class="chip ${L.medical === i ? 'on' : ''}" data-act="lfMed" data-v="${i}">${M.name}${M.cost ? ` · ${money(M.cost * priceLvl())}/д` : ''}${M.h ? ` · +${M.h}` : ''}</button>`).join('')}</div></div>
        <div class="card"><h3>Ризики</h3><p>Ризик смерті цього року: <b>${pct(Math.min(1, ((L.health < 8 ? 0.01 : 0) + (L.age > 60 ? 0.00003 * Math.pow(L.age - 60, 2) * (1 + Math.max(0, 50 - L.health) / 25) : 0)) * AGE_DAYS), 1)}</b></p><p class="muted">Охорона: розділ «Безпека». Навички: розділ «Життя» (курси).</p></div>`;
    } else if (tab === 'family') {
      if (L.partner) {
        const P = L.partner;
        html += `<div class="card row lifehead">${avatarSVG(P.look, 48)}<div><b>💍 ${esc(P.name)}</b> · ${ageTxt(ageOf(P.born))} · ${PARTNER_TRAITS[P.trait].name}<br><small class="muted">${PARTNER_TRAITS[P.trait].desc} · щастя ${Math.round(P.happy)} · ${P.prenup ? 'є шлюбний договір' : 'без шлюбного договору'} · у шлюбі з дня ${P.since}</small><div style="margin-top:6px"><button class="btn sm danger" data-act="lfDivorce">Розлучитися</button></div></div></div>`;
      } else {
        html += `<div class="card"><h3>💞 Знайомства</h3><p class="muted">Вищий статус робить вас привабливішими. Шлюбний договір захищає активи при розлученні, але знижує шанс згоди.</p><button class="btn primary" data-act="lfFind">Знайти знайомства · ${money(5000 * priceLvl())}</button>
          ${L.dates.map((d) => `<div class="stock"><div class="row" style="gap:8px">${avatarSVG(d.look, 36)}<div><b>${esc(d.name)}</b>, ${d.age} р. · ${PARTNER_TRAITS[d.trait].name}<br><small>сумісність ${d.compat}% · стосунки ${Math.round(d.love)}%</small>${bar(d.love)}</div></div><div class="px"></div><span></span><div class="trade"><button class="btn sm" data-act="lfDate" data-id="${d.id}">Побачення</button>${d.love >= 70 ? [0, 1, 2].map((s) => `<button class="btn sm primary" data-act="lfPropose" data-id="${d.id}" data-s="${s}" data-p="0">💍 ${['Скромне', 'Гарне', 'Розкішне'][s]} весілля</button>`).join('') + `<button class="btn sm" data-act="lfPropose" data-id="${d.id}" data-s="1" data-p="1">💍 + шлюбний договір</button>` : ''}</div></div>`).join('')}</div>`;
      }
      html += `<div class="card"><h3>👶 Діти</h3>${L.kids.length ? L.kids.map((k) => { const a = kidAge(k); return `<div class="stock"><div class="row" style="gap:8px">${avatarSVG(k.look, 36)}<div><b>${esc(k.name)}</b>, ${ageTxt(a)} · ${CHILD_TRAITS[k.trait].name}${L.will === k.id ? ' <span class="tag good">спадкоємець</span>' : ''}<br><small>Бізнес ${k.skills.business.toFixed(1)} · Менеджмент ${k.skills.management.toFixed(1)} · IT ${k.skills.coding.toFixed(1)}${k.intern ? ' · стажується' : ''}</small></div></div><div class="px"></div><span></span><div class="trade">${a < 22 ? `<select data-change="lfEdu" data-id="${k.id}">${EDU.map((E, i) => `<option value="${i}" ${k.edu === i ? 'selected' : ''}>${E.name}${E.cost ? ` (${money(E.cost * priceLvl())}/д)` : ''}</option>`).join('')}</select>` : ''}${a >= 18 ? `<button class="btn sm" data-act="lfIntern" data-id="${k.id}">${k.intern ? 'Завершити стажування' : '👔 Стажування в компанії'}</button>` : ''}</div></div>`; }).join('') : `<p class="muted">${L.partner ? 'Діти з’являються в щасливих родинах.' : 'Спершу створіть родину.'}</p>`}</div>`;
    } else if (tab === 'lux') {
      html += `<div class="card"><p class="muted">Розкіш підвищує статус, щастя (і партнера), а вілли, яхти й острів знімають стрес. Нерухомість росте з ринком, мистецтво — непередбачувано, транспорт дешевшає. Утримання щоденне. Приватний літак здешевлює подорожі на 30%.</p></div><div class="cards">${Object.entries(LUXURY).map(([k, X]) => `<div class="card camp"><span class="big">${X.icon}</span><div><b>${X.name}</b><br><small>статус +${X.status} · щастя +${X.happy} · ${money(X.upkeep * priceLvl())}/д</small></div><button class="btn sm primary" ${state.cash < X.price * priceLvl() ? 'disabled' : ''} data-act="lfBuy" data-k="${k}">${moneyK(X.price * priceLvl())}</button></div>`).join('')}</div>
        <div class="card"><h3>Моя колекція</h3>${L.lux.length ? L.lux.map((x) => `<div class="row between"><span>${LUXURY[x.kind].icon} ${LUXURY[x.kind].name} <small class="muted">куплено за ${moneyK(x.price)}</small></span><span>${moneyK(luxValue(x))} <button class="btn sm" data-act="lfSell" data-id="${x.id}">Продати</button></span></div>`).join('') : '<p class="muted">Поки нічого.</p>'}</div>`;
    } else if (tab === 'travel') {
      html += `<div class="cards">${Object.entries(TRIPS).map(([k, T]) => `<div class="card camp"><span class="big">${T.icon}</span><div><b>${T.name}</b><br><small>${T.biz ? 'менше ворожнечі з конкурентами, +репутація' : `стрес −${T.stress}, здоров’я +${T.health}, щастя +${T.happy}`}${L.partner ? ' · з партнером' : ''}</small></div><button class="btn sm primary" data-act="lfTrip" data-k="${k}">${moneyK(T.cost * priceLvl() * (L.partner ? 1.6 : 1) * (L.lux.some((x) => LUXURY[x.kind].jet) ? 0.7 : 1))}</button></div>`).join('')}</div>
        <div class="card"><h3>💝 Благодійність</h3><p class="muted">Підвищує репутацію корпорації, популярність (політика), статус і щастя. Усього пожертвувано: ${moneyK(L.charity)}.</p><div class="row wrap">${[['освіту', 1e5], ['лікарні', 1e6], ['культуру й мистецтво', 5e6], ['відбудову міст', 2e7]].map(([c, v]) => `<button class="btn sm" data-act="lfGive" data-v="${v}" data-c="${c}">${moneyK(v * priceLvl())} на ${c}</button>`).join('')}</div></div>`;
    } else {
      const cands = heirCandidates();
      html += `<div class="card"><h3>📜 Заповіт</h3><p class="muted">Після смерті імперію отримує спадкоємець за заповітом (інакше — найздібніший повнолітній). Сплачується податок на спадщину (½ ставки податку на прибуток з готівки), брати й сестри отримують по 4% готівки. Навички спадкоємця стають вашими. Без спадкоємців династія завершується.</p>
        ${cands.length ? cands.map((c) => `<div class="row between"><span>${esc(c.name)} · ${ageTxt(c.age)} · бізнес ${c.skills.business.toFixed(1)}, менеджмент ${c.skills.management.toFixed(1)}</span><button class="btn sm ${L.will === c.id ? 'primary' : ''}" data-act="lfWill" data-id="${c.id}">${L.will === c.id ? '✓ у заповіті' : 'Призначити'}</button></div>`).join('') : '<p class="neg">Спадкоємців немає.</p>'}
        <div style="margin-top:8px"><button class="btn" data-act="lfRetire">👑 Передати імперію зараз (без податку)</button></div></div>
        <div class="card"><h3>🏛️ Династія</h3>${L.dynasty.length ? L.dynasty.map((d) => `<p>Покоління ${d.gen}: <b>${esc(d.name)}</b> — до дня ${d.to}, ${d.age} р., капітал ${moneyK(d.nw)} (${d.reason === 'death' ? 'помер(-ла)' : 'передав(-ла) справи'})</p>`).join('') : '<p class="muted">Ви — засновник династії.</p>'}</div>`;
    }
    return html;
  },

  clubs() {
    const S = sportState(), C = clubsState(), mine = myClubs(), tab = ['own', 'market', 'buy', 'league'].includes(state.ui.tab) ? state.ui.tab : 'own';
    const inc = sum(mine, (t) => t.yInc || 0), exp = sum(mine, (t) => t.yExp || 0);
    let html = `<h1>⚽ Спортивна імперія</h1><div class="kpis">${kpi('Моїх клубів', mine.length)}${kpi('Дохід/день', money(inc), 'pos', 'ТБ + мерч (квитки щотижня)')}${kpi('Витрати/день', money(exp))}${kpi('Вартість клубів', moneyK(clubsValue()))}${kpi('Трофеї', S.trophies)}</div>`
      + tabsHtml([['own', 'Мої клуби'], ['market', 'Трансфери'], ['buy', 'Купити клуб'], ['league', 'Ліги й кубки']], tab);
    if (tab === 'own') {
      if (!mine.length) html += '<div class="card"><p class="muted">У вас ще немає клубів. Купіть клуб на вкладці «Купити клуб». Спонсорство команд — у розділі «Спорт».</p></div>';
      for (const t of mine) {
        const pos = S.teams.filter((x) => x.league === t.league).sort((x, y) => y.points - x.points || y.strength - x.strength).indexOf(t) + 1;
        html += `<div class="card"><div class="row between"><b>${LEAGUES[t.league].icon} ${esc(t.name)}</b><span class="tag">${LEAGUES[t.league].name} · ${pos} місце · ${t.points} оч.</span></div>
          <div class="kpis">${kpi('Сила складу', Math.round(t.strength))}${kpi('Фанати', moneyK(t.reach).replace('$', ''))}${kpi('Стадіон', STADIUM[(t.stadium || 1) - 1].toLocaleString('uk-UA'), '', t.gate ? `останній матч: ${t.gate.seats.toLocaleString('uk-UA')} глядачів` : '')}${kpi('Прибуток/день', money((t.yInc || 0) - (t.yExp || 0)), (t.yInc || 0) < (t.yExp || 0) ? 'neg' : 'pos')}</div>
          <div class="row wrap"><span class="muted">Тренер:</span>${COACHES.map((Co, i) => `<button class="chip ${(t.coach || 0) === i ? 'on' : ''}" data-act="clCoach" data-id="${t.id}" data-v="${i}">${Co.name}${Co.wage ? ` · ${money(Co.wage * priceLvl())}/д` : ''}</button>`).join('')}</div>
          <div class="row wrap"><span class="muted">Квитки:</span>${['дешеві', 'стандарт', 'дорогі'].map((n, i) => `<button class="chip ${(t.ticket == null ? 1 : t.ticket) === i ? 'on' : ''}" data-act="clTicket" data-id="${t.id}" data-v="${i}">${n}</button>`).join('')}${(t.stadium || 1) < 5 ? `<button class="btn sm" data-act="clStadium" data-id="${t.id}">🏟️ Розширити стадіон · ${moneyK(stadiumUpCost(t))}</button>` : ''}<label class="switch"><input type="checkbox" data-change="clDir" data-id="${t.id}" ${t.director ? 'checked' : ''}> Спортивний директор (${money(3000 * priceLvl())}/д): продовжує контракти, докуповує гравців</label><button class="btn sm danger" data-act="clSell" data-id="${t.id}">Продати клуб · ${moneyK(clubPrice(t) * 0.9)}</button></div>
          <div class="table-wrap"><table><thead><tr><th>Гравець</th><th>Рейт.</th><th>Вік</th><th>З/п</th><th>Контракт</th><th></th></tr></thead><tbody>${[...t.squad].sort((a, b) => b.rating - a.rating).map((a, i) => `<tr class="${i < LINEUP ? '' : 'muted'}"><td>${esc(a.name)}${a.age < 23 && a.pot > a.rating + 5 ? ' ⭐' : ''}</td><td>${Math.round(a.rating)}</td><td>${a.age}</td><td>${money(a.wage * priceLvl())}</td><td>${a.until - state.day} дн.</td><td><button class="btn sm" data-act="clRenew" data-t="${t.id}" data-id="${a.id}">Продовжити</button><button class="btn sm" data-act="clSellA" data-t="${t.id}" data-id="${a.id}">Продати ${moneyK(athValue(a) * 0.85)}</button></td></tr>`).join('')}</tbody></table></div><small class="muted">Основний склад — ${LINEUP} найсильніших. ⭐ — молодий талант із потенціалом.</small></div>`;
      }
    } else if (tab === 'market') {
      html += mine.length ? `<div class="card"><div class="row wrap"><span class="muted">Купувати для:</span><select id="clTeam">${mine.map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select></div></div>` : '<div class="card"><p class="muted">Спершу купіть клуб.</p></div>';
      html += `<div class="card stocklist">${C.market.sort((a, b) => b.rating - a.rating).map((a) => { const src = a.from ? S.teams.find((x) => x.id === a.from) : null; return `<div class="stock"><div><b>${esc(a.name)}</b> · рейтинг ${a.rating}${a.pot > a.rating + 5 ? ` (потенціал ${a.pot})` : ''}<br><small>${a.age} р. · з/п ${money(a.wage * priceLvl())}/д · ${src ? `з клубу «${esc(src.name)}»` : 'вільний агент'}</small></div><div class="px">${moneyK(athValue(a))}</div><span></span>${mine.length ? `<div class="trade"><button class="btn sm primary" ${state.cash < athValue(a) ? 'disabled' : ''} data-act="clBuyA" data-id="${a.id}">Підписати</button></div>` : ''}</div>`; }).join('')}</div>`;
    } else if (tab === 'buy') {
      for (const lg of Object.keys(LEAGUES)) {
        html += `<h3>${LEAGUES[lg].icon} ${LEAGUES[lg].name}</h3><div class="card stocklist">${S.teams.filter((t) => t.league === lg).sort((a, b) => b.strength - a.strength).map((t) => `<div class="stock ${t.owner === 'player' ? 'mine' : ''}"><div><b>${esc(t.name)}</b>${t.owner === 'player' ? ' <span class="tag good">ваш</span>' : ''}<br><small>сила ${Math.round(t.strength)} · фанатів ${moneyK(t.reach).replace('$', '')} · титулів ${t.titles}</small></div><div class="px">${moneyK(clubPrice(t))}</div><span></span>${t.owner === 'player' ? '' : `<div class="trade"><button class="btn sm primary" ${state.cash < clubPrice(t) ? 'disabled' : ''} data-act="clBuy" data-id="${t.id}">Купити клуб</button></div>`}</div>`).join('')}</div>`;
      }
    } else {
      html += `<div class="card"><h3>🌍 Міжнародний кубок</h3><p class="muted">Кожні 2 сезони: двоє найкращих клубів кожної ліги + іноземні гості, плей-оф. Переможець отримує призові, трофей і +25% фанатів.</p>${C.cupHist.length ? C.cupHist.map((c) => `<p><small>Д${c.day}</small> ${LEAGUES[c.league] ? LEAGUES[c.league].icon : ''} ${esc(c.winner)}${c.mine ? ' <span class="tag good">ваш</span>' : ''}</p>`).join('') : '<p class="muted">Турнірів ще не було.</p>'}</div>`;
      if (C.ownLeague) html += `<div class="card"><h3>🏆 ${esc(C.ownLeague.name)}</h3><p>Права на трансляції: ${money(leagueRights('own') * 0.5)}/день${state.media && state.media.outlets.some((o) => o.owner === 'player' && o.type === 'tv') ? ' (з бонусом вашого телеканалу)' : ''}. Команди: ${C.ownLeague.teams.map(esc).join(', ')}.</p><p class="muted">Ліга з’являється в розділі «Спорт» — її клуби можна купувати й спонсорувати.</p></div>`;
      else html += `<div class="card"><h3>🏆 Заснувати власну лігу · ${moneyK(OWN_LEAGUE_COST * priceLvl())}</h3><p class="muted">6 нових професійних клубів у ваших містах. Ви отримуєте права на трансляції (більше з власним телеканалом). Чемпіони ліги грають у міжнародному кубку.</p><div class="row wrap"><select id="lgSport">${Object.entries(LEAGUES).filter(([k]) => k !== 'own').map(([k, L]) => `<option value="${k}">${L.icon} ${L.name}</option>`).join('')}</select><input id="lgName" placeholder="Назва ліги" maxlength="28"><button class="btn primary" data-act="clLeague">Заснувати</button></div></div>`;
    }
    return html;
  },
});

Object.assign(ACT, {
  lfMed: (d) => setMedical(+d.v), lfFind: () => findDates(), lfDate: (d) => date(d.id),
  lfPropose: (d) => propose(d.id, d.p === '1', +d.s),
  lfDivorce: () => confirmBox(lifeState().partner && !lifeState().partner.prenup ? 'Розлучитися? Без шлюбного договору суд віддасть 30% готівки й половину розкоші.' : 'Розлучитися?', () => divorce()),
  lfIntern: (d) => internship(d.id), lfWill: (d) => setWill(d.id), lfRetire: () => retire(),
  lfBuy: (d) => confirmBox(`Придбати: ${LUXURY[d.k].name} за ${money(LUXURY[d.k].price * priceLvl())}?`, () => buyLuxury(d.k)),
  lfSell: (d) => sellLuxury(d.id), lfTrip: (d) => takeTrip(d.k),
  lfGive: (d) => donate2(+d.v * priceLvl(), d.c),
  clBuy: (d) => confirmBox('Купити клуб?', () => buyClub(d.id)), clSell: (d) => confirmBox('Продати клуб?', () => sellClub(d.id)),
  clCoach: (d) => { const t = sportState().teams.find((x) => x.id === d.id); if (t) { t.coach = +d.v; t.strength = squadStrength(t); } },
  clTicket: (d) => { const t = sportState().teams.find((x) => x.id === d.id); if (t) t.ticket = +d.v; },
  clStadium: (d) => upgradeStadium(d.id),
  clRenew: (d) => renewAthlete(d.t, d.id), clSellA: (d) => sellAthlete(d.t, d.id),
  clBuyA: (d) => buyAthlete(askVal('clTeam'), d.id),
  clLeague: () => confirmBox('Заснувати власну лігу?', () => foundLeague(askVal('lgSport'), askVal('lgName').trim())),
});
Object.assign(CHANGE, { lfEdu: (el) => setEdu(el.dataset.id, +el.value), clDir: (el) => { const t = sportState().teams.find((x) => x.id === el.dataset.id); if (t) t.director = el.checked; } });

// досягнення етапу 7
ACHIEVEMENTS.splice(ACHIEVEMENTS.findIndex((a) => a.id === 'banker'), 0,
  { id: 'family', icon: '👨‍👩‍👧', name: 'Сімейна людина', desc: 'Одружіться й народіть дитину', check: (s) => !!(s.life && s.life.partner && s.life.kids.length) },
  { id: 'dynasty', icon: '👑', name: 'Династія', desc: 'Передайте імперію наступному поколінню', check: (s) => !!(s.life && s.life.gen >= 2) },
  { id: 'jetset', icon: '🛩️', name: 'Джетсет', desc: 'Придбайте яхту або приватний літак', check: (s) => !!(s.life && s.life.lux.some((x) => x.kind === 'yacht' || x.kind === 'jet')) },
  { id: 'owner', icon: '⚽', name: 'Власник клубу', desc: 'Купіть спортивний клуб', check: (s) => !!(s.sport && s.sport.teams.some((t) => t.owner === 'player')) },
  { id: 'league', icon: '🏆', name: 'Президент ліги', desc: 'Заснуйте власну лігу', check: (s) => !!(s.sport && s.sport.clubs && s.sport.clubs.ownLeague) });
