using System;
using System.Linq;
using BusinessEmpire.Core.Business;
using BusinessEmpire.Core.Common;
using BusinessEmpire.Core.Economy;
using BusinessEmpire.Core.Services;
using BusinessEmpire.Core.Staff;
using BusinessEmpire.Core.World;
using UnityEngine;
using UnityEngine.UI;

namespace BusinessEmpire.Game.UI
{
    /// <summary>Приміщення: оренда, купівля, відкриття магазину, звільнення.</summary>
    public class PremisesPanel : PanelBase
    {
        private readonly string _id;
        public PremisesPanel(string id) { _id = id; }
        private Premises P => S.City.GetPremises(_id);
        public override string Title => P.Address;

        public override void Build(RectTransform c)
        {
            var p = P;
            var d = S.City.GetDistrict(p.DistrictId);
            var re = Sim.RealEstate;
            Line(c, $"{d.Name} · рівень району {d.Level} · {p.AreaM2} м² · {p.Floors} поверх(и)", 24, Theme.Muted);
            KV(c, "Розташування", p.LocationFactor >= 1.2 ? "Жвава сторона проспекту" : "Тихіша сторона");
            KV(c, "Потік людей (пік)", $"≈{d.PeakFootTraffic * p.LocationFactor:0} осіб/год");
            KV(c, "Оренда", re.DailyRent(p).Format() + "/день");
            KV(c, "Депозит (14 днів)", re.Deposit(p).Format());
            KV(c, "Ринкова ціна", re.PurchasePrice(p).Format());

            switch (p.Tenure)
            {
                case Tenure.Competitor:
                    Section(c, "Конкурент");
                    Line(c, $"Тут працює «{p.CompetitorName}» ({Catalog.StoreTypes[p.CompetitorTypeId].Name}). Він забирає частину покупців у магазинів того ж формату в районі.");
                    return;
                case Tenure.Available:
                    Section(c, "Угода");
                    Line(c, "Орендуйте, щоб почати з малих грошей, або купіть, щоб не платити оренду (лише утримання ≈0.015% вартості на день).", 22, Theme.Muted);
                    var row = Buttons(c);
                    Btn(row, $"Орендувати · депозит {re.Deposit(p).FormatShort()}", () => Do(re.Rent(_id)), true, S.Account.Balance >= re.Deposit(p));
                    Btn(row, $"Купити · {re.PurchasePrice(p).FormatShort()}", () => Do(re.Buy(_id)), false, S.Account.Balance >= re.PurchasePrice(p));
                    return;
            }

            Section(c, p.Tenure == Tenure.Rented ? "Ви орендуєте це приміщення" : "Ви власник приміщення");
            if (p.Tenure == Tenure.Rented)
            {
                var r = Buttons(c);
                Btn(r, $"Викупити · {(re.PurchasePrice(p) - p.DepositPaid).FormatShort()}", () => Do(re.Buy(_id)), false, S.Account.Balance >= re.PurchasePrice(p) - p.DepositPaid);
            }
            if (p.StoreId != null)
            {
                var r = Buttons(c);
                Btn(r, "Керувати магазином", () => Root.ShowPanel(new StorePanel(p.StoreId)), true);
                return;
            }
            Section(c, "Відкрити магазин");
            foreach (var T in Catalog.StoreTypes.Values)
            {
                var cost = Sim.StoresSvc.EquipmentCost(T.Id, p);
                var ok = p.AreaM2 >= T.MinAreaM2;
                var row = UIKit.Row(c, 96, 12, Theme.Row);
                var info = UIKit.Rect("Info", row); UIKit.Size(info, -1, -1, 1);
                UIKit.VLayout(info, 0).childAlignment = TextAnchor.MiddleLeft;
                UIKit.Size(UIKit.Label(info, T.Name, 26, Theme.Text, TextAnchor.MiddleLeft, FontStyle.Bold), -1, 36);
                var comp = S.City.Premises.Count(x => x.DistrictId == p.DistrictId && x.Tenure == Tenure.Competitor && x.CompetitorTypeId == T.Id);
                UIKit.Size(UIKit.Label(info, ok ? $"Обладнання {cost.Format()} · {T.DefaultOpenHour:00}:00–{T.DefaultCloseHour:00}:00 · конкурентів у районі: {comp}" : $"Потрібно від {T.MinAreaM2} м²", 20, ok ? Theme.Muted : Theme.Red), -1, 30);
                var b = UIKit.GoldButton(row, "Відкрити", () => { Do(Sim.StoresSvc.Open(_id, T.Id)); var st = S.City.GetPremises(_id).StoreId; if (st != null) Root.ShowPanel(new StorePanel(st)); }, 24, ok && S.Account.Balance >= cost);
                UIKit.Size(b, 190, 70);
            }
            var rr = Buttons(c);
            Btn(rr, p.Tenure == Tenure.Rented ? "Розірвати оренду (повернути депозит)" : "Продати приміщення (95% ціни)", () => Do(re.Release(_id)));
        }
    }

