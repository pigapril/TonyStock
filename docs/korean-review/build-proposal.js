#!/usr/bin/env node
/*
 * Assemble a read-only Korean review artifact from the current zh-TW source,
 * zh-CN/English cross-checks and independently stored Korean candidate files.
 * Never writes to src/locales, public assets, route config or app runtime code.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const SOURCE_LOCALE_DIR = path.join(ROOT, 'src/locales');
const EXISTING_DRAFT_DIR = path.join(ROOT, 'docs/i18n/ko-KR-review');
const NEW_DRAFT_DIR = path.join(__dirname, 'drafts');
const OUTPUT_JSON = path.join(__dirname, 'ko-KR-review-proposal.json');
const OUTPUT_REPORT = path.join(__dirname, 'ko-KR-review-proposal.md');

function flatten(resource, prefix = '', output = {}) {
  if (Array.isArray(resource)) {
    resource.forEach((value, index) => flatten(value, `${prefix}[${index}]`, output));
  } else if (resource && typeof resource === 'object') {
    for (const [key, value] of Object.entries(resource)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      flatten(value, fullKey, output);
    }
  } else if (typeof resource === 'string' && prefix) {
    output[prefix] = resource;
  }
  return output;
}

function flattenObjectStrings(resource, prefix = '', output = {}) {
  for (const [key, value] of Object.entries(resource || {})) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flattenObjectStrings(value, fullKey, output);
    } else if (typeof value === 'string') {
      output[fullKey] = value;
    }
  }
  return output;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function getAllJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(file => file.endsWith('.json')).sort()
    .map(file => path.join(dir, file));
}

function placeholders(value) {
  return [...String(value).matchAll(/\{\{\s*([^{}]+?)\s*\}\}|%\{\s*([^{}]+?)\s*\}|\{([A-Za-z][^{}]*)\}|%(?:s|d)/g)]
    .map(([, doubleBrace, percentBrace, singleBrace]) => doubleBrace || percentBrace || singleBrace || '%s/%d')
    .map(token => token.trim())
    .sort();
}

function sameArray(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function loadCandidateFiles() {
  const files = [
    ...getAllJsonFiles(EXISTING_DRAFT_DIR),
    ...getAllJsonFiles(NEW_DRAFT_DIR),
  ].filter(file => !file.endsWith('10-11-hardcoded-dynamic.ko-KR.json'));

  // Later revision files override earlier candidates, while every alternative
  // remains attached to the entry for review and provenance.
  const priority = file => {
    const name = path.basename(file);
    if (name === 'reviewed-overrides.ko-KR.json') return 120;
    if (name.includes('.revised.ko-KR')) return 100;
    if (name === '05-admin.ko-KR.json') return 90;
    if (name === '03-market-sentiment-missing.ko-KR.json') return 80;
    if (name === '08-indicator-pages.ko-KR.json') return 70;
    return 10;
  };

  const candidates = new Map();
  for (const file of files) {
    const flat = flatten(readJson(file));
    for (const [key, value] of Object.entries(flat)) {
      if (!candidates.has(key)) candidates.set(key, []);
      candidates.get(key).push({
        sourceFile: path.relative(ROOT, file).replace(/\\/g, '/'),
        value,
        priority: priority(file),
      });
    }
  }
  return candidates;
}

function englishFallback(key, en) {
  if (Object.prototype.hasOwnProperty.call(en, key)) return { status: 'direct', key };
  const one = `${key}_one`;
  const other = `${key}_other`;
  if (Object.prototype.hasOwnProperty.call(en, one) && Object.prototype.hasOwnProperty.call(en, other)) {
    return { status: 'plural_pair', keys: [one, other] };
  }
  return { status: 'missing', keys: [] };
}

const tw = flatten(readJson(path.join(SOURCE_LOCALE_DIR, 'zh-TW/translation.json')));
const cn = flatten(readJson(path.join(SOURCE_LOCALE_DIR, 'zh-CN/translation.json')));
const en = flatten(readJson(path.join(SOURCE_LOCALE_DIR, 'en/translation.json')));
const candidates = loadCandidateFiles();

const missingCN = Object.keys(tw).filter(key => !(key in cn));
const extraCN = Object.keys(cn).filter(key => !(key in tw));
const directTw = flattenObjectStrings(readJson(path.join(SOURCE_LOCALE_DIR, 'zh-TW/translation.json')));
const nestedArrayStringLeaves = Object.keys(tw).filter(key => /\[\d+\]/.test(key));
const missingEnglishFallback = [];
const missingKorean = [];
const placeholderMismatches = [];
const englishPlaceholderMismatches = [];
const conflictingCandidates = [];

const entries = Object.entries(tw).map(([key, sourceZhTW]) => {
  const options = (candidates.get(key) || []).sort((a, b) => b.priority - a.priority);
  const selected = options[0] || null;
  if (!selected) missingKorean.push(key);
  const fallback = englishFallback(key, en);
  const sourceTokens = placeholders(sourceZhTW);
  if (fallback.status === 'missing') {
    missingEnglishFallback.push(key);
  } else if (fallback.status === 'direct') {
    fallback.values = [{ key, value: en[key] }];
  } else if (fallback.status === 'plural_pair') {
    fallback.values = fallback.keys.map(variantKey => ({ key: variantKey, value: en[variantKey] }));
  }
  if (fallback.values) {
    for (const fallbackValue of fallback.values) {
      if (!sameArray(sourceTokens, placeholders(fallbackValue.value))) {
        englishPlaceholderMismatches.push({
          key,
          fallbackKey: fallbackValue.key,
          source: sourceTokens,
          fallback: placeholders(fallbackValue.value),
        });
      }
    }
  }

  if (selected && !sameArray(sourceTokens, placeholders(selected.value))) {
    placeholderMismatches.push({
      key,
      source: sourceTokens,
      proposed: placeholders(selected.value),
      file: selected.sourceFile,
    });
  }

  const alternatives = options.slice(1).filter(option => option.value !== selected?.value);
  if (alternatives.length) {
    conflictingCandidates.push({ key, selected: selected.value, alternatives });
  }

  return {
    key,
    source: {
      zhTW: sourceZhTW,
      zhCN: cn[key] ?? null,
      en: en[key] ?? null,
    },
    korean: selected?.value ?? null,
    candidateSource: selected?.sourceFile ?? null,
    alternatives: alternatives.map(({ sourceFile, value }) => ({ sourceFile, value })),
    englishFallback: fallback,
    placeholders: {
      source: sourceTokens,
      proposed: selected ? placeholders(selected.value) : [],
      match: selected ? sameArray(sourceTokens, placeholders(selected.value)) : false,
      englishFallbackMatch: fallback.values
        ? fallback.values.every(value => sameArray(sourceTokens, placeholders(value.value)))
        : false,
    },
    approvalStatus: 'reviewed_by_delegated_editor_not_released',
    legacy171Reconciliation: 'unverified_historical_membership_and_status',
  };
});

const summary = {
  sourceLocale: 'zh-TW',
  sourcePath: 'src/locales/zh-TW/translation.json',
  targetLocale: 'ko-KR',
  targetStatus: 'review_proposal_only_not_registered_or_enabled',
  approvalStatus: 'editorial_review_complete_not_released_or_registered',
  sourceKeyCount: Object.keys(tw).length,
  directObjectStringKeyCount: Object.keys(directTw).length,
  nestedArrayStringLeafCount: nestedArrayStringLeaves.length,
  zhCN: { keyCount: Object.keys(cn).length, missing: missingCN.length, extra: extraCN.length },
  en: { keyCount: Object.keys(en).length, missingFallback: missingEnglishFallback.length },
  korean: {
    proposed: entries.filter(entry => entry.korean !== null).length,
    missing: missingKorean.length,
    placeholderMismatches: placeholderMismatches.length,
    englishPlaceholderMismatches: englishPlaceholderMismatches.length,
    conflictingCandidates: conflictingCandidates.length,
  },
  legacy171: {
    status: 'exact_historical_text_and_item_level_approval_status_not_recoverable_from_current_workspace_artifacts',
    handling: 'Existing candidate files are preserved as candidates; no item is assumed to be one of the former 171 or historically approved.',
  },
};

const artifact = {
  metadata: {
    generatedAt: new Date().toISOString(),
    summary,
    terminology: {
      '市場情緒': '시장 심리',
      '投資人情緒': '투자자 심리 (only when explicitly referring to investors)',
      '恐懼與貪婪指數': '공포·탐욕 지수',
      '樂活五線譜': 'LOHAS 5선 분석',
      '市場動能': '시장 모멘텀',
      '自選列表': '관심 종목',
      'Pro': 'Pro (brand/tier token preserved)',
      'ETF / tickers / technical identifiers': 'Preserve original identifiers and symbols',
    },
    placeholders: 'Names and case must match the source. All entries are machine checked below.',
    financialContentPolicy: 'No currency conversion, no inferred formulas/causality, and no change to stated conditions or legal effect.',
  },
  entries,
  checks: {
    missingChineseKeys: missingCN,
    extraChineseKeys: extraCN,
    missingEnglishFallback,
    missingKorean,
    placeholderMismatches,
    englishPlaceholderMismatches,
    conflictingCandidates,
  },
};

fs.writeFileSync(OUTPUT_JSON, JSON.stringify(artifact, null, 2) + '\n');

const md = value => String(value ?? '—').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
const detailedEntries = entries.map(entry => [
  `### ${entry.key}`,
  '',
  `- **審核狀態：** ${entry.approvalStatus}`,
  `- **繁中原文：** ${md(entry.source.zhTW)}`,
  `- **簡中對照：** ${md(entry.source.zhCN)}`,
  `- **英文對照：** ${md(entry.source.en)}`,
  `- **英文 fallback：** ${entry.englishFallback.status}${entry.englishFallback.values ? ` — ${entry.englishFallback.values.map(value => `${value.key}: ${md(value.value)}`).join('；')}` : ''}`,
  `- **韓文候選：** ${md(entry.korean)}`,
  `- **候選來源：** ${entry.candidateSource || '尚無候選稿'}`,
  `- **替代候選：** ${entry.alternatives.length ? entry.alternatives.map(value => `${value.sourceFile}: ${md(value.value)}`).join('；') : '無'}`,
  `- **動態參數：** ${entry.placeholders.source.length ? entry.placeholders.source.join(', ') : '無'}（韓文匹配：${entry.placeholders.match ? '是' : '未能確認'}；英文 fallback 匹配：${entry.placeholders.englishFallbackMatch ? '是' : '未能確認'}）`,
  '',
].join('\n')).join('\n');

const report = `# ko-KR Korean translation review proposal\n\nGenerated: ${artifact.metadata.generatedAt}\n\n## Coverage\n\n| Item | Count / result |\n|---|---:|\n| zh-TW direct object string keys | ${summary.directObjectStringKeyCount} |\n| Additional nested array string leaves | ${summary.nestedArrayStringLeafCount} |\n| Total translatable source string leaves | ${summary.sourceKeyCount} |\n| zh-CN source string leaves | ${summary.zhCN.keyCount}; missing ${summary.zhCN.missing}; extra ${summary.zhCN.extra} |\n| EN source string leaves | ${summary.en.keyCount}; missing English fallback ${summary.en.missingFallback} |\n| Korean proposed strings | ${summary.korean.proposed} |\n| Korean missing strings | ${summary.korean.missing} |\n| Korean placeholder mismatches | ${summary.korean.placeholderMismatches} |\n| English placeholder mismatches | ${summary.korean.englishPlaceholderMismatches} |\n| Conflicting candidate strings | ${summary.korean.conflictingCandidates} |\n\nAll entries are **pending user approval**. This JSON and document are review artifacts only, not runtime locale resources.\n\n## Historical 171-item proposal\n\n${summary.legacy171.status}. ${summary.legacy171.handling}\n\n## Terminology\n\n- 市場情緒 → **시장 심리**\n- 投資人情緒 → **투자자 심리** when the subject is investors specifically\n- 恐懼與貪婪指數 → **공포·탐욕 지수**\n- 樂活五線譜 → **LOHAS 5선 분석**\n- 市場動能 → **시장 모멘텀**\n- 自選列表 → **관심 종목**\n- Preserve SIO, LOHAS, Pro, ETFs, stock tickers, API names, formulas and placeholders.\n\n## Review constraints\n\n- Use natural South Korean fintech vocabulary and Korean word spacing.\n- Explanatory prose uses a consistent formal 합니다 style; compact controls use concise product UI wording.\n- Preserve source conditions, limits, dates, amounts, currencies and legal meaning.\n- Do not invent data-source definitions, calculations, predictive certainty or product functions.\n- Every entry includes zh-TW and zh-CN source text, English source/fallback, the Korean candidate, provenance, alternatives and placeholder audit.\n\n---\n\n# Complete per-key review list (${entries.length} string leaves)\n\n${detailedEntries}`;
fs.writeFileSync(OUTPUT_REPORT, report);

console.log(JSON.stringify(summary, null, 2));
if (missingCN.length || extraCN.length || missingEnglishFallback.length || missingKorean.length
  || placeholderMismatches.length || englishPlaceholderMismatches.length) {
  process.exitCode = 1;
}
