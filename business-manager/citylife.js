'use strict';
/* БІЗНЕС ІМПЕРІЯ — реалістичне місто (оновлення 5).
   Кожен район кожного міста має населення, добробут (багаті/бідні), ціну землі, рівень забудови й злочинність.
   Ціна землі змінює оренду; добробут — витрати покупців; затори (пробки) залежать від населення й доріг
   і впливають на логістику й потік покупців у години пік; місто з часом забудовується — у 3D з’являються
   нові хмарочоси, гравець може звести власний хмарочос. */

const DIST_WEALTH = { center: 70, biz: 72, res: 42, campus: 35, river: 76, hills: 88, industrial: 24, port: 30 };
function cityxState() {
  if (!state.cityx) state.cityx = {};
  for (const cid of Object.keys(CITIES)) {
    if (state.cityx[cid]) continue;
    const C = CITIES[cid], rich = C.wage > 1.2 ? 12 : C.wage < 0.95 ? -10 : 0;
    state.cityx[cid] = { jam: 0.3, dist: Object.fromEntries(DISTRICTS.map((d) => [d.id, { wealth: clamp(DIST_WEALTH[d.id] + rich + rnd(-5, 5), 5, 98), land: 1, dev: clamp(30 + rich * 2 + (POP0[cid] || 1) * 3 + rnd(-8, 8), 5, 90) }])) };
  }
  return state.cityx;
}
const distX = (cid, dist) => { const X = state.cityx && state.cityx[cid]; return X ? X.dist[dist] : null; };
/** Множник оренди від ціни землі району. */
function landMult(lot) { const d = distX(lotCityId(lot), lot.district); return d ? d.land : 1; }
const wealthLabel = (w) => (w >= 75 ? 'заможний' : w >= 50 ? 'середній клас' : w >= 32 ? 'робітничий' : 'бідний');
/** Множник покупців району: добробут + затори в години пік. */
function districtTraffic(cid, dist) {
  const d = distX(cid, dist); if (!d) return 1;
  let m = 0.9 + d.wealth / 500;
  const h = state.hour, rush = (h >= 8 && h < 10) || (h >= 17 && h < 20);
  if (rush && (dist === 'center' || dist === 'biz')) m *= 1 - state.cityx[cid].jam * 0.18;
  return m;
}
const jamMult = (cid) => (state.cityx && state.cityx[cid] ? 1 + state.cityx[cid].jam * 0.3 : 1);
function districtCrime(cid, dist) { const d = distX(cid, dist); const base = state.crime ? crimeIndex(cid) : 0.2; return d ? clamp(base * (1.5 - d.wealth / 100), 0, 1) : base; }

function citylifeDaily() {
  const X = cityxState();
  for (const cid of Object.keys(CITIES)) {
    const cx = X[cid], D = state.cities && state.cities.c[cid];
    const lv = D ? D.lv : {}, pop = D ? D.pop / D.pop0 : 1;
    // Затори: росте з населенням і кількістю бізнесу, падає з дорогами, мостами, залізницею
    const units = state.lots.filter((l) => lotCityId(l) === cid && (l.owner || l.npc)).length / 96;
    const jamT = clamp(0.25 + (pop - 1) * 0.8 + units * 0.25 - (lv.roads || 0) * 0.07 - (lv.bridges || 0) * 0.05 - (lv.rail || 0) * 0.06, 0, 1);
    cx.jam = +(cx.jam + (jamT - cx.jam) * 0.03).toFixed(3);
    for (const d of DISTRICTS) {
      const x = cx.dist[d.id];
      const mine = state.lots.filter((l) => lotCityId(l) === cid && l.district === d.id && l.ownerKind).length;
      const sky = state.props.filter((p) => p.owned && !p.building && p.kind === 'skyscraper' && p.district === d.id && lotById(p.lotId) && lotCityId(lotById(p.lotId)) === cid).length;
      // Забудова: інвестиції (ваші об’єкти, хмарочоси, інфраструктура), ріст населення, економіка
      const devT = clamp(20 + mine * 4 + sky * 12 + ((lv.housing || 0) + (lv.malls || 0) + (lv.hotels || 0)) * 3 + (pop - 1) * 40 + (state.econ.phase === 'boom' ? 8 : state.econ.phase === 'crisis' ? -8 : 0) + DIST_WEALTH[d.id] * 0.25, 5, 100);
      x.dev = clamp(x.dev + (devT - x.dev) * 0.004, 0, 100);
      // Добробут: розвиток і безпека піднімають, злочинність і безробіття знижують (повільно — джентрифікація)
      const unemp = typeof cityUnemp === 'function' ? cityUnemp(cid) : state.econ.unemployment;
      const wT = clamp(DIST_WEALTH[d.id] + (x.dev - 50) * 0.3 - (state.crime ? crimeIndex(cid) * 20 : 4) - (unemp - 7) * 1.5, 5, 98);
      x.wealth = clamp(x.wealth + (wT - x.wealth) * 0.003, 0, 100);
      // Ціна землі: розвиток, добробут, транспорт, злочинність
      const landT = clamp((0.55 + x.dev / 100 * 0.6 + x.wealth / 250) * (1 - districtCrime(cid, d.id) * 0.25) * (1 + ((lv.rail || 0) + (lv.roads || 0)) * 0.015), 0.4, 2.6);
      x.land = +(x.land + (landT - x.land) * 0.01).toFixed(3);
    }
  }
}
/** Ключ для 3D: рівень забудови міста (кількість фонових хмарочосів). */
function skylineLevel(cid) { const X = state.cityx && state.cityx[cid]; if (!X) return 0; return Math.floor(((X.dist.biz.dev + X.dist.center.dev) / 2) / 10); }

HOOKS.day.push(citylifeDaily);
