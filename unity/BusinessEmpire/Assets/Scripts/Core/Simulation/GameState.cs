using System;
using System.Collections.Generic;
using BusinessEmpire.Core.Business;
using BusinessEmpire.Core.Common;
using BusinessEmpire.Core.Economy;
using BusinessEmpire.Core.Finance;
using BusinessEmpire.Core.Staff;
using BusinessEmpire.Core.Time;
using BusinessEmpire.Core.World;

namespace BusinessEmpire.Core.Simulation
{
    [Serializable]
    public class LifetimeStats
    {
        public Money Revenue;
        public Money NetProfit;
        public int Customers;
        public int StoresOpened;
        public int EmployeesHired;
        public Money BestDayProfit;
    }

    [Serializable]
    public class GameSettings
    {
        /// <summary>0 — низька, 1 — середня, 2 — висока якість графіки.</summary>
        public int GraphicsQuality = 1;
        public int MaxPedestrians = 120;
        public bool ShowFps;
    }

    /// <summary>Увесь стан гри, що зберігається. Лише дані — логіка в сервісах симуляції.</summary>
    [Serializable]
    public class GameState
    {
        public const int CurrentVersion = 1;
        public int Version = CurrentVersion;
        public string PlayerName = "Олександр Коваль";
        public string CompanyName = "Коваль Груп";
        public ulong Seed;
        public DeterministicRandom Rng = new DeterministicRandom();
        public GameClock Clock = new GameClock();
        public MacroEconomy Macro = new MacroEconomy();
        public WholesaleMarket Market = new WholesaleMarket();
        public BankAccount Account = new BankAccount();
        public City City = new City();
        public List<Store> Stores = new List<Store>();
        public List<Employee> Employees = new List<Employee>();
        public List<Candidate> Candidates = new List<Candidate>();
        public List<PurchaseOrder> Orders = new List<PurchaseOrder>();
        public List<DailyReport> Reports = new List<DailyReport>();
        public LifetimeStats Stats = new LifetimeStats();
        public GameSettings Settings = new GameSettings();
        public Money TodayOtherExpenses;
        public Money DayOpeningBalance;
        public int NegativeBalanceDays;
        public bool IsBankrupt;
        public long NextId = 1;

        public string NewId(string prefix) => prefix + (NextId++);
        public Store GetStore(string id) => Stores.Find(s => s.Id == id);
        public Employee GetEmployee(string id) => Employees.Find(e => e.Id == id);
        public List<Employee> StaffOf(string storeId) => Employees.FindAll(e => e.StoreId == storeId);
    }
}
