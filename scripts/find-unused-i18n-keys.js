#!/usr/bin/env node
/**
 * Scan src/ for used i18n keys and report keys that appear in translation.json
 * but have zero references (direct or dynamic prefix).
 *
 * Strategy (high recall — errs on the side of keeping keys):
 *   1. Flatten leaf keys from en/translation.json.
 *   2. Concatenate all src/ source files into one corpus.
 *   3. A leaf key is USED if ANY of:
 *        (a) its full dotted path appears verbatim as a substring in the corpus
 *            (covers t('foo.bar'), <Trans i18nKey="foo.bar">, string constants
 *             later passed to t(), keys stored in config maps, etc.)
 *        (b) it starts with a template-literal prefix found anywhere in the
 *            corpus — i.e. `prefix.${x}...` or 'prefix.' + x. Any such prefix
 *            preserves the entire subtree.
 *   4. Everything else is reported as unused.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src');
const EN_FILE = path.join(SRC_DIR, 'locales/en/translation.json');
const ZH_FILE = path.join(SRC_DIR, 'locales/zh-TW/translation.json');
const EXTRA_DIRS = ['legacy-tests', 'scripts', 'config'].map(d => path.join(ROOT, d)).filter(fs.existsSync);
const EXT = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);

// ---------- collect source corpus ----------
function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === 'build' || name === 'coverage' || name.startsWith('.')) continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (EXT.has(path.extname(name))) out.push(full);
  }
  return out;
}

const files = walk(SRC_DIR);
for (const d of EXTRA_DIRS) walk(d, files);
let corpus = '';
for (const f of files) corpus += '\n' + fs.readFileSync(f, 'utf8');

// ---------- flatten JSON keys ----------
function flatten(obj, prefix, out) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out.push(key);
  }
}
const en = JSON.parse(fs.readFileSync(EN_FILE, 'utf8'));
const leafKeys = [];
flatten(en, '', leafKeys);

// Also collect every intermediate namespace path (so we can preserve whole
// subtrees when code calls t('some.namespace') on a node that is an object).
const allPaths = new Set(leafKeys);
(function collectPaths(obj, prefix) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    allPaths.add(key);
    if (v && typeof v === 'object' && !Array.isArray(v)) collectPaths(v, key);
  }
})(en, '');

// ---------- extract dynamic prefixes ----------
// Matches `<anything>.${...` and captures everything up to & including the last '.'
// before the first ${. Works inside backtick template literals.
// Also matches string concatenation: 'foo.bar.' + something
const prefixSet = new Set();

// Template literals: `foo.bar.${x}` -> prefix "foo.bar."
const tplRe = /`([^`$\\]*\.)\$\{/g;
let m;
while ((m = tplRe.exec(corpus)) !== null) {
  const pref = m[1];
  // Only keep prefixes that look like translation paths (contain at least one dot)
  if (/^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)*\.$/.test(pref)) prefixSet.add(pref);
}

// String concat: 'foo.bar.' + ident  or  "foo.bar." + ident
const concatRe = /['"]([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*\.)['"]\s*\+/g;
while ((m = concatRe.exec(corpus)) !== null) {
  prefixSet.add(m[1]);
}

const prefixes = [...prefixSet].sort();

// ---------- determine usage ----------
// Extract all static t('foo.bar') / t("foo.bar") / i18nKey="foo.bar" paths.
// For any such path that resolves to an intermediate node in the JSON tree,
// preserve its entire subtree (covers t('ns.obj', { returnObjects: true }) and
// stringly-bad calls alike — same behavior either way).
const staticCallRe = /(?:\bt\(\s*|i18nKey\s*=\s*)(['"])([A-Za-z0-9_]+(?:\.[A-Za-z0-9_@-]+)+)\1/g;
const staticCalls = new Set();
let sm;
while ((sm = staticCallRe.exec(corpus)) !== null) staticCalls.add(sm[2]);

// If a static call targets an intermediate namespace, preserve the subtree by
// treating the namespace as an additional prefix.
for (const callPath of staticCalls) {
  if (allPaths.has(callPath) && !leafKeys.includes(callPath)) {
    // It's an intermediate node — preserve all descendants.
    prefixSet.add(callPath + '.');
  }
}
// Rebuild prefixes after namespace additions.
const prefixes2 = [...prefixSet].sort();

const used = new Set();
const usedByPrefix = new Set();

for (const key of leafKeys) {
  if (corpus.includes(key)) {
    used.add(key);
    continue;
  }
  for (const p of prefixes2) {
    if (key.startsWith(p)) {
      used.add(key);
      usedByPrefix.add(key);
      break;
    }
  }
}

const unused = leafKeys.filter(k => !used.has(k));

// ---------- output ----------
const outPath = path.join(ROOT, 'unused-i18n-keys.json');
fs.writeFileSync(outPath, JSON.stringify({
  totalKeys: leafKeys.length,
  usedKeys: used.size,
  unusedCount: unused.length,
  dynamicPrefixesDetected: prefixes2,
  unusedKeys: unused,
}, null, 2));

console.log(`Scanned ${files.length} source files`);
console.log(`Total leaf keys:       ${leafKeys.length}`);
console.log(`Used (direct+prefix):  ${used.size} (prefix-matched: ${usedByPrefix.size})`);
console.log(`Unused candidates:     ${unused.length}`);
console.log(`Dynamic prefixes:      ${prefixes.length}`);
console.log(`Report: ${path.relative(ROOT, outPath)}`);
