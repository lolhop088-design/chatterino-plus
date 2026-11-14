using System;
using BusinessEmpire.Core.Common;
using BusinessEmpire.Core.Events;
using BusinessEmpire.Core.Finance;
using BusinessEmpire.Core.Simulation;
using BusinessEmpire.Core.Staff;

namespace BusinessEmpire.Core.Services
{
    /// <summary>Ринок праці, найм, звільнення, навчання, підвищення, зарплати й задоволеність.</summary>
    public class StaffService
    {
        public const int SeveranceHours = 24;
        public static readonly Money BaseTrainingCost = Money.FromDollars(320);

        private static readonly string[] First = { "Олена", "Андрій", "Марія", "Тарас", "Ірина", "Богдан", "Софія", "Дмитро", "Наталія", "Олег", "Юлія", "Максим", "Катерина", "Ігор", "Оксана", "Віктор", "Анна", "Роман", "Христина", "Степан", "Дарина", "Назар" };
        private static readonly string[] Last = { "Коваленко", "Шевчук", "Бондар", "Мельник", "Ткачук", "Кравець", "Олійник", "Лисенко", "Гнатюк", "Савчук", "Петренко", "Мороз", "Поліщук", "Романюк", "Зінченко", "Литвин" };

        private readonly GameSimulation _sim;
        public StaffService(GameSimulation sim) { _sim = sim; }
        private GameState S => _sim.State;

        public Money MarketWage(Role role, double skill) => Roles.MarketWage(role, skill, S.Macro);
        public Money TrainingCost => BaseTrainingCost * S.Macro.PriceLevel;

        /// <summary>Щоденне оновлення кандидатів. Що вище безробіття — то більше людей шукає роботу.</summary>
        public void RefreshCandidates()
        {
            var day = _sim.Day;
            S.Candidates.RemoveAll(c => c.ExpiresDay < day);
            var target = 5 + (int)Math.Round(S.Macro.Unemployment * 60);
            var rng = S.Rng;
            while (S.Candidates.Count < target)
            {
                var roll = rng.NextDouble();
                var role = roll < 0.7 ? Role.Cashier : roll < 0.9 ? Role.SeniorCashier : Role.StoreManager;
                var skill = Math.Round(Clamp(rng.Range(15, 60) + (int)role * 15 + rng.Gaussian() * 6, 5, 95));
                // Високе безробіття — люди погоджуються на менше.
                var ask = MarketWage(role, skill) * (1.0 + rng.Range(-0.06, 0.12) - (S.Macro.Unemployment - 0.07));
                S.Candidates.Add(new Staff.Candidate
                {
                    Id = S.NewId("C"), Name = rng.Pick(First) + " " + rng.Pick(Last), Role = role, Skill = skill,
                    AskingWage = ask, ExpiresDay = day + rng.Range(3, 7),
                });
            }
        }

        public OpResult Hire(string candidateId, string storeId)
        {
            var c = S.Candidates.Find(x => x.Id == candidateId);
            var store = S.GetStore(storeId);
            if (c == null) return OpResult.Fail("Кандидат уже недоступний.");
            if (store == null) return OpResult.Fail("Оберіть магазин.");
            if (S.StaffOf(storeId).Count >= _sim.StoresSvc.MaxStaff(store)) return OpResult.Fail("У магазині немає вільних робочих місць.");
            S.Candidates.Remove(c);
            var e = new Employee
            {
                Id = S.NewId("E"), Name = c.Name, Role = c.Role, HourlyWage = c.AskingWage, Skill = c.Skill,
                StoreId = storeId, ShiftStart = store.OpenHour, ShiftEnd = Math.Min(store.CloseHour, store.OpenHour + 8), HiredDay = _sim.Day,
            };
            // Друга зміна, якщо перша вже зайнята.
            var staff = S.StaffOf(storeId);
            if (staff.Exists(x => x.ShiftStart == e.ShiftStart) && store.CloseHour - store.OpenHour > 8)
            {
                e.ShiftEnd = store.CloseHour;
                e.ShiftStart = Math.Max(store.OpenHour, store.CloseHour - 8);
            }
            S.Employees.Add(e);
            S.Stats.EmployeesHired++;
            _sim.Notify($"Найнято {e.Name} ({Roles.Names[(int)e.Role]}) — {e.HourlyWage.Format(true)}/год.", Severity.Good);
            _sim.Changed();
            return OpResult.Success;
        }

        public OpResult Fire(string employeeId)
        {
            var e = S.GetEmployee(employeeId);
            if (e == null) return OpResult.Fail("Працівника не знайдено.");
            var sev = e.HourlyWage * (long)SeveranceHours;
            S.Account.ForceDebit(sev, TxCategory.Severance, "Вихідна допомога: " + e.Name, _sim.Day);
            S.TodayOtherExpenses += sev;
            S.Employees.Remove(e);
            _sim.Notify($"{e.Name} звільнено. Вихідна допомога {sev.Format()}.");
            _sim.Changed();
            return OpResult.Success;
        }

