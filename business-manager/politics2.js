'use strict';
/* БІЗНЕС ІМПЕРІЯ — політика й влада, частина 2 (оновлення 6). Доповнює politics.js.
   Податки за галузями (роздріб, промисловість, енергетика, технології, фінанси, послуги, медіа) і закони,
   що їх змінюють; рейтинг уряду й політичні кризи (протести, розпад коаліції й дострокові вибори, відставка
   уряду, імпічмент, бюджетна криза); стосунки з чиновниками — лише законні інструменти (робочі зустрічі,
   форуми, спільні соціальні проєкти). Незалежні органи (ЦБ, АМКУ, суди) стосунків не будують. */

const TAX_SECTORS = {
  retail: { name: 'Роздрібна торгівля', icon: '🛒', led: ['sales'] },
  industry: { name: 'Промисловість', icon: '🏭', led: ['b2b'] },
  energy: { name: 'Енергетика', icon: '⚡', led: ['power'] },
  tech: { name: 'Технології', icon: '💻', led: ['software'] },
  finance: { name: 'Фінанси', icon: '🏦', led: ['bankProfit', 'interestInc'] },
  services: { name: 'Послуги (галузі)', icon: '🏢', led: ['divRev', 'infraRev'] },
  media: { name: 'Медіа й спорт', icon: '📡', led: ['media', 'sportInc'] },
};
Object.assign(BILLS, {
  energyTax: { name: 'Податок на надприбутки енергетики (+3 п.п.)', ideo: { right: 0.15, center: 0.45, left: 0.85, national: 0.55, green: 0.95 }, apply: () => sectorTaxAdd('energy', 0.03) },
  itBreaks: { name: 'Податкові пільги для IT (−3 п.п.)', ideo: { right: 0.85, center: 0.65, left: 0.3, national: 0.4, green: 0.55 }, apply: () => sectorTaxAdd('tech', -0.03) },
  bankTax: { name: 'Банківський податок (+3 п.п.)', ideo: { right: 0.1, center: 0.4, left: 0.9, national: 0.65, green: 0.6 }, apply: () => sectorTaxAdd('finance', 0.03) },
  retailRelief: { name: 'Знижка податку для торгівлі (−2 п.п.)', ideo: { right: 0.8, center: 0.6, left: 0.3, national: 0.5, green: 0.35 }, apply: () => sectorTaxAdd('retail', -0.02) },
  industryRelief: { name: 'Промисловий податковий кредит (−3 п.п.)', ideo: { right: 0.65, center: 0.6, left: 0.35, national: 0.9, green: 0.2 }, apply: () => sectorTaxAdd('industry', -0.03) },
  mediaTax: { name: 'Податок на рекламу й медіа (+2 п.п.)', ideo: { right: 0.2, center: 0.45, left: 0.7, national: 0.6, green: 0.5 }, apply: () => sectorTaxAdd('media', 0.02) },
  luxuryTax: { name: 'Податок на розкіш', ideo: { right: 0.1, center: 0.5, left: 0.95, national: 0.6, green: 0.7 }, apply: () => { pol2State().luxuryTax = true; } },
});
Object.assign(BILL_OPINION, { energyTax: ['ecology', 1], itBreaks: ['business', 1], bankTax: ['business', -1], retailRelief: ['taxes', 1], industryRelief: ['taxes', 1], luxuryTax: ['social', 1] });
const REL_TARGETS = ['economy', 'tax', 'finreg']; // профільні міністерства (незалежні органи — ні)