    /// <summary>Керування магазином: огляд дня, товари й ціни, закупівлі, персонал, графік.</summary>
    public class StorePanel : PanelBase
    {
        private readonly string _id;
        private string _tab = "overview";
        public StorePanel(string id) { _id = id; }
        private Store St => S.GetStore(_id);
        public override string Title => St != null ? St.Name : "Магазин закрито";

        public override void Build(RectTransform c)
        {
            var st = St;
            if (st == null) { Line(c, "Магазин закрито."); return; }
            var tabs = UIKit.Row(c, 64, 8);
            void Tab(string id, string name)
            {
                var b = UIKit.Button(tabs, name, () => { _tab = id; Root.MarkDirty(); }, _tab == id ? Theme.Gold : Theme.Panel2, _tab == id ? Theme.Hex("1A1205") : Theme.Text, 23);
                UIKit.Size(b, -1, -1, 1);
            }
            Tab("overview", "Огляд"); Tab("goods", "Товари й ціни"); Tab("staff", "Персонал"); Tab("settings", "Графік і закриття");
            switch (_tab)
            {
                case "goods": Goods(c, st); break;
                case "staff": Staff(c, st); break;
                case "settings": Settings(c, st); break;
                default: Overview(c, st); break;
            }
        }

        private void Overview(RectTransform c, Store st)
        {
            var t = st.Today;
            var hour = S.Clock.Hour;
            var staff = S.StaffOf(st.Id);
            var working = staff.Count(e => e.WorksAt(hour));
            var open = st.IsOpenAt(hour);
            Line(c, $"{Catalog.StoreTypes[st.TypeId].Name} · {S.City.GetPremises(st.PremisesId).Address} · {st.OpenHour:00}:00–{st.CloseHour:00}:00 · {(open ? "відчинено" : "зачинено")}", 22, Theme.Muted);
            if (staff.Count == 0) Line(c, "Немає персоналу — магазин не може обслуговувати покупців. Відкрийте вкладку «Персонал».", 24, Theme.Red);
            if (st.Inventory.Values.All(i => i.Quantity == 0)) Line(c, st.Inventory.Values.Any(i => i.Incoming > 0) ? "Товар замовлено — поставка о 07:00." : "Полиці порожні — замовте товар у вкладці «Товари й ціни».", 24, Theme.Gold);

            Section(c, "Сьогодні");
            KV(c, "Покупців обслуговано / пішли", $"{t.Customers} / {t.Lost}", t.Lost > t.Customers * 0.15 ? Theme.Red : Theme.Text);
            KV(c, "Продано товарів / не вистачило", $"{t.UnitsSold} / {t.UnitsMissed}", t.UnitsMissed > 0 ? Theme.Gold : Theme.Text);
            KV(c, "Виручка", t.Revenue.Format(), Theme.Green);
            KV(c, "Валовий прибуток", (t.Revenue - t.CostOfGoods).Format(), Sign(t.Revenue - t.CostOfGoods));
            if (open)
            {
                KV(c, "Зараз: очікувано покупців/год", $"{Sim.Sales.ExpectedCustomers(st, hour):0.0}");
                KV(c, "Зараз: пропускна здатність/год", $"{Sim.Sales.Capacity(st, hour):0.0} ({working} на зміні)");
            }
            Section(c, "Репутація");
            UIKit.Bar(c, (float)(st.Reputation / 100), st.Reputation >= 70 ? Theme.Green : st.Reputation >= 45 ? Theme.Gold : Theme.Red, 14);
            Line(c, $"{st.Reputation:0}/100 — залежить від швидкості обслуговування, наявності товару, цін і навичок персоналу.", 20, Theme.Muted);

            var last = S.Reports.LastOrDefault(r => r.Stores.Any(x => x.StoreId == st.Id));
            if (last != null)
            {
                var r = last.Stores.First(x => x.StoreId == st.Id);
                Section(c, $"Звіт за день {last.Day}");
                KV(c, "Виручка", r.Revenue.Format(), Theme.Green);
                KV(c, "Собівартість проданого", "−" + r.CostOfGoods.Format());
                KV(c, "Зарплати", "−" + r.Wages.Format());
                KV(c, r.Maintenance.Cents > 0 ? "Утримання приміщення" : "Оренда", "−" + (r.Rent + r.Maintenance).Format());
                KV(c, "Псування", "−" + r.Spoilage.Format());
                KV(c, "Операційний прибуток", r.OperatingProfit.Format(), Sign(r.OperatingProfit));
                KV(c, "Задоволеність покупців", $"{r.Satisfaction:0}/100");
            }
        }

