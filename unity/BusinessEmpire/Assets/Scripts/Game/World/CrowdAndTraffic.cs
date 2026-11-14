using System.Collections.Generic;
using BusinessEmpire.Core.Simulation;
using UnityEngine;
using UnityEngine.Rendering;

namespace BusinessEmpire.Game.World
{
    /// <summary>
    /// Пішоходи й машини через GPU instancing (Graphics.DrawMeshInstanced): жодних GameObject
    /// на кожного жителя. Кількість обмежена налаштуванням якості й масштабується від потоку
    /// людей у районі за поточною годиною (той самий профіль, що використовує економіка).
    /// </summary>
    public class CrowdAndTraffic : MonoBehaviour
    {
        private const int Groups = 4;
        private struct Walker { public Vector3 A, B; public float T, Speed; public int Group; }
        private struct Car { public float Pos, Speed, Lane; public bool AlongX; public int Group; }

        private readonly List<Walker> _walkers = new List<Walker>();
        private readonly List<Car> _cars = new List<Car>();
        private Matrix4x4[][] _walkerBatches, _carBatches;
        private int[] _walkerCounts, _carCounts;
        private Material[] _walkerMats, _carMats;
        private GameState _state;
        private System.Random _rng;

        public void Init(GameState state, int maxPedestrians)
        {
            _state = state;
            _rng = new System.Random((int)(state.Seed & 0x7fffffff));
            _walkers.Clear(); _cars.Clear();
            var shirt = new[] { Hex("E05D5D"), Hex("4F8FE0"), Hex("F0C04A"), Hex("5BBF7A") };
            var paint = new[] { Hex("D64A3A"), Hex("2F7FD6"), Hex("EEEEEE"), Hex("2B2B2B") };
            _walkerMats = new Material[Groups]; _carMats = new Material[Groups];
            for (var g = 0; g < Groups; g++) { _walkerMats[g] = MaterialLibrary.Lit(shirt[g]); _carMats[g] = MaterialLibrary.Lit(paint[g]); }

            for (var i = 0; i < maxPedestrians; i++)
            {
                Vector3 a, b;
                if (_rng.NextDouble() < 0.75)
                {
                    var z = (_rng.NextDouble() < 0.5 ? -1 : 1) * (7.0f + (float)_rng.NextDouble() * 1.2f);
                    a = new Vector3(-125, 0, z); b = new Vector3(125, 0, z);
                }
                else
                {
                    var x = new[] { -70f, 0f, 70f }[_rng.Next(3)] + (_rng.NextDouble() < 0.5 ? -6.4f : 6.4f);
                    a = new Vector3(x, 0, -115); b = new Vector3(x, 0, 75);
                }
                if (_rng.NextDouble() < 0.5) { var tmp = a; a = b; b = tmp; }
                _walkers.Add(new Walker { A = a, B = b, T = (float)_rng.NextDouble(), Speed = 0.004f + (float)_rng.NextDouble() * 0.003f, Group = _rng.Next(Groups) });
            }
            var carCount = Mathf.Max(8, maxPedestrians / 6);
            for (var i = 0; i < carCount; i++)
            {
                var alongX = _rng.NextDouble() < 0.65;
                var dir = _rng.NextDouble() < 0.5 ? 1f : -1f;
                var lane = alongX ? dir * 2.8f : new[] { -70f, 0f, 70f }[_rng.Next(3)] + dir * -2.4f;
                _cars.Add(new Car { AlongX = alongX, Lane = lane, Pos = (float)(_rng.NextDouble() * 240 - 120), Speed = dir * (9f + (float)_rng.NextDouble() * 7f), Group = _rng.Next(Groups) });
            }
            _walkerBatches = Alloc(maxPedestrians, out _walkerCounts);
            _carBatches = Alloc(carCount, out _carCounts);
        }

        private static Matrix4x4[][] Alloc(int n, out int[] counts)
        {
            var arr = new Matrix4x4[Groups][];
            for (var g = 0; g < Groups; g++) arr[g] = new Matrix4x4[Mathf.Min(1023, n)];
            counts = new int[Groups];
            return arr;
        }

        private static Color Hex(string h) { ColorUtility.TryParseHtmlString("#" + h, out var c); return c; }

        /// <summary>Частка активних жителів за годиною — з профілю району, як в економіці.</summary>
        private float Activity()
        {
            if (_state == null || _state.City.Districts.Count == 0) return 0.5f;
            var d = _state.City.Districts[0];
            var now = _state.Clock.Now;
            var a = (float)d.Traffic[now.Hour];
            var b = (float)d.Traffic[(now.Hour + 1) % 24];
            return Mathf.Lerp(a, b, now.Minute / 60f);
        }

