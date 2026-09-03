#!/usr/bin/env node
/**
 * transform.js — generates src/plugin.js from the original plugin file.
 *
 * Mechanical, deterministic refactor: removes the TEXT dictionary and the
 * React UI methods, replaces them with thin wrappers over the PussUI layer,
 * and inserts UI bootstrap markers. Each operation asserts it found exactly
 * one anchor, so a changed upstream file fails loudly instead of silently
 * producing a broken src.
 *
 * Usage:  node tools/transform.js   (run from the project root)
 * Output: src/plugin.js
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, "src", "plugin.js");
const FRAGMENTS = path.join(__dirname, "fragments");
const BUILD_VERSION = "1.1.0";

// Reference source: the original pre-refactor plugin. Once the live file next
// to the project has been replaced by a build, fall back to the OLDEST backup
// (the pristine original) rather than a later build.
function resolveOriginal() {
    const live = path.resolve(ROOT, "..", "PersonalUserSounds.plugin.js");
    const backupDir = path.resolve(ROOT, "..");
    let backups = [];
    try {
        backups = fs.readdirSync(backupDir)
            .filter((name) => /^PersonalUserSounds\.plugin\.js\.bak-\d{8}-\d{6}$/.test(name))
            .map((name) => path.join(backupDir, name))
            .sort();
    }
    catch (_) { /* ignore */ }
    return backups.length ? backups[0] : live;
}
const ORIGINAL = resolveOriginal();

const log = [];
const die = (message) => {
    console.error("FATAL: " + message);
    console.error(log.join("\n"));
    process.exit(1);
};
const ok = (message) => log.push("  ok  " + message);

function readFragment(name) {
    const file = path.join(FRAGMENTS, name);
    if (!fs.existsSync(file)) die("Missing fragment: " + name);
    let text = fs.readFileSync(file, "utf8");
    text = text.replace(/\r\n/g, "\n").replace(/\n+$/, "");
    ok("fragment loaded: " + name);
    return text;
}