function pol2State() {
  if (!state.pol2) state.pol2 = { sectorTax: Object.fromEntries(Object.keys(TAX_SECTORS).map((k) => [k, 0])), govApproval: 50, crises: [], rel: {}, relMayor: {}, luxuryTax: false, hist: [] };
  return state.pol2;
}
function sectorTaxAdd(k, d) { const P = pol2State(); P.sectorTax[k] = clamp(+(P.sectorTax[k] + d).toFixed(3), -0.15, 0.2); }
/** Ефективна ставка податку гравця: базова + галузеві надбавки, зважені за структурою доходів. */
function effectiveTaxRate() {
  const P = pol2State(), led = state.ledger.slice(-7);
  const w = {}; let tot = 0;
  for (const [k, S] of Object.entries(TAX_SECTORS)) { w[k] = Math.max(0, sum(led, (x) => sum(S.led, (c) => Math.max(0, x[c] || 0)))); tot += w[k]; }
  let r = state.econ.taxRate;
  if (tot > 0) for (const k of Object.keys(w)) r += w[k] / tot * P.sectorTax[k];
  return clamp(r, 0.02, 0.6);
}
const relOf = (k) => { const P = pol2State(); return P.rel[k] == null ? (P.rel[k] = 50) : P.rel[k]; };
const relMayor = (c) => { const P = pol2State(); return P.relMayor[c] == null ? (P.relMayor[c] = 50) : P.relMayor[c]; };
function workMeeting(k) {
  const c = Math.round(5e4 * priceLvl()); if (state.cash < c) return toast('Недостатньо коштів.', 'bad');
  book('politics', -c); const P = pol2State(); P.rel[k] = clamp(relOf(k) + rnd(4, 9), 0, 100);
  log(`🤝 Робоча зустріч у «${MINISTRIES[k].name}»: стосунки ${Math.round(P.rel[k])}. Зустріч зареєстровано в реєстрі лобістів.`);
}
function govForum() {
  const c = Math.round(3e5 * priceLvl()); if (state.cash < c) return toast('Недостатньо коштів.', 'bad');
  book('politics', -c); const P = pol2State();
  for (const k of REL_TARGETS) P.rel[k] = clamp(relOf(k) + 3, 0, 100);
  if (state.opinion) state.opinion.issues.business = clamp(state.opinion.issues.business + 2, -100, 100);
  news(`🏛️ ${state.company} виступила партнером Національного інвестиційного форуму.`, 'politics', 'good');
}
function cityProject(cid) {
  const c = Math.round(1e6 * priceLvl()); if (state.cash < c) return toast('Недостатньо коштів.', 'bad');
  book('charity', -c); const P = pol2State(); P.relMayor[cid] = clamp(relMayor(cid) + 12, 0, 100);
  if (state.opinion) state.opinion.approval = clamp(state.opinion.approval + 2, 0, 100);
  if (state.cities) state.cities.c[cid].pop *= 1.002;
  news(`🌳 ${state.company} разом із мерією ${CITIES[cid].name} відкриває новий парк і спортмайданчики.`, 'city', 'good');
}
/** Кращі стосунки з мером — дешевше й швидше будувати в місті (дозволи без затримок). */
const mayorDiscount = (cid) => (state.pol2 ? 1 - Math.max(0, relMayor(cid) - 50) / 500 : 1);

function crisisEvent(kind) {
  const P = pol2State(), Pl = polState();
  P.crises.unshift({ day: state.day, kind }); if (P.crises.length > 20) P.crises.length = 20;
  if (kind === 'protest') { state.mods.push({ kind: 'traffic', key: 'center', mult: 0.75, days: 5, label: '✊ Протести в центрі' }); news('✊ Масові протести проти уряду: центр міст перекрито, торгівля в центрі −25% на 5 днів.', 'politics', 'bad', true); }
  if (kind === 'coalition') { Pl.nextParl = Math.min(Pl.nextParl, state.day + 40); news('💥 Коаліція розпалась! Дострокові парламентські вибори — через 40 днів.', 'politics', 'bad', true); }
  if (kind === 'cabinet') { appointCabinet(); news('🏛️ Уряд відправлено у відставку: сформовано новий склад міністрів.', 'politics', '', true); }
  if (kind === 'impeach') { Pl.nextPres = Math.min(Pl.nextPres, state.day + 35); news(`⚖️ Парламент запустив процедуру імпічменту президента ${Pl.president.name}. Дострокові вибори — через 35 днів.`, 'politics', 'bad', true); }
  if (kind === 'budget') { state.econ.taxRate = clamp(+(state.econ.taxRate + 0.02).toFixed(2), 0.08, 0.45); govState().subsidies = []; news('💸 Бюджетна криза: уряд підвищив податок на прибуток на 2 п.п. і скасував субсидії.', 'politics', 'bad', true); }
  for (const co of aliveCos()) co.price *= 0.98;
}