        private void LateUpdate()
        {
            if (_state == null || _walkerMats == null) return;
            var dt = Time.deltaTime;
            var act = Mathf.Clamp01(Activity());
            for (var g = 0; g < Groups; g++) { _walkerCounts[g] = 0; _carCounts[g] = 0; }

            var activeWalkers = Mathf.RoundToInt(_walkers.Count * act);
            var scale = new Vector3(0.55f, 0.9f, 0.55f);
            for (var i = 0; i < _walkers.Count; i++)
            {
                var w = _walkers[i];
                w.T += w.Speed * dt * 10f;
                if (w.T > 1f) w.T -= 1f;
                _walkers[i] = w;
                if (i >= activeWalkers) continue;
                var pos = Vector3.Lerp(w.A, w.B, w.T) + Vector3.up * (0.9f + Mathf.Abs(Mathf.Sin((Time.time + i) * 9f)) * 0.06f);
                var c = _walkerCounts[w.Group];
                if (c >= _walkerBatches[w.Group].Length) continue;
                _walkerBatches[w.Group][c] = Matrix4x4.TRS(pos, Quaternion.identity, scale);
                _walkerCounts[w.Group] = c + 1;
            }

            var activeCars = Mathf.RoundToInt(_cars.Count * (0.25f + 0.75f * act));
            var carScale = new Vector3(1.9f, 1.3f, 4.2f);
            for (var i = 0; i < _cars.Count; i++)
            {
                var car = _cars[i];
                car.Pos += car.Speed * dt;
                if (car.Pos > 125) car.Pos = -125; else if (car.Pos < -125) car.Pos = 125;
                _cars[i] = car;
                if (i >= activeCars) continue;
                var pos = car.AlongX ? new Vector3(car.Pos, 0.75f, car.Lane) : new Vector3(car.Lane, 0.75f, Mathf.Clamp(car.Pos * 0.8f - 20f, -118f, 78f));
                var rot = car.AlongX ? Quaternion.Euler(0, car.Speed > 0 ? 90 : -90, 0) : Quaternion.Euler(0, car.Speed > 0 ? 0 : 180, 0);
                var c = _carCounts[car.Group];
                if (c >= _carBatches[car.Group].Length) continue;
                _carBatches[car.Group][c] = Matrix4x4.TRS(pos, rot, carScale);
                _carCounts[car.Group] = c + 1;
            }

            for (var g = 0; g < Groups; g++)
            {
                if (_walkerCounts[g] > 0) Graphics.DrawMeshInstanced(MaterialLibrary.Capsule, 0, _walkerMats[g], _walkerBatches[g], _walkerCounts[g], null, ShadowCastingMode.Off, false);
                if (_carCounts[g] > 0) Graphics.DrawMeshInstanced(MaterialLibrary.Cube, 0, _carMats[g], _carBatches[g], _carCounts[g], null, ShadowCastingMode.Off, false);
            }
        }
    }

    /// <summary>Зміна дня й ночі за ігровим годинником: сонце, небо, світло у вікнах і ліхтарях.</summary>
    public class DayNightCycle : MonoBehaviour
    {
        public Light Sun;
        public Camera Cam;
        public CityView City;
        private GameState _state;
        private static readonly Color DaySky = new Color(0.55f, 0.74f, 0.92f), NightSky = new Color(0.04f, 0.07f, 0.14f), DuskSky = new Color(0.95f, 0.6f, 0.4f);
        private static readonly Color WindowsDay = new Color(0.17f, 0.24f, 0.33f), WindowsNight = new Color(1f, 0.82f, 0.45f);

        public void Init(GameState s) { _state = s; }

        private void LateUpdate()
        {
            if (_state == null || Sun == null) return;
            // У URP тіні керуються світлом/ассетом, а не QualitySettings: на низькій якості вимикаємо їх тут.
            var wantShadows = _state.Settings.GraphicsQuality == 0 ? LightShadows.None : LightShadows.Hard;
            if (Sun.shadows != wantShadows) Sun.shadows = wantShadows;
            var now = _state.Clock.Now;
            var h = now.Hour + now.Minute / 60f;
            // Світловий день 6:00–20:00
            var day = Mathf.Clamp01(Mathf.InverseLerp(5.5f, 7.5f, h)) * Mathf.Clamp01(Mathf.InverseLerp(20.5f, 18.5f, h));
            var sunAngle = Mathf.Lerp(-10f, 190f, Mathf.InverseLerp(6f, 20f, h));
            Sun.transform.rotation = Quaternion.Euler(Mathf.Clamp(sunAngle, 5f, 175f) * 0.5f + 10f, 210f + h * 7.5f, 0);
            Sun.intensity = Mathf.Lerp(0.05f, 1.15f, day);
            var dusk = Mathf.Clamp01(1f - Mathf.Abs(h - 19f) / 1.5f) + Mathf.Clamp01(1f - Mathf.Abs(h - 6.5f) / 1.2f);
            var sky = Color.Lerp(NightSky, DaySky, day);
            sky = Color.Lerp(sky, DuskSky, Mathf.Clamp01(dusk) * 0.45f);
            if (Cam != null) Cam.backgroundColor = sky;
            RenderSettings.ambientLight = Color.Lerp(new Color(0.18f, 0.2f, 0.3f), new Color(0.62f, 0.64f, 0.68f), day);
            if (City != null && City.WindowMaterial != null)
            {
                MaterialLibrary.SetColor(City.WindowMaterial, Color.Lerp(WindowsNight, WindowsDay, day));
                MaterialLibrary.SetColor(City.LampMaterial, Color.Lerp(new Color(1f, 0.85f, 0.55f), new Color(0.4f, 0.4f, 0.4f), day));
            }
        }
    }
}
