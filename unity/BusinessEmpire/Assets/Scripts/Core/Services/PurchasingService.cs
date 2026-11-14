using System;
using BusinessEmpire.Core.Business;
using BusinessEmpire.Core.Common;
using BusinessEmpire.Core.Economy;
using BusinessEmpire.Core.Events;
using BusinessEmpire.Core.Finance;
using BusinessEmpire.Core.Simulation;

namespace BusinessEmpire.Core.Services
{
    /// <summary>
    /// Закупівлі в оптовика. Оплата одразу, поставка о 07:00 (сьогодні, якщо замовлено до 05:00,
    /// інакше — завтра). Доставка коштує фіксовано + 2% від суми й входить у собівартість.
    /// </summary>
    public class PurchasingService
    {
        public const int DeliveryHour = 7;
        public static readonly Money BaseDeliveryFee = Money.FromDollars(15);

        private readonly GameSimulation _sim;
        public PurchasingService(GameSimulation sim) { _sim = sim; }
        private GameState S => _sim.State;

        public Money DeliveryFee(Money goods) => BaseDeliveryFee * S.Macro.PriceLevel + goods * 0.02;

        public int FreeSpace(Store s) => _sim.StoresSvc.StorageCapacity(s) - s.TotalStock;

        public long NextDeliveryMinute()
        {
            var now = S.Clock.Now;
            var target = now.Date.AddHours(DeliveryHour);
            if (now.Hour >= DeliveryHour - 2) target = target.AddDays(1);
            return (long)(target - S.Clock.StartDate).TotalMinutes;
        }

        public OpResult Order(string storeId, string productId, int qty, bool silent = false)
        {
            var s = S.GetStore(storeId);
            if (s == null || !s.Inventory.ContainsKey(productId)) return OpResult.Fail("Товар не знайдено.");
            qty = Math.Min(qty, FreeSpace(s));
            if (qty <= 0) return OpResult.Fail("Склад заповнений.");
            var unit = S.Market.UnitPrice(productId, S.Macro);
            var goods = unit * (long)qty;
            var total = goods + DeliveryFee(goods);
            if (!S.Account.TryDebit(total, TxCategory.Purchases, "Закупівля товару", _sim.Day))
                return OpResult.Fail($"Недостатньо коштів: потрібно {total.Format()}.");
            S.Market.RegisterPurchase(productId, qty);
            s.Inventory[productId].Incoming += qty;
            S.Orders.Add(new PurchaseOrder
            {
                Id = S.NewId("O"), StoreId = storeId, ProductId = productId, Quantity = qty,
                LandedUnitCost = total / qty, ArrivalMinute = NextDeliveryMinute(),
            });
            if (!silent) _sim.Notify($"Замовлено {qty} × {Catalog.Products[productId].Name} на {total.Format()}. Поставка о 07:00.");
            _sim.Changed();
            return OpResult.Success;
        }

        public void ProcessDeliveries()
        {
            var now = S.Clock.TotalMinutes;
            for (var i = S.Orders.Count - 1; i >= 0; i--)
            {
                var o = S.Orders[i];
                if (o.ArrivalMinute > now) continue;
                S.Orders.RemoveAt(i);
                var s = S.GetStore(o.StoreId);
                if (s == null) continue;
                var item = s.Inventory[o.ProductId];
                item.Incoming = Math.Max(0, item.Incoming - o.Quantity);
                item.Receive(o.Quantity, o.LandedUnitCost);
            }
        }

        /// <summary>Автозамовлення за політикою (точка дозамовлення → рівень поповнення).</summary>
        public void RunAutoReorder()
        {
            foreach (var s in S.Stores)
            {
                var failed = false;
                foreach (var kv in s.Reorder)
                {
                    var pol = kv.Value;
                    if (!pol.Enabled) continue;
                    var item = s.Inventory[kv.Key];
                    var position = item.Quantity + item.Incoming;
                    if (position > pol.ReorderPoint) continue;
                    var r = Order(s.Id, kv.Key, pol.OrderUpTo - position, true);
                    if (!r.Ok && r.Error != "Склад заповнений.") failed = true;
                }
                if (failed) _sim.Notify($"«{s.Name}»: автозамовлення не виконано — бракує коштів.", Severity.Bad);
            }
        }
    }
}
