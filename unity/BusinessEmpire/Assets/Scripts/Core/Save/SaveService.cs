using System;
using System.Collections.Generic;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using BusinessEmpire.Core.Simulation;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;

namespace BusinessEmpire.Core.Save
{
    /// <summary>Абстракція сховища: файли на телефоні в Unity, пам’ять у тестах.</summary>
    public interface ISaveStorage
    {
        bool Exists(string name);
        string Read(string name);
        void Write(string name, string content);
        void Delete(string name);
        void Move(string from, string to);
    }

    public class InMemoryStorage : ISaveStorage
    {
        public readonly Dictionary<string, string> Files = new Dictionary<string, string>();
        public bool Exists(string name) => Files.ContainsKey(name);
        public string Read(string name) => Files[name];
        public void Write(string name, string content) => Files[name] = content;
        public void Delete(string name) => Files.Remove(name);
        public void Move(string from, string to) { Files[to] = Files[from]; Files.Remove(from); }
    }

    [Serializable]
    public class SaveEnvelope
    {
        public string Format = "BEU-SAVE";
        public int Version;
        public string SavedAtUtc;
        public int Day;
        public string Company;
        public long BalanceCents;
        public string Checksum;
        public string Payload;
    }

    public class SaveSlotInfo
    {
        public string File;
        public int Day;
        public string Company;
        public long BalanceCents;
        public string SavedAtUtc;
        public bool Valid;
    }

    public class LoadResult
    {
        public GameState State;
        public string LoadedFrom;
        public readonly List<string> Problems = new List<string>();
        public bool Ok => State != null;
    }

    /// <summary>
    /// Збереження з перевіркою цілісності (SHA-256 від вмісту) і ротацією резервних копій:
    /// slot.sav → slot.bak1 → slot.bak2. Запис іде через тимчасовий файл, тож обрив живлення
    /// не псує основне збереження. Якщо основний файл пошкоджено — завантажується резервна копія.
    /// </summary>
    public class SaveService
    {
        public const int Backups = 2;
        private readonly ISaveStorage _storage;

        private static readonly JsonSerializerSettings JsonSettings = new JsonSerializerSettings
        {
            ContractResolver = new FieldsOnlyResolver(),
            Formatting = Formatting.None,
            NullValueHandling = NullValueHandling.Include,
            ObjectCreationHandling = ObjectCreationHandling.Replace,
        };

        public SaveService(ISaveStorage storage) { _storage = storage; }

        public static string FileFor(string slot) => slot + ".sav";
        public static string BackupFor(string slot, int i) => slot + ".bak" + i;

        public static string Serialize(GameState state) => JsonConvert.SerializeObject(state, JsonSettings);
        public static GameState Deserialize(string json) => JsonConvert.DeserializeObject<GameState>(json, JsonSettings);

        public static string Hash(string text)
        {
            using (var sha = SHA256.Create())
            {
                var bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(text));
                var sb = new StringBuilder(bytes.Length * 2);
                foreach (var b in bytes) sb.Append(b.ToString("x2"));
                return sb.ToString();
            }
        }

        public void Save(GameState state, string slot = "main")
        {
            var payload = Serialize(state);
            var env = new SaveEnvelope
            {
                Version = state.Version, SavedAtUtc = DateTime.UtcNow.ToString("o"), Day = state.Clock.Day,
                Company = state.CompanyName, BalanceCents = state.Account.Balance.Cents, Checksum = Hash(payload), Payload = payload,
            };
            var text = JsonConvert.SerializeObject(env);
            var tmp = slot + ".tmp";
            _storage.Write(tmp, text);
            if (Validate(_storage.Read(tmp)) == null) throw new InvalidOperationException("Записане збереження не пройшло перевірку.");
            for (var i = Backups; i >= 1; i--)
            {
                var from = i == 1 ? FileFor(slot) : BackupFor(slot, i - 1);
                var to = BackupFor(slot, i);
                if (!_storage.Exists(from)) continue;
                if (_storage.Exists(to)) _storage.Delete(to);
                _storage.Move(from, to);
            }
            _storage.Move(tmp, FileFor(slot));
        }

