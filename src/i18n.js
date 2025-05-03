import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
// import LanguageDetector from 'i18next-browser-languagedetector'; // 移除或註解掉
import Backend from 'i18next-http-backend';

i18n
  // 使用 http backend 載入翻譯檔
  // 翻譯檔會放在 /public/locales 資料夾下
  .use(Backend)
  // 自動偵測使用者語言 (移除或註解掉)
  // .use(LanguageDetector)
  // 將 i18n 實例傳遞給 react-i18next
  .use(initReactI18next)
  // 初始化 i18next
  .init({
    // 預設語言，如果偵測不到或不支援使用者語言時使用
    fallbackLng: 'en',
    // 在開發環境中啟用 debug 輸出
    debug: process.env.NODE_ENV === 'development',
    // 支援的語言列表
    supportedLngs: ['en', 'zh-TW'], // 確保這裡包含所有支援的語言
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
    // detection: { // 如果保留 LanguageDetector，可以這樣配置，但在此情境下通常不需要
    //   order: ['path', 'localStorage', 'navigator'],
    //   lookupFromPathIndex: 0, // 從 URL path 的第一個部分讀取語言
    // }
  });

export default i18n; 