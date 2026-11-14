using System;
using BusinessEmpire.Core.Business;
using BusinessEmpire.Core.Common;
using BusinessEmpire.Core.Economy;
using BusinessEmpire.Core.Finance;
using BusinessEmpire.Core.Simulation;
using BusinessEmpire.Core.Staff;
using BusinessEmpire.Core.World;

namespace BusinessEmpire.Core.Services
{
    /// <summary>
    /// Модель продажів. Повністю детермінована: очікувана кількість покупців і покупок
    /// рахується формулою, дробові частини накопичуються між годинами (без кидання кубиків).
    ///
    /// Покупці/год = потік району × профіль години × частка, що заходить (формат) × розмір × місце
    ///             × ціновий фактор × репутація × купівельна спроможність × впевненість × конкуренція.
    /// Обслуговано = мін(покупці, пропускна здатність персоналу).
    /// Продано товару = обслуговані × одиниць на покупця × імовірність купити за ціною, але не більше залишку.
    /// </summary>
    public class SalesModel
    {
        private readonly GameSimulation _sim;
        public SalesModel(GameSimulation sim) { _sim = sim; }
        private GameState S => _sim.State;

        /// <summary>Імовірність купівлі за ціною відносно довідкової: 1 при рівній, вище — експоненційно падає.</summary>
        public static double BuyProbability(double priceRatio, double elasticity) => Math.Min(1.4, Math.Exp(-elasticity * (priceRatio - 1.0)));

        public int Competitors(Store store)
        {
            var p = S.City.GetPremises(store.PremisesId);
            var n = 0;
            foreach (var other in S.City.Premises)
            {
                if (other == p || other.DistrictId != p.DistrictId) continue;
                if (other.Tenure == Tenure.Competitor && other.CompetitorTypeId == store.TypeId) n++;
                else if (other.StoreId != null && other.StoreId != store.Id && S.GetStore(other.StoreId)?.TypeId == store.TypeId) n++;
            }
            return n;
        }

        public double PriceFactor(Store store)
        {
            var T = Catalog.StoreTypes[store.TypeId];
            double sum = 0, w = 0;
            foreach (var pid in T.ProductIds)
            {
                var def = Catalog.Products[pid];
                var ratio = store.Prices[pid].Dollars / S.Market.ReferenceRetail(pid, S.Macro).Dollars;
                // Ціни відлякують відвідувачів слабше, ніж окремі покупки (людина заходить по кілька товарів).
                sum += def.UnitsPerCustomer * Math.Exp(-0.5 * def.Elasticity * (ratio - 1.0));
                w += def.UnitsPerCustomer;
            }
            return Math.Min(1.3, sum / w);
        }

        public double ExpectedCustomers(Store store, int hour)
        {
            var T = Catalog.StoreTypes[store.TypeId];
            var p = S.City.GetPremises(store.PremisesId);
            var d = S.City.GetDistrict(p.DistrictId);
            var traffic = d.PeakFootTraffic * d.Traffic[hour] * (S.Clock.IsWeekend ? d.WeekendFactor : 1.0);
            var size = Math.Sqrt(p.AreaM2 / 60.0);
            var reputation = 0.6 + 0.8 * store.Reputation / 100.0;
            var competition = 1.0 / (1.0 + 0.35 * Competitors(store));
            return traffic * T.HourProfile[hour] * T.Attractiveness * size * p.LocationFactor * PriceFactor(store)
                   * reputation * S.Macro.PurchasingPower * S.Macro.Confidence * competition;
        }

        public double Capacity(Store store, int hour)
        {
            var T = Catalog.StoreTypes[store.TypeId];
            var staff = S.StaffOf(store.Id);
            var managerBonus = staff.Exists(e => e.Role == Role.StoreManager && e.WorksAt(hour)) ? 1.1 : 1.0;
            double cap = 0;
            foreach (var e in staff) if (e.WorksAt(hour)) cap += T.CustomersPerStaffHour * e.Productivity;
            return cap * managerBonus;
        }

        public void SimulateHour(Store store, int hour)
        {
            if (!store.IsOpenAt(hour)) return;
            var staffNow = S.StaffOf(store.Id).FindAll(e => e.WorksAt(hour));
            foreach (var e in staffNow) { e.HoursToday++; e.ExperienceHours++; e.Skill = Math.Min(100, e.Skill + (100 - e.Skill) * 0.0012); }

            var expected = ExpectedCustomers(store, hour) + store.CustomerCarry;
            var customers = (int)Math.Floor(expected);
            store.CustomerCarry = expected - customers;
            var served = Math.Min(customers, (int)Math.Floor(Capacity(store, hour)));
            var t = store.Today;
            t.Customers += served;
            t.Lost += customers - served;
            if (served <= 0) return;

            var T = Catalog.StoreTypes[store.TypeId];
            var revenue = Money.Zero;
            var cogs = Money.Zero;
            foreach (var pid in T.ProductIds)
            {
                var def = Catalog.Products[pid];
                var price = store.Prices[pid];
                var ratio = price.Dollars / S.Market.ReferenceRetail(pid, S.Macro).Dollars;
                var want = served * def.UnitsPerCustomer * BuyProbability(ratio, def.Elasticity);
                store.ProductCarry.TryGetValue(pid, out var carry);
                want += carry;
                var units = (int)Math.Floor(want);
                store.ProductCarry[pid] = want - units;
                var item = store.Inventory[pid];
                var sold = Math.Min(units, item.Quantity);
                item.Quantity -= sold;
                revenue += price * (long)sold;
                cogs += item.AvgCost * (long)sold;
                t.UnitsSold += sold;
                t.UnitsMissed += units - sold;
                t.SoldByProduct.TryGetValue(pid, out var sb); t.SoldByProduct[pid] = sb + sold;
                t.MissedByProduct.TryGetValue(pid, out var mb); t.MissedByProduct[pid] = mb + (units - sold);
                t.PriceFairnessSum += Math.Max(0, Math.Min(1, 1 - (ratio - 1) * 1.5));
                t.PriceFairnessN++;
            }
            t.Revenue += revenue;
            t.CostOfGoods += cogs;
            S.Account.Credit(revenue, TxCategory.Sales, "Виручка магазинів", _sim.Day);
        }
    }
}
