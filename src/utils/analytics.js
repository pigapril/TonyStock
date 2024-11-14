// 基礎資料層推送函數
const pushToDataLayer = (eventName, eventData) => {
  if (window.dataLayer) {
    window.dataLayer.push({
      event: eventName,
      ...eventData
    });
  } else {
    console.warn('DataLayer not found');
  }
};

// 通用追蹤模組
export const Analytics = {
  // 股票分析相關追蹤
  stockAnalysis: {
    search: (data) => {
      pushToDataLayer('check_stock_symbol', {
        stock_code: data.stockCode,
        years: data.years,
        back_test_date: data.backTestDate
      });
    },
    
    chartSwitch: (chartType) => {
      pushToDataLayer('chart_switch', {
        chart_type: chartType
      });
    }
  },

  // 認證相關追蹤
  auth: {
    login: (data) => {
      pushToDataLayer('auth_login', {
        method: data.method,
        status: data.status
      });
    },
    
    logout: (data) => {
      pushToDataLayer('auth_logout', {
        status: data.status
      });
    },
    
    statusCheck: (data) => {
      pushToDataLayer('auth_status_check', {
        status: data.status
      });
    }
  },

  // 頁面瀏覽追蹤
  pageView: (pageData) => {
    pushToDataLayer('page_view', pageData);
  },

  // 錯誤追蹤
  error: ({ status, errorCode, message, ...metadata }) => {
    if (window.dataLayer) {
      window.dataLayer.push({
        event: 'error',
        error: {
          status,
          errorCode,
          message,
          ...metadata
        }
      });
    }
  }
};
