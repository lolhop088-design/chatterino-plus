using System;
using System.Collections.Generic;
using BusinessEmpire.Core.Common;

namespace BusinessEmpire.Core.Business
{
    [Serializable]
    public class StockItem
    {
        public int Quantity;
        /// <summary>Середньозважена собівартість одиниці (з доставкою).</summary>
        public Money AvgCost;
        /// <summary>Замовлено й у дорозі.</summary>
        public int Incoming;

        public void Receive(int qty, Money unitCost)
        {
            if (qty <= 0) return;
            AvgCost = Quantity <= 0 ? unitCost : new Money((AvgCost.Cents * Quantity + unitCost.Cents * (long)qty) / (Quantity + qty));
            Quantity += qty;
        }
    }

    [Serializable]
    public class ReorderPolicy
    {
        public bool Enabled = true;
        /// <summary>Коли залишок (з урахуванням товару в дорозі) опускається до цього рівня — дозамовити.</summary>
        public int ReorderPoint;
        /// <summary>До якого рівня дозамовляти.</summary>
        public int OrderUpTo;
    }

    [Serializable]
    public class StoreDayStats
    {
        public int Customers;
        public int Lost;
        public int UnitsSold;
        public int UnitsMissed;
        public Money Revenue;
        public Money CostOfGoods;
        public Dictionary<string, int> SoldByProduct = new Dictionary<string, int>();
        public Dictionary<string, int> MissedByProduct = new Dictionary<string, int>();
        public double PriceFairnessSum;
        public int PriceFairnessN;
    }

    [Serializable]
    public class Store
    {
        public string Id;
        public string Name;
        public string TypeId;
        public string PremisesId;
        public int OpenHour;
        public int CloseHour;
        public double Reputation = 50;
        public Money EquipmentBookValue;
        public int OpenedDay;
        public Dictionary<string, StockItem> Inventory = new Dictionary<string, StockItem>();
        public Dictionary<string, Money> Prices = new Dictionary<string, Money>();
        public Dictionary<string, ReorderPolicy> Reorder = new Dictionary<string, ReorderPolicy>();
        public double CustomerCarry;
        public Dictionary<string, double> ProductCarry = new Dictionary<string, double>();
        public StoreDayStats Today = new StoreDayStats();

        public bool IsOpenAt(int hour) => hour >= OpenHour && hour < CloseHour;
        public int OpenHoursPerDay => CloseHour - OpenHour;

        public int TotalStock
        {
            get { var s = 0; foreach (var kv in Inventory) s += kv.Value.Quantity + kv.Value.Incoming; return s; }
        }

        public Money InventoryValue
        {
            get { var m = Money.Zero; foreach (var kv in Inventory) m += kv.Value.AvgCost * (long)kv.Value.Quantity; return m; }
        }
    }

    [Serializable]
    public class PurchaseOrder
    {
        public string Id;
        public string StoreId;
        public string ProductId;
        public int Quantity;
        /// <summary>Собівартість одиниці з урахуванням доставки.</summary>
        public Money LandedUnitCost;
        public long ArrivalMinute;
    }
}
