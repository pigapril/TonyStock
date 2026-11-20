const fs = require('fs');
const path = require('path');

const frontendRoot = path.resolve(__dirname, '..');
const sourcePath = path.join(frontendRoot, 'src/locales/zh-TW/translation.json');
const targetPath = path.join(frontendRoot, 'src/locales/ko-KR/translation.json');
const proposalPath = path.join(frontendRoot, 'docs/korean-review/ko-KR-review-proposal.json');
const check = process.argv.includes('--check');

const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const proposal = JSON.parse(fs.readFileSync(proposalPath, 'utf8'));
const entries = proposal.entries;
if (!Array.isArray(entries) || entries.length !== 2422) {
  throw new Error(`Expected 2,422 reviewed Korean entries; received ${entries?.length ?? 'none'}.`);
}

function tokensFor(key) {
  return String(key).match(/[^.[\]]+|\[(\d+)\]/g)?.map(token =>
    token.startsWith('[') ? Number(token.slice(1, -1)) : token
  ) || [];
}

function getAtPath(root, key) {
  return tokensFor(key).reduce((value, token) => value == null ? undefined : value[token], root);
}

function setAtPath(root, key, value) {
  const tokens = tokensFor(key);
  if (!tokens.length) throw new Error(`Invalid translation key: ${key}`);
  let cursor = root;
  tokens.forEach((token, index) => {
    const final = index === tokens.length - 1;
    if (final) {
      cursor[token] = value;
      return;
    }
    const nextIsArray = typeof tokens[index + 1] === 'number';
    if (cursor[token] === undefined) cursor[token] = nextIsArray ? [] : {};
    if (!cursor[token] || typeof cursor[token] !== 'object') {
      throw new Error(`Conflicting path while writing ${key} at ${String(token)}.`);
    }
    cursor = cursor[token];
  });
}

function stringLeaves(value, prefix = '') {
  return Object.entries(value).flatMap(([key, child]) => {
    const next = prefix ? `${prefix}.${key}` : key;
    if (typeof child === 'string') return [next];
    if (child && typeof child === 'object') return stringLeaves(child, next);
    return [];
  });
}

function placeholders(value) {
  return [...String(value).matchAll(/{{\s*([^{}]+?)\s*}}/g)].map(match => match[1]).sort();
}

const target = {};
const seen = new Set();
for (const entry of entries) {
  if (!entry || typeof entry.key !== 'string' || typeof entry.korean !== 'string') {
    throw new Error('Every Korean proposal entry must contain string key and korean fields.');
  }
  if (seen.has(entry.key)) throw new Error(`Duplicate Korean proposal key: ${entry.key}`);
  seen.add(entry.key);
  const sourceValue = getAtPath(source, entry.key);
  if (typeof sourceValue !== 'string') throw new Error(`Proposal key does not resolve to a source string: ${entry.key}`);
  if (JSON.stringify(placeholders(sourceValue)) !== JSON.stringify(placeholders(entry.korean))) {
    throw new Error(`Placeholder mismatch for ${entry.key}`);
  }
  setAtPath(target, entry.key, entry.korean);
}

const sourceKeys = stringLeaves(source).sort();
const targetKeys = stringLeaves(target).sort();
if (sourceKeys.length !== 2422 || targetKeys.length !== sourceKeys.length ||
    sourceKeys.some((key, index) => key !== targetKeys[index])) {
  throw new Error(`Korean resource coverage mismatch: source=${sourceKeys.length}, target=${targetKeys.length}.`);
}

const expected = `${JSON.stringify(target)}\n`;
if (check) {
  if (!fs.existsSync(targetPath) || fs.readFileSync(targetPath, 'utf8') !== expected) {
    throw new Error('Stale Korean translation resource. Run scripts/generate-locale-resources.js.');
  }
} else {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, expected);
}

console.log(`Korean translation ${check ? 'verified' : 'generated'}: ${targetKeys.length} source leaves, placeholders matched.`);
