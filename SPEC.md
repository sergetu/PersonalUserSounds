# SPEC: Визуальный редизайн PersonalUserSounds + вынос UI в HTML + билдер

## Overview

Плагин `PersonalUserSounds` (BetterDiscord, 2192 строки) имеет визуальный слой,
целиком построенный на React `createElement` с инлайн-стилями и «сырыми»
нативными контролами. Задача:

1. Переписать весь визуал в стилистике Discord (свитчи, слайдеры, карточки,
   акценты, тёмная/светлая тема) — без изменения логики плагина.
2. Вынести визуальную часть (разметку, стили, тексты, обработчики
   представлений) в единый HTML-файл, открываемый в обычном браузере с
   демо-данными — для внешней диагностики и разделения UI/логики.
3. Сделать Node-билдер, который собирает исходники + HTML в единый
   устанавливаемый `.plugin.js`.

Процесс: SPEC → approval → реализация. Никакой код до явного «go».

---

## Текущее состояние (Tier 0, файл перечитан целиком)

- Стр. 1–197: мета-шапка (`@version 1.0.10`), константы, `DEFAULT_SETTINGS`,
  словарь `TEXT {en, ru}` (~60 ключей).
- Стр. 199–359: чистые функции (`clamp`, `deepMerge`, `normalizeSoundConfig`,
  `getLocale`, `normalizeCollection`, `pathToFileHref`, `soundMimeType`,
  fs-обёртки и т.д.).
- Стр. 361–774: `class AudioManager` — воспроизведение, WebAudio-fallback,
  диагностика. **Логика, не трогаем.**
- Стр. 776–2192: `module.exports = class PersonalUserSounds`:
  - логика: start/stop, кэш модулей, патчи (`patchUserContextMenu`,
    `patchNotificationModule`, `patchSoundModule`), обработчики
    MESSAGE_CREATE / звонков / голосовых состояний, работа с настройками
    (`loadSettings`/`saveSettings`/`migrateSettings`/`normalizeUserSettings`),
    `pickAudioFile`, `resolveSoundConfig`, хелперы.
  - **визуальные методы (6 шт., цель замены):**
    - `getSettingsPanel()` (884–1132) — React-панель настроек, единственная
      обязательная BD-точка входа;
    - `openUserModal(user)` (1788–1896) — модалка пользователя через
      `BdApi.UI.showConfirmationModal`, держит `draft` в замыкании;
    - `UserEventEditorComponent()` (1898–1952) — React-компонент,
      используется только внутри старой модалки → удаляется;
    - `showModeHelpModal()` (1992–2022), `showAudioDiagnosticsModal()` (2024–2047),
      `showCompatibilityModal()` (2049–2068) — инфо-модалки через
      `showConfirmationModal`.
  - сервисные методы, нужные UI и вызываемые из логики: `t()`, `toast`,
    `toastDebug`, `logDebug`, `fileExists`, `cloneSettings`, `identityName`,
    `getAvatarUrl`, `ensureUserSettings`, `saveSettings`, `initVoiceState`,
    `openUserModalById`.

Зависимости UI → логика (должны сохраниться): `audioManager.preview /
diagnose / stop`, `pickAudioFile`, `toast`, `showAudioDiagnosticsModal`
(вызывается из `AudioManager.diagnose` и `reportAudioError`), `t()` (вызывается
из `AudioManager`), `normalizeSoundConfig`, `SOUND_MODES`, `EVENT_TYPES`.

Среда: BetterDiscord установлен; рабочая копия плагина лежит в
`%APPDATA%\BetterDiscord\plugins\PersonalUserSounds.plugin.js` и идентична
`D:\discord\PersonalUserSounds.plugin.js` (одинаковый sha256). Деплой = копия
файла. Node v22 доступен для билдера.

---

## Архитектура

