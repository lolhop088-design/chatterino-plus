using System;
using System.Collections.Generic;
using BusinessEmpire.Core.Common;
using BusinessEmpire.Core.Economy;

namespace BusinessEmpire.Core.World
{
    [Serializable]
    public class District
    {
        public string Id;
        public string Name;
        public int Population;
        /// <summary>Пішохідний потік повз типову вітрину в пікову годину (людей/год).</summary>
        public double PeakFootTraffic;
        /// <summary>Погодинний профіль потоку (0..1.x) для буднів.</summary>
        public double[] Traffic;
        public double WeekendFactor = 1.15;
        /// <summary>Оренда за м² на день у цінах першого дня.</summary>
        public Money RentPerM2;
        /// <summary>Ринкова ціна за м² у цінах першого дня.</summary>
        public Money PricePerM2;
        /// <summary>Рівень району 1..5 (впливає на ціни та потік).</summary>
        public int Level = 3;
    }

    public enum Tenure { Available, Rented, Owned, Competitor }

    [Serializable]
    public class Premises
    {
        public string Id;
        public string DistrictId;
        public string Address;
        public int AreaM2;
        /// <summary>Множник потоку конкретного місця: головна вулиця, кут, двір.</summary>
        public double LocationFactor = 1.0;
        public Tenure Tenure = Tenure.Available;
        public string StoreId;
        /// <summary>Для конкурентів — формат їхнього магазину.</summary>
        public string CompetitorTypeId;
        public string CompetitorName;
        public Money DepositPaid;
        public Money PurchasePricePaid;
        // Розміщення на мапі (метри): центр і габарити ділянки.
        public float X, Z, Width, Depth;
        public int Floors = 2;
        public int Facing; // 0: +Z, 1: −Z, 2: +X, 3: −X

        public bool IsControlledByPlayer => Tenure == Tenure.Rented || Tenure == Tenure.Owned;
    }

    [Serializable]
    public class City
    {
        public string Name = "Нью-Ріверсайд";
        public List<District> Districts = new List<District>();
        public List<Premises> Premises = new List<Premises>();

        public District GetDistrict(string id) => Districts.Find(d => d.Id == id);
        public Premises GetPremises(string id) => Premises.Find(p => p.Id == id);

        public Money DailyRent(Premises p, MacroEconomy macro) => GetDistrict(p.DistrictId).RentPerM2 * (p.AreaM2 * p.LocationFactor * macro.PriceLevel);
        public Money MarketValue(Premises p, MacroEconomy macro) => GetDistrict(p.DistrictId).PricePerM2 * (p.AreaM2 * p.LocationFactor * macro.PriceLevel);
    }

    /// <summary>Генерує тестовий центральний район для етапу 1 (детерміновано за сідом).</summary>
    public static class CityGenerator
    {
        private static readonly double[] CentralTraffic = { 0.08, 0.04, 0.02, 0.02, 0.03, 0.1, 0.35, 0.75, 0.95, 0.8, 0.7, 0.8, 1.0, 0.95, 0.8, 0.85, 0.95, 1.0, 0.95, 0.8, 0.6, 0.4, 0.25, 0.15 };
        private static readonly string[] Streets = { "вул. Соборна", "просп. Свободи", "вул. Театральна", "вул. Ринкова" };
        private static readonly string[] CompetitorNames = { "Волмарк Експрес", "Старбокс Кава", "Зарра", "АТВ-Маркет", "Тім Гордонс" };

        public static City CreateTestCity(DeterministicRandom rng)
        {
            var city = new City();
            city.Districts.Add(new District
            {
                Id = "central", Name = "Центральний район", Population = 245000, PeakFootTraffic = 420, Traffic = CentralTraffic,
                RentPerM2 = Money.FromDollars(1.15), PricePerM2 = Money.FromDollars(1650), Level = 5,
            });

            // Два квартали по 6 ділянок обабіч проспекту (вісь X, z = 0); північний бік — жвавіший.
            var n = 0;
            for (var block = 0; block < 2; block++)
            {
                for (var i = 0; i < 6; i++)
                {
                    var front = i < 3; // перші три виходять на головну вулицю
                    var area = rng.Pick(new[] { 40, 55, 60, 80, 100, 120 });
                    var w = 12f + area / 20f;
                    var p = new Premises
                    {
                        Id = "P" + (++n),
                        DistrictId = "central",
                        Address = $"{(front ? Streets[0] : Streets[1 + block])}, {10 + n * 2}",
                        AreaM2 = area,
                        LocationFactor = front ? 1.25 : 0.85 + rng.Range(0, 0.15),
                        X = (block == 0 ? -34f : 34f) + ((i % 3) - 1) * 18f,
                        Z = front ? 13f : -13f,
                        Width = Math.Min(w, 16f),
                        Depth = 12f,
                        Floors = 2 + rng.Range(0, 4),
                        Facing = front ? 1 : 0, // обидва ряди дивляться на проспект (z = 0)
                    };
                    city.Premises.Add(p);
                }
            }

            // Конкуренти займають частину ділянок.
            var types = new[] { "minimarket", "coffee", "fashion" };
            foreach (var idx in new[] { 1, 4, 8, 10 })
            {
                var p = city.Premises[idx];
                p.Tenure = Tenure.Competitor;
                p.CompetitorTypeId = types[rng.Range(0, types.Length)];
                p.CompetitorName = rng.Pick(CompetitorNames);
            }
            return city;
        }
    }
}
