import { Analytics } from './analytics';

const ErrorMessages = {
    // 後端定義的錯誤
    STOCK_NOT_FOUND: '股票代碼不存在',
    GENERAL_ERROR: '發生錯誤，請稍後再試',
    VALIDATION_ERROR: '輸入資料有誤，請檢查後重試',
    NOT_FOUND: '找不到資源',
    
    // API 相關錯誤
    NETWORK_ERROR: '網路連線異常，請檢查網路設定',
    TIMEOUT_ERROR: '請求超時，請稍後再試',
    
    // 認證相關錯誤
    AUTH_ERROR: '登入失敗，請稍後再試',
    SESSION_EXPIRED: '登入階段已過期，請重新登入',
    UNAUTHORIZED: '請先登入後再繼續',
    
    // 市場情緒指標相關錯誤
    SENTIMENT_DATA_ERROR: '無法取得市場情緒數據',
    HISTORICAL_DATA_ERROR: '無法取得歷史數據',
    
    // 預設錯誤
    DEFAULT_ERROR: '發生錯誤，請稍後再試',
    
    // Google 登入相關錯誤
    GOOGLE_AUTH_FAILED: 'Google 登入失敗，請稍後再試',
    GOOGLE_AUTH_CANCELLED: '已取消 Google 登入',
    GOOGLE_AUTH_POPUP_BLOCKED: '請允許彈出視窗以完成登入',
    GOOGLE_AUTH_NETWORK_ERROR: 'Google 登入網路連線異常',
    GOOGLE_AUTH_SERVER_ERROR: 'Google 登入伺服器錯誤',
    
    // 新增按鈕相關錯誤
    BUTTON_DISABLED: '按鈕暫時無法使用',
    BUTTON_NETWORK_ERROR: '網路連線異常，請重試',
    BUTTON_TIMEOUT: '操作逾時，請重試'
};

export const handleApiError = (error) => {
    // 統一錯誤追蹤格式
    const trackError = (errorData) => {
        Analytics.error({
            status: errorData.status,
            errorCode: errorData.errorCode,
            message: errorData.message,
            component: error.component || 'Unknown',
            path: window.location.pathname,
            timestamp: new Date().toISOString()
        });
        return errorData;
    };

    // 處理 Google Identity Service 特定錯誤
    if (error.response?.data?.errorCode?.startsWith('GOOGLE_AUTH_')) {
        return trackError({
            status: 'error',
            errorCode: error.response.data.errorCode,
            message: ErrorMessages[error.response.data.errorCode] || ErrorMessages.GOOGLE_AUTH_FAILED
        });
    }
    
    // 如果是 API 回傳的錯誤
    if (error.response?.data) {
        const { status, data } = error.response.data;
        return trackError({
            status,
            errorCode: data.errorCode,
            message: ErrorMessages[data.errorCode] || data.message || ErrorMessages.DEFAULT_ERROR
        });
    }

    // 處理 Invalid response format 錯誤
    if (error.message === 'Invalid response format') {
        return trackError({
            status: 'error',
            errorCode: 'GOOGLE_AUTH_FAILED',
            message: ErrorMessages.GOOGLE_AUTH_FAILED
        });
    }
    
    // 處理網路錯誤
    if (error.message === 'Network Error') {
        return trackError({
            status: 'error',
            errorCode: 'NETWORK_ERROR',
            message: ErrorMessages.NETWORK_ERROR
        });
    }
    
    // 處理超時
    if (error.code === 'ECONNABORTED') {
        return trackError({
            status: 'error',
            errorCode: 'TIMEOUT_ERROR',
            message: ErrorMessages.TIMEOUT_ERROR
        });
    }
    
    // 預設錯誤
    return trackError({
        status: 'error',
        errorCode: 'UNKNOWN_ERROR',
        message: ErrorMessages.DEFAULT_ERROR
    });
};

// 導出錯誤訊息供其他模組使用
export const getErrorMessage = (errorCode) => {
    return ErrorMessages[errorCode] || ErrorMessages.DEFAULT_ERROR;
}; 