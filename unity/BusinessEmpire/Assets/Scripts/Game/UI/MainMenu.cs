using System;
using System.Globalization;
using BusinessEmpire.Core.Common;
using BusinessEmpire.Core.Simulation;
using UnityEngine;
using UnityEngine.UI;

namespace BusinessEmpire.Game.UI
{
    /// <summary>Головне меню, меню паузи, нова гра, завантаження, налаштування, статистика, модальні вікна.</summary>
    public static class MainMenu
    {
        public const string PrefQuality = "be_quality", PrefFps = "be_fps";

        private static RectTransform Screen(RectTransform layer, out RectTransform column, float width = 700)
        {
            UIKit.Clear(layer);
            var bg = UIKit.Panel(layer, Theme.Hex("060D18", 0.97f), "MenuBg", false);
            UIKit.Stretch(bg.rectTransform);
            column = UIKit.Rect("Column", bg.transform);
            UIKit.Place(column, new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(width, 980));
            var l = UIKit.VLayout(column, 14);
            l.childAlignment = TextAnchor.MiddleCenter;
            return bg.rectTransform;
        }

        private static void Title(RectTransform col, string sub)
        {
            UIKit.Size(UIKit.Label(col, "BUSINESS EMPIRE", 76, Theme.Gold, TextAnchor.MiddleCenter, FontStyle.Bold), -1, 96);
            UIKit.Size(UIKit.Label(col, "ULTIMATE", 40, Theme.GoldDark, TextAnchor.MiddleCenter, FontStyle.Bold), -1, 52);
            UIKit.Size(UIKit.Label(col, sub, 24, Theme.Muted, TextAnchor.MiddleCenter), -1, 50);
        }

        private static void Item(RectTransform col, string text, Action a, bool gold = false, bool enabled = true)
        {
            var b = gold ? UIKit.GoldButton(col, text, a, 30, enabled) : UIKit.Button(col, text, a, Theme.Panel2, Theme.Text, 30, enabled);
            UIKit.Size(b, -1, 84);
        }

        public static void Show(UIRoot root, RectTransform layer)
        {
            Screen(layer, out var col);
            Title(col, "Від звичайної людини до глобальної корпорації");
            var session = root.Session;
            var hasSave = session.Saves.HasSave();
            if (hasSave) Item(col, "Продовжити", () => { if (!session.Continue()) Modal(layer, "Помилка", "Не вдалося завантажити збереження — усі копії пошкоджені.", ("OK", () => Show(root, layer))); }, true);
            Item(col, "Нова гра", () => NewGame(root, layer), !hasSave);
            Item(col, "Завантаження", () => Load(root, layer), false, hasSave);
            Item(col, "Налаштування", () => Settings(root, layer, () => Show(root, layer)));
            Item(col, "Статистика", () => Stats(root, layer, () => Show(root, layer)));
            Item(col, "Вихід", Application.Quit);
        }

        public static void ShowInGame(UIRoot root, RectTransform layer)
        {
            Screen(layer, out var col);
            Title(col, "Гру поставлено на паузу");
            var s = root.Session;
            Item(col, "Продовжити", () => { UIKit.Clear(layer); s.SetSpeed(1); }, true);
            Item(col, "Зберегти", () => { s.SaveNow(); root.Toast("Гру збережено.", Core.Events.Severity.Good); });
            Item(col, "Налаштування", () => Settings(root, layer, () => ShowInGame(root, layer)));
            Item(col, "Статистика", () => Stats(root, layer, () => ShowInGame(root, layer)));
            Item(col, "Вийти в головне меню", () => s.EndSession());
        }

        private static void NewGame(UIRoot root, RectTransform layer)
        {
            Screen(layer, out var col);
            Title(col, "Нова гра · старт з $30 000 особистих заощаджень");
            UIKit.Size(UIKit.Label(col, "Ваше ім’я", 24, Theme.Muted), -1, 34);
            var name = UIKit.Input(col, "Олександр Коваль", "Ім’я та прізвище");
            UIKit.Size(name, -1, 76);
            UIKit.Size(UIKit.Label(col, "Назва компанії", 24, Theme.Muted), -1, 34);
            var company = UIKit.Input(col, "Коваль Груп", "Назва компанії");
            UIKit.Size(company, -1, 76);
            Item(col, "Почати", () =>
            {
                var n = string.IsNullOrWhiteSpace(name.text) ? "Підприємець" : name.text.Trim();
                var c = string.IsNullOrWhiteSpace(company.text) ? "Моя компанія" : company.text.Trim();
                if (root.Session.Saves.HasSave())
                    Modal(layer, "Нова гра", "Поточне збереження буде замінено новою грою. Продовжити?", ("Скасувати", () => NewGame(root, layer)), ("Так", () => root.Session.NewGame(n, c)));
                else root.Session.NewGame(n, c);
            }, true);
            Item(col, "Назад", () => Show(root, layer));
        }

        private static void Load(UIRoot root, RectTransform layer)
        {
            Screen(layer, out var col);
            Title(col, "Основне збереження та дві резервні копії");
            foreach (var v in root.Session.Saves.ListVersions())
            {
                var label = v.Valid
                    ? $"{(v.File.EndsWith(".sav") ? "Основне" : "Резервна копія")} · {v.Company} · день {v.Day} · {new Money(v.BalanceCents).Format()} · {FormatTime(v.SavedAtUtc)}"
                    : $"{v.File}: пошкоджено";
                var file = v.File;
                var b = UIKit.Button(col, label, () => { if (!root.Session.LoadFile(file)) root.Toast("Не вдалося завантажити.", Core.Events.Severity.Bad); }, Theme.Panel2, v.Valid ? Theme.Text : Theme.Red, 24, v.Valid);
                UIKit.Size(b, -1, 84);
            }
            Item(col, "Назад", () => Show(root, layer));
        }

