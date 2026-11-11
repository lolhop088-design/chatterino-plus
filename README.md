# chatterino-plus
Chatterino + - Android client for Twitch with 7TV, BTTV, FFZ emotes

## 🏙️ Бізнес Імперія (Android-гра)

Економічний симулятор у жанрі «бізнес-менеджер»: орендуйте приміщення в п’яти районах міста,
відкривайте кав’ярні, бургерні, мінімаркети, квіткові крамниці, магазини одягу та електроніки,
наймайте персонал, керуйте цінами, закупівлями, маркетингом, покращеннями та кредитами.

- `business-manager/` — сама гра (HTML/JS/CSS), можна відкрити `index.html` у браузері.
- `android/` — Android-застосунок (WebView), який упаковує гру в APK.
- `.github/workflows/android-apk.yml` — GitHub Actions збирає APK і публікує його в **Releases**.

### Як отримати APK
1. Відкрийте вкладку **Releases** (або **Actions → Build APK → Artifacts**).
2. Завантажте `BizImperia.apk` на телефон і встановіть.

Локальна збірка: `cd android && ./gradlew assembleDebug` (потрібен Android SDK).
