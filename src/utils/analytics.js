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

// 改為具名導出
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
        status: data.status,
        variant: data.variant,
        component: data.component,
        identity_service: data.variant === 'identity_service' ? {
          error_type: data.error,
          button_type: data.buttonType,
          auto_select: data.autoSelect
        } : undefined
      });
    },
    
    logout: (data) => {
      pushToDataLayer('auth_logout', {
        status: data.status,
        source: data.source,
        identity_service_revoked: data.identityServiceRevoked
      });
    },
    
    statusCheck: (data) => {
      pushToDataLayer('auth_status_check', {
        status: data.status,
        identity_service_initialized: data.identityServiceInitialized
      });
    },

    identityService: {
      initialize: (data) => {
        pushToDataLayer('auth_identity_service_init', {
          status: data.status,
          error: data.error
        });
      },
      
      buttonRender: (data) => {
        pushToDataLayer('auth_identity_service_button_render', {
          status: data.status,
          type: data.type,
          variant: data.variant
        });
      },

      error: (data) => {
        pushToDataLayer('auth_identity_service_error', {
          error_type: data.errorType,
          error_message: data.errorMessage,
          component: data.component
        });
      }
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
  },

  // 新增按鈕相關追蹤
  button: {
    click: (data) => {
      pushToDataLayer('button_click', {
        component: data.component,
        variant: data.variant,
        action: data.action
      });
    }
  },

  // 添加 UI 相關追蹤
  ui: {
    dialog: {
      open: (data) => {
        pushToDataLayer('dialog_open', {
          dialog_type: data.type,
          ...data
        });
      },
      close: (data) => {
        pushToDataLayer('dialog_close', {
          dialog_type: data.type
        });
      }
    }
  },

  // 添加市場情緒指標相關追蹤
  marketSentiment: {
    // 切換指標標籤
    switchIndicator: (data) => {
      pushToDataLayer('sentiment_indicator_switch', {
        indicator_name: data.indicatorName,
        from_indicator: data.fromIndicator
      });
    },
    
    // 切換時間範圍
    changeTimeRange: (data) => {
      pushToDataLayer('sentiment_timerange_change', {
        time_range: data.timeRange,
        indicator_name: data.currentIndicator
      });
    },

    // 切換視圖模式（最新情緒指數/歷史數據）
    switchViewMode: (data) => {
      pushToDataLayer('sentiment_view_mode_switch', {
        view_mode: data.viewMode,
        indicator_name: data.currentIndicator
      });
    }
  },

  // 新增 watchlist 相關事件追蹤
  watchlist: {
    addStock: ({ categoryId, stockSymbol }) => {
      // 追蹤添加股票事件
    },
    removeStock: ({ categoryId, stockSymbol }) => {
      // 追蹤移除股票事件
    },
    createCategory: ({ categoryName }) => {
      // 追蹤建立分類事件
    }
  }
};
