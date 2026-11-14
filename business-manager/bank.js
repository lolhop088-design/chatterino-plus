'use strict';
/* БІЗНЕС ІМПЕРІЯ — власний банк гравця: депозити, кредити, капітал, нормативи, відділення. */

const BANK_LICENSE = 20000000;      // ліцензія (стає стартовим капіталом)
const BANK_MIN_NETWORTH = 50000000; // вимога до чистого капіталу корпорації
const BANK_LEVELS = [0, 50e6, 200e6, 600e6, 2e9, 6e9, 20e9];

const bankLicenseCost = () => Math.round(BANK_LICENSE * priceLvl());
const bankMinNetWorth = () => Math.round(BANK_MIN_NETWORTH * priceLvl());
const bankBranches = () => state.fac.filter((f) => f.kind === 'bankbranch' && staffOf(f).length).length;
const bankOpen = () => !!(state.bank && state.bank.open);

function bankName() { return (state.bank && state.bank.name) || `${state.company.split(' ')[0]} Банк`; }
function bankLevel() {
  const B = state.bank; if (!B) return { lvl: 0, next: BANK_LEVELS[1], prev: 0 };
  const size = B.deposits + B.loans;
  let lvl = 1; while (lvl < BANK_LEVELS.length - 1 && size >= BANK_LEVELS[lvl] * priceLvl()) lvl++;
  return { lvl, prev: BANK_LEVELS[lvl - 1] * priceLvl(), next: BANK_LEVELS[lvl] * priceLvl(), size };
}
/** Норматив достатності капіталу: капітал / кредити. */
const bankCar = () => { const B = state.bank; return B.loans > 0 ? B.capital / B.loans : 9; };
const bankMaxLoans = () => { const B = state.bank; return Math.max(0, Math.min((B.deposits + B.capital) * 0.9, B.capital / 0.1)); };

function openBank() {
  if (bankOpen()) return;
  if (netWorth() < bankMinNetWorth()) return toast(`Для ліцензії потрібен чистий капітал від ${moneyK(bankMinNetWorth())}.`, 'bad');
  const cost = bankLicenseCost();
  if (state.cash < cost) return toast(`Ліцензія коштує ${moneyK(cost)}.`, 'bad');
  book('capex', -cost);
  const K = state.econ.rate / 100;
  state.bank = {
    open: true, name: `${state.company.split(' ')[0]} Банк`, capital: cost, deposits: 0, loans: 0, internal: 0,
    depRate: Math.max(0.005, K - 0.02), loanRate: K + 0.04, payout: 0.5, card: String(4000 + ri(100, 999)) + ' ' + ri(1000, 9999) + ' ' + ri(1000, 9999) + ' ' + ri(1000, 9999),
    today: null, hist: [], founded: state.day, runDays: 0,
  };
  news(`🏦 ${state.company} отримує банківську ліцензію: відкрито «${bankName()}».`, 'market', 'good');
  log(`🏦 Засновано «${bankName()}». Статутний капітал ${money(cost)}.`, 'good');
  checkAchievements();
}

function bankSetRate(kind, delta) {
  const B = state.bank; if (!B) return;
  if (kind === 'dep') B.depRate = clamp(+(B.depRate + delta).toFixed(4), 0, 0.5);
  else B.loanRate = clamp(+(B.loanRate + delta).toFixed(4), 0.005, 0.8);
}
function bankInject(amount) {
  const B = state.bank; if (!B) return;
  if (amount > 0) { if (state.cash < amount) return toast('Недостатньо готівки.', 'bad'); book('bankCapital', -amount); B.capital += amount; }
  else {
    const take = Math.min(-amount, B.capital - B.loans * 0.12);
    if (take <= 0) return toast('Не можна вивести: порушиться норматив капіталу 12%.', 'bad');
    B.capital -= take; book('bankCapital', take);
  }
}
/** Кредит банку власній корпорації (замість зовнішніх банків). */
function bankLendToCorp(amount) {
  const B = state.bank; if (!B) return;
  const room = bankMaxLoans() - B.loans;
  amount = Math.min(amount, room);
  if (amount <= 0) return toast('Банк вичерпав ліміт кредитування (депозити, капітал, норматив).', 'bad');
  B.internal += amount; B.loans += amount;
  book('loans', amount);
  toast(`Ваш банк видав корпорації ${moneyK(amount)}.`, 'good');
}
function bankRepayCorp(amount) {
  const B = state.bank; if (!B) return;
  amount = Math.min(amount, B.internal, Math.max(0, state.cash));
  if (amount <= 0) return;
  B.internal -= amount; B.loans -= amount;
  book('loans', -amount);
}
/** Рефінансування: гасить зовнішні кредити коштом власного банку. */
function bankRefinance() {
  const ext = state.loans.filter((l) => l.kind !== 'mortgage');
  const need = sum(ext, (l) => l.amount);
  if (!need) return toast('Зовнішніх кредитів немає.', 'bad');
  const room = bankMaxLoans() - state.bank.loans;
  if (room < need) return toast(`Банк може видати лише ${moneyK(room)}, а потрібно ${moneyK(need)}.`, 'bad');
  bankLendToCorp(need);
  for (const l of ext) repayLoan(l.id);
  log(`🏦 Зовнішні кредити (${money(need)}) рефінансовано у «${bankName()}».`, 'good');
}

