import { getRouteLocaleGroups } from './resourceGroups';

const loaders = {
  en: {
    admin: () => import('./resources/en/admin.json'),
    momentum: () => import('./resources/en/momentum.json'),
    indicators: () => import('./resources/en/indicators.json'),
    account: () => import('./resources/en/account.json'),
    market: () => import('./resources/en/market.json'),
    price: () => import('./resources/en/price.json')
  },
  'zh-TW': {
    admin: () => import('./resources/zh-TW/admin.json'),
    momentum: () => import('./resources/zh-TW/momentum.json'),
    indicators: () => import('./resources/zh-TW/indicators.json'),
    account: () => import('./resources/zh-TW/account.json'),
    market: () => import('./resources/zh-TW/market.json'),
    price: () => import('./resources/zh-TW/price.json')
  }
};

// Cache only successfully loaded resources; failed requests can be retried.
export function createRouteLocaleLoader(instance, resourceLoaders = loaders) {
  const requests = new Map();
  const loaded = new Set();
  const languagesFor = lang => lang.toLowerCase().startsWith('zh') ? ['zh-TW', 'en'] : ['en'];

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

  return (lang, pathname) => Promise.all(languagesFor(lang).flatMap(language =>
    getRouteLocaleGroups(pathname).map(group => load(language, group))
  ));
}

const instances = new WeakMap();
export function loadRouteLocales(instance, lang, pathname) {
  if (!instances.has(instance)) instances.set(instance, createRouteLocaleLoader(instance));
  return instances.get(instance)(lang, pathname);
}
