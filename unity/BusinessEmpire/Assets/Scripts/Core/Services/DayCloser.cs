using System;
using BusinessEmpire.Core.Business;
using BusinessEmpire.Core.Common;
using BusinessEmpire.Core.Economy;
using BusinessEmpire.Core.Events;
using BusinessEmpire.Core.Finance;
using BusinessEmpire.Core.Simulation;
using BusinessEmpire.Core.World;

namespace BusinessEmpire.Core.Services
{
    /// <summary>
    /// Закриття дня о 00:00: зарплати, оренда/утримання, псування, репутація, амортизація,
    /// автозамовлення, макроекономіка, ринок праці, звіт і перевірка банкрутства.
    /// </summary>
    public class DayCloser
    {
        public const int BankruptcyDays = 3;
        /// <summary>Утримання власного приміщення: частка ринкової вартості на день.</summary>
        public const double OwnedUpkeepPerDay = 0.00015;
        public const double EquipmentDepreciationPerDay = 0.0008;

        private readonly GameSimulation _sim;
        public DayCloser(GameSimulation sim) { _sim = sim; }
        private GameState S => _sim.State;

        public void CloseDay()
        {
            var day = _sim.Day - 1; // щойно настало 00:00 наступного дня
            var report = new DailyReport { Day = day, Date = S.Clock.Now.AddDays(-1).Date, OpeningBalance = S.DayOpeningBalance };

            foreach (var store in S.Stores)
            {
                var p = S.City.GetPremises(store.PremisesId);
                var sr = new StoreDayReport
                {
                    StoreId = store.Id, StoreName = store.Name,
                    Revenue = store.Today.Revenue, CostOfGoods = store.Today.CostOfGoods,
                    Customers = store.Today.Customers, LostCustomers = store.Today.Lost,
                    UnitsSold = store.Today.UnitsSold, UnitsMissed = store.Today.UnitsMissed,
                };

                sr.Wages = _sim.StaffSvc.PayDay(store.Id);
                S.Account.ForceDebit(sr.Wages, TxCategory.Wages, "Зарплати", day);

                if (p.Tenure == Tenure.Rented)
                {
                    sr.Rent = S.City.DailyRent(p, S.Macro);
                    S.Account.ForceDebit(sr.Rent, TxCategory.Rent, "Оренда приміщень", day);
                }
                else if (p.Tenure == Tenure.Owned)
                {
                    sr.Maintenance = S.City.MarketValue(p, S.Macro) * OwnedUpkeepPerDay;
                    S.Account.ForceDebit(sr.Maintenance, TxCategory.Maintenance, "Утримання власних приміщень", day);
                }

                sr.Spoilage = ApplySpoilage(store);
                sr.Satisfaction = UpdateReputation(store);
                sr.Reputation = store.Reputation;
                store.EquipmentBookValue -= store.EquipmentBookValue * EquipmentDepreciationPerDay;
                report.Stores.Add(sr);
                store.Today = new StoreDayStats();
            }

            // Приміщення без магазину теж коштують грошей.
            foreach (var p in S.City.Premises)
            {
                if (p.StoreId != null || !p.IsControlledByPlayer) continue;
                var cost = p.Tenure == Tenure.Rented ? S.City.DailyRent(p, S.Macro) : S.City.MarketValue(p, S.Macro) * OwnedUpkeepPerDay;
                S.Account.ForceDebit(cost, p.Tenure == Tenure.Rented ? TxCategory.Rent : TxCategory.Maintenance, "Порожнє приміщення " + p.Address, day);
                S.TodayOtherExpenses += cost;
            }

            report.OtherExpenses = S.TodayOtherExpenses;
            S.TodayOtherExpenses = Money.Zero;

            // Гроші за день: усі надходження й витрати з історії рахунку.
            foreach (var tx in S.Account.History)
            {
                if (tx.Day != day) continue;
                if (tx.Amount.Cents > 0) report.CashIn += tx.Amount; else report.CashOut -= tx.Amount;
            }
            report.ClosingBalance = S.Account.Balance;

            S.Reports.Add(report);
            if (S.Reports.Count > 120) S.Reports.RemoveAt(0);
            S.Stats.Revenue += report.Revenue;
            S.Stats.NetProfit += report.NetProfit;
            S.Stats.Customers += report.Customers;
            if (report.NetProfit > S.Stats.BestDayProfit) S.Stats.BestDayProfit = report.NetProfit;

            // Світ живе далі.
            S.Macro.AdvanceDay(day, S.Rng);
            S.Market.AdvanceDay();
            _sim.StaffSvc.RefreshCandidates();
            // Знімок залишку робимо до автозамовлення: воно вже належить новому дню.
            S.DayOpeningBalance = S.Account.Balance;
            _sim.Purchasing.RunAutoReorder();

            S.NegativeBalanceDays = S.Account.Balance.IsNegative ? S.NegativeBalanceDays + 1 : 0;
            if (S.NegativeBalanceDays == 1) _sim.Notify("Від’ємний баланс! Через 3 дні в мінусі — банкрутство.", Severity.Bad);
            if (S.NegativeBalanceDays >= BankruptcyDays)
            {
                S.IsBankrupt = true;
                _sim.Bus.Publish(new BankruptcyEvent { Day = day });
            }
            _sim.Bus.Publish(new DayClosedEvent { Report = report });
        }

        private Money ApplySpoilage(Store store)
        {
            var loss = Money.Zero;
            foreach (var kv in store.Inventory)
            {
                var def = Catalog.Products[kv.Key];
                if (def.ShelfLifeDays <= 0 || kv.Value.Quantity <= 0) continue;
                var spoiled = (int)Math.Floor(kv.Value.Quantity / (double)def.ShelfLifeDays);
                kv.Value.Quantity -= spoiled;
                loss += kv.Value.AvgCost * (long)spoiled;
            }
            return loss;
        }

        /// <summary>Задоволеність дня: обслуговування, наявність товару, ціни, навички персоналу.</summary>
        private double UpdateReputation(Store store)
        {
            var t = store.Today;
            var visitors = t.Customers + t.Lost;
            if (visitors == 0) return store.Reputation;
            var servedRatio = t.Customers / (double)visitors;
            var wanted = t.UnitsSold + t.UnitsMissed;
            var availability = wanted == 0 ? 1.0 : t.UnitsSold / (double)wanted;
            var fairness = t.PriceFairnessN == 0 ? 0.5 : t.PriceFairnessSum / t.PriceFairnessN;
            var staff = S.StaffOf(store.Id);
            var skill = 0.0;
            foreach (var e in staff) skill += e.Skill;
            skill = staff.Count == 0 ? 0 : skill / staff.Count;
            var sat = 35 * servedRatio + 30 * availability + 20 * fairness + 15 * skill / 100.0;
            store.Reputation += (sat - store.Reputation) * 0.15;
            return sat;
        }
    }
}
