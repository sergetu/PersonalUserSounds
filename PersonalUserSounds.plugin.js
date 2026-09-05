/**
 * @name PersonalUserSounds
 * @author Codex
 * @description Assign individual message, incoming call and disconnect sounds to Discord users.
 * @version 1.1.0
 */

"use strict";
// ============================================================================
// PersonalUserSounds — UI layer
// tools/build.js replaces the three placeholder tokens below (the glue insert
// line and the two const initializers) with the extracted ui/panel.html parts.
// Until built, this file stays valid JS (tokens are identifiers/comments).
// ============================================================================
/* ===========================================================================
   PussUI — the whole plugin UI logic. This exact code block is extracted by
   tools/build.js and inlined into the .plugin.js at the glue insert marker;
   in the browser preview it runs as-is below.
   ========================================================================= */
(function (global) {
    "use strict";

    /* ---- dictionaries (single source; mirrored 1:1 from the original) ---- */
    var PUSS_TEXT = {
        en: {
            personalSounds: "Personal sounds", configure: "Configure personal sounds", help: "Help",
            modeHelpTitle: "Sound modes",
            inheritDescription: "Use the global setting for this event from the plugin settings.",
            defaultDescription: "Keep Discord's standard sound and do not play a personal sound.",
            customDescription: "Mute Discord's standard sound when possible and play the selected local audio file.",
            silentDescription: "Mute the sound for this event when the plugin can reliably intercept it.",
            save: "Save", cancel: "Cancel", resetUser: "Reset user settings", chooseFile: "Choose file",
            preview: "Preview", diagnostics: "Diagnostics", audioDiagnostics: "Audio diagnostics",
            audioStarted: "Audio playback started.", audioStartFailed: "Audio playback failed to start.",
            audioDecodeFailed: "Audio file could not be decoded by Discord's audio engine.",
            stop: "Stop", clear: "Clear", add: "Add", edit: "Edit", remove: "Remove",
            settingsTitle: "PersonalUserSounds", general: "General", enabled: "Enable personal sounds",
            globalVolume: "Global volume", respectDnd: "Respect Discord Do Not Disturb",
            respectStreamerMode: "Respect Streamer Mode", playInFocusedChannel: "Play in active open channel",
            replaceNativeSounds: "Replace native sounds", messageCooldown: "Message cooldown, ms",
            debug: "Debug mode", messageBehavior: "Message behavior", globalEvents: "Global event values",
            configuredUsers: "Configured users", addUserById: "Add user by User ID",
            checkCompatibility: "Check compatibility", emptyUsers: "No configured users yet.",
            mode: "Mode", filePath: "File path", volume: "Volume",
            message: "Message", incomingCall: "Incoming call", disconnect: "Disconnect", voiceJoin: "Voice join",
            inherit: "Inherit", default: "Default", custom: "Custom", silent: "Silent",
            follow_discord: "Follow Discord", direct_messages: "Direct messages", all_messages: "All messages",
            userNotFound: "User was not found in local UserStore.", fileMissing: "Audio file does not exist.",
            fileBad: "Audio file cannot be loaded.",
            fileSelectedWithWarning: "File selected, but preview did not confirm playback. Try Preview; if it stays silent, use mp3 or wav.",
            saved: "Settings saved.", reset: "User settings were reset.", compatibility: "Compatibility",
            yes: "yes", no: "no", active: "active", inactive: "inactive"
        },
        ru: {
            personalSounds: "Персональные звуки", configure: "Настроить персональные звуки", help: "Справка",
            modeHelpTitle: "Режимы звука",
            inheritDescription: "Использовать глобальную настройку этого события из настроек плагина.",
            defaultDescription: "Оставить стандартный звук Discord и не проигрывать персональный звук.",
            customDescription: "По возможности заглушить стандартный звук Discord и проиграть выбранный локальный аудиофайл.",
            silentDescription: "Отключить звук для этого события, когда плагин может надёжно его перехватить.",
            save: "Сохранить", cancel: "Отмена", resetUser: "Сбросить настройки пользователя", chooseFile: "Выбрать файл",
            preview: "Прослушать", diagnostics: "Диагностика", audioDiagnostics: "Диагностика аудио",
            audioStarted: "Воспроизведение аудио запущено.", audioStartFailed: "Не удалось запустить воспроизведение аудио.",
            audioDecodeFailed: "Аудиофайл не удалось декодировать аудиодвижком Discord.",
            stop: "Остановить", clear: "Очистить", add: "Добавить", edit: "Изменить", remove: "Удалить",
            settingsTitle: "PersonalUserSounds", general: "Общие параметры", enabled: "Включить персональные звуки",
            globalVolume: "Глобальная громкость", respectDnd: "Соблюдать режим Не беспокоить",
            respectStreamerMode: "Соблюдать Streamer Mode", playInFocusedChannel: "Воспроизводить в активном открытом канале",
            replaceNativeSounds: "Заменять стандартные звуки", messageCooldown: "Задержка между сообщениями, мс",
            debug: "Режим отладки", messageBehavior: "Поведение сообщений", globalEvents: "Глобальные значения событий",
            configuredUsers: "Настроенные пользователи", addUserById: "Добавить пользователя по User ID",
            checkCompatibility: "Проверить совместимость", emptyUsers: "Настроенных пользователей пока нет.",
            mode: "Режим", filePath: "Путь к файлу", volume: "Громкость",
            message: "Сообщение", incomingCall: "Входящий звонок", disconnect: "Отключение", voiceJoin: "Подключение",
            inherit: "Наследовать", default: "Стандартный", custom: "Свой файл", silent: "Тишина",
            follow_discord: "Следовать Discord", direct_messages: "Личные сообщения", all_messages: "Все сообщения",
            userNotFound: "Пользователь не найден в локальном UserStore.", fileMissing: "Аудиофайл не существует.",
            fileBad: "Аудиофайл не удалось загрузить.",
            fileSelectedWithWarning: "Файл выбран, но проверка прослушивания не подтвердила воспроизведение. Попробуйте «Прослушать»; если тишина, используйте mp3 или wav.",
            saved: "Настройки сохранены.", reset: "Настройки пользователя сброшены.", compatibility: "Совместимость",
            yes: "да", no: "нет", active: "активен", inactive: "неактивен"
        }
    };

    /* Keep in sync with EVENT_TYPES / SOUND_MODES in the plugin core. */
    var PUSS_EVENTS = ["message", "incomingCall", "disconnect", "voiceJoin"];
    var PUSS_MODES = ["inherit", "default", "custom", "silent"];

    function detectLocale() {
        // 1) Discord's own UI locale: Discord sets <html lang> to the selected
        //    interface language (ru / en-US / de / ...). navigator.language is
        //    NOT reliable here — Electron keeps en-US even when Discord is Russian.
        try {
            var doc = typeof document !== "undefined" ? document : null;
            var htmlLang = doc && doc.documentElement && doc.documentElement.getAttribute
                ? doc.documentElement.getAttribute("lang") : null;
            if (htmlLang) {
                var h = String(htmlLang).toLowerCase();
                if (h.indexOf("ru") === 0) return "ru";
                if (h.indexOf("en") === 0) return "en";
            }
        }
        catch (_) { /* fall through */ }
        // 2) BetterDiscord locale manager, when the API provides it
        try {
            if (typeof BdApi !== "undefined" && BdApi && BdApi.LocaleManager && typeof BdApi.LocaleManager.getLocale === "function") {
                var l = BdApi.LocaleManager.getLocale();
                var lc = String(l).toLowerCase();
                if (lc.indexOf("ru") === 0) return "ru";
                if (lc.indexOf("en") === 0) return "en";
            }
        }
        catch (_) { /* fall through */ }
        // 3) last resort: browser language
        var lang = (typeof navigator !== "undefined" && navigator && navigator.language) || "en";
        return String(lang).toLowerCase().indexOf("ru") === 0 ? "ru" : "en";
    }

    function deepClone(value) {
        if (value === null || typeof value !== "object") return value;
        if (Array.isArray(value)) return value.map(deepClone);
        var out = {};
        for (var key in value) {
            if (Object.prototype.hasOwnProperty.call(value, key)) out[key] = deepClone(value[key]);
        }
        return out;
    }

    function clampNum(value, min, max) {
        var n = Number(value);
        if (!Number.isFinite(n)) return min;
        return Math.min(max, Math.max(min, n));
    }

    function setPath(obj, path, value) {
        var parts = String(path).split(".");
        var cursor = obj;
        for (var i = 0; i < parts.length - 1; i++) {
            if (cursor[parts[i]] === null || typeof cursor[parts[i]] !== "object") cursor[parts[i]] = {};
            cursor = cursor[parts[i]];
        }
        cursor[parts[parts.length - 1]] = value;
    }

    function getPath(obj, path) {
        var parts = String(path).split(".");
        var cursor = obj;
        for (var i = 0; i < parts.length; i++) {
            if (cursor === null || typeof cursor !== "object") return undefined;
            cursor = cursor[parts[i]];
        }
        return cursor;
    }

    function isInDiscord() {
        return typeof BdApi !== "undefined";
    }

    /* ============================ PussUI ============================ */
    function PussUI(options) {
        options = options || {};
        this.host = options.host || null;
        this.styles = options.styles || "";
        this.templates = options.templates || {};
        this.locale = detectLocale();
        this.modals = [];
        this.panelContainer = null;
        this.panelSettings = null;
        this.modalDraft = null;   // {userId, settings} for the user modal
        this._escBound = null;
        this.injectStyles();
    }

    PussUI.prototype.text = function (key) {
        if (!key) return "";
        var dict = PUSS_TEXT[this.locale] || PUSS_TEXT.en;
        if (dict[key] !== undefined && dict[key] !== null) return dict[key];
        if (PUSS_TEXT.en[key] !== undefined) return PUSS_TEXT.en[key];
        return String(key);
    };

    PussUI.prototype.setLocale = function (locale) {
        this.locale = (locale === "ru" || locale === "en") ? locale : detectLocale();
        this.rerenderAll();
    };

    PussUI.prototype.injectStyles = function () {
        if (!this.styles || !document || !document.head) return;
        if (document.getElementById("puss-styles")) return; // already present (preview page)
        var style = document.createElement("style");
        style.id = "puss-styles";
        style.textContent = this.styles;
        document.head.appendChild(style);
    };

    PussUI.prototype.tpl = function (id) {
        var html = this.templates[id];
        var template = document.createElement("template");
        if (html) template.innerHTML = html;
        return template.content.cloneNode(true);
    };

    PussUI.prototype.applyI18n = function (root) {
        if (!root || !root.querySelectorAll) return;
        var self = this;
        var nodes = root.querySelectorAll("[data-i18n]");
        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            if (node.childNodes.length === 0) node.textContent = self.text(node.getAttribute("data-i18n"));
        }
        var titleNodes = root.querySelectorAll("[data-i18n-title]");
        for (var j = 0; j < titleNodes.length; j++) {
            titleNodes[j].setAttribute("title", self.text(titleNodes[j].getAttribute("data-i18n-title")));
            titleNodes[j].setAttribute("aria-label", self.text(titleNodes[j].getAttribute("data-i18n-title")));
        }
    };

    PussUI.prototype.rangeVisual = function (input) {
        var min = Number(input.min) || 0;
        var max = Number(input.max) || 100;
        var value = clampNum(input.value, min, max);
        var percent = max > min ? ((value - min) / (max - min)) * 100 : 0;
        var accent = "var(--brand-experiment, #5865f2)";
        var track = "var(--puss-track, rgba(255,255,255,.08))";
        input.style.background = "linear-gradient(to right, " + accent + " 0%, " + accent + " " + percent + "%, " + track + " " + percent + "%, " + track + " 100%)";
    };

    /* ---------- panel ---------- */
    PussUI.prototype.mountPanel = function (container) {
        if (!container) return;
        this.panelContainer = container;
        if (this.host && this.host.getSettings) {
            try {
                this.panelSettings = this.host.getSettings();
            }
            catch (error) {
                this.panelSettings = this.panelSettings || null;
            }
        }
        this.attachPanelEvents(container);
        this.renderPanel();
    };

    PussUI.prototype.unmountPanel = function () {
        if (this.panelContainer) {
            this.panelContainer.replaceChildren();
        }
        this.panelContainer = null;
        this.panelSettings = null;
    };

    PussUI.prototype.renderPanel = function () {
        if (!this.panelContainer) return;
        var root = this.tpl("panel");
        this.applyI18n(root);
        var settings = this.panelSettings || {};
        // global controls
        var self = this;
        var toggles = root.querySelectorAll('[data-action="toggle"]');
        for (var i = 0; i < toggles.length; i++) {
            toggles[i].checked = Boolean(getPath(settings, toggles[i].getAttribute("data-path")));
        }
        var ranges = root.querySelectorAll('[data-action="range"]');
        for (var r = 0; r < ranges.length; r++) {
            var path = ranges[r].getAttribute("data-path");
            var value = clampNum(getPath(settings, path), 0, 1);
            ranges[r].value = String(Math.round(value * 100));
            self.rangeVisual(ranges[r]);
            var label = root.querySelector('[data-label-for="' + path + '"]');
            if (label) label.textContent = Math.round(value * 100) + "%";
        }
        var selects = root.querySelectorAll('[data-action="select"]');
        for (var s = 0; s < selects.length; s++) {
            selects[s].value = String(getPath(settings, selects[s].getAttribute("data-path")) || "");
        }
        var nums = root.querySelectorAll('[data-action="num"]');
        for (var n = 0; n < nums.length; n++) {
            nums[n].value = String(Number(getPath(settings, nums[n].getAttribute("data-path"))) || 0);
        }
        // global event defaults cards
        var defaultsBox = root.querySelector('[data-role="default-events"]');
        if (defaultsBox) {
            for (var e = 0; e < PUSS_EVENTS.length; e++) {
                var eventType = PUSS_EVENTS[e];
                var card = this.buildEventCard(eventType, (settings.defaults || {})[eventType] || {}, {allowInherit: false, scope: "panel-defaults"});
                defaultsBox.appendChild(card);
            }
        }
        // users
        this.fillUsersInto(root.querySelector('[data-role="users"]'));
        this.panelContainer.replaceChildren(root);
    };

    PussUI.prototype.fillUsersInto = function (usersBox) {
        if (!usersBox) return;
        usersBox.replaceChildren();
        var settings = this.panelSettings || {};
        var entries = [];
        var users = settings.users || {};
        for (var key in users) {
            if (Object.prototype.hasOwnProperty.call(users, key)) entries.push([key, users[key]]);
        }
        if (!entries.length) {
            var empty = document.createElement("div");
            empty.className = "puss-empty";
            empty.textContent = this.text("emptyUsers");
            usersBox.appendChild(empty);
            return;
        }
        var self = this;
        for (var i = 0; i < entries.length; i++) {
            var userId = entries[i][0];
            var entry = entries[i][1] || {};
            var row = this.tpl("user-row");
            this.applyI18n(row);
            row.querySelector(".puss-user").setAttribute("data-user", userId);
            var identity = entry.identity || {};
            var live = null;
            if (self.host && self.host.resolveUser) {
                try { live = self.host.resolveUser(userId); } catch (_) { live = null; }
            }
            var avatar = row.querySelector('[data-role="avatar"]');
            if (avatar) {
                var avatarUrl = identity.avatar || (live && live.avatar) || "";
                if (avatarUrl) { avatar.src = avatarUrl; avatar.removeAttribute("hidden"); }
                else avatar.style.visibility = "hidden";
            }
            var nameEl = row.querySelector('[data-role="name"]');
            if (nameEl) nameEl.textContent = self.displayName(identity, live, userId);
            var idEl = row.querySelector('[data-role="id"]');
            if (idEl) idEl.textContent = userId;
            var summary = row.querySelector('[data-role="summary"]');
            if (summary) {
                var parts = [];
                for (var e = 0; e < PUSS_EVENTS.length; e++) {
                    var et = PUSS_EVENTS[e];
                    parts.push(self.text(et) + ": " + self.text((entry[et] && entry[et].mode) || "inherit"));
                }
                summary.textContent = parts.join("  |  ");
            }
            usersBox.appendChild(row);
        }
    };

    PussUI.prototype.rerenderUsers = function () {
        if (!this.panelContainer) return;
        var box = this.panelContainer.querySelector('[data-role="users"]');
        if (box) this.fillUsersInto(box);
    };

    PussUI.prototype.displayName = function (identity, live, fallback) {
        var name = (identity && (identity.globalName || identity.username)) || (live && (live.globalName || live.username)) || fallback;
        return name || "";
    };

    /* build one event editor card; config is the sound config object */
    PussUI.prototype.buildEventCard = function (eventType, config, opts) {
        opts = opts || {};
        var card = this.tpl("event-card");
        this.applyI18n(card);
        var rootEl = card.querySelector(".puss-card");
        rootEl.setAttribute("data-event", eventType);
        var title = card.querySelector(".puss-card-title");
        if (title) title.textContent = this.text(eventType);
        var modeBtns = card.querySelectorAll('.puss-mode-btn');
        var mode = config.mode || (opts.allowInherit ? "inherit" : "default");
        for (var bi = 0; bi < modeBtns.length; bi++) {
            var b = modeBtns[bi];
            if (!opts.allowInherit && b.getAttribute("data-mode") === "inherit") b.style.display = "none";
            if (b.getAttribute("data-mode") === mode) b.classList.add("active");
        }
        var pathInput = card.querySelector('[data-field="path"]');
        if (pathInput) {
            pathInput.value = config.path || "";
            if (config.path) pathInput.title = config.path;
        }
        var volumeRange = card.querySelector('[data-field="volume"]');
        var volumeLabel = card.querySelector('[data-field="volume-label"]');
        var volume = clampNum(config.volume == null ? 1 : config.volume, 0, 1);
        if (volumeRange) {
            volumeRange.value = String(Math.round(volume * 100));
            this.rangeVisual(volumeRange);
        }
        if (volumeLabel) volumeLabel.textContent = Math.round(volume * 100) + "%";
        return card;
    };

    /* reflect the active mode on the card's mode buttons */
    PussUI.prototype.syncModeButtons = function (card, mode) {
        if (!card) return;
        var btns = card.querySelectorAll(".puss-mode-btn");
        for (var i = 0; i < btns.length; i++) {
            btns[i].classList.toggle("active", btns[i].getAttribute("data-mode") === mode);
        }
    };

    /* ---------- panel event delegation ---------- */
    PussUI.prototype.attachPanelEvents = function (container) {
        if (container.__pussBound) return;
        container.__pussBound = true;
        var self = this;
        container.addEventListener("input", function (event) {
            var el = event.target && event.target.closest ? event.target.closest("[data-action]") : null;
            if (!el) return;
            var action = el.getAttribute("data-action");
            if (action === "range") self.panelRangeInput(el);
            else if (action === "range-field") self.cardRangeInput(el, "panel-defaults");
        });
        container.addEventListener("change", function (event) {
            var el = event.target && event.target.closest ? event.target.closest("[data-action]") : null;
            if (!el) return;
            self.panelChange(el);
        });
        container.addEventListener("click", function (event) {
            var el = event.target && event.target.closest ? event.target.closest("[data-action]") : null;
            if (!el) return;
            self.panelClick(el);
        });
    };

    PussUI.prototype.commitPanel = function () {
        if (this.host && this.host.commitSettings && this.panelSettings) {
            try {
                this.host.commitSettings(deepClone(this.panelSettings));
            }
            catch (error) {
                this.log("[commitPanel error]", error && error.message);
            }
        }
    };

    PussUI.prototype.panelRangeInput = function (el) {
        var path = el.getAttribute("data-path");
        var value = clampNum(Number(el.value) / 100, 0, 1);
        setPath(this.panelSettings, path, value);
        var label = this.panelContainer && this.panelContainer.querySelector('[data-label-for="' + path + '"]');
        if (label) label.textContent = Math.round(value * 100) + "%";
        this.rangeVisual(el);
    };

    PussUI.prototype.cardRangeInput = function (el, scope) {
        var card = el.closest("[data-event]");
        if (!card) return;
        var eventType = card.getAttribute("data-event");
        var value = clampNum(Number(el.value) / 100, 0, 1);
        var config = this.configFor(card, scope);
        if (config) config.volume = value;
        var label = card.querySelector('[data-field="volume-label"]');
        if (label) label.textContent = Math.round(value * 100) + "%";
        this.rangeVisual(el);
        if (scope === "panel-defaults") {
            setPath(this.panelSettings, "defaults." + eventType + ".volume", value);
            this.debounceCommit();
        }
    };

    PussUI.prototype.configFor = function (card, scope) {
        if (!card) return null;
        var eventType = card.getAttribute("data-event");
        if (scope === "user") {
            if (!this.modalDraft) return null;
            return (this.modalDraft.settings || {})[eventType] || null;
        }
        // panel-defaults
        if (!this.panelSettings) return null;
        var defaults = this.panelSettings.defaults || {};
        if (!defaults[eventType]) defaults[eventType] = {mode: "default", path: null, source: null, volume: 1};
        return defaults[eventType];
    };

    PussUI.prototype.panelChange = function (el) {
        var action = el.getAttribute("data-action");
        var settings = this.panelSettings;
        if (!settings) return;
        if (action === "toggle") {
            setPath(settings, el.getAttribute("data-path"), el.checked);
            this.commitPanel();
        }
        else if (action === "select") {
            setPath(settings, el.getAttribute("data-path"), el.value);
            this.commitPanel();
        }
        else if (action === "num") {
            setPath(settings, el.getAttribute("data-path"), Math.max(0, Number(el.value) || 0));
            this.commitPanel();
        }
        else if (action === "range") {
            this.commitPanel();
        }
        else if (action === "select-field") {
            var card = el.closest("[data-event]");
            if (!card) return;
            var scope = this.scopeOf(el);
            if (scope === "panel-defaults") {
                setPath(settings, "defaults." + card.getAttribute("data-event") + ".mode", el.value);
                this.commitPanel();
            }
            else if (scope === "user") {
                var config = this.configFor(card, "user");
                if (config) config.mode = el.value;
            }
        }
        else if (action === "path-field") {
            var cardPath = el.closest("[data-event]");
            if (!cardPath) return;
            var scopePath = this.scopeOf(el);
            if (scopePath === "panel-defaults") {
                setPath(settings, "defaults." + cardPath.getAttribute("data-event") + ".path", el.value ? el.value : null);
                setPath(settings, "defaults." + cardPath.getAttribute("data-event") + ".source", null);
                this.commitPanel();
            }
            else if (scopePath === "user") {
                var userConfig = this.configFor(cardPath, "user");
                if (userConfig) {
                    userConfig.path = el.value ? el.value : null;
                    userConfig.source = null;
                }
            }
        }
    };

    PussUI.prototype.scopeOf = function (el) {
        var scopeRoot = el.closest("[data-scope]");
        return scopeRoot ? scopeRoot.getAttribute("data-scope") : "panel-defaults";
    };

    PussUI.prototype.debounceCommit = function () {
        var self = this;
        if (this._commitTimer) clearTimeout(this._commitTimer);
        this._commitTimer = setTimeout(function () {
            self._commitTimer = null;
            self.commitPanel();
        }, 120);
    };

    PussUI.prototype.panelClick = function (el) {
        var action = el.getAttribute("data-action");
        var self = this;
        if (action === "compat") {
            var rows = (this.host && this.host.compatibilityRows) ? this.host.compatibilityRows() : [
                ["Dispatcher", true], ["SoundUtils", true], ["DesktopNotification", true],
                ["CallStore", true], ["VoiceStateStore", true], ["Context menu patch", false],
                ["Sound prototype patch", false], ["Active unpatches", false]
            ];
            this.openCompatibility(rows);
        }
        else if (action === "add-user") {
            var input = this.panelContainer && this.panelContainer.querySelector('[data-role="uid-input"]');
            var raw = input ? String(input.value || "").replace(/\D/g, "") : "";
            if (!raw) return;
            var result = this.host && this.host.addUserById ? this.host.addUserById(raw) : {error: "userNotFound"};
            if (result && result.error) {
                if (this.host && this.host.toast) this.host.toast(this.text(result.error), "error");
            }
            else {
                if (this.host && this.host.getSettings) {
                    try { this.panelSettings = this.host.getSettings(); } catch (_) {}
                }
                if (input) input.value = "";
                this.rerenderUsers();
            }
        }
        else if (action === "edit-user") {
            var row = el.closest("[data-user]");
            if (!row) return;
            var userId = row.getAttribute("data-user");
            this.openUserModalFor(userId);
        }
        else if (action === "remove-user") {
            var rowRemove = el.closest("[data-user]");
            if (!rowRemove) return;
            var removeId = rowRemove.getAttribute("data-user");
            if (this.host && this.host.removeUser) this.host.removeUser(removeId);
            if (this.host && this.host.getSettings) {
                try { this.panelSettings = this.host.getSettings(); } catch (_) {}
            }
            this.rerenderUsers();
        }
        else if (action === "set-mode") {
            var cardM = el.closest("[data-event]");
            if (!cardM) return;
            var scopeM = this.scopeOf(el);
            var modeValue = el.getAttribute("data-mode");
            var configM = this.configFor(cardM, scopeM);
            if (!configM) return;
            configM.mode = modeValue;
            this.syncModeButtons(cardM, modeValue);
            if (scopeM === "panel-defaults") {
                setPath(this.panelSettings, "defaults." + cardM.getAttribute("data-event") + ".mode", modeValue);
                this.commitPanel();
            }
        }
        else if (action === "choose") {
            var card = el.closest("[data-event]");
            if (!card) return;
            var scope = this.scopeOf(el);
            var config = this.configFor(card, scope);
            if (!config) return;
            if (!this.host || !this.host.pickAudioFile) return;
            this.host.pickAudioFile().then(function (picked) {
                if (!picked) return;
                config.mode = "custom";
                config.path = picked.path || null;
                config.source = picked.source || null;
                var pathInput = card.querySelector('[data-field="path"]');
                if (pathInput) {
                    pathInput.value = config.path || "";
                    pathInput.title = config.path || "";
                }
                self.syncModeButtons(card, "custom");
                if (scope === "panel-defaults") {
                    self.commitPanel();
                }
            }).catch(function () {});
        }
        else if (action === "preview") {
            var cardP = el.closest("[data-event]");
            if (!cardP) return;
            var configP = this.configFor(cardP, this.scopeOf(el));
            if (configP && this.host && this.host.preview) this.host.preview(configP, configP.volume || 1);
        }
        else if (action === "diagnose") {
            var cardD = el.closest("[data-event]");
            if (!cardD) return;
            var configD = this.configFor(cardD, this.scopeOf(el));
            if (configD && this.host && this.host.diagnose) this.host.diagnose(configD, configD.volume || 1);
        }
        else if (action === "stop") {
            if (this.host && this.host.stopPreview) this.host.stopPreview();
        }
        else if (action === "clear") {
            var cardC = el.closest("[data-event]");
            if (!cardC) return;
            var scopeC = this.scopeOf(el);
            var configC = this.configFor(cardC, scopeC);
            if (!configC) return;
            configC.path = null;
            configC.source = null;
            var pathInputC = cardC.querySelector('[data-field="path"]');
            if (pathInputC) {
                pathInputC.value = "";
                pathInputC.title = "";
            }
            if (scopeC === "panel-defaults") this.commitPanel();
        }
    };

    /* ---------- user modal ---------- */
    PussUI.prototype.openUserModalFor = function (userId) {
        if (!this.host) return;
        var settings = this.panelSettings || {};
        var entry = (settings.users || {})[userId] || null;
        var live = null;
        try { live = this.host.resolveUser ? this.host.resolveUser(userId) : null; } catch (_) { live = null; }
        var draft = entry ? deepClone(entry) : {
            identity: {
                username: (live && live.username) || userId,
                globalName: (live && live.globalName) || "",
                avatar: (live && live.avatar) || null
            },
            message: {mode: "inherit", path: null, source: null, volume: 1},
            incomingCall: {mode: "inherit", path: null, source: null, volume: 1},
            disconnect: {mode: "inherit", path: null, source: null, volume: 1},
            voiceJoin: {mode: "inherit", path: null, source: null, volume: 1}
        };
        this.openUserModal({
            userId: userId,
            avatar: (draft.identity && draft.identity.avatar) || (live && live.avatar) || "",
            name: this.displayName(draft.identity, live, userId),
            username: (draft.identity && draft.identity.username) || (live && live.username) || "",
            settings: draft,
            canReset: Boolean(entry)
        });
    };

    PussUI.prototype.openUserModal = function (payload) {
        var self = this;
        // Guard: repeated invocations (e.g. repeated context-menu clicks) must
        // not stack duplicate user modals — close any previously open one.
        for (var mi = this.modals.length - 1; mi >= 0; mi--) {
            if (this.modals[mi].userModal) this.closeModalEntry(this.modals[mi]);
        }
        var body = this.tpl("user-modal");
        this.applyI18n(body);
        var draft = deepClone(payload.settings || {});
        this.modalDraft = {userId: payload.userId, settings: draft};
        var avatar = body.querySelector('[data-role="avatar"]');
        if (avatar) {
            if (payload.avatar) { avatar.src = payload.avatar; avatar.removeAttribute("hidden"); }
            else avatar.style.visibility = "hidden";
        }
        var nameEl = body.querySelector('[data-role="name"]');
        if (nameEl) nameEl.textContent = payload.name || payload.userId;
        var usernameEl = body.querySelector('[data-role="username"]');
        if (usernameEl) usernameEl.textContent = payload.username || "";
        var idEl = body.querySelector('[data-role="id"]');
        if (idEl) idEl.textContent = payload.userId;
        var eventsBox = body.querySelector('[data-role="events"]');
        if (eventsBox) {
            for (var e = 0; e < PUSS_EVENTS.length; e++) {
                var eventType = PUSS_EVENTS[e];
                var config = draft[eventType] || {mode: "inherit", path: null, source: null, volume: 1};
                if (!draft[eventType]) draft[eventType] = config;
                var card = this.buildEventCard(eventType, config, {allowInherit: true, scope: "user"});
                eventsBox.appendChild(card);
            }
        }
        this.openModalFrame({
            title: this.text("configure"),
            body: body,
            footer: this.buildUserModalFooter(payload),
            userModal: true,
            onCancel: function () {
                if (self.host && self.host.stopPreview) self.host.stopPreview();
                self.modalDraft = null;
            }
        });
        // Delegate events on the live modal body element (a DocumentFragment
        // cannot be an event root once its children are moved into the DOM).
        var overlays = document.querySelectorAll(".puss-overlay");
        var lastOverlay = overlays.length ? overlays[overlays.length - 1] : null;
        var liveBody = lastOverlay && lastOverlay.querySelector(".puss-modal-body");
        if (liveBody) this.attachModalEvents(liveBody);
    };

    PussUI.prototype.buildUserModalFooter = function (payload) {
        var self = this;
        var left = document.createElement("div");
        var resetBtn = document.createElement("button");
        resetBtn.type = "button";
        resetBtn.className = "puss-btn puss-btn-danger";
        resetBtn.textContent = this.text("resetUser");
        resetBtn.addEventListener("click", function () {
            var id = self.modalDraft && self.modalDraft.userId;
            if (id && self.host && self.host.resetUser) self.host.resetUser(id);
            self.closeTopModal();
            self.rerenderUsers();
        });
        left.appendChild(resetBtn);

        var right = document.createElement("div");
        right.className = "puss-btn-group";
        var stopBtn = document.createElement("button");
        stopBtn.type = "button";
        stopBtn.className = "puss-btn puss-btn-secondary";
        stopBtn.textContent = this.text("stop");
        stopBtn.addEventListener("click", function () {
            if (self.host && self.host.stopPreview) self.host.stopPreview();
        });
        var cancelBtn = document.createElement("button");
        cancelBtn.type = "button";
        cancelBtn.className = "puss-btn puss-btn-secondary";
        cancelBtn.textContent = this.text("cancel");
        cancelBtn.addEventListener("click", function () {
            self.closeTopModal();
        });
        var saveBtn = document.createElement("button");
        saveBtn.type = "button";
        saveBtn.className = "puss-btn puss-btn-primary";
        saveBtn.textContent = this.text("save");
        saveBtn.addEventListener("click", function () {
            var draft = self.modalDraft;
            if (!draft) return;
            if (self.host && self.host.saveUserDraft) self.host.saveUserDraft(draft.userId, deepClone(draft.settings));
            self.modalDraft = null;
            self.closeTopModal();
            self.rerenderUsers();
        });
        right.appendChild(stopBtn);
        right.appendChild(cancelBtn);
        right.appendChild(saveBtn);

        var footer = document.createElement("div");
        footer.style.display = "contents";
        footer.appendChild(left);
        footer.appendChild(right);
        return footer;
    };

    PussUI.prototype.attachModalEvents = function (root) {
        var self = this;
        root.addEventListener("click", function (event) {
            var el = event.target && event.target.closest ? event.target.closest("[data-action]") : null;
            if (!el) return;
            var action = el.getAttribute("data-action");
            if (action === "open-help") self.openHelp();
            else if (action === "close-modal") self.closeTopModal();
            else self.panelClick(el); // choose/preview/diagnose/stop/clear/set-mode on event cards
        });
        root.addEventListener("input", function (event) {
            var el = event.target && event.target.closest ? event.target.closest("[data-action]") : null;
            if (!el) return;
            var action = el.getAttribute("data-action");
            if (action === "range-field") self.cardRangeInput(el, "user");
            else if (action === "path-field") {
                var card = el.closest("[data-event]");
                var config = card && self.configFor(card, "user");
                if (config) {
                    config.path = el.value ? el.value : null;
                    config.source = null;
                }
            }
        });
        root.addEventListener("change", function (event) {
            var el = event.target && event.target.closest ? event.target.closest("[data-action]") : null;
            if (!el) return;
            var action = el.getAttribute("data-action");
            if (action === "select-field") {
                var card = el.closest("[data-event]");
                var config = card && self.configFor(card, "user");
                if (config) config.mode = el.value;
            }
            else if (action === "path-field") {
                var cardP = el.closest("[data-event]");
                var configP = cardP && self.configFor(cardP, "user");
                if (configP) {
                    configP.path = el.value ? el.value : null;
                    configP.source = null;
                }
            }
        });
    };

    /* ---------- modal frame ---------- */
    PussUI.prototype.openModalFrame = function (opts) {
        var self = this;
        var overlay = document.createElement("div");
        overlay.className = "puss-overlay";
        var modal = document.createElement("div");
        modal.className = "puss-modal" + (opts.small ? " puss-modal-sm" : "");
        var header = document.createElement("div");
        header.className = "puss-modal-header";
        var title = document.createElement("h2");
        title.className = "puss-modal-title";
        title.textContent = opts.title || "";
        header.appendChild(title);
        var body = document.createElement("div");
        body.className = "puss-modal-body";
        body.appendChild(opts.body);
        var footer = document.createElement("div");
        footer.className = "puss-modal-footer";
        footer.appendChild(opts.footer || this.buildInfoFooter());
        modal.appendChild(header);
        modal.appendChild(body);
        modal.appendChild(footer);
        overlay.appendChild(modal);
        var entry = {
            overlay: overlay,
            modal: modal,
            onCancel: opts.onCancel || null,
            onClose: opts.onClose || null,
            userModal: Boolean(opts.userModal)
        };
        this.modals.push(entry);
        (document.body || document.documentElement).appendChild(overlay);
        if (!this._escBound) {
            this._escBound = function (event) {
                if (event.key !== "Escape") return;
                if (!self.modals.length) return;
                var top = self.modals[self.modals.length - 1];
                self.closeModalEntry(top);
            };
            document.addEventListener("keydown", this._escBound, true);
        }
        overlay.addEventListener("mousedown", function (event) {
            if (event.target === overlay) self.closeModalEntry(entry);
        });
        // focus first focusable
        var focusable = modal.querySelector("input, select, button");
        if (focusable && focusable.focus) {
            try { setTimeout(function () { focusable.focus(); }, 10); } catch (_) {}
        }
    };

    PussUI.prototype.buildInfoFooter = function () {
        var self = this;
        var group = document.createElement("div");
        group.className = "puss-btn-group";
        var ok = document.createElement("button");
        ok.type = "button";
        ok.className = "puss-btn puss-btn-primary";
        ok.textContent = "OK";
        ok.addEventListener("click", function () { self.closeTopModal(); });
        group.appendChild(ok);
        return group;
    };

    PussUI.prototype.closeTopModal = function () {
        if (!this.modals.length) return;
        this.closeModalEntry(this.modals[this.modals.length - 1]);
    };

    PussUI.prototype.closeModalEntry = function (entry) {
        var index = this.modals.indexOf(entry);
        if (index === -1) return;
        this.modals.splice(index, 1);
        try {
            if (entry.onClose) entry.onClose();
            if (entry.onCancel) entry.onCancel();
        }
        catch (error) { /* ignore */ }
        if (entry.overlay && entry.overlay.parentNode) entry.overlay.parentNode.removeChild(entry.overlay);
        if (!this.modals.length && this._escBound) {
            document.removeEventListener("keydown", this._escBound, true);
            this._escBound = null;
        }
    };

    /* ---------- info modals ---------- */
    PussUI.prototype.openHelp = function () {
        var body = this.tpl("help");
        var table = body.querySelector(".puss-diag-table") || body;
        var keys = [["inherit", "inheritDescription"], ["default", "defaultDescription"], ["custom", "customDescription"], ["silent", "silentDescription"]];
        for (var i = 0; i < keys.length; i++) {
            var rowEl = this.tpl("help-row");
            rowEl.querySelector(".puss-help-mode").textContent = this.text(keys[i][0]);
            var desc = rowEl.querySelector(".puss-diag-value");
            desc.textContent = this.text(keys[i][1]);
            table.appendChild(rowEl);
        }
        this.openModalFrame({title: this.text("modeHelpTitle"), body: body});
    };

    PussUI.prototype.openDiagnostics = function (filePath, rows) {
        var body = this.tpl("diagnostics");
        var pathEl = body.querySelector('[data-role="path"]');
        if (pathEl) pathEl.textContent = filePath || "";
        var rowsBox = body.querySelector('[data-role="rows"]');
        if (rowsBox) {
            for (var i = 0; i < rows.length; i++) {
                var row = this.tpl("diag-row");
                row.querySelector(".puss-diag-label").textContent = String(rows[i][0] == null ? "" : rows[i][0]);
                row.querySelector(".puss-diag-value").textContent = String(rows[i][1] == null ? "" : rows[i][1]);
                rowsBox.appendChild(row);
            }
        }
        this.openModalFrame({title: this.text("audioDiagnostics"), body: body});
    };

    PussUI.prototype.openCompatibility = function (rows) {
        var body = this.tpl("compatibility");
        var table = body.querySelector(".puss-diag-table") || body;
        for (var i = 0; i < rows.length; i++) {
            var row = this.tpl("compat-row");
            row.querySelector(".puss-diag-label").textContent = String(rows[i][0] == null ? "" : rows[i][0]);
            var value = row.querySelector(".puss-diag-value");
            value.textContent = rows[i][1] ? this.text("yes") : this.text("no");
            value.className = "puss-diag-value " + (rows[i][1] ? "puss-compat-ok" : "puss-compat-bad");
            table.appendChild(row);
        }
        this.openModalFrame({title: this.text("compatibility"), body: body});
    };

    /* ---------- misc ---------- */
    PussUI.prototype.log = function () {
        if (isInDiscord()) return;
        var args = Array.prototype.slice.call(arguments);
        var el = document.getElementById("puss-log");
        if (!el) return;
        var line = args.map(function (a) { return typeof a === "string" ? a : JSON.stringify(a); }).join(" ");
        el.textContent += "› " + line + "\n";
        el.scrollTop = el.scrollHeight;
    };

    PussUI.prototype.rerenderAll = function () {
        while (this.modals.length) {
            this.closeModalEntry(this.modals[this.modals.length - 1]);
        }
        if (this.panelContainer) this.renderPanel();
    };

    PussUI.prototype.destroy = function () {
        while (this.modals.length) {
            this.closeModalEntry(this.modals[this.modals.length - 1]);
        }
        // Belt and braces: forcibly drop any overlay that escaped tracking
        // (e.g. created by a UI instance that was discarded without destroy).
        var orphans = document.querySelectorAll(".puss-overlay");
        for (var i = 0; i < orphans.length; i++) {
            var node = orphans[i];
            if (node.parentNode) node.parentNode.removeChild(node);
        }
        if (this._escBound) {
            document.removeEventListener("keydown", this._escBound, true);
            this._escBound = null;
        }
        if (this._commitTimer) {
            clearTimeout(this._commitTimer);
            this._commitTimer = null;
        }
        this.unmountPanel();
    };

    global.PussUI = PussUI;
    global.PUSS_TEXT = PUSS_TEXT;
    global.__puss = {
        events: PUSS_EVENTS,
        modes: PUSS_MODES,
        clone: deepClone,
        clamp: clampNum,
        isInDiscord: isInDiscord
    };
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));

