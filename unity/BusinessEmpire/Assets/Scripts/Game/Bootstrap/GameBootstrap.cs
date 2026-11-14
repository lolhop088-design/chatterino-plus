using BusinessEmpire.Game.UI;
using BusinessEmpire.Game.World;
using UnityEngine;

namespace BusinessEmpire.Game.Bootstrap
{
    /// <summary>
    /// Точка входу сцени Main: створює камеру, світло, місто, сесію гри та інтерфейс.
    /// Сцена містить лише цей компонент — усе інше будується з коду (простіше підтримувати й тестувати).
    /// </summary>
    public class GameBootstrap : MonoBehaviour
    {
        private void Awake()
        {
            Application.targetFrameRate = 30;
            Screen.sleepTimeout = SleepTimeout.NeverSleep;
            Input.multiTouchEnabled = true;

            // Камера
            var camGo = new GameObject("Main Camera") { tag = "MainCamera" };
            var cam = camGo.AddComponent<Camera>();
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.fieldOfView = 32f;
            cam.nearClipPlane = 1f;
            cam.farClipPlane = 900f;
            var iso = camGo.AddComponent<IsoCameraController>();

            // Сонце
            var sunGo = new GameObject("Sun");
            var sun = sunGo.AddComponent<Light>();
            sun.type = LightType.Directional;
            sun.shadows = LightShadows.Hard;
            sun.shadowStrength = 0.6f;
            sun.color = new Color(1f, 0.96f, 0.88f);
            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;

            // Місто
            var cityGo = new GameObject("City");
            var city = cityGo.AddComponent<CityView>();
            cityGo.AddComponent<CrowdAndTraffic>();
            var dn = cityGo.AddComponent<DayNightCycle>();
            dn.Sun = sun; dn.Cam = cam; dn.City = city;

            // Сесія та інтерфейс
            var session = new GameObject("GameSession").AddComponent<GameSession>();
            var uiGo = new GameObject("UI");
            var ui = uiGo.AddComponent<UIRoot>();
            ui.Session = session;
            ui.City = city;
            ui.CameraCtl = iso;
            ui.Cam = cam;
            ui.Init();
        }
    }
}
