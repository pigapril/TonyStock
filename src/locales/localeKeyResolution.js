const { getValueAtPath } = require('./localeResourcesBuilder');

// English is the authoritative fallback for partial locales. i18next can
// resolve singular and plural requests from different languages, so a lone
// `_one` or `_other` must not make a plural key look complete.
const REQUIRED_FALLBACK_PLURAL_SUFFIXES = ['one', 'other'];

const resolveKeyFromChain = (locale, key, resources, getLocaleResourceChain) => {
  const chain = getLocaleResourceChain(locale);

  // Ordinary string keys win before plural variants.
  for (const candidate of chain) {
    const value = getValueAtPath(resources[candidate], key);
    if (value !== undefined) return { found: true, locale: candidate, key, value, chain, variants: null };
  }

  // Resolve each English fallback count form independently. A partial locale
  // may supply `_one` while English supplies `_other`; both must be available.
  const variants = Object.fromEntries(REQUIRED_FALLBACK_PLURAL_SUFFIXES.map(suffix => {
    const variantKey = `${key}_${suffix}`;
    for (const candidate of chain) {
      const value = getValueAtPath(resources[candidate], variantKey);
      if (value !== undefined) return [suffix, { locale: candidate, key: variantKey, value }];
    }
    return [suffix, null];
  }));
  const values = Object.values(variants).filter(Boolean);
  if (values.length === REQUIRED_FALLBACK_PLURAL_SUFFIXES.length) {
    return {
      found: true,
      locale: values.map(item => item.locale).join(', '),
      key: `${key}_{one,other}`,
      value: variants.one.value,
      chain,
      variants,
    };
  }
  return { found: false, locale: null, key: null, value: undefined, chain, variants };
};

const resolveRequiredKeyFromChain = (locale, key, resources, getLocaleResourceChain) => {
  const resolved = resolveKeyFromChain(locale, key, resources, getLocaleResourceChain);
  if (!resolved.found) {
    throw new Error(`Missing locale resource ${locale}/${key} (fallback: ${resolved.chain.join(' -> ')})`);
  }
  return resolved;
};

const getInterpolationTokens = (value) => (
  typeof value === 'string'
    ? [...value.matchAll(/\{\{\s*([^{}]+?)\s*\}\}|(%\{\s*[^{}]+?\s*\})|(\{[A-Za-z_][A-Za-z0-9_]*\})/g)]
      .map(([token]) => token.replace(/\s+/g, ''))
      .sort()
    : []
);

module.exports = {
  getValueAtPath,
  resolveKeyFromChain,
  resolveRequiredKeyFromChain,
  getInterpolationTokens,
};