        private void Goods(RectTransform c, Store st)
        {
            var cap = Sim.StoresSvc.StorageCapacity(st);
            Line(c, $"Склад: {st.TotalStock}/{cap} од. (з урахуванням товару в дорозі). Доставка о 07:00, {PurchasingService.BaseDeliveryFee.Format()} + 2% за замовлення.", 22, Theme.Muted);
            var T = Catalog.StoreTypes[st.TypeId];
            foreach (var pid in T.ProductIds)
            {
                var def = Catalog.Products[pid];
                var item = st.Inventory[pid];
                var price = st.Prices[pid];
                var refPrice = S.Market.ReferenceRetail(pid, S.Macro);
                var unit = S.Market.UnitPrice(pid, S.Macro);
                var pol = st.Reorder[pid];
                st.Today.SoldByProduct.TryGetValue(pid, out var sold);
                st.Today.MissedByProduct.TryGetValue(pid, out var missed);

                var card = UIKit.Panel(c, Theme.Row, "Product");
                UIKit.VLayout(card, 6, 14);
                var head = UIKit.Row(card.transform, 40);
                UIKit.Size(UIKit.Label(head, def.Name, 26, Theme.Text, TextAnchor.MiddleLeft, FontStyle.Bold), -1, -1, 1);
                UIKit.Size(UIKit.Label(head, $"на складі {item.Quantity}" + (item.Incoming > 0 ? $" (+{item.Incoming} в дорозі)" : ""), 22, item.Quantity == 0 ? Theme.Red : Theme.Muted, TextAnchor.MiddleRight), 420);
                var margin = price.Dollars > 0 ? (price - item.AvgCost).Dollars / price.Dollars : 0;
                var info = UIKit.Label(card.transform, $"Опт {unit.Format(true)} · собівартість {item.AvgCost.Format(true)} · маржа {margin * 100:0}% · продано сьогодні {sold}" + (missed > 0 ? $" · {UIKit.Colored("не вистачило " + missed, Theme.Gold)}" : "") + (def.ShelfLifeDays > 0 ? $" · псується за {def.ShelfLifeDays} дн." : ""), 20, Theme.Muted);
                UIKit.Size(info, -1, 30);

                var pr = UIKit.Row(card.transform, 60);
                var ratio = price.Dollars / refPrice.Dollars;
                UIKit.Size(UIKit.Label(pr, $"Ціна {price.Format(true)} (ринок {refPrice.Format(true)})", 23, ratio > 1.15 ? Theme.Red : ratio < 0.92 ? Theme.Green : Theme.Text), -1, -1, 1);
                Small(pr, "−5%", () => Do(Sim.StoresSvc.SetPrice(st.Id, pid, price * 0.95)));
                Small(pr, "= ринок", () => Do(Sim.StoresSvc.SetPrice(st.Id, pid, refPrice)), 140);
                Small(pr, "+5%", () => Do(Sim.StoresSvc.SetPrice(st.Id, pid, price * 1.05)));

                var or = UIKit.Row(card.transform, 60);
                UIKit.Size(UIKit.Label(or, "Замовити:", 23, Theme.Text), 140);
                foreach (var q in new[] { 50, 200 }) Small(or, "+" + q, () => Do(Sim.Purchasing.Order(st.Id, pid, q)), 110);
                Small(or, "до рівня", () => Do(Sim.Purchasing.Order(st.Id, pid, Math.Max(1, pol.OrderUpTo - item.Quantity - item.Incoming))), 150);
                var auto = UIKit.Button(or, pol.Enabled ? "Авто: увімк." : "Авто: вимк.", () => { pol.Enabled = !pol.Enabled; Root.MarkDirty(); }, pol.Enabled ? Theme.Green : Theme.Panel2, pol.Enabled ? Theme.Hex("0B2A18") : Theme.Text, 21);
                UIKit.Size(auto, 170, -1);

                var ar = UIKit.Row(card.transform, 56);
                UIKit.Size(UIKit.Label(ar, $"Автозамовлення: коли ≤ {pol.ReorderPoint}, поповнити до {pol.OrderUpTo}", 21, Theme.Muted), -1, -1, 1);
                Small(ar, "−", () => { pol.OrderUpTo = Math.Max(10, (int)(pol.OrderUpTo * 0.8)); pol.ReorderPoint = pol.OrderUpTo / 3; });
                Small(ar, "+", () => { pol.OrderUpTo = Math.Min(cap, (int)(pol.OrderUpTo * 1.25) + 5); pol.ReorderPoint = pol.OrderUpTo / 3; });
            }
        }