        public LoadResult Load(string slot = "main")
        {
            var res = new LoadResult();
            var files = new List<string> { FileFor(slot) };
            for (var i = 1; i <= Backups; i++) files.Add(BackupFor(slot, i));
            foreach (var f in files)
            {
                if (!_storage.Exists(f)) continue;
                try
                {
                    var env = Validate(_storage.Read(f));
                    if (env == null) { res.Problems.Add($"{f}: пошкоджено (не збігається контрольна сума)."); continue; }
                    var state = Deserialize(env.Payload);
                    if (state == null) { res.Problems.Add($"{f}: порожній стан."); continue; }
                    res.State = Migrate(state);
                    res.LoadedFrom = f;
                    return res;
                }
                catch (Exception e) { res.Problems.Add($"{f}: {e.Message}"); }
            }
            return res;
        }

        public bool HasSave(string slot = "main")
        {
            if (_storage.Exists(FileFor(slot))) return true;
            for (var i = 1; i <= Backups; i++) if (_storage.Exists(BackupFor(slot, i))) return true;
            return false;
        }

        public List<SaveSlotInfo> ListVersions(string slot = "main")
        {
            var list = new List<SaveSlotInfo>();
            var files = new List<string> { FileFor(slot) };
            for (var i = 1; i <= Backups; i++) files.Add(BackupFor(slot, i));
            foreach (var f in files)
            {
                if (!_storage.Exists(f)) continue;
                SaveEnvelope env = null;
                try { env = Validate(_storage.Read(f)); } catch { /* пошкоджений файл */ }
                list.Add(env == null ? new SaveSlotInfo { File = f, Valid = false } : new SaveSlotInfo { File = f, Valid = true, Day = env.Day, Company = env.Company, BalanceCents = env.BalanceCents, SavedAtUtc = env.SavedAtUtc });
            }
            return list;
        }

        public LoadResult LoadFile(string file)
        {
            var res = new LoadResult();
            try
            {
                var env = Validate(_storage.Read(file));
                if (env == null) { res.Problems.Add("Файл пошкоджено."); return res; }
                res.State = Migrate(Deserialize(env.Payload));
                res.LoadedFrom = file;
            }
            catch (Exception e) { res.Problems.Add(e.Message); }
            return res;
        }

        public void DeleteAll(string slot = "main")
        {
            if (_storage.Exists(FileFor(slot))) _storage.Delete(FileFor(slot));
            for (var i = 1; i <= Backups; i++) if (_storage.Exists(BackupFor(slot, i))) _storage.Delete(BackupFor(slot, i));
        }

        /// <summary>Повертає конверт, якщо формат і контрольна сума правильні, інакше null.</summary>
        public static SaveEnvelope Validate(string text)
        {
            if (string.IsNullOrEmpty(text)) return null;
            SaveEnvelope env;
            try { env = JsonConvert.DeserializeObject<SaveEnvelope>(text); } catch { return null; }
            if (env == null || env.Format != "BEU-SAVE" || env.Payload == null) return null;
            return Hash(env.Payload) == env.Checksum ? env : null;
        }

        /// <summary>Міграції між версіями формату (зараз лише версія 1).</summary>
        private static GameState Migrate(GameState s)
        {
            if (s.Version > GameState.CurrentVersion) throw new InvalidOperationException("Збереження з новішої версії гри.");
            s.Version = GameState.CurrentVersion;
            return s;
        }

        /// <summary>Серіалізуємо лише публічні поля — обчислювані властивості не потрапляють у файл.</summary>
        private class FieldsOnlyResolver : DefaultContractResolver
        {
            protected override List<MemberInfo> GetSerializableMembers(Type objectType)
            {
                var members = new List<MemberInfo>();
                foreach (var f in objectType.GetFields(BindingFlags.Public | BindingFlags.Instance)) members.Add(f);
                return members;
            }
        }
    }
}
