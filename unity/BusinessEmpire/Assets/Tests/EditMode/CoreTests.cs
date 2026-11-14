using System.Linq;
using BusinessEmpire.Core.Business;
using BusinessEmpire.Core.Common;
using BusinessEmpire.Core.Economy;
using BusinessEmpire.Core.Events;
using BusinessEmpire.Core.Save;
using BusinessEmpire.Core.Simulation;
using BusinessEmpire.Core.Staff;
using BusinessEmpire.Core.World;
using NUnit.Framework;

namespace BusinessEmpire.Tests
{
    internal static class TestWorld
    {
        public static GameSimulation NewSim(double cash = 60000, ulong seed = 42)
            => new GameSimulation(GameSimulation.NewGame(seed, "Тест", "Тест Груп", Money.FromDollars(cash)));

        public static Premises FreePremises(GameSimulation sim, int minArea = 60)
            => sim.State.City.Premises.First(p => p.Tenure == Tenure.Available && p.AreaM2 >= minArea);

        /// <summary>Орендує приміщення, відкриває мінімаркет і наймає двох касирів.</summary>
        public static Store OpenMinimarket(GameSimulation sim, int staff = 2)
        {
            var p = FreePremises(sim);
            Assert.IsTrue(sim.RealEstate.Rent(p.Id).Ok);
            Assert.IsTrue(sim.StoresSvc.Open(p.Id, "minimarket").Ok);
            var store = sim.State.Stores.Last();
            for (var i = 0; i < staff; i++)
            {
                var c = sim.State.Candidates.First();
                c.Skill = 50; c.AskingWage = sim.StaffSvc.MarketWage(c.Role, 50);
                Assert.IsTrue(sim.StaffSvc.Hire(c.Id, store.Id).Ok);
            }
            return store;
        }

        public static void Stock(GameSimulation sim, Store store, int qty)
        {
            foreach (var pid in store.Inventory.Keys.ToList()) store.Inventory[pid].Receive(qty, sim.State.Market.UnitPrice(pid, sim.State.Macro));
        }

        public static void AdvanceToHour(GameSimulation sim, int hour)
        {
            var now = sim.State.Clock.Now;
            var minutes = ((hour - now.Hour + 24) % 24) * 60 - now.Minute;
            if (minutes <= 0) minutes += 1440;
            sim.Advance(minutes);
        }
    }

    public class MoneyTests
    {
        [Test]
        public void Arithmetic_IsExactInCents()
        {
            var a = Money.FromDollars(0.1);
            var sum = Money.Zero;
            for (var i = 0; i < 10; i++) sum += a;
            Assert.AreEqual(100, sum.Cents);
            Assert.AreEqual(Money.FromDollars(3), Money.FromDollars(1.5) * 2L);
            Assert.AreEqual(150, (Money.FromDollars(1) * 1.5).Cents);
        }

        [Test]
        public void Format_UsesSpacesAndSign()
        {
            Assert.AreEqual("$12 345", Money.FromDollars(12345).Format());
            Assert.AreEqual("−$5.50", Money.FromDollars(-5.5).Format(true));
            Assert.AreEqual("$1.25 млн", Money.FromDollars(1250000).FormatShort());
        }
    }

    public class ClockAndEventsTests
    {
        [Test]
        public void Clock_DayIncrementsAtMidnight()
        {
            var sim = TestWorld.NewSim();
            Assert.AreEqual(1, sim.Day);
            Assert.AreEqual(6, sim.State.Clock.Hour);
            sim.Advance(18 * 60);
            Assert.AreEqual(2, sim.Day);
            Assert.AreEqual(0, sim.State.Clock.Hour);
        }

        [Test]
        public void DayClosedEvent_IsPublishedOncePerDay()
        {
            var sim = TestWorld.NewSim();
            var closed = 0;
            sim.Bus.Subscribe<DayClosedEvent>(e => closed++);
            sim.Advance(3 * 1440);
            Assert.AreEqual(3, closed);
            Assert.AreEqual(3, sim.State.Reports.Count);
        }

