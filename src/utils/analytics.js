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
  // 通用追蹤方法
  track: (eventName, eventData = {}) => {
    pushToDataLayer(eventName, eventData);
  },
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

    loginRequired: (data) => {
      pushToDataLayer('auth_login_required', {
        from: data.from,
        // 可以根據需要添加更多 context data
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
    },
    // === 新增 routeProtection 方法 ===
    routeProtection: (data) => {
      pushToDataLayer('auth_route_protection', {
        status: data.status,
        from: data.from,
        path: data.path
      });
    },
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
      },
      action: (data) => {
        pushToDataLayer('dialog_action', {
          dialog_type: data.type,
          action: data.action,
          feature: data.feature,
          ...data
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
    },

    // 受限功能點擊追蹤
    restrictedFeatureClicked: (data) => {
      pushToDataLayer('sentiment_restricted_feature_clicked', {
        feature: data.feature,
        component: data.component,
        user_type: data.userType || 'free'
      });
    },

    // 升級按鈕點擊追蹤
    upgradeClicked: (data) => {
      pushToDataLayer('sentiment_upgrade_clicked', {
        source: data.source,
        feature: data.feature,
        component: data.component || 'marketSentiment'
      });
    }
  },

  // 新增 watchlist 相關事件追蹤
  watchlist: {
    addStock: ({ categoryId, stockSymbol }) => {
      pushToDataLayer('watchlist_add_stock', {
        category_id: categoryId,
        stock_symbol: stockSymbol
      });
    },
    removeStock: ({ categoryId, stockSymbol }) => {
      pushToDataLayer('watchlist_remove_stock', {
        category_id: categoryId,
        stock_symbol: stockSymbol
      });
    },
    createCategory: ({ categoryName }) => {
      pushToDataLayer('watchlist_create_category', {
        category_name: categoryName
      });
    },
    categoryDelete: ({ categoryId }) => {
      pushToDataLayer('watchlist_delete_category', {
        category_id: categoryId
      });
    },

    limitError: ({ type, currentCount, maxLimit }) => {
      pushToDataLayer('watchlist_limit_error', {
        error_type: type,  // 'stock_limit' 或 'category_limit'
        current_count: currentCount,
        max_limit: maxLimit
      });
    },

    reorderStocks: ({ categoryId }) => {
      pushToDataLayer('watchlist_reorder_stocks', {
        category_id: categoryId
      });
    },

    reorderCategories: () => {
      pushToDataLayer('watchlist_reorder_categories', {});
    }
  }
};
