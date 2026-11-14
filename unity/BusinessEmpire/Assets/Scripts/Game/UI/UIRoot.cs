using System;
using System.Collections.Generic;
using BusinessEmpire.Core.Common;
using BusinessEmpire.Core.Events;
using BusinessEmpire.Core.Simulation;
using BusinessEmpire.Core.Time;
using BusinessEmpire.Core.World;
using BusinessEmpire.Game.Bootstrap;
using BusinessEmpire.Game.World;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace BusinessEmpire.Game.UI
{
    /// <summary>Базовий клас вікна: заголовок + вміст, що перебудовується при змінах у грі.</summary>
    public abstract class PanelBase
    {
        public UIRoot Root;
        protected GameSimulation Sim => Root.Session.Sim;
        protected GameState S => Sim.State;
        public abstract string Title { get; }
        public abstract void Build(RectTransform content);
        /// <summary>Чи перебудовувати вміст щогодини гри (живі цифри).</summary>
        public virtual bool Live => true;

        // ---- Типові блоки ----
        protected Text Section(RectTransform c, string title)
        {
            var t = UIKit.Label(c, title, 28, Theme.Gold, TextAnchor.LowerLeft, FontStyle.Bold);
            UIKit.Size(t, -1, 48);
            return t;
        }

        protected Text Line(RectTransform c, string text, int size = 24, Color? color = null)
        {
            // Висоту тексту за переносом рядків визначає батьківська VerticalLayoutGroup (Text — ILayoutElement).
            return UIKit.Label(c, text, size, color);
        }

        protected void KV(RectTransform c, string key, string value, Color? valueColor = null)
        {
            var row = UIKit.Row(c, 42, 10);
            UIKit.Size(UIKit.Label(row, key, 24, Theme.Muted), -1, -1, 1);
            UIKit.Size(UIKit.Label(row, value, 24, valueColor ?? Theme.Text, TextAnchor.MiddleRight, FontStyle.Bold), 360);
        }

        protected RectTransform Buttons(RectTransform c, float height = 64) => UIKit.Row(c, height, 10);

        protected void Btn(RectTransform row, string text, Action a, bool gold = false, bool enabled = true, float width = -1)
        {
            var b = gold ? UIKit.GoldButton(row, text, () => { a(); Root.MarkDirty(); }, 24, enabled) : UIKit.Button(row, text, () => { a(); Root.MarkDirty(); }, null, null, 24, enabled);
            UIKit.Size(b, width > 0 ? width : -1, -1, width > 0 ? 0 : 1);
        }

        /// <summary>Виконує дію гри й показує помилку, якщо вона не вдалась.</summary>
        protected void Do(OpResult r)
        {
            if (!r.Ok) Root.Toast(r.Error, Severity.Bad);
            Sim.Bus.Dispatch();
        }

        protected static string Pct(double v) => (v * 100).ToString("0.0") + "%";
        protected static Color Sign(Money m) => m.IsNegative ? Theme.Red : Theme.Green;
    }

    /// <summary>
    /// Корінь інтерфейсу: верхня панель, навігація, права колонка (новини/економіка), вікна,
    /// сповіщення, мітки над будівлями та головне меню. Будується з коду при старті.
    /// </summary>
    public class UIRoot : MonoBehaviour
    {
        public GameSession Session;
        public CityView City;
        public IsoCameraController CameraCtl;
        public Camera Cam;

        private RectTransform _safe, _hud, _game, _windowHost, _toasts, _markers, _rightCol, _menuLayer;
        private Text _balance, _today, _date, _time, _player, _company, _avatarText, _fps;
        private readonly List<Image> _speedButtons = new List<Image>();
        private RectTransform _newsList, _econList;
        private readonly List<(string time, string text, Severity sev)> _news = new List<(string, string, Severity)>();

        private PanelBase _panel;
        private RectTransform _panelContent;
        private ScrollRect _panelScroll;
        private Text _panelTitle;
        private bool _dirty;
        private float _lastRebuild;
        private readonly Dictionary<string, Text> _markerLabels = new Dictionary<string, Text>();
        private Rect _lastSafe;
        private float _fpsAcc; private int _fpsFrames;

        public void Init()
        {
            var canvasGo = new GameObject("Canvas", typeof(RectTransform));
            canvasGo.layer = 5;
            canvasGo.transform.SetParent(transform, false);
            var canvas = canvasGo.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            var scaler = canvasGo.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920, 1080);
            scaler.matchWidthOrHeight = 0.6f;
            canvasGo.AddComponent<GraphicRaycaster>();
            if (FindObjectOfType<EventSystem>() == null)
            {
                var es = new GameObject("EventSystem", typeof(EventSystem), typeof(StandaloneInputModule));
                es.transform.SetParent(transform, false);
            }

            _safe = UIKit.Rect("SafeArea", canvasGo.transform);
            ApplySafeArea();
            _markers = UIKit.Rect("Markers", _safe); UIKit.Stretch(_markers);
            _game = UIKit.Rect("GameUI", _safe); UIKit.Stretch(_game);
            BuildHud();
            BuildNav();
            BuildRightColumn();
            _windowHost = UIKit.Rect("Windows", _game); UIKit.Stretch(_windowHost, 250, 108, 10, 10);
            _toasts = UIKit.Rect("Toasts", _safe);
            UIKit.Place(_toasts, new Vector2(0.5f, 0), new Vector2(0.5f, 0), new Vector2(0, 24), new Vector2(900, 400));
            var tl = UIKit.VLayout(_toasts, 8);
            tl.childAlignment = TextAnchor.LowerCenter;
            _menuLayer = UIKit.Rect("Menu", _safe); UIKit.Stretch(_menuLayer);
            _fps = UIKit.Label(_safe, "", 20, Theme.Muted);
            UIKit.Place(_fps.rectTransform, new Vector2(1, 0), new Vector2(1, 0), new Vector2(-12, 8), new Vector2(200, 30));
            _game.gameObject.SetActive(false);

            Session.SessionStarted += OnSessionStarted;
            Session.SessionEnded += () => { _game.gameObject.SetActive(false); ClearMarkers(); ShowMainMenu(); };
            CameraCtl.Tapped += OnWorldTap;
            ShowMainMenu();
        }

        private void ApplySafeArea()
        {
            var sa = Screen.safeArea;
            _lastSafe = sa;
            if (Screen.width <= 0 || Screen.height <= 0) return;
            _safe.anchorMin = new Vector2(sa.xMin / Screen.width, sa.yMin / Screen.height);
            _safe.anchorMax = new Vector2(sa.xMax / Screen.width, sa.yMax / Screen.height);
            _safe.offsetMin = _safe.offsetMax = Vector2.zero;
        }

        // ================= Верхня панель =================
        private void BuildHud()
        {
            _hud = UIKit.Panel(_game, Theme.Bg, "HUD", false).rectTransform;
            _hud.anchorMin = new Vector2(0, 1); _hud.anchorMax = new Vector2(1, 1); _hud.pivot = new Vector2(0.5f, 1);
            _hud.offsetMin = new Vector2(0, -100); _hud.offsetMax = Vector2.zero;
            var row = UIKit.HLayout(_hud, 18, 0);
            row.padding = new RectOffset(16, 16, 8, 8);
            row.childAlignment = TextAnchor.MiddleLeft;

            var logo = UIKit.Rect("Logo", _hud); UIKit.Size(logo, 230);
            UIKit.VLayout(logo, 0).childAlignment = TextAnchor.MiddleLeft;
            UIKit.Size(UIKit.Label(logo, "BUSINESS EMPIRE", 26, Theme.Gold, TextAnchor.MiddleLeft, FontStyle.Bold), -1, 34);
            UIKit.Size(UIKit.Label(logo, "ULTIMATE", 20, Theme.GoldDark, TextAnchor.MiddleLeft, FontStyle.Bold), -1, 26);

            var who = UIKit.Rect("Player", _hud); UIKit.Size(who, 300);
            UIKit.HLayout(who, 12).childAlignment = TextAnchor.MiddleLeft;
            var av = UIKit.Panel(who, Theme.Panel2, "Avatar"); av.sprite = UIKit.Circle; UIKit.Size(av, 70, 70);
            _avatarText = UIKit.Label(av.transform, "", 28, Theme.Gold, TextAnchor.MiddleCenter, FontStyle.Bold); UIKit.Stretch(_avatarText.rectTransform);
            var names = UIKit.Rect("Names", who); UIKit.Size(names, 210);
            UIKit.VLayout(names, 0).childAlignment = TextAnchor.MiddleLeft;
            _player = UIKit.Label(names, "", 24, Theme.Text, TextAnchor.MiddleLeft, FontStyle.Bold); UIKit.Size(_player, -1, 32);
            _company = UIKit.Label(names, "", 20, Theme.Muted); UIKit.Size(_company, -1, 28);

            var money = UIKit.Panel(_hud, Theme.Panel2, "Money"); UIKit.Size(money, 330);
            UIKit.VLayout(money, 0).padding = new RectOffset(16, 12, 6, 6);
            _balance = UIKit.Label(money.transform, "", 32, Theme.Text, TextAnchor.MiddleLeft, FontStyle.Bold); UIKit.Size(_balance, -1, 42);
            _today = UIKit.Label(money.transform, "", 19, Theme.Muted); UIKit.Size(_today, -1, 30);

            var date = UIKit.Panel(_hud, Theme.Panel2, "Date"); UIKit.Size(date, 280);
            UIKit.VLayout(date, 0).padding = new RectOffset(16, 12, 6, 6);
            _date = UIKit.Label(date.transform, "", 22, Theme.Text, TextAnchor.MiddleLeft, FontStyle.Bold); UIKit.Size(_date, -1, 36);
            _time = UIKit.Label(date.transform, "", 20, Theme.Muted); UIKit.Size(_time, -1, 30);

            var speeds = UIKit.Rect("Speeds", _hud); UIKit.Size(speeds, 360);
            UIKit.HLayout(speeds, 6).childForceExpandWidth = true;
            var labels = new[] { "II", "►", "►►", "►►►" };
            for (var i = 0; i < labels.Length; i++)
            {
                var idx = i;
                var b = UIKit.Button(speeds, labels[i], () => Session.SetSpeed(idx), Theme.Panel2, Theme.Text, 26);
                UIKit.Size(b, 84, 68);
                _speedButtons.Add(b.GetComponent<Image>());
            }
        }

        private void BuildNav()
        {
            var nav = UIKit.Panel(_game, Theme.Bg, "Nav");
            var rt = nav.rectTransform;
            rt.anchorMin = new Vector2(0, 0); rt.anchorMax = new Vector2(0, 1); rt.pivot = new Vector2(0, 1);
            rt.offsetMin = new Vector2(8, 10); rt.offsetMax = new Vector2(240, -108);
            var l = UIKit.VLayout(nav, 8, 10);
            l.childAlignment = TextAnchor.UpperCenter;
            void Item(string text, Action a)
            {
                var b = UIKit.Button(nav.transform, text, a, Theme.Panel2, Theme.Text, 24);
                UIKit.Size(b, -1, 74);
                b.GetComponentInChildren<Text>().alignment = TextAnchor.MiddleLeft;
            }
            Item("  Головна", CloseWindow);
            Item("  Компанії", () => ShowPanel(new CompaniesPanel()));
            Item("  Фінанси", () => ShowPanel(new FinancePanel()));
            Item("  Ринок", () => ShowPanel(new MarketPanel()));
            Item("  Персонал", () => ShowPanel(new StaffPanel()));
            Item("  Меню", () => { Session.SetSpeed(0); ShowGameMenu(); });
        }

        private void BuildRightColumn()
        {
            _rightCol = UIKit.Rect("Right", _game);
            _rightCol.anchorMin = new Vector2(1, 0); _rightCol.anchorMax = new Vector2(1, 1); _rightCol.pivot = new Vector2(1, 1);
            _rightCol.offsetMin = new Vector2(-420, 10); _rightCol.offsetMax = new Vector2(-10, -108);
            UIKit.VLayout(_rightCol, 10);

            var news = UIKit.Panel(_rightCol, Theme.Bg, "News"); UIKit.Size(news, -1, 420, -1, 1);
            UIKit.VLayout(news, 4, 14);
            UIKit.Size(UIKit.Label(news.transform, "Новини економіки", 26, Theme.Gold, TextAnchor.MiddleLeft, FontStyle.Bold), -1, 40);
            _newsList = UIKit.Rect("List", news.transform); UIKit.Size(_newsList, -1, -1, -1, 1);
            UIKit.VLayout(_newsList, 4);

            var econ = UIKit.Panel(_rightCol, Theme.Bg, "Economy"); UIKit.Size(econ, -1, 300);
            UIKit.VLayout(econ, 2, 14);
            UIKit.Size(UIKit.Label(econ.transform, "Економіка міста", 26, Theme.Gold, TextAnchor.MiddleLeft, FontStyle.Bold), -1, 40);
            _econList = UIKit.Rect("List", econ.transform); UIKit.Size(_econList, -1, -1, -1, 1);
            UIKit.VLayout(_econList, 2);
        }

        // ================= Сесія та події =================
        private void OnSessionStarted()
        {
            UIKit.Clear(_menuLayer);
            _game.gameObject.SetActive(true);
            _news.Clear();
            CloseWindow();
            var sim = Session.Sim;
            sim.Bus.Subscribe<NotificationEvent>(e => { Toast(e.Message, e.Severity); AddNews(e.Message, e.Severity); });
            sim.Bus.Subscribe<StateChangedEvent>(_ => MarkDirty());
            sim.Bus.Subscribe<HourPassedEvent>(_ => MarkDirty());
            sim.Bus.Subscribe<DayClosedEvent>(e =>
            {
                var r = e.Report;
                if (r.Stores.Count > 0) AddNews($"День {r.Day}: виручка {r.Revenue.Format()}, прибуток {r.NetProfit.Format()}", r.NetProfit.IsNegative ? Severity.Bad : Severity.Good);
                MarkDirty();
            });
            sim.Bus.Subscribe<BankruptcyEvent>(e => ShowBankruptcy(e.Day));
            MainMenu.ApplyPrefs(this);
            City.Build(sim.State);
            RefreshWorldSettings();
            City.GetComponent<DayNightCycle>().Init(sim.State);
            BuildMarkers();
            CameraCtl.FocusOn(Vector3.zero, 110);
            var initials = "";
            foreach (var part in sim.State.PlayerName.Split(' ')) if (part.Length > 0 && initials.Length < 2) initials += part[0];
            _avatarText.text = initials.ToUpperInvariant();
            _player.text = sim.State.PlayerName;
            _company.text = sim.State.CompanyName;
            RefreshEconomy();
        }

        public void MarkDirty() => _dirty = true;

        /// <summary>Застосовує налаштування якості до світу (кількість пішоходів і машин).</summary>
        public void RefreshWorldSettings()
        {
            if (Session.Sim == null) return;
            City.GetComponent<CrowdAndTraffic>().Init(Session.Sim.State, Session.Sim.State.Settings.MaxPedestrians);
        }

        private void AddNews(string text, Severity sev)
        {
            if (Session.Sim == null) return;
            _news.Insert(0, (Session.Sim.State.Clock.TimeLabel, text, sev));
            if (_news.Count > 7) _news.RemoveAt(_news.Count - 1);
            UIKit.Clear(_newsList);
            foreach (var n in _news)
            {
                var row = UIKit.Rect("N", _newsList);
                UIKit.HLayout(row, 10).childAlignment = TextAnchor.UpperLeft;
                UIKit.Size(UIKit.Label(row, n.time, 19, Theme.Muted, TextAnchor.UpperLeft), 64);
                var t = UIKit.Label(row, n.text, 19, SevColor(n.sev), TextAnchor.UpperLeft);
                UIKit.Size(t, -1, -1, 1);
            }
        }

        private void RefreshEconomy()
        {
            if (Session.Sim == null) return;
            var m = Session.Sim.State.Macro;
            UIKit.Clear(_econList);
            void R(string k, string v, Color c)
            {
                var row = UIKit.Row(_econList, 34);
                UIKit.Size(UIKit.Label(row, k, 21, Theme.Muted), -1, -1, 1);
                UIKit.Size(UIKit.Label(row, v, 21, c, TextAnchor.MiddleRight, FontStyle.Bold), 150);
            }
            R("Інфляція", (m.Inflation * 100).ToString("0.0") + "%", m.Inflation > 0.06 ? Theme.Red : m.Inflation < 0 ? Theme.Blue : Theme.Text);
            R("Облікова ставка", (m.KeyRate * 100).ToString("0.00") + "%", Theme.Text);
            R("Безробіття", (m.Unemployment * 100).ToString("0.0") + "%", Theme.Text);
            R("Купівельна спроможн.", "×" + m.PurchasingPower.ToString("0.00"), m.PurchasingPower >= 1 ? Theme.Green : Theme.Red);
            R("Рівень цін", "×" + m.PriceLevel.ToString("0.000"), Theme.Text);
            R("Споживча впевненість", "×" + m.Confidence.ToString("0.00"), m.Confidence >= 1 ? Theme.Green : Theme.Red);
        }

        public static Color SevColor(Severity s) => s == Severity.Good ? Theme.Green : s == Severity.Bad ? Theme.Red : s == Severity.Warning ? Theme.Gold : Theme.Text;

        public void Toast(string text, Severity sev = Severity.Info)
        {
            while (_toasts.childCount >= 3) DestroyImmediate(_toasts.GetChild(0).gameObject);
            var bg = sev == Severity.Bad ? Theme.Hex("7A1F27", 0.95f) : sev == Severity.Good ? Theme.Hex("17553A", 0.95f) : Theme.Hex("172E4D", 0.95f);
            var p = UIKit.Panel(_toasts, bg, "Toast");
            UIKit.Size(p, 860, -1);
            var l = UIKit.VLayout(p, 0, 14); l.padding = new RectOffset(22, 22, 12, 12);
            UIKit.Label(p.transform, text, 24, Theme.Text, TextAnchor.MiddleCenter);
            Destroy(p.gameObject, 3.5f);
        }

        // ================= Вікна =================
        public void ShowPanel(PanelBase panel)
        {
            panel.Root = this;
            _panel = panel;
            UIKit.Clear(_windowHost);
            var win = UIKit.Panel(_windowHost, Theme.Panel, "Window");
            UIKit.Stretch(win.rectTransform);
            var header = UIKit.Rect("Header", win.transform);
            header.anchorMin = new Vector2(0, 1); header.anchorMax = new Vector2(1, 1); header.pivot = new Vector2(0.5f, 1);
            header.offsetMin = new Vector2(24, -80); header.offsetMax = new Vector2(-16, -8);
            UIKit.HLayout(header, 10).childAlignment = TextAnchor.MiddleLeft;
            _panelTitle = UIKit.Label(header, panel.Title, 34, Theme.Gold, TextAnchor.MiddleLeft, FontStyle.Bold);
            UIKit.Size(_panelTitle, -1, -1, 1);
            UIKit.Size(UIKit.Button(header, "×", CloseWindow, Theme.Panel2, Theme.Text, 30), 72, 64);
            var body = UIKit.Rect("Body", win.transform);
            UIKit.Stretch(body, 20, 90, 10, 12);
            _panelContent = UIKit.Scroll(body, out _panelScroll);
            _rightCol.gameObject.SetActive(false);
            Rebuild(true);
        }

        public void CloseWindow()
        {
            _panel = null;
            UIKit.Clear(_windowHost);
            if (_rightCol != null) _rightCol.gameObject.SetActive(true);
            if (City != null && Session.Sim != null) City.Select(null, Session.Sim.State);
        }

        private void Rebuild(bool resetScroll)
        {
            if (_panel == null || _panelContent == null) return;
            var pos = _panelScroll != null ? _panelScroll.verticalNormalizedPosition : 1f;
            UIKit.Clear(_panelContent);
            _panelTitle.text = _panel.Title;
            try { _panel.Build(_panelContent); }
            catch (Exception e) { Debug.LogException(e); UIKit.Label(_panelContent, "Помилка вікна: " + e.Message, 22, Theme.Red); }
            if (!resetScroll)
            {
                Canvas.ForceUpdateCanvases();
                _panelScroll.verticalNormalizedPosition = pos;
            }
            _lastRebuild = Time.unscaledTime;
        }

        // ================= Світ =================
        private void OnWorldTap(Ray ray)
        {
            if (Session.Sim == null || _menuLayer.childCount > 0) return;
            var id = City.Pick(ray);
            if (id == null) { CloseWindow(); return; }
            OpenPremises(id);
        }

        public void OpenPremises(string id)
        {
            City.Select(id, Session.Sim.State);
            var p = Session.Sim.State.City.GetPremises(id);
            if (p.StoreId != null) ShowPanel(new StorePanel(p.StoreId));
            else ShowPanel(new PremisesPanel(id));
        }

        public void FocusPremises(string id)
        {
            var p = Session.Sim.State.City.GetPremises(id);
            CameraCtl.FocusOn(new Vector3(p.X, 0, p.Z), 60);
            City.Select(id, Session.Sim.State);
        }

        private void BuildMarkers()
        {
            ClearMarkers();
            foreach (var p in Session.Sim.State.City.Premises)
            {
                var bg = UIKit.Panel(_markers, Theme.Hex("0A1424", 0.82f), "Marker");
                bg.raycastTarget = false;
                UIKit.Place(bg.rectTransform, new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0), Vector2.zero, new Vector2(240, 40));
                var t = UIKit.Label(bg.transform, "", 20, Theme.Text, TextAnchor.MiddleCenter, FontStyle.Bold);
                UIKit.Stretch(t.rectTransform, 8, 2, 8, 2);
                _markerLabels[p.Id] = t;
            }
        }

        private void ClearMarkers()
        {
            UIKit.Clear(_markers);
            _markerLabels.Clear();
        }

        private void UpdateMarkers()
        {
            var s = Session.Sim.State;
            var cam = Cam;
            var showAll = CameraCtl.Distance < 140;
            foreach (var kv in _markerLabels)
            {
                var p = s.City.GetPremises(kv.Key);
                var bg = (RectTransform)kv.Value.transform.parent;
                if (!City.Premises.TryGetValue(kv.Key, out var view)) { bg.gameObject.SetActive(false); continue; }
                var sp = cam.WorldToScreenPoint(view.LabelPoint);
                var mine = p.IsControlledByPlayer;
                var visible = sp.z > 0 && (showAll || mine);
                bg.gameObject.SetActive(visible);
                if (!visible) continue;
                RectTransformUtility.ScreenPointToLocalPointInRectangle(_markers, sp, null, out var local);
                bg.anchoredPosition = local;
                string text; Color color;
                if (p.StoreId != null) { var st = s.GetStore(p.StoreId); text = st.Name; color = Theme.Gold; }
                else if (p.IsControlledByPlayer) { text = "Ваше приміщення"; color = Theme.Gold; }
                else if (p.Tenure == Tenure.Competitor) { text = p.CompetitorName; color = Theme.Red; }
                else { text = $"Оренда {Session.Sim.RealEstate.DailyRent(p).Format()}/д · {p.AreaM2} м²"; color = Theme.Green; }
                kv.Value.text = text;
                kv.Value.color = color;
                bg.sizeDelta = new Vector2(Mathf.Clamp(text.Length * 11 + 30, 140, 360), 40);
            }
        }

        // ================= Меню =================
        public void ShowMainMenu() => MainMenu.Show(this, _menuLayer);
        private void ShowGameMenu() => MainMenu.ShowInGame(this, _menuLayer);

        private void ShowBankruptcy(int day)
        {
            Session.SetSpeed(0);
            MainMenu.Modal(_menuLayer, "Банкрутство", $"Компанія «{Session.Sim.State.CompanyName}» три дні поспіль мала від’ємний баланс і на {day}-й день оголосила банкрутство.",
                ("У головне меню", () => { Session.Saves.DeleteAll(); Session.EndSession(); }));
        }

        public RectTransform MenuLayer => _menuLayer;

        /// <summary>Підтвердження незворотної дії.</summary>
        public void Confirm(string text, Action onYes)
            => MainMenu.Modal(_menuLayer, "Підтвердження", text, ("Скасувати", null), ("Так", () => { onYes(); MarkDirty(); }));

        // ================= Кадр =================
        private void Update()
        {
            if (Screen.safeArea != _lastSafe) ApplySafeArea();
            _fpsAcc += Time.unscaledDeltaTime; _fpsFrames++;
            if (_fpsAcc >= 0.5f)
            {
                var show = Session.Sim != null && Session.Sim.State.Settings.ShowFps;
                _fps.text = show ? $"{_fpsFrames / _fpsAcc:0} FPS" : "";
                _fpsAcc = 0; _fpsFrames = 0;
            }
            var sim = Session.Sim;
            if (sim == null) return;
            var s = sim.State;

            _balance.text = s.Account.Balance.Format();
            _balance.color = s.Account.Balance.IsNegative ? Theme.Red : Theme.Text;
            Money inc = Money.Zero, exp = Money.Zero;
            for (var i = s.Account.History.Count - 1; i >= 0; i--)
            {
                var tx = s.Account.History[i];
                if (tx.Day != sim.Day) break;
                if (tx.Amount.IsNegative) exp -= tx.Amount; else inc += tx.Amount;
            }
            _today.text = $"сьогодні {UIKit.Colored("+" + inc.FormatShort(), Theme.Green)}  {UIKit.Colored("−" + exp.FormatShort(), Theme.Red)}";
            _date.text = s.Clock.DateLabel;
            _time.text = $"{s.Clock.TimeLabel} · день {s.Clock.Day} · {TimeSpeeds.Labels[Session.Speed]}";
            for (var i = 0; i < _speedButtons.Count; i++) _speedButtons[i].color = i == Session.Speed ? Theme.Gold : Theme.Panel2;

            UpdateMarkers();
            if (_dirty && Time.unscaledTime - _lastRebuild > 0.5f)
            {
                _dirty = false;
                City.Sync(s);
                RefreshEconomy();
                if (_panel != null && _panel.Live) Rebuild(false);
            }
        }
    }
}