        [Test]
        public void EventBus_DispatchesQueuedEventsAndUnsubscribes()
        {
            var bus = new EventBus();
            var got = 0;
            System.Action<NotificationEvent> h = e => got++;
            bus.Subscribe(h);
            bus.Publish(new NotificationEvent("a"));
            Assert.AreEqual(0, got, "події доставляються лише при Dispatch");
            bus.Dispatch();
            Assert.AreEqual(1, got);
            bus.Unsubscribe(h);
            bus.Publish(new NotificationEvent("b"));
            bus.Dispatch();
            Assert.AreEqual(1, got);
        }
    }

    public class RealEstateTests
    {
        [Test]
        public void Rent_ChargesDeposit_AndReleaseRefundsIt()
        {
            var sim = TestWorld.NewSim();
            var p = TestWorld.FreePremises(sim);
            var before = sim.State.Account.Balance;
            var dep = sim.RealEstate.Deposit(p);
            Assert.IsTrue(sim.RealEstate.Rent(p.Id).Ok);
            Assert.AreEqual(before - dep, sim.State.Account.Balance);
            Assert.AreEqual(Tenure.Rented, p.Tenure);
            Assert.IsTrue(sim.RealEstate.Release(p.Id).Ok);
            Assert.AreEqual(before, sim.State.Account.Balance);
            Assert.AreEqual(Tenure.Available, p.Tenure);
        }

        [Test]
        public void Rent_FailsWithoutMoney()
        {
            var sim = TestWorld.NewSim(cash: 10);
            var p = TestWorld.FreePremises(sim);
            var r = sim.RealEstate.Rent(p.Id);
            Assert.IsFalse(r.Ok);
            Assert.AreEqual(Tenure.Available, p.Tenure);
        }

        [Test]
        public void Buy_CountsDepositTowardsPrice()
        {
            var sim = TestWorld.NewSim(cash: 500000);
            var p = TestWorld.FreePremises(sim);
            var start = sim.State.Account.Balance;
            sim.RealEstate.Rent(p.Id);
            var price = sim.RealEstate.PurchasePrice(p);
            Assert.IsTrue(sim.RealEstate.Buy(p.Id).Ok);
            Assert.AreEqual(start - price, sim.State.Account.Balance);
            Assert.AreEqual(Tenure.Owned, p.Tenure);
        }

        [Test]
        public void CompetitorPremises_CannotBeTaken()
        {
            var sim = TestWorld.NewSim(cash: 1e7);
            var p = sim.State.City.Premises.First(x => x.Tenure == Tenure.Competitor);
            Assert.IsFalse(sim.RealEstate.Rent(p.Id).Ok);
            Assert.IsFalse(sim.RealEstate.Buy(p.Id).Ok);
        }

        [Test]
        public void Release_RequiresClosingStore()
        {
            var sim = TestWorld.NewSim();
            var store = TestWorld.OpenMinimarket(sim);
            Assert.IsFalse(sim.RealEstate.Release(store.PremisesId).Ok);
        }
    }

    public class StoreTests
    {
        [Test]
        public void Open_RequiresControlledPremises_AndChargesEquipment()
        {
            var sim = TestWorld.NewSim();
            var p = TestWorld.FreePremises(sim);
            Assert.IsFalse(sim.StoresSvc.Open(p.Id, "minimarket").Ok);
            sim.RealEstate.Rent(p.Id);
            var before = sim.State.Account.Balance;
            var cost = sim.StoresSvc.EquipmentCost("minimarket", p);
            Assert.IsTrue(sim.StoresSvc.Open(p.Id, "minimarket").Ok);
            Assert.AreEqual(before - cost, sim.State.Account.Balance);
            Assert.AreEqual(1, sim.State.Stores.Count);
            Assert.IsFalse(sim.StoresSvc.Open(p.Id, "coffee").Ok, "в одному приміщенні — один магазин");
        }

        [Test]
        public void Open_RespectsMinimumArea()
        {
            var sim = TestWorld.NewSim();
            var small = sim.State.City.Premises.First(x => x.Tenure == Tenure.Available);
            small.AreaM2 = 30;
            sim.RealEstate.Rent(small.Id);
            Assert.IsFalse(sim.StoresSvc.Open(small.Id, "fashion").Ok);
        }