        private void Small(RectTransform row, string text, Action a, float width = 90)
        {
            var b = UIKit.Button(row, text, () => { a(); Root.MarkDirty(); }, Theme.Panel2, Theme.Text, 22);
            UIKit.Size(b, width, -1);
        }

        private void Staff(RectTransform c, Store st)
        {
            var staff = S.StaffOf(st.Id);
            var max = Sim.StoresSvc.MaxStaff(st);
            Line(c, $"Працівників {staff.Count}/{max}. Понад 8 год на день — понаднормові ×1.5 і падіння задоволеності. Керуючий магазином дає +10% швидкості зміні.", 22, Theme.Muted);
            foreach (var e in staff)
            {
                var card = UIKit.Panel(c, Theme.Row, "Employee");
                UIKit.VLayout(card, 4, 14);
                var head = UIKit.Row(card.transform, 40);
                UIKit.Size(UIKit.Label(head, $"{e.Name} — {Roles.Names[(int)e.Role]}", 25, Theme.Text, TextAnchor.MiddleLeft, FontStyle.Bold), -1, -1, 1);
                UIKit.Size(UIKit.Label(head, $"{e.HourlyWage.Format(true)}/год (ринок {Sim.StaffSvc.MarketWage(e.Role, e.Skill).Format(true)})", 21, Theme.Muted, TextAnchor.MiddleRight), 470);
                UIKit.Size(UIKit.Label(card.transform, $"Навичка {e.Skill:0} · досвід {e.ExperienceHours:0} год · мотивація {e.Motivation:0} · задоволеність {e.Satisfaction:0} · продуктивність ×{e.Productivity:0.00}", 20, e.Satisfaction < 35 ? Theme.Red : Theme.Muted), -1, 30);
                var sh = UIKit.Row(card.transform, 56);
                UIKit.Size(UIKit.Label(sh, $"Зміна {e.ShiftStart:00}:00–{e.ShiftEnd:00}:00", 22, Theme.Text), -1, -1, 1);
                Small(sh, "◄ раніше", () => Do(Sim.StaffSvc.SetShift(e.Id, Math.Max(st.OpenHour, e.ShiftStart - 1), Math.Max(st.OpenHour + 1, e.ShiftEnd - 1))), 150);
                Small(sh, "пізніше ►", () => Do(Sim.StaffSvc.SetShift(e.Id, Math.Min(st.CloseHour - 1, e.ShiftStart + 1), Math.Min(st.CloseHour, e.ShiftEnd + 1))), 150);
                Small(sh, "−1 год", () => Do(Sim.StaffSvc.SetShift(e.Id, e.ShiftStart, e.ShiftEnd - 1)), 110);
                Small(sh, "+1 год", () => Do(Sim.StaffSvc.SetShift(e.Id, e.ShiftStart, Math.Min(st.CloseHour, e.ShiftEnd + 1))), 110);
                var act = UIKit.Row(card.transform, 56);
                Small(act, $"Навчити ({Sim.StaffSvc.TrainingCost.FormatShort()})", () => Do(Sim.StaffSvc.Train(e.Id)), 230);
                Small(act, "Підвищити", () => Do(Sim.StaffSvc.Promote(e.Id)), 170);
                Small(act, "+5% зарплати", () => Do(Sim.StaffSvc.Raise(e.Id, 0.05)), 190);
                Small(act, "Звільнити", () => Root.Confirm($"Звільнити {e.Name}? Вихідна допомога {(e.HourlyWage * (long)StaffService.SeveranceHours).Format()}.", () => Do(Sim.StaffSvc.Fire(e.Id))), 160);
            }
            Section(c, "Кандидати на ринку праці");
            if (staff.Count >= max) { Line(c, "Усі робочі місця зайняті.", 22, Theme.Muted); return; }
            foreach (var cand in S.Candidates.OrderByDescending(x => x.Skill / x.AskingWage.Dollars))
            {
                var row = UIKit.Row(c, 70, 10, Theme.Row);
                var market = Sim.StaffSvc.MarketWage(cand.Role, cand.Skill);
                UIKit.Size(UIKit.Label(row, $"{cand.Name} · {Roles.Names[(int)cand.Role]} · навичка {cand.Skill:0} · {cand.AskingWage.Format(true)}/год{(cand.AskingWage < market ? " (нижче ринку)" : "")}", 22, Theme.Text), -1, -1, 1);
                var b = UIKit.GoldButton(row, "Найняти", () => Do(Sim.StaffSvc.Hire(cand.Id, st.Id)), 22);
                UIKit.Size(b, 160, -1);
            }
        }

