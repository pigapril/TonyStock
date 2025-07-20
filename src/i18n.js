import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
// import LanguageDetector from 'i18next-browser-languagedetector'; // 移除或註解掉
// import Backend from 'i18next-http-backend'; // 不再需要

// 直接 import json 檔案
import en from './locales/en/translation.json';
import zhTW from './locales/zh-TW/translation.json';

// 初始化 i18n，直接用 resources
i18n
  // .use(Backend) // 不再需要
  // .use(LanguageDetector) // 如需自動偵測語言可再啟用
  .use(initReactI18next)
  .init({
    fallbackLng: {
      'zh': ['zh-TW', 'en'],
      'default': ['en']
    },
    debug: process.env.NODE_ENV === 'development',
    supportedLngs: ['en', 'zh-TW', 'zh'],
    interpolation: {
      escapeValue: false,
    },
    resources: {
      en: { translation: en },
      'zh-TW': { translation: zhTW }
    },
    // 不再需要 backend 設定
  });

export default i18n; 