#!/usr/bin/env node
/**
 * Remove keys listed in unused-i18n-keys.json from both translation files.
 * Prunes empty parent objects left behind.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'unused-i18n-keys.json');
const FILES = [
  path.join(ROOT, 'src/locales/en/translation.json'),
  path.join(ROOT, 'src/locales/zh-TW/translation.json'),
];

const { unusedKeys } = JSON.parse(fs.readFileSync(REPORT, 'utf8'));

function removeKey(obj, parts) {
  const [head, ...rest] = parts;
  if (!(head in obj)) return false;
  if (rest.length === 0) {
    delete obj[head];
    return true;
  }
  const child = obj[head];
  if (child && typeof child === 'object' && !Array.isArray(child)) {
    const removed = removeKey(child, rest);
    if (removed && Object.keys(child).length === 0) delete obj[head];
    return removed;
  }
  return false;
}

let totalBefore = 0, totalAfter = 0;
for (const file of FILES) {
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  const before = JSON.stringify(json).length;
  let removed = 0;
  for (const key of unusedKeys) {
    if (removeKey(json, key.split('.'))) removed++;
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n');
  const after = JSON.stringify(json).length;
  totalBefore += before;
  totalAfter += after;
  console.log(`${path.relative(ROOT, file)}: removed ${removed}/${unusedKeys.length} keys, size ${before} -> ${after} bytes`);
}
console.log(`Total size: ${totalBefore} -> ${totalAfter} bytes (${((1 - totalAfter/totalBefore)*100).toFixed(1)}% smaller)`);
