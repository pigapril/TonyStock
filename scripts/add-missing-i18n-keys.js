#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const EN = path.join(ROOT, 'src/locales/en/translation.json');
const ZH = path.join(ROOT, 'src/locales/zh-TW/translation.json');

// Three real runtime bugs caught by the crawler. Only add keys that are
// actually missing in each file (some exist in one language already).
const FIXES = {
  en: {
    'appName': 'Sentiment Inside Out',
    'priceAnalysis.heading': 'LOHAS Five-Line Analysis',
    'subscription.subscriptionPlans.loadingPlans': 'Loading plans...',
  },
  'zh-TW': {
    'appName': '市場情緒追蹤平台',
    'subscription.subscriptionPlans.loadingPlans': '載入方案資料中...',
  },
};

function setKey(obj, parts, value) {
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (cur[p] == null || typeof cur[p] !== 'object' || Array.isArray(cur[p])) {
      cur[p] = {};
    }
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
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

for (const [lang, pairs] of Object.entries(FIXES)) {
  const file = lang === 'en' ? EN : ZH;
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  let added = 0;
  for (const [key, value] of Object.entries(pairs)) {
    const parts = key.split('.');
    if (hasKey(json, parts)) {
      console.log(`[${lang}] SKIP ${key} (already exists)`);
      continue;
    }
    setKey(json, parts, value);
    added++;
    console.log(`[${lang}] ADD  ${key} = ${JSON.stringify(value)}`);
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n');
  console.log(`[${lang}] wrote ${added} new keys to ${path.relative(ROOT, file)}`);
}
