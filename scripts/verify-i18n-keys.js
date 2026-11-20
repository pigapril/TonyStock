#!/usr/bin/env node
/**
 * Verify static UI references and the complete zh-TW string-key inventory.
 * Every non-default locale must resolve all source keys directly or through
 * its configured fallback chain. English remains the authoritative fallback;
 * other locales are never allowed to fall back to a different Chinese locale.
 */
const fs = require('fs');
const path = require('path');
const { LOCALE_CODES, getLocaleResourceChain } = require('../src/locales/localeConfig');
const {
  getValueAtPath,
  resolveKeyFromChain,
  getInterpolationTokens,
} = require('../src/locales/localeKeyResolution');

const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src');
const EXTRA_DIRS = ['legacy-tests'].map(d => path.join(ROOT, d)).filter(fs.existsSync);
const EXT = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);
const TRANSLATIONS = Object.fromEntries(LOCALE_CODES.map(locale => [
  locale,
  JSON.parse(fs.readFileSync(path.join(SRC_DIR, `locales/${locale}/translation.json`), 'utf8')),
]));

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

function flattenStrings(resource, prefix = '', output = {}) {
  if (Array.isArray(resource)) {
    resource.forEach((value, index) => flattenStrings(value, `${prefix}[${index}]`, output));
  } else if (resource && typeof resource === 'object') {
    for (const [key, value] of Object.entries(resource)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (value && typeof value === 'object') {
        flattenStrings(value, fullKey, output);
      } else if (typeof value === 'string') {
        output[fullKey] = value;
      }
    }
  } else if (typeof resource === 'string') {
    if (prefix) output[prefix] = resource;
  }
  return output;
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
const placeholderMismatches = [];
const completeSourceKeys = Object.keys(flattenStrings(TRANSLATIONS['zh-TW']));
for (const [locale, translation] of Object.entries(TRANSLATIONS)) {
  // English is the base locale. All code-referenced keys are checked for it;
  // full zh-TW inventory checks apply to translated locales and their fallbacks.
  const keysToCheck = locale === 'en' ? [...extracted] : completeSourceKeys;
  for (const key of keysToCheck) {
    const resolved = resolveKeyFromChain(locale, key, TRANSLATIONS, getLocaleResourceChain);
    if (!resolved.found) {
      missing.push({ locale, key, fallbackChain: getLocaleResourceChain(locale) });
      continue;
    }

    const sourceValue = getValueAtPath(TRANSLATIONS['zh-TW'], key);
    if (typeof sourceValue !== 'string' || typeof resolved.value !== 'string') continue;
    const sourceTokens = getInterpolationTokens(sourceValue);
    const resolvedValues = resolved.variants
      ? Object.entries(resolved.variants).filter(([, variant]) => variant).map(([suffix, variant]) => ({
        key: variant.key,
        locale: variant.locale,
        suffix,
        value: variant.value,
      }))
      : [{ key: resolved.key, locale: resolved.locale, suffix: null, value: resolved.value }];
    for (const target of resolvedValues) {
      const targetTokens = getInterpolationTokens(target.value);
      if (JSON.stringify(sourceTokens) !== JSON.stringify(targetTokens)) {
        placeholderMismatches.push({
          locale,
          key: target.key || key,
          resolvedFrom: target.locale,
          pluralSuffix: target.suffix,
          sourceTokens,
          targetTokens,
        });
      }
    }
  }
}
console.log(`Extracted ${extracted.size} unique static keys`);
console.log(`Checked locales: ${LOCALE_CODES.join(', ')}`);
console.log(`Complete source string keys: ${completeSourceKeys.length}`);
console.log(`Unresolved locale keys after fallback: ${missing.length}`);
console.log(`Placeholder mismatches against zh-TW: ${placeholderMismatches.length}`);
if (missing.length || placeholderMismatches.length) {
  console.log('MISSING KEYS:');
  for (const { locale, key, fallbackChain } of missing) {
    console.log(`  [${locale}] ${key} (fallback: ${fallbackChain.join(' -> ')})  <- ${(perFile[key] || []).slice(0, 3).join(', ')}`);
  }
  if (placeholderMismatches.length) {
    console.log('PLACEHOLDER MISMATCHES:');
    for (const mismatch of placeholderMismatches) {
      console.log(`  [${mismatch.locale}] ${mismatch.key} (resolved from ${mismatch.resolvedFrom}${mismatch.pluralSuffix ? `, ${mismatch.pluralSuffix}` : ''})`);
      console.log(`    zh-TW: ${JSON.stringify(mismatch.sourceTokens)}`);
      console.log(`    target: ${JSON.stringify(mismatch.targetTokens)}`);
    }
  }
  process.exit(1);
}
