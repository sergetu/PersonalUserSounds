#!/usr/bin/env node
/**
 * build.js — assembles the final BetterDiscord plugin file.
 *
 *   node tools/build.js
 *
 * Inputs:
 *   src/plugin.js          core plugin code with three markers:
 *                          //__PUSS_GLUE_INSERT__, __PUSS_STYLES__, __PUSS_TEMPLATES__
 *   ui/panel.html          single source of the UI: <style id="puss-styles">,
 *                          <template id="puss-tpl-*"> blocks and the glue
 *                          script between __PUSS_GLUE_BEGIN__ / __PUSS_GLUE_END__
 *
 * Output:
 *   dist/PersonalUserSounds.plugin.js
 *
 * Verification (failures exit non-zero):
 *   - node --check on the result
 *   - no leftover build markers
 *   - every non-UI method of the original plugin file still exists in src and
 *     is byte-identical (logic untouched proof)
 */
"use strict";

const fs = require("fs");
const path = require("path");
const {spawnSync} = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src", "plugin.js");
const UI = path.join(ROOT, "ui", "panel.html");
const OUT_DIR = path.join(ROOT, "dist");
const OUT = path.join(OUT_DIR, "PersonalUserSounds.plugin.js");

// The reference for the logic-untouched proof is the ORIGINAL pre-refactor
// plugin (v1.0.10). After the first deploy the live file next to the project
// becomes a built artifact, so prefer the OLDEST backup (the pristine original).
function resolveOriginal() {
    const live = path.resolve(ROOT, "..", "PersonalUserSounds.plugin.js");
    const backupDir = path.resolve(ROOT, "..");
    const backups = fs.existsSync(backupDir)
        ? fs.readdirSync(backupDir)
            .filter((name) => /^PersonalUserSounds\.plugin\.js\.bak-\d{8}-\d{6}$/.test(name))
            .map((name) => path.join(backupDir, name))
            .sort()
        : [];
    return backups.length ? backups[0] : live;
}
const ORIGINAL = resolveOriginal();

const CHANGED_METHODS = new Set([
    // UI methods rewritten as thin wrappers + lifecycle touched by transform.js
    "constructor", "start", "stop", "t",
    "getSettingsPanel", "openUserModal", "UserEventEditorComponent",
    "showModeHelpModal", "showAudioDiagnosticsModal", "showCompatibilityModal",
    "ensureUi", "initUi", "makeUiHost"
]);

const errors = [];
const report = [];
function note(message) { report.push("  ok  " + message); }
function fail(message) { errors.push(message); console.error("FAIL: " + message); }

function read(file) {
    if (!fs.existsSync(file)) { fail("missing file: " + file); process.exit(1); }
    return fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
}

/* ---------- UI extraction ---------- */
function extractCss(html) {
    const match = /<style id="puss-styles">([\s\S]*?)<\/style>/.exec(html);
    if (!match) { fail("puss-styles <style> block not found in ui/panel.html"); return ""; }
    const css = match[1].trim();
    // Fail-fast guard: the extractor matches the first literal occurrence of
    // the opening tag, which can sit inside an HTML comment (the header doc
    // comment used to spell the tag out). A polluted extraction starts with
    // HTML/comment leftovers and the browser parses zero rules.
    const head = css.slice(0, 200);
    if (/<|every <template|script section|__PUSS_/.test(head)) {
        fail("extracted CSS looks polluted (starts with non-CSS content): " + JSON.stringify(head.slice(0, 80)));
        return "";
    }
    if (!css.includes(".puss-overlay")) {
        fail("extracted CSS is missing the .puss-overlay rule — extraction likely wrong");
        return "";
    }
    return css;
}

function extractTemplates(html) {
    const templates = {};
    const re = /<template id="puss-tpl-([\w-]+)">([\s\S]*?)<\/template>/g;
    let match;
    while ((match = re.exec(html)) !== null) {
        templates[match[1]] = match[2].trim();
    }
    const required = ["panel", "event-card", "user-row", "user-modal", "help", "help-row", "diagnostics", "diag-row", "compatibility", "compat-row"];
    for (const id of required) {
        if (!(id in templates)) fail("missing template: " + id);
    }
    return templates;
}

function extractGlue(html) {
    const begin = "/*__PUSS_GLUE_BEGIN__*/";
    const end = "/*__PUSS_GLUE_END__*/";
    const startIdx = html.indexOf(begin);
    const endIdx = html.indexOf(end);
    if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
        fail("glue markers not found in ui/panel.html");
        return "";
    }
    return html.slice(startIdx + begin.length, endIdx).replace(/^\n+/, "").replace(/\n+$/, "");
}