        [Test]
        public void Close_FiresStaffAndFreesPremises()
        {
            var sim = TestWorld.NewSim();
            var store = TestWorld.OpenMinimarket(sim);
            Assert.IsTrue(sim.StoresSvc.Close(store.Id).Ok);
            Assert.AreEqual(0, sim.State.Employees.Count);
            Assert.IsNull(sim.State.City.GetPremises(store.PremisesId).StoreId);
        }
    }

    public class PurchasingTests
    {
        [Test]
        public void Order_IsPaidNow_AndArrivesAt7NextMorning()
        {
            var sim = TestWorld.NewSim();
            var store = TestWorld.OpenMinimarket(sim);
            foreach (var pol in store.Reorder.Values) pol.Enabled = false;
            var before = sim.State.Account.Balance;
            Assert.IsTrue(sim.Purchasing.Order(store.Id, "bread", 100).Ok);
            Assert.Less(sim.State.Account.Balance.Cents, before.Cents);
            Assert.AreEqual(0, store.Inventory["bread"].Quantity);
            Assert.AreEqual(100, store.Inventory["bread"].Incoming);
            TestWorld.AdvanceToHour(sim, 6);
            Assert.AreEqual(0, store.Inventory["bread"].Quantity, "ще не доставлено");
            TestWorld.AdvanceToHour(sim, 7);
            Assert.Greater(store.Inventory["bread"].Quantity, 0);
            Assert.AreEqual(0, store.Inventory["bread"].Incoming);
        }

        [Test]
        public void Order_LandedCostIncludesDelivery()
        {
            var sim = TestWorld.NewSim();
            var store = TestWorld.OpenMinimarket(sim);
            sim.Purchasing.Order(store.Id, "snacks", 50);
            var order = sim.State.Orders.Last();
            var unit = sim.State.Market.UnitPrice("snacks", sim.State.Macro);
            Assert.Greater(order.LandedUnitCost.Cents, unit.Cents);
        }

        [Test]
        public void Order_LimitedByStorageAndCash()
        {
            var sim = TestWorld.NewSim();
            var store = TestWorld.OpenMinimarket(sim);
            var cap = sim.StoresSvc.StorageCapacity(store);
            sim.Purchasing.Order(store.Id, "drinks", cap * 10);
            Assert.LessOrEqual(store.TotalStock, cap);
            sim.State.Account.Balance = Money.FromDollars(1);
            Assert.IsFalse(sim.Purchasing.Order(store.Id, "milk", 10).Ok);
        }

        [Test]
        public void BigPurchases_RaiseWholesalePrice_ThenItRecovers()
        {
            var sim = TestWorld.NewSim();
            var m = sim.State.Market;
            var p0 = m.UnitPrice("milk", sim.State.Macro);
            m.RegisterPurchase("milk", 200000);
            Assert.Greater(m.UnitPrice("milk", sim.State.Macro).Cents, p0.Cents);
            for (var i = 0; i < 60; i++) m.AdvanceDay();
            Assert.AreEqual(1.0, m.GetPressure("milk"), 0.01);
        }
    }

    public class SalesTests
    {
        [Test]
        public void NoStaff_NoSales()
        {
            var sim = TestWorld.NewSim();
            var store = TestWorld.OpenMinimarket(sim, staff: 0);
            TestWorld.Stock(sim, store, 200);
            sim.Advance(10 * 60);
            Assert.AreEqual(0, store.Today.UnitsSold);
            Assert.Greater(store.Today.Lost, 0);
        }

        [Test]
        public void Sales_ReduceStock_AndRevenueMatchesPrices()
        {
            var sim = TestWorld.NewSim();
            var store = TestWorld.OpenMinimarket(sim);
            TestWorld.Stock(sim, store, 300);
            var balance0 = sim.State.Account.Balance;
            sim.Advance(6 * 60);
            var t = store.Today;
            Assert.Greater(t.UnitsSold, 0);
            var expected = Money.Zero;
            foreach (var kv in t.SoldByProduct) expected += store.Prices[kv.Key] * (long)kv.Value;
            Assert.AreEqual(expected, t.Revenue);
            Assert.AreEqual(balance0 + t.Revenue, sim.State.Account.Balance);
            Assert.AreEqual(300 * 5 - t.UnitsSold, store.Inventory.Values.Sum(i => i.Quantity));
        }