        public OpResult SetShift(string employeeId, int start, int end)
        {
            var e = S.GetEmployee(employeeId);
            if (e == null) return OpResult.Fail("Працівника не знайдено.");
            if (start < 0 || end > 24 || end <= start) return OpResult.Fail("Некоректна зміна.");
            if (end - start > 12) return OpResult.Fail("Зміна не може перевищувати 12 годин.");
            e.ShiftStart = start; e.ShiftEnd = end;
            _sim.Changed();
            return OpResult.Success;
        }

        public OpResult Train(string employeeId)
        {
            var e = S.GetEmployee(employeeId);
            if (e == null) return OpResult.Fail("Працівника не знайдено.");
            if (e.Skill >= 95) return OpResult.Fail("Навичка вже максимальна.");
            var cost = TrainingCost;
            if (!S.Account.TryDebit(cost, TxCategory.Training, "Навчання: " + e.Name, _sim.Day)) return OpResult.Fail($"Навчання коштує {cost.Format()}.");
            S.TodayOtherExpenses += cost;
            e.Skill = Math.Min(100, e.Skill + (100 - e.Skill) * 0.15);
            e.Motivation = Math.Min(100, e.Motivation + 6);
            _sim.Notify($"{e.Name} пройшов(-ла) навчання: навичка {e.Skill:0}.", Severity.Good);
            _sim.Changed();
            return OpResult.Success;
        }

        public OpResult Promote(string employeeId)
        {
            var e = S.GetEmployee(employeeId);
            if (e == null) return OpResult.Fail("Працівника не знайдено.");
            if (e.Role == Role.StoreManager) return OpResult.Fail("Це найвища посада в магазині.");
            var next = e.Role + 1;
            if (e.Skill < Roles.MinSkill[(int)next]) return OpResult.Fail($"Для посади «{Roles.Names[(int)next]}» потрібна навичка {Roles.MinSkill[(int)next]:0}.");
            if (next == Role.StoreManager && S.StaffOf(e.StoreId).Exists(x => x.Role == Role.StoreManager)) return OpResult.Fail("У магазині вже є керуючий.");
            e.Role = next;
            e.HourlyWage = Money.Max(e.HourlyWage * 1.2, MarketWage(next, e.Skill));
            e.Satisfaction = Math.Min(100, e.Satisfaction + 15);
            e.Motivation = Math.Min(100, e.Motivation + 12);
            _sim.Notify($"{e.Name} — тепер {Roles.Names[(int)next]} ({e.HourlyWage.Format(true)}/год).", Severity.Good);
            _sim.Changed();
            return OpResult.Success;
        }

        public OpResult Raise(string employeeId, double percent)
        {
            var e = S.GetEmployee(employeeId);
            if (e == null) return OpResult.Fail("Працівника не знайдено.");
            e.HourlyWage = e.HourlyWage * (1 + percent);
            e.Satisfaction = Math.Min(100, e.Satisfaction + percent * 120);
            _sim.Changed();
            return OpResult.Success;
        }

        /// <summary>
        /// Нарахування зарплати за день (понад 8 год — 1.5×) і оновлення задоволеності:
        /// зарплата відносно ринку, переробки. Хто 3 дні поспіль дуже незадоволений — звільняється.
        /// </summary>
        public Money PayDay(string storeId)
        {
            var total = Money.Zero;
            foreach (var e in S.StaffOf(storeId).ToArray())
            {
                var regular = Math.Min(8, e.HoursToday);
                var overtime = Math.Max(0, e.HoursToday - 8);
                var pay = e.HourlyWage * (long)regular + e.HourlyWage * (overtime * 1.5);
                total += pay;

                var ratio = e.HourlyWage.Dollars / Math.Max(0.01, MarketWage(e.Role, e.Skill).Dollars);
                var target = Clamp(55 + (ratio - 1) * 160 - overtime * 6, 0, 100);
                e.Satisfaction += (target - e.Satisfaction) * 0.2;
                e.Motivation += (e.Satisfaction - e.Motivation) * 0.15;
                e.HoursToday = 0;

                e.LowSatisfactionDays = e.Satisfaction < 25 ? e.LowSatisfactionDays + 1 : 0;
                if (e.LowSatisfactionDays >= 3)
                {
                    S.Employees.Remove(e);
                    _sim.Notify($"{e.Name} звільнився(-лась): зарплата нижча за ринкову.", Severity.Bad);
                }
            }
            return total;
        }

        private static double Clamp(double v, double a, double b) => v < a ? a : v > b ? b : v;
    }
}
