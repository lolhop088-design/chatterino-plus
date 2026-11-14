using System;

namespace BusinessEmpire.Core.Time
{
    /// <summary>
    /// Ігровий годинник. Рахує хвилини від старту; календар — звичайний DateTime.
    /// Не залежить від частоти кадрів: симуляція отримує цілі хвилини від раннера.
    /// </summary>
    [Serializable]
    public class GameClock
    {
        public DateTime StartDate = new DateTime(2032, 1, 5, 6, 0, 0);
        public long TotalMinutes;

        public DateTime Now => StartDate.AddMinutes(TotalMinutes);
        public int Hour => Now.Hour;
        public int Minute => Now.Minute;
        /// <summary>Номер ігрового дня, починаючи з 1.</summary>
        public int Day => (int)((StartDate.TimeOfDay.TotalMinutes + TotalMinutes) / 1440) + 1;
        public bool IsWeekend => Now.DayOfWeek == DayOfWeek.Saturday || Now.DayOfWeek == DayOfWeek.Sunday;

        public static readonly string[] WeekdaysUa = { "Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб" };
        public static readonly string[] MonthsUa = { "січ", "лют", "бер", "кві", "тра", "чер", "лип", "сер", "вер", "жов", "лис", "гру" };

        public string DateLabel
        {
            get { var n = Now; return $"{n.Day} {MonthsUa[n.Month - 1]} {n.Year}, {WeekdaysUa[(int)n.DayOfWeek]}"; }
        }

        public string TimeLabel => Now.ToString("HH:mm");
    }

    /// <summary>Швидкості часу: скільки ігрових хвилин минає за реальну секунду.</summary>
    public static class TimeSpeeds
    {
        public static readonly int[] MinutesPerRealSecond = { 0, 10, 60, 240 };
        public static readonly string[] Labels = { "Пауза", "×1", "×6", "×24" };
    }
}
