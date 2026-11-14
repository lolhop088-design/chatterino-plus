using System.Linq;
using BusinessEmpire.Core.Common;
using BusinessEmpire.Core.Economy;
using BusinessEmpire.Core.Finance;
using BusinessEmpire.Core.Staff;
using BusinessEmpire.Core.World;
using UnityEngine;
using UnityEngine.UI;

namespace BusinessEmpire.Game.UI
{
    /// <summary>Огляд компанії: чистий капітал, магазини, приміщення.</summary>
    public class CompaniesPanel : PanelBase
    {
        public override string Title => S.CompanyName;

        public static Money NetWorth(Core.Simulation.GameState s, out Money property, out Money inventory, out Money equipment, out Money deposits)
        {
            property = inventory = equipment = deposits = Money.Zero;
            foreach (var p in s.City.Premises)
            {
                if (p.Tenure == Tenure.Owned) property += s.City.MarketValue(p, s.Macro);
                if (p.Tenure == Tenure.Rented) deposits += p.DepositPaid;
            }
            foreach (var st in s.Stores) { inventory += st.InventoryValue; equipment += st.EquipmentBookValue; }
            foreach (var o in s.Orders) inventory += o.LandedUnitCost * (long)o.Quantity;
            return s.Account.Balance + property + inventory + equipment + deposits;
        }

        public override void Build(RectTransform c)
        {
            var nw = NetWorth(S, out var prop, out var inv, out var eq, out var dep);
            Section(c, "Чистий капітал");
            KV(c, "Разом", nw.Format(), Theme.Gold);
            KV(c, "Гроші на рахунку", S.Account.Balance.Format(), Sign(S.Account.Balance));
            KV(c, "Власна нерухомість", prop.Format());
            KV(c, "Товарні запаси", inv.Format());
            KV(c, "Обладнання", eq.Format());
            KV(c, "Депозити за оренду", dep.Format());

            Section(c, $"Магазини ({S.Stores.Count})");
            if (S.Stores.Count == 0) Line(c, "Ще немає магазинів. Торкніться вільного приміщення з зеленою табличкою на проспекті.", 22, Theme.Muted);
            foreach (var st in S.Stores)
            {
                var y = S.Reports.LastOrDefault()?.Stores.FirstOrDefault(r => r.StoreId == st.Id);
                var row = UIKit.Row(c, 84, 12, Theme.Row);
                var info = UIKit.Rect("Info", row); UIKit.Size(info, -1, -1, 1);
                UIKit.VLayout(info, 0).childAlignment = TextAnchor.MiddleLeft;
                UIKit.Size(UIKit.Label(info, st.Name, 25, Theme.Text, TextAnchor.MiddleLeft, FontStyle.Bold), -1, 36);
                UIKit.Size(UIKit.Label(info, $"Сьогодні {st.Today.Revenue.Format()} · учора {(y != null ? UIKit.Colored(y.OperatingProfit.Format(), y.OperatingProfit.IsNegative ? Theme.Red : Theme.Green) : "—")} · репутація {st.Reputation:0} · персонал {S.StaffOf(st.Id).Count}", 20, Theme.Muted), -1, 30);
                var id = st.Id;
                UIKit.Size(UIKit.GoldButton(row, "Відкрити", () => { Root.FocusPremises(st.PremisesId); Root.ShowPanel(new StorePanel(id)); }, 22), 170, 64);
            }

            var empty = S.City.Premises.Where(p => p.IsControlledByPlayer && p.StoreId == null).ToList();
            if (empty.Count > 0)
            {
                Section(c, "Приміщення без магазину");
                foreach (var p in empty)
                {
                    var row = UIKit.Row(c, 70, 12, Theme.Row);
                    UIKit.Size(UIKit.Label(row, $"{p.Address} · {p.AreaM2} м² · {(p.Tenure == Tenure.Owned ? "власне" : "оренда " + Sim.RealEstate.DailyRent(p).Format() + "/день")}", 22, Theme.Text), -1, -1, 1);
                    var id = p.Id;
                    UIKit.Size(UIKit.Button(row, "Відкрити", () => { Root.FocusPremises(id); Root.ShowPanel(new PremisesPanel(id)); }, Theme.Panel2, Theme.Text, 22), 170, 56);
                }
            }
        }
    }

    /// <summary>Фінанси: щоденні звіти, графік прибутку, рух грошей.</summary>
    public class FinancePanel : PanelBase
    {
        private int _reportIdx = -1;
        public override string Title => "Фінанси";