const PUSS_STYLES = "/* ===== Palette for browser preview only (never present inside Discord) ===== */\n:root[data-puss-preview=\"dark\"] {\n    --background-primary: #313338; --background-secondary: #2b2d31;\n    --background-secondary-alt: #292b2f; --background-tertiary: #1e1f22;\n    --background-floating: #2b2d31; --background-modifier-hover: rgba(255,255,255,.06);\n    --background-modifier-accent: rgba(255,255,255,.06); --input-background: #1e1f22;\n    --text-normal: #dbdee1; --text-muted: #949ba4; --text-link: #00a8fc;\n    --header-primary: #f2f3f5; --interactive-normal: #b5bac1;\n    --interactive-hover: #dbdee1; --interactive-active: #f2f3f5;\n    --brand-experiment: #5865f2; --status-danger: #f23f43; --status-positive: #23a55a;\n    --puss-overlay-bg: rgba(0,0,0,.6); --puss-shadow: 0 8px 40px rgba(0,0,0,.4);\n    --puss-card-bg: transparent; --puss-track: rgba(255,255,255,.08);\n    --scrollbar-thin-thumb: rgba(255,255,255,.32); --scrollbar-thin-track: transparent;\n}\n:root[data-puss-preview=\"light\"] {\n    --background-primary: #ffffff; --background-secondary: #f2f3f5;\n    --background-secondary-alt: #ebedef; --background-tertiary: #e3e5e8;\n    --background-floating: #ffffff; --background-modifier-hover: rgba(0,0,0,.05);\n    --background-modifier-accent: rgba(0,0,0,.08); --input-background: #e3e5e8;\n    --text-normal: #313338; --text-muted: #5c5e66; --text-link: #0067e0;\n    --header-primary: #060607; --interactive-normal: #4e5058;\n    --interactive-hover: #2e3036; --interactive-active: #060607;\n    --brand-experiment: #5865f2; --status-danger: #d83c3e; --status-positive: #248046;\n    --puss-overlay-bg: rgba(0,0,0,.5); --puss-shadow: 0 8px 40px rgba(0,0,0,.16);\n    --puss-card-bg: transparent; --puss-track: rgba(0,0,0,.1);\n    --scrollbar-thin-thumb: rgba(0,0,0,.28); --scrollbar-thin-track: transparent;\n}\n\n/* ===== Scope ===== */\n.puss, .puss * { box-sizing: border-box; }\n.puss {\n    color: var(--text-normal, #dbdee1);\n    font-family: \"gg sans\", \"Noto Sans\", \"Helvetica Neue\", Helvetica, Arial, sans-serif;\n    font-size: 14px; line-height: 1.4; max-width: 920px;\n    padding: 16px;\n}\n.puss button { font-family: inherit; }\n.puss-panel-host:empty { display: none; }\n\n/* ===== Sections ===== */\n.puss-section { margin-bottom: 24px; }\n.puss-section-title {\n    text-transform: uppercase; font-size: 12px; font-weight: 700;\n    letter-spacing: .02em; color: var(--text-muted, #949ba4); margin: 0 0 12px;\n    display: flex; align-items: center; gap: 8px;\n}\n\n/* ===== Rows & fields ===== */\n.puss-row {\n    display: flex; align-items: center; justify-content: space-between;\n    gap: 16px; padding: 10px 0; border-bottom: 1px solid var(--background-modifier-accent, rgba(255,255,255,.06));\n}\n.puss-row:last-child { border-bottom: none; }\n.puss-row-label { font-weight: 500; }\n.puss-row .puss-select { flex: 0 1 320px; }\n.puss-field { margin: 0 0 10px; }\n.puss-field:last-child { margin-bottom: 0; }\n.puss-field-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; gap: 12px; }\n.puss-field-label { font-size: 12px; font-weight: 600; color: var(--text-muted, #949ba4); text-transform: uppercase; letter-spacing: .02em; }\n.puss-range-value { font-size: 13px; font-weight: 600; color: var(--interactive-active, #f2f3f5); font-variant-numeric: tabular-nums; }\n\n/* ===== Inputs ===== */\n.puss-input, .puss-select {\n    width: 100%; padding: 8px 10px; border-radius: 4px;\n    background: var(--input-background, #1e1f22);\n    color: var(--text-normal, #dbdee1);\n    border: 1px solid transparent; outline: none;\n}\n.puss-input:focus, .puss-select:focus { border-color: var(--brand-experiment, #5865f2); }\n.puss-input::placeholder { color: var(--text-muted, #949ba4); }\n.puss-input-number { width: 140px; }\n.puss-select { cursor: pointer; }\n\n/* ===== Range slider ===== */\n.puss-range {\n    -webkit-appearance: none; appearance: none; width: 100%; height: 4px;\n    border-radius: 2px; outline: none; cursor: pointer;\n    background: var(--puss-track, rgba(255,255,255,.08));\n}\n.puss-range::-webkit-slider-thumb {\n    -webkit-appearance: none; appearance: none; width: 16px; height: 16px; border-radius: 50%;\n    background: var(--interactive-active, #f2f3f5); border: none; cursor: pointer;\n    box-shadow: 0 1px 3px rgba(0,0,0,.35); margin-top: 0;\n}\n.puss-range::-moz-range-thumb {\n    width: 16px; height: 16px; border-radius: 50%;\n    background: var(--interactive-active, #f2f3f5); border: none; cursor: pointer;\n}\n\n/* ===== Buttons ===== */\n.puss-btn {\n    display: inline-flex; align-items: center; justify-content: center; gap: 6px;\n    padding: 8px 14px; border-radius: 4px; border: none; cursor: pointer;\n    font-size: 13px; font-weight: 500; color: var(--interactive-normal, #b5bac1);\n    background: var(--background-secondary-alt, #292b2f);\n    transition: background-color .12s ease, color .12s ease;\n}\n.puss-btn:hover { color: var(--interactive-hover, #dbdee1); background: var(--background-modifier-hover, rgba(255,255,255,.06)); }\n.puss-btn-sm { padding: 4px 10px; font-size: 12px; }\n.puss-btn-primary { background: var(--brand-experiment, #5865f2); color: #fff; }\n.puss-btn-primary:hover { background: var(--brand-experiment, #5865f2); filter: brightness(1.08); color: #fff; }\n.puss-btn-danger { background: transparent; color: var(--status-danger, #f23f43); border: 1px solid var(--background-modifier-accent, rgba(255,255,255,.06)); }\n.puss-btn-danger:hover { background: var(--status-danger, #f23f43); color: #fff; }\n.puss-btn:disabled { opacity: .5; cursor: not-allowed; }\n.puss-btn-row { display: flex; flex-wrap: wrap; gap: 6px; }\n\n/* ===== Switch ===== */\n.puss-switch { position: relative; display: inline-block; width: 44px; height: 24px; flex: 0 0 auto; }\n.puss-switch-input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: pointer; z-index: 2; }\n.puss-switch-slider { position: absolute; inset: 0; border-radius: 12px; background: var(--puss-track, rgba(255,255,255,.08)); transition: background-color .15s ease; pointer-events: none; }\n.puss-switch-slider::before {\n    content: \"\"; position: absolute; top: 2px; left: 2px; width: 20px; height: 20px;\n    border-radius: 50%; background: var(--interactive-normal, #b5bac1);\n    transition: transform .15s ease, background-color .15s ease;\n}\n.puss-switch-input:checked + .puss-switch-slider { background: var(--brand-experiment, #5865f2); }\n.puss-switch-input:checked + .puss-switch-slider::before { transform: translateX(20px); background: #fff; }\n.puss-switch-input:focus-visible + .puss-switch-slider { box-shadow: 0 0 0 2px var(--background-primary, #313338), 0 0 0 4px var(--brand-experiment, #5865f2); }\n\n/* ===== Event cards ===== */\n.puss-event-list { display: grid; gap: 10px; }\n.puss-event-list-2 { grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }\n.puss-card {\n    border: 1px solid var(--background-modifier-accent, rgba(255,255,255,.06));\n    border-radius: 8px; padding: 12px 12px 14px; background: var(--puss-card-bg, transparent);\n}\n.puss-card-title { font-size: 14px; font-weight: 700; color: var(--header-primary, #f2f3f5); margin-bottom: 10px; display: block; }\n.puss-card-title .puss-card-sub { font-weight: 400; font-size: 12px; color: var(--text-muted, #949ba4); margin-left: 6px; }\n\n/* ===== Users list ===== */\n.puss-empty { color: var(--text-muted, #949ba4); font-size: 13px; padding: 12px 0; }\n.puss-add-row { display: flex; gap: 8px; margin-bottom: 12px; }\n.puss-add-row .puss-input { flex: 1; min-width: 180px; }\n.puss-user {\n    display: grid; grid-template-columns: 40px minmax(140px, 1fr) minmax(200px, 1.4fr) auto;\n    gap: 12px; align-items: center; padding: 10px;\n    border: 1px solid var(--background-modifier-accent, rgba(255,255,255,.06)); border-radius: 8px; margin-bottom: 8px;\n}\n.puss-user-avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--background-secondary, #2b2d31); object-fit: cover; }\n.puss-user-name { font-weight: 600; color: var(--header-primary, #f2f3f5); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n.puss-user-id { font-size: 12px; color: var(--text-muted, #949ba4); }\n.puss-user-summary { font-size: 12px; color: var(--text-muted, #949ba4); line-height: 1.5; }\n.puss-user-actions { display: flex; gap: 6px; justify-content: flex-end; }\n\n/* ===== Modal ===== */\n.puss-overlay {\n    position: fixed; inset: 0; z-index: 100000;\n    background: var(--puss-overlay-bg, rgba(0,0,0,.6));\n    display: flex; align-items: center; justify-content: center; padding: 24px;\n    animation: puss-fade .12s ease;\n}\n.puss-modal {\n    background: var(--background-floating, #2b2d31);\n    border-radius: 8px; border: 1px solid var(--background-modifier-accent, rgba(255,255,255,.08));\n    box-shadow: var(--puss-shadow, 0 12px 48px rgba(0,0,0,.55));\n    width: 620px; max-width: 100%; max-height: min(720px, calc(100vh - 48px));\n    display: flex; flex-direction: column; overflow: hidden;\n    animation: puss-pop .14s ease;\n}\n.puss-modal-sm { width: 480px; }\n.puss-modal-header {\n    padding: 16px 16px 0; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;\n    flex: 0 0 auto;\n}\n.puss-modal-title { margin: 0; font-size: 20px; font-weight: 700; color: var(--header-primary, #f2f3f5); line-height: 1.2; }\n.puss-modal-body { padding: 16px; flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }\n.puss-modal-footer {\n    padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; gap: 10px;\n    border-top: 1px solid var(--background-modifier-accent, rgba(255,255,255,.06));\n    flex: 0 0 auto;\n}\n.puss-modal-footer .puss-btn-group { display: flex; gap: 8px; margin-left: auto; }\n\n/* Thin Discord-style scrollbars inside the plugin UI (overlay/modal/panel).\n   In Discord the theme variables are inherited; the preview palettes below\n   define the same names, so one rule works in both environments. */\n.puss ::-webkit-scrollbar,\n.puss-modal ::-webkit-scrollbar {\n    width: 8px; height: 8px;\n}\n.puss ::-webkit-scrollbar-track,\n.puss ::-webkit-scrollbar-track-piece,\n.puss-modal ::-webkit-scrollbar-track,\n.puss-modal ::-webkit-scrollbar-track-piece {\n    background: transparent;\n    border: none;\n}\n.puss ::-webkit-scrollbar-thumb,\n.puss-modal ::-webkit-scrollbar-thumb {\n    background: var(--scrollbar-thin-thumb, rgba(255,255,255,.28));\n    border-radius: 4px;\n}\n.puss ::-webkit-scrollbar-corner,\n.puss-modal ::-webkit-scrollbar-corner {\n    background: transparent;\n}\n\n/* ===== BD host overrides =====\n   When BetterDiscord opens this plugin's settings from the plugin list it wraps\n   the panel in its own modal (.bd-modal-root.bd-modal-medium, ~600px). Widen it\n   so the panel gets room to breathe. :has() scopes this to BD modals that host\n   our panel only; preview mode has no .bd-* classes, so this is inert there. */\n.bd-modal-root:has(.puss-panel-host) {\n    width: min(1000px, calc(100vw - 120px)) !important;\n    max-width: calc(100vw - 120px) !important;\n    height: min(85vh, 940px) !important;\n    max-height: calc(100vh - 120px) !important;\n}\n.bd-modal-root:has(.puss-panel-host) .bd-modal-content {\n    width: auto !important;\n}\n@keyframes puss-fade { from { opacity: 0; } to { opacity: 1; } }\n@keyframes puss-pop { from { opacity: 0; transform: translateY(6px) scale(.98); } to { opacity: 1; transform: none; } }\n\n/* user modal head */\n.puss-user-head { display: flex; gap: 12px; align-items: center; margin-bottom: 10px; }\n.puss-avatar-lg { width: 48px; height: 48px; border-radius: 50%; background: var(--background-secondary, #2b2d31); object-fit: cover; flex: 0 0 auto; }\n.puss-user-head-meta { flex: 1; min-width: 0; }\n.puss-user-name-lg { font-weight: 700; color: var(--header-primary, #f2f3f5); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n.puss-btn-help {\n    width: 30px; height: 30px; border-radius: 50%; border: 1px solid var(--background-modifier-accent, rgba(255,255,255,.06));\n    color: var(--interactive-normal, #b5bac1); background: var(--background-secondary, #2b2d31);\n    cursor: pointer; font-weight: 700; flex: 0 0 auto; line-height: 1;\n}\n.puss-btn-help:hover { color: var(--interactive-hover, #dbdee1); }\n\n/* Mode selector: four outline buttons. Active mode = white text, inactive = grey.\n   Kept quiet: outline only, no fill. */\n.puss-mode-btns { display: flex; flex-wrap: wrap; gap: 6px; margin: 2px 0 4px; }\n.puss-mode-btn {\n    padding: 4px 10px; font-size: 12px; border-radius: 4px; cursor: pointer;\n    background: transparent; line-height: 1.4;\n    border: 1px solid var(--background-modifier-accent, rgba(255,255,255,.08));\n    color: var(--text-muted, #949ba4);\n    transition: border-color .12s ease, color .12s ease;\n}\n.puss-mode-btn:hover { border-color: var(--interactive-normal, #b5bac1); color: var(--interactive-normal, #b5bac1); }\n.puss-mode-btn.active { border-color: var(--interactive-active, #f2f3f5); color: var(--interactive-active, #f2f3f5); }\n.puss-mode-btn:focus-visible { outline: 2px solid var(--brand-experiment, #5865f2); outline-offset: 1px; }\n\n/* File path row: readonly path with ellipsis + \"choose file\" button beside it */\n.puss-path-row { display: flex; gap: 6px; align-items: center; }\n.puss-path-row .puss-input { flex: 1 1 auto; min-width: 0; }\n.puss-path-row .puss-btn { flex: 0 0 auto; white-space: nowrap; }\n.puss-input[readonly] { cursor: default; text-overflow: ellipsis; }\n.puss-input[readonly]:focus { border-color: transparent; }\n\n/* info rows (help / diagnostics / compatibility) */\n.puss-diag-table { display: grid; gap: 4px; }\n.puss-diag-row {\n    display: grid; grid-template-columns: 150px 1fr; gap: 12px; align-items: start;\n    padding: 6px 0; border-bottom: 1px solid var(--background-modifier-accent, rgba(255,255,255,.06));\n    font-size: 13px; word-break: break-all;\n}\n.puss-diag-row:last-child { border-bottom: none; }\n.puss-diag-label { color: var(--text-muted, #949ba4); font-weight: 600; }\n.puss-diag-value { color: var(--text-normal, #dbdee1); font-family: Consolas, \"Courier New\", monospace; font-size: 12px; white-space: pre-wrap; }\n.puss-help-mode { font-weight: 700; color: var(--header-primary, #f2f3f5); }\n.puss-compat-ok { color: var(--status-positive, #23a55a); font-weight: 700; }\n.puss-compat-bad { color: var(--status-danger, #f23f43); font-weight: 700; }\n\n/* ===== Browser preview toolbar (never injected into Discord) ===== */\n.puss-preview-toolbar {\n    position: sticky; top: 0; z-index: 50; display: flex; flex-wrap: wrap; gap: 8px; align-items: center;\n    padding: 10px 14px; margin-bottom: 14px; border-radius: 8px;\n    background: var(--background-secondary, #2b2d31);\n    border: 1px solid var(--background-modifier-accent, rgba(255,255,255,.06));\n    font-size: 12px; color: var(--text-muted, #949ba4);\n}\n.puss-preview-toolbar .puss-btn { padding: 4px 10px; font-size: 12px; }\n.puss-preview-stage { padding-bottom: 40px; }\n.puss-preview-log {\n    margin-top: 18px; padding: 10px; border-radius: 8px; max-height: 180px; overflow: auto;\n    background: #111214; color: #b5bac1; font: 11px/1.5 Consolas, monospace; white-space: pre-wrap;\n}\nbody.puss-preview-body { background: var(--background-primary, #313338); margin: 0; padding: 16px; min-height: 100vh; }\nbody.puss-preview-body .puss-panel-frame {\n    border: 1px solid var(--background-modifier-accent, rgba(255,255,255,.06)); border-radius: 8px; margin-bottom: 12px;\n}\n@media (max-width: 720px) {\n    .puss-user { grid-template-columns: 40px 1fr auto; }\n    .puss-user-summary { display: none; }\n}";
const PUSS_TEMPLATES = {"panel":"<div class=\"puss\">\n    <div class=\"puss-section\" data-section=\"general\">\n        <h3 class=\"puss-section-title\" data-i18n=\"general\"></h3>\n        <label class=\"puss-row\">\n            <span class=\"puss-row-label\" data-i18n=\"enabled\"></span>\n            <span class=\"puss-switch\">\n                <input type=\"checkbox\" class=\"puss-switch-input\" data-action=\"toggle\" data-path=\"global.enabled\">\n                <span class=\"puss-switch-slider\"></span>\n            </span>\n        </label>\n        <div class=\"puss-field\">\n            <div class=\"puss-field-head\">\n                <span class=\"puss-field-label\" data-i18n=\"globalVolume\"></span>\n                <span class=\"puss-range-value\" data-label-for=\"global.volume\"></span>\n            </div>\n            <input type=\"range\" class=\"puss-range\" min=\"0\" max=\"100\" step=\"1\" data-action=\"range\" data-path=\"global.volume\">\n        </div>\n        <div class=\"puss-field\">\n            <div class=\"puss-field-head\">\n                <span class=\"puss-field-label\" data-i18n=\"messageBehavior\"></span>\n            </div>\n            <select class=\"puss-select\" data-action=\"select\" data-path=\"global.messageScope\">\n                <option value=\"follow_discord\" data-i18n=\"follow_discord\"></option>\n                <option value=\"direct_messages\" data-i18n=\"direct_messages\"></option>\n                <option value=\"all_messages\" data-i18n=\"all_messages\"></option>\n            </select>\n        </div>\n        <div class=\"puss-field\">\n            <div class=\"puss-field-head\">\n                <span class=\"puss-field-label\" data-i18n=\"messageCooldown\"></span>\n            </div>\n            <input type=\"number\" class=\"puss-input puss-input-number\" min=\"0\" step=\"100\" data-action=\"num\" data-path=\"global.messageCooldownMs\">\n        </div>\n        <label class=\"puss-row\">\n            <span class=\"puss-row-label\" data-i18n=\"respectDnd\"></span>\n            <span class=\"puss-switch\">\n                <input type=\"checkbox\" class=\"puss-switch-input\" data-action=\"toggle\" data-path=\"global.respectDnd\">\n                <span class=\"puss-switch-slider\"></span>\n            </span>\n        </label>\n        <label class=\"puss-row\">\n            <span class=\"puss-row-label\" data-i18n=\"respectStreamerMode\"></span>\n            <span class=\"puss-switch\">\n                <input type=\"checkbox\" class=\"puss-switch-input\" data-action=\"toggle\" data-path=\"global.respectStreamerMode\">\n                <span class=\"puss-switch-slider\"></span>\n            </span>\n        </label>\n        <label class=\"puss-row\">\n            <span class=\"puss-row-label\" data-i18n=\"playInFocusedChannel\"></span>\n            <span class=\"puss-switch\">\n                <input type=\"checkbox\" class=\"puss-switch-input\" data-action=\"toggle\" data-path=\"global.playInFocusedChannel\">\n                <span class=\"puss-switch-slider\"></span>\n            </span>\n        </label>\n        <label class=\"puss-row\">\n            <span class=\"puss-row-label\" data-i18n=\"replaceNativeSounds\"></span>\n            <span class=\"puss-switch\">\n                <input type=\"checkbox\" class=\"puss-switch-input\" data-action=\"toggle\" data-path=\"global.replaceNativeSounds\">\n                <span class=\"puss-switch-slider\"></span>\n            </span>\n        </label>\n        <label class=\"puss-row\">\n            <span class=\"puss-row-label\" data-i18n=\"debug\"></span>\n            <span class=\"puss-switch\">\n                <input type=\"checkbox\" class=\"puss-switch-input\" data-action=\"toggle\" data-path=\"global.debug\">\n                <span class=\"puss-switch-slider\"></span>\n            </span>\n        </label>\n        <div style=\"margin-top:12px\">\n            <button type=\"button\" class=\"puss-btn puss-btn-secondary\" data-action=\"compat\">\n                <span data-i18n=\"checkCompatibility\"></span>\n            </button>\n        </div>\n    </div>\n\n    <div class=\"puss-section\" data-section=\"defaults\">\n        <h3 class=\"puss-section-title\" data-i18n=\"globalEvents\"></h3>\n        <div class=\"puss-event-list puss-event-list-2\" data-scope=\"panel-defaults\" data-role=\"default-events\"></div>\n    </div>\n\n    <div class=\"puss-section\" data-section=\"users\">\n        <h3 class=\"puss-section-title\" data-i18n=\"configuredUsers\"></h3>\n        <div class=\"puss-add-row\">\n            <input type=\"text\" class=\"puss-input\" data-role=\"uid-input\" placeholder=\"User ID\" inputmode=\"numeric\">\n            <button type=\"button\" class=\"puss-btn puss-btn-secondary\" data-action=\"add-user\"><span data-i18n=\"add\"></span></button>\n        </div>\n        <div data-role=\"users\"></div>\n    </div>\n</div>","event-card":"<div class=\"puss-card\" data-event=\"\">\n    <div class=\"puss-card-title\" data-i18n=\"message\"></div>\n    <div class=\"puss-field\">\n        <div class=\"puss-field-head\">\n            <span class=\"puss-field-label\" data-i18n=\"mode\"></span>\n        </div>\n        <div class=\"puss-mode-btns\" data-role=\"mode-btns\">\n            <button type=\"button\" class=\"puss-mode-btn\" data-action=\"set-mode\" data-mode=\"inherit\"><span data-i18n=\"inherit\"></span></button>\n            <button type=\"button\" class=\"puss-mode-btn\" data-action=\"set-mode\" data-mode=\"default\"><span data-i18n=\"default\"></span></button>\n            <button type=\"button\" class=\"puss-mode-btn\" data-action=\"set-mode\" data-mode=\"custom\"><span data-i18n=\"custom\"></span></button>\n            <button type=\"button\" class=\"puss-mode-btn\" data-action=\"set-mode\" data-mode=\"silent\"><span data-i18n=\"silent\"></span></button>\n        </div>\n    </div>\n    <div class=\"puss-field\">\n        <div class=\"puss-field-head\">\n            <span class=\"puss-field-label\" data-i18n=\"filePath\"></span>\n        </div>\n        <div class=\"puss-path-row\">\n            <input type=\"text\" class=\"puss-input\" data-field=\"path\" data-action=\"path-field\" placeholder=\"C:\\path\\sound.mp3\" spellcheck=\"false\" readonly>\n            <button type=\"button\" class=\"puss-btn puss-btn-secondary\" data-action=\"choose\"><span data-i18n=\"chooseFile\"></span></button>\n        </div>\n    </div>\n    <div class=\"puss-field\">\n        <div class=\"puss-field-head\">\n            <span class=\"puss-field-label\" data-i18n=\"volume\"></span>\n            <span class=\"puss-range-value\" data-field=\"volume-label\"></span>\n        </div>\n        <input type=\"range\" class=\"puss-range\" min=\"0\" max=\"100\" step=\"1\" data-field=\"volume\" data-action=\"range-field\">\n    </div>\n    <div class=\"puss-btn-row\">\n        <button type=\"button\" class=\"puss-btn puss-btn-secondary puss-btn-sm\" data-action=\"preview\"><span data-i18n=\"preview\"></span></button>\n        <button type=\"button\" class=\"puss-btn puss-btn-secondary puss-btn-sm\" data-action=\"diagnose\"><span data-i18n=\"diagnostics\"></span></button>\n        <button type=\"button\" class=\"puss-btn puss-btn-secondary puss-btn-sm\" data-action=\"stop\"><span data-i18n=\"stop\"></span></button>\n        <button type=\"button\" class=\"puss-btn puss-btn-secondary puss-btn-sm\" data-action=\"clear\"><span data-i18n=\"clear\"></span></button>\n    </div>\n</div>","user-row":"<div class=\"puss-user\" data-user=\"\">\n    <img class=\"puss-user-avatar\" alt=\"\">\n    <div>\n        <div class=\"puss-user-name\" data-role=\"name\"></div>\n        <div class=\"puss-user-id\" data-role=\"id\"></div>\n    </div>\n    <div class=\"puss-user-summary\" data-role=\"summary\"></div>\n    <div class=\"puss-user-actions\">\n        <button type=\"button\" class=\"puss-btn puss-btn-secondary puss-btn-sm\" data-action=\"edit-user\"><span data-i18n=\"edit\"></span></button>\n        <button type=\"button\" class=\"puss-btn puss-btn-danger puss-btn-sm\" data-action=\"remove-user\"><span data-i18n=\"remove\"></span></button>\n    </div>\n</div>","user-modal":"<div data-scope=\"user\">\n    <div class=\"puss-user-head\">\n        <img class=\"puss-avatar-lg\" data-role=\"avatar\" alt=\"\">\n        <div class=\"puss-user-head-meta\">\n            <div class=\"puss-user-name-lg\" data-role=\"name\"></div>\n            <div class=\"puss-user-id\" data-role=\"username\"></div>\n            <div class=\"puss-user-id\" data-role=\"id\"></div>\n        </div>\n        <button type=\"button\" class=\"puss-btn-help\" data-action=\"open-help\" data-i18n-title=\"help\">?</button>\n    </div>\n    <div class=\"puss-event-list\" data-role=\"events\"></div>\n</div>","help":"<div class=\"puss-diag-table\"></div>","help-row":"<div class=\"puss-diag-row\">\n    <div class=\"puss-help-mode\"></div>\n    <div class=\"puss-diag-value\"></div>\n</div>","diagnostics":"<div>\n    <div class=\"puss-card-title\" data-role=\"path\" style=\"word-break:break-all\"></div>\n    <div class=\"puss-diag-table\" data-role=\"rows\"></div>\n</div>","diag-row":"<div class=\"puss-diag-row\">\n    <div class=\"puss-diag-label\"></div>\n    <div class=\"puss-diag-value\"></div>\n</div>","compatibility":"<div class=\"puss-diag-table\"></div>","compat-row":"<div class=\"puss-diag-row\">\n    <div class=\"puss-diag-label\"></div>\n    <div class=\"puss-diag-value\"></div>\n</div>"};

