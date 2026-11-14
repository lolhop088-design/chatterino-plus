using System;
using System.Collections.Generic;
using BusinessEmpire.Core.Common;

namespace BusinessEmpire.Core.Economy
{
    [Serializable]
    public class ProductDef
    {
        public string Id;
        public string Name;
        /// <summary>Базова оптова ціна (у цінах першого дня).</summary>
        public Money BaseWholesale;
        /// <summary>Довідкова роздрібна ціна, на яку орієнтуються покупці.</summary>
        public Money BaseRetail;
        /// <summary>Еластичність попиту за ціною: наскільки різко падає купівля при подорожчанні.</summary>
        public double Elasticity;
        /// <summary>Скільки одиниць у середньому купує обслужений покупець за довідкової ціни.</summary>
        public double UnitsPerCustomer;
        /// <summary>Термін придатності в днях (0 — не псується).</summary>
        public int ShelfLifeDays;
    }

    [Serializable]
    public class StoreTypeDef
    {
        public string Id;
        public string Name;
        public string[] ProductIds;
        /// <summary>Вартість обладнання за м² (каси, полиці, кавомашини...).</summary>
        public Money EquipmentPerM2;
        /// <summary>Частка перехожих, які заходять (за довідкових цін і репутації 50).</summary>
        public double Attractiveness;
        /// <summary>Скільки покупців за годину обслуговує працівник із продуктивністю 1.</summary>
        public double CustomersPerStaffHour;
        /// <summary>Місткість складу: одиниць товару на м².</summary>
        public double StorageUnitsPerM2;
        public int DefaultOpenHour;
        public int DefaultCloseHour;
        public int MinAreaM2;
        /// <summary>Погодинний профіль попиту саме для цього типу (множник до потоку району).</summary>
        public double[] HourProfile;
    }

    /// <summary>Довідник товарів і форматів магазинів (етап 1: три формати роздрібу).</summary>
    public static class Catalog
    {
        public static readonly Dictionary<string, ProductDef> Products = new Dictionary<string, ProductDef>();
        public static readonly Dictionary<string, StoreTypeDef> StoreTypes = new Dictionary<string, StoreTypeDef>();

        private static readonly double[] GroceryHours = { 0.1, 0.05, 0, 0, 0, 0.1, 0.4, 0.9, 1.0, 0.8, 0.7, 0.8, 1.0, 0.9, 0.8, 0.9, 1.1, 1.4, 1.5, 1.3, 1.0, 0.7, 0.4, 0.2 };
        private static readonly double[] CoffeeHours = { 0, 0, 0, 0, 0, 0.1, 0.5, 1.4, 1.7, 1.3, 1.0, 0.9, 1.1, 1.0, 0.8, 0.8, 0.9, 0.8, 0.6, 0.5, 0.4, 0.3, 0.1, 0 };
        private static readonly double[] FashionHours = { 0, 0, 0, 0, 0, 0, 0, 0.1, 0.3, 0.6, 0.9, 1.1, 1.2, 1.2, 1.2, 1.3, 1.4, 1.5, 1.5, 1.3, 1.0, 0.6, 0.2, 0 };

        static Catalog()
        {
            P("bread", "Хліб", 0.55, 1.60, 1.6, 0.45, 3);
            P("milk", "Молоко", 0.65, 1.80, 1.5, 0.35, 5);
            P("veg", "Овочі (кг)", 0.90, 2.60, 1.4, 0.40, 6);
            P("snacks", "Снеки", 0.70, 2.40, 1.2, 0.30, 0);
            P("drinks", "Напої", 0.50, 1.90, 1.1, 0.40, 0);

            P("espresso", "Еспресо", 0.35, 2.40, 1.3, 0.30, 0);
            P("cappuccino", "Капучино", 0.60, 3.80, 1.3, 0.45, 0);
            P("croissant", "Круасан", 0.80, 3.00, 1.5, 0.25, 2);
            P("sandwich", "Сендвіч", 1.60, 5.50, 1.4, 0.20, 2);

            P("tshirt", "Футболка", 6.00, 19.00, 1.0, 0.35, 0);
            P("jeans", "Джинси", 17.00, 52.00, 1.0, 0.20, 0);
            P("jacket", "Куртка", 38.00, 115.00, 0.9, 0.08, 0);
            P("acc", "Аксесуари", 2.50, 11.00, 1.1, 0.30, 0);

            StoreTypes["minimarket"] = new StoreTypeDef
            {
                Id = "minimarket", Name = "Мінімаркет", ProductIds = new[] { "bread", "milk", "veg", "snacks", "drinks" },
                EquipmentPerM2 = Money.FromDollars(140), Attractiveness = 0.085, CustomersPerStaffHour = 22,
                StorageUnitsPerM2 = 14, DefaultOpenHour = 7, DefaultCloseHour = 23, MinAreaM2 = 40, HourProfile = GroceryHours,
            };
            StoreTypes["coffee"] = new StoreTypeDef
            {
                Id = "coffee", Name = "Кав'ярня", ProductIds = new[] { "espresso", "cappuccino", "croissant", "sandwich" },
                EquipmentPerM2 = Money.FromDollars(190), Attractiveness = 0.082, CustomersPerStaffHour = 16,
                StorageUnitsPerM2 = 8, DefaultOpenHour = 7, DefaultCloseHour = 21, MinAreaM2 = 30, HourProfile = CoffeeHours,
            };
            StoreTypes["fashion"] = new StoreTypeDef
            {
                Id = "fashion", Name = "Магазин одягу", ProductIds = new[] { "tshirt", "jeans", "jacket", "acc" },
                EquipmentPerM2 = Money.FromDollars(230), Attractiveness = 0.012, CustomersPerStaffHour = 7,
                StorageUnitsPerM2 = 6, DefaultOpenHour = 10, DefaultCloseHour = 21, MinAreaM2 = 60, HourProfile = FashionHours,
            };
        }

        private static void P(string id, string name, double wholesale, double retail, double elasticity, double units, int shelf)
        {
            Products[id] = new ProductDef
            {
                Id = id, Name = name, BaseWholesale = Money.FromDollars(wholesale), BaseRetail = Money.FromDollars(retail),
                Elasticity = elasticity, UnitsPerCustomer = units, ShelfLifeDays = shelf,
            };
        }
    }
}
