import { getRouteLocaleGroups } from './resourceGroups';
import { getLocaleResourceChain } from './localeConfig';
import { routeLocaleLoaders } from './localeResources.generated';

// Cache only successfully loaded resources; failed requests can be retried.
export function createRouteLocaleLoader(
  instance,
  resourceLoaders = routeLocaleLoaders,
  getResourceChain = getLocaleResourceChain
) {
  const requests = new Map();
  const loaded = new Set();
  const load = (lang, group) => {
    const key = `${lang}/${group}`;
    if (loaded.has(key)) return Promise.resolve();
    if (requests.has(key)) return requests.get(key);
    const request = Promise.resolve().then(() => resourceLoaders[lang][group]())
      .then(module => {
        instance.addResourceBundle(lang, 'translation', module.default || module, true, true);
        loaded.add(key);
      }).finally(() => requests.delete(key));
    requests.set(key, request);
    return request;
  };

  return (lang, pathname) => Promise.all(getResourceChain(lang).flatMap(language =>
    getRouteLocaleGroups(pathname).map(group => load(language, group))
  ));
}

const instances = new WeakMap();
export function loadRouteLocales(instance, lang, pathname) {
  if (!instances.has(instance)) instances.set(instance, createRouteLocaleLoader(instance));
  return instances.get(instance)(lang, pathname);
}
