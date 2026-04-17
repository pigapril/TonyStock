#!/usr/bin/env node
/**
 * Verify all static t('...') / <Trans i18nKey="..."> keys in src still exist
 * in en/translation.json. Reports any missing keys as regressions.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src');
const EXTRA_DIRS = ['legacy-tests'].map(d => path.join(ROOT, d)).filter(fs.existsSync);
const EXT = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);
const EN = JSON.parse(fs.readFileSync(path.join(SRC_DIR, 'locales/en/translation.json'), 'utf8'));

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

function hasKey(obj, parts) {
  let cur = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return false;
    if (!(p in cur)) return false;
    cur = cur[p];
  }
  return true;
}

const files = walk(SRC_DIR);
for (const d of EXTRA_DIRS) walk(d, files);

// Extract static keys from t('...'), t("..."), i18nKey="..."
const staticRe = /(?:\bt\(\s*|i18nKey\s*=\s*)(['"])([A-Za-z0-9_]+(?:\.[A-Za-z0-9_@-]+)+)\1/g;
const extracted = new Set();
const perFile = {};

for (const f of files) {
  const txt = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = staticRe.exec(txt)) !== null) {
    extracted.add(m[2]);
    (perFile[m[2]] = perFile[m[2]] || []).push(path.relative(ROOT, f));
  }
}

const missing = [];
for (const key of extracted) {
  if (!hasKey(EN, key.split('.'))) missing.push(key);
}

console.log(`Extracted ${extracted.size} unique static keys`);
console.log(`Missing from en translation: ${missing.length}`);
if (missing.length) {
  console.log('MISSING KEYS:');
  for (const k of missing) {
    console.log(`  ${k}  <- ${(perFile[k] || []).slice(0, 3).join(', ')}`);
  }
  process.exit(1);
}
