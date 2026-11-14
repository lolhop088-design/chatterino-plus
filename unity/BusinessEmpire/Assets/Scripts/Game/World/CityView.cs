using System.Collections.Generic;
using BusinessEmpire.Core.Economy;
using BusinessEmpire.Core.Simulation;
using BusinessEmpire.Core.World;
using UnityEngine;

namespace BusinessEmpire.Game.World
{
    /// <summary>Візуал одного приміщення; колайдер для вибору дотиком.</summary>
    public class PremisesView : MonoBehaviour
    {
        public string PremisesId;
        public string VisualKey;
        public Vector3 LabelPoint;
    }

    /// <summary>
    /// Візуалізація тестового району: статичне оточення будується один раз і зливається
    /// статичним батчингом; приміщення перебудовуються лише при зміні їхнього стану.
    /// Логіка гри сюди не потрапляє — вид лише читає GameState.
    /// </summary>
    public class CityView : MonoBehaviour
    {
        public static readonly Color Asphalt = Theme("2B2F36"), Sidewalk = Theme("9A9C9E"), Grass = Theme("4E7F3F"), Water = Theme("2E6E9E");
        private static readonly Color[] Facades = { Theme("C9C2B4"), Theme("B5A792"), Theme("8D99A6"), Theme("D8D2C4"), Theme("A7A196"), Theme("C7B9A6") };
        private static readonly Color[] Towers = { Theme("6F8FAF"), Theme("8FA7BF"), Theme("5D7A99"), Theme("A9B4C2"), Theme("7C8C9C") };
        private static readonly Dictionary<string, Color> TypeColors = new Dictionary<string, Color>
        {
            { "minimarket", Theme("2E9A5A") }, { "coffee", Theme("8B5A2B") }, { "fashion", Theme("7A5AC8") },
        };

        public readonly Dictionary<string, PremisesView> Premises = new Dictionary<string, PremisesView>();
        public Material WindowMaterial { get; private set; }
        public Material LampMaterial { get; private set; }

        private Transform _static, _dynamic;
        private GameObject _selection;
        private string _selectedId;

        private static Color Theme(string hex) { ColorUtility.TryParseHtmlString("#" + hex, out var c); return c; }

        public void Build(GameState state)
        {
            if (_static != null) Destroy(_static.gameObject);
            if (_dynamic != null) Destroy(_dynamic.gameObject);
            Premises.Clear();
            _static = new GameObject("CityStatic").transform; _static.SetParent(transform, false);
            _dynamic = new GameObject("Premises").transform; _dynamic.SetParent(transform, false);
            WindowMaterial = MaterialLibrary.UniqueUnlit(Theme("2C3E55"));
            LampMaterial = MaterialLibrary.UniqueUnlit(Theme("666666"));

            BuildGroundAndRoads();
            BuildBackground(state.Seed);
            StaticBatchingUtility.Combine(_static.gameObject);

            _selection = new GameObject("Selection");
            _selection.transform.SetParent(transform, false);
            var gold = new Color(0.96f, 0.73f, 0.25f);
            for (var i = 0; i < 4; i++) MaterialLibrary.Block(_selection.transform, "Edge" + i, Vector3.zero, Vector3.one, gold, true, false);
            _selection.SetActive(false);
            Sync(state);
        }