        private void Settings(RectTransform c, Store st)
        {
            Section(c, "Графік роботи");
            var r = UIKit.Row(c, 64, 10);
            UIKit.Size(UIKit.Label(r, $"Відкриття {st.OpenHour:00}:00", 24), -1, -1, 1);
            Small(r, "−1", () => Do(Sim.StoresSvc.SetHours(st.Id, st.OpenHour - 1, st.CloseHour)));
            Small(r, "+1", () => Do(Sim.StoresSvc.SetHours(st.Id, st.OpenHour + 1, st.CloseHour)));
            var r2 = UIKit.Row(c, 64, 10);
            UIKit.Size(UIKit.Label(r2, $"Закриття {st.CloseHour:00}:00", 24), -1, -1, 1);
            Small(r2, "−1", () => Do(Sim.StoresSvc.SetHours(st.Id, st.OpenHour, st.CloseHour - 1)));
            Small(r2, "+1", () => Do(Sim.StoresSvc.SetHours(st.Id, st.OpenHour, st.CloseHour + 1)));
            Line(c, "Довший графік — більше покупців, але потрібні додаткові зміни персоналу.", 21, Theme.Muted);
            Section(c, "Активи");
            KV(c, "Обладнання (залишкова вартість)", st.EquipmentBookValue.Format());
            KV(c, "Товарні запаси (за собівартістю)", st.InventoryValue.Format());
            KV(c, "Відкрито", $"день {st.OpenedDay}");
            Section(c, "Закриття");
            var b = Buttons(c);
            Btn(b, "Показати на мапі", () => Root.FocusPremises(st.PremisesId));
            Btn(b, "Закрити магазин", () => Root.Confirm($"Закрити «{st.Name}»? Обладнання продасться за 40% вартості, запаси — за 50%, персонал отримає вихідну допомогу.", () => { Do(Sim.StoresSvc.Close(st.Id)); Root.CloseWindow(); }));
        }
    }
}
