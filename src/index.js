import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { HelmetProvider } from 'react-helmet-async';
import i18n, { i18nReady, loadLocaleCommonResources } from './i18n';

// 設定 console 日誌級別
import './utils/consoleConfig';

window.dataLayer = window.dataLayer || [];

// 在開發環境中測試日誌系統
if (process.env.NODE_ENV === 'development') {
  import('./utils/loggerTest');
}

const root = ReactDOM.createRoot(document.getElementById('root'));

// Keep the initial document responsive while the selected common locale
// chunk is loading; the application shell mounts as soon as i18n is ready.
root.render(<div role="status" aria-live="polite">Loading...</div>);

const renderApp = () => root.render(
  <React.StrictMode>
    <Suspense fallback={<div>{i18n.t('common.loading')}</div>}>
      <Router>
        <HelmetProvider>
          <App />
        </HelmetProvider>
      </Router>
    </Suspense>
  </React.StrictMode>
);

const renderTranslationError = error => {
  console.error('Unable to load the initial translation resources:', error);
  root.render(
    <div className="loading-container" role="alert">
      <p>Unable to load language resources. Check your connection and try again.</p>
      <button type="button" onClick={() => {
        loadLocaleCommonResources(i18n.language || 'en').then(renderApp).catch(renderTranslationError);
      }}>Retry</button>
    </div>
  );
};

// Do not mount the shell until the selected common bundle and its fallback
// have arrived. Feature-specific groups remain lazy-loaded by RouteLocaleGate.
i18nReady.then(renderApp).catch(renderTranslationError);

reportWebVitals();
