import { createInstance } from 'i18next';
import { createCommonLocaleLoader } from '../loadCommonLocales';

const createI18n = async () => {
  const instance = createInstance();
  await instance.init({ lng: 'zh-TW', fallbackLng: 'en' });
  return instance;
};

test('loads only the selected common locale and its configured English fallback', async () => {
  const instance = await createI18n();
  const loaders = {
    en: jest.fn(async () => ({ default: { shared: { label: 'Shared' } } })),
    'zh-TW': jest.fn(async () => ({ default: { shared: { label: '共用' } } })),
    'zh-CN': jest.fn(async () => ({ default: { shared: { label: '共享' } } })),
    'ko-KR': jest.fn(async () => ({ default: { shared: { label: '공통' } } })),
  };
  const load = createCommonLocaleLoader(instance, loaders);

  await Promise.all([load('zh-TW'), load('zh-TW')]);

  expect(loaders['zh-TW']).toHaveBeenCalledTimes(1);
  expect(loaders.en).toHaveBeenCalledTimes(1);
  expect(loaders['zh-CN']).not.toHaveBeenCalled();
  expect(loaders['ko-KR']).not.toHaveBeenCalled();
  expect(instance.t('shared.label')).toBe('共用');

  await load('zh-TW');
  expect(loaders['zh-TW']).toHaveBeenCalledTimes(1);
  expect(loaders.en).toHaveBeenCalledTimes(1);
});

test('legacy Chinese alias resolves to Traditional Chinese plus English resources', async () => {
  const instance = await createI18n();
  const loaders = {
    en: jest.fn(async () => ({ default: { fallback: { label: 'Fallback' } } })),
    'zh-TW': jest.fn(async () => ({ default: { shared: { label: '共用' } } })),
  };

  await createCommonLocaleLoader(instance, loaders)('zh');

  expect(loaders['zh-TW']).toHaveBeenCalledTimes(1);
  expect(loaders.en).toHaveBeenCalledTimes(1);
  expect(instance.getResourceBundle('zh-TW', 'translation')).toEqual({ shared: { label: '共用' } });
});

test('a failed locale chunk is not cached and can be retried', async () => {
  const instance = await createI18n();
  const localeLoader = jest.fn()
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({ default: { shared: { label: '共用' } } });
  const load = createCommonLocaleLoader(instance, {
    en: async () => ({ default: { shared: { fallback: 'Fallback' } } }),
    'zh-TW': localeLoader,
  });

  await expect(load('zh-TW')).rejects.toThrow('offline');
  await load('zh-TW');

  expect(localeLoader).toHaveBeenCalledTimes(2);
  expect(instance.t('shared.label')).toBe('共用');
});
