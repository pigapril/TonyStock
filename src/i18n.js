import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector'; // 新增

// 直接 import json 檔案
import en from './locales/en/translation.json';
import zhTW from './locales/zh-TW/translation.json';

// 初始化 i18n，直接用 resources
i18n
  .use(LanguageDetector) // 啟用自動偵測
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