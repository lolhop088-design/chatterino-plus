using System;
using System.Collections.Generic;
using BusinessEmpire.Core.Common;

namespace BusinessEmpire.Core.Economy
{
    /// <summary>
    /// Макроекономіка міста: інфляція/дефляція, облікова ставка, безробіття, рівень цін і зарплат,
    /// купівельна спроможність. Розраховується щодня за формулами; випадковими є лише невеликі
    /// макрошоки (з детермінованого генератора гри).
    /// </summary>
    [Serializable]
    public class MacroEconomy
    {
        public double PriceLevel = 1.0;
        public double WageLevel = 1.0;
        /// <summary>Річна інфляція (0.04 = 4%). Може бути від’ємною — дефляція.</summary>
        public double Inflation = 0.04;
        public double TargetInflation = 0.03;
        /// <summary>Облікова ставка центробанку (річна).</summary>
        public double KeyRate = 0.065;
        public double Unemployment = 0.07;
        /// <summary>Споживча впевненість (1 — норма).</summary>
        public double Confidence = 1.0;
        public double TaxRate = 0.18;
        public List<MacroSnapshot> History = new List<MacroSnapshot>();

        /// <summary>Реальна купівельна спроможність домогосподарств відносно старту.</summary>
        public double PurchasingPower => WageLevel / PriceLevel * (1 - Unemployment) / (1 - 0.07);

        public void AdvanceDay(int day, DeterministicRandom rng)
        {
            // Попит розігріває інфляцію, висока ставка її гасить.
            var demandGap = (Confidence - 1.0) * 0.02 - (KeyRate - 0.06) * 0.15;
            Inflation += 0.03 * (TargetInflation - Inflation) + 0.01 * demandGap + rng.Gaussian() * 0.0006;
            Inflation = Clamp(Inflation, -0.05, 0.4);

            // Центробанк переглядає ставку раз на 30 днів за правилом Тейлора.
            if (day % 30 == 0)
            {
                var target = 0.02 + Inflation + 0.5 * (Inflation - TargetInflation) - 0.5 * (Unemployment - 0.06);
                KeyRate = Clamp(KeyRate + Clamp(target - KeyRate, -0.0075, 0.0075), 0.0, 0.35);
            }

            // Висока ставка охолоджує впевненість і підвищує безробіття.
            Confidence = Clamp(Confidence + 0.02 * (1.0 - Confidence) - (KeyRate - 0.06) * 0.004 + rng.Gaussian() * 0.004, 0.6, 1.3);
            Unemployment = Clamp(Unemployment + 0.02 * (0.06 + (1.0 - Confidence) * 0.15 - Unemployment), 0.02, 0.3);

            PriceLevel *= 1.0 + Inflation / 365.0;
            WageLevel *= 1.0 + (Inflation + (0.06 - Unemployment) * 0.5) / 365.0;

            History.Add(new MacroSnapshot { Day = day, Inflation = Inflation, KeyRate = KeyRate, Unemployment = Unemployment, PriceLevel = PriceLevel, Confidence = Confidence });
            if (History.Count > 365) History.RemoveAt(0);
        }

        private static double Clamp(double v, double a, double b) => v < a ? a : v > b ? b : v;
    }

    [Serializable]
    public class MacroSnapshot
    {
        public int Day;
        public double Inflation, KeyRate, Unemployment, PriceLevel, Confidence;
    }

    /// <summary>
    /// Оптовий ринок: ціна = база × рівень цін × тиск попиту. Великі закупівлі піднімають ціну,
    /// з часом вона повертається до рівноваги.
    /// </summary>
    [Serializable]
    public class WholesaleMarket
    {
        public Dictionary<string, double> Pressure = new Dictionary<string, double>();
        /// <summary>Обсяг ринку в доларах на день, за якого закупівля піднімає ціну на 1%.</summary>
        public double DepthDollars = 40000;

        public Money UnitPrice(string productId, MacroEconomy macro)
        {
            var p = Catalog.Products[productId];
            return p.BaseWholesale * (macro.PriceLevel * GetPressure(productId));
        }

        public Money ReferenceRetail(string productId, MacroEconomy macro) => Catalog.Products[productId].BaseRetail * macro.PriceLevel;

        public double GetPressure(string productId) => Pressure.TryGetValue(productId, out var v) ? v : 1.0;

        public void RegisterPurchase(string productId, int qty)
        {
            var p = Catalog.Products[productId];
            var value = p.BaseWholesale.Dollars * qty;
            Pressure[productId] = Math.Min(2.0, GetPressure(productId) * (1.0 + value / DepthDollars * 0.01));
        }

        public void AdvanceDay()
        {
            foreach (var id in new List<string>(Pressure.Keys)) Pressure[id] += (1.0 - Pressure[id]) * 0.15;
        }
    }
}