```
D:\discord\PersonalUserSounds\
├─ SPEC.md
├─ src\
│  └─ plugin.js            # весь код плагина (логика НЕ изменена),
│                          # визуальные методы — тонкие обёртки над this.ui.*,
│                          # словарь удалён (t() → this.ui.text())
├─ ui\
│  └─ panel.html           # ЕДИНЫЙ источник визуала (см. ниже)
├─ tools\
│  └─ build.js             # сборщик: src/plugin.js + ui/panel.html → dist/
└─ dist\
   └─ PersonalUserSounds.plugin.js   # артефакт (готов к копированию в BD)
```

`src/plugin.js` — один файл класса (не два src-файла): BetterDiscord требует
монолитный `module.exports = class`, а любые «мосты» между несколькими
исходниками в собранном файле всё равно сливаются в один класс. Один исходник
+ HTML даёт минимальный шов и максимальную проверяемость: diff
`src/plugin.js` против оригинала обязан показать ровно замену 6 методов,
удаление словаря и добавление UI-инициализации — и ничего больше.

### ui/panel.html — единый источник визуала

Один файл, открывается в браузере (диагностика) и инлайнится в плагин
(работа). Содержит четыре секции:

1. `<style>` — весь CSS всех представлений. Пишется на переменных Discord
   (`var(--background-secondary)`, `var(--brand-experiment)` и т.д.) **без**
   глобальных фолбэков, чтобы в BD тема наследовалась автоматически.
   Браузерный мок-режим задаёт переменные через класс-маркер на `<html>`
   (`[data-puss-preview]`), который в BD никогда не ставится.
2. `<template>` × 5 — разметка представлений: `panel`, `user-modal`,
   `help`, `diagnostics`, `compatibility`.
3. `<script>` — словарь `TEXT {en, ru}` (переносится из плагина без
   изменений ключей) + класс `PussUI` (glue): монтирование панели в
   контейнер, открытие/закрытие DOM-модалок, рендер представлений из
   шаблонов, биндинг событий, делегирование, i18n.
4. Мок-режим: при открытии файла в браузере glue сам себя запускает на
   демо-данных (2–3 выдуманных пользователя), без BD — переключатели
   ru/en, тёмная/светлая тема, кнопки открытия всех 5 представлений,
   подмена произвольных данных (например, строк диагностики).

Работает на «интерфейсе хоста» — объекте, который glue получает при
инициализации:

```js
// Что glue требует от хоста (BD-адаптер в src/plugin.js):
host = {
  // данные
  getSettings(),                 // глубокий клон настроек (cloneSettings)
  commitSettings(next),          // migrate + save + уведомить glue (rerender)
  resolveUser(userId),           // {id, username, globalName, avatar} | null
  // действия
  pickAudioFile(),               // Promise<{path, source} | null>
  preview(config, volume), stopPreview(), diagnose(config, volume),
  saveUserDraft(userId, draft),  // нормализация + сохранение + initVoiceState
  removeUser(userId), addUserById(id) // -> ok | {error: 'userNotFound'}
  // сервис
  toast(message, type), fileExists(path),
  identityName(identity, fallback),
  openAudioDiagnosticsFromLogic(filePath, rows) // когда зовёт AudioManager
}

// Что хост требует от glue:
ui.text(key), ui.mountPanel(container), ui.unmountPanel(),
ui.openUserModal(userId, {avatar, name...}),
ui.openHelp(), ui.openCompatibility(rows), ui.openDiagnostics(filePath, rows)
```

В браузере мок-режим реализует `host` демо-данными — тот же контракт,
поэтому glue в BD и в браузере один и тот же код.

### Как BD-методы становятся обёртками (src/plugin.js)

- `getSettingsPanel()` — React остаётся **только здесь** (BD-контракт): метод
  возвращает элемент React-компонента-хоста, который в `useEffect` зовёт
  `ui.mountPanel(container)`, в cleanup — `ui.unmountPanel()`. Повторное
  открытие настроек BD не дублирует UI.
- `openUserModal(user)` → `this.ui.openUserModal(...)` + регистрация
  колбэков сохранения (код из старого `onConfirm`/`onCancel` переезжает в
  хост-методы `saveUserDraft`/`stopPreview`).