        private void BuildGroundAndRoads()
        {
            var s = _static;
            MaterialLibrary.Block(s, "Ground", new Vector3(0, -0.5f, 0), new Vector3(420, 1, 420), Grass, false, false);
            MaterialLibrary.Block(s, "River", new Vector3(0, -0.45f, -150), new Vector3(420, 1, 60), Water, false, false);
            // Проспект (уздовж X) і поперечні вулиці
            MaterialLibrary.Block(s, "Avenue", new Vector3(0, 0.02f, 0), new Vector3(260, 0.05f, 12), Asphalt, false, false);
            foreach (var z in new[] { -7.6f, 7.6f }) MaterialLibrary.Block(s, "Sidewalk", new Vector3(0, 0.1f, z), new Vector3(260, 0.2f, 3.2f), Sidewalk, false, false);
            for (var x = -124f; x < 124f; x += 9f) MaterialLibrary.Block(s, "Dash", new Vector3(x, 0.06f, 0), new Vector3(4f, 0.02f, 0.3f), Color.white, true, false);
            foreach (var x in new[] { -70f, 0f, 70f })
            {
                MaterialLibrary.Block(s, "Street", new Vector3(x, 0.03f, -20), new Vector3(10, 0.05f, 200), Asphalt, false, false);
                foreach (var dx in new[] { -6.4f, 6.4f }) MaterialLibrary.Block(s, "Sidewalk", new Vector3(x + dx, 0.1f, -20), new Vector3(2.8f, 0.2f, 200), Sidewalk, false, false);
            }
            foreach (var z in new[] { -38f, 38f }) MaterialLibrary.Block(s, "BackStreet", new Vector3(0, 0.03f, z), new Vector3(260, 0.05f, 8), Asphalt, false, false);
            // Набережна й міст
            MaterialLibrary.Block(s, "Quay", new Vector3(0, 0.2f, -119), new Vector3(420, 0.6f, 3), Sidewalk, false, false);
            MaterialLibrary.Block(s, "Bridge", new Vector3(0, 0.8f, -150), new Vector3(12, 0.6f, 62), Asphalt, false, true);

            // Дерева й ліхтарі вздовж проспекту
            for (var x = -118f; x <= 118f; x += 12f)
            {
                foreach (var z in new[] { -8.7f, 8.7f })
                {
                    if (Mathf.Abs(x) < 8 || Mathf.Abs(Mathf.Abs(x) - 70) < 8) continue;
                    Tree(s, new Vector3(x, 0, z * 1.0f + (z > 0 ? 0.2f : -0.2f)));
                    var pole = MaterialLibrary.Block(s, "Lamp", new Vector3(x + 6, 2.5f, z), new Vector3(0.18f, 5f, 0.18f), Theme("3A3F47"), false, false);
                    var head = MaterialLibrary.Block(s, "LampHead", new Vector3(x + 6, 5.1f, z), new Vector3(0.6f, 0.25f, 0.6f), Color.white, true, false);
                    head.GetComponent<MeshRenderer>().sharedMaterial = LampMaterial;
                    pole.name = "Lamp";
                }
            }
        }

        private static void Tree(Transform parent, Vector3 p)
        {
            MaterialLibrary.Block(parent, "Trunk", p + new Vector3(0, 1f, 0), new Vector3(0.3f, 2f, 0.3f), Theme("6B4A2F"));
            var crown = new GameObject("Crown");
            crown.transform.SetParent(parent, false);
            crown.transform.localPosition = p + new Vector3(0, 3f, 0);
            crown.transform.localScale = new Vector3(2.4f, 2.6f, 2.4f);
            crown.AddComponent<MeshFilter>().sharedMesh = MaterialLibrary.Capsule;
            crown.AddComponent<MeshRenderer>().sharedMaterial = MaterialLibrary.Lit(Theme("3F8A4A"));
        }