/* ---------- method extraction from the plugin class ---------- */
function braceDelta(line) {
    const clean = line
        .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[{}]/g, " "))
        .replace(/\/\/.*$/, "")
        .replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\\n]|\\.)*`/g, (m) => m.replace(/[{}]/g, " "));
    const opens = (clean.match(/{/g) || []).length;
    const closes = (clean.match(/}/g) || []).length;
    return opens - closes;
}

function extractClassMethods(code) {
    const marker = "module.exports = class PersonalUserSounds {";
    const markerIdx = code.indexOf(marker);
    if (markerIdx === -1) { fail("class marker not found"); return new Map(); }
    const lines = code.split("\n");
    let startLine = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(marker)) { startLine = i; break; }
    }
    // find class end (balanced braces from the class declaration line)
    let depth = 0;
    let endLine = lines.length - 1;
    for (let i = startLine; i < lines.length; i++) {
        depth += braceDelta(lines[i]);
        if (depth <= 0) { endLine = i; break; }
    }
    const methods = new Map();
    const sigRe = /^    ([A-Za-z_$][\w$]*)\(/;
    for (let i = startLine + 1; i <= endLine; i++) {
        const sig = sigRe.exec(lines[i]);
        if (!sig) continue;
        let bodyDepth = 0;
        let bodyEnd = i;
        for (let j = i; j <= endLine; j++) {
            bodyDepth += braceDelta(lines[j]);
            if (bodyDepth <= 0) { bodyEnd = j; break; }
        }
        methods.set(sig[1], lines.slice(i, bodyEnd + 1).join("\n"));
        i = bodyEnd;
    }
    return {methods, classEndLine: endLine};
}

function verifyLogic(originalCode, srcCode) {
    const orig = extractClassMethods(originalCode);
    const src = extractClassMethods(srcCode).methods;
    let identical = 0;
    let changed = 0;
    let missing = 0;
    for (const [name, body] of orig.methods) {
        if (CHANGED_METHODS.has(name)) { changed++; continue; }
        if (!src.has(name)) { fail("method missing from src/plugin.js: " + name); missing++; continue; }
        if (src.get(name) !== body) {
            fail("method differs from original: " + name);
            continue;
        }
        identical++;
    }
    note(`logic verification: ${identical} methods byte-identical to original, ${changed} intentionally changed, ${missing} missing`);
    return identical;
}

/* ---------- build ---------- */
function build() {
    if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, {recursive: true});

    const html = read(UI);
    const src = read(SRC);
    const original = read(ORIGINAL);

    const css = extractCss(html);
    const templates = extractTemplates(html);
    const glue = extractGlue(html);
    if (!glue.includes("function PussUI") && !glue.includes("PussUI =")) {
        fail("glue code does not contain PussUI");
    }
    note(`extracted UI: ${css.length} css chars, ${Object.keys(templates).length} templates, ${glue.length} glue chars`);

    let output = src;
    const insertMarker = "//__PUSS_GLUE_INSERT__";
    if (!output.includes(insertMarker)) { fail("glue insert marker not found in src/plugin.js"); }
    output = output.replace(insertMarker, glue);
    const stylesConst = "const PUSS_STYLES = __PUSS_STYLES__;";
    const templatesConst = "const PUSS_TEMPLATES = __PUSS_TEMPLATES__;";
    if (!output.includes(stylesConst)) { fail("styles const line not found in src/plugin.js"); }
    output = output.replace(stylesConst, "const PUSS_STYLES = " + JSON.stringify(css) + ";");
    if (!output.includes(templatesConst)) { fail("templates const line not found in src/plugin.js"); }
    output = output.replace(templatesConst, "const PUSS_TEMPLATES = " + JSON.stringify(templates) + ";");

    // leftover markers check
    if (/__PUSS_(STYLES|TEMPLATES|GLUE_INSERT)__/.test(output)) {
        fail("build markers left in output");
    }
    for (const expected of ["module.exports = class PersonalUserSounds", "function PussUI", "PUSS_TEXT", "puss-styles"]) {
        if (!output.includes(expected)) fail("output missing expected marker: " + expected);
    }

    fs.writeFileSync(OUT, output, "utf8");

    // syntax check on a real node process
    const check = spawnSync(process.execPath, ["--check", OUT], {encoding: "utf8"});
    if (check.status !== 0) {
        fail("node --check failed on output:\n" + (check.stderr || check.stdout));
    }
    else {
        note("node --check passed on dist/PersonalUserSounds.plugin.js");
    }

    const origStats = fs.statSync(ORIGINAL);
    const srcStats = fs.statSync(SRC);
    note(`original plugin: ${origStats.size} bytes | src/plugin.js: ${srcStats.size} bytes | dist output: ${output.length} bytes`);
    verifyLogic(original, output);

    if (errors.length) {
        console.error("\nBUILD FAILED with " + errors.length + " error(s).");
        process.exit(1);
    }
    console.log(report.join("\n"));
    console.log("build.js done: " + OUT);
}

build();
