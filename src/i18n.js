import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

i18n
  // 使用 http backend 載入翻譯檔
  // 翻譯檔會放在 /public/locales 資料夾下
  .use(Backend)
  // 自動偵測使用者語言
  .use(LanguageDetector)
  // 將 i18n 實例傳遞給 react-i18next
  .use(initReactI18next)
  // 初始化 i18next
  .init({
    // 預設語言，如果偵測不到或不支援使用者語言時使用
    fallbackLng: 'zh-TW',
    // 在開發環境中啟用 debug 輸出
    debug: process.env.NODE_ENV === 'development',
    // 支援的語言列表
    supportedLngs: ['en', 'zh-TW'],
    // React 不需要手動 escape，因為它本身會處理 XSS
    interpolation: {
      escapeValue: false,
    },
    backend: {
      // 翻譯檔案的路徑模板
      // {{lng}} 會被替換為語言代碼 (例如 'en', 'zh-TW')
      // {{ns}} 會被替換為 namespace (預設是 'translation')
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
  });

export default i18n; 