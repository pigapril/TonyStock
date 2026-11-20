import { commonLocaleLoaders } from './localeResources.generated';
import { getLocaleResourceChain } from './localeConfig';

// Cache successful locale bundles and share in-flight requests. A failed
// chunk is deliberately not cached so the caller can offer a real retry.
export function createCommonLocaleLoader(
  instance,
  resourceLoaders = commonLocaleLoaders,
  getResourceChain = getLocaleResourceChain
) {
  const requests = new Map();
  const loaded = new Set();

  const load = language => {
    if (loaded.has(language)) return Promise.resolve();
    if (requests.has(language)) return requests.get(language);

    const loader = resourceLoaders[language];
    if (typeof loader !== 'function') {
      return Promise.reject(new Error(`No common locale loader registered for ${language}.`));
    }

    const request = Promise.resolve()
      .then(() => loader())
      .then(module => {
        instance.addResourceBundle(language, 'translation', module.default || module, true, true);
        loaded.add(language);
      })
      .finally(() => requests.delete(language));

    requests.set(language, request);
    return request;
  };

  return language => Promise.all(getResourceChain(language).map(load));
}

const instances = new WeakMap();

export function loadCommonLocales(instance, language) {
  if (!instances.has(instance)) instances.set(instance, createCommonLocaleLoader(instance));
  return instances.get(instance)(language);
}
