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
//__PUSS_GLUE_INSERT__

const PUSS_STYLES = __PUSS_STYLES__;
const PUSS_TEMPLATES = __PUSS_TEMPLATES__;

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