        /// <summary>Фонові квартали: щільна забудова, вищі вежі ближче до центру, парк і порт.</summary>
        private void BuildBackground(ulong seed)
        {
            var rng = new Core.Common.DeterministicRandom(seed ^ 0xC17C17UL);
            for (var bx = -2; bx <= 1; bx++)
            for (var bz = -2; bz <= 1; bz++)
            {
                var cx = bx * 70f + 35f; var cz = bz * 76f + 38f;
                if (Mathf.Abs(cz) < 30) continue; // ряд з ігровими приміщеннями
                if (cz < -100) continue; // річка
                var park = bx == -2 && bz == 1;
                MaterialLibrary.Block(_static, "Block", new Vector3(cx, 0.05f, cz), new Vector3(56, 0.1f, 60), park ? Theme("5D9A52") : Theme("B9B6AE"), false, false);
                if (park)
                {
                    for (var i = 0; i < 26; i++) Tree(_static, new Vector3(cx + (float)rng.Range(-24.0, 24.0), 0, cz + (float)rng.Range(-26.0, 26.0)));
                    MaterialLibrary.Block(_static, "Pond", new Vector3(cx + 6, 0.12f, cz - 4), new Vector3(16, 0.05f, 12), Water, false, false);
                    continue;
                }
                var central = Mathf.Abs(cx) < 80 && Mathf.Abs(cz) < 90;
                for (var i = 0; i < 3; i++)
                for (var j = 0; j < 3; j++)
                {
                    if (rng.NextDouble() < 0.12) continue;
                    var w = (float)rng.Range(10.0, 15.0); var d = (float)rng.Range(10.0, 15.0);
                    var h = (float)(central ? rng.Range(14.0, 60.0) : rng.Range(8.0, 26.0));
                    var pos = new Vector3(cx - 18 + i * 18, h / 2, cz - 19 + j * 19);
                    var col = central && h > 30 ? Towers[rng.Range(0, Towers.Length)] : Facades[rng.Range(0, Facades.Length)];
                    MaterialLibrary.Block(_static, "Tower", pos, new Vector3(w, h, d), col);
                    for (var f = 3f; f < h - 2; f += 3.2f)
                        MaterialLibrary.Block(_static, "Win", new Vector3(pos.x, f, pos.z - d / 2 - 0.05f), new Vector3(w * 0.84f, 1.1f, 0.1f), Color.white, true, false).GetComponent<MeshRenderer>().sharedMaterial = WindowMaterial;
                    MaterialLibrary.Block(_static, "Roof", new Vector3(pos.x, h + 0.25f, pos.z), new Vector3(w + 0.4f, 0.5f, d + 0.4f), Theme("4E5560"), false, false);
                }
            }
            // Порт на набережній
            var palette = new[] { Theme("C0392B"), Theme("2F7FD6"), Theme("27AE60"), Theme("E67E22") };
            for (var i = 0; i < 24; i++) MaterialLibrary.Block(_static, "Container", new Vector3(70 + (i % 6) * 6.5f, 1.2f + (i / 12) * 2.4f, -112 + (i / 6 % 2) * 3f), new Vector3(6f, 2.4f, 2.5f), palette[i % 4]);
            for (var i = 0; i < 2; i++)
            {
                MaterialLibrary.Block(_static, "Crane", new Vector3(80 + i * 22, 9, -117), new Vector3(1, 18, 1), Theme("E0A42A"));
                MaterialLibrary.Block(_static, "CraneArm", new Vector3(80 + i * 22, 18, -124), new Vector3(1.2f, 1.2f, 16), Theme("E0A42A"));
            }
        }

        /// <summary>Приводить вигляд приміщень у відповідність до стану гри (перебудова лише змінених).</summary>
        public void Sync(GameState state)
        {
            foreach (var p in state.City.Premises)
            {
                var key = Key(state, p);
                if (Premises.TryGetValue(p.Id, out var view) && view.VisualKey == key) continue;
                if (view != null) Destroy(view.gameObject);
                Premises[p.Id] = BuildPremises(state, p, key);
            }
        }

        private static string Key(GameState s, Premises p)
        {
            var store = p.StoreId != null ? s.GetStore(p.StoreId) : null;
            return $"{p.Tenure}|{p.CompetitorTypeId}|{store?.TypeId}|{store?.Name}";
        }

