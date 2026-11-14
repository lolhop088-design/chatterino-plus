using System;

namespace BusinessEmpire.Core.Common
{
    /// <summary>
    /// Детермінований генератор (xorshift64*). Стан зберігається разом із грою,
    /// тому та сама гра з тим самим сідом відтворюється однаково (важливо для тестів і збережень).
    /// Використовується лише для «світу» (імена кандидатів, макрошоки), а не для підміни розрахунку прибутку.
    /// </summary>
    [Serializable]
    public class DeterministicRandom
    {
        public ulong State;

        public DeterministicRandom() : this(0x9E3779B97F4A7C15UL) { }
        public DeterministicRandom(ulong seed) { State = seed == 0 ? 0x9E3779B97F4A7C15UL : seed; }

        public ulong NextULong()
        {
            var x = State;
            x ^= x >> 12; x ^= x << 25; x ^= x >> 27;
            State = x;
            return x * 2685821657736338717UL;
        }

        /// <summary>[0, 1)</summary>
        public double NextDouble() => (NextULong() >> 11) * (1.0 / 9007199254740992.0);
        public double Range(double min, double max) => min + (max - min) * NextDouble();
        public int Range(int minInclusive, int maxExclusive) => minInclusive + (int)(NextDouble() * (maxExclusive - minInclusive));
        public T Pick<T>(T[] items) => items[Range(0, items.Length)];

        /// <summary>Нормальний розподіл (Бокс — Мюллер).</summary>
        public double Gaussian()
        {
            var u1 = 1.0 - NextDouble();
            var u2 = NextDouble();
            return Math.Sqrt(-2.0 * Math.Log(u1)) * Math.Cos(2.0 * Math.PI * u2);
        }
    }
}
