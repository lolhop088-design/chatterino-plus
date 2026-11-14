using System;
using BusinessEmpire.Core.Common;
using BusinessEmpire.Core.Economy;

namespace BusinessEmpire.Core.Staff
{
    public enum Role { Cashier = 0, SeniorCashier = 1, StoreManager = 2 }

    public static class Roles
    {
        public static readonly string[] Names = { "Касир-продавець", "Старший продавець", "Керуючий магазином" };
        /// <summary>Ринкова погодинна ставка при навичці 50 (у цінах першого дня).</summary>
        public static readonly double[] BaseWage = { 12.5, 15.5, 22.0 };
        /// <summary>Мінімальна навичка для підвищення на цю посаду.</summary>
        public static readonly double[] MinSkill = { 0, 50, 70 };

        public static Money MarketWage(Role role, double skill, MacroEconomy macro)
            => Money.FromDollars(BaseWage[(int)role] * (0.75 + skill / 100.0 * 0.5) * macro.WageLevel);
    }

    [Serializable]
    public class Employee
    {
        public string Id;
        public string Name;
        public Role Role;
        public Money HourlyWage;
        /// <summary>Навичка 0..100 — зростає з досвідом і навчанням.</summary>
        public double Skill;
        public double ExperienceHours;
        /// <summary>Мотивація 0..100 — впливає на продуктивність.</summary>
        public double Motivation = 70;
        /// <summary>Задоволеність 0..100 — від зарплати відносно ринку та переробок.</summary>
        public double Satisfaction = 70;
        public string StoreId;
        public int ShiftStart;
        public int ShiftEnd;
        public int HiredDay;
        public int HoursToday;
        public int LowSatisfactionDays;

        /// <summary>Продуктивність ≈1 для середнього вмотивованого працівника.</summary>
        public double Productivity => (0.55 + Skill / 100.0 * 0.9) * (0.6 + 0.4 * Motivation / 100.0);
        public bool WorksAt(int hour) => hour >= ShiftStart && hour < ShiftEnd;
    }

    [Serializable]
    public class Candidate
    {
        public string Id;
        public string Name;
        public Role Role;
        public double Skill;
        public Money AskingWage;
        public int ExpiresDay;
    }
}
