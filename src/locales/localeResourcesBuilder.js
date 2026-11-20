const getValueAtPath = (resource, key) => {
  let current = resource;
  const parts = String(key).match(/[^.[\]]+|\[(\d+)\]/g) || [];
  for (const token of parts) {
    const part = token.startsWith('[') ? Number(token.slice(1, -1)) : token;
    if (current == null || typeof current !== 'object' || !(part in current)) return undefined;
    current = current[part];
  }
  return current;
};

// Extract any available route groups without inventing placeholder strings.
// Partial locales keep untranslated keys absent so i18next can resolve them
// from the locale's configured fallback chain.
function buildLocaleResources(source, resourceGroups) {
  const resources = {};
  for (const [group, keys] of Object.entries(resourceGroups)) {
    const resource = {};
    for (const key of keys) {
      const parts = key.split('.');
      if (getValueAtPath(source, key) === undefined) continue;

      let currentSource = source;
      let target = resource;
      for (const part of parts.slice(0, -1)) {
        currentSource = currentSource[part];
        target = target[part] ||= {};
      }
      const leaf = parts[parts.length - 1];
      target[leaf] = currentSource[leaf];
      delete currentSource[leaf];
    }
    resources[group] = resource;
  }
  resources.common = source;
  return resources;
}

module.exports = { buildLocaleResources, getValueAtPath };