        private static string FormatTime(string iso)
        {
            return DateTime.TryParse(iso, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var t) ? t.ToLocalTime().ToString("dd.MM HH:mm") : "";
        }

        private static void Settings(UIRoot root, RectTransform layer, Action back)
        {
            Screen(layer, out var col);
            Title(col, "Налаштування");
            var q = PlayerPrefs.GetInt(PrefQuality, SystemInfo.systemMemorySize >= 7000 ? 2 : SystemInfo.systemMemorySize >= 5000 ? 1 : 0);
            UIKit.Size(UIKit.Label(col, $"Графіка (пам’ять пристрою: {SystemInfo.systemMemorySize / 1024f:0.#} ГБ)", 24, Theme.Muted, TextAnchor.MiddleCenter), -1, 40);
            var row = UIKit.Row(col, 84, 10);
            var names = new[] { "Низька (4 ГБ)", "Середня (6–8 ГБ)", "Висока (12 ГБ)" };
            for (var i = 0; i < 3; i++)
            {
                var idx = i;
                var b = i == q ? UIKit.GoldButton(row, names[i], null, 24) : UIKit.Button(row, names[i], null, Theme.Panel2, Theme.Text, 24);
                b.onClick.AddListener(() => { PlayerPrefs.SetInt(PrefQuality, idx); PlayerPrefs.Save(); ApplyPrefs(root); Settings(root, layer, back); });
                UIKit.Size(b, -1, -1, 1);
            }
            UIKit.Size(UIKit.Label(col, "Низька: без тіней, 60 пішоходів, 30 FPS · Середня: тіні, 140 пішоходів · Висока: 260 пішоходів, 60 FPS", 20, Theme.Muted, TextAnchor.MiddleCenter), -1, 60);
            var fps = PlayerPrefs.GetInt(PrefFps, 0) == 1;
            Item(col, fps ? "Лічильник FPS: увімкнено" : "Лічильник FPS: вимкнено", () => { PlayerPrefs.SetInt(PrefFps, fps ? 0 : 1); ApplyPrefs(root); Settings(root, layer, back); });
            Item(col, "Назад", back);
        }

        /// <summary>Переносить налаштування з PlayerPrefs у стан гри (вони також зберігаються в сейві).</summary>
        public static void ApplyPrefs(UIRoot root)
        {
            var sim = root.Session.Sim;
            if (sim == null) return;
            sim.State.Settings.GraphicsQuality = PlayerPrefs.GetInt(PrefQuality, sim.State.Settings.GraphicsQuality);
            sim.State.Settings.ShowFps = PlayerPrefs.GetInt(PrefFps, 0) == 1;
            root.Session.ApplySettings();
            root.RefreshWorldSettings();
        }

        private static void Stats(UIRoot root, RectTransform layer, Action back)
        {
            Screen(layer, out var col);
            Title(col, "Статистика");
            GameState s = root.Session.Sim?.State;
            if (s == null) { var r = root.Session.Saves.Load(); s = r.State; }
            if (s == null) UIKit.Size(UIKit.Label(col, "Ще немає зіграних ігор.", 26, Theme.Muted, TextAnchor.MiddleCenter), -1, 60);
            else
            {
                void L(string k, string v)
                {
                    var row = UIKit.Row(col, 48, 10, Theme.Row);
                    UIKit.Size(UIKit.Label(row, k, 24, Theme.Muted), -1, -1, 1);
                    UIKit.Size(UIKit.Label(row, v, 24, Theme.Text, TextAnchor.MiddleRight, FontStyle.Bold), 280);
                }
                L("Компанія", s.CompanyName);
                L("Днів у грі", s.Clock.Day.ToString());
                L("Виручка за весь час", s.Stats.Revenue.Format());
                L("Чистий прибуток", s.Stats.NetProfit.Format());
                L("Найкращий день", s.Stats.BestDayProfit.Format());
                L("Обслуговано покупців", s.Stats.Customers.ToString("#,0", CultureInfo.InvariantCulture).Replace(",", " "));
                L("Відкрито магазинів", s.Stats.StoresOpened.ToString());
                L("Найнято працівників", s.Stats.EmployeesHired.ToString());
            }
            Item(col, "Назад", back);
        }

        /// <summary>Модальне вікно з кнопками. Дія null — просто закрити.</summary>
        public static void Modal(RectTransform layer, string title, string text, params (string label, Action action)[] buttons)
        {
            var dim = UIKit.Panel(layer, Theme.Dim, "Modal", false);
            UIKit.Stretch(dim.rectTransform);
            var box = UIKit.Panel(dim.transform, Theme.Panel, "Box");
            UIKit.Place(box.rectTransform, new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(900, 420));
            var l = UIKit.VLayout(box, 16, 30);
            l.childAlignment = TextAnchor.MiddleCenter;
            UIKit.Size(UIKit.Label(box.transform, title, 36, Theme.Gold, TextAnchor.MiddleCenter, FontStyle.Bold), -1, 56);
            UIKit.Size(UIKit.Label(box.transform, text, 26, Theme.Text, TextAnchor.MiddleCenter), -1, 170);
            var row = UIKit.Row(box.transform, 80, 16);
            foreach (var (label, action) in buttons)
            {
                var a = action;
                var b = UIKit.Button(row, label, () => { UnityEngine.Object.Destroy(dim.gameObject); a?.Invoke(); }, a == null ? Theme.Panel2 : Theme.Gold, a == null ? Theme.Text : Theme.Hex("1A1205"), 26);
                UIKit.Size(b, -1, -1, 1);
            }
        }
    }
}