        [Test]
        public void HigherPrice_SellsFewerUnits()
        {
            int Sold(double priceMult)
            {
                var sim = TestWorld.NewSim();
                var store = TestWorld.OpenMinimarket(sim, staff: 3);
                TestWorld.Stock(sim, store, 1000);
                foreach (var pid in store.Prices.Keys.ToList()) store.Prices[pid] = store.Prices[pid] * priceMult;
                sim.Advance(12 * 60);
                return store.Today.UnitsSold;
            }
            Assert.Greater(Sold(0.9), Sold(1.0));
            Assert.Greater(Sold(1.0), Sold(1.3));
        }

        [Test]
        public void EmptyShelves_CountMissedSales()
        {
            var sim = TestWorld.NewSim();
            var store = TestWorld.OpenMinimarket(sim);
            sim.Advance(8 * 60);
            Assert.AreEqual(0, store.Today.UnitsSold);
            Assert.Greater(store.Today.UnitsMissed, 0);
        }

        [Test]
        public void Simulation_IsDeterministic()
        {
            long Run()
            {
                var sim = TestWorld.NewSim(seed: 7);
                var store = TestWorld.OpenMinimarket(sim);
                TestWorld.Stock(sim, store, 200);
                sim.Advance(5 * 1440);
                return sim.State.Account.Balance.Cents;
            }
            Assert.AreEqual(Run(), Run());
        }

        [Test]
        public void MoreStaff_ServesMoreCustomersAtPeak()
        {
            int Served(int staff)
            {
                var sim = TestWorld.NewSim();
                var store = TestWorld.OpenMinimarket(sim, staff);
                TestWorld.Stock(sim, store, 1000);
                foreach (var e in sim.State.StaffOf(store.Id)) { e.ShiftStart = 7; e.ShiftEnd = 23; }
                sim.Advance(14 * 60);
                return store.Today.Customers;
            }
            Assert.GreaterOrEqual(Served(3), Served(1));
        }
    }

    public class StaffTests
    {
        [Test]
        public void Hire_RespectsMaxStaff()
        {
            var sim = TestWorld.NewSim();
            var store = TestWorld.OpenMinimarket(sim, staff: 0);
            var max = sim.StoresSvc.MaxStaff(store);
            for (var i = 0; i < max; i++) Assert.IsTrue(sim.StaffSvc.Hire(sim.State.Candidates.First().Id, store.Id).Ok);
            if (sim.State.Candidates.Count == 0) sim.StaffSvc.RefreshCandidates();
            Assert.IsFalse(sim.StaffSvc.Hire(sim.State.Candidates.First().Id, store.Id).Ok);
        }

        [Test]
        public void Payroll_PaysOvertimeAtOneAndHalf()
        {
            var sim = TestWorld.NewSim();
            var store = TestWorld.OpenMinimarket(sim, staff: 1);
            var e = sim.State.StaffOf(store.Id)[0];
            e.HoursToday = 10;
            var pay = sim.StaffSvc.PayDay(store.Id);
            Assert.AreEqual(e.HourlyWage * 8L + e.HourlyWage * 3.0, pay);
        }

        [Test]
        public void Underpaid_EmployeeEventuallyQuits()
        {
            var sim = TestWorld.NewSim();
            var store = TestWorld.OpenMinimarket(sim, staff: 1);
            var e = sim.State.StaffOf(store.Id)[0];
            e.HourlyWage = Money.FromDollars(3);
            for (var i = 0; i < 20 && sim.State.Employees.Contains(e); i++) sim.StaffSvc.PayDay(store.Id);
            Assert.IsFalse(sim.State.Employees.Contains(e));
        }

        [Test]
        public void Promote_RequiresSkill_AndRaisesWage()
        {
            var sim = TestWorld.NewSim();
            var store = TestWorld.OpenMinimarket(sim, staff: 1);
            var e = sim.State.StaffOf(store.Id)[0];
            e.Role = Role.Cashier; e.Skill = 30;
            Assert.IsFalse(sim.StaffSvc.Promote(e.Id).Ok);
            e.Skill = 60;
            var w = e.HourlyWage;
            Assert.IsTrue(sim.StaffSvc.Promote(e.Id).Ok);
            Assert.AreEqual(Role.SeniorCashier, e.Role);
            Assert.Greater(e.HourlyWage.Cents, w.Cents);
        }

