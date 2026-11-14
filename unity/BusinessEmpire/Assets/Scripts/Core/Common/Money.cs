using System;
using System.Globalization;

namespace BusinessEmpire.Core.Common
{
    /// <summary>
    /// Гроші у центах (long) — без похибок плаваючої коми в обліку.
    /// </summary>
    [Serializable]
    public struct Money : IEquatable<Money>, IComparable<Money>
    {
        public long Cents;

        public Money(long cents) { Cents = cents; }

        public static readonly Money Zero = new Money(0);

        public static Money FromDollars(double dollars) => new Money((long)Math.Round(dollars * 100.0, MidpointRounding.AwayFromZero));
        public double Dollars => Cents / 100.0;
        public bool IsNegative => Cents < 0;

        public static Money operator +(Money a, Money b) => new Money(a.Cents + b.Cents);
        public static Money operator -(Money a, Money b) => new Money(a.Cents - b.Cents);
        public static Money operator -(Money a) => new Money(-a.Cents);
        public static Money operator *(Money a, double k) => new Money((long)Math.Round(a.Cents * k, MidpointRounding.AwayFromZero));
        public static Money operator *(Money a, long k) => new Money(a.Cents * k);
        public static Money operator /(Money a, double k) => new Money((long)Math.Round(a.Cents / k, MidpointRounding.AwayFromZero));
        public static bool operator >(Money a, Money b) => a.Cents > b.Cents;
        public static bool operator <(Money a, Money b) => a.Cents < b.Cents;
        public static bool operator >=(Money a, Money b) => a.Cents >= b.Cents;
        public static bool operator <=(Money a, Money b) => a.Cents <= b.Cents;
        public static bool operator ==(Money a, Money b) => a.Cents == b.Cents;
        public static bool operator !=(Money a, Money b) => a.Cents != b.Cents;

        public static Money Max(Money a, Money b) => a.Cents >= b.Cents ? a : b;
        public static Money Min(Money a, Money b) => a.Cents <= b.Cents ? a : b;

        public bool Equals(Money other) => Cents == other.Cents;
        public override bool Equals(object obj) => obj is Money m && m.Cents == Cents;
        public override int GetHashCode() => Cents.GetHashCode();
        public int CompareTo(Money other) => Cents.CompareTo(other.Cents);

        /// <summary>Формат «$12 345» або «−$12 345.67».</summary>
        public string Format(bool withCents = false)
        {
            var nfi = new NumberFormatInfo { NumberGroupSeparator = " ", NumberDecimalSeparator = "." };
            var abs = Math.Abs(Cents) / 100.0;
            var s = abs.ToString(withCents ? "#,0.00" : "#,0", nfi);
            return (Cents < 0 ? "−$" : "$") + s;
        }

        /// <summary>Компактний формат: $1.25 млн, $12.4 тис.</summary>
        public string FormatShort()
        {
            var v = Math.Abs(Dollars);
            var sign = Cents < 0 ? "−" : "";
            if (v >= 1e9) return sign + "$" + (v / 1e9).ToString("0.00", CultureInfo.InvariantCulture) + " млрд";
            if (v >= 1e6) return sign + "$" + (v / 1e6).ToString("0.00", CultureInfo.InvariantCulture) + " млн";
            if (v >= 1e4) return sign + "$" + (v / 1e3).ToString("0.0", CultureInfo.InvariantCulture) + " тис";
            return Format();
        }

        public override string ToString() => Format(true);
    }
}
