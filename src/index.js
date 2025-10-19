import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { HelmetProvider } from 'react-helmet-async';
import './i18n';

// 設定 console 日誌級別
import './utils/consoleConfig';

// 在開發環境中測試日誌系統
if (process.env.NODE_ENV === 'development') {
  import('./utils/loggerTest');
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Suspense fallback={<div>Loading...</div>}>
      <Router>
        <HelmetProvider>
          <App />
        </HelmetProvider>
      </Router>
    </Suspense>
  </React.StrictMode>
);

reportWebVitals();