        public override void Build(RectTransform c)
        {
            Section(c, "Рахунок");
            KV(c, "Баланс", S.Account.Balance.Format(), Sign(S.Account.Balance));
            if (S.NegativeBalanceDays > 0) Line(c, $"Увага: {S.NegativeBalanceDays} дн. у мінусі. На третій день — банкрутство.", 22, Theme.Red);
            KV(c, "Виручка за весь час", S.Stats.Revenue.Format());
            KV(c, "Чистий прибуток за весь час", S.Stats.NetProfit.Format(), Sign(S.Stats.NetProfit));

            var reports = S.Reports;
            if (reports.Count == 0) { Line(c, "Перший щоденний звіт з’явиться опівночі.", 22, Theme.Muted); }
            else
            {
                Section(c, "Прибуток за останні дні");
                Chart(c, reports.Skip(System.Math.Max(0, reports.Count - 21)).ToList());
                var idx = _reportIdx < 0 || _reportIdx >= reports.Count ? reports.Count - 1 : _reportIdx;
                var r = reports[idx];
                var nav = UIKit.Row(c, 60, 10);
                UIKit.Size(UIKit.Button(nav, "◄", () => { _reportIdx = System.Math.Max(0, idx - 1); }, Theme.Panel2, Theme.Text, 24), 80, -1);
                UIKit.Size(UIKit.Label(nav, $"Звіт за день {r.Day} ({r.Date:dd.MM.yyyy})", 26, Theme.Gold, TextAnchor.MiddleCenter, FontStyle.Bold), -1, -1, 1);
                UIKit.Size(UIKit.Button(nav, "►", () => { _reportIdx = System.Math.Min(reports.Count - 1, idx + 1); }, Theme.Panel2, Theme.Text, 24), 80, -1);
                KV(c, "Виручка", r.Revenue.Format(), Theme.Green);
                KV(c, "Собівартість проданого", "−" + r.CostOfGoods.Format());
                KV(c, "Зарплати", "−" + r.Wages.Format());
                KV(c, "Оренда й утримання", "−" + r.Rent.Format());
                KV(c, "Псування товару", "−" + r.Spoilage.Format());
                KV(c, "Інші витрати (навчання, звільнення, порожні приміщення)", "−" + r.OtherExpenses.Format());
                KV(c, "Чистий прибуток", r.NetProfit.Format(), Sign(r.NetProfit));
                KV(c, "Надійшло / витрачено грошей", $"{r.CashIn.Format()} / {r.CashOut.Format()}");
                KV(c, "Баланс на початок → кінець", $"{r.OpeningBalance.Format()} → {r.ClosingBalance.Format()}");
                KV(c, "Покупців / пішли без покупки", $"{r.Customers} / {r.LostCustomers}");
                foreach (var s in r.Stores)
                    KV(c, "   " + s.StoreName, $"{s.Revenue.Format()} → {s.OperatingProfit.Format()}", Sign(s.OperatingProfit));
            }

            Section(c, "Останні операції");
            foreach (var tx in S.Account.History.AsEnumerable().Reverse().Take(30))
                KV(c, $"День {tx.Day} · {tx.Memo}", tx.Amount.Format(true), Sign(tx.Amount));
        }

        /// <summary>Стовпчиковий графік: виручка (синя) і прибуток (зелений/червоний).</summary>
        private static void Chart(RectTransform c, System.Collections.Generic.List<DailyReport> rs)
        {
            var box = UIKit.Panel(c, Theme.Row, "Chart");
            UIKit.Size(box, -1, 260);
            var max = 1.0;
            foreach (var r in rs) { max = System.Math.Max(max, r.Revenue.Dollars); max = System.Math.Max(max, System.Math.Abs(r.NetProfit.Dollars)); }
            var n = rs.Count;
            for (var i = 0; i < n; i++)
            {
                var r = rs[i];
                var x0 = (i + 0.15f) / n; var x1 = (i + 0.85f) / n;
                var mid = 0.35f;
                var rev = (float)(r.Revenue.Dollars / max) * 0.6f;
                Bar(box.transform, new Vector2(x0, mid), new Vector2((x0 + x1) / 2, mid + rev), Theme.Blue);
                var p = (float)(r.NetProfit.Dollars / max) * 0.6f;
                if (p >= 0) Bar(box.transform, new Vector2((x0 + x1) / 2, mid), new Vector2(x1, mid + p), Theme.Green);
                else Bar(box.transform, new Vector2((x0 + x1) / 2, Mathf.Max(0.02f, mid + p)), new Vector2(x1, mid), Theme.Red);
            }
            Bar(box.transform, new Vector2(0, 0.348f), new Vector2(1, 0.352f), Theme.Muted);
            var legend = UIKit.Label(box.transform, $"{UIKit.Colored("■", Theme.Blue)} виручка   {UIKit.Colored("■", Theme.Green)} прибуток   {UIKit.Colored("■", Theme.Red)} збиток   · макс {Money.FromDollars(max).Format()}", 18, Theme.Muted);
            legend.rectTransform.anchorMin = new Vector2(0, 0); legend.rectTransform.anchorMax = new Vector2(1, 0.14f);
            legend.rectTransform.offsetMin = new Vector2(12, 4); legend.rectTransform.offsetMax = new Vector2(-12, 0);
        }

        private static void Bar(Transform parent, Vector2 min, Vector2 max, Color color)
        {
            var img = UIKit.Panel(parent, color, "Bar", false);
            img.raycastTarget = false;
            img.rectTransform.anchorMin = min; img.rectTransform.anchorMax = max;
            img.rectTransform.offsetMin = img.rectTransform.offsetMax = Vector2.zero;
        }
    }