        [Test]
        public void Training_CostsMoneyAndRaisesSkill()
        {
            var sim = TestWorld.NewSim();
            var store = TestWorld.OpenMinimarket(sim, staff: 1);
            var e = sim.State.StaffOf(store.Id)[0];
            var s0 = e.Skill; var b0 = sim.State.Account.Balance;
            Assert.IsTrue(sim.StaffSvc.Train(e.Id).Ok);
            Assert.Greater(e.Skill, s0);
            Assert.AreEqual(b0 - sim.StaffSvc.TrainingCost, sim.State.Account.Balance);
        }

        [Test]
        public void Candidates_ScaleWithUnemployment()
        {
            var sim = TestWorld.NewSim();
            sim.State.Candidates.Clear();
            sim.State.Macro.Unemployment = 0.02;
            sim.StaffSvc.RefreshCandidates();
            var low = sim.State.Candidates.Count;
            sim.State.Candidates.Clear();
            sim.State.Macro.Unemployment = 0.2;
            sim.StaffSvc.RefreshCandidates();
            Assert.Greater(sim.State.Candidates.Count, low);
        }
    }

    public class DayReportTests
    {
        [Test]
        public void Report_ReconcilesCashAndProfit()
        {
            var sim = TestWorld.NewSim();
            var store = TestWorld.OpenMinimarket(sim);
            TestWorld.Stock(sim, store, 150);
            sim.Advance(2 * 1440);
            var r = sim.State.Reports.Last();
            Assert.AreEqual(r.ClosingBalance - r.OpeningBalance, r.CashIn - r.CashOut, "рух грошей сходиться з балансом");
            var s = r.Stores[0];
            Assert.AreEqual(s.Revenue - s.CostOfGoods - s.Wages - s.Rent - s.Maintenance - s.Spoilage, s.OperatingProfit);
            Assert.Greater(s.Wages.Cents, 0);
            Assert.AreEqual(sim.State.City.DailyRent(sim.State.City.GetPremises(store.PremisesId), sim.State.Macro).Cents, s.Rent.Cents, 2);
        }

        [Test]
        public void ThreeDaysInDebt_MeansBankruptcy()
        {
            var sim = TestWorld.NewSim();
            var store = TestWorld.OpenMinimarket(sim);
            sim.State.Account.Balance = Money.FromDollars(-10000);
            var bankrupt = false;
            sim.Bus.Subscribe<BankruptcyEvent>(e => bankrupt = true);
            sim.Advance(4 * 1440);
            Assert.IsTrue(sim.State.IsBankrupt);
            Assert.IsTrue(bankrupt);
        }

        [Test]
        public void PerishablesSpoilOvernight()
        {
            var sim = TestWorld.NewSim();
            var store = TestWorld.OpenMinimarket(sim, staff: 0);
            foreach (var pol in store.Reorder.Values) pol.Enabled = false;
            store.Inventory["bread"].Receive(90, Money.FromDollars(0.5));
            sim.Closer.CloseDay();
            Assert.AreEqual(60, store.Inventory["bread"].Quantity);
            Assert.AreEqual(0, store.Inventory["snacks"].Quantity);
        }

        [Test]
        public void WellRunMinimarket_IsProfitableOverAMonth()
        {
            var sim = TestWorld.NewSim(cash: 40000);
            var store = TestWorld.OpenMinimarket(sim, staff: 3);
            sim.Advance(31 * 1440);
            var last = sim.State.Reports.Skip(3).ToList();
            var profit = Money.Zero;
            foreach (var r in last) profit += r.NetProfit;
            Assert.Greater(profit.Cents, 0, "стандартний мінімаркет із 3 продавцями має окуповуватись");
            Assert.IsFalse(sim.State.IsBankrupt);
        }
    }

