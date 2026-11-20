#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const REVIEW_DIR = __dirname;
const SOURCE_FILE = path.resolve(REVIEW_DIR, '../../../src/locales/zh-TW/translation.json');
const OUTPUT_FILE = path.join(REVIEW_DIR, 'ko-KR.translation-review.json');
const WRITE = process.argv.includes('--write');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function flatten(value, prefix = '', output = {}) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => flatten(item, `${prefix}[${index}]`, output));
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      flatten(child, prefix ? `${prefix}.${key}` : key, output);
    }
  } else if (typeof value === 'string') {
    output[prefix] = value;
  } else {
    output[prefix] = value;
  }
  return output;
}

function merge(target, source, file, prefix = '') {
  for (const [key, value] of Object.entries(source)) {
    const currentPath = prefix ? `${prefix}.${key}` : key;
    if (Object.prototype.hasOwnProperty.call(target, key)) {
      if (target[key] && value && typeof target[key] === 'object' && typeof value === 'object'
          && Array.isArray(target[key]) === Array.isArray(value)) {
        if (Array.isArray(value)) {
          if (target[key].length !== value.length) {
            throw new Error(`Array length conflict at ${currentPath} in ${file}`);
          }
          value.forEach((child, index) => {
            if (child && typeof child === 'object') merge(target[key][index], child, file, `${currentPath}[${index}]`);
            else if (target[key][index] !== child) throw new Error(`Conflicting draft value at ${currentPath}[${index}] in ${file}`);
          });
        } else {
          merge(target[key], value, file, currentPath);
        }
      } else {
        throw new Error(`Duplicate or conflicting draft path ${currentPath} in ${file}`);
      }
    } else {
      target[key] = value;
    }
  }
}

const extract = (text, pattern) => (String(text).match(pattern) || []).sort();
const interpolationPattern = /\{\{\s*[^{}]+?\s*\}\}|%\{\s*[^{}]+?\s*\}|\{[A-Za-z_][A-Za-z0-9_]*\}/g;
const tagPattern = /<\/?([A-Za-z][A-Za-z0-9-]*)\b[^>]*\/?>/g;

const source = readJson(SOURCE_FILE);
const merged = {};
const files = fs.readdirSync(REVIEW_DIR)
  .filter(name => name.endsWith('.draft.json'))
  .sort();

for (const name of files) merge(merged, readJson(path.join(REVIEW_DIR, name)), name);

const sourceFlat = flatten(source);
const draftFlat = flatten(merged);
const sourceKeys = Object.keys(sourceFlat);
const draftKeys = Object.keys(draftFlat);
const missing = sourceKeys.filter(key => !Object.prototype.hasOwnProperty.call(draftFlat, key));
const extra = draftKeys.filter(key => !Object.prototype.hasOwnProperty.call(sourceFlat, key));
const placeholderMismatches = [];
const markupMismatches = [];
const emptyValues = [];
const cjkResiduals = [];

for (const key of draftKeys) {
  const value = draftFlat[key];
  if (typeof value === 'string' && value.trim() === '') emptyValues.push(key);
  if (!Object.prototype.hasOwnProperty.call(sourceFlat, key) || typeof value !== 'string') continue;

  const sourceTokens = extract(sourceFlat[key], interpolationPattern);
  const targetTokens = extract(value, interpolationPattern);
  if (JSON.stringify(sourceTokens) !== JSON.stringify(targetTokens)) {
    placeholderMismatches.push({ key, sourceTokens, targetTokens });
  }

  const sourceTags = extract(sourceFlat[key], tagPattern).map(tag => tag.toLowerCase());
  const targetTags = extract(value, tagPattern).map(tag => tag.toLowerCase());
  if (JSON.stringify(sourceTags) !== JSON.stringify(targetTags)) {
    markupMismatches.push({ key, sourceTags, targetTags });
  }

  if (/[\u3400-\u4dbf\u4e00-\u9fff]/.test(value)) cjkResiduals.push({ key, value });
}

const report = {
  sourceFile: path.relative(process.cwd(), SOURCE_FILE),
  draftFiles: files,
  sourceStringKeys: sourceKeys.length,
  draftStringKeys: draftKeys.length,
  missingKeys: missing.length,
  extraKeys: extra.length,
  placeholderMismatches: placeholderMismatches.length,
  markupMismatches: markupMismatches.length,
  emptyValues: emptyValues.length,
  cjkResiduals: cjkResiduals.length,
  missingByGroup: Object.fromEntries([...new Set(missing.map(key => key.split('.')[0]))]
    .map(group => [group, missing.filter(key => key.startsWith(`${group}.`) || key === group).length])),
};

console.log(JSON.stringify(report, null, 2));

if (missing.length || extra.length || placeholderMismatches.length || markupMismatches.length || emptyValues.length) {
  console.error('\nTranslation review is incomplete or structurally inconsistent.');
  if (missing.length) console.error('Missing key examples:', missing.slice(0, 30));
  if (extra.length) console.error('Extra key examples:', extra.slice(0, 30));
  if (placeholderMismatches.length) console.error('Placeholder examples:', placeholderMismatches.slice(0, 20));
  if (markupMismatches.length) console.error('Markup examples:', markupMismatches.slice(0, 20));
  if (emptyValues.length) console.error('Empty values:', emptyValues.slice(0, 30));
  process.exit(1);
}

if (WRITE) {
  fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(merged, null, 2)}\n`);
  console.log(`\nWrote complete review JSON: ${path.relative(process.cwd(), OUTPUT_FILE)}`);
} else {
  console.log('\nAll checks passed. Run with --write to create the merged review JSON.');
}

if (cjkResiduals.length) {
  console.warn('\nCJK character review list (some may be intentional protected names):');
  for (const item of cjkResiduals.slice(0, 40)) console.warn(`  ${item.key}: ${item.value}`);
}