const fs = require("fs");

const PLUGIN_NAME = "PersonalUserSounds";
const AUDIO_FILTERS = [{
    name: "Audio",
    extensions: ["mp3", "wav", "ogg", "m4a", "aac", "flac", "webm"]
}];

const EVENT_TYPES = ["message", "incomingCall", "disconnect", "voiceJoin"];
const SOUND_MODES = ["inherit", "default", "custom", "silent"];

const DEFAULT_SETTINGS = {
    schemaVersion: 1,

    global: {
        enabled: true,
        volume: 1,
        respectDnd: true,
        respectStreamerMode: true,
        playInFocusedChannel: false,
        replaceNativeSounds: true,
        messageScope: "follow_discord",
        messageCooldownMs: 800,
        debug: false
    },

    defaults: {
        message: {
            mode: "default",
            path: null,
            volume: 1
        },
        incomingCall: {
            mode: "default",
            path: null,
            volume: 1
        },
        disconnect: {
            mode: "default",
            path: null,
            volume: 1
        },
        voiceJoin: {
            mode: "default",
            path: null,
            volume: 1
        }
    },

    users: {}
};


function clamp(value, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return min;
    return Math.min(max, Math.max(min, number));
}

function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
    if (!isPlainObject(value) && !Array.isArray(value)) return value;
    return JSON.parse(JSON.stringify(value));
}