- `showModeHelpModal()` → `this.ui.openHelp()`.
- `showAudioDiagnosticsModal(filePath, rows)` → `this.ui.openDiagnostics(...)`.
- `showCompatibilityModal()` → `this.ui.openCompatibility(rows)`. Строки
  совместимости (`Dispatcher`, `SoundUtils`, ...) собирает логика — glue
  только отрисовывает.
- `UserEventEditorComponent()` удаляется.
- DOM-модалки заменяют `BdApi.UI.showConfirmationModal`: свой оверлей поверх
  `#app-mount` (в BD) или `body` (браузер), z-index выше Discord-модалок,
  Esc/клик по подложке = cancel, фокус в модалку, скролл-лок. Все классы с
  префиксом `puss-`, чтобы не конфликтовать с CSS Discord.
- Инициализация: константа `UI_SOURCE` (строка с содержимым panel.html,
  вставленная билдером через `JSON.stringify`) + код, который при первом
  надобности извлекает `<style>` → в `<head>` (один раз), `<template>` и
  glue-код → создаёт `this.ui` с host-адаптером. `t(key)` → `this.ui.text(key)`
  с фолбэком на сам ключ (логика не падает, если UI не инициализирован).

### tools/build.js

```
node tools/build.js
```

1. Читает `src/plugin.js` и `ui/panel.html`.
2. Заменяет плейсхолдер `__UI_SOURCE__` на `JSON.stringify(panelHtml)`.
3. Пишет `dist/PersonalUserSounds.plugin.js`.
4. Проверки (не выходит с ошибкой при провале):
   - `node --check` собранного файла;
   - присутствие маркеров (`module.exports = class PersonalUserSounds`,
     `UI_SOURCE`, всех 5 `template id`);
   - **diff-верификация логики**: не-визуальные методы в `src/plugin.js`
     побайтово совпадают с оригиналом `D:\discord\PersonalUserSounds.plugin.js`
     (билдер сам делает сверку и печатает отчёт: «логика не тронута: N/N
     методов идентичны»).
5. Выход: `dist/PersonalUserSounds.plugin.js` + консольный отчёт.

Боевой файл `D:\discord\PersonalUserSounds.plugin.js` не трогается сборкой.
Деплой — отдельный явный шаг (см. Open Questions).

---

## User Flows

1. **Панель настроек** (BD → Settings → Plugins → PersonalUserSounds →
   шестерёнка). Секции: General (свитчи enabled/DND/Streamer/focused/
   replace/debug, слайдер громкости, select поведения сообщений, cooldown,
   кнопка Compatibility), Global event values (4 карточки событий:
   message/incomingCall/disconnect/voiceJoin, без режима inherit),
   Configured users (аватар, имя, сводка режимов, Edit/Remove, поле User ID +
   Add). Каждое изменение → `commitSettings` → перерисовка из свежего клона.
2. **Модалка пользователя**: контекстное меню → «Персональные звуки», или
   Edit в списке. Шапка (аватар, имя, User ID, кнопка «?» → Help), пояснение
   режимов, 4 карточки событий (режим inherit/default/custom/silent, путь,
   слайдер громкости, кнопки Choose file / Preview / Diagnostics / Stop /
   Clear), футер Reset user / Save / Cancel. Save → `saveUserDraft` (логика
   из старого `onConfirm`), Reset → удаление + toast, Cancel → stopPreview.
3. **Help**: 4 строки режимов с описаниями.
4. **Diagnostics**: заголовок-путь + таблица строк `label → value`.
   Вызывается из кнопки Diagnostics и из `AudioManager` (ошибки декодирования)
   — оба пути идут в один `ui.openDiagnostics`.
5. **Compatibility**: 8 строк (Dispatcher, SoundUtils, ...) да/нет.

## Стиль и тема

- Контролы в стилистике Discord: переключатели-свитчи (скрытый checkbox +
  стилизованный thumb, `var(--brand-experiment)` во включённом состоянии),
  слайдеры (`input[type=range]`, стилизованные track/thumb), карточки
  событий с рамкой `var(--background-modifier-accent)`, кнопки primary /
  secondary / danger, заголовки секций (uppercase, muted, 12px) — как в
  нативных настройках Discord.