        private PremisesView BuildPremises(GameState state, Premises p, string key)
        {
            var go = new GameObject("Premises_" + p.Id);
            go.transform.SetParent(_dynamic, false);
            go.transform.localPosition = new Vector3(p.X, 0, p.Z);
            var view = go.AddComponent<PremisesView>();
            view.PremisesId = p.Id;
            view.VisualKey = key;
            var t = go.transform;
            var w = p.Width; var d = p.Depth;
            var face = p.Facing == 1 ? -1f : 1f; // напрямок до проспекту по Z
            var store = p.StoreId != null ? state.GetStore(p.StoreId) : null;
            var typeId = store?.TypeId ?? p.CompetitorTypeId;
            var accent = typeId != null && TypeColors.TryGetValue(typeId, out var tc) ? tc : Theme("8A8F99");

            MaterialLibrary.Block(t, "Lot", new Vector3(0, 0.12f, 0), new Vector3(w + 1.2f, 0.25f, d + 1.2f), Theme("A9AAA6"), false, false);
            var floors = p.Floors;
            var height = 4.2f + (floors - 1) * 3.2f;
            var facade = Facades[(p.Id.GetHashCode() & 0x7fffffff) % Facades.Length];
            // Верхні поверхи
            MaterialLibrary.Block(t, "Upper", new Vector3(0, 4.2f + (height - 4.2f) / 2, 0), new Vector3(w, height - 4.2f, d), facade);
            for (var f = 5.6f; f < height - 0.8f; f += 3.2f)
                MaterialLibrary.Block(t, "Win", new Vector3(0, f, face * (d / 2 + 0.05f)), new Vector3(w * 0.86f, 1.2f, 0.1f), Color.white, true, false).GetComponent<MeshRenderer>().sharedMaterial = WindowMaterial;
            MaterialLibrary.Block(t, "Roof", new Vector3(0, height + 0.3f, 0), new Vector3(w + 0.4f, 0.6f, d + 0.4f), Theme("3B414C"));

            // Перший поверх: вітрина, двері, маркіза
            var groundColor = p.Tenure == Tenure.Available ? Theme("7D838C") : p.Tenure == Tenure.Competitor ? Theme("8E7F75") : store == null ? Theme("C9A227") : accent;
            MaterialLibrary.Block(t, "Ground", new Vector3(0, 2.1f, 0), new Vector3(w, 4.2f, d), groundColor);
            var glass = p.Tenure == Tenure.Available ? Theme("3A4350") : Theme("9FD3F0");
            MaterialLibrary.Block(t, "Glass", new Vector3(0, 1.9f, face * (d / 2 + 0.06f)), new Vector3(w * 0.8f, 2.6f, 0.1f), glass, true, false);
            if (typeId != null || store != null)
                MaterialLibrary.Block(t, "Awning", new Vector3(0, 3.6f, face * (d / 2 + 0.9f)), new Vector3(w * 0.9f, 0.3f, 1.8f), accent);
            // Вивіска
            var signColor = p.Tenure == Tenure.Available ? Theme("2E9A5A") : p.IsControlledByPlayer ? Theme("F5B941") : Theme("A33D2D");
            MaterialLibrary.Block(t, "Sign", new Vector3(0, 4.6f, face * (d / 2 + 0.15f)), new Vector3(w * 0.6f, 0.8f, 0.2f), signColor, true, false);
            if (p.Tenure == Tenure.Available)
            {
                MaterialLibrary.Block(t, "ForRentPost", new Vector3(w / 2 - 1, 1.2f, face * (d / 2 + 2.2f)), new Vector3(0.15f, 2.4f, 0.15f), Theme("555555"));
                MaterialLibrary.Block(t, "ForRentBoard", new Vector3(w / 2 - 1, 2.4f, face * (d / 2 + 2.2f)), new Vector3(2.2f, 1.1f, 0.1f), Theme("2E9A5A"), true, false);
            }
            // Клієнти біля дверей — лише для своїх відкритих магазинів (візуальний зворотний зв’язок)
            var col = go.AddComponent<BoxCollider>();
            col.center = new Vector3(0, height / 2, 0);
            col.size = new Vector3(w + 1, height + 1, d + 1);
            view.LabelPoint = go.transform.position + new Vector3(0, height + 2.5f, 0);
            return view;
        }

        public void Select(string premisesId, GameState state)
        {
            _selectedId = premisesId;
            var p = premisesId != null ? state.City.GetPremises(premisesId) : null;
            _selection.SetActive(p != null);
            if (p == null) return;
            var w = p.Width + 2.4f; var d = p.Depth + 2.4f;
            var edges = _selection.transform;
            edges.localPosition = new Vector3(p.X, 0.3f, p.Z);
            edges.GetChild(0).localPosition = new Vector3(0, 0, d / 2); edges.GetChild(0).localScale = new Vector3(w, 0.15f, 0.45f);
            edges.GetChild(1).localPosition = new Vector3(0, 0, -d / 2); edges.GetChild(1).localScale = new Vector3(w, 0.15f, 0.45f);
            edges.GetChild(2).localPosition = new Vector3(w / 2, 0, 0); edges.GetChild(2).localScale = new Vector3(0.45f, 0.15f, d);
            edges.GetChild(3).localPosition = new Vector3(-w / 2, 0, 0); edges.GetChild(3).localScale = new Vector3(0.45f, 0.15f, d);
        }

        public string Pick(Ray ray)
        {
            if (Physics.Raycast(ray, out var hit, 2000f))
            {
                var v = hit.collider.GetComponentInParent<PremisesView>();
                if (v != null) return v.PremisesId;
            }
            return null;
        }

        private void Update()
        {
            if (_selection != null && _selection.activeSelf)
                _selection.transform.localScale = Vector3.one * (1f + Mathf.Sin(Time.unscaledTime * 4f) * 0.02f);
        }
    }
}