    /// <summary>Оптовий ринок і макроекономіка.</summary>
    public class MarketPanel : PanelBase
    {
        public override string Title => "Ринок";

        public override void Build(RectTransform c)
        {
            var m = S.Macro;
            Section(c, "Макроекономіка");
            KV(c, "Інфляція (річна)", Pct(m.Inflation), m.Inflation < 0 ? Theme.Blue : m.Inflation > 0.06 ? Theme.Red : Theme.Text);
            KV(c, "Ціль центробанку", Pct(m.TargetInflation));
            KV(c, "Облікова ставка", Pct(m.KeyRate));
            KV(c, "Безробіття", Pct(m.Unemployment));
            KV(c, "Купівельна спроможність", "×" + m.PurchasingPower.ToString("0.000"));
            KV(c, "Рівень цін / зарплат", $"×{m.PriceLevel:0.000} / ×{m.WageLevel:0.000}");
            Line(c, "Інфляція піднімає оптові та роздрібні ціни, зарплати й оренду. Висока ставка охолоджує попит. Безробіття збільшує кількість кандидатів і знижує їхні запити.", 21, Theme.Muted);

            Section(c, "Оптові ціни");
            foreach (var p in Catalog.Products.Values)
            {
                var unit = S.Market.UnitPrice(p.Id, m);
                var press = S.Market.GetPressure(p.Id);
                var refR = S.Market.ReferenceRetail(p.Id, m);
                var row = UIKit.Row(c, 48, 10, Theme.Row);
                UIKit.Size(UIKit.Label(row, p.Name, 23, Theme.Text), -1, -1, 1);
                UIKit.Size(UIKit.Label(row, "опт " + unit.Format(true), 22, Theme.Text, TextAnchor.MiddleRight), 200);
                UIKit.Size(UIKit.Label(row, press > 1.005 ? UIKit.Colored($"+{(press - 1) * 100:0.0}% (попит)", Theme.Red) : "стабільно", 20, Theme.Muted, TextAnchor.MiddleRight), 200);
                UIKit.Size(UIKit.Label(row, "роздріб ≈ " + refR.Format(true), 22, Theme.Muted, TextAnchor.MiddleRight), 220);
            }
        }
    }

    /// <summary>Весь персонал компанії і ринок праці.</summary>
    public class StaffPanel : PanelBase
    {
        private int _storeIdx;
        public override string Title => "Персонал";

        public override void Build(RectTransform c)
        {
            Section(c, $"Працівники ({S.Employees.Count})");
            if (S.Employees.Count == 0) Line(c, "Поки нікого не найнято.", 22, Theme.Muted);
            foreach (var e in S.Employees)
            {
                var st = S.GetStore(e.StoreId);
                var row = UIKit.Row(c, 66, 10, Theme.Row);
                UIKit.Size(UIKit.Label(row, $"{e.Name} · {Roles.Names[(int)e.Role]} · {st?.Name}\nнавичка {e.Skill:0} · задоволеність {e.Satisfaction:0} · {e.HourlyWage.Format(true)}/год · {e.ShiftStart:00}–{e.ShiftEnd:00}", 20, e.Satisfaction < 35 ? Theme.Red : Theme.Text), -1, -1, 1);
                var sid = e.StoreId;
                UIKit.Size(UIKit.Button(row, "Магазин", () => Root.ShowPanel(new StorePanel(sid)), Theme.Panel2, Theme.Text, 20), 140, 52);
            }

            Section(c, $"Ринок праці · безробіття {Pct(S.Macro.Unemployment)}");
            if (S.Stores.Count == 0) { Line(c, "Спершу відкрийте магазин.", 22, Theme.Muted); return; }
            _storeIdx %= S.Stores.Count;
            var target = S.Stores[_storeIdx];
            var pick = UIKit.Row(c, 60, 10);
            UIKit.Size(UIKit.Label(pick, $"Наймати в: {target.Name} ({S.StaffOf(target.Id).Count}/{Sim.StoresSvc.MaxStaff(target)})", 23, Theme.Text), -1, -1, 1);
            if (S.Stores.Count > 1) UIKit.Size(UIKit.Button(pick, "Змінити", () => { _storeIdx++; Root.MarkDirty(); }, Theme.Panel2, Theme.Text, 22), 160, -1);
            foreach (var cand in S.Candidates.OrderByDescending(x => x.Skill))
            {
                var row = UIKit.Row(c, 66, 10, Theme.Row);
                UIKit.Size(UIKit.Label(row, $"{cand.Name} · {Roles.Names[(int)cand.Role]} · навичка {cand.Skill:0}\nпросить {cand.AskingWage.Format(true)}/год · ринок {Sim.StaffSvc.MarketWage(cand.Role, cand.Skill).Format(true)} · шукає роботу ще {cand.ExpiresDay - Sim.Day + 1} дн.", 20, Theme.Text), -1, -1, 1);
                var cid = cand.Id;
                UIKit.Size(UIKit.GoldButton(row, "Найняти", () => Do(Sim.StaffSvc.Hire(cid, target.Id)), 22), 160, 52);
            }
        }
    }
}