// Remove string/comment contents so brace counting ignores braces inside them.
function stripStringsAndComments(line) {
    let out = line.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[{}]/g, " "));
    out = out.replace(/\/\/.*$/, "");
    out = out.replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\\n]|\\.)*`/g, (m) => m.replace(/[{}]/g, " "));
    return out;
}

function braceDelta(line) {
    const clean = stripStringsAndComments(line);
    const opens = (clean.match(/{/g) || []).length;
    const closes = (clean.match(/}/g) || []).length;
    return opens - closes;
}

/**
 * Returns {start, end} line indices (inclusive) of the block that begins on
 * the line at `startLine` (which must open a brace). Handles nested braces
 * line by line.
 */
function findBlockEnd(lines, startLine) {
    let depth = 0;
    for (let i = startLine; i < lines.length; i++) {
        depth += braceDelta(lines[i]);
        if (depth <= 0) return i;
    }
    die("Unbalanced block starting at line " + (startLine + 1));
}

function findUniqueLine(lines, pattern, label) {
    const hits = [];
    const re = new RegExp(pattern);
    for (let i = 0; i < lines.length; i++) {
        if (re.test(lines[i])) hits.push(i);
    }
    if (hits.length !== 1) die(`${label}: expected exactly 1 match, found ${hits.length}`);
    return hits[0];
}

function replaceMethod(lines, pattern, newBody, label) {
    const sigLine = findUniqueLine(lines, pattern, label);
    const endLine = findBlockEnd(lines, sigLine);
    const head = lines.slice(0, sigLine);
    const tail = lines.slice(endLine + 1);
    const body = newBody.split("\n");
    ok(`replaced method ${label} (lines ${sigLine + 1}-${endLine + 1})`);
    return head.concat(body, tail);
}

function removeBlock(lines, pattern, label) {
    const sigLine = findUniqueLine(lines, pattern, label);
    const endLine = findBlockEnd(lines, sigLine);
    ok(`removed block ${label} (lines ${sigLine + 1}-${endLine + 1})`);
    return lines.slice(0, sigLine).concat(lines.slice(endLine + 1));
}

function insertAfterLine(lines, pattern, insertion, label) {
    const anchor = findUniqueLine(lines, pattern, label);
    const out = [];
    for (let i = 0; i < lines.length; i++) {
        out.push(lines[i]);
        if (i === anchor) out.push(insertion);
    }
    ok(`inserted ${label} after line ${anchor + 1}`);
    return out;
}

function insertBeforeLine(lines, pattern, insertion, label) {
    const anchor = findUniqueLine(lines, pattern, label);
    const out = [];
    for (let i = 0; i < lines.length; i++) {
        if (i === anchor) out.push(insertion);
        out.push(lines[i]);
    }
    ok(`inserted ${label} before line ${anchor + 1}`);
    return out;
}

function replaceTextOnce(text, search, replacement, label) {
    const count = text.split(search).length - 1;
    if (count !== 1) die(`${label}: expected exactly 1 occurrence, found ${count}`);
    ok(`replaced text ${label}`);
    return text.split(search).join(replacement);
}

// ---------------------------------------------------------------------------

let code = fs.readFileSync(ORIGINAL, "utf8").replace(/\r\n/g, "\n");
ok("read original: " + ORIGINAL);

// Version bump: the transform output carries the current release version.
code = code.replace(/@version \d+\.\d+\.\d+/, "@version " + BUILD_VERSION);
ok("version bumped to " + BUILD_VERSION);

// 1. Header: UI markers after "use strict";
code = insertAfterLine(
    code.split("\n"),
    '^"use strict";$',
    readFragment("header.js"),
    'header after "use strict"'
).join("\n");

// 2. Remove the TEXT dictionary block.
code = removeBlock(
    code.split("\n"),
    '^const TEXT = \\{$',
    "const TEXT = { ... } dictionary"
).join("\n");

// 3. Constructor: add this.ui = null (anchor unique to the constructor).
code = replaceTextOnce(
    code,
    "        this.pathExistsCache = new Map();\n",
    "        this.pathExistsCache = new Map();\n        this.ui = null;\n",
    "constructor this.ui = null"
);

// 4. start(): init the UI layer after logCompatibility().
code = replaceTextOnce(
    code,
    "        this.logCompatibility();\n    }\n",
    "        this.logCompatibility();\n        this.initUi();\n    }\n",
    "start() initUi()"
);

// 5. stop(): destroy UI state.
code = replaceTextOnce(
    code,
    "        this.notificationPatchReady = false;\n        this.soundPatchReady = false;\n    }\n",
    "        this.notificationPatchReady = false;\n        this.soundPatchReady = false;\n        this.ui?.destroy?.();\n        this.ui = null;\n    }\n",
    "stop() ui destroy"
);

let lines = code.split("\n");

// 6. Replace the visual methods with wrappers.
lines = replaceMethod(lines, "^    getSettingsPanel\\(\\) \\{$", readFragment("method-getSettingsPanel.js"), "getSettingsPanel()");
lines = replaceMethod(lines, "^    openUserModal\\(user\\) \\{$", readFragment("method-openUserModal.js"), "openUserModal(user)");
lines = replaceMethod(lines, "^    t\\(key\\) \\{$", readFragment("method-t.js"), "t(key)");

// 7. Remove UserEventEditorComponent entirely.
lines = removeBlock(lines, "^    UserEventEditorComponent\\(\\) \\{$", "UserEventEditorComponent()");

// 8. Replace the info modals.
lines = replaceMethod(lines, "^    showModeHelpModal\\(\\) \\{$", readFragment("method-showModeHelpModal.js"), "showModeHelpModal()");
lines = replaceMethod(lines, "^    showAudioDiagnosticsModal\\(filePath, rows\\) \\{$", readFragment("method-showAudioDiagnosticsModal.js"), "showAudioDiagnosticsModal()");
lines = replaceMethod(lines, "^    showCompatibilityModal\\(\\) \\{$", readFragment("method-showCompatibilityModal.js"), "showCompatibilityModal()");

// 9. Insert the new UI helper methods before getSettingsPanel().
lines = insertBeforeLine(lines, "^    getSettingsPanel\\(\\) \\{$", readFragment("methods-new.js"), "ensureUi/initUi/makeUiHost");

code = lines.join("\n");

// Safety checks -------------------------------------------------------------
const forbidden = [
    ["UserEventEditorComponent", /UserEventEditorComponent/],
    ["TEXT dictionary reference", /const TEXT = \{/],
    ["old React panel internals", /showConfirmationModal/],
    ["settingsTitle in class body", /settingsTitle: "PersonalUserSounds"/]
];
for (const [label, re] of forbidden) {
    if (re.test(code)) die("Leftover detected: " + label);
}
ok("leftover checks passed");

// Sanity: the class still exports and key logic markers survived.
for (const marker of [
    "module.exports = class PersonalUserSounds",
    "class AudioManager",
    "getSettingsPanel()",
    "ensureUi()",
    "makeUiHost()",
    "PUSS_STYLES = __PUSS_STYLES__",
    "PUSS_TEMPLATES = __PUSS_TEMPLATES__",
    "//__PUSS_GLUE_INSERT__",
    "patchNotificationModule",
    "handleVoiceStateUpdates"
]) {
    if (!code.includes(marker)) die("Missing expected marker: " + marker);
}
ok("marker checks passed");

fs.writeFileSync(OUTPUT, code, "utf8");
ok("wrote " + OUTPUT);

console.log(log.join("\n"));
console.log("transform.js done.");