function deepMerge(defaultValue, savedValue) {
    if (Array.isArray(defaultValue)) return Array.isArray(savedValue) ? savedValue.slice() : defaultValue.slice();
    if (!isPlainObject(defaultValue)) return savedValue === undefined ? defaultValue : savedValue;

    const output = {};
    for (const key of Object.keys(defaultValue)) output[key] = deepMerge(defaultValue[key], savedValue?.[key]);
    if (isPlainObject(savedValue)) {
        for (const key of Object.keys(savedValue)) {
            if (!(key in output)) output[key] = savedValue[key];
        }
    }
    return output;
}

function normalizeSoundConfig(config, fallbackMode) {
    const normalized = deepMerge({mode: fallbackMode, path: null, source: null, volume: 1}, config || {});
    if (!SOUND_MODES.includes(normalized.mode)) normalized.mode = fallbackMode;
    normalized.volume = clamp(normalized.volume, 0, 1);
    normalized.path = typeof normalized.path === "string" && normalized.path ? normalized.path : null;
    normalized.source = typeof normalized.source === "string" && normalized.source.startsWith("data:") ? normalized.source : null;
    return normalized;
}

function getLocale() {
    const locale = BdApi?.LocaleManager?.getLocale?.() || document?.documentElement?.lang || navigator?.language || "en";
    return String(locale).toLowerCase().startsWith("ru") ? "ru" : "en";
}