function bankDaily() {
  const B = state.bank; if (!B || !B.open) return;
  const e = state.econ, K = e.rate / 100, P = priceLvl();
  const branches = bankBranches();
  const cities = Object.keys(state.unlocked || {}).length;
  const car = bankCar();
  // Довіра вкладників: капітал, криза, паніка.
  const trust = clamp(car / 0.12, 0.3, 1.2) * (e.phase === 'crisis' ? 0.75 : e.phase === 'recession' ? 0.9 : 1);
  const depTarget = 60e6 * P * Math.sqrt(cities) * (1 + 0.15 * branches) * Math.max(0.05, 1 + 25 * (B.depRate - (K - 0.02))) * trust;
  if (car < 0.08 && B.loans > 0) {
    B.runDays++;
    B.deposits *= 0.95;
    if (B.runDays === 1) news(`⚠️ Вкладники забирають гроші з «${bankName()}»: капітал нижче нормативу.`, 'market', 'bad');
  } else { B.runDays = 0; B.deposits += (depTarget - B.deposits) * 0.03; }
  const internal = B.internal;
  const loanDemand = 90e6 * P * Math.sqrt(cities) * (1 + 0.15 * branches) * e.demand * Math.exp(-12 * (B.loanRate - (K + 0.03)));
  const extTarget = Math.min(loanDemand, Math.max(0, bankMaxLoans() - internal));
  const ext = Math.max(0, B.loans - internal);
  B.loans = internal + ext + (extTarget - ext) * 0.03;
  // Дохід і витрати
  const income = B.loans * B.loanRate / 365;
  const depCost = B.deposits * B.depRate / 365;
  const pd = 0.005 + Math.max(0, B.loanRate - K - 0.03) * 0.5 + (e.phase === 'crisis' ? 0.05 : e.phase === 'recession' ? 0.02 : 0);
  const losses = (B.loans - internal) * pd / 365;
  const opex = 3000 * P + 0.000005 * (B.deposits + B.loans);
  const profit = income - depCost - losses - opex;
  // Корпорація платить відсотки за внутрішнім кредитом (дохід банку вже врахований у income).
  if (internal > 0) book('interest', -internal * B.loanRate / 365);
  let paid = 0;
  if (profit > 0) { paid = profit * B.payout; B.capital += profit - paid; if (paid) book('bankProfit', paid); }
  else B.capital += profit;
  B.today = { income, depCost, losses, opex, profit, paid, pd, depTarget, loanDemand };
  B.hist.push({ day: state.day, deposits: B.deposits, loans: B.loans, capital: B.capital, profit });
  if (B.hist.length > 90) B.hist.shift();
  if (B.capital < 0) {
    news(`💥 «${bankName()}» неплатоспроможний — регулятор відкликав ліцензію. Вклади повернуто з фонду гарантування.`, 'market', 'bad');
    log(`💥 Банк втратив капітал і ліцензію. Внутрішній кредит ${money(B.internal)} перейшов до держави.`, 'bad');
    if (B.internal > 0) state.loans.push({ id: uid(), amount: B.internal, rate: (e.rate + 3) / 100 / 365, day: state.day, kind: 'loan' });
    state.bank = null;
  }
}
HOOKS.day.push(bankDaily);
