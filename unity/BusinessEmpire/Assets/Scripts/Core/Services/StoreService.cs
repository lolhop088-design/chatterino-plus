using System;
using BusinessEmpire.Core.Business;
using BusinessEmpire.Core.Common;
using BusinessEmpire.Core.Economy;
using BusinessEmpire.Core.Events;
using BusinessEmpire.Core.Finance;
using BusinessEmpire.Core.Simulation;
using BusinessEmpire.Core.World;

namespace BusinessEmpire.Core.Services
{
    /// <summary>Відкриття, налаштування й закриття магазинів.</summary>
    public class StoreService
    {
        private readonly GameSimulation _sim;
        public StoreService(GameSimulation sim) { _sim = sim; }
        private GameState S => _sim.State;

        public Money EquipmentCost(string typeId, Premises p) => Catalog.StoreTypes[typeId].EquipmentPerM2 * (p.AreaM2 * S.Macro.PriceLevel);
        public int StorageCapacity(Store s) => (int)(Catalog.StoreTypes[s.TypeId].StorageUnitsPerM2 * S.City.GetPremises(s.PremisesId).AreaM2);
        public int MaxStaff(Store s) => Math.Max(2, S.City.GetPremises(s.PremisesId).AreaM2 / 20);

        public OpResult Open(string premisesId, string typeId, string name = null)
        {
            var p = S.City.GetPremises(premisesId);
            if (p == null || !p.IsControlledByPlayer) return OpResult.Fail("Спершу орендуйте або купіть приміщення.");
            if (p.StoreId != null) return OpResult.Fail("У приміщенні вже працює магазин.");
            if (!Catalog.StoreTypes.TryGetValue(typeId, out var T)) return OpResult.Fail("Невідомий формат.");
            if (p.AreaM2 < T.MinAreaM2) return OpResult.Fail($"Для формату «{T.Name}» потрібно від {T.MinAreaM2} м².");
            var cost = EquipmentCost(typeId, p);
            if (!S.Account.TryDebit(cost, TxCategory.Equipment, "Обладнання: " + T.Name, _sim.Day))
                return OpResult.Fail($"Обладнання коштує {cost.Format()}.");

            var store = new Store
            {
                Id = S.NewId("S"), Name = name ?? $"{T.Name} на {p.Address.Split(',')[0].Replace("вул. ", "").Replace("просп. ", "")}",
                TypeId = typeId, PremisesId = p.Id, OpenHour = T.DefaultOpenHour, CloseHour = T.DefaultCloseHour,
                EquipmentBookValue = cost, OpenedDay = _sim.Day,
            };
            var cap = (int)(T.StorageUnitsPerM2 * p.AreaM2);
            var totalUnits = 0.0;
            foreach (var pid in T.ProductIds) totalUnits += Catalog.Products[pid].UnitsPerCustomer;
            foreach (var pid in T.ProductIds)
            {
                var share = Catalog.Products[pid].UnitsPerCustomer / totalUnits;
                store.Inventory[pid] = new StockItem { AvgCost = S.Market.UnitPrice(pid, S.Macro) };
                store.Prices[pid] = S.Market.ReferenceRetail(pid, S.Macro);
                var upTo = (int)(cap * share * 0.6);
                store.Reorder[pid] = new ReorderPolicy { Enabled = true, OrderUpTo = upTo, ReorderPoint = upTo / 3 };
            }
            p.StoreId = store.Id;
            S.Stores.Add(store);
            S.Stats.StoresOpened++;
            _sim.Notify($"Відкрито «{store.Name}». Найміть персонал і закупіть товар.", Severity.Good);
            _sim.Changed();
            return OpResult.Success;
        }

        public OpResult SetPrice(string storeId, string productId, Money price)
        {
            var s = S.GetStore(storeId);
            if (s == null || !s.Prices.ContainsKey(productId)) return OpResult.Fail("Товар не знайдено.");
            if (price.Cents < 1) return OpResult.Fail("Ціна має бути додатною.");
            s.Prices[productId] = price;
            _sim.Changed();
            return OpResult.Success;
        }

        public OpResult SetHours(string storeId, int open, int close)
        {
            var s = S.GetStore(storeId);
            if (s == null) return OpResult.Fail("Магазин не знайдено.");
            if (open < 0 || close > 24 || open >= close) return OpResult.Fail("Некоректний графік.");
            s.OpenHour = open; s.CloseHour = close;
            foreach (var e in S.StaffOf(storeId)) { e.ShiftStart = Math.Max(open, e.ShiftStart); e.ShiftEnd = Math.Min(close, e.ShiftEnd); if (e.ShiftStart >= e.ShiftEnd) { e.ShiftStart = open; e.ShiftEnd = Math.Min(close, open + 8); } }
            _sim.Changed();
            return OpResult.Success;
        }

        /// <summary>Закрити магазин: обладнання продається за 40% балансової вартості, товар — за 50% собівартості, персонал звільняється з вихідною допомогою.</summary>
        public OpResult Close(string storeId)
        {
            var s = S.GetStore(storeId);
            if (s == null) return OpResult.Fail("Магазин не знайдено.");
            foreach (var e in S.StaffOf(storeId).ToArray()) _sim.StaffSvc.Fire(e.Id);
            S.Orders.RemoveAll(o => o.StoreId == storeId);
            var salvage = s.EquipmentBookValue * 0.4 + s.InventoryValue * 0.5;
            S.Account.Credit(salvage, TxCategory.EquipmentSale, "Ліквідація " + s.Name, _sim.Day);
            S.City.GetPremises(s.PremisesId).StoreId = null;
            S.Stores.Remove(s);
            _sim.Notify($"«{s.Name}» закрито. Виручено {salvage.Format()} за обладнання й залишки.", Severity.Warning);
            _sim.Changed();
            return OpResult.Success;
        }
    }
}