function findObjectDeep(root, predicate, depth = 4, seen = new Set()) {
    if (!root || typeof root !== "object" || depth < 0 || seen.has(root)) return null;
    seen.add(root);
    if (predicate(root)) return root;
    if (Array.isArray(root)) {
        for (const item of root) {
            const found = findObjectDeep(item, predicate, depth - 1, seen);
            if (found) return found;
        }
        return null;
    }
    for (const key of Object.keys(root)) {
        const value = root[key];
        if (value && typeof value === "object") {
            const found = findObjectDeep(value, predicate, depth - 1, seen);
            if (found) return found;
        }
    }
    return null;
}

function normalizeCollection(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (value instanceof Map) return Array.from(value.values());
    if (typeof value.values === "function") {
        try {
            return Array.from(value.values());
        }
        catch (_) {
            return [];
        }
    }
    if (typeof value === "object") return Object.values(value);
    return [];
}

function pathToFileHref(filePath) {
    if (!filePath) return "";
    let normalized = String(filePath).replace(/\\/g, "/");

    if (/^\/\//.test(normalized)) {
        const [, host = "", ...parts] = normalized.split("/");
        return `file://${host}/${parts.map(encodeURIComponent).join("/")}`;
    }

    if (/^[a-zA-Z]:\//.test(normalized)) {
        const drive = normalized.slice(0, 2);
        const rest = normalized.slice(2).split("/").map(encodeURIComponent).join("/");
        return `file:///${drive}${rest}`;
    }

    const encoded = normalized.split("/").map((part) => encodeURIComponent(part)).join("/");
    return `file://${encoded}`;
}

function soundMimeType(filePath, data) {
    if (data) {
        const text = typeof Buffer !== "undefined" && Buffer.isBuffer(data)
            ? data.subarray(0, Math.min(data.length, 256)).toString("ascii")
            : "";
        if (text.includes("OpusHead")) return "audio/ogg;codecs=opus";
        if (text.includes("vorbis")) return "audio/ogg;codecs=vorbis";
    }

    const ext = String(filePath || "").split(".").pop().toLowerCase();
    return {
        mp3: "audio/mpeg",
        wav: "audio/wav",
        ogg: "audio/ogg",
        m4a: "audio/mp4",
        aac: "audio/aac",
        flac: "audio/flac",
        webm: "audio/webm"
    }[ext] || "audio/mpeg";
}

function statFile(filePath) {
    return new Promise((resolve, reject) => {
        if (typeof fs.stat === "function") {
            fs.stat(filePath, (error, stat) => error ? reject(error) : resolve(stat));
            return;
        }

        try {
            resolve(fs.statSync(filePath));
        }
        catch (error) {
            reject(error);
        }
    });
}

function readFileBuffer(filePath) {
    return new Promise((resolve, reject) => {
        if (typeof fs.readFile === "function") {
            fs.readFile(filePath, (error, data) => error ? reject(error) : resolve(data));
            return;
        }

        try {
            resolve(fs.readFileSync(filePath));
        }
        catch (error) {
            reject(error);
        }
    });
}

function statFileSyncCompat(filePath) {
    if (typeof fs.statSync === "function") return fs.statSync(filePath);
    throw new Error("fs.statSync is unavailable in this BetterDiscord environment.");
}

function readFileBufferSyncCompat(filePath) {
    if (typeof fs.readFileSync === "function") return fs.readFileSync(filePath);
    throw new Error("fs.readFileSync is unavailable in this BetterDiscord environment.");
}

class AudioManager {
    constructor(plugin) {
        this.plugin = plugin;
        this.active = new Map();
        this.playTokens = new Map();
        this.blobUrls = new Map();
        this.bufferCache = new Map();
        this.audioContext = null;
        this.badPathToasted = new Set();
    }

    getAudioContext() {
        if (this.audioContext) return this.audioContext;
        const ContextClass = window.AudioContext || window.webkitAudioContext;
        if (!ContextClass) throw new Error("AudioContext is unavailable.");
        this.audioContext = new ContextClass();
        return this.audioContext;
    }

    resumeContext() {
        const context = this.getAudioContext();
        try {
            if (context.state === "suspended" && typeof context.resume === "function") {
                const result = context.resume();
                if (result?.catch) result.catch((error) => this.plugin.logDebug("AudioContext resume failed", error));
            }
        }
        catch (error) {
            this.plugin.logDebug("AudioContext resume threw", error);
        }
        return context;
    }

