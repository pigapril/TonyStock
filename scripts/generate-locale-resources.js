const fs = require('fs');
const path = require('path');
const { RESOURCE_GROUPS } = require('../src/locales/resourceGroups');
const root = path.resolve(__dirname, '../src/locales');
const check = process.argv.includes('--check');

for (const lang of ['en', 'zh-TW']) {
  const common = JSON.parse(fs.readFileSync(path.join(root, lang, 'translation.json'), 'utf8'));
  const resources = {};
  for (const [group, keys] of Object.entries(RESOURCE_GROUPS)) {
    const resource = {};
    for (const key of keys) {
      const parts = key.split('.');
      let source = common;
      let target = resource;
      for (const part of parts.slice(0, -1)) {
        source = source[part];
        target = target[part] ||= {};
      }
      const leaf = parts[parts.length - 1];
      if (source[leaf] === undefined) throw new Error(`Missing source key: ${lang}/${key}`);
      target[leaf] = source[leaf];
      delete source[leaf];
    }
    resources[group] = resource;
  }
  resources.common = common;
  const dir = path.join(root, 'resources', lang);
  if (!check) fs.mkdirSync(dir, { recursive: true });
  for (const [group, data] of Object.entries(resources)) {
    const filename = path.join(dir, `${group}.json`);
    const expected = JSON.stringify(data) + '\n';
    if (check) {
      if (!fs.existsSync(filename) || fs.readFileSync(filename, 'utf8') !== expected) {
        throw new Error(`Stale locale resource: ${lang}/${group}. Run scripts/generate-locale-resources.js.`);
      }
    } else fs.writeFileSync(filename, expected);
  }
}
console.log(`Locale resources ${check ? 'verified' : 'generated'} for both languages.`);