- Тёмная/светлая: в BD автоматически через переменные Discord. В браузере —
  переключатель, меняющий `[data-puss-preview]`-переменные.
- Никаких внешних шрифтов/иконок-библиотек: системный стек Discord
  (`gg sans`/fallback) и inline-SVG там, где нужны иконки. Плагин не грузит
  ничего из интернета (сохраняем свойство README).

---

## Edge Cases & Error Handling

- **Логика не должна падать без UI**: `t()` фолбэк на ключ; все вызовы
  `this.ui.*` обёрнуты в try/catch с `logDebug`.
- **Повторный mount**: закрытие/открытие настроек BD не должно дублировать
  стили/слушатели (однократная регистрация стилей + cleanup в unmount).
- **Данные пользователей — текст, не HTML**: username/пути вставляются
  через `textContent`/экранирование, не через innerHTML (пути и ники
  пользовательские).
- **`</script>` внутри инлайн-строки**: `JSON.stringify` при сборке;
  `.plugin.js` не парсится как HTML, BD грузит его как JS — безопасно.
- **Большие data:-source аудио** в настройках не попадают в DOM (хранятся в
  объекте, не рендерятся как src атрибуты списков).
- **Esc/фон модалки** = cancel; у пользовательской модалки cancel = stop
  preview (как в оригинале). Фокус возвращается на вызвавший элемент.
- **Пользователь удалён из UserStore** (openUserModalById с фолбэком на
  сохранённый identity) — поведение сохраняем.
- **Светлая тема / другой масштаб / узкое окно настроек**: адаптивная сетка
  карточек, без горизонтального скролла панели (max-width как в оригинале).
- **Старые сохранённые настройки**: `migrateSettings`/`normalizeUserSettings`
  не меняются — схема данных прежняя.
- **Мок-режим** не должен ничего писать/грузить (только демо-данные в
  памяти).

---

## Верификация (как докажем результат)

1. **Логика не изменена**: скрипт сверки методов src vs оригинал (входит в
   build.js) — не-UI методы идентичны 1:1.
2. **Синтаксис**: `node --check` на собранном файле.
3. **Мок-диагностика (браузер)**: открыть `ui/panel.html` — проверить все 5
   представлений, обе локали, обе темы, редактирование демо-данных,
   отсутствие ошибок в консоли.
4. **Интеграция в BD**: скопировать `dist/...plugin.js` в
   `%APPDATA%\BetterDiscord\plugins`, перезапустить Discord, прогнать чек-лист
   из README (тест-пункты) — требует запущенного Discord; выполняется
   пользователем или совместно (см. Open Questions).
5. **Бэкап**: перед любым деплоем боевой файл сохраняется как
   `PersonalUserSounds.plugin.js.bak-<timestamp>`.

## Out of Scope

- Логика событий/звуков/патчей — не меняется вообще (только перенос текстов
  и вызовов `t()`).
- Схема настроек, миграции, `DEFAULT_SETTINGS` — без изменений.
- Новые функции/события/эффекты — не добавляем.
- Поведение «лучше стандартный звук, чем чужой персональный» — не трогаем.

## Open Questions

1. **Деплой**: после сборки заменить боевой `D:\discord\PersonalUserSounds.plugin.js`
   и рабочую копию BD? Предлагаю: да, отдельным шагом по твоей команде, с
   бэкапом (`.bak-<timestamp>`) — ты проверяешь в Discord.
2. **Версия**: поднять `@version 1.0.10` → `1.1.0` в шапке? (визуальный
   рефакторинг, API не меняется). Предлагаю: да.
3. **README**: добавить раздел «Разработка: структура и сборка»?
   Предлагаю: да, кратко.
4. **Проверка в Discord**: на этой машине BD установлен — делать ли финальную
   интеграционную проверку с перезапуском Discord (я могу скопировать файл и
   попросить тебя перезапустить/включить плагин и сказать результат), или
   ограничиться статикой + браузерным моком?