    toUrl(filePath) {
        try {
            const stat = statFileSyncCompat(filePath);
            const cached = this.blobUrls.get(filePath);
            if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) return cached.url;

            if (cached?.revoke) URL.revokeObjectURL(cached.url);
            const data = readFileBufferSyncCompat(filePath);
            const mime = soundMimeType(filePath, data);
            const url = `data:${mime};base64,${data.toString("base64")}`;
            const revoke = false;
            this.blobUrls.set(filePath, {url, mtimeMs: stat.mtimeMs, size: stat.size, revoke});
            return url;
        }
        catch (error) {
            this.plugin.logDebug("Failed to create audio URL", {filePath, error});
            throw error;
        }
    }

    getSource(soundConfig) {
        if (soundConfig?.source?.startsWith?.("data:")) return soundConfig.source.replace(/ /g, "");
        if (!soundConfig?.path) throw new Error("No audio source or path selected.");
        return this.toUrl(soundConfig.path);
    }

    makeAudio(soundConfig) {
        const audio = new Audio();
        audio.src = this.getSource(soundConfig);
        audio.volume = clamp(this.plugin.settings.global.volume * soundConfig.volume, 0, 1);
        return audio;
    }

    loadHtmlAudio(soundConfig) {
        return new Promise((resolve, reject) => {
            let audio = null;
            try {
                audio = this.makeAudio(soundConfig);
            }
            catch (error) {
                reject(error);
                return;
            }

            const cleanup = () => {
                audio.onloadeddata = null;
                audio.oncanplay = null;
                audio.onerror = null;
            };
            const done = () => {
                cleanup();
                resolve(audio);
            };
            const fail = () => {
                const error = audio.error
                    ? new Error(`${audio.error.code}: ${audio.error.message || "HTML audio load failed"}`)
                    : new Error("HTML audio load failed");
                cleanup();
                reject(error);
            };

            audio.onloadeddata = done;
            audio.oncanplay = done;
            audio.onerror = fail;
            audio.load();
        });
    }

    async decodeFile(filePath) {
        if (typeof filePath === "object" && filePath?.source?.startsWith?.("data:")) {
            const cacheKey = filePath.source.slice(0, 96);
            const cached = this.bufferCache.get(cacheKey);
            if (cached) return cached.buffer;
            const dataUrl = filePath.source;
            const commaIndex = dataUrl.indexOf(",");
            if (commaIndex === -1) throw new Error("Invalid data URL.");
            const base64 = dataUrl.slice(commaIndex + 1).replace(/\s/g, "");
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const context = this.getAudioContext();
            const buffer = await this.decodeArrayBuffer(context, bytes.buffer);
            this.bufferCache.set(cacheKey, {buffer});
            return buffer;
        }

        const stat = statFileSyncCompat(filePath);
        const cached = this.bufferCache.get(filePath);
        if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) return cached.buffer;

        const context = this.getAudioContext();
        const data = readFileBufferSyncCompat(filePath);
        const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
        const buffer = await this.decodeArrayBuffer(context, arrayBuffer);
        this.bufferCache.set(filePath, {buffer, mtimeMs: stat.mtimeMs, size: stat.size});
        return buffer;
    }

    decodeArrayBuffer(context, arrayBuffer) {
        return new Promise((resolve, reject) => {
            try {
                const result = context.decodeAudioData(arrayBuffer, resolve, reject);
                if (result?.then) result.then(resolve).catch(reject);
            }
            catch (error) {
                reject(error);
            }
        });
    }

    async playOneShot(key, soundConfig, options = {}) {
        try {
            this.stop(key);
            const token = Symbol(key);
            this.playTokens.set(key, token);
            const audio = await this.loadHtmlAudio(soundConfig);
            if (this.playTokens.get(key) !== token) return;
            audio.loop = false;
            audio.onended = () => {
                this.active.delete(key);
                this.playTokens.delete(key);
            };
            this.active.set(key, audio);
            this.tryPlay(audio, soundConfig.path, options);
        }
        catch (error) {
            this.plugin.logDebug("HTML audio playOneShot failed, trying WebAudio", {key, error});
            this.playOneShotWebAudio(key, soundConfig, options, error);
        }
    }

    async playLoop(key, soundConfig) {
        try {
            this.stop(key);
            const token = Symbol(key);
            this.playTokens.set(key, token);
            const audio = await this.loadHtmlAudio(soundConfig);
            if (this.playTokens.get(key) !== token) return;
            audio.loop = true;
            audio.onended = () => {
                this.active.delete(key);
                this.playTokens.delete(key);
            };
            this.active.set(key, audio);
            this.tryPlay(audio, soundConfig.path);
        }
        catch (error) {
            this.plugin.logDebug("HTML audio playLoop failed, trying WebAudio", {key, error});
            this.playLoopWebAudio(key, soundConfig, error);
        }
    }

    async playOneShotWebAudio(key, soundConfig, options = {}, originalError) {
        try {
            const context = this.resumeContext();
            const buffer = await this.decodeFile(soundConfig);
            if (this.playTokens.has(key)) {
                const entry = this.createWebAudioEntry(context, buffer, soundConfig, false);
                this.active.set(key, entry);
                entry.source.onended = () => {
                    this.active.delete(key);
                    this.playTokens.delete(key);
                };
                entry.source.start(0);
                if (options.showSuccess) this.plugin.toast(this.plugin.t("audioStarted"), "success");
            }
        }
        catch (error) {
            this.playTokens.delete(key);
            this.plugin.logDebug("WebAudio playOneShot failed", {key, originalError, error});
            this.reportAudioError(soundConfig.path, error || originalError);
        }
    }

    async playLoopWebAudio(key, soundConfig, originalError) {
        try {
            const context = this.resumeContext();
            const buffer = await this.decodeFile(soundConfig);
            if (this.playTokens.has(key)) {
                const entry = this.createWebAudioEntry(context, buffer, soundConfig, true);
                this.active.set(key, entry);
                entry.source.onended = () => {
                    this.active.delete(key);
                    this.playTokens.delete(key);
                };
                entry.source.start(0);
            }
        }
        catch (error) {
            this.playTokens.delete(key);
            this.plugin.logDebug("WebAudio playLoop failed", {key, originalError, error});
            this.reportAudioError(soundConfig.path, error || originalError);
        }
    }

    createWebAudioEntry(context, buffer, soundConfig, loop) {
        const source = context.createBufferSource();
        const gain = context.createGain();
        source.buffer = buffer;
        source.loop = loop;
        gain.gain.value = clamp(this.plugin.settings.global.volume * soundConfig.volume, 0, 1);
        source.connect(gain);
        gain.connect(context.destination);
        return {type: "webaudio", source, gain};
    }

    preview(config, volume) {
        if (!config) return;
        const soundConfig = typeof config === "string"
            ? {path: config, source: null, volume: clamp(volume, 0, 1)}
            : {...config, volume: clamp(config.volume ?? volume ?? 1, 0, 1)};
        if (!soundConfig.path && !soundConfig.source) return;
        this.playOneShot("preview", soundConfig, {showSuccess: true});
    }

    stop(key) {
        this.playTokens.delete(key);
        const entry = this.active.get(key);
        if (!entry) return;
        try {
            if (entry.type === "webaudio") {
                entry.source.onended = null;
                entry.source.stop(0);
                entry.source.disconnect();
                entry.gain.disconnect();
            }
            else {
                entry.pause();
                entry.currentTime = 0;
            }
        }
        catch (error) {
            this.plugin.logDebug("Audio stop failed", error);
        }
        this.active.delete(key);
    }

    stopByPrefix(prefix) {
        for (const key of Array.from(this.active.keys())) {
            if (String(key).startsWith(prefix)) this.stop(key);
        }
        for (const key of Array.from(this.playTokens.keys())) {
            if (String(key).startsWith(prefix)) this.playTokens.delete(key);
        }
    }

    stopAll() {
        for (const key of Array.from(this.active.keys())) this.stop(key);
        this.playTokens.clear();
        for (const cached of this.blobUrls.values()) {
            if (!cached.revoke) continue;
            try {
                URL.revokeObjectURL(cached.url);
            }
            catch (_) {}
        }
        this.blobUrls.clear();
        this.bufferCache.clear();
        if (this.audioContext && typeof this.audioContext.close === "function") {
            try {
                this.audioContext.close();
            }
            catch (_) {}
        }
        this.audioContext = null;
    }

    async diagnose(config, volume) {
        const soundConfig = typeof config === "string"
            ? {path: config, source: null, volume: clamp(volume, 0, 1)}
            : {...config, volume: clamp(config?.volume ?? volume ?? 1, 0, 1)};
        const filePath = soundConfig.path;
        const extraRows = [];
        let htmlAudio = null;
        let htmlUrl = "";
        let htmlError = null;

        try {
            htmlUrl = this.getSource(soundConfig);
            htmlAudio = await this.loadHtmlAudio(soundConfig);
            extraRows.push(["htmlAudioLoad", "ok"]);
            htmlAudio.loop = false;
            this.active.set("diagnostic-html", htmlAudio);
            this.tryPlay(htmlAudio, filePath, {showSuccess: true, showDiagnosticOnError: true});
        }
        catch (error) {
            htmlError = error;
            extraRows.push(["htmlAudioLoad", "failed"]);
            extraRows.push(["htmlAudioError", String(error?.message || error)]);
        }

        try {
            const context = this.resumeContext();
            extraRows.push(["audioContext", context.state]);
            const buffer = await this.decodeFile(soundConfig);
            extraRows.push(["webAudioDecode", "ok"]);
            extraRows.push(["decodedDuration", String(buffer.duration)]);
            extraRows.push(["decodedSampleRate", String(buffer.sampleRate)]);
            this.stop("diagnostic");
            const entry = this.createWebAudioEntry(context, buffer, soundConfig, false);
            this.active.set("diagnostic", entry);
            entry.source.onended = () => this.active.delete("diagnostic");
            entry.source.start(0);
            extraRows.push(["webAudioPlay", "started"]);
            this.plugin.toast(this.plugin.t("audioStarted"), "success");
        }
        catch (error) {
            extraRows.push(["webAudioDecode", "failed"]);
            extraRows.push(["webAudioError", String(error?.message || error)]);
            if (!htmlAudio) this.plugin.toast(`${this.plugin.t("audioDecodeFailed")}: ${error?.message || error}`, "error");
        }

        this.plugin.showAudioDiagnosticsModal(filePath, this.makeDiagnosticRows(filePath, htmlAudio, htmlUrl, htmlError, extraRows));
    }

    makeDiagnosticRows(filePath, audio, url, readError, extraRows = []) {
        const mime = (() => {
            try {
                return soundMimeType(filePath, readFileBufferSyncCompat(filePath));
            }
            catch (_) {
                return soundMimeType(filePath);
            }
        })();
        const probe = typeof Audio === "function" ? new Audio() : null;
        let size = "";
        try {
            size = String(statFileSyncCompat(filePath).size);
        }
        catch (error) {
            size = `error: ${error?.message || error}`;
        }
        return [
            ["path", filePath || ""],
            ["hasDataSource", String(Boolean(url?.startsWith?.("data:")))],
            ["exists", String(Boolean(filePath && this.plugin.fileExists(filePath)))],
            ["size", size],
            ["mime", mime],
            ["canPlayType", probe?.canPlayType?.(mime) || ""],
            ["urlType", url ? String(url).slice(0, 24) : ""],
            ["readError", readError ? String(readError?.message || readError) : ""],
            ["readyState", audio ? String(audio.readyState) : ""],
            ["networkState", audio ? String(audio.networkState) : ""],
            ["duration", audio && Number.isFinite(audio.duration) ? String(audio.duration) : ""],
            ["paused", audio ? String(audio.paused) : ""],
            ["currentTime", audio ? String(audio.currentTime) : ""],
            ["audioError", audio?.error ? `${audio.error.code}: ${audio.error.message || ""}` : ""],
            ...extraRows
        ];
    }

    tryPlay(audio, filePath, options = {}) {
        try {
            const result = audio.play();
            if (result && typeof result.catch === "function") {
                result.then?.(() => {
                    if (options.showSuccess) this.plugin.toast(this.plugin.t("audioStarted"), "success");
                }).catch((error) => {
                    this.plugin.logDebug("Audio play rejected", {filePath, error});
                    this.reportAudioError(filePath, error, audio, options);
                });
            }
        }
        catch (error) {
            this.plugin.logDebug("Audio play threw", {filePath, error});
            this.reportAudioError(filePath, error, audio, options);
        }
    }

    reportAudioError(filePath, error, audio, options = {}) {
        const suffix = error?.name || error?.message || audio?.error?.message || audio?.error?.code || "";
        const message = `${this.plugin.t("fileBad")}: ${filePath}${suffix ? ` (${suffix})` : ""}`;
        if (!this.badPathToasted.has(message)) {
            this.badPathToasted.add(message);
            this.plugin.toast(message, "error");
        }
        if (options.showDiagnosticOnError) {
            this.plugin.showAudioDiagnosticsModal(filePath, this.makeDiagnosticRows(filePath, audio, "", error));
        }
    }
}