function pol2Daily() {
  const P = pol2State(), Pl = polState(), e = state.econ, G = govState();
  // Рейтинг уряду: економіка, безробіття, інфляція, протестні настрої
  const target = clamp(60 + (e.phase === 'boom' ? 10 : e.phase === 'growth' ? 5 : e.phase === 'recession' ? -12 : e.phase === 'crisis' ? -25 : 0) - Math.max(0, e.unemployment - 7) * 3 - Math.max(0, e.inflation - 5) * 2.5 + (state.opinion ? state.opinion.issues.social * -0.05 : 0), 5, 90);
  P.govApproval = clamp(P.govApproval + (target - P.govApproval) * 0.03 + rnd(-0.6, 0.6), 0, 100);
  P.hist.push({ d: state.day, g: Math.round(P.govApproval) }); if (P.hist.length > 180) P.hist.shift();
  const recent = (k, n) => P.crises.some((c) => c.kind === k && state.day - c.day < n);
  if (P.govApproval < 30 && !recent('protest', 40) && chance(0.03)) crisisEvent('protest');
  if (P.govApproval < 22 && !recent('coalition', 200) && Pl.campaign == null && chance(0.01)) crisisEvent('coalition');
  if (P.govApproval < 28 && !recent('cabinet', 120) && chance(0.008)) crisisEvent('cabinet');
  if (P.govApproval < 18 && Pl.president && !Pl.president.player && !Pl.president.ally && !recent('impeach', 300) && chance(0.005)) crisisEvent('impeach');
  if (G.budget.balance < -3e9 * priceLvl() && !recent('budget', 150) && chance(0.02)) crisisEvent('budget');
  // Податок на розкіш
  if (P.luxuryTax && state.life && state.life.lux.length) book('tax', -sum(state.life.lux, (x) => luxValue(x)) * 0.01 / 365 * 10);
  // Стосунки з чиновниками повертаються до 50; скандали й порушення шкодять
  const hit = (state.opinion ? state.opinion.scandals.filter((s) => state.day < s.until).length : 0) * 0.05 + (G.cases.some((c) => c.target === 'player' && c.stage === 'investigation') ? 0.05 : 0);
  for (const k of REL_TARGETS) P.rel[k] = clamp(relOf(k) + (50 - relOf(k)) * 0.01 - hit, 0, 100);
  for (const c of Object.keys(P.relMayor)) P.relMayor[c] = clamp(relMayor(c) + (50 - relMayor(c)) * 0.01 - hit, 0, 100);
  // Галузеві податки дрейфують за курсом коаліції (раз на місяць)
  if (state.day % 30 === 7) {
    const I = typeof govIdeo === 'function' ? govIdeo() : { tax: 0 };
    if (I.tax > 0.01 && chance(0.3)) { const k = pick(['energy', 'finance']); sectorTaxAdd(k, 0.01); govDecide(`Уряд підвищив галузевий податок: ${TAX_SECTORS[k].name} +1 п.п.`, 'bad'); }
    if (I.tax < -0.01 && chance(0.3)) { const k = pick(['tech', 'industry', 'retail']); sectorTaxAdd(k, -0.01); govDecide(`Уряд знизив галузевий податок: ${TAX_SECTORS[k].name} −1 п.п.`, 'good'); }
  }
}

HOOKS.day.push(pol2Daily);