    public class MacroTests
    {
        [Test]
        public void PositiveInflation_RaisesPrices()
        {
            var m = new MacroEconomy { Inflation = 0.05 };
            var rng = new DeterministicRandom(1);
            for (var d = 1; d <= 365; d++) m.AdvanceDay(d, rng);
            Assert.Greater(m.PriceLevel, 1.02);
        }

        [Test]
        public void CentralBank_RaisesRateWhenInflationHigh()
        {
            var m = new MacroEconomy { Inflation = 0.15, KeyRate = 0.05 };
            var rng = new DeterministicRandom(1);
            for (var d = 1; d <= 90; d++) m.AdvanceDay(d, rng);
            Assert.Greater(m.KeyRate, 0.05);
        }
    }

    public class SaveTests
    {
        [Test]
        public void SaveLoad_RoundTripsState()
        {
            var sim = TestWorld.NewSim();
            var store = TestWorld.OpenMinimarket(sim);
            TestWorld.Stock(sim, store, 120);
            sim.Advance(1500);
            var storage = new InMemoryStorage();
            var svc = new SaveService(storage);
            svc.Save(sim.State);
            var res = svc.Load();
            Assert.IsTrue(res.Ok, string.Join("; ", res.Problems));
            var s2 = res.State;
            Assert.AreEqual(sim.State.Account.Balance, s2.Account.Balance);
            Assert.AreEqual(sim.State.Clock.TotalMinutes, s2.Clock.TotalMinutes);
            Assert.AreEqual(sim.State.Rng.State, s2.Rng.State);
            Assert.AreEqual(store.Inventory["bread"].Quantity, s2.Stores[0].Inventory["bread"].Quantity);
            Assert.AreEqual(sim.State.Employees.Count, s2.Employees.Count);
            Assert.AreEqual(Tenure.Rented, s2.City.GetPremises(store.PremisesId).Tenure);
            Assert.AreEqual(SaveService.Serialize(sim.State), SaveService.Serialize(s2));
        }

        [Test]
        public void LoadedGame_ContinuesIdentically()
        {
            var sim = TestWorld.NewSim(seed: 99);
            var store = TestWorld.OpenMinimarket(sim);
            sim.Advance(2000);
            var copy = new GameSimulation(SaveService.Deserialize(SaveService.Serialize(sim.State)));
            sim.Advance(3000);
            copy.Advance(3000);
            Assert.AreEqual(sim.State.Account.Balance, copy.State.Account.Balance);
        }

        [Test]
        public void CorruptedMainSave_FallsBackToBackup()
        {
            var storage = new InMemoryStorage();
            var svc = new SaveService(storage);
            var sim = TestWorld.NewSim();
            svc.Save(sim.State);
            sim.Advance(600);
            svc.Save(sim.State);
            storage.Files["main.sav"] = storage.Files["main.sav"].Replace("Payload", "Paylaod");
            var res = svc.Load();
            Assert.IsTrue(res.Ok);
            Assert.AreEqual("main.bak1", res.LoadedFrom);
            Assert.IsNotEmpty(res.Problems);
        }

        [Test]
        public void TamperedPayload_FailsChecksum()
        {
            var storage = new InMemoryStorage();
            var svc = new SaveService(storage);
            svc.Save(TestWorld.NewSim().State);
            var text = storage.Files["main.sav"];
            Assert.IsNotNull(SaveService.Validate(text));
            var tampered = text.Replace("\\\"Cents\\\":", "\\\"Cents\\\":9");
            Assert.IsNull(SaveService.Validate(tampered));
        }

        [Test]
        public void Rotation_KeepsTwoBackups()
        {
            var storage = new InMemoryStorage();
            var svc = new SaveService(storage);
            var sim = TestWorld.NewSim();
            for (var i = 0; i < 5; i++) { sim.Advance(60); svc.Save(sim.State); }
            Assert.IsTrue(storage.Exists("main.sav"));
            Assert.IsTrue(storage.Exists("main.bak1"));
            Assert.IsTrue(storage.Exists("main.bak2"));
            Assert.IsFalse(storage.Exists("main.bak3"));
            Assert.AreEqual(3, svc.ListVersions().Count(v => v.Valid));
        }
    }
}
