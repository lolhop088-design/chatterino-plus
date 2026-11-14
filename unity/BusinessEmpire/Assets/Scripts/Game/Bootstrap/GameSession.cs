using System;
using System.IO;
using BusinessEmpire.Core.Common;
using BusinessEmpire.Core.Events;
using BusinessEmpire.Core.Save;
using BusinessEmpire.Core.Simulation;
using BusinessEmpire.Core.Time;
using UnityEngine;

namespace BusinessEmpire.Game.Bootstrap
{
    /// <summary>Файлове сховище збережень у Application.persistentDataPath.</summary>
    public class FileStorage : ISaveStorage
    {
        private readonly string _dir;
        public FileStorage(string dir) { _dir = dir; Directory.CreateDirectory(dir); }
        private string P(string name) => Path.Combine(_dir, name);
        public bool Exists(string name) => File.Exists(P(name));
        public string Read(string name) => File.ReadAllText(P(name));
        public void Write(string name, string content) => File.WriteAllText(P(name), content);
        public void Delete(string name) { if (File.Exists(P(name))) File.Delete(P(name)); }
        public void Move(string from, string to) { if (File.Exists(P(to))) File.Delete(P(to)); File.Move(P(from), P(to)); }
    }

    /// <summary>
    /// Поточна ігрова сесія: симуляція, збереження і швидкість часу. Логіка гри живе в ядрі
    /// (BusinessEmpire.Core) — тут лише прив’язка до кадрів Unity.
    /// </summary>
    public class GameSession : MonoBehaviour
    {
        public static GameSession Instance { get; private set; }

        public GameSimulation Sim { get; private set; }
        public SaveService Saves { get; private set; }
        public int Speed { get; private set; } = 1;
        public bool Running => Sim != null && !Paused && !Sim.State.IsBankrupt;
        public bool Paused { get; set; }

        public event Action SessionStarted;
        public event Action SessionEnded;

        private double _minuteAcc;

        private void Awake()
        {
            Instance = this;
            Saves = new SaveService(new FileStorage(Path.Combine(Application.persistentDataPath, "saves")));
        }

        public void NewGame(string player, string company)
        {
            var seed = (ulong)DateTime.UtcNow.Ticks;
            var state = GameSimulation.NewGame(seed, player, company, Money.FromDollars(30000));
            BeginSession(state);
            Sim.Notify($"Ласкаво просимо, {player}! На рахунку $30 000. Торкніться вільного приміщення на проспекті.", Severity.Good);
            Sim.Bus.Dispatch();
            SaveNow();
        }

        public bool Continue()
        {
            var r = Saves.Load();
            if (!r.Ok) return false;
            BeginSession(r.State);
            if (r.Problems.Count > 0) Sim.Notify("Основне збереження пошкоджено — завантажено резервну копію.", Severity.Warning);
            Sim.Bus.Dispatch();
            return true;
        }

        public bool LoadFile(string file)
        {
            var r = Saves.LoadFile(file);
            if (!r.Ok) return false;
            BeginSession(r.State);
            return true;
        }

        private void BeginSession(GameState state)
        {
            Sim = new GameSimulation(state);
            Sim.Bus.Subscribe<DayClosedEvent>(_ => SaveNow());
            Speed = 1;
            Paused = false;
            _minuteAcc = 0;
            ApplySettings();
            SessionStarted?.Invoke();
        }

        public void EndSession()
        {
            if (Sim != null && !Sim.State.IsBankrupt) SaveNow();
            Sim = null;
            SessionEnded?.Invoke();
        }

        public void SetSpeed(int s) { Speed = Mathf.Clamp(s, 0, TimeSpeeds.MinutesPerRealSecond.Length - 1); }

        public void SaveNow()
        {
            if (Sim == null) return;
            try { Saves.Save(Sim.State); }
            catch (Exception e) { Debug.LogError("Save failed: " + e); }
        }

        public void ApplySettings()
        {
            if (Sim == null) return;
            var q = Sim.State.Settings.GraphicsQuality;
            var levels = new[] { 1, 3, 5 };
            QualitySettings.SetQualityLevel(Mathf.Clamp(levels[Mathf.Clamp(q, 0, 2)], 0, QualitySettings.names.Length - 1), true);
            QualitySettings.shadows = q == 0 ? ShadowQuality.Disable : ShadowQuality.HardOnly;
            Application.targetFrameRate = q == 2 ? 60 : 30;
            Sim.State.Settings.MaxPedestrians = q == 0 ? 60 : q == 1 ? 140 : 260;
        }

        /// <summary>Незалежний від кадрів тік: накопичуємо реальний час і просуваємо гру цілими хвилинами.</summary>
        private void Update()
        {
            if (!Running || Speed == 0) return;
            _minuteAcc += Time.unscaledDeltaTime * TimeSpeeds.MinutesPerRealSecond[Speed];
            var whole = (long)Math.Floor(_minuteAcc);
            if (whole <= 0) return;
            whole = Math.Min(whole, 720); // захист від стрибка після довгої паузи кадру
            _minuteAcc -= whole;
            Sim.Advance(whole);
        }

        private void OnApplicationPause(bool pause) { if (pause) SaveNow(); }
        private void OnApplicationQuit() => SaveNow();
    }
}