module.exports = class PersonalUserSounds {
    constructor(meta = {}) {
        this.meta = meta;
        this.api = new BdApi(meta.name || PLUGIN_NAME);
        this.settings = this.loadSettings();
        this.audioManager = new AudioManager(this);
        this.unpatches = [];
        this.subscriptions = [];
        this.timers = new Set();
        this.abortController = null;
        this.modules = {};
        this.soundInstanceNames = new WeakMap();
        this.soundPrototypePatched = false;
        this.notificationPatchReady = false;
        this.soundPatchReady = false;
        this.callStoreListenerActive = false;
        this.seenMessageIds = new Map();
        this.messageCooldowns = new Map();
        this.lastVoiceChannels = new Map();
        this.recentVoiceEvents = new Map();
        this.pendingOverrides = new Map();
        this.pathExistsCache = new Map();
        this.ui = null;
        this.activeIncomingCallKey = null;
        this.contextMenuUnpatch = null;
    }

    start() {
        this.abortController = typeof AbortController === "function" ? new AbortController() : null;
        this.cacheModules();
        this.patchUserContextMenu();
        this.subscribeDispatcher("MESSAGE_CREATE", this.handleMessageCreate.bind(this));
        this.boundVoiceStateHandler = this.handleVoiceStateUpdates.bind(this);
        this.subscribeDispatcher("VOICE_STATE_UPDATES", this.boundVoiceStateHandler);
        this.subscribeDispatcher("VOICE_STATE_UPDATE", this.boundVoiceStateHandler);
        this.subscribeDispatcher("CALL_CREATE", this.handleCallStoreEvent.bind(this));
        this.subscribeDispatcher("CALL_UPDATE", this.handleCallStoreEvent.bind(this));
        this.subscribeDispatcher("CALL_DELETE", this.handleCallStoreEvent.bind(this));
        this.attachCallStoreListener();
        this.initVoiceState();
        this.patchNotificationModule();
        this.patchSoundModule();
        this.logCompatibility();
        this.initUi();
    }

    stop() {
        for (const unsubscribe of this.subscriptions.splice(0)) {
            try {
                unsubscribe();
            }
            catch (error) {
                this.logDebug("Unsubscribe failed", error);
            }
        }

        if (this.callStoreListenerActive && typeof this.modules.CallStore?.removeChangeListener === "function") {
            try {
                this.modules.CallStore.removeChangeListener(this.boundCallStoreListener);
            }
            catch (error) {
                this.logDebug("CallStore listener cleanup failed", error);
            }
        }
        this.callStoreListenerActive = false;

        for (const unpatch of this.unpatches.splice(0)) {
            try {
                unpatch();
            }
            catch (error) {
                this.logDebug("Unpatch failed", error);
            }
        }

        try {
            this.contextMenuUnpatch?.();
        }
        catch (error) {
            this.logDebug("Context menu cleanup failed", error);
        }
        this.contextMenuUnpatch = null;

        try {
            this.api.Patcher.unpatchAll(this.meta.name || PLUGIN_NAME);
        }
        catch (_) {
            BdApi.Patcher.unpatchAll(this.meta.name || PLUGIN_NAME);
        }

        try {
            this.abortController?.abort();
        }
        catch (_) {}
        this.abortController = null;

        for (const timer of this.timers) clearTimeout(timer);
        this.timers.clear();
        this.audioManager.stopAll();
        this.seenMessageIds.clear();
        this.messageCooldowns.clear();
        this.lastVoiceChannels.clear();
        this.recentVoiceEvents.clear();
        this.pendingOverrides.clear();
        this.pathExistsCache.clear();
        this.activeIncomingCallKey = null;
        this.notificationPatchReady = false;
        this.soundPatchReady = false;
        this.ui?.destroy?.();
        this.ui = null;
    }

    ensureUi() {
        if (this.ui) return this.ui;
        try {
            this.ui = new PussUI({
                host: this.makeUiHost(),
                styles: typeof PUSS_STYLES === "string" ? PUSS_STYLES : "",
                templates: PUSS_TEMPLATES && typeof PUSS_TEMPLATES === "object" ? PUSS_TEMPLATES : {}
            });
        }
        catch (error) {
            this.ui = null;
            this.logDebug("UI initialization failed", error);
        }
        return this.ui;
    }

    initUi() {
        this.ensureUi();
    }

    makeUiHost() {
        const plugin = this;
        return {
            getSettings() {
                return plugin.cloneSettings(plugin.settings);
            },
            commitSettings(next) {
                plugin.settings = plugin.migrateSettings(next);
                plugin.saveSettings();
            },
            resolveUser(userId) {
                const user = plugin.modules.UserStore?.getUser?.(userId);
                if (!user) return null;
                return {
                    id: String(user.id),
                    username: user.username || "",
                    globalName: user.globalName || user.global_name || "",
                    avatar: plugin.getAvatarUrl(user) || ""
                };
            },
            pickAudioFile() {
                return plugin.pickAudioFile();
            },
            preview(config, volume) {
                plugin.audioManager.preview(config, volume);
            },
            stopPreview() {
                plugin.audioManager.stop("preview");
            },
            diagnose(config, volume) {
                plugin.audioManager.diagnose(config, volume);
            },
            saveUserDraft(userId, draft) {
                let user = plugin.modules.UserStore?.getUser?.(userId);
                if (!user) user = {id: userId, username: (draft.identity || {}).username || userId};
                const next = plugin.normalizeUserSettings(draft);
                next.identity = plugin.makeIdentity(user);
                plugin.settings.users[userId] = next;
                plugin.saveSettings();
                plugin.toast(plugin.t("saved"), "success");
                plugin.initVoiceState();
            },
            removeUser(userId) {
                delete plugin.settings.users[userId];
                plugin.saveSettings();
            },
            resetUser(userId) {
                delete plugin.settings.users[userId];
                plugin.saveSettings();
                plugin.toast(plugin.t("reset"), "success");
            },
            addUserById(userId) {
                const user = plugin.modules.UserStore?.getUser?.(userId);
                if (!user) return {error: "userNotFound"};
                plugin.ensureUserSettings(user);
                plugin.saveSettings();
                return {ok: true};
            },
            toast(message, type) {
                plugin.toast(message, type);
            },
            fileExists(path) {
                return plugin.fileExists(path);
            },
            identityName(identity, fallback) {
                return plugin.identityName(identity, fallback);
            }
        };
    }
    getSettingsPanel() {
        const React = BdApi.React;
        const h = React.createElement;
        const plugin = this;

        function SettingsPanelHost() {
            const containerRef = React.useRef(null);
            React.useEffect(() => {
                plugin.ensureUi();
                const container = containerRef.current;
                if (container && plugin.ui) plugin.ui.mountPanel(container);
                return () => {
                    try {
                        plugin.ui?.unmountPanel?.();
                    }
                    catch (error) {
                        plugin.logDebug("UI unmount failed", error);
                    }
                };
            }, []);
            return h("div", {ref: containerRef, className: "puss-panel-host"});
        }

        return h(SettingsPanelHost);
    }

    t(key) {
        return this.ui?.text ? this.ui.text(key) : key;
    }

    loadSettings() {
        const loaded = this.api.Data.load("settings");
        return this.migrateSettings(loaded);
    }

    saveSettings() {
        this.api.Data.save("settings", this.settings);
    }

    cloneSettings(settings) {
        return clone(settings);
    }

    migrateSettings(settings) {
        const merged = deepMerge(DEFAULT_SETTINGS, settings || {});
        merged.schemaVersion = 1;
        for (const eventType of EVENT_TYPES) {
            merged.defaults[eventType] = normalizeSoundConfig(merged.defaults[eventType], "default");
        }
        for (const [userId, userSettings] of Object.entries(merged.users || {})) {
            merged.users[userId] = this.normalizeUserSettings(userSettings);
        }
        merged.global.volume = clamp(merged.global.volume, 0, 1);
        merged.global.messageCooldownMs = Math.max(0, Number(merged.global.messageCooldownMs) || 0);
        if (!["follow_discord", "direct_messages", "all_messages"].includes(merged.global.messageScope)) {
            merged.global.messageScope = "follow_discord";
        }
        return merged;
    }

    normalizeUserSettings(userSettings) {
        const normalized = deepMerge({
            identity: {username: "", globalName: "", avatar: null},
            message: {mode: "inherit", path: null, volume: 1},
            incomingCall: {mode: "inherit", path: null, volume: 1},
            disconnect: {mode: "inherit", path: null, volume: 1},
            voiceJoin: {mode: "inherit", path: null, volume: 1}
        }, userSettings || {});
        for (const eventType of EVENT_TYPES) normalized[eventType] = normalizeSoundConfig(normalized[eventType], "inherit");
        return normalized;
    }

    cacheModules() {
        this.modules.UserStore = BdApi.Webpack.getStore("UserStore");
        this.modules.ChannelStore = BdApi.Webpack.getStore("ChannelStore");
        this.modules.SelectedChannelStore = BdApi.Webpack.getStore("SelectedChannelStore");
        this.modules.VoiceStateStore = BdApi.Webpack.getStore("VoiceStateStore");
        this.modules.CallStore = BdApi.Webpack.getStore("CallStore");
        this.modules.RelationshipStore = BdApi.Webpack.getStore("RelationshipStore");
        this.modules.StreamerModeStore = BdApi.Webpack.getStore("StreamerModeStore");
        this.modules.StatusStore = BdApi.Webpack.getStore("StatusStore");
        this.modules.Dispatcher = this.modules.UserStore?._dispatcher ?? BdApi.Webpack.getByKeys("subscribe", "unsubscribe", "dispatch");
    }

    logCompatibility() {
        this.logDebug("Module cache", {
            UserStore: Boolean(this.modules.UserStore),
            ChannelStore: Boolean(this.modules.ChannelStore),
            SelectedChannelStore: Boolean(this.modules.SelectedChannelStore),
            VoiceStateStore: Boolean(this.modules.VoiceStateStore),
            CallStore: Boolean(this.modules.CallStore),
            RelationshipStore: Boolean(this.modules.RelationshipStore),
            StreamerModeStore: Boolean(this.modules.StreamerModeStore),
            StatusStore: Boolean(this.modules.StatusStore),
            Dispatcher: Boolean(this.modules.Dispatcher)
        });
    }

    subscribeDispatcher(type, handler) {
        const dispatcher = this.modules.Dispatcher;
        if (!dispatcher || typeof dispatcher.subscribe !== "function" || typeof dispatcher.unsubscribe !== "function") {
            this.logDebug(`Dispatcher unavailable for ${type}`);
            return;
        }
        try {
            dispatcher.subscribe(type, handler);
            this.subscriptions.push(() => dispatcher.unsubscribe(type, handler));
        }
        catch (error) {
            this.logDebug(`Failed to subscribe ${type}`, error);
        }
    }

    attachCallStoreListener() {
        if (typeof this.modules.CallStore?.addChangeListener !== "function") {
            this.logDebug("CallStore change listener unavailable");
            return;
        }
        this.boundCallStoreListener = this.handleCallStoreEvent.bind(this);
        try {
            this.modules.CallStore.addChangeListener(this.boundCallStoreListener);
            this.callStoreListenerActive = true;
        }
        catch (error) {
            this.logDebug("CallStore change listener failed", error);
        }
    }

    patchUserContextMenu() {
        if (!BdApi.ContextMenu?.patch || !BdApi.ContextMenu?.buildItem) {
            this.logDebug("ContextMenu API unavailable");
            return;
        }

        this.contextMenuUnpatch = BdApi.ContextMenu.patch("user-context", (menu, props) => {
            const user = props?.user || props?.guildMember?.user;
            if (!user?.id || this.isCurrentUser(user.id)) return;

            const item = BdApi.ContextMenu.buildItem({
                type: "button",
                label: this.t("personalSounds"),
                action: () => this.openUserModal(user)
            });

            this.appendContextMenuItem(menu, item);
        });
    }

    appendContextMenuItem(menu, item) {
        const children = menu?.props?.children;
        if (Array.isArray(children)) {
            children.push(item);
            return;
        }
        if (children?.props?.children && Array.isArray(children.props.children)) {
            children.props.children.push(item);
            return;
        }
        if (menu?.props) menu.props.children = [children, item].filter(Boolean);
    }

    async patchNotificationModule() {
        const filter = BdApi.Webpack.Filters.byKeys("showNotification", "requestPermission");
        try {
            const module = await this.waitForModule(filter, "DesktopNotification module");
            if (!module || typeof module.showNotification !== "function") return;
            const unpatch = BdApi.Patcher.before(this.meta.name || PLUGIN_NAME, module, "showNotification", (_, args) => {
                this.handleShowNotification(args);
            });
            this.unpatches.push(unpatch);
            this.notificationPatchReady = true;
            this.logDebug("DesktopNotification patch active");
        }
        catch (error) {
            this.logDebug("DesktopNotification patch unavailable", error);
            this.toastDebug("DesktopNotification module not found; MESSAGE_CREATE fallback remains active.");
        }
    }

    async patchSoundModule() {
        const filter = BdApi.Webpack.Filters.byKeys("createSound");
        try {
            const module = await this.waitForModule(filter, "SoundUtils");
            if (!module || typeof module.createSound !== "function") return;
            const unpatch = BdApi.Patcher.after(this.meta.name || PLUGIN_NAME, module, "createSound", (_, args, sound) => {
                const soundName = this.extractSoundName(args);
                if (sound && soundName) this.soundInstanceNames.set(sound, soundName);
                this.patchSoundPrototype(sound);
            });
            this.unpatches.push(unpatch);
            this.modules.SoundUtils = module;
            this.soundPatchReady = true;
            this.logDebug("SoundUtils createSound patch active");
        }
        catch (error) {
            this.logDebug("SoundUtils patch unavailable", error);
            this.toastDebug("SoundUtils module not found; call and native sound replacement fallbacks are limited.");
        }
    }

    waitForModule(filter, label) {
        if (typeof BdApi.Webpack.waitForModule !== "function") {
            return Promise.resolve(BdApi.Webpack.getModule?.(filter));
        }

        const options = this.abortController ? {signal: this.abortController.signal} : undefined;
        return BdApi.Webpack.waitForModule(filter, options).catch((error) => {
            this.logDebug(`${label} waitForModule failed`, error);
            return null;
        });
    }

    patchSoundPrototype(sound) {
        if (this.soundPrototypePatched || !sound) return;
        const proto = Object.getPrototypeOf(sound);
        if (!proto) return;

        for (const methodName of ["play", "loop", "playWithListener"]) {
            if (typeof proto[methodName] !== "function") continue;
            const unpatch = BdApi.Patcher.instead(this.meta.name || PLUGIN_NAME, proto, methodName, (soundObject, args, original) => {
                return this.handleNativeSoundMethod(methodName, soundObject, args, original);
            });
            this.unpatches.push(unpatch);
        }

        if (typeof proto.stop === "function") {
            const unpatchStop = BdApi.Patcher.before(this.meta.name || PLUGIN_NAME, proto, "stop", (soundObject) => {
                const name = this.getSoundName(soundObject);
                if (name === "call_ringing") this.stopIncomingCallSound();
            });
            this.unpatches.push(unpatchStop);
        }

        this.soundPrototypePatched = true;
        this.logDebug("Sound prototype patched");
    }

    handleNativeSoundMethod(methodName, soundObject, args, original) {
        const name = this.getSoundName(soundObject);
        this.logDebug("Native sound", {methodName, name});

        if (name === "call_ringing") {
            const handled = this.handleIncomingCallNativeSound();
            if (handled === "default") return original.apply(soundObject, args);
            if (handled === "custom" || handled === "silent") return undefined;
        }

        if (name === "user_leave" && this.consumePendingOverride("user_leave")) return undefined;
        if (name === "user_join" && this.consumePendingOverride("user_join")) return undefined;

        return original.apply(soundObject, args);
    }

    handleShowNotification(args) {
        if (!this.settings.global.enabled) return;

        const message = this.extractMessageFromNotificationArgs(args);
        const userId = message?.author?.id || message?.author_id;
        if (!userId || this.shouldSkipMessage(userId, message, {fromDiscordNotification: true})) return;

        const config = this.resolveSoundConfig(userId, "message");
        this.logDebug("Notification message", {userId, mode: config.mode});

        if (config.mode === "default") return;

        const options = this.extractNotificationOptions(args);
        if (options && this.settings.global.replaceNativeSounds) options.sound = null;
        if (config.mode === "silent") return;
        if (config.mode === "custom") this.audioManager.playOneShot(`message:${userId}:${message.id || Date.now()}`, config);
    }

    handleMessageCreate(event) {
        const scope = this.settings.global.messageScope;
        if (!this.settings.global.enabled) return;
        if (scope === "follow_discord" && this.notificationPatchReady) return;

        const message = event?.message || event;
        const userId = message?.author?.id || message?.author_id;
        if (!userId || !this.settings.users?.[userId]) return;
        if (this.shouldSkipAdditionalSound()) return;
        if (this.shouldSkipMessage(userId, message, {fromDiscordNotification: false, event})) return;

        const channel = this.modules.ChannelStore?.getChannel?.(message.channel_id || message.channelId);
        if (scope === "direct_messages" && !this.isDirectMessageChannel(channel)) return;
        if (!this.settings.global.playInFocusedChannel) {
            const selectedId = this.modules.SelectedChannelStore?.getChannelId?.();
            if (selectedId && selectedId === (message.channel_id || message.channelId)) return;
        }

        const config = this.resolveSoundConfig(userId, "message");
        this.logDebug("MESSAGE_CREATE", {userId, mode: config.mode, scope});
        if (config.mode === "custom") this.audioManager.playOneShot(`message:${userId}:${message.id || Date.now()}`, config);
    }

    shouldSkipMessage(userId, message, details) {
        if (this.isCurrentUser(userId)) {
            this.logDebug("Skip own message", {userId});
            return true;
        }
        if (message?.optimistic || details?.event?.optimistic) {
            this.logDebug("Skip optimistic message", {userId});
            return true;
        }
        if (this.isBlocked(userId)) {
            this.logDebug("Skip blocked user", {userId});
            return true;
        }

        const messageId = message?.id;
        if (messageId) {
            if (this.seenMessageIds.has(messageId)) {
                this.logDebug("Skip duplicate message", {userId});
                return true;
            }
            this.seenMessageIds.set(messageId, Date.now());
            this.setTimer(() => this.seenMessageIds.delete(messageId), 60000);
        }

        const cooldownMs = this.settings.global.messageCooldownMs;
        const last = this.messageCooldowns.get(userId) || 0;
        if (cooldownMs > 0 && Date.now() - last < cooldownMs) {
            this.logDebug("Skip message cooldown", {userId});
            return true;
        }
        this.messageCooldowns.set(userId, Date.now());
        return false;
    }

    extractMessageFromNotificationArgs(args) {
        for (const arg of args || []) {
            const found = findObjectDeep(arg, (value) => Boolean(value?.message?.author?.id || value?.author?.id), 4);
            if (found?.message?.author?.id) return found.message;
            if (found?.author?.id) return found;
        }
        return null;
    }

    extractNotificationOptions(args) {
        for (const arg of args || []) {
            const found = findObjectDeep(arg, (value) => Object.prototype.hasOwnProperty.call(value, "sound"), 3);
            if (found) return found;
        }
        return null;
    }

    handleIncomingCallNativeSound() {
        if (!this.settings.global.enabled) return "default";

        const userId = this.identifyIncomingCaller();
        if (!userId) {
            this.logDebug("Incoming caller unresolved");
            return "default";
        }
        if (this.isBlocked(userId)) return "default";

        return this.playIncomingCallForUser(userId, true);
    }

    playIncomingCallForUser(userId, canSuppressNative) {
        const config = this.resolveSoundConfig(userId, "incomingCall");
        this.logDebug("Incoming call", {userId, mode: config.mode, canSuppressNative});
        if (config.mode === "default") return "default";
        if (config.mode === "silent") {
            this.stopIncomingCallSound();
            return canSuppressNative ? "silent" : "default";
        }
        if (config.mode === "custom") {
            const key = `call:${userId}`;
            if (this.activeIncomingCallKey !== key) {
                this.stopIncomingCallSound();
                this.audioManager.playLoop(key, config);
                this.activeIncomingCallKey = key;
            }
            return canSuppressNative ? "custom" : "default";
        }
        return "default";
    }

    identifyIncomingCaller(sourceEvent) {
        const currentUserId = this.getCurrentUserId();
        if (!currentUserId || !this.modules.ChannelStore) return null;
        const eventCalls = this.extractCallCandidates(sourceEvent).filter((call) => call && typeof call === "object");
        const eventSet = new Set(eventCalls);
        const calls = [...eventCalls, ...this.getActiveCalls()];

        for (const call of calls) {
            const ringing = this.extractRingingUserIds(call);
            if (!ringing.length && !eventSet.has(call)) continue;
            if (ringing.length && !ringing.includes(currentUserId)) continue;
            const channelId = this.extractCallChannelId(call);
            const channel = channelId ? this.modules.ChannelStore.getChannel?.(channelId) : null;
            const directRecipient = this.getDirectRecipientId(channel, currentUserId);
            if (directRecipient) return directRecipient;

            const initiator = call?.initiatorId || call?.initiator_id || call?.callerId || call?.caller_id;
            if (initiator && initiator !== currentUserId) return String(initiator);
        }
        return null;
    }

    extractCallCandidates(event) {
        if (!event) return [];
        if (event.call || event.callState || event.call_state) return normalizeCollection(event.call || event.callState || event.call_state);
        if (event.calls || event.callStates || event.call_states) return normalizeCollection(event.calls || event.callStates || event.call_states);
        if (event.channelId || event.channel_id || event.channel?.id) return [event];
        return [];
    }

    getActiveCalls() {
        const store = this.modules.CallStore;
        if (!store) return [];
        for (const method of ["getCalls", "getAllCalls", "getCallStates"]) {
            if (typeof store[method] === "function") {
                try {
                    return normalizeCollection(store[method]());
                }
                catch (error) {
                    this.logDebug(`${method} failed`, error);
                }
            }
        }
        return [];
    }

    extractRingingUserIds(call) {
        const result = new Set();
        const candidates = [];
        for (const [key, value] of Object.entries(call || {})) {
            if (String(key).toLowerCase().includes("ring")) candidates.push(value);
        }
        for (const value of candidates) {
            for (const item of normalizeCollection(value)) {
                if (typeof item === "string") result.add(item);
                else if (item?.userId || item?.user_id || item?.id) result.add(String(item.userId || item.user_id || item.id));
            }
        }
        return Array.from(result);
    }

    extractCallChannelId(call) {
        return call?.channelId || call?.channel_id || call?.channel?.id || call?.call?.channelId || call?.call?.channel_id || null;
    }

    getDirectRecipientId(channel, currentUserId) {
        if (!channel) return null;
        const recipients = normalizeCollection(channel.recipients || channel.rawRecipients);
        if (typeof channel.isDM === "function" && !channel.isDM()) return null;
        if (channel.type !== undefined && channel.type !== 1 && recipients.length !== 1) return null;
        const ids = recipients.map((recipient) => typeof recipient === "string" ? recipient : recipient?.id).filter(Boolean);
        const otherIds = ids.filter((id) => id !== currentUserId);
        return otherIds.length === 1 ? String(otherIds[0]) : null;
    }

    handleCallStoreEvent(event) {
        this.logDebug("Call event", {type: event?.type});
        const userId = this.identifyIncomingCaller(event);
        if (userId && !this.isBlocked(userId)) {
            this.playIncomingCallForUser(userId, false);
            return;
        }
        this.stopIncomingCallSound();
    }

    stopIncomingCallSound() {
        this.audioManager.stopByPrefix("call:");
        this.activeIncomingCallKey = null;
    }

    initVoiceState() {
        const currentUserId = this.getCurrentUserId();
        if (currentUserId) {
            const channelId = this.getVoiceChannelIdFromStore(currentUserId);
            if (channelId) this.lastVoiceChannels.set(currentUserId, channelId);
        }
        for (const userId of Object.keys(this.settings.users || {})) {
            const channelId = this.getVoiceChannelIdFromStore(userId);
            if (channelId) this.lastVoiceChannels.set(userId, channelId);
        }
    }

    handleVoiceStateUpdates(event) {
        if (!this.settings.global.enabled) return;
        const states = this.extractVoiceStates(event);
        if (!states.length) return;

        const currentUserId = this.getCurrentUserId();
        if (!currentUserId) return;
        const currentUserOldChannel = this.getCurrentVoiceChannelId();
        const pendingSelfState = [];

        for (const state of states) {
            const userId = String(state?.userId || state?.user_id || "");
            if (!userId) continue;
            const newChannelId = state?.channelId ?? state?.channel_id ?? null;
            if (userId === currentUserId) {
                pendingSelfState.push(newChannelId);
                continue;
            }
            if (!this.settings.users?.[userId]) {
                if (newChannelId) this.lastVoiceChannels.set(userId, newChannelId);
                else this.lastVoiceChannels.delete(userId);
                continue;
            }

            const oldChannelId = this.lastVoiceChannels.has(userId) ? this.lastVoiceChannels.get(userId) : null;

            if (oldChannelId === newChannelId) continue;
            if (newChannelId) this.lastVoiceChannels.set(userId, newChannelId);
            else this.lastVoiceChannels.delete(userId);

            if (oldChannelId && oldChannelId !== newChannelId && oldChannelId === currentUserOldChannel) {
                this.handleVoicePersonalEvent("disconnect", userId, oldChannelId, newChannelId);
            }
            else if (!oldChannelId && newChannelId && newChannelId === currentUserOldChannel) {
                this.handleVoicePersonalEvent("voiceJoin", userId, oldChannelId, newChannelId);
            }
        }

        for (const channelId of pendingSelfState) {
            if (channelId) this.lastVoiceChannels.set(currentUserId, channelId);
            else this.lastVoiceChannels.delete(currentUserId);
        }
    }

    extractVoiceStates(event) {
        const states = event?.voiceStates ?? event?.voice_states;
        if (Array.isArray(states)) return states;
        if (event?.voiceState || event?.voice_state) return [event.voiceState || event.voice_state];
        if (event?.userId || event?.user_id) return [event];
        return [];
    }

    handleVoicePersonalEvent(eventType, userId, oldChannelId, newChannelId) {
        if (this.shouldSkipAdditionalSound() || this.isBlocked(userId)) return;

        const dedupeKey = `${eventType}:${userId}:${oldChannelId}:${newChannelId}`;
        const now = Date.now();
        const last = this.recentVoiceEvents.get(dedupeKey) || 0;
        if (now - last < 1500) return;
        this.recentVoiceEvents.set(dedupeKey, now);
        this.setTimer(() => this.recentVoiceEvents.delete(dedupeKey), 1600);

        const config = this.resolveSoundConfig(userId, eventType);
        this.logDebug("Voice event", {eventType, userId, mode: config.mode});
        if (config.mode === "default") return;

        const nativeName = eventType === "voiceJoin" ? "user_join" : "user_leave";
        if (this.settings.global.replaceNativeSounds) this.addPendingOverride(nativeName, userId, eventType);
        if (config.mode === "custom") this.audioManager.playOneShot(`${eventType}:${userId}:${now}`, config);
    }

    addPendingOverride(soundName, userId, eventType) {
        const now = Date.now();
        const queue = this.pendingOverrides.get(soundName) || [];
        queue.push({userId, eventType, createdAt: now, expiresAt: now + 1500});
        this.pendingOverrides.set(soundName, queue);
        this.setTimer(() => this.prunePendingOverrides(), 1600);
    }

    consumePendingOverride(soundName) {
        this.prunePendingOverrides();
        const queue = this.pendingOverrides.get(soundName) || [];
        const item = queue.shift();
        if (!queue.length) this.pendingOverrides.delete(soundName);
        else this.pendingOverrides.set(soundName, queue);
        return Boolean(item);
    }

    prunePendingOverrides() {
        const now = Date.now();
        for (const [key, queue] of this.pendingOverrides.entries()) {
            const alive = queue.filter((item) => item.expiresAt > now);
            if (alive.length) this.pendingOverrides.set(key, alive);
            else this.pendingOverrides.delete(key);
        }
    }

    resolveSoundConfig(userId, eventType) {
        const userConfig = this.settings.users?.[userId]?.[eventType];
        let effective = userConfig && userConfig.mode !== "inherit" ? userConfig : this.settings.defaults[eventType];
        effective = normalizeSoundConfig(effective, userConfig && userConfig.mode !== "inherit" ? "inherit" : "default");

        if (effective.mode !== "custom") return {...effective, eventType, userId};
        if (!effective.source && (!effective.path || !this.fileExists(effective.path))) {
            this.toast(`${this.t("fileMissing")}: ${effective.path || ""}`, "error");
            this.logDebug("Invalid custom path, falling back to default", {userId, eventType});
            return {mode: "default", path: null, source: null, volume: 1, eventType, userId};
        }
        return {...effective, eventType, userId};
    }

    fileExists(filePath) {
        const cached = this.pathExistsCache.get(filePath);
        if (cached && Date.now() - cached.checkedAt < 30000) return cached.exists;
        let exists = false;
        try {
            exists = fs.existsSync(filePath);
        }
        catch (_) {
            exists = false;
        }
        this.pathExistsCache.set(filePath, {exists, checkedAt: Date.now()});
        return exists;
    }

    async pickAudioFile() {
        return new Promise((resolve) => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = AUDIO_FILTERS[0].extensions.map((extension) => `.${extension}`).join(",");
            input.style.display = "none";

            const cleanup = () => {
                input.onchange = null;
                input.remove();
            };

            input.onchange = async () => {
                const file = input.files?.[0];
                if (!file) {
                    cleanup();
                    resolve(null);
                    return;
                }

                try {
                    const source = await this.readBrowserFileAsDataURL(file);
                    const picked = {
                        path: file.path || file.name || null,
                        source
                    };
                    const ok = await this.tryLoadAudio(picked);
                    if (!ok) this.toast(this.t("fileSelectedWithWarning"), "warning");
                    cleanup();
                    resolve(picked);
                }
                catch (error) {
                    this.logDebug("FileReader failed", error);
                    this.toast(this.t("fileBad"), "error");
                    cleanup();
                    resolve(null);
                }
            };

            document.body.appendChild(input);
            input.click();
        });
    }

    readBrowserFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = String(reader.result || "");
                if (result.startsWith("data:")) resolve(result);
                else reject(new Error("FileReader did not return a data URL."));
            };
            reader.onerror = () => reject(reader.error || new Error("FileReader failed."));
            reader.readAsDataURL(file);
        });
    }

    async tryLoadAudio(soundConfig) {
        try {
            await this.audioManager.loadHtmlAudio(soundConfig);
            return true;
        }
        catch (error) {
            this.logDebug("tryLoadAudio failed", {path: soundConfig?.path, error});
            return false;
        }
    }

    openUserModalById(userId) {
        const user = this.modules.UserStore?.getUser?.(userId);
        if (user) this.openUserModal(user);
        else this.openUserModal({id: userId, username: this.settings.users[userId]?.identity?.username || userId});
    }

    openUserModal(user) {
        this.ensureUi();
        if (!this.ui) return;
        const userId = String(user.id);
        const existing = this.settings.users[userId] || this.makeUserSettings(user);
        const draft = this.normalizeUserSettings(existing);
        const identity = draft.identity || {};
        this.ui.openUserModal({
            userId,
            avatar: identity.avatar || this.getAvatarUrl(user) || "",
            name: this.identityName(identity, userId),
            username: identity.username || user.username || "",
            settings: draft,
            canReset: Boolean(this.settings.users[userId])
        });
    }


    ensureUserSettings(user) {
        const userId = String(user.id);
        this.settings.users[userId] = this.normalizeUserSettings(this.settings.users[userId] || this.makeUserSettings(user));
        this.settings.users[userId].identity = this.makeIdentity(user);
        return this.settings.users[userId];
    }

    makeUserSettings(user) {
        return {
            identity: this.makeIdentity(user),
            message: {mode: "inherit", path: null, volume: 1},
            incomingCall: {mode: "inherit", path: null, volume: 1},
            disconnect: {mode: "inherit", path: null, volume: 1},
            voiceJoin: {mode: "inherit", path: null, volume: 1}
        };
    }

    makeIdentity(user) {
        return {
            username: user?.username || "",
            globalName: user?.globalName || user?.global_name || "",
            avatar: this.getAvatarUrl(user)
        };
    }

    getAvatarUrl(user) {
        try {
            return user?.getAvatarURL?.(undefined, 64, true) || user?.avatarURL || null;
        }
        catch (_) {
            return null;
        }
    }

    identityName(identity, fallback) {
        return identity?.globalName || identity?.username || fallback;
    }

    showModeHelpModal() {
        this.ensureUi();
        this.ui?.openHelp?.();
    }

    showAudioDiagnosticsModal(filePath, rows) {
        this.ensureUi();
        this.ui?.openDiagnostics?.(filePath || "", Array.isArray(rows) ? rows : []);
    }

    showCompatibilityModal() {
        this.ensureUi();
        if (!this.ui) return;
        const rows = [
            ["Dispatcher", Boolean(this.modules.Dispatcher)],
            ["SoundUtils", Boolean(this.modules.SoundUtils) || this.soundPatchReady],
            ["DesktopNotification", this.notificationPatchReady],
            ["CallStore", Boolean(this.modules.CallStore)],
            ["VoiceStateStore", Boolean(this.modules.VoiceStateStore)],
            ["Context menu patch", Boolean(this.contextMenuUnpatch)],
            ["Sound prototype patch", this.soundPrototypePatched],
            ["Active unpatches", this.unpatches.length > 0]
        ];
        this.ui.openCompatibility(rows);
    }

    isDirectMessageChannel(channel) {
        return Boolean(channel?.isDM?.() || channel?.type === 1);
    }

    isCurrentUser(userId) {
        return String(userId) === this.getCurrentUserId();
    }

    getCurrentUserId() {
        return String(this.modules.UserStore?.getCurrentUser?.()?.id || "");
    }

    isBlocked(userId) {
        const store = this.modules.RelationshipStore;
        try {
            return Boolean(store?.isBlocked?.(userId) || store?.isBlockedForSpam?.(userId));
        }
        catch (_) {
            return false;
        }
    }

    shouldSkipAdditionalSound() {
        if (this.settings.global.respectStreamerMode && this.isStreamerModeEnabled()) {
            this.logDebug("Skip streamer mode");
            return true;
        }
        if (this.settings.global.respectDnd && this.isDnd()) {
            this.logDebug("Skip DND");
            return true;
        }
        return false;
    }

    isStreamerModeEnabled() {
        const store = this.modules.StreamerModeStore;
        try {
            return Boolean(store?.isEnabled?.() || store?.enabled || store?.hidePersonalInformation);
        }
        catch (_) {
            return false;
        }
    }

    isDnd() {
        const userId = this.getCurrentUserId();
        const store = this.modules.StatusStore;
        try {
            const status = store?.getStatus?.(userId) || store?.getOwnStatus?.();
            return status === "dnd";
        }
        catch (_) {
            return false;
        }
    }

    getCurrentVoiceChannelId() {
        const currentUserId = this.getCurrentUserId();
        return this.lastVoiceChannels.get(currentUserId) || this.getVoiceChannelIdFromStore(currentUserId);
    }

    getVoiceChannelIdFromStore(userId) {
        const store = this.modules.VoiceStateStore;
        if (!store || !userId) return null;
        for (const method of ["getVoiceStateForUser", "getVoiceState", "getCurrentClientVoiceChannelId"]) {
            if (typeof store[method] !== "function") continue;
            try {
                const result = store[method](userId);
                if (typeof result === "string") return result;
                const channelId = result?.channelId ?? result?.channel_id ?? null;
                if (channelId) return channelId;
            }
            catch (_) {}
        }
        return null;
    }

    extractSoundName(args) {
        for (const arg of args || []) {
            if (typeof arg === "string") return arg;
            if (arg?.name) return arg.name;
            if (arg?.sound) return arg.sound;
        }
        return null;
    }

    getSoundName(soundObject) {
        return this.soundInstanceNames.get(soundObject)
            || soundObject?.name
            || soundObject?.sound
            || soundObject?._name
            || soundObject?.src
            || null;
    }

    setTimer(callback, delay) {
        const timer = setTimeout(() => {
            this.timers.delete(timer);
            callback();
        }, delay);
        this.timers.add(timer);
        return timer;
    }

    toast(message, type = "info") {
        try {
            this.api.UI.showToast(message, {type});
        }
        catch (_) {
            BdApi.UI.showToast(message, {type});
        }
    }

    toastDebug(message) {
        if (this.settings.global.debug) this.toast(message, "info");
    }

    logDebug(message, data) {
        if (!this.settings?.global?.debug) return;
        if (data !== undefined) console.debug(`[${PLUGIN_NAME}] ${message}`, data);
        else console.debug(`[${PLUGIN_NAME}] ${message}`);
    }
};
