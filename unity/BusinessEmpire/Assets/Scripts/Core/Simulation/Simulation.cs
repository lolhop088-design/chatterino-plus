using System;
using BusinessEmpire.Core.Common;
using BusinessEmpire.Core.Events;
using BusinessEmpire.Core.Services;
using BusinessEmpire.Core.World;

namespace BusinessEmpire.Core.Simulation
{
    /// <summary>Результат дії гравця: успіх або зрозуміла причина відмови.</summary>
    public struct OpResult
    {
        public bool Ok;
        public string Error;
        public static OpResult Success => new OpResult { Ok = true };
        public static OpResult Fail(string error) => new OpResult { Ok = false, Error = error };
    }

    /// <summary>
    /// Оркестратор симуляції. Час рухається цілими ігровими хвилинами незалежно від кадрів;
    /// продажі рахуються щогодини, а дорогі розрахунки (зарплати, оренда, макроекономіка,
    /// звіт) — раз на добу о 00:00.
    /// </summary>
    public class GameSimulation
    {
        public GameState State { get; private set; }
        public EventBus Bus { get; } = new EventBus();

        public RealEstateService RealEstate { get; }
        public StoreService StoresSvc { get; }
        public PurchasingService Purchasing { get; }
        public StaffService StaffSvc { get; }
        public SalesModel Sales { get; }
        public DayCloser Closer { get; }

        public int Day => State.Clock.Day;

        public GameSimulation(GameState state)
        {
            State = state;
            RealEstate = new RealEstateService(this);
            StoresSvc = new StoreService(this);
            Purchasing = new PurchasingService(this);
            StaffSvc = new StaffService(this);
            Sales = new SalesModel(this);
            Closer = new DayCloser(this);
        }

        public static GameState NewGame(ulong seed, string playerName, string companyName, Money startingCash)
        {
            var s = new GameState { Seed = seed, Rng = new DeterministicRandom(seed), PlayerName = playerName, CompanyName = companyName };
            s.City = CityGenerator.CreateTestCity(s.Rng);
            s.Account.Credit(startingCash, Finance.TxCategory.Other, "Особисті заощадження", 1);
            s.DayOpeningBalance = s.Account.Balance;
            var sim = new GameSimulation(s);
            sim.StaffSvc.RefreshCandidates();
            return s;
        }

        /// <summary>Просуває час на задану кількість ігрових хвилин.</summary>
        public void Advance(long minutes)
        {
            if (State.IsBankrupt) return;
            for (long i = 0; i < minutes; i++)
            {
                State.Clock.TotalMinutes++;
                var now = State.Clock.Now;
                if (now.Minute != 0) continue;
                if (now.Hour == 0) Closer.CloseDay();
                if (State.IsBankrupt) break;
                OnHourStart(now.Hour);
            }
            Bus.Dispatch();
        }

        /// <summary>Початок години: прийом поставок і продажі за цю годину.</summary>
        private void OnHourStart(int hour)
        {
            Purchasing.ProcessDeliveries();
            foreach (var store in State.Stores) Sales.SimulateHour(store, hour);
            Bus.Publish(new HourPassedEvent { Hour = hour });
        }

        public void Notify(string msg, Severity sev = Severity.Info) => Bus.Publish(new NotificationEvent(msg, sev));
        public void Changed() => Bus.Publish(new StateChangedEvent());
    }
}
