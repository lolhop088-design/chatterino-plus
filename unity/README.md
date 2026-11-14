# Business Empire: Ultimate — Unity-версія (Android)

Unity 2022.3 LTS (2022.3.76f1) · C# · URP · Android (IL2CPP, ARM64, landscape).

## Архітектура

```
unity/
├─ BusinessEmpire/                  Unity-проєкт
│  ├─ Assets/Scripts/Core/          ЯДРО: чистий C# без UnityEngine (asmdef noEngineReferences)
│  │  ├─ Common/      Money (центи, long), DeterministicRandom (стан зберігається)
│  │  ├─ Time/        GameClock, швидкості часу
│  │  ├─ Events/      EventBus — централізовані події, розсилка пакетом після тіку
│  │  ├─ Economy/     Catalog (товари, формати магазинів), MacroEconomy, WholesaleMarket
│  │  ├─ Finance/     BankAccount (усі рухи грошей), DailyReport (P&L + рух грошей)
│  │  ├─ World/       City, District, Premises, CityGenerator (тестовий район)
│  │  ├─ Business/    Store, StockItem, ReorderPolicy, PurchaseOrder
│  │  ├─ Staff/       Employee, Candidate, ролі й ринкові ставки
│  │  ├─ Services/    RealEstate, Store, Purchasing, Staff, SalesModel, DayCloser
│  │  ├─ Simulation/  GameState (лише дані), GameSimulation (оркестратор тіків)
│  │  └─ Save/        SaveService: SHA-256, 2 резервні копії, запис через .tmp, міграції
│  ├─ Assets/Scripts/Game/          UNITY-ШАР: лише відображення та введення
│  │  ├─ Bootstrap/   GameBootstrap (точка входу), GameSession (тік, автозбереження)
│  │  ├─ World/       IsoCameraController, CityView, CrowdAndTraffic (GPU instancing), DayNightCycle
│  │  └─ UI/          UIKit (uGUI з коду), UIRoot (HUD, меню, вікна), панелі
│  ├─ Assets/Tests/EditMode/        NUnit-тести ядра (Unity Test Runner)
│  └─ Assets/Editor/BuildScript.cs  URP, матеріали, сцена, налаштування Android, збірка APK
└─ dotnet/                          Збірка й тести ядра без Unity
   ├─ Core/        BusinessEmpire.Core.csproj (ті самі файли з Assets/Scripts/Core)
   ├─ Tests/       BusinessEmpire.Tests.csproj (ті самі тести з Assets/Tests)
   └─ UnityCheck/  перевірка компіляції Unity-шару проти reference-збірок UnityEngine
```

Принципи:
- **Логіка відокремлена від візуалу.** Ядро не знає про Unity; вид лише читає `GameState` і викликає сервіси.
- **Незалежні тіки.** `GameSession` накопичує реальний час і просуває гру цілими ігровими хвилинами.
  Продажі рахуються щогодини, дорогі розрахунки (зарплати, оренда, макроекономіка, звіт) — раз на добу.
- **Жодних випадкових прибутків.** Попит і продажі рахуються формулою (`SalesModel`); дробові частини
  накопичуються між годинами. Генератор випадковості детермінований і зберігається в сейві
  (лише для імен кандидатів і невеликих макрошоків).
- **Події централізовано** через `EventBus`: UI підписується, симуляція публікує.

## Етап 1 — що працює

- Ізометрична камера: один палець — рух, щипок — масштаб, два пальці — поворот, дотик — вибір будівлі.
- Тестовий район «Центральний»: проспект, 12 комерційних приміщень (4 зайняті конкурентами), фонова забудова,
  річка з портом, дерева й ліхтарі; пішоходи й машини (GPU instancing, кількість залежить від години й налаштувань);
  день і ніч за ігровим годинником (сонце, небо, світло у вікнах).
- Приміщення: оренда (депозит 14 днів), купівля, викуп орендованого, розірвання оренди/продаж.
- Магазини (мінімаркет, кав'ярня, одяг): обладнання, ціни, склад, графік, закриття з ліквідацією.
- Продажі: потік району × профіль години × формат × площа × місце × ціни × репутація × купівельна спроможність
  × впевненість × конкуренція; обмеження пропускною здатністю персоналу та залишками.
- Закупівлі: оплата одразу, поставка о 07:00, доставка в собівартості, тиск попиту на оптові ціни, автозамовлення.
- Персонал: ринок праці (залежить від безробіття), найм, звільнення з вихідною допомогою, зміни, понаднормові ×1.5,
  навчання, підвищення (з вимогами до навички), задоволеність і мотивація, звільнення недоплачених.
- Щоденний звіт: виручка, собівартість, зарплати, оренда/утримання, псування, інші витрати, прибуток, рух грошей.
- Макроекономіка: інфляція/дефляція, ставка центробанку (правило Тейлора), безробіття, впевненість, рівень цін і зарплат.
- Банкрутство: 3 дні поспіль з від'ємним балансом.
- Меню: Продовжити, Нова гра, Завантаження (основне + 2 резервні копії), Налаштування (якість під 4/6–8/12 ГБ), Статистика, Вихід.
- Збереження: автозбереження щоночі та при згортанні, перевірка SHA-256, відкат на резервну копію.

**Ще не реалізовано** (наступні етапи плану): логістика й транспорт як окрема система, виробництво, ІІ-компанії,
кредити й біржа, кілька районів і регіонів, погода, LOD/Addressables/підвантаження районів, публікація в Google Play.

## Тести

```bash
dotnet test unity/dotnet/Tests/BusinessEmpire.Tests.csproj      # 40 тестів ядра
./unity/dotnet/fetch-unity-refs.sh && dotnet build unity/dotnet/UnityCheck/UnityCheck.csproj
```
Ті самі тести запускає Unity Test Runner (EditMode) у CI.

## Збірка APK (GitHub Actions)

Workflow `.github/workflows/unity-android.yml` використовує [GameCI](https://game.ci). Unity вимагає ліцензію навіть
для безкоштовного Personal-плану, тому в репозиторії потрібні секрети
(**Settings → Secrets and variables → Actions → New repository secret**):

| Секрет | Значення |
|---|---|
| `UNITY_EMAIL` | email акаунта Unity |
| `UNITY_PASSWORD` | пароль акаунта Unity |
| `UNITY_LICENSE` | вміст файлу ліцензії `.ulf` (Unity Hub → Preferences → Licenses → Add → Personal; файл лежить у `~/.local/share/unity3d/Unity/Unity_lic.ulf`, `C:\ProgramData\Unity\Unity_lic.ulf` або `/Library/Application Support/Unity/Unity_lic.ulf`) |

Без секретів CI все одно запускає тести ядра й перевірку компіляції, а збірку APK пропускає з попередженням.

Локально: відкрийте `unity/BusinessEmpire` в Unity 2022.3.76f1 → меню **Business Empire → Build Android APK**.
